"use client";
import { createContext, use, useEffect, useRef, useState } from "react";
import type { AdvisoryLockState } from "../server/advisory-lock.js";
export const AdvisoryLockContext = createContext<
  AdvisoryLockState & { retry?: () => void }
>({
  status: "disabled",
});
type ExitParticipant = { pause: () => Promise<void>; resume: () => void };
const exitParticipants = new Set<ExitParticipant>();

/** Release mounted page scopes before revoking their activation cookies. Resume leases if deactivation fails. */
export async function prepareAdvisoryExit(): Promise<() => void> {
  const participants = [...exitParticipants];
  await Promise.all(participants.map((participant) => participant.pause()));
  return () => {
    for (const participant of participants)
      if (exitParticipants.has(participant)) participant.resume();
  };
}
/** Active-only bounded native lease heartbeat. Hidden/unmounted scopes release only their exact last stamp; lost cleanup expires natively. It owns no document content. */
export function useNativeAdvisoryLock(
  api: string,
  proof: string,
  locale?: string,
) {
  const [state, setState] = useState<AdvisoryLockState>({
      status: "unavailable",
    }),
    [retry, setRetry] = useState(0);
  const url = `${api}/visual-editor/lock${locale ? `?locale=${encodeURIComponent(locale)}` : ""}`;
  const held = useRef<AdvisoryLockState["lease"]>(undefined);
  useEffect(() => {
    let disposed = false,
      paused = false,
      timer: ReturnType<typeof setTimeout> | undefined,
      request: AbortController | undefined;
    const release = async () => {
      const lease = held.current;
      held.current = undefined;
      if (lease)
        await fetch(url, {
          method: "POST",
          keepalive: true,
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proof, action: "release", lease }),
        }).catch(() => {});
    };
    const acquire = async () => {
      if (disposed || paused || document.visibilityState === "hidden") return;
      request?.abort();
      const controller = new AbortController();
      request = controller;
      try {
        const response = await fetch(url, {
          method: "POST",
          signal: controller.signal,
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proof, action: "acquire" }),
        });
        if (!response.ok) {
          // A revoked/expired proof cannot authorize a later cleanup either.
          if (response.status === 401 || response.status === 403)
            held.current = undefined;
          throw Error("Unavailable");
        }
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
    const participant: ExitParticipant = {
      pause: async () => {
        paused = true;
        clearTimeout(timer);
        request?.abort();
        await release();
      },
      resume: () => {
        paused = false;
        void acquire();
      },
    };
    exitParticipants.add(participant);
    const visibility = () => {
      if (paused) return;
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
      exitParticipants.delete(participant);
      clearTimeout(timer);
      request?.abort();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", release);
      release();
    };
  }, [url, proof, retry]);
  return { ...state, retry: () => setRetry((value) => value + 1) };
}
/** Paused foreign locks are visible without disclosing the other editor's identity. */
export function useAdvisoryLock() {
  return use(AdvisoryLockContext);
}
