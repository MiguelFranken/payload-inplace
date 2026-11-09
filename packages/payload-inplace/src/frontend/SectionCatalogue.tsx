"use client";

import { SectionCatalogueView } from "@payload-inplace/ui/sections/catalogue";
import { useSectionPatterns } from "./section-patterns";
import type { SectionPatternSummary } from "../types";
import { useEditorMessages } from "@payload-inplace/ui/localization/EditorMessages";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { ClientBlock } from "payload";
import type { EditorCatalogueEntry, EditorLabel } from "../types";

const label = (
  value: EditorLabel | undefined,
  fallback: string,
  locale: string,
) =>
  typeof value === "string"
    ? value
    : value?.[locale] ||
      value?.[locale.split("-")[0] || "en"] ||
      value?.en ||
      fallback;

/** Searchable native-choice catalogue. Highlighting schedules only a disposable presentation delta; choosing commits once. */
export function SectionCatalogue({
  choices,
  catalogue,
  label: triggerLabel,
  triggerVariant = "row",
  disabled = false,
  locale = "en",
  onChoose,
  onChoosePattern,
  onPreview,
  className,
  defaultOpen = false,
  onOpenChange,
}: {
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  choices: ClientBlock[];
  catalogue?: Record<string, EditorCatalogueEntry>;
  label: string;
  /** Canvas insertion keeps a circular trigger; outlines retain the full-width row. */
  triggerVariant?: "canvas" | "row";
  disabled?: boolean;
  locale?: string;
  onChoose: (slug: string) => void;
  onChoosePattern?: (pattern: {
    blockType: string;
    content: Record<string, unknown>;
  }) => Promise<void>;
  onPreview?: (slug?: string) => void;
  className?: string;
}) {
  const { locale: uiLocale } = useEditorMessages(undefined, locale);

  const patterns = useSectionPatterns();
  const [mode, setMode] = useState<"sections" | "patterns">("sections");
  const [library, setLibrary] = useState<SectionPatternSummary[]>([]),
    [page, setPage] = useState(1),
    [hasMore, setHasMore] = useState(false),
    [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false);
  const libraryRequest = useRef<AbortController | null>(null);
  const [open, setOpen] = useState(defaultOpen),
    [highlight, setHighlight] = useState<string>();
  const loadPatterns = useEffectEvent(
    async (page: number, signal: AbortSignal) => {
      setBusy(true);
      setFailed(false);
      try {
        const result = await patterns!.list(page, signal);
        if (!signal.aborted) {
          setLibrary((previous) =>
            page === 1
              ? result.docs
              : [
                  ...previous,
                  ...result.docs.filter(
                    (row) => !previous.some((item) => item.id === row.id),
                  ),
                ],
          );
          setHasMore(result.hasNextPage);
        }
      } catch {
        if (!signal.aborted) setFailed(true);
      } finally {
        if (!signal.aborted) setBusy(false);
      }
    },
  );
  useEffect(() => {
    if (!open || mode !== "patterns" || !patterns?.canRead || !onChoosePattern)
      return;
    const controller = new AbortController();
    libraryRequest.current = controller;
    void loadPatterns(page, controller.signal);
    return () => controller.abort();
  }, [open, mode, page, patterns?.canRead, Boolean(onChoosePattern)]);
  useEffect(() => () => libraryRequest.current?.abort(), []);
  const patternRows = library.filter((row) =>
    choices.some((block) => block.slug === row.blockType),
  );
  const patternFor = (slug: string) =>
    mode === "patterns"
      ? patternRows.find((row) => `pattern:${row.id}` === slug)
      : undefined;
  const notifyOpen = useEffectEvent((open: boolean) => onOpenChange?.(open));
  useEffect(() => {
    notifyOpen(open);
    return () => notifyOpen(false);
  }, [open]);
  const preview = useEffectEvent((slug?: string) => onPreview?.(slug));
  useEffect(() => {
    if (!open || !highlight || mode === "patterns") return;
    const timer = setTimeout(() => preview(highlight), 220);
    return () => {
      clearTimeout(timer);
      preview();
    };
  }, [open, highlight, mode]);
  const itemLabel = (slug: string) =>
    patternFor(slug)?.label ||
    label(
      catalogue?.[slug]?.label,
      typeof choices.find((block) => block.slug === slug)?.labels?.singular ===
        "string"
        ? (choices.find((block) => block.slug === slug)!.labels!
            .singular as string)
        : slug,
      locale,
    );
  const close = () => {
    setOpen(false);
    setHighlight(undefined);
    onPreview?.();
    libraryRequest.current?.abort();
    setBusy(false);
  };
  const choose = (slug: string) => {
    if (slug) {
      const pattern = patternFor(slug);
      if (pattern && patterns && onChoosePattern) {
        if (busy) return;
        const controller = new AbortController();
        libraryRequest.current?.abort();
        libraryRequest.current = controller;
        setBusy(true);
        setFailed(false);
        void patterns
          .read(pattern.id, controller.signal)
          .then(async (value) => {
            if (!controller.signal.aborted) await onChoosePattern(value);
            if (!controller.signal.aborted) close();
          })
          .catch(() => {
            if (!controller.signal.aborted) setFailed(true);
          })
          .finally(() => {
            if (!controller.signal.aborted) setBusy(false);
          });
      } else {
        close();
        onChoose(slug);
      }
    }
  };
  const ids =
    mode === "patterns"
      ? patternRows.map((row) => `pattern:${row.id}`)
      : choices.map((block) => block.slug);
  return (
    <SectionCatalogueView
      items={ids.map((id) => {
        const entry = catalogue?.[id];
        const block = choices.find((choice) => choice.slug === id);
        const image =
          entry?.thumbnail?.src ||
          (block && "imageURL" in block && typeof block.imageURL === "string"
            ? block.imageURL
            : undefined);
        return {
          id,
          label: itemLabel(id),
          group: entry?.group ? label(entry.group, "", uiLocale) : undefined,
          description: entry?.description
            ? label(entry.description, "", uiLocale)
            : undefined,
          thumbnail:
            image && /^(?:\/[^/]|https:\/\/)/.test(image)
              ? { src: image, alt: entry?.thumbnail?.alt || "" }
              : undefined,
        };
      })}
      label={triggerLabel}
      triggerVariant={triggerVariant}
      disabled={disabled}
      hasChoices={choices.length > 0}
      locale={locale}
      mode={mode}
      busy={busy}
      failed={failed}
      open={open}
      className={className}
      onChoose={choose}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
      onHighlight={setHighlight}
      onModeChange={
        patterns?.canRead && onChoosePattern
          ? (next) => {
              setMode(next);
              if (next === "sections") setFailed(false);
              else {
                setPage(1);
                onPreview?.();
              }
            }
          : undefined
      }
      onLoadMore={hasMore ? () => setPage((value) => value + 1) : undefined}
      previewEnabled={Boolean(onPreview)}
    />
  );
}
