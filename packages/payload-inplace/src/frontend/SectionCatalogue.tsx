"use client";
import { useEditorMessages } from "./messages.js";

import { Combobox } from "@base-ui/react/combobox";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Plus, Search, Layers } from "lucide-react";
import type { ClientBlock } from "payload";
import type { EditorCatalogueEntry, EditorLabel } from "../types.js";
import { useChromePortal } from "./ui/portal.js";
import { buttonVariants } from "./ui/button.js";
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
  disabled = false,
  locale = "en",
  onChoose,
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
  disabled?: boolean;
  locale?: string;
  onChoose: (slug: string) => void;
  onPreview?: (slug?: string) => void;
  className?: string;
}) {
  const { t, locale: uiLocale } = useEditorMessages(undefined, locale);

  const container = useChromePortal();
  const [open, setOpen] = useState(defaultOpen),
    [highlight, setHighlight] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  const notifyOpen = useEffectEvent((open: boolean) => onOpenChange?.(open));
  useEffect(() => {
    notifyOpen(open);
    return () => notifyOpen(false);
  }, [open]);
  const preview = useEffectEvent((slug?: string) => onPreview?.(slug));
  useEffect(() => {
    if (!open || !highlight) return;
    const timer = setTimeout(() => preview(highlight), 220);
    return () => {
      clearTimeout(timer);
      preview();
    };
  }, [open, highlight]);
  const itemLabel = (slug: string) =>
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
  };
  return (
    <Combobox.Root<string>
      items={choices.map((block) => block.slug)}
      value={null}
      open={open}
      onOpenChange={(next) => {
        if (next) setOpen(true);
        else close();
      }}
      itemToStringLabel={itemLabel}
      onValueChange={(slug) => {
        if (slug) {
          close();
          onChoose(slug);
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
          className={`${buttonVariants({ variant: "outline" })} pve:w-full ${className || ""}`}
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
            <div
              className={`pve:flex pve:items-center pve:gap-2 pve:border-0 pve:border-b pve:border-solid pve:px-3 ${chrome.border}`}
            >
              <Search size={15} aria-hidden="true" />
              <Combobox.Input
                ref={input}
                aria-label={t("searchSections")}
                placeholder={t("searchSections2")}
                className="pve:h-11 pve:w-full pve:border-0 pve:bg-transparent pve:font-inherit pve:text-sm pve:text-inherit pve:outline-none"
              />
            </div>
            <Combobox.Empty>
              <p className="pve:m-0 pve:p-5 pve:text-sm pve:text-[var(--pve-muted,#646b78)]">
                {t("noMatchingSections")}
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
            {onPreview && (
              <p
                className={`pve:m-0 pve:border-0 pve:border-t pve:border-solid pve:px-3 pve:py-2 pve:text-xs pve:text-[var(--pve-muted,#646b78)] ${chrome.border}`}
              >
                {t("previewWithoutSavingInsertWithSchemaDefaults")}
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
