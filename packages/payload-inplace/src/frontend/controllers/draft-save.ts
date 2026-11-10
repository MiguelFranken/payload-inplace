"use client";

import { useCallback } from "react";
import {
  useConfig,
  useForm,
  useFormBackgroundProcessing,
  useFormModified,
  useFormProcessing,
  useLocale,
} from "@payloadcms/ui";
import type { EditorTarget } from "@internal/types";

import { nativeDocumentMethod } from "@internal/state/document-target";
import { nativeDraftAction } from "@internal/adapters/native-request";

// The dock and document switcher share a native Form. Payload can replace the
// context object during submission, but the native form ref stays stable.
const manualSubmissions = new WeakSet<ReturnType<typeof useForm>["formRef"]>();

/** Submit a manual draft once per native Form, including triggers before React publishes the processing state. */
export function useNativeDraftSave(target: EditorTarget, disabled: boolean) {
  const form = useForm();
  const { config } = useConfig();
  const { code } = useLocale();
  const modified = useFormModified();
  const processing = useFormProcessing();
  const background = useFormBackgroundProcessing();
  const action = nativeDraftAction(config.routes.api, target, code);
  const method = nativeDocumentMethod(target);

  return useCallback(async () => {
    const { formRef, setBackgroundProcessing } = form;
    if (
      disabled ||
      form.disabled ||
      !modified ||
      processing ||
      background ||
      !formRef ||
      manualSubmissions.has(formRef)
    )
      return;

    manualSubmissions.add(formRef);
    try {
      setBackgroundProcessing(true);
      await form.submit({
        action,
        method,
        overrides: { _status: "draft" },
        acceptValues: true,
        disableFormWhileProcessing: false,
        disableSuccessStatus: true,
        skipValidation: true,
      });
    } finally {
      manualSubmissions.delete(formRef);
      setBackgroundProcessing(false);
    }
  }, [action, background, disabled, form, method, modified, processing]);
}
