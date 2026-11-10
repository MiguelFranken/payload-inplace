"use client";

import { useRef } from "react";
import { useForm, useFormFields } from "@payloadcms/ui";
import type { RichTextCapabilities } from "../../adapters/richtext-capabilities";
import { canAdoptPlainText } from "../../adapters/plain-text";
import {
  allowsInlineField,
  resolveEditorStrategy,
} from "../../schema/editor-strategy";
import { canUpdateInlineField } from "../../schema/inline-access";
import type { ResolvedBinding } from "../../schema/resolve-binding";
import type { NativeSection } from "../../schema/tree";
import type { EditorBlockControls } from "../../types";
import { useFieldStrategy } from "../field-strategies";
import type { InspectionTarget } from "../InspectionLayer";

/** Text projections must preserve source text, and interactive descendants retain native settings. */
export function canEditRenderedField(
  element: Element,
  fieldType: string,
  value: unknown,
) {
  return (
    element instanceof HTMLElement &&
    (fieldType === "richText" ||
      element.hasAttribute("data-ve-inline-active") ||
      (element.childElementCount === 0 && canAdoptPlainText(element, value))) &&
    !element.closest("a,button,input,textarea,select")
  );
}

/** Resolve the sole field owner against current native state without reclassifying transient DOM on save. */
export function useInlineSelection({
  selection,
  selected,
  binding,
  inlinePath,
  profile,
  richTextCapabilities,
  disabled,
}: {
  selection?: InspectionTarget;
  selected?: NativeSection;
  binding?: ResolvedBinding;
  inlinePath?: string;
  profile?: EditorBlockControls;
  richTextCapabilities?: RichTextCapabilities;
  disabled: boolean;
}) {
  const form = useForm();
  const candidate = binding?.field;
  // Subscribe to this path, but read the current path from the native Form.
  // Payload's selector hook may retain its previous selected slice for the first
  // render after the selector path changes. Caching that old field's value or
  // conditions would incorrectly classify the newly picked terminal.
  useFormFields(([fields]) => (inlinePath ? fields[inlinePath] : undefined));
  const inlineState = inlinePath ? form.getField(inlinePath) : undefined;
  const lexicalFeatures =
    binding && selected
      ? richTextCapabilities?.[`${selected.schemaPath}.${binding.schemaPath}`]
      : undefined;
  // Assess opaque renderer projections once per explicit pick, after native
  // field initialization. Later structural reindexing/server projection can
  // temporarily show older DOM; that must not reclassify a retained selection
  // and open settings over the panel the user just chose. ACL/condition/type
  // checks below remain live and authoritative on every native state change.
  const markupAssessment = useRef<{
    selection: InspectionTarget;
    safe: boolean;
  } | null>(null);
  if (!selection) markupAssessment.current = null;
  if (
    selection &&
    candidate &&
    inlineState &&
    markupAssessment.current?.selection !== selection
  )
    markupAssessment.current = {
      selection,
      safe: canEditRenderedField(
        selection.element,
        candidate.type,
        inlineState.value,
      ),
    };
  const strategy =
    candidate && binding && selection
      ? resolveEditorStrategy({
          field: candidate,
          state: inlineState,
          row: Boolean(binding.row),
          permitted: canUpdateInlineField(
            selected?.permissions,
            binding.permissionPath,
          ),
          readOnly: binding.readOnly,
          edit: selection.edit,
          inline: allowsInlineField(profile, binding.permissionPath),
          lexicalFeatures,
          markupSafe:
            markupAssessment.current?.selection === selection
              ? markupAssessment.current.safe
              : true,
        })
      : { kind: "native" as const };
  const contextualMatch =
    candidate && binding && selected && inlinePath
      ? {
          field: candidate,
          path: inlinePath,
          schemaPath: `${selected.schemaPath}.${binding.schemaPath}`,
          blockType: selected.block?.slug,
        }
      : undefined;
  const contextual = useFieldStrategy(
    selection?.edit !== "panel" && !binding?.row ? contextualMatch : undefined,
    inlineState,
    !disabled && strategy.kind !== "unavailable",
  );
  const canInline =
    !contextual && (strategy.kind === "text" || strategy.kind === "richText");
  return { strategy, contextual, contextualMatch, canInline, lexicalFeatures };
}
