"use client";

import { Combobox } from "@base-ui/react/combobox";
import { useState } from "react";
import { Layers, Plus, Search } from "lucide-react";
import { Button } from "../../primitives/button/button";
import { ChromeTooltip } from "../../primitives/tooltip/tooltip";
import { useChromePortal } from "../../primitives/portal/portal";
import { chrome } from "../../chrome/roles";
import { useEditorMessages } from "../../localization/EditorMessages";

export type CatalogueMode = "sections" | "patterns";

export interface CatalogueOption {
  id: string;
  label: string;
  description?: string;
  group?: string;
  thumbnail?: { src: string; alt: string };
}

/** A searchable picker for prepared choices. The host owns their source and consequences. */
export function SectionCatalogueView({
  items,
  label: triggerLabel,
  triggerVariant = "row",
  disabled,
  hasChoices,
  locale = "en",
  mode = "sections",
  busy,
  failed,
  open,
  className,
  onChoose,
  onOpenChange,
  onHighlight,
  onModeChange,
  onLoadMore,
  previewEnabled,
}: {
  items: CatalogueOption[];
  label: string;
  triggerVariant?: "canvas" | "row";
  disabled?: boolean;
  hasChoices: boolean;
  locale?: string;
  mode?: CatalogueMode;
  busy?: boolean;
  failed?: boolean;
  open: boolean;
  className?: string;
  onChoose: (id: string) => void;
  onOpenChange: (open: boolean) => void;
  onHighlight?: (id: string | undefined) => void;
  onModeChange?: (mode: CatalogueMode) => void;
  onLoadMore?: () => void;
  previewEnabled?: boolean;
}) {
  const { t } = useEditorMessages(undefined, locale);
  const container = useChromePortal();
  const itemFor = (id: string) => items.find((item) => item.id === id);
  const itemLabel = (id: string) => itemFor(id)?.label || id;
  return (
    <Combobox.Root<string>
      items={items.map((item) => item.id)}
      value={null}
      open={open}
      onOpenChange={(next, details) => {
        if (!next && details.reason === "item-press" && mode === "patterns")
          return;
        onOpenChange(next);
      }}
      itemToStringLabel={itemLabel}
      onValueChange={(id) => {
        if (id) onChoose(id);
      }}
      onItemHighlighted={onHighlight}
      filter={(slug, query) =>
        `${itemLabel(slug)} ${itemFor(slug)?.description || ""} ${itemFor(slug)?.group || ""}`
          .toLocaleLowerCase(locale)
          .includes(query.toLocaleLowerCase(locale))
      }
    >
      <ChromeTooltip label={triggerLabel}>
        <Combobox.Trigger
          disabled={disabled || !hasChoices}
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
                onOpenChange(false);
              }
            }}
          >
            {onModeChange && (
              <div
                role="group"
                aria-label={t("patternsLibrary")}
                className="pve:flex pve:gap-1 pve:p-2"
              >
                <Button
                  size="sm"
                  aria-pressed={mode === "sections"}
                  variant={mode === "sections" ? "outline" : "ghost"}
                  onClick={() => onModeChange("sections")}
                >
                  {t("sectionsLibrary")}
                </Button>
                <Button
                  size="sm"
                  aria-pressed={mode === "patterns"}
                  variant={mode === "patterns" ? "outline" : "ghost"}
                  onClick={() => onModeChange("patterns")}
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
                const entry = itemFor(slug);
                return (
                  <Combobox.Item
                    aria-label={itemLabel(slug)}
                    key={slug}
                    disabled={busy}
                    value={slug}
                    className="pve:flex pve:min-h-16 pve:cursor-default pve:items-center pve:gap-3 pve:rounded-lg pve:p-2 pve:outline-none pve:data-highlighted:bg-[var(--pve-accent-soft,#edf0ff)]"
                  >
                    <CatalogueThumbnail
                      src={entry?.thumbnail?.src}
                      alt={entry?.thumbnail?.alt || ""}
                    />
                    <span className="pve:grid pve:min-w-0 pve:gap-1">
                      <span className="pve:text-sm pve:font-medium">
                        {itemLabel(slug)}
                      </span>
                      {entry?.group && (
                        <span className="pve:text-[10px] pve:uppercase pve:tracking-wide pve:text-[var(--pve-muted,#646b78)]">
                          {entry.group}
                        </span>
                      )}
                      {entry?.description && (
                        <span className="pve:text-xs pve:leading-relaxed pve:text-[var(--pve-muted,#646b78)]">
                          {entry.description}
                        </span>
                      )}
                    </span>
                  </Combobox.Item>
                );
              }}
            </Combobox.List>
            {mode === "patterns" && onLoadMore && (
              <Button
                variant="secondary"
                className="pve:w-full"
                disabled={busy}
                onClick={onLoadMore}
              >
                {t("loadMorePatterns")}
              </Button>
            )}
            {(previewEnabled || mode === "patterns") && (
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
