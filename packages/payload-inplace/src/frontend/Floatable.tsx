"use client";
import { useEditorMessages } from "./messages.js";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { X, ArrowLeft } from "lucide-react";
import { useTranslation } from "@payloadcms/ui";
import { usePanelResize } from "./use-panel-resize.js";
import { Button } from "./ui/button.js";
/** One contextual surface is docked above the toolbar. Consumers still supply native fields or complete custom content. */
export function Floatable({
  title,
  label = title,
  children,
  onClose,
  width = 360,
  returnFocus,
  onBack,
  actions,
}: {
  title: string;
  label?: string;
  children: ReactNode;
  onClose: () => void;
  width?: number;
  returnFocus?: RefObject<HTMLElement | null>;
  onBack?: () => void;
  actions?: ReactNode;
}) {
  const panel = useRef<HTMLElement>(null),
    body = useRef<HTMLDivElement>(null),
    origin = useRef<HTMLElement | null>(null);
  const resize = usePanelResize(panel, width);
  const { i18n } = useTranslation();
  const { t } = useEditorMessages(undefined, i18n.language);

  useEffect(() => {
    const root = panel.current?.getRootNode();
    origin.current = (
      root instanceof ShadowRoot ? root.activeElement : document.activeElement
    ) as HTMLElement | null;
    const frame = requestAnimationFrame(() => {
      const first = body.current?.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([type="file"]):not([disabled]),textarea:not([disabled]),[role="combobox"]:not([aria-disabled="true"]),button:not([disabled]),[tabindex="0"]:not([disabled]):not([aria-disabled="true"])',
      );
      (first || panel.current?.querySelector<HTMLElement>("button"))?.focus({
        preventScroll: true,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  function close() {
    onClose();
    requestAnimationFrame(() => {
      const trigger = returnFocus?.current || origin.current;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    });
  }
  return (
    <aside
      ref={panel}
      id={resize.id}
      aria-label={label}
      style={resize.style}
      className="pve:group/panel pve:relative pve:flex pve:flex-col pve:h-[var(--pve-context-height,auto)] pve:max-h-[calc(100dvh-var(--pve-dock-height,56px)-48px)] pve:pointer-events-auto pve:box-border pve:w-[min(var(--pve-context-width),calc(100vw-24px))] pve:overflow-hidden pve:rounded-2xl pve:border pve:border-solid pve:border-[var(--pve-border,var(--theme-border-color,#e3e4e8))] pve:bg-[var(--pve-surface,var(--theme-elevation-0,#fff))] pve:text-[var(--pve-text,var(--theme-text,#202127))] pve:shadow-[0_8px_40px_#00000018] pve:motion-safe:transition-[translate] pve:motion-safe:duration-150 pve:motion-safe:ease-[cubic-bezier(0.2,0,0,1)] pve:motion-safe:starting:translate-y-1"
    >
      <div
        {...resize.edge("height", t("resizePanelHeight"))}
        className="pve:group/resize pve:absolute pve:inset-x-6 pve:top-0 pve:z-10 pve:h-3 pve:touch-none pve:cursor-ns-resize pve:rounded-t-md pve:outline-none pve:focus-visible:bg-[var(--pve-accent-soft,#edf0ff)] pve:focus-visible:ring-2 pve:focus-visible:ring-inset pve:focus-visible:ring-[var(--pve-accent,#3451eb)]"
      >
        <span
          aria-hidden="true"
          className="pve:pointer-events-none pve:absolute pve:inset-x-0 pve:top-0 pve:h-[3px] pve:rounded-full pve:group-hover/resize:bg-[var(--pve-accent-soft,#edf0ff)] pve:group-data-[resizing=height]/panel:bg-[var(--pve-accent,#3451eb)] pve:group-data-[resizing=both]/panel:bg-[var(--pve-accent,#3451eb)]"
        />
      </div>
      <div
        {...resize.edge("width", t("resizePanelWidth"))}
        className="pve:group/resize pve:absolute pve:inset-y-6 pve:left-0 pve:z-10 pve:w-3 pve:touch-none pve:cursor-ew-resize pve:rounded-l-md pve:outline-none pve:focus-visible:bg-[var(--pve-accent-soft,#edf0ff)] pve:focus-visible:ring-2 pve:focus-visible:ring-inset pve:focus-visible:ring-[var(--pve-accent,#3451eb)]"
      >
        <span
          aria-hidden="true"
          className="pve:pointer-events-none pve:absolute pve:inset-y-0 pve:left-0 pve:w-[3px] pve:rounded-full pve:group-hover/resize:bg-[var(--pve-accent-soft,#edf0ff)] pve:group-data-[resizing=width]/panel:bg-[var(--pve-accent,#3451eb)] pve:group-data-[resizing=both]/panel:bg-[var(--pve-accent,#3451eb)]"
        />
      </div>
      <div
        {...resize.edge("both", t("resizePanelWidthAndHeight"))}
        className="pve:group/corner pve:absolute pve:left-0 pve:top-0 pve:z-20 pve:size-6 pve:touch-none pve:cursor-nwse-resize pve:rounded-tl-2xl pve:outline-none pve:focus-visible:ring-2 pve:focus-visible:ring-inset pve:focus-visible:ring-[var(--pve-accent,#3451eb)]"
      >
        <span
          aria-hidden="true"
          className="pve:pointer-events-none pve:absolute pve:inset-0 pve:rounded-tl-2xl pve:border-2 pve:border-b-0 pve:border-r-0 pve:border-solid pve:border-transparent pve:group-hover/corner:border-[var(--pve-accent-soft,#edf0ff)] pve:group-data-[resizing=both]/panel:border-[var(--pve-accent,#3451eb)]"
        />
      </div>
      <header className="pve:shrink-0 pve:flex pve:items-center pve:justify-between pve:gap-3 pve:border-0 pve:border-b pve:border-solid pve:border-[var(--pve-border,var(--theme-border-color,#e3e4e8))] pve:py-2 pve:pl-4 pve:pr-2">
        {onBack && (
          <Button
            size="icon"
            aria-label={t("backToSections")}
            title={t("backToSections")}
            onClick={onBack}
          >
            <ArrowLeft size={16} className="pve:rtl:rotate-180" />
          </Button>
        )}
        <h2
          dir="auto"
          className="pve:m-0 pve:me-auto pve:text-sm pve:font-semibold pve:leading-snug"
        >
          {title}
        </h2>
        {actions}
        <Button
          size="icon"
          aria-label={t("closeNamedPanel", { title })}
          title={t("closePanel")}
          onClick={close}
        >
          <X size={16} />
        </Button>
      </header>
      <div
        ref={body}
        className="pve:@container/pve-native pve:min-h-0 pve:flex-auto pve:max-h-[var(--pve-body-limit,60dvh)] pve:overflow-auto pve:overscroll-contain pve:p-4"
      >
        {children}
      </div>
    </aside>
  );
}
