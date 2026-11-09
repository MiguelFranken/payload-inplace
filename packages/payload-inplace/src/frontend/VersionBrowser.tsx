"use client";

import type { EditorStaticMessageKey } from "@payload-inplace/ui/localization/catalogue";
import { EditorMessageError, editorErrorKey } from "../i18n/failure";
import { useEditorMessages } from "@payload-inplace/ui/localization/EditorMessages";

import { useEffect, useRef, useState } from "react";
import {
  useConfig,
  useDocumentInfo,
  useForm,
  useFormModified,
  useFormProcessing,
  useFormBackgroundProcessing,
  useLocale,
  useTranslation,
} from "@payloadcms/ui";
import { hasDraftValidationEnabled } from "payload/shared";
import type { ClientBlock } from "payload";
import {
  History,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@payload-inplace/ui/primitives/button/button";
import { DocumentReview } from "../admin/DocumentReview";
import {
  targetFromNativeInfo,
  nativeDocumentMethod,
} from "../state/document-target";
import { nativeDraftAction } from "../adapters/native-request";
import { chrome } from "../admin/chrome";

interface SavedVersion {
  id: string;
  updatedAt?: string;
  createdAt?: string;
  status?: string;
  revision?: number;
}

interface Result {
  versions: SavedVersion[];
  page: number;
  hasNextPage: boolean;
  revision: number | string;
  restorable: boolean;
  version?: Record<string, unknown> | null;
}

/** Read-only paginated history. Restore is a server-resolved intent submitted by the existing native Form queue. */
export function VersionBrowser({
  onRestored,
  onLocate,
}: {
  onRestored: () => void;
  onLocate?: (path: string) => void;
}) {
  const { config } = useConfig(),
    info = useDocumentInfo(),
    form = useForm(),
    locale = useLocale(),
    { i18n } = useTranslation();
  const {
    t,
    date: formatDate,
    number,
  } = useEditorMessages(undefined, i18n.language);

  const modified = useFormModified(),
    processing = useFormProcessing(),
    background = useFormBackgroundProcessing();
  const [page, setPage] = useState(1),
    [timeline, setTimeline] = useState<Result>(),
    [selected, setSelected] = useState<string>(),
    [snapshot, setSnapshot] = useState<Record<string, unknown>>(),
    [loading, setLoading] = useState(false),
    [restoring, setRestoring] = useState(false),
    [error, setError] = useState<EditorStaticMessageKey | null>(null);
  const request = useRef<AbortController | null>(null),
    generation = useRef(0),
    disposed = useRef(false);
  const de = i18n.language === "de";
  async function read(versionID?: string) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const expected = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const query = locale.code
        ? `?locale=${encodeURIComponent(locale.code)}`
        : "";
      const response = await fetch(
        `${config.routes.api}/visual-editor/versions${query}`,
        {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proof: form.getData()._veActivation,
            page,
            ...(versionID ? { versionID } : {}),
          }),
        },
      );
      const result = (await response.json()) as Result;
      if (!response.ok)
        throw new EditorMessageError("savedVersionsUnavailable");
      if (expected !== generation.current || controller.signal.aborted) return;
      if (versionID) {
        if (!result.version)
          throw new EditorMessageError("versionNoLongerAvailable");
        setSnapshot(result.version);
      } else setTimeline(result);
    } catch (error) {
      if (!controller.signal.aborted)
        setError(editorErrorKey(error, "savedVersionsUnavailable"));
    } finally {
      if (!controller.signal.aborted && !disposed.current) setLoading(false);
    }
  }
  useEffect(() => {
    disposed.current = false;
    setSelected(undefined);
    setSnapshot(undefined);
    void read();
    return () => {
      disposed.current = true;
      request.current?.abort();
    };
  }, [page, locale.code]);
  function choose(id: string) {
    setSelected(id);
    setSnapshot(undefined);
    void read(id);
  }
  async function restore() {
    if (
      !selected ||
      !snapshot ||
      restoring ||
      modified ||
      processing ||
      background ||
      form.disabled
    )
      return;
    setRestoring(true);
    setError(null);
    try {
      // The server re-reads this exact version and current target; this snapshot is never submitted as content.
      const result = await form.submit({
        action: nativeDraftAction(
          config.routes.api,
          targetFromNativeInfo(info),
          locale.code,
        ),
        method: nativeDocumentMethod(targetFromNativeInfo(info)),
        overrides: { _status: "draft", _veRestoreVersion: selected },
        acceptValues: true,
        disableFormWhileProcessing: true,
        skipValidation: !hasDraftValidationEnabled(info.docConfig!),
      });
      if (!result?.res.ok)
        throw new EditorMessageError(
          "restoreFailedReviewTheCurrentDraftBeforeTryingAgain",
        );
      onRestored();
    } catch (error) {
      if (!disposed.current) setError(editorErrorKey(error, "restoreFailed"));
    } finally {
      if (!disposed.current) setRestoring(false);
    }
  }
  const busy = loading || restoring || processing || background;
  const date = (version: SavedVersion) => {
    const value = new Date(version.updatedAt || version.createdAt || "");
    return Number.isNaN(value.getTime())
      ? t("savedVersion")
      : formatDate(value);
  };
  return (
    <div className="pve:grid pve:gap-4">
      <p className={`pve:m-0 pve:text-sm pve:leading-relaxed ${chrome.muted}`}>
        {t("compareSavedVersionsRestoringCreatesADraftPublicationStays")}
      </p>
      <div className="pve:grid pve:gap-2" aria-label={t("savedVersions")}>
        {timeline?.versions.map((version) => (
          <Button
            key={version.id}
            variant="outline"
            aria-pressed={selected === version.id}
            className="pve:h-auto pve:min-h-11 pve:justify-start pve:py-2 pve:text-start"
            aria-label={t("compareVersion", {
              version:
                version.revision === undefined
                  ? version.id
                  : number(version.revision),
            })}
            disabled={restoring || processing}
            onClick={() => choose(version.id)}
          >
            <History size={15} />
            <span>{date(version)}</span>
            <span className={`pve:ms-auto pve:text-xs ${chrome.muted}`}>
              {version.status === "published" ? t("published") : t("draft")}
            </span>
          </Button>
        ))}
        {timeline?.versions.length === 0 && <p>{t("noSavedVersions")}</p>}
      </div>
      <div className="pve:flex pve:items-center pve:justify-between">
        <Button
          size="icon"
          aria-label={t("newerVersions")}
          disabled={page === 1 || busy}
          onClick={() => setPage((value) => value - 1)}
        >
          <ChevronLeft size={17} className="pve:rtl:rotate-180" />
        </Button>
        <span className={`pve:text-xs ${chrome.muted}`}>
          {t("versionPage", { page })}
        </span>
        <Button
          size="icon"
          aria-label={t("olderVersions")}
          disabled={!timeline?.hasNextPage || busy}
          onClick={() => setPage((value) => value + 1)}
        >
          <ChevronRight size={17} className="pve:rtl:rotate-180" />
        </Button>
      </div>
      {loading && (
        <p
          role="status"
          className="pve:flex pve:items-center pve:gap-2 pve:text-sm"
        >
          <LoaderCircle className="pve:motion-safe:animate-spin" size={16} />
          {t("loadingVersion")}
        </p>
      )}
      {error && (
        <div role="alert">
          <p>{t(error)}</p>
          <Button onClick={() => void read(selected)}>{t("retry")}</Button>
        </div>
      )}
      {snapshot && (
        <>
          <DocumentReview
            before={info.data || form.getData()}
            after={snapshot}
            beforeLabel={t("currentDraft")}
            afterLabel={t("selectedVersion")}
            fields={info.docConfig?.fields || []}
            blocksMap={config.blocksMap as Record<string, ClientBlock>}
            de={de}
            onLocate={onLocate}
          />
          {modified && (
            <p role="status">{t("saveCurrentChangesBeforeRestoring")}</p>
          )}
          <Button
            variant="default"
            disabled={
              !timeline?.restorable || busy || modified || form.disabled
            }
            onClick={() => void restore()}
          >
            <RotateCcw size={16} />
            {t("restoreAsDraft")}
          </Button>
        </>
      )}
    </div>
  );
}
