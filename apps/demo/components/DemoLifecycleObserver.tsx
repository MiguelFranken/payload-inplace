"use client";
import { useEditorObserver } from "payload-inplace/frontend";
/** Synthetic demo instrumentation has no telemetry transport. Browser tests may listen for redacted metadata only. */
export function DemoLifecycleObserver() {
  useEditorObserver((event) => {
    window.dispatchEvent(
      new CustomEvent("payload-inplace:demo-event", { detail: event }),
    );
    if (
      (window as Window & { __demoRejectObserver?: boolean })
        .__demoRejectObserver
    )
      return Promise.reject(Error("Synthetic observer failure"));
  });
  return null;
}
