"use client";

import { useEditorObserver } from "payload-inplace/frontend";

/** Forward editor lifecycle metadata for the local demo. */
export function DemoLifecycleObserver() {
  useEditorObserver((event) => {
    window.dispatchEvent(
      new CustomEvent("payload-inplace:demo-event", { detail: event }),
    );
  });
  return null;
}
