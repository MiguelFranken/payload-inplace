import { expect, it, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  prepareAdvisoryExit,
  useNativeAdvisoryLock,
} from "../../src/frontend/advisory-lock";
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

it("releases every mounted scope before revocation, pauses heartbeats and resumes after a failed exit", async () => {
  vi.useFakeTimers();
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  let stamp = 0;
  const request = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (_url, options) => {
      const input = JSON.parse(String(options?.body));
      return Response.json(
        input.action === "release"
          ? { status: "released" }
          : {
              status: "owned",
              lease: { id: ++stamp, updatedAt: "synthetic-stamp" },
              heartbeatMs: 1000,
            },
      );
    });
  const first = renderHook(() => useNativeAdvisoryLock("/api", "first-proof"));
  const second = renderHook(() =>
    useNativeAdvisoryLock("/api", "second-proof"),
  );
  await act(async () => {});
  let resume!: () => void;
  await act(async () => {
    resume = await prepareAdvisoryExit();
  });
  expect(
    request.mock.calls.map(
      ([, options]) => JSON.parse(String(options?.body)).action,
    ),
  ).toEqual(["acquire", "acquire", "release", "release"]);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30000);
  });
  expect(request).toHaveBeenCalledTimes(4);
  await act(async () => resume());
  expect(request).toHaveBeenCalledTimes(6);
  await act(async () => {
    await prepareAdvisoryExit();
  });
  first.unmount();
  second.unmount();
  expect(request).toHaveBeenCalledTimes(8);
});
it("does not send cleanup with a proof already rejected by the server", async () => {
  vi.useFakeTimers();
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  const request = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      Response.json({
        status: "owned",
        lease: { id: 1, updatedAt: "synthetic-stamp" },
        heartbeatMs: 1000,
      }),
    )
    .mockResolvedValue(new Response(null, { status: 403 }));
  const view = renderHook(() => useNativeAdvisoryLock("/api", "expired-proof"));
  await act(async () => {});
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  view.unmount();
  expect(request).toHaveBeenCalledTimes(2);
});
