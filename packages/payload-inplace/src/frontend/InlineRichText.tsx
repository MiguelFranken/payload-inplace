"use client";

import type { EditorStaticMessageKey } from "@payload-inplace/ui/localization/catalogue";
import { useEditorMessages } from "@payload-inplace/ui/localization/EditorMessages";

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
  focusRichEditor,
  mountRichEditor,
  type RichFormat,
} from "@payload-inplace/lexical/editor";
import type { RichDocument } from "@payload-inplace/lexical/document";
import { registerInlineSurface, elementRect } from "../preview/geometry";
import { useInlinePreviewGuard } from "./inline-preview";
import { inlineStyles } from "./inline-styles.generated";
import { FormattingToolbar } from "@payload-inplace/ui/inline-editing/formatting-toolbar";
import { createRichSurface, preserveRichClasses } from "./rich-presentation";
import { richToolbarPosition } from "./rich-toolbar";

/** A normal-flow twin owns Lexical DOM while the untouched React subtree waits for native acknowledgement.
 * Opening settings unmounts this owner before native fields mount. The shared native Form is the only save path.
 */
export function InlineRichText({
  element,
  path,
  label,
  point,
  features,
  disabled,
  onSettings,
}: {
  element: HTMLElement;
  path: string;
  label: string;
  point?: { x: number; y: number };
  features: readonly string[];
  disabled: boolean;
  onSettings: () => void;
}) {
  const { t } = useEditorMessages();

  const field = useField<RichDocument>({ path }),
    guard = useInlinePreviewGuard();
  const runtime = useRef<ReturnType<typeof mountRichEditor> | null>(null),
    toolbar = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<EditorStaticMessageKey | null>(null);
  const [formats, setFormats] = useState<readonly RichFormat[]>([]);
  const current = useEffectEvent(() => ({
    field,
    guard,
    disabled,
    label,
    point,
    features,
    t,
  }));
  const change = useEffectEvent((value: RichDocument) => {
    if (!disabled && !field.disabled) field.setValue(value);
    element.dispatchEvent(
      new CustomEvent("pve:inline-geometry", { bubbles: true }),
    );
  });
  useLayoutEffect(() => {
    const { field, guard, disabled, label, features, point } = current();
    const {
      surface,
      editor: editable,
      theme,
      source,
    } = createRichSurface(element);
    surface.setAttribute("data-ve-inline-surface", "");
    editable.setAttribute("data-ve-inline-active", "");
    editable.setAttribute("role", "textbox");
    editable.setAttribute("aria-multiline", "true");
    editable.setAttribute("aria-label", label);
    editable.classList.add(
      "pvi:focus:outline-none!",
      "pvi:forced-colors:focus:[outline:auto]!",
    );
    const hidden = element.classList.contains("pvi:hidden!");
    // Keep the editable at the original sibling index when possible. A final
    // child stays final so host last-child selectors still apply.
    if (element.nextElementSibling) element.before(surface);
    else element.after(surface);
    let release: (() => void) | undefined;
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
    let releasePresentation: (() => void) | undefined;
    let initialized = false;
    function restorePresentation() {
      releasePresentation?.();
      releasePresentation = undefined;
      runtime.current?.dispose();
      runtime.current = null;
      surface.remove();
      if (release) {
        release();
        release = undefined;
        if (!hidden) element.classList.remove("pvi:hidden!");
        guard.end();
      }
    }
    try {
      runtime.current = mountRichEditor({
        element: editable,
        theme,
        value: field.value,
        onChange: change,
        onSelectionChange: (next) =>
          setFormats((previous) =>
            previous.join() === next.join() ? previous : next,
          ),
        onError: (error) => {
          if (!initialized) throw error;
          setError("nativeRichTextRequired");
        },
        disabled: disabled || field.disabled,
        autofocus: false,
        features,
        unsupportedNodeLabel: (type) =>
          current().t("unsupportedRichNode", { type }),
      });
      releasePresentation = preserveRichClasses(runtime.current.editor, source);
      element.classList.add("pvi:hidden!");
      release = registerInlineSurface(element, surface);
      guard.begin();
      focusRichEditor(runtime.current.editor, point);
      initialized = true;
    } catch {
      restorePresentation();
      setError("nativeRichTextRequired");
    }
    let frame = 0;
    let anchorRange: Range | null = null;
    function draw() {
      frame = 0;
      const rect = elementRect(element);
      const chrome = toolbar.current;
      if (!rect || !chrome) return;
      const selection = surface.ownerDocument.getSelection();
      let anchor = rect;
      if (
        selection?.rangeCount &&
        surface.contains(selection.anchorNode) &&
        surface.contains(selection.focusNode)
      ) {
        anchorRange = selection.getRangeAt(0).cloneRange();
      }
      if (
        anchorRange &&
        surface.contains(anchorRange.commonAncestorContainer)
      ) {
        const selected = anchorRange.getBoundingClientRect();
        if (selected.height > 0) anchor = selected;
      }
      const caption = (chrome.getRootNode() as Document | ShadowRoot)
        .querySelector<HTMLElement>(
          "[data-ve-selection-outline] [data-ve-selection-caption]",
        )
        ?.getBoundingClientRect();
      const position = richToolbarPosition(
        anchor,
        chrome.getBoundingClientRect(),
        { width: innerWidth, height: innerHeight },
        caption,
      );
      for (const [property, value] of [
        ["--pve-rich-x", `${position.left}px`],
        ["--pve-rich-y", `${position.top}px`],
      ]) {
        if (chrome.style.getPropertyValue(property) !== value)
          chrome.style.setProperty(property, value);
      }
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(draw);
    }
    const resize = new ResizeObserver(schedule);
    resize.observe(surface);
    if (toolbar.current) resize.observe(toolbar.current);
    surface.ownerDocument.addEventListener("selectionchange", schedule);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      surface.removeEventListener("keydown", key);
      surface.removeEventListener("click", click);
      cancelAnimationFrame(frame);
      resize.disconnect();
      surface.ownerDocument.removeEventListener("selectionchange", schedule);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      restorePresentation();
      element.dispatchEvent(
        new CustomEvent("pve:inline-geometry", { bubbles: true }),
      );
    };
  }, [element, path]);
  useEffect(() => {
    // Only immutable presentation islands are relabelled; the editor value,
    // selection and native field owner stay unchanged when UI language changes.
    for (const island of runtime.current?.editor
      .getRootElement()
      ?.querySelectorAll<HTMLElement>("[data-pve-opaque]") || []) {
      const label = t("unsupportedRichNode", {
        type: island.dataset.pveOpaque || "",
      });
      if (island.textContent !== label) island.textContent = label;
    }
  }, [t]);
  useEffect(() => {
    runtime.current?.editor.setEditable(!disabled && !field.disabled);
    runtime.current?.editor
      .getRootElement()
      ?.setAttribute("contenteditable", String(!disabled && !field.disabled));
  }, [disabled, field.disabled]);
  return (
    <>
      {createPortal(
        <style data-ve-inline-styles="">{inlineStyles}</style>,
        element.ownerDocument.head,
      )}
      <FormattingToolbar
        toolbarRef={toolbar}
        formats={formats}
        features={features}
        disabled={disabled || field.disabled}
        error={Boolean(error)}
        onFormat={(format) => runtime.current?.format(format)}
        onLink={(url) => {
          if (runtime.current?.link(url)) {
            setError(null);
            runtime.current.editor.focus();
            return true;
          }
          setError("invalidLink");
          return false;
        }}
        onSettings={onSettings}
      />
    </>
  );
}
