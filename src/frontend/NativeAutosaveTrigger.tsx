"use client";
import { useEditorRecovery } from "./recovery.js";
import { useEffect } from "react";
import {
  useAllFormFields,
  useConfig,
  useDocumentInfo,
  useForm,
  useFormBackgroundProcessing,
  useFormModified,
  useFormProcessing,
} from "@payloadcms/ui";
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
  useEffect(() => {
    if (
      recovery.failure ||
      !info.docConfig ||
      !hasAutosaveEnabled(info.docConfig) ||
      !modified ||
      processing ||
      background ||
      form.disabled
    )
      return;
    const timer = setTimeout(async () => {
      form.setBackgroundProcessing(true);
      try {
        await form.submit({
          action: `${config.routes.api}/${info.collectionSlug}/${info.id}?draft=true&autosave=true&depth=0`,
          method: "PATCH",
          overrides: { _status: "draft" },
          acceptValues: true, // onSuccess admits server values only when the submitted snapshot still matches; see protectNativeAcknowledgement.
          disableFormWhileProcessing: false,
          disableSuccessStatus: true,
          skipValidation: !hasDraftValidationEnabled(info.docConfig!),
        });
      } finally {
        form.setBackgroundProcessing(false);
      }
    }, getAutosaveInterval(info.docConfig));
    return () => clearTimeout(timer);
  }, [
    fields,
    modified,
    processing,
    background,
    form.disabled,
    recovery.failure,
  ]);
  return null;
}
