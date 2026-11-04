"use client";
import { useEffect, useEffectEvent, useRef } from "react";
/** Schedules one native submission after authored input becomes idle. Metadata/callback identity never restarts the timer.
 * The caller owns native processing, acknowledgement and retry gates; this hook owns no document values or persistence queue.
 */
export function useNativeIdleSubmit({
  authoredKey,
  scope,
  enabled,
  delay,
  onIdle,
  onError,
}: {
  authoredKey: string;
  scope: string;
  enabled: boolean;
  delay: number;
  onIdle: () => Promise<unknown>;
  onError: (error: unknown) => void;
}) {
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  const busy = useRef(false),
    fire = useEffectEvent(onIdle),
    failure = useEffectEvent(onError);
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => {
      if (busy.current) return;
      busy.current = true;
      void Promise.resolve()
        .then(() => fire())
        .catch((error) => {
          if (live.current) failure(error);
        })
        .finally(() => {
          busy.current = false;
        });
    }, delay);
    return () => clearTimeout(timer);
  }, [authoredKey, scope, enabled, delay]);
}
