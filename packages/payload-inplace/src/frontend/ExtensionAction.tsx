"use client";

import { useEditorMessages } from "./messages.js";

import { useEffect, useId, useState } from "react";
import {
  Button,
  Modal,
  useModal,
  useFormModified,
  useFormProcessing,
  useFormBackgroundProcessing,
} from "@payloadcms/ui";
import {
  useVisualEditor,
  type ResolvedEditorExtension,
} from "./tools-context.js";
import { chrome } from "../admin/chrome.js";
import { useModalDismiss } from "../admin/native-accessibility.js";

/** Explicit consumer action with optional confirmation, native busy state and a recoverable error. Nothing runs merely by opening a panel or visiting a URL. */
export function ExtensionAction({
  extension,
  onResult,
}: {
  extension: ResolvedEditorExtension;
  onResult: (message: string) => void;
}) {
  const { t } = useEditorMessages();

  const editor = useVisualEditor(),
    { closeModal } = useModal();
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const modified = useFormModified(),
    processing = useFormProcessing(),
    background = useFormBackgroundProcessing();
  const slug = `pve-action-${useId()}`;
  useModalDismiss(slug, () => setConfirm(false));
  useEffect(() => () => closeModal(slug), [closeModal, slug]);
  async function run() {
    setBusy(true);
    setError("");
    try {
      const result = await editor.runAction(extension.id);
      onResult(result.message);
      setConfirm(false);
      closeModal(slug);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const disabled =
    busy ||
    processing ||
    background ||
    (extension.requireSaved !== false && modified);
  return (
    <>
      <Button
        type="button"
        margin={false}
        buttonStyle="secondary"
        disabled={disabled}
        onClick={() => (extension.confirmation ? setConfirm(true) : void run())}
      >
        {extension.label}
      </Button>
      {error && !confirm && (
        <p
          role="alert"
          className="pve:m-0 pve:w-full pve:text-sm pve:leading-relaxed"
        >
          {error}
        </p>
      )}
      {confirm && extension.confirmation && (
        <Modal
          slug={slug}
          openOnInit
          closeOnBlur={false}
          aria-label={extension.confirmation.title}
          className={`pve:fixed! pve:inset-0! pve:m-0! pve:flex! pve:h-dvh! pve:w-screen! pve:max-w-none! pve:items-center! pve:justify-center! pve:p-4! ${chrome.surface}`}
        >
          <div
            className={`pve:grid pve:max-w-lg pve:gap-5 pve:rounded-xl pve:border pve:border-solid pve:p-6 ${chrome.border}`}
          >
            <h2 className="pve:m-0 pve:text-xl pve:leading-snug">
              {extension.confirmation.title}
            </h2>
            <p className="pve:m-0 pve:text-sm pve:leading-relaxed">
              {extension.confirmation.description}
            </p>
            {error && <p role="alert">{error}</p>}
            <div className={chrome.controls}>
              <Button
                type="button"
                disabled={busy}
                buttonStyle={
                  extension.confirmation.destructive ? "error" : "primary"
                }
                onClick={() => void run()}
              >
                {busy ? t("working") : extension.confirmation.confirmLabel}
              </Button>
              <Button
                type="button"
                buttonStyle="secondary"
                disabled={busy}
                onClick={() => {
                  setConfirm(false);
                  closeModal(slug);
                }}
              >
                {t("cancel")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
