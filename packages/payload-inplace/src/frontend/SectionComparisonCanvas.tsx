"use client";

import { useLayoutEffect, useState } from "react";
import { ComparisonMarker } from "@payload-inplace/ui/review/comparison-marker";
import { useEditorMessages } from "@payload-inplace/ui/localization/EditorMessages";
import { elementRect } from "../preview/geometry";
import type { ComparisonTarget } from "./comparison-elements";

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
  targets,
  elementMode,
  current,
  onRendered,
}: {
  host: HTMLElement;
  targets: () => ComparisonTarget[];
  elementMode: boolean;
  current?: ComparisonTarget;
  onRendered: (targets: ComparisonTarget[]) => void;
}) {
  const { t } = useEditorMessages();
  const [markers, setMarkers] = useState<
    { change: ComparisonTarget; rect: DOMRect }[]
  >([]);

  useLayoutEffect(() => {
    let frame = 0;
    let elements: ComparisonTarget[] = [];
    let previous: ComparisonTarget[] | undefined;
    const resize = new ResizeObserver(schedule);
    const mutations = new MutationObserver(bind);
    function measure() {
      frame = 0;
      const visible: { change: ComparisonTarget; rect: DOMRect }[] = [];
      const rendered: ComparisonTarget[] = [];
      for (const change of elements) {
        const rect = elementRect(change.element);
        if (!rect) continue;
        rendered.push(change);
        if (
          rect.bottom > 0 &&
          rect.top < innerHeight &&
          rect.right > 0 &&
          rect.left < innerWidth
        )
          visible.push({ change, rect });
      }
      if (
        previous?.length !== rendered.length ||
        rendered.some(
          (item, index) =>
            item.element !== previous?.[index]?.element ||
            item.id !== previous[index]?.id ||
            item.label !== previous[index]?.label ||
            item.kind !== previous[index]?.kind,
        )
      ) {
        previous = rendered;
        onRendered(rendered);
      }
      setMarkers(visible);
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(measure);
    }
    function bind() {
      resize.disconnect();
      elements = targets();
      resize.observe(host);
      for (const { element } of elements) resize.observe(element);
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
        "data-ve-field",
        "data-ve-fields",
        "hidden",
        "class",
      ],
    });
    window.addEventListener("scroll", schedule, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", bind, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      resize.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", bind);
    };
  }, [host, targets, onRendered]);

  return markers.map(({ change, rect }) => (
    <ComparisonMarker
      key={change.id}
      rect={rect}
      label={elementMode ? undefined : t(labels[change.kind])}
      current={
        elementMode
          ? change.element === current?.element
          : change.id === current?.id
      }
    />
  ));
}
