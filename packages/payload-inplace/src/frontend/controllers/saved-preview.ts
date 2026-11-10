"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type {
  EditorPreviewResponse,
  EditorPreviewSnapshot,
} from "@internal/types";
import type { EditorStaticMessageKey } from "@payload-inplace/ui/localization/catalogue";
import { useEditorLifecycle } from "../lifecycle";

/** Single-flight saved presentation reads, independent from the sole native save queue. Coalesces revision floors, ignores late results after unmount and delegates authorization failure without touching field values. */
export function useSavedPreview({
  initialRevision,
  refresh,
  accept,
  denied,
}: {
  initialRevision: string | number;
  refresh: () => Promise<EditorPreviewResponse>;
  accept: (snapshot: EditorPreviewSnapshot) => void;
  denied: () => void;
}) {
  const events = useEditorLifecycle();
  const requested = useRef(initialRevision),
    parent = useRef<string | undefined>(undefined),
    reading = useRef(false),
    disposed = useRef(false);
  const [pending, setPending] = useState(false),
    [error, setError] = useState<EditorStaticMessageKey | null>(null);
  useEffect(() => {
    disposed.current = false;
    return () => {
      disposed.current = true;
    };
  }, []);
  const current = useRef({ refresh, accept, denied, events });
  useLayoutEffect(() => {
    current.current = { refresh, accept, denied, events };
  }, [refresh, accept, denied, events]);
  const run = useCallback(async () => {
    if (reading.current || disposed.current) return;
    reading.current = true;
    setPending(true);
    setError(null);
    const observation = current.current.events.start("preview", parent.current);
    try {
      for (;;) {
        const minimum = requested.current;
        let result: EditorPreviewResponse;
        try {
          result = await current.current.refresh();
        } catch {
          result = { error: "unavailable" };
        }
        if (disposed.current) return;
        if ("error" in result) {
          // A transient failure belongs to the read that started before the
          // latest save. Authorization denial still ends the session.
          if (result.error === "unavailable" && minimum < requested.current)
            continue;
          observation.settle(
            "failed",
            result.error === "denied" ? "session" : "preview",
          );
          if (result.error === "denied") current.current.denied();
          else setError("savedPreviewUnavailable");
          return;
        }
        if (result.revision < requested.current) {
          // A newer acknowledgement may arrive during the read. Skip the
          // intermediate snapshot and give that newer request its own read.
          if (minimum < requested.current) continue;
          observation.settle("failed", "preview");
          setError("savedPreviewBehind");
          return;
        }
        requested.current = result.revision;
        current.current.accept(result);
        if (requested.current <= result.revision) break;
      }
      observation.settle("succeeded");
    } catch {
      observation.settle(disposed.current ? "cancelled" : "failed", "preview");
      if (!disposed.current) setError("savedPreviewUnavailable");
    } finally {
      observation.settle("cancelled");
      reading.current = false;
      if (!disposed.current) setPending(false);
    }
  }, []);
  /** Request metadata only; native field values are not accepted here. */
  const request = useCallback(
    (revision: string | number, operation?: string) => {
      if (revision > requested.current) requested.current = revision;
      parent.current = operation;
      return run();
    },
    [run],
  );
  const retry = useCallback(() => {
    void run();
  }, [run]);
  return { pending, error, request, retry };
}
