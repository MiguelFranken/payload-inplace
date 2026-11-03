"use client";
import {
  Button,
  Modal,
  useModal,
  useConfig,
  useDocumentInfo,
  useForm,
  useFormProcessing,
  useFormModified,
  useFormBackgroundProcessing,
  useLocale,
  useTranslation,
} from "@payloadcms/ui";
import { useEffect, useId, useState } from "react";
import { useModalDismiss } from "./native-accessibility.js";
import { DocumentReview } from "./DocumentReview.js";
import { Button as ChromeButton } from "../frontend/ui/button.js";
import { chrome } from "./chrome.js";

/** Document-wide saved-draft review uses the same native Form submit path as standard publishing. */
export function ReviewPublishButton({
  compact = false,
  frontend = false,
}: { compact?: boolean; frontend?: boolean } = {}) {
  const { config } = useConfig(),
    info = useDocumentInfo(),
    form = useForm(),
    locale = useLocale();
  const modified = useFormModified();
  const processing = useFormProcessing(),
    background = useFormBackgroundProcessing();
  const { i18n } = useTranslation();
  const de = i18n.language === "de";
  const [review, setReview] = useState<any>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const { closeModal } = useModal();
  const modalSlug = `ve-review-${useId()}`;
  useModalDismiss(modalSlug, () => setReview(null));
  useEffect(() => () => closeModal(modalSlug), [closeModal, modalSlug]);
  const api = `${config.routes.api}/${info.collectionSlug}/${info.id}`;
  async function open() {
    setLoading(true);
    setError("");
    try {
      const candidate = form.getData();
      const roots = info.docConfig?.admin?.custom?.visualEditorRoots as
        | string[]
        | undefined;
      const response = await fetch(
        `${config.routes.api}/visual-editor/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target: {
              collection: info.collectionSlug,
              id: info.id,
              root: roots?.[0],
            },
            candidate,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setReview(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function publish() {
    if (!review) return;
    setError("");
    const result = await form.submit({
      action: `${api}?depth=0&locale=${encodeURIComponent(locale.code)}`,
      overrides: { _status: "published", _veReviewToken: review.token },
    });
    if (result?.res.ok) {
      closeModal(modalSlug);
      setReview(null);
      info.setHasPublishedDoc(true);
      info.setUnpublishedVersionCount(0);
    } else
      setError(
        de
          ? "Veröffentlichen fehlgeschlagen. Entwurf prüfen und erneut versuchen."
          : "Publication failed. Review the current draft and retry.",
      );
  }
  const Trigger = frontend ? ChromeButton : Button;
  return (
    <>
      <Trigger
        className={
          frontend
            ? "pve:bg-[var(--pve-accent,#3451eb)]! pve:text-white! pve:max-sm:px-2!"
            : undefined
        }
        type="button"
        aria-label={de ? "Änderungen prüfen" : "Review changes"}
        disabled={
          !info.hasPublishPermission ||
          processing ||
          modified ||
          background ||
          loading ||
          form.disabled
        }
        onClick={() => void open()}
      >
        {compact
          ? de
            ? "Prüfen"
            : "Review"
          : de
            ? "Änderungen prüfen"
            : "Review changes"}
      </Trigger>
      {error && !review && (
        <p
          role="alert"
          className="pve:order-10 pve:col-span-full pve:m-0 pve:text-sm"
        >
          {error}
        </p>
      )}
      {review && (
        <Modal
          slug={modalSlug}
          openOnInit
          closeOnBlur={false}
          className={`pve:fixed! pve:inset-0! pve:h-dvh! pve:max-h-dvh! pve:m-0! pve:flex! pve:max-w-none! pve:flex-col! pve:overflow-hidden! pve:p-0! ${chrome.surface}`}
          aria-label={de ? "Änderungen am Dokument" : "Document changes"}
        >
          <header
            className={`pve:grid pve:shrink-0 pve:gap-3 pve:border-0 pve:border-b pve:border-solid pve:p-5 ${chrome.border}`}
          >
            <h2 className="pve:m-0 pve:text-xl pve:font-semibold pve:leading-snug pve:text-balance">
              {de
                ? "Gesamten Entwurf veröffentlichen"
                : "Publish the complete draft"}
            </h2>
            <p
              className={`pve:m-0 pve:max-w-prose pve:text-sm pve:leading-relaxed ${chrome.muted}`}
            >
              {de
                ? "Die Prüfung umfasst alle gespeicherten Änderungen, auch aus anderen Sitzungen. Nur dieser geprüfte Stand wird veröffentlicht."
                : "Review all saved changes, including changes from other sessions. Only this reviewed revision can be published."}
            </p>
          </header>
          <div className="pve:min-h-0 pve:flex-1 pve:overflow-auto pve:overscroll-contain pve:p-5 pve:md:px-10">
            <DocumentReview
              before={review.published}
              after={review.draft}
              de={de}
              beforeLabel={de ? "Veröffentlicht" : "Published"}
              afterLabel={de ? "Gespeicherter Entwurf" : "Saved draft"}
            />
          </div>
          <footer
            className={`pve:shrink-0 pve:justify-end pve:border-0 pve:border-t pve:border-solid pve:p-5 ${chrome.controls} ${chrome.border}`}
          >
            {error && (
              <p role="alert" className="pve:w-full pve:text-sm">
                {error}
              </p>
            )}
            <Button
              type="button"
              margin={false}
              buttonStyle="secondary"
              onClick={() => {
                closeModal(modalSlug);
                setReview(null);
              }}
            >
              {de ? "Schließen" : "Close review"}
            </Button>
            <Button
              type="button"
              margin={false}
              disabled={processing || background || form.disabled}
              onClick={() => void publish()}
            >
              {de
                ? "Geprüften Entwurf veröffentlichen"
                : "Publish reviewed draft"}
            </Button>
          </footer>
        </Modal>
      )}
    </>
  );
}
