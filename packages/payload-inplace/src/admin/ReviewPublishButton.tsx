"use client";
import {
  nativeDocumentPath,
  nativeDocumentMethod,
  targetFromNativeInfo,
} from "../state/document-target.js";
import { useDocumentScopes } from "../frontend/document-scope.js";
import { useEditorMessages } from "../frontend/messages.js";

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
import { use, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ClientBlock, ClientField } from "payload";
import { FileCheck2, LoaderCircle, X, Globe, History } from "lucide-react";
import { useModalDismiss } from "./native-accessibility.js";
import { DocumentReview } from "./DocumentReview.js";
import { ReviewBaselineContext } from "./review-baseline.js";
import { documentChanges } from "../state/document-diff.js";
import { Button as ChromeButton } from "../frontend/ui/button.js";
import { useOptionalEditorLifecycle } from "../frontend/lifecycle.js";
import { chrome } from "./chrome.js";

type Review = {
  draft: Record<string, any>;
  published: Record<string, any> | null;
  token: string;
};
/** Review comparisons are read-only. Publication always submits the complete server-signed saved revision through the sole native Form. */
export function ReviewPublishButton({
  compact = false,
  frontend = false,
}: { compact?: boolean; frontend?: boolean } = {}) {
  const events = useOptionalEditorLifecycle();
  const scopes = useDocumentScopes();
  const { config } = useConfig(),
    info = useDocumentInfo(),
    form = useForm(),
    locale = useLocale();
  const modified = useFormModified(),
    processing = useFormProcessing(),
    background = useFormBackgroundProcessing();
  const { i18n } = useTranslation(),
    de = i18n.language === "de";
  const {
    t,
    locale: uiLocale,
    number,
  } = useEditorMessages(undefined, i18n.language);

  const [review, setReview] = useState<Review | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [publishing, setPublishing] = useState(false);
  const [comparison, setComparison] = useState<"published" | "session">(
    "published",
  );
  const baseline = use(ReviewBaselineContext);
  const openedWith = useRef(baseline || info.data || form.getData()).current;
  const request = useRef<AbortController | null>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const { closeModal } = useModal();
  const modalSlug = `ve-review-${useId()}`;
  function dismiss() {
    setReview(null);
    requestAnimationFrame(() =>
      trigger.current?.focus({ preventScroll: true }),
    );
  }
  useModalDismiss(modalSlug, dismiss);
  useEffect(
    () => () => {
      request.current?.abort();
      closeModal(modalSlug);
    },
    [closeModal, modalSlug],
  );
  const fields = (info.docConfig?.fields || []) as ClientField[],
    blocksMap = config.blocksMap as Record<string, ClientBlock>;
  const publishedChanges = useMemo(
    () =>
      review
        ? documentChanges(
            review.published,
            review.draft,
            fields,
            blocksMap,
            uiLocale,
          )
        : [],
    [review, fields, blocksMap, uiLocale],
  );
  const sessionChanges = useMemo(
    () =>
      review
        ? documentChanges(openedWith, review.draft, fields, blocksMap, uiLocale)
        : [],
    [review, openedWith, fields, blocksMap, uiLocale],
  );
  const api = nativeDocumentPath(config.routes.api, targetFromNativeInfo(info));
  async function open() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    setComparison("published");
    const operation = events?.start("review");
    try {
      const roots = info.docConfig?.admin?.custom?.visualEditorRoots as
        | string[]
        | undefined;
      const response = await fetch(
        `${config.routes.api}/visual-editor/review${locale.code ? `?locale=${encodeURIComponent(locale.code)}&fallback-locale=null` : ""}`,
        {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target: targetFromNativeInfo(info, roots?.[0]),
            candidate: form.getData(),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Review unavailable");
      if (!controller.signal.aborted) {
        setReview(result);
        operation?.settle("succeeded");
      }
    } catch (e) {
      operation?.settle(
        controller.signal.aborted ? "cancelled" : "failed",
        "unknown",
      );
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      operation?.settle("cancelled");
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  async function publish() {
    if (!review || publishing) return;
    setError("");
    setPublishing(true);
    try {
      const result = await form.submit({
        method: nativeDocumentMethod(targetFromNativeInfo(info)),
        action: `${api}?depth=0&fallback-locale=null${locale.code ? `&locale=${encodeURIComponent(locale.code)}` : ""}`,
        overrides: { _status: "published", _veReviewToken: review.token },
      });
      if (!result?.res.ok)
        throw Error(t("publicationFailedReviewTheCurrentDraftAndRetry"));
      closeModal(modalSlug);
      dismiss();
      info.setHasPublishedDoc(true);
      info.setUnpublishedVersionCount(0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPublishing(false);
    }
  }
  const blocked =
    !info.hasPublishPermission ||
    processing ||
    modified ||
    background ||
    loading ||
    form.disabled;
  const label = t("reviewChanges");
  const close = () => {
    closeModal(modalSlug);
    dismiss();
  };
  return (
    <>
      {frontend ? (
        <ChromeButton
          ref={trigger}
          size="icon"
          variant="default"
          aria-label={label}
          tooltip={label}
          disabled={blocked}
          onClick={() => void open()}
        >
          {loading ? (
            <LoaderCircle
              size={18}
              aria-hidden="true"
              className="pve:motion-safe:animate-spin"
            />
          ) : (
            <FileCheck2 size={18} aria-hidden="true" />
          )}
        </ChromeButton>
      ) : (
        <Button
          type="button"
          aria-label={label}
          tooltip={label}
          disabled={blocked}
          onClick={() => void open()}
        >
          {compact ? t("review") : label}
        </Button>
      )}
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
          aria-label={t("documentChanges")}
          className="pve:fixed! pve:inset-0! pve:m-0! pve:flex! pve:h-dvh! pve:max-h-dvh! pve:w-screen! pve:max-w-none! pve:items-center! pve:justify-center! pve:overflow-hidden! pve:bg-black/30! pve:p-3! pve:md:p-8!"
        >
          <div
            className={`pve:box-border pve:flex pve:max-h-full pve:w-full pve:max-w-5xl pve:flex-col pve:overflow-hidden pve:rounded-2xl pve:border pve:border-solid pve:shadow-2xl ${chrome.border} ${chrome.surface}`}
          >
            <header
              className={`pve:shrink-0 pve:border-0 pve:border-b pve:border-solid pve:px-5 pve:pb-4 pve:pt-4 ${chrome.border}`}
            >
              <div className="pve:flex pve:items-start pve:justify-between pve:gap-3">
                <div className="pve:min-w-0 pve:pt-1">
                  <h2 className="pve:m-0 pve:text-xl pve:font-semibold pve:leading-snug">
                    {label}
                  </h2>
                  {scopes.active && (
                    <p
                      data-ve-review-document=""
                      className="pve:mb-0 pve:mt-2 pve:text-sm pve:font-medium"
                    >
                      {scopes.active.label}
                    </p>
                  )}
                  <p
                    className={`pve:mb-0 pve:mt-2 pve:text-sm pve:leading-relaxed ${chrome.muted}`}
                  >
                    {t("onlyChangedFieldsYourSavedDraftStaysPrivateUntil")}
                  </p>
                </div>
                <ChromeButton
                  size="icon"
                  aria-label={t("closeReview")}
                  disabled={publishing}
                  onClick={close}
                >
                  <X size={18} aria-hidden="true" />
                </ChromeButton>
              </div>
              <div
                role="group"
                aria-label={t("compareDraftWith")}
                className="pve:mt-4 pve:flex pve:flex-wrap pve:gap-2"
              >
                <ChromeButton
                  size="sm"
                  variant="outline"
                  aria-label={`${t("published")}: ${t("changedFieldCount", { count: publishedChanges.length })}`}
                  aria-pressed={comparison === "published"}
                  onClick={() => setComparison("published")}
                >
                  <Globe
                    size={15}
                    aria-hidden="true"
                    className="pve:max-sm:hidden"
                  />
                  {t("published")}
                  <span className="pve:tabular-nums">
                    {number(publishedChanges.length)}
                  </span>
                </ChromeButton>
                <ChromeButton
                  size="sm"
                  variant="outline"
                  aria-label={`${t("sinceOpening")}: ${t("changedFieldCount", { count: sessionChanges.length })}`}
                  aria-pressed={comparison === "session"}
                  onClick={() => setComparison("session")}
                >
                  <History
                    size={15}
                    aria-hidden="true"
                    className="pve:max-sm:hidden"
                  />
                  {t("sinceOpening")}
                  <span className="pve:tabular-nums">
                    {number(sessionChanges.length)}
                  </span>
                </ChromeButton>
              </div>
            </header>
            <div
              role="region"
              aria-label={t("changedFields")}
              tabIndex={0}
              className="pve:min-h-0 pve:flex-1 pve:overflow-auto pve:overscroll-contain pve:p-4 pve:md:p-6 pve:outline-none pve:focus-visible:ring-2 pve:focus-visible:ring-inset pve:focus-visible:ring-[var(--pve-accent,#3451eb)]"
            >
              <DocumentReview
                before={
                  comparison === "published" ? review.published : openedWith
                }
                after={review.draft}
                fields={fields}
                blocksMap={blocksMap}
                de={de}
                beforeLabel={
                  comparison === "published" ? t("published") : t("whenOpened")
                }
                afterLabel={t("savedDraft")}
              />
            </div>
            <footer
              className={`pve:shrink-0 pve:border-0 pve:border-t pve:border-solid pve:p-4 ${chrome.border}`}
            >
              {error && (
                <p role="alert" className="pve:mb-3 pve:mt-0 pve:text-sm">
                  {error}
                </p>
              )}
              <div className="pve:flex pve:flex-wrap pve:items-center pve:justify-between pve:gap-3">
                <p
                  className={`pve:m-0 pve:max-w-prose pve:flex-1 pve:basis-64 pve:text-xs pve:leading-relaxed ${chrome.muted}`}
                >
                  {t(
                    "publishesTheCompleteReviewedDraftIncludingChangesFromOther",
                  )}
                </p>
                <div className="pve:flex pve:flex-wrap pve:gap-2">
                  <ChromeButton
                    variant="outline"
                    disabled={publishing}
                    onClick={close}
                  >
                    {t("keepEditing")}
                  </ChromeButton>
                  <ChromeButton
                    variant="default"
                    disabled={
                      processing ||
                      background ||
                      publishing ||
                      form.disabled ||
                      !publishedChanges.length
                    }
                    onClick={() => void publish()}
                  >
                    {publishing && (
                      <LoaderCircle
                        size={16}
                        aria-hidden="true"
                        className="pve:motion-safe:animate-spin"
                      />
                    )}
                    {t("publishReviewedDraft")}
                  </ChromeButton>
                </div>
              </div>
            </footer>
          </div>
        </Modal>
      )}
    </>
  );
}
