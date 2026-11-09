"use client";

import { useCallback, useRef } from "react";
import type { useForm } from "@payloadcms/ui";
import type { InspectionTarget } from "../InspectionLayer";
import type { NativeSection } from "@internal/schema/tree";
import { resolveBinding } from "@internal/schema/resolve-binding";
import { diagnoseBinding } from "@internal/schema/binding-diagnostics";

/** Opt-in development diagnostics run only on a selection, not in a document-wide observer or visitor graph. Deduplicated metadata excludes content values. */
export function useBindingDiagnostics(
  enabled: boolean,
  form: ReturnType<typeof useForm>,
  sections: NativeSection[],
) {
  const reported = useRef(new Set<string>());
  return useCallback(
    (target: InspectionTarget) => {
      if (!enabled || !target.field) return;
      const section = sections.find(
        (section) =>
          section.identity.root === target.identity.root &&
          section.identity.blockId === target.identity.blockId &&
          JSON.stringify(section.identity.ancestors || []) ===
            JSON.stringify(target.identity.ancestors || []),
      );
      if (!section?.block) return;
      const binding = target.field;
      const native = resolveBinding({
        fields: section.block.fields,
        value: form.getDataByPath(section.path),
        binding,
        permissions: section.permissions,
      });
      const resolved = diagnoseBinding({
        fields: section.block.fields,
        value: form.getDataByPath(section.path),
        binding,
        state: native
          ? form.getField(`${section.path}.${native.path}`)
          : undefined,
        permissions: section.permissions,
        edit: target.edit,
        interactiveMarkup: Boolean(
          target.element.querySelector(
            "a,button,input,textarea,select,iframe,[contenteditable]",
          ),
        ),
        occurrences: [...document.querySelectorAll("[data-ve-field]")].filter(
          (element) =>
            element.getAttribute("data-ve-field") === binding &&
            element.getAttribute("data-ve-block") === target.identity.blockId &&
            element.getAttribute("data-ve-document") ===
              target.element.getAttribute("data-ve-document") &&
            element.getClientRects().length > 0,
        ).length,
      });
      for (const diagnostic of resolved) {
        const key = `${section.schemaPath}:${diagnostic.path}:${diagnostic.code}`;
        if (reported.current.has(key) || reported.current.size >= 256) continue;
        reported.current.add(key);
        console.warn("[payload-inplace mapping]", {
          code: diagnostic.code,
          path: diagnostic.path,
          severity: diagnostic.severity,
        });
      }
    },
    [enabled, form, sections],
  );
}
