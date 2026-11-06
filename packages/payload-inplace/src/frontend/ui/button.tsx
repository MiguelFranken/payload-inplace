"use client";
// Adapted from shadcn/ui registry/base-nova/ui/button.tsx (MIT).
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { ChromeTooltip } from "./tooltip.js";

/** Shared chrome presentation for buttons and composite triggers, each using one interactive primitive. */
export const buttonVariants = cva(
  "pve:inline-flex pve:shrink-0 pve:items-center pve:justify-center pve:gap-2 pve:box-border pve:border pve:border-solid pve:font-inherit pve:text-sm pve:font-medium pve:leading-none pve:no-underline pve:cursor-pointer pve:outline-none pve:focus-visible:ring-2 pve:focus-visible:ring-[var(--pve-accent,#3451eb)] pve:focus-visible:ring-offset-2 pve:disabled:opacity-40 pve:disabled:cursor-not-allowed pve:motion-safe:transition-colors pve:[&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "pve:rounded-lg pve:border-transparent pve:bg-[var(--pve-accent,#3451eb)] pve:text-white pve:hover:brightness-95",
        secondary:
          "pve:rounded-lg pve:border-transparent pve:bg-[var(--pve-muted-surface,var(--theme-elevation-50,#f4f5f7))] pve:text-inherit pve:hover:bg-[var(--pve-hover,var(--theme-elevation-100,#e9ebef))] pve:aria-pressed:bg-[var(--pve-selected-surface,#e4e6ea)] pve:aria-pressed:text-inherit",
        ghost:
          "pve:rounded-lg pve:border-transparent pve:bg-transparent pve:text-inherit pve:hover:bg-[var(--pve-hover,var(--theme-elevation-100,#f1f2f5))] pve:aria-pressed:bg-[var(--pve-selected-surface,#e4e6ea)] pve:aria-pressed:text-inherit pve:aria-expanded:bg-[var(--pve-hover,var(--theme-elevation-100,#f1f2f5))]",
        outline:
          "pve:rounded-lg pve:bg-[var(--pve-muted-surface,var(--theme-elevation-50,#f4f5f7))] pve:text-inherit pve:border-[var(--pve-border,var(--theme-border-color,#e3e4e8))] pve:aria-pressed:bg-[var(--pve-selected-surface,#e4e6ea)] pve:aria-pressed:text-inherit pve:aria-pressed:border-[var(--pve-selected-border,#a8abb4)] pve:hover:bg-[var(--pve-hover,var(--theme-elevation-100,#f1f2f5))]",
        canvas:
          "pve:bg-[var(--pve-surface,#fff)] pve:text-[var(--pve-text,#202127)] pve:rounded-full pve:border-[var(--pve-selected-border,#a8abb4)] pve:shadow-[0_2px_10px_#00000026,0_0_0_4px_#ffffffb3] pve:hover:bg-[var(--pve-hover,#e9ebef)] pve:hover:border-[var(--pve-text,#202127)]",
        selection:
          "pve:border-transparent pve:rounded-sm pve:bg-transparent pve:text-white pve:hover:bg-white/20 pve:focus-visible:ring-white pve:focus-visible:ring-offset-0",
        destructive:
          "pve:rounded-lg pve:border-transparent pve:bg-[var(--pve-danger-soft,#fff1f0)] pve:text-[var(--pve-danger,#b42318)] pve:hover:bg-red-100",
      },
      size: {
        default: "pve:h-10 pve:px-3",
        icon: "pve:size-10 pve:p-0",
        "compact-icon": "pve:size-7 pve:p-0",
        "small-icon": "pve:size-8 pve:p-0 pve:pointer-coarse:size-11",
        sm: "pve:h-9 pve:px-2.5",
      },
    },
    defaultVariants: { variant: "ghost", size: "default" },
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
