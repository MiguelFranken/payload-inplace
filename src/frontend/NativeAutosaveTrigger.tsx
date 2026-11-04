"use client";
import { useEditorRecovery } from "./recovery.js";
import { useEffect, useMemo, useState } from "react";
import {
  useAllFormFields,
  useConfig,
  useDocumentInfo,
  useForm,
  useFormBackgroundProcessing,
  useFormModified,
  useFormProcessing,
} from "@payloadcms/ui";
import { autosaveDelay, authoredFieldKey } from "../state/autosave.js";
import {
  getAutosaveInterval,
  hasAutosaveEnabled,
  hasDraftValidationEnabled,
} from "payload/shared";

/** Payload does not export its admin Autosave component in 3.91. This idle trigger delegates directly to the sole native Form.submit.
 * There is no second persistence queue or mutation path: manual draft save, publication and autosave share that form's submission guard and merge policy.
 */
export function NativeAutosaveTrigger() {
  const recovery = useEditorRecovery();
  const form = useForm(),
    info = useDocumentInfo(),
    { config } = useConfig();
  const [fields] = useAllFormFields(),
    modified = useFormModified(),
    processing = useFormProcessing(),
    background = useFormBackgroundProcessing();
  const valueKey = useMemo(() => authoredFieldKey(fields), [fields]);
  const [composing, setComposing] = useState(false);
  useEffect(() => {
    const start = () => setComposing(true);
    const end = () => setComposing(false);
    window.addEventListener("compositionstart", start, true);
    window.addEventListener("compositionend", end, true);
    return () => {
      window.removeEventListener("compositionstart", start, true);
      window.removeEventListener("compositionend", end, true);
    };
  }, []);
  useEffect(() => {
    if (
      composing ||
      recovery.failure ||
      !info.docConfig ||
      !hasAutosaveEnabled(info.docConfig) ||
      !modified ||
      processing ||
      background ||
      form.disabled
    )
      return;
    const timer = setTimeout(
      async () => {
        const beforeFields = form.getFields();
        const submittedKey = authoredFieldKey(beforeFields);
        let saved = false;
        form.setBackgroundProcessing(true);
        try {
          const result = await form.submit({
            action: `${config.routes.api}/${info.collectionSlug}/${info.id}?draft=true&autosave=true&depth=0`,
            method: "PATCH",
            overrides: { _status: "draft" },
            acceptValues: true, // onSuccess admits server values only when the submitted snapshot still matches; see protectNativeAcknowledgement.
            disableFormWhileProcessing: false,
            disableSuccessStatus: true,
            skipValidation: !hasDraftValidationEnabled(info.docConfig!),
          });
          saved = Boolean(result?.res.ok);
        } finally {
          form.setBackgroundProcessing(false);
          // Payload 3.91 marks its own setModified(false) as a background edit,
          // leaking that flag into the next submission. Clear only a successful
          // unchanged authored snapshot, after leaving background processing.
          if (saved && submittedKey === authoredFieldKey(form.getFields()))
            form.setModified(false);
        }
      },
      autosaveDelay(getAutosaveInterval(info.docConfig)),
    );
    return () => clearTimeout(timer);
  }, [
    valueKey,
    composing,
    modified,
    processing,
    background,
    form.disabled,
    recovery.failure,
  ]);
  return null;
}
