"use client";
// Adapted from shadcn/ui registry/base-nova/ui/button.tsx (MIT).
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { ChromeTooltip } from "./tooltip.js";
/** Shared chrome presentation for buttons and composite triggers, each using one interactive primitive. */
export const buttonVariants = cva(
  "pve:inline-flex pve:shrink-0 pve:items-center pve:justify-center pve:gap-2 pve:box-border pve:rounded-lg pve:border pve:border-solid pve:border-transparent pve:font-inherit pve:text-sm pve:font-medium pve:leading-none pve:no-underline pve:cursor-pointer pve:outline-none pve:focus-visible:ring-2 pve:focus-visible:ring-[var(--pve-accent,#3451eb)] pve:focus-visible:ring-offset-2 pve:disabled:opacity-40 pve:disabled:cursor-not-allowed pve:motion-safe:transition-colors pve:[&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "pve:bg-[var(--pve-accent,#3451eb)] pve:text-white pve:hover:brightness-95",
        secondary:
          "pve:bg-[var(--pve-muted-surface,var(--theme-elevation-50,#f4f5f7))] pve:text-inherit pve:hover:bg-[var(--pve-hover,var(--theme-elevation-100,#e9ebef))] pve:aria-pressed:bg-[var(--pve-accent-soft,#edf0ff)] pve:aria-pressed:text-[var(--pve-accent,#3451eb)]",
        ghost:
          "pve:bg-transparent pve:text-inherit pve:hover:bg-[var(--pve-hover,var(--theme-elevation-100,#f1f2f5))] pve:aria-pressed:bg-[var(--pve-accent-soft,#edf0ff)] pve:aria-pressed:text-[var(--pve-accent,#3451eb)] pve:aria-expanded:bg-[var(--pve-hover,var(--theme-elevation-100,#f1f2f5))]",
        outline:
          "pve:bg-[var(--pve-muted-surface,var(--theme-elevation-50,#f4f5f7))] pve:text-inherit pve:border-[var(--pve-border,var(--theme-border-color,#e3e4e8))] pve:aria-pressed:bg-[var(--pve-accent-soft,#edf0ff)] pve:aria-pressed:text-[var(--pve-accent,#3451eb)] pve:aria-pressed:border-[var(--pve-accent,#3451eb)] pve:hover:bg-[var(--pve-hover,var(--theme-elevation-100,#f1f2f5))]",
        canvas:
          "pve:bg-[var(--pve-surface,#fff)] pve:text-[var(--pve-accent,#3451eb)] pve:rounded-full pve:border-[var(--pve-accent-soft,#dce2ff)] pve:shadow-[0_2px_8px_#00000014] pve:hover:bg-[var(--pve-accent,#3451eb)] pve:hover:text-white pve:hover:border-[var(--pve-accent,#3451eb)]",
        destructive:
          "pve:bg-[var(--pve-danger-soft,#fff1f0)] pve:text-[var(--pve-danger,#b42318)] pve:hover:bg-red-100",
      },
      size: {
        default: "pve:h-10 pve:px-3",
        icon: "pve:size-10 pve:p-0",
        "compact-icon": "pve:size-7 pve:p-0",
        sm: "pve:h-9 pve:px-2.5",
      },
    },
    defaultVariants: { variant: "secondary", size: "default" },
  },
);
/** Editor chrome button; native Payload field controls keep their own implementation. */
export function Button({
  className,
  variant,
  size,
  tooltip,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & { tooltip?: string }) {
  const label = tooltip;
  const button = (
    <ButtonPrimitive
      type="button"
      data-slot="button"
      className={clsx(buttonVariants({ variant, size }), className)}
      {...props}
      title={label ? undefined : props.title}
    />
  );
  return label ? <ChromeTooltip label={label}>{button}</ChromeTooltip> : button;
}
