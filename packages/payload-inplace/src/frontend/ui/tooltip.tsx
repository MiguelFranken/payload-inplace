"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import type { ReactElement } from "react";
import { useChromePortal } from "./portal";

/** Delayed, keyboard-accessible help stays inside the editor's isolated portal and theme. */
export function ChromeTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactElement;
}) {
  const container = useChromePortal();
  return (
    <Tooltip.Root>
      <Tooltip.Trigger delay={500} render={children} />
      <Tooltip.Portal container={container}>
        <Tooltip.Positioner
          side="top"
          sideOffset={8}
          className="pve:pointer-events-auto pve:z-[200]"
        >
          <Tooltip.Popup
            role="tooltip"
            data-ve-ui=""
            className="pve:max-w-64 pve:rounded-lg pve:bg-[var(--pve-tooltip-surface,var(--theme-text,#202127))] pve:px-3 pve:py-2 pve:text-xs pve:leading-relaxed pve:text-[var(--pve-tooltip-text,var(--theme-elevation-0,#fff))] pve:shadow-lg pve:motion-safe:transition-opacity pve:motion-safe:duration-100 pve:data-[starting-style]:opacity-0 pve:data-[ending-style]:opacity-0"
          >
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
