import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { InspectionLayer } from "../../src/frontend/InspectionLayer";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("follows translation-only host motion and stops measuring when selection closes or the document is hidden", () => {
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}

      unobserve() {}

      disconnect() {}
    },
  );
  let hidden = false;
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  const target = document.createElement("img");
  document.body.append(target);
  let top = 154;
  vi.spyOn(target, "getClientRects").mockImplementation(
    () => [new DOMRect(49, top, 550, 412)] as unknown as DOMRectList,
  );
  const selected = {
    element: target,
    identity: { root: "layout", blockId: "image" },
  };
  const props = {
    inspecting: false,
    selected,
    onPick: vi.fn(),
    describe: vi.fn(() => "Image"),
  };
  const view = render(<InspectionLayer {...props} />);
  const tick = () =>
    act(() => {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(0));
    });
  tick();
  const outline = view.container.querySelector<HTMLElement>(
    "[data-ve-selection-outline]",
  )!;
  expect(outline.style.getPropertyValue("--pve-top")).toBe("154px");
  top = 140; // No resize, pointer, scroll, or mutation event accompanies host motion.
  tick();
  expect(outline.style.getPropertyValue("--pve-top")).toBe("140px");
  const writes = vi.spyOn(outline.style, "setProperty");
  tick();
  expect(writes).not.toHaveBeenCalled();
  expect(props.describe).toHaveBeenCalledTimes(2);
  hidden = true;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  tick();
  expect(frames.size).toBe(0);
  hidden = false;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  tick();
  expect(frames.size).toBe(1);
  view.rerender(<InspectionLayer {...props} selected={undefined} />);
  tick();
  expect(outline.hidden).toBe(true);
  expect(frames.size).toBe(0);
  view.unmount();
  target.remove();
});
