"use client";
// Adapted from shadcn/ui registry/base-nova/ui/dropdown-menu.tsx (MIT).
import { useEditorMessages } from "../../localization/EditorMessages";
import { clsx } from "clsx";
import { buttonVariants } from "../button/button";
import { Menu } from "@base-ui/react/menu";
import { ChromeTooltip } from "../tooltip/tooltip";
import { useChromePortal } from "../portal/portal";

export const DropdownMenu = Menu.Root;

/** Menu.Trigger owns button behavior and refs; reuse button styling without nesting a second Base UI button adapter. */
export function DropdownMenuTrigger({
  className,
  size = "icon",
  variant,
  ...props
}: Omit<Menu.Trigger.Props, "className"> & {
  className?: string;
  size?: "icon" | "compact-icon";
  variant?: "selection";
}) {
  const { t } = useEditorMessages();
  return (
    <ChromeTooltip label={String(props["aria-label"] || t("moreTools"))}>
      <Menu.Trigger
        {...props}
        title={undefined}
        className={clsx(buttonVariants({ size, variant }), className)}
      />
    </ChromeTooltip>
  );
}

/** One keyboard navigable menu contains secondary editor commands. */
export function DropdownMenuContent({ children }: Menu.Popup.Props) {
  const container = useChromePortal();
  return (
    <Menu.Portal container={container}>
      <Menu.Positioner
        render={(props, state) => (
          <div
            {...props}
            inert={!state.open}
            aria-hidden={!state.open || undefined}
          />
        )}
        side="top"
        align="end"
        sideOffset={12}
        className="pve:pointer-events-auto pve:z-[100]"
      >
        <Menu.Popup
          render={(props, state) => (
            <div
              {...props}
              inert={!state.open}
              aria-hidden={!state.open || undefined}
            />
          )}
          data-ve-ui=""
          className="pve:box-border pve:w-60 pve:max-w-[calc(100vw-32px)] pve:max-h-[min(60dvh,var(--available-height))] pve:overflow-auto pve:rounded-xl pve:border pve:border-solid pve:border-[var(--pve-border,var(--theme-border-color,#e3e4e8))] pve:bg-[var(--pve-surface,var(--theme-elevation-0,#fff))] pve:p-1.5 pve:text-[var(--pve-text,var(--theme-text,#202127))] pve:shadow-xl pve:outline-none pve:motion-safe:transition-[opacity,translate] pve:motion-safe:duration-150 pve:data-[starting-style]:translate-y-1 pve:data-[starting-style]:opacity-0 pve:data-[ending-style]:opacity-0"
        >
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

export function DropdownMenuItem({ children, ...props }: Menu.Item.Props) {
  return (
    <Menu.Item
      {...props}
      className="pve:flex pve:min-h-10 pve:cursor-default pve:items-center pve:gap-2.5 pve:rounded-lg pve:px-3 pve:text-sm pve:outline-none pve:data-highlighted:bg-[var(--pve-hover,var(--theme-elevation-100,#f1f2f5))] pve:data-disabled:opacity-40"
    >
      {children}
    </Menu.Item>
  );
}

export function DropdownMenuSeparator() {
  return (
    <Menu.Separator className="pve:my-1 pve:h-px pve:bg-[var(--pve-border,var(--theme-border-color,#e3e4e8))]" />
  );
}
