"use client";
import { createContext, use, useEffect, useRef, useState } from "react";
import {
  useDocumentInfo,
  useForm,
  useFormBackgroundProcessing,
  useFormProcessing,
} from "@payloadcms/ui";

/** Recovery describes UI state only. Native Payload still owns fields, validation, requests and merges. */
export type EditorFailure = {
  kind: "network" | "session" | "conflict" | "validation";
  message: string;
  paths?: string[];
};
type Recovery = {
  failure: EditorFailure | null;
  setFailure: (failure: EditorFailure | null) => void;
  attempt: number;
  started: () => void;
  saved: () => void;
  acknowledged: React.RefObject<number>;
  statusURL: string;
};
export const RecoveryContext = createContext<Recovery>(null!);
export const useEditorRecovery = () => use(RecoveryContext);
/** Keep submission bookkeeping outside the form; this adds no queue, data mirror, persistence or retry loop. */
export function useRecoveryState(statusURL: string): Recovery {
  const [failure, setFailure] = useState<EditorFailure | null>(null),
    [attempt, setAttempt] = useState(0);
  const current = useRef(0),
    acknowledged = useRef(0);
  return {
    failure,
    setFailure,
    attempt,
    acknowledged,
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
          message:
            "This document changed in another session. Download your working copy, then reload the latest draft to reconcile the changes.",
        });
        form.setModified(true);
        form.setDisabled(true);
      } else if (failed) {
        const paths = Object.entries(form.getFields())
          .filter(([, field]) => field.valid === false)
          .map(([path]) => path);
        recovery.setFailure(
          paths.length
            ? {
                kind: "validation",
                message:
                  "Some fields need attention. Open a field below to correct it, then retry saving.",
                paths,
              }
            : {
                kind: "network",
                message:
                  "Saving did not finish. Your changes are still in this form. Check the connection, then retry.",
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
        message: session
          ? "Editing access expired or was revoked. Download your working copy before signing in again."
          : "Connection lost. Your changes remain in this form. Check your connection, then retry.",
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
