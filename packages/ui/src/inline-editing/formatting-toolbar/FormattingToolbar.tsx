"use client";

import { useState, type Ref } from "react";
import { Popover } from "@base-ui/react/popover";
import { Button } from "../../primitives/button/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../primitives/menu/menu";
import { useChromePortal } from "../../primitives/portal/portal";
import { chrome } from "../../chrome/roles";
import { useEditorMessages } from "../../localization/EditorMessages";
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
  Link2,
} from "lucide-react";

export type FormattingCommand =
  | "bold"
  | "italic"
  | "underline"
  | "paragraph"
  | "h2"
  | "h3"
  | "bullet"
  | "number"
  | "quote"
  | "unlink";

/** Formats the active surface through callbacks supplied by its editor adapter. */
export function FormattingToolbar({
  toolbarRef,
  formats,
  features,
  disabled,
  error,
  onFormat,
  onLink,
  onSettings,
}: {
  toolbarRef?: Ref<HTMLDivElement>;
  formats: readonly string[];
  features: readonly string[];
  disabled: boolean;
  error?: boolean;
  onFormat: (format: FormattingCommand) => void;
  onLink: (url: string) => boolean;
  onSettings: () => void;
}) {
  const { t, locale: uiLocale, direction } = useEditorMessages();
  const portal = useChromePortal();
  const [linkURL, setLinkURL] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const commands: {
    format: FormattingCommand;
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
    <div
      ref={toolbarRef}
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
              size="compact-icon"
              aria-pressed={formats.includes(format)}
              tooltip={label}
              aria-label={label}
              disabled={disabled}
              onClick={() => onFormat(format)}
            >
              <Icon size={15} />
            </Button>
          ))}
      {!error && (
        <DropdownMenu>
          <DropdownMenuTrigger
            size="compact-icon"
            aria-label={t("textStyle")}
            disabled={disabled}
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
                <DropdownMenuItem key={format} onClick={() => onFormat(format)}>
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
                size="compact-icon"
                aria-label={t("editLink")}
                disabled={disabled}
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
                aria-disabled={disabled}
                className={`pve:grid pve:w-64 pve:gap-2 pve:rounded-xl pve:border pve:border-solid pve:p-3 pve:shadow-lg ${chrome.surface} ${chrome.border}`}
              >
                <label className="pve:grid pve:gap-1 pve:text-sm">
                  {t("linkAddress")}
                  <input
                    disabled={disabled}
                    value={linkURL}
                    onChange={(event) => setLinkURL(event.target.value)}
                    placeholder={t("httpsExampleCom")}
                    className={`pve:box-border pve:w-full pve:rounded-md pve:border pve:border-solid pve:bg-transparent pve:p-2 pve:text-sm pve:font-inherit ${chrome.border}`}
                  />
                </label>
                <Button
                  size="sm"
                  variant="default"
                  disabled={disabled}
                  onClick={() => {
                    if (onLink(linkURL)) setLinkOpen(false);
                  }}
                >
                  {t("applyLink")}
                </Button>
                <Button
                  size="sm"
                  disabled={disabled}
                  onClick={() => {
                    onFormat("unlink");
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
    </div>
  );
}
