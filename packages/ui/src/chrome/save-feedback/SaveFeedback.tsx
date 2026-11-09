"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, LoaderCircle } from "lucide-react";
import { ChromeTooltip } from "../../primitives/tooltip/tooltip";

/** Persistence feedback has no layout footprint. Acknowledged saves show briefly; initial clean documents stay quiet. */
export function useSaveFeedback({
  saving,
  pending,
  failed,
}: {
  saving: boolean;
  pending: boolean;
  failed: boolean;
}) {
  const [phase, setPhase] = useState<
    "hidden" | "saving" | "saved" | "exiting" | "error"
  >("hidden");
  const active = useRef(false);
  useEffect(() => {
    let linger: ReturnType<typeof setTimeout> | undefined;
    let finish: ReturnType<typeof setTimeout> | undefined;
    if (failed) {
      active.current = false;
      setPhase("error");
    } else if (saving || (pending && active.current)) {
      active.current = true;
      setPhase("saving");
    } else if (!pending && active.current) {
      active.current = false;
      setPhase("saved");
      linger = setTimeout(() => {
        setPhase("exiting");
        finish = setTimeout(() => setPhase("hidden"), 200);
      }, 2000);
    } else {
      setPhase("hidden");
    }
    return () => {
      clearTimeout(linger);
      clearTimeout(finish);
    };
  }, [saving, pending, failed]);
  return phase;
}

/** One status outside the dock follows actual native queue settlement, never its document metadata shape. */
export function SaveFeedback({
  expanded,
  saving,
  pending,
  failed,
  label,
}: {
  expanded: boolean;
  saving: boolean;
  pending: boolean;
  failed: boolean;
  label: string;
}) {
  const phase = useSaveFeedback({ saving, pending, failed });
  const shown = expanded && phase !== "hidden";
  return (
    <span
      aria-live="polite"
      aria-atomic="true"
      data-ve-save-feedback=""
      data-phase={phase}
      className="pve:pointer-events-none pve:absolute pve:right-full pve:top-1/2 pve:z-0 pve:mr-2 pve:-translate-y-1/2"
    >
      <span role="status" aria-label={label} className="pve:sr-only">
        {label}
      </span>
      {shown && (
        <ChromeTooltip label={label}>
          <span
            data-ve-save-status=""
            role="img"
            aria-label={label}
            aria-hidden={phase === "exiting" || undefined}
            tabIndex={phase === "exiting" ? -1 : 0}
            className={`pve:pointer-events-auto pve:inline-flex pve:size-9 pve:items-center pve:justify-center pve:rounded-full pve:border pve:border-solid pve:border-[var(--pve-border,#e3e4e8)] pve:bg-[var(--pve-surface,#fff)] pve:text-[var(--pve-muted,#646773)] pve:shadow-sm pve:motion-safe:transition-[opacity,translate] pve:motion-safe:duration-200 pve:focus-visible:outline-2 pve:focus-visible:outline-[var(--pve-accent,#3451eb)] ${phase === "exiting" ? "pve:translate-x-6 pve:opacity-0" : "pve:translate-x-0 pve:opacity-100"}`}
          >
            {phase === "error" ? (
              <AlertTriangle size={16} aria-hidden="true" />
            ) : phase === "saving" ? (
              <LoaderCircle
                size={16}
                aria-hidden="true"
                className="pve:motion-safe:animate-spin"
              />
            ) : (
              <Check size={16} aria-hidden="true" />
            )}
          </span>
        </ChromeTooltip>
      )}
    </span>
  );
}
