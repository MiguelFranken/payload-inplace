"use client";
import { useEditorMessages } from "./messages.js";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { ClientBlock } from "payload";
import {
  documentKey,
  type DocumentReference,
} from "../../../core/src/document-ref.js";
import type { InsertionTarget } from "../../../core/src/insertion.js";
import { elementRect } from "../preview/geometry.js";
import { sectionElement } from "./BlockReorder.js";
import type { NativeSection } from "../schema/tree.js";
import { Button } from "./ui/button.js";
import { ChromeTooltip } from "./ui/tooltip.js";
import { CatalogueLauncher as SectionCatalogue } from "./CatalogueLauncher.js";
import type { EditorCatalogueEntry } from "../types.js";
type Hover = {
  element: HTMLElement;
  section?: NativeSection;
  list?: InsertionTarget;
};
/** Canvas affordances are overlays; consumer layout nodes are never wrapped or moved.
 * The picker carries stable identity until the shared native command resolves it again.
 */
export function InsertionPoints({
  sections,
  catalogue,
  preview,
  root,
  enabled,
  options,
  insert,
  locale = "en",
  document,
}: {
  catalogue?: Record<string, EditorCatalogueEntry>;
  preview?: (target: InsertionTarget, slug?: string) => void;
  sections: NativeSection[];
  root: string;
  enabled: boolean;
  locale?: string;
  document?: DocumentReference;
  options: (
    target: InsertionTarget,
  ) =>
    | { field: { type: "array" | "blocks" }; choices: ClientBlock[] }
    | undefined;
  insert: (target: InsertionTarget, blockType?: string) => string | undefined;
}) {
  const { t } = useEditorMessages(undefined, locale);

  const [hover, setHover] = useState<Hover>();
  const held = useRef(false);
  const box = useRef<HTMLDivElement>(null);
  const choose = useEffectEvent((element: Element | null) => {
    if (
      held.current ||
      !element ||
      element.closest("[data-ve-ui],[data-ve-inline-active]")
    )
      return;
    const bound = element.closest<HTMLElement>(
      "[data-ve-list],[data-ve-block]",
    );
    if (!bound || bound.getAttribute("data-ve-root") !== root) return;
    const provenance = bound.getAttribute("data-ve-document");
    if (provenance && (!document || provenance !== documentKey(document)))
      return;
    let ancestors: string[];
    try {
      ancestors = JSON.parse(bound.getAttribute("data-ve-ancestors") || "[]");
    } catch {
      return;
    }
    const section = sections.find(
      (s) =>
        s.identity.blockId === bound.getAttribute("data-ve-block") &&
        JSON.stringify(s.identity.ancestors || []) ===
          JSON.stringify(ancestors),
    );
    const list = bound.hasAttribute("data-ve-list")
      ? {
          kind: "list" as const,
          root,
          field: bound.getAttribute("data-ve-list") || "",
          ...(section ? { identity: section.identity } : {}),
        }
      : undefined;
    if (!section && !list) return;
    const target = list ? bound : sectionElement(section!);
    if (!(target instanceof HTMLElement)) return;
    setHover((previous) =>
      previous?.element === target
        ? previous
        : { element: target, section, list },
    );
  });
  useEffect(() => {
    if (!enabled) return;
    const move = (event: Event) =>
      choose(event.target instanceof Element ? event.target : null);
    window.document.addEventListener("pointermove", move, { passive: true });
    window.document.addEventListener("focusin", move);
    const first = sections[0] && sectionElement(sections[0]);
    if (first) choose(first);
    else choose(window.document.querySelector("[data-ve-list]"));
    return () => {
      window.document.removeEventListener("pointermove", move);
      window.document.removeEventListener("focusin", move);
    };
  }, [enabled]);
  useEffect(() => {
    if (!enabled || !hover) return;
    let frame = 0;
    const draw = () => {
      frame = 0;
      if (!hover.element.isConnected) {
        const replacement = hover.section
          ? sectionElement(hover.section)
          : [
              ...window.document.querySelectorAll<HTMLElement>(
                "[data-ve-list]",
              ),
            ].find(
              (el) =>
                el.getAttribute("data-ve-root") === root &&
                el.getAttribute("data-ve-list") ===
                  (hover.list?.kind === "list" ? hover.list.field : ""),
            );
        if (replacement && replacement !== hover.element) {
          setHover({ ...hover, element: replacement });
          return;
        }
      }
      const el = box.current,
        rect = hover.element.isConnected
          ? elementRect(hover.element) || hover.element.getBoundingClientRect()
          : null;
      if (!el) return;
      el.dataset.visible = String(
        Boolean(rect && rect.bottom >= 0 && rect.top <= innerHeight),
      );
      if (!rect) return;
      el.dataset.beforeVisible = String(
        rect.top >= 22 && rect.top <= innerHeight - 22,
      );
      el.dataset.afterVisible = String(
        rect.bottom >= 22 && rect.bottom <= innerHeight - 22,
      );
      el.style.setProperty(
        "--pve-insert-x",
        `${Math.max(28, Math.min(innerWidth - 28, rect.left + rect.width / 2))}px`,
      );
      el.style.setProperty(
        "--pve-insert-before",
        `${Math.max(6, rect.top - 22)}px`,
      );
      el.style.setProperty("--pve-insert-after", `${rect.bottom - 22}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(hover.element);
    const mutations = new MutationObserver(schedule);
    mutations.observe(window.document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      mutations.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [enabled, hover]);
  if (!enabled || !hover) return null;
  const points: { target: InsertionTarget; side: "before" | "after" }[] =
    hover.list
      ? [{ target: hover.list, side: "after" }]
      : hover.section
        ? ["before", "after"].map((side) => ({
            side: side as "before" | "after",
            target: {
              kind: "adjacent",
              identity: hover.section!.identity,
              side: side as "before" | "after",
            },
          }))
        : [];
  return (
    <div
      ref={box}
      data-ve-ui=""
      data-visible="false"
      className="pve:group/insert pve:pointer-events-none pve:data-[visible=false]:hidden"
    >
      {points.map(({ target, side }) => {
        const allowed = options(target);
        if (!allowed) return null;
        const label =
          allowed.field.type === "array"
            ? t("addItem")
            : side === "before"
              ? t("addSectionBefore")
              : t("addSectionAfter");
        const classes = `pve:pointer-events-auto pve:fixed pve:z-50 pve:left-[var(--pve-insert-x)] pve:-translate-x-1/2 pve:w-11 ${side === "before" ? "pve:top-[var(--pve-insert-before)] pve:group-data-[before-visible=false]/insert:hidden" : "pve:top-[var(--pve-insert-after)] pve:group-data-[after-visible=false]/insert:hidden"}`;
        return (
          <div className={classes} data-ve-insert-boundary={side} key={side}>
            {allowed.field.type === "array" ? (
              <ChromeTooltip label={label}>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label={label}
                  onClick={() => insert(target)}
                >
                  <Plus size={16} />
                </Button>
              </ChromeTooltip>
            ) : (
              <SectionCatalogue
                onOpenChange={(open) => {
                  held.current = open;
                }}
                choices={allowed.choices}
                catalogue={catalogue}
                label={label}
                locale={locale}
                onChoose={(slug) => insert(target, slug)}
                onPreview={
                  preview ? (slug) => preview(target, slug) : undefined
                }
                className="pve:px-0"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
