"use client";
import type { EditorStaticMessageKey } from "../i18n/catalogue.js";
import { createContext, use, useEffect, useRef, useState } from "react";
import {
  useDocumentInfo,
  useForm,
  useFormFields,
  useFormBackgroundProcessing,
  useFormProcessing,
} from "@payloadcms/ui";

/** Recovery describes UI state only. Native Payload still owns fields, validation, requests and merges. */
export type EditorFailure = {
  kind: "network" | "session" | "conflict" | "validation";
  messageKey: EditorStaticMessageKey;
  paths?: string[];
  fieldErrors?: Record<string, string>;
};
type Recovery = {
  failure: EditorFailure | null;
  setFailure: (failure: EditorFailure | null) => void;
  attempt: number;
  started: () => void;
  saved: () => void;
  acknowledged: React.RefObject<number>;
  retryAuthorized: React.RefObject<number>;
  resume: () => void;
  statusURL: string;
};
export const RecoveryContext = createContext<Recovery>(null!);
export const useEditorRecovery = () => use(RecoveryContext);
/** Keep submission bookkeeping outside the form; this adds no queue, data mirror, persistence or retry loop. */
export function useRecoveryState(statusURL: string): Recovery {
  const [failure, setFailure] = useState<EditorFailure | null>(null),
    [attempt, setAttempt] = useState(0);
  const current = useRef(0),
    acknowledged = useRef(0),
    retryAuthorized = useRef(0);
  return {
    failure,
    setFailure,
    attempt,
    acknowledged,
    retryAuthorized,
    resume: () => {
      // Explicit recovery authorizes another attempt; it does not acknowledge a failed write.
      retryAuthorized.current = current.current;
      setFailure(null);
    },
    statusURL,
    started: () => {
      current.current++;
      setAttempt(current.current);
    },
    saved: () => {
      acknowledged.current = current.current;
      setFailure(null);
    },
  };
}
/** Stops automatic work after one failed attempt and rechecks authorization on focus plus a bounded active-only interval. */
export function NativeSubmissionMonitor() {
  const recovery = useEditorRecovery(),
    form = useForm(),
    info = useDocumentInfo();
  const processing = useFormProcessing(),
    background = useFormBackgroundProcessing();
  const checkedAttempt = useRef(0);
  // Native onChange refreshes can clear field metadata before the status request returns.
  // Retain errors for this submission only; values and persistence still belong to Form.
  const nativeErrors = useFormFields(([fields]) =>
    JSON.stringify(
      Object.entries(fields)
        .filter(([, field]) => field.valid === false)
        .map(([path, field]) => [
          path,
          typeof field.errorMessage === "string" ? field.errorMessage : "",
        ]),
    ),
  );
  const captured = useRef<{ attempt: number; errors: [string, string][] }>({
    attempt: 0,
    errors: [],
  });
  if (captured.current.attempt !== recovery.attempt)
    captured.current = { attempt: recovery.attempt, errors: [] };
  if (recovery.attempt > recovery.acknowledged.current && nativeErrors !== "[]")
    captured.current.errors = JSON.parse(nativeErrors);

  const busy = useRef(false),
    current = useRef({ processing, background, form, info });
  current.current = { processing, background, form, info };
  async function check(signal: AbortSignal, failed = false) {
    if (
      (busy.current && !failed) ||
      current.current.processing ||
      current.current.background
    )
      return;
    busy.current = true;
    try {
      const response = await fetch(recovery.statusURL, {
        cache: "no-store",
        signal,
      });
      if (!response.ok)
        throw new Error(
          response.status === 401 ||
          response.status === 403 ||
          response.status === 404
            ? "session"
            : "network",
        );
      const status = await response.json();
      const { form, info } = current.current;
      const expected = form.getData()._veRevision ?? info.data?.updatedAt;
      if (status.revision !== expected) {
        recovery.setFailure({
          kind: "conflict",
          messageKey: "draftChangedInAnotherSession",
        });
        form.setModified(true);
        form.setDisabled(true);
      } else if (failed) {
        const errors = new Map<string, string>(captured.current.errors);
        for (const [path, field] of Object.entries(form.getFields())) {
          if (field.valid === false)
            errors.set(
              path,
              typeof field.errorMessage === "string" ? field.errorMessage : "",
            );
        }
        const paths = [...errors.keys()];
        recovery.setFailure(
          paths.length
            ? {
                kind: "validation",
                messageKey: "fieldsNeedAttention",
                paths,
                fieldErrors: Object.fromEntries(errors),
              }
            : {
                kind: "network",
                messageKey: "saveDidNotFinish",
              },
        );
        form.setModified(true);
        if (!paths.length) form.setDisabled(true);
      }
    } catch (error) {
      if (signal.aborted) return;
      const session = (error as Error).message === "session";
      recovery.setFailure({
        kind: session ? "session" : "network",
        messageKey: session ? "editingAccessExpired" : "connectionLost",
      });
      current.current.form.setModified(true);
      current.current.form.setDisabled(true);
    } finally {
      busy.current = false;
    }
  }
  useEffect(() => {
    if (
      recovery.failure ||
      recovery.attempt <=
        Math.max(recovery.acknowledged.current, checkedAttempt.current) ||
      processing ||
      background
    )
      return;
    const controller = new AbortController();
    checkedAttempt.current = recovery.attempt;
    void check(controller.signal, true);
    return () => controller.abort();
  }, [recovery.attempt, processing, background, recovery.failure]);
  useEffect(() => {
    if (recovery.failure) return;
    const controller = new AbortController();
    const focus = () => {
      if (document.visibilityState === "visible") void check(controller.signal);
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    const interval = setInterval(focus, 45000);
    return () => {
      controller.abort();
      clearInterval(interval);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [recovery.failure]);
  return null;
}
