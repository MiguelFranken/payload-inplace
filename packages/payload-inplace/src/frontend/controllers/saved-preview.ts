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
      let again = false;
      do {
        const minimum = requested.current,
          result = await current.current.refresh();
        if (disposed.current) return;
        if ("error" in result) {
          observation.settle(
            "failed",
            result.error === "denied" ? "session" : "preview",
          );
          if (result.error === "denied") current.current.denied();
          else setError("savedPreviewUnavailable");
          return;
        }
        if (result.revision < minimum) {
          observation.settle("failed", "preview");
          setError("savedPreviewBehind");
          return;
        }
        current.current.accept(result);
        again = requested.current > result.revision;
      } while (again);
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
