"use client";

import { useEditorRecovery } from "./recovery.js";
import { useEffect, useMemo, useState } from "react";
import {
  useAllFormFields,
  useConfig,
  useLocale,
  useDocumentInfo,
  useForm,
  useFormBackgroundProcessing,
  useFormModified,
  useFormProcessing,
} from "@payloadcms/ui";
import {
  targetFromNativeInfo,
  nativeDocumentMethod,
  targetDocumentKey,
} from "../state/document-target.js";
import { nativeDraftAction } from "../adapters/native-request.js";
import {
  autosaveDelay,
  authoredFieldKey,
  canScheduleNativeSave,
} from "../state/autosave.js";
import {
  getAutosaveInterval,
  hasAutosaveEnabled,
  hasDraftValidationEnabled,
} from "payload/shared";
import { useNativeIdleSubmit } from "./controllers/idle-submit.js";

/** The idle trigger delegates directly to the sole native Form.submit. An unacknowledged attempt waits for explicit recovery, never another timer. */
export function NativeAutosaveTrigger() {
  const recovery = useEditorRecovery(),
    form = useForm(),
    info = useDocumentInfo(),
    { config } = useConfig(),
    locale = useLocale();
  const [fields] = useAllFormFields(),
    modified = useFormModified(),
    processing = useFormProcessing(),
    background = useFormBackgroundProcessing();
  const valueKey = useMemo(() => authoredFieldKey(fields), [fields]);
  const [composing, setComposing] = useState(false);
  useEffect(() => {
    const start = () => setComposing(true),
      end = () => setComposing(false);
    window.addEventListener("compositionstart", start, true);
    window.addEventListener("compositionend", end, true);
    return () => {
      window.removeEventListener("compositionstart", start, true);
      window.removeEventListener("compositionend", end, true);
    };
  }, []);
  const enabled = Boolean(
    !composing &&
      !recovery.failure &&
      info.docConfig &&
      hasAutosaveEnabled(info.docConfig) &&
      modified &&
      !processing &&
      !background &&
      !form.disabled &&
      canScheduleNativeSave(
        recovery.attempt,
        recovery.acknowledged.current,
        recovery.retryAuthorized.current,
      ),
  );
  useNativeIdleSubmit({
    authoredKey: valueKey,
    scope: JSON.stringify([
      targetDocumentKey(targetFromNativeInfo(info)),
      locale.code,
    ]),
    enabled,
    delay: info.docConfig
      ? autosaveDelay(getAutosaveInterval(info.docConfig))
      : 1500,
    onError: () =>
      recovery.setFailure({
        kind: "network",
        messageKey: "saveCouldNotFinish",
      }),
    onIdle: async () => {
      const submittedKey = authoredFieldKey(form.getFields());
      let saved = false;
      form.setBackgroundProcessing(true);
      try {
        const result = await form.submit({
          action: nativeDraftAction(
            config.routes.api,
            targetFromNativeInfo(info),
            locale.code,
            true,
          ),
          method: nativeDocumentMethod(targetFromNativeInfo(info)),
          overrides: { _status: "draft" },
          acceptValues: true,
          disableFormWhileProcessing: false,
          disableSuccessStatus: true,
          skipValidation: !hasDraftValidationEnabled(info.docConfig!),
        });
        saved = Boolean(result?.res.ok);
      } finally {
        form.setBackgroundProcessing(false);
        if (saved && submittedKey === authoredFieldKey(form.getFields()))
          form.setModified(false);
      }
    },
  });
  return null;
}
