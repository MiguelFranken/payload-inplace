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
import { RotateCcw } from "lucide-react";
import { Button } from "@payload-inplace/ui/primitives/button/button";
import { DocumentReview } from "../admin/DocumentReview";
import {
  targetFromNativeInfo,
  nativeDocumentMethod,
} from "../state/document-target";
import { nativeDraftAction } from "../adapters/native-request";
import { VersionTimeline } from "@payload-inplace/ui/review/version-timeline";

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
    <VersionTimeline
      versions={timeline?.versions.map((version) => ({
        id: version.id,
        date: date(version),
        revision:
          version.revision === undefined
            ? version.id
            : number(version.revision),
        selected: selected === version.id,
        status: version.status,
      }))}
      page={page}
      busy={busy}
      selectionDisabled={restoring || processing}
      hasNextPage={Boolean(timeline?.hasNextPage)}
      loading={loading}
      error={error}
      onChoose={choose}
      onPageChange={setPage}
      onRetry={() => void read(selected)}
    >
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
    </VersionTimeline>
  );
}
