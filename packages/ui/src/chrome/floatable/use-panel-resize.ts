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

type Handle = Axis | "both";

type Size = { width: number; height?: number };

/** Resize only editor geometry. Native fields stay mounted and the right/bottom dock anchors never move. */
export function usePanelResize(
  panel: RefObject<HTMLElement | null>,
  initialWidth: number,
) {
  const id = useId();
  const [size, setSize] = useState<Size>({ width: initialWidth });
  const drag = useRef<{
    axis: Handle;
    target: HTMLElement;
    pointerId: number;
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
    panel.current?.removeAttribute("data-resizing");
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function edge(axis: Handle, label: string) {
    return {
      role: axis === "both" ? ("button" as const) : ("separator" as const),
      tabIndex: 0,
      "aria-label": label,
      "aria-controls": id,
      "aria-orientation":
        axis === "both"
          ? undefined
          : axis === "width"
            ? ("vertical" as const)
            : ("horizontal" as const),
      "aria-valuenow":
        axis === "both" ? undefined : Math.round(size[axis] || 0),
      "aria-valuetext":
        axis === "both"
          ? undefined
          : size[axis]
            ? `${Math.round(size[axis]!)} px`
            : "Automatic",
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if (event.button !== 0 || !event.isPrimary || !panel.current) return;
        event.preventDefault();
        event.currentTarget.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        const rect = panel.current.getBoundingClientRect();
        panel.current.setAttribute("data-resizing", axis);
        drag.current = {
          target: event.currentTarget,
          pointerId: event.pointerId,
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
          ...(axis !== "height"
            ? {
                width: clamp(
                  "width",
                  current.width + current.x - event.clientX,
                ),
              }
            : {}),
          ...(axis !== "width"
            ? {
                height: clamp(
                  "height",
                  current.height + current.y - event.clientY,
                ),
              }
            : {}),
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
          event.stopPropagation();
          const previous = drag.current;
          paint(previous.before);
          drag.current = null;
          panel.current?.removeAttribute("data-resizing");
          if (previous.target.hasPointerCapture(previous.pointerId))
            previous.target.releasePointerCapture(previous.pointerId);
          return;
        }
        const dimension: Axis =
          axis === "both"
            ? ["ArrowLeft", "ArrowRight"].includes(event.key)
              ? "width"
              : "height"
            : axis;
        const increasing = dimension === "width" ? "ArrowLeft" : "ArrowUp";
        const decreasing = dimension === "width" ? "ArrowRight" : "ArrowDown";
        if (![increasing, decreasing, "Home", "End"].includes(event.key))
          return;
        event.preventDefault();
        const current =
          panel.current?.getBoundingClientRect()[dimension] ||
          size[dimension] ||
          0;
        const { min, max } = limits(dimension);
        const value =
          event.key === "Home"
            ? min
            : event.key === "End"
              ? max
              : current +
                (event.key === increasing ? 1 : -1) *
                  (event.shiftKey ? 48 : 16);
        const next = { ...size, [dimension]: clamp(dimension, value) };
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
