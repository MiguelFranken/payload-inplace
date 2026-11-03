"use client";
import { useState } from "react";
import type { EditorTarget } from "../types.js";
import "../admin/styles.css";

/** Explicit frontend sign-in/activation; merely visiting a public page never mounts this component. */
export function FrontendEntry({
  target,
  api = "/api",
  authCollection = "users",
  editorPath = "/visual-editor",
  signedIn,
  children,
}: {
  target: EditorTarget;
  api?: string;
  authCollection?: string;
  editorPath?: string;
  signedIn: boolean;
  children?: React.ReactNode;
}) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function activate(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!signedIn) {
        const login = await fetch(`${api}/${authCollection}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!login.ok)
          throw new Error(
            "Sign-in failed. Check your email and password, then try again.",
          );
      }
      const response = await fetch(`${api}/visual-editor/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target),
      });
      if (!response.ok)
        throw new Error(
          "Editing is unavailable for this account. Check your document permissions or sign in with another account.",
        );
      const { context } = await response.json();
      window.location.assign(
        `${editorPath}?context=${encodeURIComponent(context.nonce)}`,
      );
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      {children}
      <section
        className="pve:fixed pve:inset-x-4 pve:bottom-4 pve:z-50 pve:mx-auto pve:grid pve:max-w-md pve:gap-5 pve:rounded-2xl pve:border pve:border-solid pve:border-neutral-300 pve:bg-white pve:p-6 pve:font-sans pve:text-neutral-950 pve:shadow-xl"
        aria-label="Website editing"
      >
        <div>
          <h1 className="pve:m-0 pve:text-xl pve:font-semibold">
            Edit this page
          </h1>
          <p className="pve:mb-0 pve:mt-2 pve:text-sm pve:leading-relaxed pve:text-neutral-600">
            Sign in to edit content directly on the website. Changes stay in a
            draft until you review and publish them.
          </p>
        </div>
        <form
          onSubmit={(event) => void activate(event)}
          className="pve:grid pve:gap-4"
        >
          {!signedIn && (
            <>
              <label className="pve:grid pve:gap-2 pve:text-sm">
                Email
                <input
                  className="pve:box-border pve:min-h-11 pve:w-full pve:rounded-md pve:border pve:border-solid pve:border-neutral-400 pve:bg-white pve:p-3 pve:text-base pve:text-neutral-950"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="pve:grid pve:gap-2 pve:text-sm">
                Password
                <input
                  className="pve:box-border pve:min-h-11 pve:w-full pve:rounded-md pve:border pve:border-solid pve:border-neutral-400 pve:bg-white pve:p-3 pve:text-base pve:text-neutral-950"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            </>
          )}
          {error && (
            <p role="alert" className="pve:m-0 pve:text-sm pve:leading-relaxed">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="pve:min-h-11 pve:cursor-pointer pve:rounded-lg pve:border-0 pve:bg-neutral-950 pve:px-5 pve:py-3 pve:text-sm pve:font-semibold pve:text-white pve:disabled:opacity-60"
          >
            {busy
              ? "Opening editor…"
              : signedIn
                ? "Start editing"
                : "Sign in and start editing"}
          </button>
        </form>
      </section>
    </>
  );
}
