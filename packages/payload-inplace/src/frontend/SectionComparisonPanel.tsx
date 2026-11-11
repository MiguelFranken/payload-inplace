"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { BlocksFieldClientProps, ClientBlock } from "payload";
import {
  documentKey,
  type DocumentReference,
} from "@payload-inplace/core/document-ref";
import { useEditorMessages } from "@payload-inplace/ui/localization/EditorMessages";
import {
  ComparisonToolbar,
  type ComparisonHighlight,
} from "@payload-inplace/ui/review/comparison-toolbar";
import {
  comparisonBindings,
  compareSections,
} from "../state/section-comparison";
import { elementRect } from "../preview/geometry";
import { scrollToSection } from "./BlockReorder";
import {
  comparisonElements,
  SectionComparisonCanvas,
} from "./SectionComparisonCanvas";
import { changedElements, type ComparisonTarget } from "./comparison-elements";
import type { useSectionComparison } from "./controllers/section-comparison";

export function SectionComparisonPanel({
  comparison,
  host,
  field,
  blocks,
  scope,
  root,
  onClose,
}: {
  comparison: ReturnType<typeof useSectionComparison>;
  host: HTMLElement;
  field: BlocksFieldClientProps["field"];
  blocks: Record<string, ClientBlock>;
  scope: DocumentReference;
  root: string;
  onClose: () => void;
}) {
  const { state, select, open } = comparison;
  const scopeKey = documentKey(scope);
  const { t, locale } = useEditorMessages();
  const snapshot = state.kind === "ready" ? state.snapshot : undefined;
  const side = state.kind === "ready" ? state.side : "draft";
  const [highlight, setHighlight] = useState<ComparisonHighlight>("sections");
  const elementMode = highlight === "elements";
  const [current, setCurrent] = useState<ComparisonTarget>();
  const [bound, setBound] = useState<ComparisonTarget[]>();
  const available = bound ?? [];
  const close = useRef<HTMLButtonElement>(null);
  const scroll = useRef<() => void>(null);
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() =>
      close.current?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, []);
  useLayoutEffect(() => {
    scroll.current?.();
    scroll.current = null;
  }, [side]);

  const report = useMemo(
    () =>
      snapshot ? compareSections(snapshot, field, blocks, locale) : undefined,
    [snapshot, field, blocks, locale],
  );
  const sideChanges = useMemo(
    () =>
      report?.sections.filter((change) =>
        side === "draft" ? change.kind !== "removed" : change.kind !== "added",
      ) ?? [],
    [report, side],
  );
  const rows = snapshot?.[side];
  const resolve = useMemo(
    () =>
      elementMode && rows ? comparisonBindings(rows, field, blocks) : undefined,
    [elementMode, rows, field, blocks],
  );
  const targets = useCallback(() => {
    if (resolve && report)
      return changedElements({
        host,
        root,
        scopeKey,
        side,
        fields: report.fields,
        resolve,
      });
    if (elementMode) return [];
    const sections = new Map(sideChanges.map((change) => [change.id, change]));
    return [...comparisonElements(host, root, scopeKey)].flatMap(
      ([id, element]) => {
        const change = sections.get(id);
        return change ? [{ ...change, element }] : [];
      },
    );
  }, [host, root, scopeKey, side, report, sideChanges, elementMode, resolve]);
  const position = available.findIndex((item) =>
    elementMode ? item.element === current?.element : item.id === current?.id,
  );
  const focused = available[position];
  let status = "";
  const hints: string[] = [];
  if (state.kind === "loading") status = t("loadingSectionComparison");
  if (state.kind === "error") status = t("sectionComparisonUnavailable");
  if (state.kind === "stale") status = t("sectionComparisonStale");
  if (snapshot && report) {
    const count = report.sections.length;
    if (focused)
      status = t("sectionComparisonPosition", {
        label: focused.label,
        position: position + 1,
        total: available.length,
      });
    else if (elementMode && bound)
      status = available.length
        ? t("elementComparisonCount", { count: available.length })
        : t("noChangedElements");
    else if (!elementMode && count)
      status = t("sectionComparisonCount", { count });
    else if (!elementMode && snapshot.published !== null && !report.unmapped)
      status = t("noSectionChanges");

    if (snapshot.published === null)
      hints.push(t("sectionComparisonNoPublished"));
    else if (!elementMode && sideChanges.length !== count)
      hints.push(
        t(
          side === "draft"
            ? "sectionComparisonShowRemoved"
            : "sectionComparisonShowAdded",
        ),
      );
    if (
      !elementMode &&
      (report.unmapped || (bound && bound.length < sideChanges.length))
    )
      hints.push(t("sectionComparisonUnmapped"));
  }

  function captureScroll() {
    const top = window.scrollY;
    const left = window.scrollX;
    const anchors = comparisonElements(host, root, scopeKey);
    const anchor = [...anchors].find(([, element]) => {
      const rect = elementRect(element);
      return rect && rect.top >= 0 && rect.top < innerHeight / 2;
    });
    const offset = anchor && elementRect(anchor[1])?.top;
    return () => {
      const element =
        anchor && comparisonElements(host, root, scopeKey).get(anchor[0]);
      const rect = element && elementRect(element);
      window.scrollTo({
        left,
        top:
          rect && offset !== undefined
            ? window.scrollY + rect.top - offset
            : top,
        behavior: "instant",
      });
    };
  }

  function closeView() {
    const restoreScroll = side === "published" ? captureScroll() : undefined;
    onClose();
    if (restoreScroll) requestAnimationFrame(restoreScroll);
  }
  const escape = useEffectEvent(closeView);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const target = event.composedPath()[0];
      if (
        target instanceof Element &&
        target.closest('dialog[open],[role="dialog"]')
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      escape();
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  return (
    <>
      {snapshot && (
        <SectionComparisonCanvas
          key={`${side}-${highlight}`}
          host={host}
          targets={targets}
          elementMode={elementMode}
          current={current}
          onRendered={setBound}
        />
      )}
      <ComparisonToolbar
        closeRef={close}
        side={side}
        highlight={highlight}
        status={status}
        hint={hints.join(" ")}
        ready={Boolean(snapshot)}
        hasPublished={Boolean(snapshot?.published)}
        canNavigate={available.length > 0 && Boolean(snapshot)}
        onHighlight={(next) => {
          if (highlight === next) return;
          setCurrent(undefined);
          setBound(undefined);
          setHighlight(next);
        }}
        onSide={(next) => {
          if (next === side) return;
          scroll.current = captureScroll();
          setBound(undefined);
          if (elementMode) setCurrent(undefined);
          select(next);
        }}
        onNext={() => {
          const target = available[(position + 1) % available.length];
          const rect =
            target?.element.isConnected && elementRect(target.element);
          if (!rect) return;
          setCurrent(target);
          scrollToSection(rect);
        }}
        onClose={closeView}
        onRetry={state.kind === "error" ? () => void open() : undefined}
      />
    </>
  );
}
