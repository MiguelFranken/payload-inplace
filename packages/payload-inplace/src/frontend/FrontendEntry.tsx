"use client";

import { editorActivationPath } from "../adapters/native-request";
import type { EditorStaticMessageKey } from "@payload-inplace/ui/localization/catalogue";
import { EditorMessageError, editorErrorKey } from "../i18n/failure";
import { useEditorMessages } from "@payload-inplace/ui/localization/EditorMessages";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EditorUIOptions } from "@payload-inplace/ui/localization/messages";
import type { EditorTarget } from "../types";
import "../admin/styles.css";

/** Explicit frontend sign-in/activation; merely visiting a public page never mounts this component. */
export function FrontendEntry({
  target,
  ui,
  contentLocale,
  api = "/api",
  authCollection = "users",
  editorPath = "/visual-editor",
  signedIn,
  children,
}: {
  target: EditorTarget;
  ui?: EditorUIOptions;
  /** Native content locale for activation; unrelated to UI translation. */
  contentLocale?: string;
  api?: string;
  authCollection?: string;
  editorPath?: string;
  signedIn: boolean;
  children?: React.ReactNode;
}) {
  const { t, locale, direction } = useEditorMessages(ui);

  const router = useRouter();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<EditorStaticMessageKey | null>(null);
  async function activate(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!signedIn) {
        const login = await fetch(`${api}/${authCollection}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!login.ok) throw new EditorMessageError("signInFailed");
      }
      const response = await fetch(editorActivationPath(api, contentLocale), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target),
      });
      if (!response.ok) throw new EditorMessageError("editingUnavailable");
      const { context } = await response.json();
      if (context.pagePath) {
        router.replace(context.pagePath);
        return;
      }
      window.location.assign(
        `${editorPath}?context=${encodeURIComponent(context.nonce)}${context.locale ? `&locale=${encodeURIComponent(context.locale)}` : ""}`,
      );
    } catch (e) {
      setError(editorErrorKey(e, "editingUnavailable"));
      setBusy(false);
    }
  }
  return (
    <>
      {children}
      <section
        lang={locale}
        dir={direction}
        className="pve:fixed pve:inset-x-4 pve:bottom-4 pve:z-50 pve:mx-auto pve:grid pve:max-w-md pve:gap-5 pve:rounded-2xl pve:border pve:border-solid pve:border-neutral-300 pve:bg-white pve:p-6 pve:font-sans pve:text-neutral-950 pve:shadow-xl"
        aria-label={t("websiteEditing")}
      >
        <div>
          <h1 className="pve:m-0 pve:text-xl pve:font-semibold">
            {t("editThisPage")}
          </h1>
          <p className="pve:mb-0 pve:mt-2 pve:text-sm pve:leading-relaxed pve:text-neutral-600">
            {t("signInToEditContentDirectlyOnTheWebsite")}
          </p>
        </div>
        <form
          onSubmit={(event) => void activate(event)}
          className="pve:grid pve:gap-4"
        >
          {!signedIn && (
            <>
              <label className="pve:grid pve:gap-2 pve:text-sm">
                {t("email")}
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
                {t("password")}
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
              ? t("openingEditor")
              : signedIn
                ? t("startEditing")
                : t("signInAndStartEditing")}
          </button>
        </form>
      </section>
    </>
  );
}
