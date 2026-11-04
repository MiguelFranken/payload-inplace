import { afterEach, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useNativeIdleSubmit } from "../src/frontend/controllers/idle-submit.js";
afterEach(() => vi.useRealTimers());
it("batches a typing burst and ignores metadata/callback refreshes without postponing the idle deadline", async () => {
  vi.useFakeTimers();
  const save = vi.fn(async () => {}),
    error = vi.fn();
  const view = renderHook(
    ({ key, metadata }) => {
      void metadata;
      useNativeIdleSubmit({
        authoredKey: key,
        scope: "pages/1/de",
        enabled: true,
        delay: 1500,
        onIdle: () => save(),
        onError: error,
      });
    },
    { initialProps: { key: "a", metadata: 0 } },
  );
  await vi.advanceTimersByTimeAsync(300);
  view.rerender({ key: "ab", metadata: 0 });
  await vi.advanceTimersByTimeAsync(1000);
  view.rerender({ key: "ab", metadata: 1 });
  await vi.advanceTimersByTimeAsync(499);
  expect(save).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(save).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(5000);
  expect(save).toHaveBeenCalledTimes(1);
  expect(error).not.toHaveBeenCalled();
});
it("composition/processing gates cancel pending timers and one newer edit waits until native acknowledgement", async () => {
  vi.useFakeTimers();
  let finish: () => void = () => {};
  const save = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
  const view = renderHook(
    ({ key, enabled }) =>
      useNativeIdleSubmit({
        authoredKey: key,
        scope: "pages/1",
        enabled,
        delay: 1500,
        onIdle: save,
        onError: () => {},
      }),
    { initialProps: { key: "a", enabled: true } },
  );
  await vi.advanceTimersByTimeAsync(700);
  view.rerender({ key: "a", enabled: false });
  await vi.advanceTimersByTimeAsync(2000);
  expect(save).not.toHaveBeenCalled();
  view.rerender({ key: "composed", enabled: true });
  await vi.advanceTimersByTimeAsync(1500);
  expect(save).toHaveBeenCalledTimes(1);
  view.rerender({ key: "newer", enabled: false });
  await vi.advanceTimersByTimeAsync(2000);
  expect(save).toHaveBeenCalledTimes(1);
  finish();
  await vi.advanceTimersByTimeAsync(0);
  view.rerender({ key: "newer", enabled: true });
  await vi.advanceTimersByTimeAsync(1500);
  expect(save).toHaveBeenCalledTimes(2);
});
it("scope changes and unmount cancel stale callbacks, and rejected native work is reported once", async () => {
  vi.useFakeTimers();
  const error = vi.fn(),
    save = vi.fn(async () => {
      throw Error("native failure");
    });
  const view = renderHook(
    ({ scope, enabled }) =>
      useNativeIdleSubmit({
        authoredKey: "value",
        scope,
        enabled,
        delay: 1500,
        onIdle: save,
        onError: error,
      }),
    { initialProps: { scope: "de", enabled: true } },
  );
  await vi.advanceTimersByTimeAsync(1000);
  view.rerender({ scope: "en", enabled: true });
  await vi.advanceTimersByTimeAsync(1499);
  expect(save).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(error).toHaveBeenCalledTimes(1);
  view.rerender({ scope: "en", enabled: false });
  await vi.advanceTimersByTimeAsync(5000);
  expect(save).toHaveBeenCalledTimes(1);
  view.rerender({ scope: "en", enabled: true });
  view.unmount();
  await vi.advanceTimersByTimeAsync(2000);
  expect(save).toHaveBeenCalledTimes(1);
});
