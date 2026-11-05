"use client";
import { useSectionPatterns } from "./section-patterns.js";
import type { SectionPatternSummary } from "../types.js";
import { Button } from "./ui/button.js";
import { useEditorMessages } from "./messages.js";

import { Combobox } from "@base-ui/react/combobox";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Plus, Search, Layers } from "lucide-react";
import type { ClientBlock } from "payload";
import type { EditorCatalogueEntry, EditorLabel } from "../types.js";
import { useChromePortal } from "./ui/portal.js";
import { ChromeTooltip } from "./ui/tooltip.js";
import { chrome } from "../admin/chrome.js";
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
  const { t, locale: uiLocale } = useEditorMessages(undefined, locale);

  const patterns = useSectionPatterns();
  const [mode, setMode] = useState<"sections" | "patterns">("sections");
  const [library, setLibrary] = useState<SectionPatternSummary[]>([]),
    [page, setPage] = useState(1),
    [hasMore, setHasMore] = useState(false),
    [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false);
  const libraryRequest = useRef<AbortController | null>(null);
  const container = useChromePortal();
  const [open, setOpen] = useState(defaultOpen),
    [highlight, setHighlight] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
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
  return (
    <Combobox.Root<string>
      items={
        mode === "patterns"
          ? patternRows.map((row) => `pattern:${row.id}`)
          : choices.map((block) => block.slug)
      }
      value={null}
      open={open}
      onOpenChange={(next, details) => {
        if (!next && details.reason === "item-press" && mode === "patterns")
          return;
        if (next) setOpen(true);
        else close();
      }}
      itemToStringLabel={itemLabel}
      onValueChange={(slug) => {
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
      }}
      onItemHighlighted={(slug) => setHighlight(slug)}
      filter={(slug, query) =>
        `${itemLabel(slug)} ${label(catalogue?.[slug]?.description, "", uiLocale)} ${label(catalogue?.[slug]?.group, "", uiLocale)}`
          .toLocaleLowerCase(locale)
          .includes(query.toLocaleLowerCase(locale))
      }
    >
      <ChromeTooltip label={triggerLabel}>
        <Combobox.Trigger
          disabled={disabled || choices.length === 0}
          aria-label={triggerLabel}
          render={
            <Button
              variant={triggerVariant === "canvas" ? "canvas" : "secondary"}
              size={triggerVariant === "canvas" ? "icon" : "default"}
            />
          }
          className={`${triggerVariant === "canvas" ? "pve:size-11" : "pve:w-full"} ${className || ""}`}
        >
          <Plus size={17} />
        </Combobox.Trigger>
      </ChromeTooltip>
      <Combobox.Portal container={container}>
        <Combobox.Positioner
          side="top"
          align="end"
          sideOffset={10}
          className="pve:pointer-events-auto pve:z-[110]"
        >
          <Combobox.Popup
            data-ve-ui=""
            aria-label={triggerLabel}
            className={`pve:box-border pve:w-80 pve:max-w-[calc(100vw-24px)] pve:overflow-hidden pve:rounded-xl pve:border pve:border-solid pve:shadow-xl ${chrome.surface} ${chrome.border}`}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                close();
              }
            }}
          >
            {patterns?.canRead && onChoosePattern && (
              <div
                role="group"
                aria-label={t("patternsLibrary")}
                className="pve:flex pve:gap-1 pve:p-2"
              >
                <Button
                  size="sm"
                  aria-pressed={mode === "sections"}
                  variant={mode === "sections" ? "outline" : "ghost"}
                  onClick={() => {
                    setMode("sections");
                    setFailed(false);
                  }}
                >
                  {t("sectionsLibrary")}
                </Button>
                <Button
                  size="sm"
                  aria-pressed={mode === "patterns"}
                  variant={mode === "patterns" ? "outline" : "ghost"}
                  onClick={() => {
                    setMode("patterns");
                    setPage(1);
                    onPreview?.();
                  }}
                >
                  {t("patternsLibrary")}
                </Button>
              </div>
            )}
            {busy && (
              <p
                role="status"
                className="pve:m-0 pve:px-3 pve:py-2 pve:text-xs"
              >
                {t("patternLoading")}
              </p>
            )}
            {failed && (
              <p role="alert" className="pve:m-0 pve:px-3 pve:py-2 pve:text-xs">
                {t("patternFailed")}
              </p>
            )}
            <div
              className={`pve:flex pve:items-center pve:gap-2 pve:border-0 pve:border-b pve:border-solid pve:px-3 ${chrome.border}`}
            >
              <Search size={15} aria-hidden="true" />
              <Combobox.Input
                ref={input}
                aria-label={t(
                  mode === "patterns" ? "searchPatterns" : "searchSections",
                )}
                placeholder={t(
                  mode === "patterns" ? "searchPatterns" : "searchSections2",
                )}
                className="pve:h-11 pve:w-full pve:border-0 pve:bg-transparent pve:font-inherit pve:text-sm pve:text-inherit pve:outline-none"
              />
            </div>
            <Combobox.Empty>
              <p className="pve:m-0 pve:p-5 pve:text-sm pve:text-[var(--pve-muted,#646b78)]">
                {t(
                  mode === "patterns"
                    ? "noMatchingPatterns"
                    : "noMatchingSections",
                )}
              </p>
            </Combobox.Empty>
            <Combobox.List className="pve:max-h-[min(55dvh,360px)] pve:overflow-auto pve:overscroll-contain pve:p-1.5">
              {(slug: string) => {
                const entry = catalogue?.[slug],
                  block = choices.find((block) => block.slug === slug);
                const image =
                  entry?.thumbnail?.src ||
                  (block &&
                  "imageURL" in block &&
                  typeof block.imageURL === "string"
                    ? block.imageURL
                    : undefined);
                const safeImage =
                  image && /^(?:\/[^/]|https:\/\/)/.test(image)
                    ? image
                    : undefined;
                return (
                  <Combobox.Item
                    aria-label={itemLabel(slug)}
                    key={slug}
                    disabled={busy}
                    value={slug}
                    className="pve:flex pve:min-h-16 pve:cursor-default pve:items-center pve:gap-3 pve:rounded-lg pve:p-2 pve:outline-none pve:data-highlighted:bg-[var(--pve-accent-soft,#edf0ff)]"
                  >
                    <CatalogueThumbnail
                      src={safeImage}
                      alt={entry?.thumbnail?.alt || ""}
                    />
                    <span className="pve:grid pve:min-w-0 pve:gap-1">
                      <span className="pve:text-sm pve:font-medium">
                        {itemLabel(slug)}
                      </span>
                      {entry?.group && (
                        <span className="pve:text-[10px] pve:uppercase pve:tracking-wide pve:text-[var(--pve-muted,#646b78)]">
                          {label(entry.group, "", uiLocale)}
                        </span>
                      )}
                      {entry?.description && (
                        <span className="pve:text-xs pve:leading-relaxed pve:text-[var(--pve-muted,#646b78)]">
                          {label(entry.description, "", uiLocale)}
                        </span>
                      )}
                    </span>
                  </Combobox.Item>
                );
              }}
            </Combobox.List>
            {mode === "patterns" && hasMore && (
              <Button
                variant="secondary"
                className="pve:w-full"
                disabled={busy}
                onClick={() => setPage((value) => value + 1)}
              >
                {t("loadMorePatterns")}
              </Button>
            )}
            {(onPreview || mode === "patterns") && (
              <p
                className={`pve:m-0 pve:border-0 pve:border-t pve:border-solid pve:px-3 pve:py-2 pve:text-xs pve:text-[var(--pve-muted,#646b78)] ${chrome.border}`}
              >
                {t(
                  mode === "patterns"
                    ? "patternCopyHint"
                    : "previewWithoutSavingInsertWithSchemaDefaults",
                )}
              </p>
            )}
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

function CatalogueThumbnail({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="pve:size-14 pve:shrink-0 pve:rounded-md pve:object-cover"
    />
  ) : (
    <span className="pve:grid pve:size-12 pve:shrink-0 pve:place-items-center pve:rounded-md pve:bg-[var(--pve-hover,#f1f2f5)]">
      <Layers size={18} />
    </span>
  );
}
