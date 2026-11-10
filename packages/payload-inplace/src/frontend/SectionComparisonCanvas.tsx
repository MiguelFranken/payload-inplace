"use client";

import { useLayoutEffect, useState } from "react";
import { ComparisonMarker } from "@payload-inplace/ui/review/comparison-marker";
import { useEditorMessages } from "@payload-inplace/ui/localization/EditorMessages";
import { elementRect } from "../preview/geometry";
import type { SectionChange } from "../state/section-comparison";

const labels = {
  added: "sectionAdded",
  removed: "sectionRemoved",
  changed: "sectionEdited",
  moved: "sectionComparisonMoved",
} as const;

/** One scan per presentation change. Field bindings and other editable document scopes cannot produce section markers. */
export function comparisonElements(
  host: HTMLElement,
  root: string,
  scopeKey: string,
): Map<string, HTMLElement> {
  const elements = new Map<string, HTMLElement>();
  for (const element of host.querySelectorAll<HTMLElement>(
    "[data-ve-block]:not([data-ve-field]):not([data-ve-fields])",
  )) {
    const provenance = element.dataset.veDocument;
    const id = element.dataset.veBlock;
    if (
      id &&
      element.dataset.veRoot === root &&
      element.dataset.veAncestors === "[]" &&
      (!provenance || provenance === scopeKey) &&
      (!elements.has(id) || !elementRect(elements.get(id)!))
    )
      elements.set(id, element);
  }
  return elements;
}

/** Measure visible markers after scroll, viewport and renderer changes, without inserting UI in the page flow. */
export function SectionComparisonCanvas({
  host,
  root,
  scopeKey,
  changes,
  current,
  onVisible,
}: {
  host: HTMLElement;
  root: string;
  scopeKey: string;
  changes: readonly SectionChange[];
  current?: string;
  onVisible: (ids: string[]) => void;
}) {
  const { t } = useEditorMessages();
  const [markers, setMarkers] = useState<
    { change: SectionChange; rect: DOMRect }[]
  >([]);

  useLayoutEffect(() => {
    let frame = 0;
    let elements = new Map<string, HTMLElement>();
    let previousIDs: string | undefined;
    const changed = new Map(changes.map((change) => [change.id, change]));
    const resize = new ResizeObserver(schedule);
    const mutations = new MutationObserver(bind);
    function measure() {
      frame = 0;
      const visible: { change: SectionChange; rect: DOMRect }[] = [];
      const ids: string[] = [];
      for (const [id, element] of elements) {
        const change = changed.get(id);
        const rect = change && elementRect(element);
        if (!rect) continue;
        ids.push(id);
        if (
          rect.bottom > 0 &&
          rect.top < innerHeight &&
          rect.right > 0 &&
          rect.left < innerWidth
        )
          visible.push({ change, rect });
      }
      const fingerprint = JSON.stringify(ids);
      if (fingerprint !== previousIDs) {
        previousIDs = fingerprint;
        onVisible(ids);
      }
      setMarkers(visible);
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(measure);
    }
    function bind() {
      resize.disconnect();
      elements = comparisonElements(host, root, scopeKey);
      resize.observe(host);
      for (const [id, element] of elements)
        if (changed.has(id)) resize.observe(element);
      schedule();
    }
    bind();
    mutations.observe(host, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "data-ve-block",
        "data-ve-root",
        "data-ve-ancestors",
        "data-ve-document",
        "hidden",
        "class",
      ],
    });
    window.addEventListener("scroll", schedule, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      resize.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [host, root, scopeKey, changes, onVisible]);

  return markers.map(({ change, rect }) => (
    <ComparisonMarker
      key={change.id}
      rect={rect}
      label={t(labels[change.kind])}
      current={change.id === current}
    />
  ));
}
