"use client";
import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
type Axis = "width" | "height";
type Size = { width: number; height?: number };
/** Resize only editor geometry. Native fields stay mounted and the right/bottom dock anchors never move. */
export function usePanelResize(
  panel: RefObject<HTMLElement | null>,
  initialWidth: number,
) {
  const id = useId();
  const [size, setSize] = useState<Size>({ width: initialWidth });
  const drag = useRef<{
    axis: Axis;
    x: number;
    y: number;
    width: number;
    height: number;
    before: Size;
    value: Size;
  } | null>(null);
  function limits(axis: Axis) {
    const element = panel.current;
    const rect = element?.getBoundingClientRect();
    const max = Math.max(
      1,
      axis === "width"
        ? (rect?.right || innerWidth - 12) - 12
        : (rect?.bottom || innerHeight - 80) - 12,
    );
    return { min: Math.min(axis === "width" ? 280 : 200, max), max };
  }
  function clamp(axis: Axis, value: number) {
    const { min, max } = limits(axis);
    return Math.round(Math.max(min, Math.min(max, value)));
  }
  function paint(value: Size) {
    const element = panel.current;
    element?.style.setProperty("--pve-context-width", `${value.width}px`);
    if (value.height !== undefined) {
      element?.style.setProperty("--pve-context-height", `${value.height}px`);
      element?.style.setProperty("--pve-body-limit", "none");
    } else {
      element?.style.removeProperty("--pve-context-height");
      element?.style.removeProperty("--pve-body-limit");
    }
  }
  function finish(event: PointerEvent<HTMLElement>, cancel = false) {
    const current = drag.current;
    if (!current) return;
    const value = cancel ? current.before : current.value;
    paint(value);
    setSize(value);
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function edge(axis: Axis, label: string) {
    return {
      role: "separator" as const,
      tabIndex: 0,
      "aria-label": label,
      "aria-controls": id,
      "aria-orientation":
        axis === "width" ? ("vertical" as const) : ("horizontal" as const),
      "aria-valuenow": Math.round(size[axis] || 0),
      "aria-valuetext": size[axis]
        ? `${Math.round(size[axis]!)} px`
        : "Automatic",
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if (event.button !== 0 || !event.isPrimary || !panel.current) return;
        event.preventDefault();
        event.currentTarget.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        const rect = panel.current.getBoundingClientRect();
        drag.current = {
          axis,
          x: event.clientX,
          y: event.clientY,
          width: rect.width,
          height: rect.height,
          before: size,
          value: { width: rect.width, height: rect.height },
        };
      },
      onPointerMove(event: PointerEvent<HTMLElement>) {
        const current = drag.current;
        if (!current || current.axis !== axis) return;
        current.value = {
          ...current.value,
          [axis]: clamp(
            axis,
            current[axis] +
              (axis === "width"
                ? current.x - event.clientX
                : current.y - event.clientY),
          ),
        };
        paint(current.value);
      },
      onPointerUp: (event: PointerEvent<HTMLElement>) => finish(event),
      onPointerCancel: (event: PointerEvent<HTMLElement>) =>
        finish(event, true),
      onLostPointerCapture(event: PointerEvent<HTMLElement>) {
        if (drag.current) finish(event, true);
      },
      onKeyDown(event: KeyboardEvent<HTMLElement>) {
        if (event.key === "Escape" && drag.current) {
          event.preventDefault();
          paint(drag.current.before);
          drag.current = null;
          return;
        }
        const increasing = axis === "width" ? "ArrowLeft" : "ArrowUp";
        const decreasing = axis === "width" ? "ArrowRight" : "ArrowDown";
        if (![increasing, decreasing, "Home", "End"].includes(event.key))
          return;
        event.preventDefault();
        const current =
          panel.current?.getBoundingClientRect()[axis] || size[axis] || 0;
        const { min, max } = limits(axis);
        const value =
          event.key === "Home"
            ? min
            : event.key === "End"
              ? max
              : current +
                (event.key === increasing ? 1 : -1) *
                  (event.shiftKey ? 48 : 16);
        const next = { ...size, [axis]: clamp(axis, value) };
        paint(next);
        setSize(next);
      },
    };
  }
  return {
    id,
    edge,
    style: {
      "--pve-context-width": `${size.width}px`,
      ...(size.height === undefined
        ? {}
        : {
            "--pve-context-height": `${size.height}px`,
            "--pve-body-limit": "none",
          }),
    } as CSSProperties,
  };
}
