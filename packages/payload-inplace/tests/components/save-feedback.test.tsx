import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useSaveFeedback } from "@payload-inplace/ui/chrome/save-feedback/SaveFeedback";
afterEach(() => vi.useRealTimers());
it("stays quiet initially and dismisses a real acknowledgement after two seconds plus exit motion", () => {
  vi.useFakeTimers();
  const { result, rerender } = renderHook(useSaveFeedback, {
    initialProps: { saving: false, pending: false, failed: false },
  });
  expect(result.current).toBe("hidden");
  rerender({ saving: true, pending: true, failed: false });
  expect(result.current).toBe("saving");
  rerender({ saving: false, pending: false, failed: false });
  expect(result.current).toBe("saved");
  act(() => vi.advanceTimersByTime(1999));
  expect(result.current).toBe("saved");
  act(() => vi.advanceTimersByTime(1));
  expect(result.current).toBe("exiting");
  act(() => vi.advanceTimersByTime(200));
  expect(result.current).toBe("hidden");
});
it("keeps one spinner across queued edits and cancels old success dismissal during a new save", () => {
  vi.useFakeTimers();
  const { result, rerender } = renderHook(useSaveFeedback, {
    initialProps: { saving: true, pending: true, failed: false },
  });
  rerender({ saving: false, pending: true, failed: false });
  expect(result.current).toBe("saving");
  rerender({ saving: true, pending: true, failed: false });
  rerender({ saving: false, pending: false, failed: false });
  expect(result.current).toBe("saved");
  act(() => vi.advanceTimersByTime(1800));
  rerender({ saving: true, pending: true, failed: false });
  act(() => vi.advanceTimersByTime(3000));
  expect(result.current).toBe("saving");
  rerender({ saving: false, pending: false, failed: true });
  expect(result.current).toBe("error");
  rerender({ saving: true, pending: false, failed: false });
  expect(result.current).toBe("saving");
  rerender({ saving: false, pending: false, failed: false });
  expect(result.current).toBe("saved");
});
