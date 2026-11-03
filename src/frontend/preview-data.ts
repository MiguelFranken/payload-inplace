"use client";
import { useMemo, useRef } from "react";
import { useForm, useFormFields } from "@payloadcms/ui";
import { useInlinePreviewGuard } from "./inline-preview.js";
import {
  mergePreviewData,
  normalizePreviewRows,
} from "../state/preview-data.js";

/** Read an optimistic projection of the sole native Form, without another document store or persistence path.
 * The initial authorized, populated document supplies relationship objects only while their IDs match.
 * Rendering is held while the browser owns inline composition/caret; direct text is already visible in the DOM.
 * This hook belongs exclusively to an activated client renderer. Keep data loading/domain effects in server slots.
 */
export function useEditorPreviewData<T extends Record<string, any>>(
  initialDocument: T,
): T {
  const form = useForm(),
    guard = useInlinePreviewGuard();
  const fields = useFormFields(([fields]) => (guard.active ? null : fields));
  const data = useRef(initialDocument);
  return useMemo(() => {
    if (!guard.active)
      data.current = normalizePreviewRows(
        mergePreviewData(initialDocument, form.getData()) as T,
        form.getFields(),
      ) as T;
    return data.current;
  }, [fields, guard.active, initialDocument]);
}
