"use client";

import type { CSSProperties, ReactNode, Ref } from "react";
import { Layers, LocateFixed, Settings2 } from "lucide-react";
import { useEditorMessages } from "../../localization/EditorMessages";
import { Button } from "../../primitives/button/button";

/** A section row with host-supplied drag state and explicit action callbacks. */
export function SectionRow({
  rowRef,
  blockId,
  heading,
  label,
  position,
  lock,
  handle,
  isDragging,
  dragOver,
  dropTarget,
  offsetX,
  offsetY,
  transition,
  onPick,
  onLocate,
  onSettings,
}: {
  rowRef?: Ref<HTMLDivElement>;
  blockId: string;
  heading?: string;
  label: string;
  position: string;
  lock?: string;
  handle?: ReactNode;
  isDragging?: boolean;
  dragOver?: boolean;
  dropTarget?: boolean;
  offsetX?: number;
  offsetY?: number;
  transition?: string;
  onPick: () => void;
  onLocate?: () => void;
  onSettings?: () => void;
}) {
  const { t } = useEditorMessages();
  return (
    <div
      ref={rowRef}
      data-ve-sortable={blockId}
      data-ve-drag-over={dragOver}
      data-ve-drop-target={dropTarget}
      style={
        {
          "--pve-sort-x": `${offsetX || 0}px`,
          "--pve-sort-y": `${offsetY || 0}px`,
          "--pve-sort-transition": transition || "none",
        } as CSSProperties
      }
      className={`pve:flex pve:min-w-0 pve:items-center pve:gap-1 pve:rounded-xl pve:border pve:border-solid pve:border-[var(--pve-border,var(--theme-border-color,#e3e4e8))] pve:bg-[var(--pve-surface,var(--theme-elevation-0,#fff))] pve:p-1 pve:translate-x-[var(--pve-sort-x)] pve:translate-y-[var(--pve-sort-y)] pve:motion-safe:[transition:var(--pve-sort-transition)] ${isDragging ? "pve:opacity-30" : ""}`}
    >
      {handle}
      <button
        type="button"
        onClick={onPick}
        title={heading || label}
        className="pve:flex pve:min-h-10 pve:min-w-0 pve:flex-1 pve:items-center pve:gap-2.5 pve:rounded-lg pve:border-0 pve:bg-transparent pve:px-1 pve:text-start pve:font-inherit pve:text-inherit pve:cursor-pointer pve:outline-none pve:focus-visible:ring-2 pve:focus-visible:ring-[var(--pve-accent,#3451eb)]"
      >
        <Layers
          size={15}
          className="pve:shrink-0 pve:text-[var(--pve-muted,var(--theme-elevation-700,#646773))]"
        />
        <span className="pve:min-w-0">
          <span
            dir="auto"
            className="pve:block pve:truncate pve:text-sm pve:font-medium"
          >
            {position}. {heading || label}
          </span>
          <span
            className="pve:block pve:max-w-36 pve:truncate pve:text-xs pve:leading-5 pve:text-[var(--pve-muted,var(--theme-elevation-700,#646773))]"
            title={label}
            dir="auto"
          >
            {label}
            {lock ? t("fixedFirstSuffix") : ""}
          </span>
        </span>
      </button>
      {(onLocate || onSettings) && (
        <div
          role="group"
          aria-label={t("sectionSettings")}
          className="pve:flex pve:shrink-0 pve:items-center pve:gap-0 pve:rounded-lg pve:bg-[var(--pve-muted-surface,var(--theme-elevation-50,#f4f5f7))] pve:p-0.5"
        >
          {onLocate && (
            <Button
              size="small-icon"
              aria-label={t("showNamedSection", { label })}
              title={t("showOnPage")}
              onClick={onLocate}
            >
              <LocateFixed size={16} />
            </Button>
          )}
          {onSettings && (
            <Button
              size="small-icon"
              aria-label={t("settingsForNamedSection", { label })}
              title={t("sectionSettings")}
              onClick={onSettings}
            >
              <Settings2 size={16} />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
