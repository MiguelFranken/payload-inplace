"use client";
import { useEffect, useRef } from "react";
import type { BlockIdentity } from "../types.js";
import { elementRect } from "../preview/geometry.js";

/** Client selection is only provenance. The schema resolver and native server access remain authoritative. */
export interface InspectionTarget {
  point?: { x: number; y: number };
  identity: BlockIdentity;
  field?: string;
  element: Element;
}
function readTarget(element: Element | null): InspectionTarget | undefined {
  const bound = element?.closest("[data-ve-field],[data-ve-block]");
  if (!bound) return;
  try {
    const ancestors = JSON.parse(
      bound.getAttribute("data-ve-ancestors") || "[]",
    );
    if (
      !Array.isArray(ancestors) ||
      ancestors.some((a) => typeof a !== "string")
    )
      return;
    return {
      element: bound,
      identity: {
        root: bound.getAttribute("data-ve-root") || "",
        blockId: bound.getAttribute("data-ve-block") || "",
        ancestors,
      },
      field: bound.getAttribute("data-ve-field") || undefined,
    };
  } catch {
    return;
  }
}
/** One coalesced hover box follows bound site elements; UI events and native drawers are ignored.
 * Listeners exist only during activated authoring, hover tracking only while content selection is enabled. Motion is opt-in and geometry updates stay instant on scroll.
 */
export function InspectionLayer({
  inspecting,
  highlighting = false,
  selected,
  onPick,
  describe,
}: {
  inspecting: boolean;
  /** Hover feedback is opt-in; direct text selection can remain enabled independently. */
  highlighting?: boolean;
  selected?: InspectionTarget;
  onPick: (target: InspectionTarget) => void;
  describe: (target: InspectionTarget) => string;
}) {
  const hover = useRef<HTMLDivElement>(null),
    chosen = useRef<HTMLDivElement>(null),
    caption = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let frame = 0,
      hoverTarget: Element | null = null,
      disposed = false;
    const observer = new ResizeObserver(() => schedule(false));
    observer.observe(document.body);
    function place(
      box: HTMLElement | null,
      element: Element | null,
      animate: boolean,
    ) {
      const rect = element?.isConnected ? elementRect(element) : null;
      if (!box || !rect || rect.width <= 0 || rect.height <= 0) {
        box?.setAttribute("hidden", "");
        return;
      }
      box.dataset.animate = String(animate && !box.hasAttribute("hidden"));
      for (const [key, value] of Object.entries({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }))
        box.style.setProperty(`--pve-${key}`, `${value}px`);
      box.removeAttribute("hidden");
      if (box === hover.current) box.dataset.labelBelow = String(rect.top < 32);
    }
    function draw(animate: boolean) {
      frame = 0;
      if (disposed) return;
      place(
        hover.current,
        inspecting && highlighting && hoverTarget !== selected?.element
          ? hoverTarget
          : null,
        animate,
      );
      place(chosen.current, selected?.element || null, false);
    }
    function schedule(animate = false) {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => draw(animate));
    }
    function ignored(event: Event) {
      return event
        .composedPath()
        .some(
          (node) => node instanceof Element && node.hasAttribute("data-ve-ui"),
        );
    }
    function move(event: PointerEvent) {
      if (ignored(event)) {
        leave();
        return;
      }
      const target = readTarget(
        event.target instanceof Element ? event.target : null,
      );
      if (hoverTarget === target?.element) return;
      hoverTarget = target?.element || null;
      if (caption.current)
        caption.current.textContent = target
          ? `${describe(target)} · Click to edit`
          : "";
      schedule(true);
    }
    function click(event: MouseEvent) {
      if (
        ignored(event) ||
        (event.target instanceof Element &&
          event.target.closest("[data-ve-inline-active]"))
      )
        return;
      // Authoring is a read-only rendering capability. Host renderers also suppress their business effects.
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!inspecting) return;
      const target = readTarget(
        event.target instanceof Element ? event.target : null,
      );
      if (target)
        onPick({ ...target, point: { x: event.clientX, y: event.clientY } });
    }
    function submit(event: Event) {
      if (!ignored(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }
    function scroll() {
      schedule(false);
    }
    function leave() {
      hoverTarget = null;
      schedule(false);
    }
    if (inspecting && highlighting)
      document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("click", click, true);
    document.addEventListener("submit", submit, true);
    document.addEventListener("pointerleave", leave);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", scroll);
    schedule(false);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("pointermove", move);
      document.removeEventListener("click", click, true);
      document.removeEventListener("submit", submit, true);
      document.removeEventListener("pointerleave", leave);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", scroll);
    };
  }, [inspecting, highlighting, selected, onPick, describe]);
  const geometry =
    "pve:pointer-events-none pve:fixed pve:z-40 pve:box-border pve:left-[var(--pve-left)] pve:top-[var(--pve-top)] pve:w-[var(--pve-width)] pve:h-[var(--pve-height)] pve:rounded-sm pve:border-2 pve:border-solid pve:border-[var(--pve-accent,#3455db)]";
  return (
    <>
      <div
        ref={chosen}
        hidden
        data-ve-selection-outline=""
        aria-hidden="true"
        className={geometry}
      />
      <div
        ref={hover}
        hidden
        data-ve-hover-outline=""
        aria-hidden="true"
        className={`${geometry} pve:bg-[var(--pve-hover-fill,#3455db0d)] pve:motion-safe:data-[animate=true]:transition-[left,top,width,height,opacity] pve:motion-safe:data-[animate=true]:duration-100 pve:motion-safe:data-[animate=true]:ease-[cubic-bezier(0.2,0,0,1)]`}
      >
        <span
          ref={caption}
          className="pve:absolute pve:bottom-full pve:start-0 pve:max-w-60 pve:rounded-t-md pve:bg-[var(--pve-accent,#3455db)] pve:px-2 pve:py-1 pve:font-sans pve:text-xs pve:leading-relaxed pve:text-white pve:in-data-[label-below=true]:bottom-auto pve:in-data-[label-below=true]:top-full"
        />
      </div>
    </>
  );
}
