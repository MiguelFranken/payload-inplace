"use client";
// Adapted from shadcn/ui registry/base-nova/ui/select.tsx (MIT).
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { useChromePortal } from "../portal/portal";

export const Select = SelectPrimitive.Root;

export const SelectValue = SelectPrimitive.Value;

/** Base UI select with shadcn anatomy, consumer tokens and an editor-local portal. */
export function SelectTrigger({
  children,
  iconOnly = false,
  ...props
}: SelectPrimitive.Trigger.Props & { iconOnly?: boolean }) {
  return (
    <SelectPrimitive.Trigger
      {...props}
      data-icon-only={iconOnly || undefined}
      className="pve:flex pve:h-10 pve:w-full pve:box-border pve:items-center pve:justify-between pve:data-[icon-only=true]:justify-center pve:gap-2 pve:rounded-lg pve:border pve:border-solid pve:border-[var(--pve-border,var(--theme-border-color,#e3e4e8))] pve:bg-[var(--pve-surface,var(--theme-elevation-0,#fff))] pve:px-3 pve:text-sm pve:font-inherit pve:text-inherit pve:outline-none pve:focus-visible:ring-2 pve:focus-visible:ring-[var(--pve-accent,#3451eb)] pve:disabled:opacity-40"
    >
      <span>{children}</span>
      {!iconOnly && (
        <SelectPrimitive.Icon>
          <ChevronDown size={15} />
        </SelectPrimitive.Icon>
      )}
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  children,
  className,
  ...props
}: SelectPrimitive.Popup.Props) {
  const container = useChromePortal();
  return (
    <SelectPrimitive.Portal container={container}>
      <SelectPrimitive.Positioner
        render={(props, state) => (
          <div
            {...props}
            inert={!state.open}
            aria-hidden={!state.open || undefined}
          />
        )}
        sideOffset={6}
        align="start"
        alignItemWithTrigger={false}
        className="pve:pointer-events-auto pve:z-[100] pve:isolate"
      >
        <SelectPrimitive.Popup
          {...props}
          render={(props, state) => (
            <div
              {...props}
              inert={!state.open}
              aria-hidden={!state.open || undefined}
            />
          )}
          data-ve-ui=""
          data-ve-select-popup=""
          className={`pve:box-border pve:min-w-[var(--anchor-width)] pve:max-h-[var(--available-height)] pve:overflow-auto pve:rounded-xl pve:border pve:border-solid pve:border-[var(--pve-border,var(--theme-border-color,#e3e4e8))] pve:bg-[var(--pve-surface,var(--theme-elevation-0,#fff))] pve:p-1 pve:text-[var(--pve-text,var(--theme-text,#202127))] pve:shadow-xl pve:outline-none pve:motion-safe:transition-[opacity,translate] pve:motion-safe:duration-150 pve:data-[starting-style]:translate-y-1 pve:data-[starting-style]:opacity-0 pve:data-[ending-style]:opacity-0 ${className || ""}`}
        >
          <SelectPrimitive.ScrollUpArrow className="pve:flex pve:justify-center">
            <ChevronUp size={14} />
          </SelectPrimitive.ScrollUpArrow>
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
          <SelectPrimitive.ScrollDownArrow className="pve:flex pve:justify-center">
            <ChevronDown size={14} />
          </SelectPrimitive.ScrollDownArrow>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ children, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      {...props}
      className="pve:relative pve:flex pve:min-h-10 pve:cursor-default pve:items-center pve:gap-2 pve:rounded-lg pve:py-2 pve:pl-3 pve:pr-9 pve:text-sm pve:outline-none pve:data-highlighted:bg-[var(--pve-accent-soft,#edf0ff)] pve:data-highlighted:text-[var(--pve-accent,#3451eb)] pve:data-disabled:opacity-40"
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="pve:absolute pve:right-3">
        <Check size={15} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
