import { expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createDeferredResponse } from "../../src/testing/fixtures";
import { useSavedPreview } from "../../src/frontend/controllers/saved-preview";
import type { EditorPreviewResponse } from "../../src/types";

const state = vi.hoisted(() => ({
  start: vi.fn(() => ({ id: "synthetic-operation", settle: vi.fn() })),
}));
vi.mock("../../src/frontend/lifecycle.js", () => ({
  useEditorLifecycle: () => ({ start: state.start }),
}));
it("coalesces saved revision floors and uses the current callbacks without duplicating in-flight reads", async () => {
  const first = createDeferredResponse<EditorPreviewResponse>(),
    second = createDeferredResponse<EditorPreviewResponse>(),
    refresh = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise),
    accept = vi.fn(),
    replacement = vi.fn();
  const hook = renderHook(
    ({ accept }) =>
      useSavedPreview({ initialRevision: 1, refresh, accept, denied: vi.fn() }),
    { initialProps: { accept } },
  );
  let done!: Promise<void>;
  act(() => {
    done = hook.result.current.request(2, "save-1");
    void hook.result.current.request(3, "save-2");
  });
  expect(refresh).toHaveBeenCalledTimes(1);
  hook.rerender({ accept: replacement });
  await act(async () => {
    first.resolve({ revision: 2, content: null });
    await Promise.resolve();
  });
  expect(refresh).toHaveBeenCalledTimes(2);
  expect(accept).not.toHaveBeenCalled();
  expect(replacement).not.toHaveBeenCalled();
  expect(hook.result.current.pending).toBe(true);
  await act(async () => {
    second.resolve({ revision: 3, content: null });
    await done;
  });
  expect(replacement).toHaveBeenCalledExactlyOnceWith({
    revision: 3,
    content: null,
  });
  expect(hook.result.current.pending).toBe(false);
  expect(hook.result.current.error).toBeNull();
});
it("rejects a preview below its requested floor and retries only explicitly, retaining native access decisions", async () => {
  const refresh = vi
      .fn()
      .mockResolvedValueOnce({ revision: 1, content: null })
      .mockResolvedValueOnce({ error: "denied" }),
    accept = vi.fn(),
    denied = vi.fn();
  const hook = renderHook(() =>
    useSavedPreview({ initialRevision: 1, refresh, accept, denied }),
  );
  await act(async () => {
    await hook.result.current.request(2);
  });
  expect(accept).not.toHaveBeenCalled();
  expect(hook.result.current.error).toBe("savedPreviewBehind");
  expect(refresh).toHaveBeenCalledTimes(1);
  await act(async () => hook.result.current.retry());
  expect(denied).toHaveBeenCalledTimes(1);
  expect(refresh).toHaveBeenCalledTimes(2);
});
it("ignores a late snapshot after the document owner unmounts", async () => {
  const read = createDeferredResponse<EditorPreviewResponse>(),
    accept = vi.fn(),
    denied = vi.fn();
  const hook = renderHook(() =>
    useSavedPreview({
      initialRevision: 1,
      refresh: () => read.promise,
      accept,
      denied,
    }),
  );
  let done!: Promise<void>;
  act(() => {
    done = hook.result.current.request(2);
  });
  hook.unmount();
  await act(async () => {
    read.resolve({ revision: 2, content: null });
    await done;
  });
  expect(accept).not.toHaveBeenCalled();
  expect(denied).not.toHaveBeenCalled();
});

it("remembers a preview ahead of the requested revision and never applies an older snapshot afterward", async () => {
  const refresh = vi
    .fn()
    .mockResolvedValueOnce({ revision: 4, content: null })
    .mockResolvedValueOnce({ revision: 3, content: null })
    .mockResolvedValueOnce({ revision: 4, content: null });
  const accept = vi.fn();
  const hook = renderHook(() =>
    useSavedPreview({ initialRevision: 1, refresh, accept, denied: vi.fn() }),
  );
  await act(async () => {
    await hook.result.current.request(2);
  });
  expect(accept).toHaveBeenCalledExactlyOnceWith({
    revision: 4,
    content: null,
  });
  await act(async () => {
    await hook.result.current.request(3);
  });
  expect(accept).toHaveBeenCalledTimes(1);
  expect(hook.result.current.error).toBe("savedPreviewBehind");
  await act(async () => hook.result.current.retry());
  expect(accept).toHaveBeenCalledTimes(2);
  expect(hook.result.current.error).toBeNull();
});

it("honors access denial even when a newer preview request is queued", async () => {
  const read = createDeferredResponse<EditorPreviewResponse>();
  const refresh = vi.fn(() => read.promise);
  const accept = vi.fn();
  const denied = vi.fn();
  const hook = renderHook(() =>
    useSavedPreview({ initialRevision: 1, refresh, accept, denied }),
  );
  let done!: Promise<void>;
  act(() => {
    done = hook.result.current.request(2);
    void hook.result.current.request(3);
  });
  await act(async () => {
    read.resolve({ error: "denied" });
    await done;
  });
  expect(refresh).toHaveBeenCalledOnce();
  expect(accept).not.toHaveBeenCalled();
  expect(denied).toHaveBeenCalledOnce();
});
