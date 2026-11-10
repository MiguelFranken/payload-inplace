"use client";

import { editorActivationPath } from "../../adapters/native-request";
import { useConfig, useForm } from "@payloadcms/ui";
import { useEditorMessages } from "@payload-inplace/ui/localization/EditorMessages";
import { isPrivateEditorField } from "@payload-inplace/core/document-metadata";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { Activation } from "../../types";
import { targetDocumentKey } from "../../state/document-target";
import { useEditorPageTransition } from "../../launcher/EditorPageTransition";
import { prepareAdvisoryExit } from "../advisory-lock";

/** Own the active session's transitions while the native Form retains the unsaved working copy. */
export function useEditorSession({
  context,
  exitURL,
  modified,
  background,
  onError,
  onExpire,
}: {
  context: Activation;
  exitURL: string;
  modified: boolean;
  background: boolean;
  onError: (message: string) => void;
  onExpire: () => void;
}) {
  const { t } = useEditorMessages();
  const form = useForm();
  const { config } = useConfig();
  const [reopening, setReopening] = useState(false);
  const inFlight = useRef(false);
  const expire = useEffectEvent(onExpire);
  const refreshPage = useEditorPageTransition();
  async function exit(published = false) {
    if (inFlight.current) return;
    if (
      !published &&
      modified &&
      !window.confirm(t("leaveTheEditorChangesThatHaveNotFinishedSaving"))
    )
      return;
    inFlight.current = true;
    let resumeLeases: (() => void) | undefined;
    try {
      resumeLeases = await prepareAdvisoryExit();
      const response = await fetch(
        `${config.routes.api}/visual-editor/deactivate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nonce: context.nonce }),
        },
      );
      if (!response.ok) throw Error("Deactivation failed");
      if (context.pagePath && refreshPage) refreshPage();
      else window.location.assign(exitURL);
    } catch {
      resumeLeases?.();
      onError(t("couldNotLeaveEditingPleaseTryAgain"));
    } finally {
      inFlight.current = false;
    }
  }

  async function reopenEditor() {
    if (inFlight.current) return;
    if (
      (modified || background) &&
      !window.confirm(t("openTheLatestSavedDraftDownloadYourWorkingCopy"))
    )
      return;
    inFlight.current = true;
    setReopening(true);
    onError("");
    try {
      const response = await fetch(
        editorActivationPath(config.routes.api, context.locale),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(context.target),
        },
      );
      if (!response.ok) throw new Error("activation denied");
      const { context: fresh } = await response.json();
      if (fresh.pagePath && refreshPage) {
        refreshPage();
        return;
      }
      const next = new URL(window.location.href);
      next.searchParams.set("context", fresh.nonce);
      if (fresh.locale) next.searchParams.set("locale", fresh.locale);
      window.location.assign(next.href);
    } catch {
      onError(t("couldNotReopenTheEditorYourWorkingCopyIs"));
      inFlight.current = false;
      setReopening(false);
    }
  }
  useEffect(() => {
    const timer = setTimeout(
      () => expire(),
      Math.max(0, context.expires - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [context.expires, context.nonce]);

  function downloadWorkingCopy() {
    const data = Object.fromEntries(
      Object.entries(form.getData()).filter(
        ([key]) => !isPrivateEditorField(key),
      ),
    );
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${targetDocumentKey(context.target).replace(/[^a-zA-Z0-9_-]/g, "-")}-working-copy.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return { exit, reopenEditor, reopening, downloadWorkingCopy };
}
