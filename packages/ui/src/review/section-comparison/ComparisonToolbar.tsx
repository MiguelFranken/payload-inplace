"use client";

import { ArrowDown, GitCompareArrows, X } from "lucide-react";
import type { Ref } from "react";
import { useEditorMessages } from "../../localization/EditorMessages";
import { Button } from "../../primitives/button/button";

type Side = "draft" | "published";

/** Read-only comparison controls. The caller owns the snapshots and canvas navigation. */
export function ComparisonToolbar({
  closeRef,
  side,
  status,
  hint,
  ready,
  hasPublished,
  canNavigate,
  onSide,
  onNext,
  onClose,
  onRetry,
}: {
  closeRef?: Ref<HTMLButtonElement>;
  side: Side;
  status: string;
  hint?: string;
  ready: boolean;
  hasPublished: boolean;
  canNavigate: boolean;
  onSide: (side: Side) => void;
  onNext: () => void;
  onClose: () => void;
  onRetry?: () => void;
}) {
  const { t } = useEditorMessages();
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
        <div className="pve:flex pve:items-center pve:gap-1.5">
          <div
            role="group"
            aria-label={t("sectionComparisonVersion")}
            className="pve:flex pve:min-w-0 pve:flex-1 pve:gap-0.5 pve:rounded-xl pve:bg-[var(--pve-muted-surface,var(--theme-elevation-50,#f4f5f7))] pve:p-0.5"
          >
            {(["draft", "published"] as const).map((version) => (
              <Button
                key={version}
                className="pve:min-w-0 pve:flex-1 pve:px-1.5 pve:leading-tight pve:pointer-coarse:h-11"
                aria-pressed={side === version}
                disabled={version === "published" && !hasPublished}
                onClick={() => onSide(version)}
              >
                {t(version)}
              </Button>
            ))}
          </div>
          <Button
            size="icon"
            variant="outline"
            className="pve:pointer-coarse:size-11"
            aria-label={t("nextSectionChange")}
            tooltip={t("nextSectionChange")}
            disabled={!canNavigate}
            onClick={onNext}
          >
            <ArrowDown size={17} aria-hidden="true" />
          </Button>
        </div>
      )}
      <div
        role={onRetry ? "alert" : "status"}
        className="pve:px-2 pve:pt-2 pve:pb-1 pve:text-xs pve:leading-relaxed"
      >
        <p className="pve:m-0 pve:font-medium">{status}</p>
        {hint && (
          <p className="pve:mt-0.5 pve:mb-0 pve:text-[var(--pve-muted-text,var(--theme-elevation-700,#50525a))]">
            {hint}
          </p>
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
