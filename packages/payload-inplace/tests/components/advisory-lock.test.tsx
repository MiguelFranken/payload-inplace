import { expect, it, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useNativeAdvisoryLock } from "../../src/frontend/advisory-lock.js";
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
it("heartbeats only while visible, releases its exact stamp and ignores a late aborted result", async () => {
  vi.useFakeTimers();
  const visibility = vi
    .spyOn(document, "visibilityState", "get")
    .mockReturnValue("visible");
  let finish!: (response: Response) => void, signal!: AbortSignal;
  const request = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "owned",
          lease: { id: 1, updatedAt: "synthetic-stamp" },
          heartbeatMs: 1000,
        }),
      ),
    )
    .mockImplementationOnce((_url, options) => {
      signal = options!.signal!;
      return new Promise((resolve) => {
        finish = resolve;
      });
    })
    .mockResolvedValue(new Response("{}"));
  const view = renderHook(() =>
    useNativeAdvisoryLock("/api", "synthetic-proof"),
  );
  await act(async () => {});
  expect(view.result.current.status).toBe("owned");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(request).toHaveBeenCalledTimes(2);
  visibility.mockReturnValue("hidden");
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(signal.aborted).toBe(true);
  expect(JSON.parse(String(request.mock.calls[2]?.[1]?.body))).toMatchObject({
    action: "release",
    lease: { id: 1, updatedAt: "synthetic-stamp" },
  });
  await act(async () =>
    finish(new Response(JSON.stringify({ status: "other" }))),
  );
  expect(view.result.current.status).toBe("owned");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(120000);
  });
  expect(request).toHaveBeenCalledTimes(3);
  view.unmount();
  expect(request).toHaveBeenCalledTimes(3);
});
it("does not spin on unavailable presence and retries only on an explicit request", async () => {
  vi.useFakeTimers();
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  const request = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(
      async () => new Response(JSON.stringify({ status: "unavailable" })),
    );
  const view = renderHook(() =>
    useNativeAdvisoryLock("/api", "synthetic-proof"),
  );
  await act(async () => {});
  await act(async () => {
    await vi.advanceTimersByTimeAsync(120000);
  });
  expect(request).toHaveBeenCalledOnce();
  await act(async () => view.result.current.retry());
  expect(request).toHaveBeenCalledTimes(2);
});
