"use client";

import { SelectionOutline } from "@payload-inplace/ui/canvas/selection-outline";
import { useEditorMessages } from "@payload-inplace/ui/localization/EditorMessages";
import { useEffect, useEffectEvent, useRef, type ReactNode } from "react";
import {
  parseDocumentKey,
  type DocumentReference,
} from "@payload-inplace/core/document-ref";
import type { BlockIdentity } from "../types";
import { elementRect, inlineSurface } from "../preview/geometry";

/** Client selection is only provenance. The schema resolver and native server access remain authoritative. */
export interface InspectionTarget {
  point?: { x: number; y: number };
  document?: DocumentReference;
  identity: BlockIdentity;
  field?: string;
  edit?: "auto" | "inline" | "panel";
  fields?: string[];
  element: Element;
}

function readTarget(element: Element | null): InspectionTarget | undefined {
  const bound = element?.closest(
    "[data-ve-field],[data-ve-fields],[data-ve-block]",
  );
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
    const fields: unknown = JSON.parse(
      bound.getAttribute("data-ve-fields") || "null",
    );
    if (
      fields !== null &&
      (!Array.isArray(fields) ||
        fields.length > 50 ||
        fields.some((field) => typeof field !== "string" || !field))
    )
      return;
    const source = bound.getAttribute("data-ve-document");
    const document = source ? parseDocumentKey(source) : undefined;
    if (source && !document) return;
    return {
      document,
      fields: fields || undefined,
      edit:
        bound.getAttribute("data-ve-edit") === "panel"
          ? "panel"
          : bound.getAttribute("data-ve-edit") === "inline"
            ? "inline"
            : "auto",
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
 * Listeners exist only during activated authoring, hover tracking only while content selection is enabled. A live target is measured each visible frame so host transforms stay aligned without requiring ResizeObserver notifications.
 */
export function InspectionLayer({
  inspecting,
  highlighting = false,
  selected,
  onPick,
  describe,
  hint,
  accept,
  actions,
}: {
  /** Context controls belong to the selected target, never a different hovered field. */
  actions?: ReactNode;
  inspecting: boolean;
  /** Hover feedback is opt-in; direct text selection can remain enabled independently. */
  highlighting?: boolean;
  selected?: InspectionTarget;
  onPick: (target: InspectionTarget) => void;
  describe: (target: InspectionTarget) => string;
  hint?: (target: InspectionTarget) => string;
  accept?: (target: InspectionTarget) => boolean;
}) {
  const { t } = useEditorMessages();
  const hover = useRef<HTMLDivElement>(null),
    caption = useRef<HTMLSpanElement>(null),
    hoverTarget = useRef<InspectionTarget | undefined>(undefined);
  const read = useEffectEvent((element: Element | null) => {
    const target = readTarget(element);
    return target && (!accept || accept(target)) ? target : undefined;
  });
  // Native form/save renders change callbacks, not the pointer or selected target.
  const currentSelection = useEffectEvent(() => selected);
  const label = useEffectEvent((target: InspectionTarget) =>
    target.element === selected?.element
      ? describe(target)
      : `${describe(target)} · ${hint?.(target) || t("clickToEdit")}`,
  );
  const pick = useEffectEvent((target: InspectionTarget) => onPick(target));
  const selectedElement = selected?.element;
  useEffect(() => {
    let frame = 0,
      disposed = false;
    const observer = new ResizeObserver(() => schedule(false));
    const observed = new Set<Element>([document.body]);
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
      const values = Object.entries({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }).map(([key, value]) => [`--pve-${key}`, `${value}px`] as const);
      if (
        values.some(([key, value]) => box.style.getPropertyValue(key) !== value)
      ) {
        box.dataset.animate = String(animate && !box.hasAttribute("hidden"));
        for (const [key, value] of values)
          if (box.style.getPropertyValue(key) !== value)
            box.style.setProperty(key, value);
      }
      box.removeAttribute("hidden");
      if (box === hover.current) {
        const below = String(rect.top < 40);
        if (box.dataset.labelBelow !== below) box.dataset.labelBelow = below;
        const available = `${Math.max(0, innerWidth - Math.max(0, rect.left) - 4)}px`;
        if (box.style.getPropertyValue("--pve-caption-width") !== available)
          box.style.setProperty("--pve-caption-width", available);
        const offset = `${Math.max(-2, -rect.left)}px`;
        if (box.style.getPropertyValue("--pve-label-offset") !== offset)
          box.style.setProperty("--pve-label-offset", offset);
      }
    }
    function follow(element: Element) {
      frame = 0;
      if (disposed) return;
      place(hover.current, element, false);
      if (element.isConnected && !document.hidden)
        frame = requestAnimationFrame(() => follow(element));
    }
    function draw(animate: boolean) {
      frame = 0;
      if (disposed) return;
      const selected = currentSelection();
      const hovered =
        inspecting && highlighting ? hoverTarget.current : undefined;
      const target = hovered || selected;
      const measured = target?.element
        ? inlineSurface(target.element)
        : undefined;
      const next = new Set<Element>([
        document.body,
        ...(measured?.isConnected ? [measured] : []),
      ]);
      for (const element of observed)
        if (!next.has(element)) {
          observer.unobserve(element);
          observed.delete(element);
        }
      for (const element of next)
        if (!observed.has(element)) {
          observer.observe(element);
          observed.add(element);
        }
      const box = hover.current;
      box?.toggleAttribute("data-ve-hover-outline", Boolean(hovered));
      box?.toggleAttribute(
        "data-ve-selection-outline",
        Boolean(target && target.element === selected?.element),
      );
      if (caption.current) {
        caption.current.hidden = !target;
        const text = target ? label(target) : "";
        if (caption.current.textContent !== text)
          caption.current.textContent = text;
      }
      place(box, target?.element || null, animate && Boolean(hovered));
      // ResizeObserver cannot see translation-only host motion or smooth-scroll settling.
      // Keep one frame read for the active target; unchanged geometry causes no style writes.
      if (target?.element.isConnected && !document.hidden)
        frame = requestAnimationFrame(() => follow(target.element));
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
      const target = read(
        event.target instanceof Element ? event.target : null,
      );
      if (hoverTarget.current?.element === target?.element) return;
      hoverTarget.current = target;
      schedule(true);
    }
    function click(event: MouseEvent) {
      if (
        ignored(event) ||
        (event.target instanceof Element &&
          event.target.closest("[data-ve-inline-active]"))
      )
        return;
      if (!inspecting) return;
      const target = read(
        event.target instanceof Element ? event.target : null,
      );
      if (!target) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      pick({ ...target, point: { x: event.clientX, y: event.clientY } });
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
      hoverTarget.current = undefined;
      schedule(false);
    }
    if (inspecting && highlighting)
      document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("click", click, true);
    document.addEventListener("submit", submit, true);
    document.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", scroll);
    document.addEventListener("pve:inline-geometry", scroll, true);
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
      document.removeEventListener("visibilitychange", scroll);
      document.removeEventListener("pve:inline-geometry", scroll, true);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", scroll);
    };
  }, [inspecting, highlighting, selectedElement]);
  return (
    <SelectionOutline
      hover={hover}
      caption={caption}
      actions={actions}
      actionLabel={selected ? describe(selected) : undefined}
    />
  );
}
