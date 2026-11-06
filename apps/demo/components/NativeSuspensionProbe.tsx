"use client";

import { use, useEffect, useState } from "react";

/** A silent test fixture for a consumer's lazy native field component.
 * Enabled only by the isolated e2e wrapper; never part of the published plugin.
 * Promise creation happens in an event, allowing a deterministic Suspense/reveal cycle.
 */
export function NativeSuspensionProbe({ enabled }: { enabled?: boolean }) {
  const [pending, setPending] = useState<Promise<void> | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const suspend = () =>
      setPending(
        new Promise<void>((resolve) => {
          setTimeout(() => {
            resolve();
            window.dispatchEvent(new Event("pve-test-native-resumed"));
          }, 180);
        }),
      );
    window.addEventListener("pve-test-native-suspend", suspend);
    return () => window.removeEventListener("pve-test-native-suspend", suspend);
  }, [enabled]);
  if (pending) use(pending);
  return null;
}
