"use client";

import { useEffectEvent, useLayoutEffect, useRef } from "react";

/** Schedules one native submission after authored input becomes idle. Retains the latest idle deadline during an active submission.
 * The caller owns native values, acknowledgement and retry gates.
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
  const generation = useRef(0);
  const busy = useRef(false);
  const pending = useRef<{
    ready: boolean;
    submit: () => Promise<void>;
    cancel: () => void;
  }>(undefined);
  const fire = useEffectEvent(onIdle);
  const failure = useEffectEvent(onError);

  // A scope can be left and revisited before an older request settles.
  useLayoutEffect(
    () => () => {
      generation.current++;
    },
    [scope],
  );

  useLayoutEffect(() => {
    if (!enabled) return;
    const owner = generation.current;
    const intent = {
      ready: false,
      async submit() {
        intent.cancel();
        busy.current = true;
        try {
          await fire();
        } catch (error) {
          if (owner === generation.current) {
            // Cancel the queued edit before recovery changes the caller's gate.
            pending.current?.cancel();
            failure(error);
          }
        } finally {
          busy.current = false;
          const next = pending.current;
          if (next?.ready) void next.submit();
        }
      },
      cancel() {
        clearTimeout(timer);
        if (pending.current === intent) pending.current = undefined;
      },
    };
    const timer = setTimeout(() => {
      intent.ready = true;
      if (!busy.current) void intent.submit();
    }, delay);
    pending.current = intent;
    return intent.cancel;
  }, [authoredKey, scope, enabled, delay]);
}
