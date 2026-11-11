import type { CSSProperties } from "react";
import { clsx } from "clsx";

/** Geometry is provided by the canvas. The marker does not affect page layout or hit testing. */
export function ComparisonMarker({
  rect,
  label,
  current,
}: {
  rect: Pick<DOMRect, "top" | "left" | "width" | "height">;
  label?: string;
  current: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      data-ve-comparison-marker=""
      data-current={current || undefined}
      style={
        {
          "--pve-comparison-x": `${rect.left}px`,
          "--pve-comparison-y": `${rect.top}px`,
          "--pve-comparison-w": `${rect.width}px`,
          "--pve-comparison-h": `${rect.height}px`,
        } as CSSProperties
      }
      className={clsx(
        "pve:pointer-events-none pve:fixed pve:top-[var(--pve-comparison-y)] pve:left-[var(--pve-comparison-x)] pve:box-border pve:h-[var(--pve-comparison-h)] pve:w-[var(--pve-comparison-w)]",
        label
          ? "pve:rounded-lg pve:border-2 pve:border-solid pve:border-[var(--pve-comparison-marker,#505c74)] pve:shadow-[inset_0_0_0_1px_#fff] pve:data-[current]:border-[var(--pve-accent,#3451eb)]"
          : "pve:rounded-sm pve:outline-2 pve:outline-offset-2 pve:outline-solid pve:outline-[var(--pve-comparison-marker,#505c74)] pve:shadow-[0_0_0_2px_#fff] pve:data-[current]:outline-[var(--pve-accent,#3451eb)]",
      )}
    >
      {label && (
        <span className="pve:absolute pve:top-1.5 pve:left-1.5 pve:rounded-md pve:bg-[var(--pve-comparison-marker,#505c74)] pve:px-2 pve:py-1 pve:text-xs pve:leading-tight pve:font-medium pve:text-white">
          {label}
        </span>
      )}
    </div>
  );
}
