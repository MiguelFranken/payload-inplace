"use client";

import { useEditorRecovery } from "./recovery";
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
} from "../state/document-target";
import { nativeDraftAction } from "../adapters/native-request";
import {
  autosaveDelay,
  createAuthoredFieldKey,
  canScheduleNativeSave,
} from "../state/autosave";
import {
  getAutosaveInterval,
  hasAutosaveEnabled,
  hasDraftValidationEnabled,
} from "payload/shared";
import { runNativeDraftSubmission } from "./controllers/draft-save";
import { useNativeIdleSubmit } from "./controllers/idle-submit";

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
  const authoredFieldKey = useMemo(() => createAuthoredFieldKey(), []);
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
  const valueKey = useMemo(
    () => (enabled ? authoredFieldKey(fields) : ""),
    [authoredFieldKey, enabled, fields],
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
      const result = await runNativeDraftSubmission(form, () =>
        form.submit({
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
        }),
      );
      if (result?.res.ok && submittedKey === authoredFieldKey(form.getFields()))
        form.setModified(false);
    },
  });
  return null;
}
