"use client";

import type { ReactNode, Ref } from "react";
import { Pencil } from "lucide-react";
import { Button } from "../../primitives/button/button";

/** Dock layout and collapsed launcher. The host owns available tools and transitions. */
export function EditorToolbar({
  children,
  dockRef,
  editLabel,
  expanded,
  label,
  launcherRef,
  onExpand,
}: {
  children: ReactNode;
  dockRef?: Ref<HTMLElement>;
  editLabel: string;
  expanded: boolean;
  label: string;
  launcherRef?: Ref<HTMLButtonElement>;
  onExpand: () => void;
}) {
  return (
    <nav
      ref={dockRef}
      aria-label={label}
      className={`pve:relative pve:z-10 pve:pointer-events-auto pve:flex pve:max-w-full pve:items-center pve:gap-0.5 pve:box-border pve:rounded-xl pve:border pve:border-solid pve:border-[var(--pve-border,var(--theme-border-color,#e3e4e8))] pve:bg-[var(--pve-surface,var(--theme-elevation-0,#fff))] pve:p-0.5 pve:shadow-[0_4px_24px_#0000001a] pve:[interpolate-size:allow-keywords] pve:motion-safe:transition-[width] pve:motion-safe:duration-200 pve:motion-safe:ease-[cubic-bezier(0.2,0,0,1)] pve:max-sm:gap-0 ${expanded ? "pve:w-max" : "pve:w-auto"}`}
    >
      {expanded ? (
        children
      ) : (
        <Button
          ref={launcherRef}
          size="icon"
          variant="default"
          aria-label={editLabel}
          title={editLabel}
          aria-expanded={false}
          onClick={onExpand}
        >
          <Pencil size={16} />
        </Button>
      )}
    </nav>
  );
}
