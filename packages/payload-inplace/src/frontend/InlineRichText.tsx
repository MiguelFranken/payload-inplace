"use client";
import type { EditorStaticMessageKey } from "../i18n/catalogue.js";
import { useEditorMessages } from "./messages.js";

import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useField } from "@payloadcms/ui";
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Pilcrow,
  Settings2,
  Link2,
} from "lucide-react";
import {
  mountRichEditor,
  type RichFormat,
} from "../../../lexical/src/editor.js";
import type { RichDocument } from "../../../lexical/src/document.js";
import { registerInlineSurface, elementRect } from "../preview/geometry.js";
import { useInlinePreviewGuard } from "./inline-preview.js";
import { inlineStyles } from "./inline-styles.generated.js";
import { Popover } from "@base-ui/react/popover";
import { useChromePortal } from "./ui/portal.js";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./ui/menu.js";
import { Button } from "./ui/button.js";
import { chrome } from "../admin/chrome.js";
/** A normal-flow twin owns Lexical DOM while the untouched React subtree waits for native acknowledgement.
 * Opening settings unmounts this owner before native fields mount. The shared native Form is the only save path.
 */
export function InlineRichText({
  element,
  path,
  label,
  features,
  disabled,
  onSettings,
}: {
  element: HTMLElement;
  path: string;
  label: string;
  features: readonly string[];
  disabled: boolean;
  onSettings: () => void;
}) {
  const { t, locale: uiLocale, direction } = useEditorMessages();

  const field = useField<RichDocument>({ path }),
    guard = useInlinePreviewGuard();
  const runtime = useRef<ReturnType<typeof mountRichEditor> | null>(null),
    toolbar = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<EditorStaticMessageKey | null>(null),
    [linkURL, setLinkURL] = useState(""),
    [linkOpen, setLinkOpen] = useState(false);
  const portal = useChromePortal();
  const current = useEffectEvent(() => ({
    field,
    guard,
    disabled,
    label,
    features,
  }));
  const change = useEffectEvent((value: RichDocument) => {
    if (!disabled && !field.disabled) field.setValue(value);
    element.dispatchEvent(
      new CustomEvent("pve:inline-geometry", { bubbles: true }),
    );
  });
  useLayoutEffect(() => {
    const { field, guard, disabled, label, features } = current();
    const surface = element.cloneNode(false) as HTMLElement;
    surface.removeAttribute("id");
    surface.setAttribute("data-ve-inline-active", "");
    surface.setAttribute("role", "textbox");
    surface.setAttribute("aria-multiline", "true");
    surface.setAttribute("aria-label", label);
    surface.classList.add("pvi:focus:outline-none!", "pvi:min-h-[1lh]");
    const hidden = element.classList.contains("pvi:hidden!");
    element.after(surface);
    element.classList.add("pvi:hidden!");
    const release = registerInlineSurface(element, surface);
    guard.begin();
    const key = (event: KeyboardEvent) => {
      if (
        !(
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "s"
        ) &&
        event.key !== "Escape"
      )
        event.stopPropagation();
    };
    const click = (event: MouseEvent) => {
      if ((event.target as Element)?.closest("a")) event.preventDefault();
    };
    surface.addEventListener("keydown", key);
    surface.addEventListener("click", click);
    try {
      runtime.current = mountRichEditor({
        element: surface,
        value: field.value,
        onChange: change,
        onError: () => setError("nativeRichTextRequired"),
        disabled: disabled || field.disabled,
        features,
      });
    } catch {
      setError("nativeRichTextRequired");
    }
    let frame = 0;
    function draw() {
      frame = 0;
      const rect = elementRect(element);
      if (!rect || !toolbar.current) return;
      toolbar.current.style.setProperty(
        "--pve-rich-x",
        `${Math.max(8, Math.min(rect.left, innerWidth - 320))}px`,
      );
      toolbar.current.style.setProperty(
        "--pve-rich-y",
        `${Math.max(8, Math.min(rect.top - 46, innerHeight - 104))}px`,
      );
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(draw);
    }
    const resize = new ResizeObserver(schedule);
    resize.observe(surface);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      runtime.current?.dispose();
      runtime.current = null;
      surface.removeEventListener("keydown", key);
      surface.removeEventListener("click", click);
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      release();
      surface.remove();
      if (!hidden) element.classList.remove("pvi:hidden!");
      guard.end();
      element.dispatchEvent(
        new CustomEvent("pve:inline-geometry", { bubbles: true }),
      );
    };
  }, [element, path]);
  useEffect(() => {
    runtime.current?.editor.setEditable(!disabled && !field.disabled);
    runtime.current?.editor
      .getRootElement()
      ?.setAttribute("contenteditable", String(!disabled && !field.disabled));
  }, [disabled, field.disabled]);
  const commands: {
    format: RichFormat;
    feature: string;
    label: string;
    Icon: typeof Bold;
  }[] = [
    { format: "bold", feature: "bold", label: t("bold"), Icon: Bold },
    { format: "italic", feature: "italic", label: t("italic"), Icon: Italic },
    {
      format: "underline",
      feature: "underline",
      label: t("underline"),
      Icon: Underline,
    },
    {
      format: "paragraph",
      feature: "paragraph",
      label: t("paragraph"),
      Icon: Pilcrow,
    },
    {
      format: "h2",
      feature: "heading",
      label: t("headingTwo"),
      Icon: Heading2,
    },
    {
      format: "h3",
      feature: "heading",
      label: t("headingThree"),
      Icon: Heading3,
    },
    {
      format: "bullet",
      feature: "unorderedList",
      label: t("bulletList"),
      Icon: List,
    },
    {
      format: "number",
      feature: "orderedList",
      label: t("numberedList"),
      Icon: ListOrdered,
    },
    { format: "quote", feature: "blockquote", label: t("quote"), Icon: Quote },
  ];
  return (
    <>
      {createPortal(
        <style data-ve-inline-styles="">{inlineStyles}</style>,
        element.ownerDocument.head,
      )}
      <div
        ref={toolbar}
        lang={uiLocale}
        dir={direction}
        data-ve-ui=""
        role="toolbar"
        aria-label={t("textFormatting")}
        className={`pve:pointer-events-auto pve:fixed pve:left-[var(--pve-rich-x,8px)] pve:top-[var(--pve-rich-y,8px)] pve:z-70 pve:flex pve:max-w-[calc(100vw-16px)] pve:flex-wrap pve:gap-0.5 pve:rounded-xl pve:border pve:border-solid pve:p-1 pve:shadow-md ${chrome.surface} ${chrome.border}`}
        onPointerDown={(event) => event.preventDefault()}
      >
        {!error &&
          commands
            .filter(
              (command) =>
                features.includes(command.feature) &&
                ["bold", "italic", "underline"].includes(command.format),
            )
            .map(({ format, label, Icon }) => (
              <Button
                key={format}
                size="icon"
                className="pve:size-8"
                tooltip={label}
                aria-label={label}
                disabled={disabled}
                onClick={() => runtime.current?.format(format)}
              >
                <Icon size={15} />
              </Button>
            ))}
        {!error && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="pve:size-8"
              aria-label={t("textStyle")}
            >
              <Pilcrow size={15} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {commands
                .filter(
                  (command) =>
                    !["bold", "italic", "underline"].includes(command.format) &&
                    features.includes(command.feature) &&
                    (!command.format.startsWith("h") ||
                      features.includes(`heading:${command.format}`)),
                )
                .map(({ format, label, Icon }) => (
                  <DropdownMenuItem
                    key={format}
                    onClick={() => runtime.current?.format(format)}
                  >
                    <Icon size={16} />
                    {label}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {!error && features.includes("link") && (
          <Popover.Root open={linkOpen} onOpenChange={setLinkOpen}>
            <Popover.Trigger
              render={
                <Button
                  size="icon"
                  className="pve:size-8"
                  aria-label={t("editLink")}
                  tooltip={t("editLink")}
                />
              }
            >
              <Link2 size={15} />
            </Popover.Trigger>
            <Popover.Portal container={portal}>
              <Popover.Positioner
                side="top"
                sideOffset={8}
                className="pve:pointer-events-auto pve:z-[100]"
              >
                <Popover.Popup
                  lang={uiLocale}
                  dir={direction}
                  data-ve-ui=""
                  aria-label={t("editLink")}
                  className={`pve:grid pve:w-64 pve:gap-2 pve:rounded-xl pve:border pve:border-solid pve:p-3 pve:shadow-lg ${chrome.surface} ${chrome.border}`}
                >
                  <label className="pve:grid pve:gap-1 pve:text-sm">
                    {t("linkAddress")}
                    <input
                      value={linkURL}
                      onChange={(event) => setLinkURL(event.target.value)}
                      placeholder={t("httpsExampleCom")}
                      className={`pve:box-border pve:w-full pve:rounded-md pve:border pve:border-solid pve:bg-transparent pve:p-2 pve:text-sm pve:font-inherit ${chrome.border}`}
                    />
                  </label>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      if (runtime.current?.link(linkURL)) {
                        setError(null);
                        setLinkOpen(false);
                        runtime.current.editor.focus();
                      } else setError("invalidLink");
                    }}
                  >
                    {t("applyLink")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      runtime.current?.format("unlink");
                      setLinkOpen(false);
                    }}
                  >
                    {t("removeLink")}
                  </Button>
                  <Button size="sm" onClick={onSettings}>
                    {t("internalLinksAndMoreOptions")}
                  </Button>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        )}
        <Button
          size="icon"
          className="pve:size-8"
          tooltip={error ? t(error) : t("moreTextOptions")}
          aria-label={t("moreTextOptions")}
          onClick={onSettings}
        >
          <Settings2 size={15} />
        </Button>
      </div>
    </>
  );
}
