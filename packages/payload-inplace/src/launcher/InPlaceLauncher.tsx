"use client";

import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import {
  useEditorPageTransition,
  useEditorPagePending,
} from "./EditorPageTransition";

/** Submit the existing authorized activation endpoint, then merge the draft into the current website route. */
export function InPlaceLauncher({
  action,
  children,
  errorMessage,
  editorPath,
}: {
  action: string;
  children: ReactNode;
  errorMessage: string;
  editorPath: string;
}) {
  const refresh = useEditorPageTransition();
  const pending = useEditorPagePending();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!pending) setBusy(false);
  }, [pending]);
  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!refresh || !hydrated) return;
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const data = new FormData(event.currentTarget);
      const response = await fetch(action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data)),
      });
      if (!response.ok) throw new Error("activation denied");
      const { context } = await response.json();
      if (!context.pagePath) {
        const query = new URLSearchParams({ context: context.nonce });
        if (data.get("tool")) query.set("tool", String(data.get("tool")));
        window.location.assign(`${editorPath}?${query}`);
        return;
      }
      refresh();
    } catch {
      setError(errorMessage);
      setBusy(false);
    }
  }
  return (
    <form
      method="post"
      action={action}
      onSubmit={activate}
      aria-busy={busy || !refresh || !hydrated}
      className="pvl:fixed pvl:end-5 pvl:bottom-4 pvl:z-[var(--pve-z-index,2147483000)] pvl:m-0 pvl:font-[family-name:var(--pve-font-family,system-ui)]"
    >
      <fieldset
        disabled={busy || !refresh || !hydrated}
        className="pvl:m-0 pvl:border-0 pvl:p-0"
      >
        {children}
      </fieldset>
      {error && (
        <p
          role="alert"
          className="pvl:max-w-64 pvl:rounded-lg pvl:bg-white pvl:p-3 pvl:text-sm pvl:text-neutral-950 pvl:shadow-lg"
        >
          {error}
        </p>
      )}
    </form>
  );
}
