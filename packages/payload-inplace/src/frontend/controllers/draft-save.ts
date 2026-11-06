"use client";

import { useCallback } from "react";
import {
  useConfig,
  useForm,
  useFormBackgroundProcessing,
  useFormModified,
  useLocale,
} from "@payloadcms/ui";
import type { EditorTarget } from "../../types.js";

import {
  nativeDocumentMethod,
  targetDocumentKey,
} from "../../state/document-target.js";
import { nativeDraftAction } from "../../adapters/native-request.js";

/** Manual draft submission delegates to native Form's single-flight guard. */
export function useNativeDraftSave(target: EditorTarget, disabled: boolean) {
  const form = useForm(),
    { config } = useConfig(),
    locale = useLocale();
  const modified = useFormModified(),
    background = useFormBackgroundProcessing();
  const documentScope = targetDocumentKey(target);
  return useCallback(async () => {
    if (disabled || !modified || background) return;
    form.setBackgroundProcessing(true);
    try {
      await form.submit({
        action: nativeDraftAction(config.routes.api, target, locale.code),
        method: nativeDocumentMethod(target),
        overrides: { _status: "draft" },
        acceptValues: true,
        disableFormWhileProcessing: false,
        disableSuccessStatus: true,
        skipValidation: true,
      });
    } finally {
      form.setBackgroundProcessing(false);
    }
  }, [
    disabled,
    modified,
    background,
    form,
    config.routes.api,
    documentScope,
    locale.code,
  ]);
}
