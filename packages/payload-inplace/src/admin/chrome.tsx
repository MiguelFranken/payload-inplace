"use client";

import { Button } from "@payloadcms/ui";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { chrome } from "@payload-inplace/ui/chrome/roles";
export { chrome } from "@payload-inplace/ui/chrome/roles";

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
      className={`pve:m-0! pve:inline-flex! pve:min-h-10! pve:min-w-10! pve:items-center! pve:justify-center! pve:rounded-md! pve:p-2! pve:bg-transparent! pve:hover:bg-[var(--pve-hover,var(--theme-elevation-100,#e9ebef))]! pve:disabled:opacity-40 ${danger ? "pve:text-[var(--theme-error-600)]!" : ""}`}
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
