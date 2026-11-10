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

const activeDrafts = new WeakSet<ReturnType<typeof useForm>["formRef"]>();

/** Share a synchronous in-flight guard between manual and idle draft submissions. Native processing state updates on the next render. */
export async function runNativeDraftSubmission<T>(
  form: Pick<ReturnType<typeof useForm>, "formRef" | "setBackgroundProcessing">,
  submit: () => Promise<T>,
): Promise<T | undefined> {
  const { formRef, setBackgroundProcessing } = form;
  if (!formRef || activeDrafts.has(formRef)) return;

  activeDrafts.add(formRef);
  try {
    setBackgroundProcessing(true);
    return await submit();
  } finally {
    activeDrafts.delete(formRef);
    setBackgroundProcessing(false);
  }
}

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
    if (disabled || form.disabled || !modified || processing || background)
      return;

    await runNativeDraftSubmission(form, () =>
      form.submit({
        action,
        method,
        overrides: { _status: "draft" },
        acceptValues: true,
        disableFormWhileProcessing: false,
        disableSuccessStatus: true,
        skipValidation: true,
      }),
    );
  }, [action, background, disabled, form, method, modified, processing]);
}
