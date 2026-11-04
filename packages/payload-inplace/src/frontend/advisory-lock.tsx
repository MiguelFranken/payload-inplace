"use client";
import { createContext, use, useEffect, useRef, useState } from "react";
import type { AdvisoryLockState } from "../server/advisory-lock.js";
export const AdvisoryLockContext = createContext<
  AdvisoryLockState & { retry?: () => void }
>({
  status: "disabled",
});
/** Active-only bounded native lease heartbeat. Hidden/unmounted scopes release only their exact last stamp; lost cleanup expires natively. It owns no document content. */
export function useNativeAdvisoryLock(api: string, proof: string) {
  const [state, setState] = useState<AdvisoryLockState>({
      status: "unavailable",
    }),
    [retry, setRetry] = useState(0);
  const held = useRef<AdvisoryLockState["lease"]>(undefined);
  useEffect(() => {
    let disposed = false,
      timer: ReturnType<typeof setTimeout> | undefined,
      request: AbortController | undefined;
    const release = () => {
      const lease = held.current;
      held.current = undefined;
      if (lease)
        void fetch(`${api}/visual-editor/lock`, {
          method: "POST",
          keepalive: true,
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proof, action: "release", lease }),
        }).catch(() => {});
    };
    const acquire = async () => {
      if (disposed || document.visibilityState === "hidden") return;
      request?.abort();
      const controller = new AbortController();
      request = controller;
      try {
        const response = await fetch(`${api}/visual-editor/lock`, {
          method: "POST",
          signal: controller.signal,
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proof, action: "acquire" }),
        });
        if (!response.ok) throw Error("Unavailable");
        const next = (await response.json()) as AdvisoryLockState;
        if (disposed || controller.signal.aborted) return;
        held.current = next.lease;
        setState(next);
        if (next.status === "owned" || next.status === "other")
          timer = setTimeout(
            () => void acquire(),
            Math.min(30000, Math.max(1000, next.heartbeatMs || 30000)),
          );
      } catch {
        if (!disposed && !controller.signal.aborted)
          setState({ status: "unavailable" });
      }
    };
    const visibility = () => {
      clearTimeout(timer);
      request?.abort();
      if (document.visibilityState === "hidden") release();
      else void acquire();
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", release);
    void acquire();
    return () => {
      disposed = true;
      clearTimeout(timer);
      request?.abort();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", release);
      release();
    };
  }, [api, proof, retry]);
  return { ...state, retry: () => setRetry((value) => value + 1) };
}
/** Paused foreign locks are visible without disclosing the other editor's identity. */
export function useAdvisoryLock() {
  return use(AdvisoryLockContext);
}
