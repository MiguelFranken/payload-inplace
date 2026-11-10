"use client";

import type { EditorStaticMessageKey } from "@payload-inplace/ui/localization/catalogue";
import {
  createContext,
  use,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
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
  currentAttempt: React.RefObject<number>;
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
    currentAttempt: current,
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
  const checked = useRef<{ statusURL: string; attempt: number }>(null);
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
  const captured = useRef<{
    statusURL: string;
    attempt: number;
    errors: [string, string][];
  }>({ statusURL: recovery.statusURL, attempt: 0, errors: [] });
  if (
    captured.current.statusURL !== recovery.statusURL ||
    captured.current.attempt !== recovery.attempt
  )
    captured.current = {
      statusURL: recovery.statusURL,
      attempt: recovery.attempt,
      errors: [],
    };
  if (recovery.attempt > recovery.acknowledged.current && nativeErrors !== "[]")
    captured.current.errors = JSON.parse(nativeErrors);

  const read = useEffectEvent(() => ({
    available: !processing && !background && !recovery.failure,
    statusURL: recovery.statusURL,
    attempt: recovery.currentAttempt.current,
    acknowledged: recovery.acknowledged.current,
    retryAuthorized: recovery.retryAuthorized.current,
    revision: () => form.getData()._veRevision ?? info.data?.updatedAt,
    form,
    setFailure: recovery.setFailure,
  }));
  type Activity = ReturnType<typeof read>;
  const active = useRef<{
    controller: AbortController;
    matches: (activity: Activity) => boolean;
  }>(null);
  const check = useEffectEvent(async (allowPassive: boolean) => {
    const initial = read();
    if (active.current) {
      if (active.current.matches(initial)) return;
      active.current.controller.abort();
      active.current = null;
    }
    if (!initial.available) return;
    const checkedAttempt =
      checked.current?.statusURL === initial.statusURL
        ? checked.current.attempt
        : 0;
    const failed =
      initial.attempt >
      Math.max(initial.acknowledged, initial.retryAuthorized, checkedAttempt);
    if (!failed && !allowPassive) return;

    const revision = initial.revision();
    const controller = new AbortController();
    const signal = controller.signal;
    // Native onSubmit increments the attempt ref before React publishes processing state.
    const matches = (latest: Activity) =>
      !signal.aborted &&
      latest.available &&
      latest.statusURL === initial.statusURL &&
      latest.form.formRef === initial.form.formRef &&
      latest.attempt === initial.attempt &&
      latest.acknowledged === initial.acknowledged &&
      latest.retryAuthorized === initial.retryAuthorized &&
      latest.revision() === revision;
    const pending = { controller, matches };
    active.current = pending;
    const markChecked = () => {
      if (failed)
        checked.current = {
          statusURL: initial.statusURL,
          attempt: initial.attempt,
        };
    };
    try {
      const response = await fetch(initial.statusURL, {
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
      const latest = read();
      if (!matches(latest)) return;
      const { form, setFailure } = latest;
      markChecked();
      if (status.revision !== revision) {
        setFailure({
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
        setFailure(
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
      const latest = read();
      if (!matches(latest)) return;
      markChecked();
      const session = (error as Error).message === "session";
      latest.setFailure({
        kind: session ? "session" : "network",
        messageKey: session ? "editingAccessExpired" : "connectionLost",
      });
      latest.form.setModified(true);
      latest.form.setDisabled(true);
    } finally {
      if (active.current === pending) active.current = null;
    }
  });
  useEffect(() => {
    if (recovery.failure) return;
    const focus = () => {
      if (document.visibilityState === "visible") void check(true);
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    const interval = setInterval(focus, 45000);
    return () => {
      active.current?.controller.abort();
      active.current = null;
      clearInterval(interval);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [recovery.failure, recovery.statusURL]);
  useEffect(() => {
    void check(false);
  }, [
    recovery.attempt,
    processing,
    background,
    recovery.failure,
    recovery.statusURL,
  ]);
  return null;
}
