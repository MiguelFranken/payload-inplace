"use client";

import { ArrowDown, GitCompareArrows, X } from "lucide-react";
import type { Ref } from "react";
import { useEditorMessages } from "../../localization/EditorMessages";
import { Button } from "../../primitives/button/button";

type Side = "draft" | "published";

export type ComparisonHighlight = "sections" | "elements";

/** Read-only comparison controls. The caller owns the snapshots and canvas navigation. */
export function ComparisonToolbar({
  closeRef,
  side,
  highlight,
  status,
  hint,
  ready,
  hasPublished,
  canNavigate,
  onSide,
  onHighlight,
  onNext,
  onClose,
  onRetry,
}: {
  closeRef?: Ref<HTMLButtonElement>;
  side: Side;
  highlight: ComparisonHighlight;
  status: string;
  hint?: string;
  ready: boolean;
  hasPublished: boolean;
  canNavigate: boolean;
  onSide: (side: Side) => void;
  onHighlight: (highlight: ComparisonHighlight) => void;
  onNext: () => void;
  onClose: () => void;
  onRetry?: () => void;
}) {
  const { t } = useEditorMessages();
  const next = t(
    highlight === "elements" ? "nextElementChange" : "nextSectionChange",
  );
  const segment =
    "pve:flex pve:min-w-0 pve:flex-1 pve:gap-0.5 pve:rounded-xl pve:bg-[var(--pve-muted-surface,var(--theme-elevation-50,#f4f5f7))] pve:p-0.5";
  const option =
    "pve:min-w-0 pve:flex-1 pve:px-1.5 pve:leading-tight pve:aria-pressed:border-[var(--pve-selected-border,#a8abb4)] pve:pointer-coarse:h-11";
  return (
    <section
      aria-label={t("compareSections")}
      className="pve:pointer-events-auto pve:relative pve:z-10 pve:ms-auto pve:box-border pve:w-80 pve:max-w-full pve:rounded-2xl pve:border pve:border-solid pve:border-[var(--pve-border,var(--theme-border-color,#e3e4e8))] pve:bg-[var(--pve-surface,var(--theme-bg,#fff))] pve:p-2 pve:shadow-lg"
    >
      <div className="pve:flex pve:items-center pve:gap-2 pve:ps-2">
        <GitCompareArrows
          size={16}
          aria-hidden="true"
          className="pve:shrink-0"
        />
        <span className="pve:me-auto pve:text-sm pve:font-semibold">
          {t("compareSections")}
        </span>
        <Button
          ref={closeRef}
          size="icon"
          className="pve:pointer-coarse:size-11"
          aria-label={t("closeSectionComparison")}
          tooltip={t("closeSectionComparison")}
          onClick={onClose}
        >
          <X size={17} aria-hidden="true" />
        </Button>
      </div>
      {ready && (
        <div className="pve:grid pve:grid-cols-[auto_minmax(0,1fr)] pve:items-center pve:gap-x-2 pve:gap-y-1.5 pve:ps-2">
          <span className="pve:text-xs">{t("sectionComparisonVersion")}</span>
          <div
            role="group"
            aria-label={t("sectionComparisonVersion")}
            className={segment}
          >
            {(["draft", "published"] as const).map((version) => (
              <Button
                key={version}
                className={option}
                aria-pressed={side === version}
                disabled={version === "published" && !hasPublished}
                onClick={() => onSide(version)}
              >
                {t(version)}
              </Button>
            ))}
          </div>
          <span className="pve:text-xs">{t("comparisonHighlight")}</span>
          <div
            role="group"
            aria-label={t("comparisonHighlight")}
            className={segment}
          >
            {(["sections", "elements"] as const).map((mode) => (
              <Button
                key={mode}
                className={option}
                aria-pressed={highlight === mode}
                onClick={() => onHighlight(mode)}
              >
                {t(mode === "sections" ? "sections" : "comparisonElements")}
              </Button>
            ))}
          </div>
        </div>
      )}
      <div className="pve:mt-1.5 pve:flex pve:items-center pve:gap-2 pve:ps-2">
        <div
          role={onRetry ? "alert" : "status"}
          className="pve:min-w-0 pve:flex-1 pve:py-1 pve:text-xs pve:leading-relaxed"
        >
          <p className="pve:m-0 pve:font-medium">{status}</p>
          {hint && (
            <p className="pve:mt-0.5 pve:mb-0 pve:text-[var(--pve-muted-text,var(--theme-elevation-700,#50525a))]">
              {hint}
            </p>
          )}
        </div>
        {ready && (
          <Button
            size="small-icon"
            variant="outline"
            aria-label={next}
            tooltip={next}
            disabled={!canNavigate}
            onClick={onNext}
          >
            <ArrowDown size={16} aria-hidden="true" />
          </Button>
        )}
      </div>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          {t("retry")}
        </Button>
      )}
    </section>
  );
}
