"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { inlineStyles } from "./inline-styles.generated.js";
import { useField } from "@payloadcms/ui";
import { useInlinePreviewGuard } from "./inline-preview.js";

/** The browser owns caret/IME/native text undo; useField is the sole data owner and native Form is the sole save path.
 * Only explicit plain-text field bindings are adopted. Rich/custom markup keeps its native field editor instead.
 */
export function InlineText({
  element,
  path,
  label,
  multiline = false,
  point,
  disabled,
}: {
  element: HTMLElement;
  path: string;
  label: string;
  multiline?: boolean;
  point?: { x: number; y: number };
  disabled: boolean;
}) {
  const field = useField<string>({ path }),
    guard = useInlinePreviewGuard();
  const current = useRef({ field, disabled });
  current.current = { field, disabled: disabled || field.disabled };
  const composing = useRef(false),
    editing = useRef(false),
    dirty = useRef(false);
  useLayoutEffect(() => {
    // The selection layer supplies the visible focus perimeter. Avoid a second browser text-line outline.
    // System high-contrast mode retains the native indicator as well.
    const classes =
      "pvi:focus:outline-none! pvi:forced-colors:focus:[outline:auto]!".split(
        " ",
      );
    const addedClasses = classes.filter(
      (name) => !element.classList.contains(name),
    );
    element.classList.add(...addedClasses);
    const original = new Map(
      [
        "contenteditable",
        "role",
        "aria-label",
        "aria-multiline",
        "aria-invalid",
        "aria-description",
        "tabindex",
        "data-ve-inline-active",
      ].map((name) => [name, element.getAttribute(name)]),
    );
    const placeholder = element.getAttribute("data-ve-placeholder") || "";
    function text() {
      return element.innerText.replace(/\r\n/g, "\n");
    }
    function commit() {
      if (!dirty.current || composing.current || current.current.disabled)
        return;
      dirty.current = false;
      const value = text();
      if (value !== (current.current.field.value || ""))
        current.current.field.setValue(value);
      element.dispatchEvent(
        new CustomEvent("pve:inline-geometry", { bubbles: true }),
      );
    }
    function input() {
      dirty.current = true;
      commit();
    }
    function begin() {
      if (current.current.disabled) return;
      editing.current = true;
      guard.begin();
      if (placeholder && !current.current.field.value) element.textContent = "";
    }
    function finish() {
      if (!editing.current) return;
      commit();
      editing.current = false;
      guard.end();
      if (!current.current.field.value && placeholder)
        element.textContent = placeholder;
    }
    function key(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s")
        return;
      event.stopPropagation();
      if (
        event.key === "Escape" ||
        (!multiline && event.key === "Enter" && !event.isComposing)
      ) {
        event.preventDefault();
        element.blur();
      }
    }
    function startComposition() {
      composing.current = true;
    }
    function endComposition() {
      composing.current = false;
      commit();
    }
    element.setAttribute(
      "contenteditable",
      disabled ? "false" : "plaintext-only",
    );
    element.setAttribute("role", "textbox");
    element.setAttribute("aria-label", label);
    element.setAttribute("aria-multiline", String(multiline));
    element.setAttribute("tabindex", "0");
    element.setAttribute("data-ve-inline-active", "");
    const value = current.current.field.value || "";
    if (element.textContent !== (value || placeholder))
      element.textContent = value || placeholder;
    element.addEventListener("focus", begin);
    element.addEventListener("blur", finish);
    element.addEventListener("input", input);
    element.addEventListener("keydown", key);
    element.addEventListener("compositionstart", startComposition);
    element.addEventListener("compositionend", endComposition);
    if (!disabled) {
      element.focus({ preventScroll: true });
      const doc = document as Document & {
        caretPositionFromPoint?: (
          x: number,
          y: number,
        ) => { offsetNode: Node; offset: number } | null;
        caretRangeFromPoint?: (x: number, y: number) => Range | null;
      };
      let range: Range | undefined;
      if (point) {
        const caret = doc.caretPositionFromPoint?.(point.x, point.y);
        if (caret && element.contains(caret.offsetNode)) {
          range = document.createRange();
          range.setStart(caret.offsetNode, caret.offset);
          range.collapse(true);
        } else {
          const candidate = doc.caretRangeFromPoint?.(point.x, point.y);
          if (candidate && element.contains(candidate.startContainer))
            range = candidate;
        }
      }
      if (!range) {
        range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);
      }
      const selection = document.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    return () => {
      finish();
      element.removeEventListener("focus", begin);
      element.removeEventListener("blur", finish);
      element.removeEventListener("input", input);
      element.removeEventListener("keydown", key);
      element.removeEventListener("compositionstart", startComposition);
      element.removeEventListener("compositionend", endComposition);
      element.classList.remove(...addedClasses);
      for (const [name, value] of original) {
        if (value === null) element.removeAttribute(name);
        else element.setAttribute(name, value);
      }
    };
  }, [element, path, label, multiline]);
  useEffect(() => {
    element.setAttribute(
      "contenteditable",
      disabled || field.disabled ? "false" : "plaintext-only",
    );
    if (disabled && editing.current) {
      element.blur();
    }
  }, [disabled, field.disabled, element]);
  useEffect(() => {
    element.setAttribute("aria-invalid", String(field.valid === false));
    if (field.errorMessage)
      element.setAttribute("aria-description", field.errorMessage);
    else element.removeAttribute("aria-description");
  }, [field.valid, field.errorMessage, element]);
  useEffect(() => {
    if (!editing.current && !composing.current) {
      const value =
        field.value || element.getAttribute("data-ve-placeholder") || "";
      if (element.textContent !== value) element.textContent = value;
    }
  }, [field.value, element]);
  return createPortal(
    <style data-ve-inline-styles="">{inlineStyles}</style>,
    element.ownerDocument.head,
  );
}
