"use client";
import type { EditorMessages } from "../i18n/messages.js";
import { useModal } from "@payloadcms/ui";
import { useEffect, useEffectEvent, useRef } from "react";

/** Observe native modal state rather than DOM close events: Payload closes the latest modal on Escape. */
export function useModalDismiss(slug: string, onDismiss: () => void) {
  const { modalState } = useModal();
  const opened = useRef(false);
  const open = modalState[slug]?.isOpen;
  const dismiss = useEffectEvent(onDismiss);
  useEffect(() => {
    if (open) opened.current = true;
    else if (open === false && opened.current) {
      // Consume this close edge once. A subsequent render/request must not dismiss
      // the next dialog against the previous closed native modal state.
      opened.current = false;
      dismiss();
    }
  }, [open]);
}

/** Payload 3.91's selected-upload and select controls omit some accessible names.
 * Supply missing names only within this mounted inspector; never replace native controls or overwrite host labels.
 * The exact peer version and browser axe checks bound this compatibility shim. Cleanup releases the scoped observer.
 */
export function installNativeUploadLabels(
  root: HTMLElement,
  t: EditorMessages["t"],
): () => void {
  function label() {
    for (const [selector, text] of [
      [".upload-relationship-details__edit", t("editMedia")],
      [".upload-relationship-details__remove", t("removeMedia")],
    ])
      for (const button of root.querySelectorAll<HTMLButtonElement>(selector)) {
        if (
          !button.getAttribute("aria-label") &&
          !button.getAttribute("aria-labelledby") &&
          !button.textContent?.trim()
        )
          button.setAttribute("aria-label", text);
      }
    for (const field of root.querySelectorAll<HTMLElement>(
      ".field-type.select",
    )) {
      const input = field.querySelector<HTMLElement>('[role="combobox"]'),
        label = field.querySelector<HTMLElement>(".field-label");
      if (
        input &&
        label &&
        !input.getAttribute("aria-label") &&
        !input.getAttribute("aria-labelledby")
      ) {
        if (!label.id) label.id = `${input.id || field.id}-label`;
        input.setAttribute("aria-labelledby", label.id);
      }
      for (const [selector, text] of [
        [".clear-indicator", t("clearSelection")],
        [".dropdown-indicator", t("showOptions")],
      ]) {
        const button = field.querySelector<HTMLElement>(selector);
        if (button) {
          if (!button.getAttribute("aria-label"))
            button.setAttribute("aria-label", text);
          // React Select's decorative indicators are aria-hidden; its combobox owns keyboard open/clear behavior.
          if (button.getAttribute("aria-hidden") === "true")
            button.tabIndex = -1;
        }
      }
    }
    for (const element of root.querySelectorAll<HTMLElement>(
      ".upload-relationship-details__filename, .upload-relationship-details__meta",
    )) {
      if (!element.title) element.title = element.textContent || "";
    }
  }
  label();
  const observer = new MutationObserver(label);
  observer.observe(root, { childList: true, subtree: true });
  return () => observer.disconnect();
}
