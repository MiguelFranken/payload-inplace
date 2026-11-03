"use client";
import { Button } from "@payloadcms/ui";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Semantic Tailwind roles shared by editor panels and review surfaces; consumers override --pve-* variables. */
export const chrome = {
  surface:
    "pve:bg-[var(--pve-surface,var(--theme-elevation-0))]! pve:text-[var(--pve-text,var(--theme-text))]!",
  muted: "pve:text-[var(--pve-muted,var(--theme-elevation-700))]",
  border: "pve:border-[var(--pve-border,var(--theme-border-color))]",
  heading:
    "pve:m-0 pve:text-sm pve:font-semibold pve:leading-snug pve:text-balance",
  controls:
    "pve:flex pve:flex-wrap pve:items-center pve:gap-2 pve:[&_.btn]:m-0!",
  select:
    "pve:box-border pve:min-h-10 pve:w-full pve:rounded-md pve:border pve:border-solid pve:border-[var(--pve-border,var(--theme-border-color))] pve:bg-[var(--theme-input-bg)] pve:px-3 pve:py-2 pve:text-base pve:text-[var(--pve-text,var(--theme-text))] pve:lg:text-sm",
};

/** Native Payload action with an explicit name, tooltip and a non-overlapping forty-pixel target. */
export function IconAction({
  icon: Icon,
  label,
  disabled,
  danger = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      margin={false}
      buttonStyle="transparent"
      aria-label={label}
      tooltip={label}
      disabled={disabled}
      onClick={onClick}
      className={`pve:m-0! pve:inline-flex! pve:min-h-10! pve:min-w-10! pve:items-center! pve:justify-center! pve:rounded-md! pve:p-2! pve:disabled:opacity-40 ${danger ? "pve:text-[var(--theme-error-600)]!" : ""}`}
    >
      <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
    </Button>
  );
}

/** Shared panel hierarchy keeps headings, counts and descriptions aligned without nested decorative cards. */
export function PanelHeader({
  icon: Icon,
  title,
  detail,
  children,
}: {
  icon: LucideIcon;
  title: string;
  detail?: string;
  children?: ReactNode;
}) {
  return (
    <header
      className={`pve:grid pve:gap-3 pve:border-0 pve:border-b pve:border-solid pve:p-5 ${chrome.border}`}
    >
      <div className="pve:flex pve:items-center pve:gap-2">
        <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
        <h2 className={chrome.heading}>{title}</h2>
      </div>
      {detail && (
        <p
          className={`pve:m-0 pve:text-sm pve:leading-relaxed pve:text-pretty ${chrome.muted}`}
        >
          {detail}
        </p>
      )}
      {children}
    </header>
  );
}
