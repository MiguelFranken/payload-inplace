"use client";

import type { ReactNode, Ref } from "react";

/** The host measures the selected DOM target and updates the outline geometry. */
export function SelectionOutline({
  hover,
  caption,
  actions,
  actionLabel,
}: {
  hover?: Ref<HTMLDivElement>;
  caption?: Ref<HTMLSpanElement>;
  actions?: ReactNode;
  actionLabel?: string;
}) {
  const geometry =
    "pve:pointer-events-none pve:fixed pve:z-40 pve:box-border pve:left-[var(--pve-left)] pve:top-[var(--pve-top)] pve:w-[var(--pve-width)] pve:h-[var(--pve-height)] pve:rounded-sm pve:rounded-ss-none pve:border-2 pve:border-solid pve:border-[var(--pve-accent,#3455db)]";
  return (
    <>
      <div
        ref={hover}
        hidden
        className={`${geometry} pve:bg-[var(--pve-hover-fill,#3455db0d)] pve:motion-safe:data-[animate=true]:transition-[left,top,width,height,opacity] pve:motion-safe:data-[animate=true]:duration-100 pve:motion-safe:data-[animate=true]:ease-[cubic-bezier(0.2,0,0,1)]`}
      >
        <div
          data-ve-ui=""
          data-ve-selection-caption=""
          className="pve:pointer-events-auto pve:absolute pve:bottom-full pve:start-[var(--pve-label-offset,-2px)] pve:flex pve:max-w-[min(360px,var(--pve-caption-width,calc(100vw-4px)))] pve:items-center pve:gap-1 pve:rounded-t-md pve:bg-[var(--pve-accent,#3455db)] pve:pe-1 pve:ps-2 pve:py-0.5 pve:font-sans pve:text-xs pve:leading-relaxed pve:text-white pve:in-data-[label-below=true]:bottom-auto pve:in-data-[label-below=true]:top-full pve:in-data-[label-below=true]:rounded-t-none pve:in-data-[label-below=true]:rounded-b-md pve:in-data-[label-pinned=true]:bottom-auto pve:in-data-[label-pinned=true]:top-[var(--pve-caption-top)] pve:in-data-[label-pinned=true]:rounded-e-md"
        >
          <span ref={caption} className="pve:min-w-0 pve:truncate pve:py-1" />
          <div
            role="group"
            aria-label={actionLabel}
            className="pve:hidden pve:shrink-0 pve:items-center pve:gap-0.5 pve:in-[[data-ve-selection-outline]]:flex"
          >
            {actions}
          </div>
        </div>
      </div>
    </>
  );
}
