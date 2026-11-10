import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEditorSession } from "../../src/frontend/controllers/editor-session";
import type { Activation } from "../../src/types";

const { refresh, prepareExit, getData } = vi.hoisted(() => ({
  refresh: vi.fn(),
  prepareExit: vi.fn(),
  getData: vi.fn(),
}));

vi.mock("@payloadcms/ui", () => ({
  useConfig: () => ({ config: { routes: { api: "/cms-api" } } }),
  useForm: () => ({ getData }),
}));
vi.mock("../../src/launcher/EditorPageTransition", () => ({
  useEditorPageTransition: () => refresh,
}));
vi.mock("../../src/frontend/advisory-lock", () => ({
  prepareAdvisoryExit: prepareExit,
}));

const activation: Activation = {
  expires: 2000,
  nonce: "synthetic-nonce",
  pagePath: "/shop",
  target: { collection: "pages", id: 12, root: "layout" },
  locale: "de",
};

function setup(
  overrides: Partial<Parameters<typeof useEditorSession>[0]> = {},
) {
  const props = {
    context: activation,
    exitURL: "/shop",
    modified: false,
    background: false,
    onError: vi.fn(),
    onExpire: vi.fn(),
    ...overrides,
  };
  return { props, ...renderHook(useEditorSession, { initialProps: props }) };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  vi.clearAllMocks();
  prepareExit.mockResolvedValue(vi.fn());
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("editor session", () => {
  it("expires once at the active deadline and ignores a superseded activation", () => {
    const { props, rerender } = setup();
    act(() => vi.advanceTimersByTime(750));
    rerender({
      ...props,
      context: { ...activation, nonce: "new-nonce", expires: 3000 },
    });
    act(() => vi.advanceTimersByTime(250));
    expect(props.onExpire).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000));
    expect(props.onExpire).toHaveBeenCalledOnce();
    rerender({
      ...props,
      context: { ...activation, nonce: "new-nonce", expires: 3000 },
      modified: true,
    });
    act(() => vi.runOnlyPendingTimers());
    expect(props.onExpire).toHaveBeenCalledOnce();
  });

  it("restores the paused leases when deactivation fails and permits retry", async () => {
    const resume = vi.fn();
    prepareExit.mockResolvedValue(resume);
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const { props, result } = setup();
    await act(() => result.current.exit());
    expect(resume).toHaveBeenCalledOnce();
    expect(props.onError).toHaveBeenCalledWith(expect.any(String));
    expect(refresh).not.toHaveBeenCalled();
    await act(() => result.current.exit());
    expect(refresh).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenLastCalledWith(
      "/cms-api/visual-editor/deactivate",
      expect.objectContaining({
        method: "POST",
        body: '{"nonce":"synthetic-nonce"}',
      }),
    );
    expect(resume).toHaveBeenCalledOnce();
  });

  it("leaves the standalone route only after a successful deactivation", async () => {
    const navigate = vi
      .spyOn(window.location, "assign")
      .mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 204 }),
    );
    const { result } = setup({
      context: { ...activation, pagePath: undefined },
    });
    await act(() => result.current.exit());
    expect(navigate).toHaveBeenCalledWith("/shop");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("avoids discarding edits when the user cancels and coalesces concurrent exit requests", async () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal("confirm", confirm);
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    const { result } = setup({ modified: true });
    await act(() => result.current.exit());
    expect(fetch).not.toHaveBeenCalled();
    expect(prepareExit).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await act(async () => {
      await Promise.all([result.current.exit(), result.current.exit()]);
    });
    expect(prepareExit).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("leaves the working copy available after failed reopen and retries in the same locale", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(Response.json({ context: activation }));
    const { props, result } = setup();
    await act(() => result.current.reopenEditor());
    expect(result.current.reopening).toBe(false);
    expect(props.onError).toHaveBeenLastCalledWith(expect.any(String));
    expect(refresh).not.toHaveBeenCalled();
    await act(() => result.current.reopenEditor());
    expect(fetch).toHaveBeenLastCalledWith(
      "/cms-api/visual-editor/activate?locale=de&fallback-locale=null",
      expect.objectContaining({ body: JSON.stringify(activation.target) }),
    );
    expect(refresh).toHaveBeenCalledOnce();
  });
});
