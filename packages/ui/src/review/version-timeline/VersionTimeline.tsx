"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, History, LoaderCircle } from "lucide-react";
import { useEditorMessages } from "../../localization/EditorMessages";
import type { EditorStaticMessageKey } from "../../localization/catalogue";
import { Button } from "../../primitives/button/button";
import { chrome } from "../../chrome/roles";

/** Displays a prepared version timeline and comparison slot. */
export function VersionTimeline({
  versions,
  page,
  busy,
  selectionDisabled,
  hasNextPage,
  loading,
  error,
  onChoose,
  onPageChange,
  onRetry,
  children,
}: {
  versions?: {
    id: string;
    selected: boolean;
    revision: string;
    date: string;
    status?: string;
  }[];
  page: number;
  busy: boolean;
  selectionDisabled: boolean;
  hasNextPage: boolean;
  loading: boolean;
  error: EditorStaticMessageKey | null;
  onChoose: (id: string) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  children?: ReactNode;
}) {
  const { t } = useEditorMessages();
  return (
    <div className="pve:grid pve:gap-4">
      <p className={`pve:m-0 pve:text-sm pve:leading-relaxed ${chrome.muted}`}>
        {t("compareSavedVersionsRestoringCreatesADraftPublicationStays")}
      </p>
      <div className="pve:grid pve:gap-2" aria-label={t("savedVersions")}>
        {versions?.map((version) => (
          <Button
            key={version.id}
            variant="outline"
            aria-pressed={version.selected}
            className="pve:h-auto pve:min-h-11 pve:justify-start pve:py-2 pve:text-start"
            aria-label={t("compareVersion", { version: version.revision })}
            disabled={selectionDisabled}
            onClick={() => onChoose(version.id)}
          >
            <History size={15} />
            <span>{version.date}</span>
            <span className={`pve:ms-auto pve:text-xs ${chrome.muted}`}>
              {version.status === "published" ? t("published") : t("draft")}
            </span>
          </Button>
        ))}
        {versions?.length === 0 && <p>{t("noSavedVersions")}</p>}
      </div>
      <div className="pve:flex pve:items-center pve:justify-between">
        <Button
          size="icon"
          aria-label={t("newerVersions")}
          disabled={page === 1 || busy}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={17} className="pve:rtl:rotate-180" />
        </Button>
        <span className={`pve:text-xs ${chrome.muted}`}>
          {t("versionPage", { page })}
        </span>
        <Button
          size="icon"
          aria-label={t("olderVersions")}
          disabled={!hasNextPage || busy}
          onClick={() => onPageChange(page + 1)}
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
          <Button onClick={onRetry}>{t("retry")}</Button>
        </div>
      )}
      {children}
    </div>
  );
}
