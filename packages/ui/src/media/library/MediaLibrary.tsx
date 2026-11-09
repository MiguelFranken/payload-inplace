"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { Button } from "../../primitives/button/button";
import { useEditorMessages } from "../../localization/EditorMessages";
import type { EditorStaticMessageKey } from "../../localization/catalogue";

export interface MediaOption {
  id: string | number;
  collection: string;
  label: string;
  thumbnailURL?: string;
  mimeType?: string;
}

export function MediaLibrary({
  busy,
  disabled,
  error,
  fieldError,
  items,
  isSelected,
  onLoadMore,
  onQueryChange,
  onRetry,
  onSelect,
  onUpload,
  openNative,
  progress,
  query,
}: {
  busy: boolean;
  disabled: boolean;
  error: EditorStaticMessageKey | null;
  fieldError?: string;
  items: MediaOption[];
  onLoadMore?: () => void;
  onQueryChange: (query: string) => void;
  onRetry: () => void;
  isSelected: (asset: MediaOption) => boolean;
  onSelect: (asset: MediaOption) => void;
  onUpload?: (file: File) => void;
  openNative: () => void;
  progress?: number;
  query: string;
}) {
  const { t } = useEditorMessages();
  return (
    <div className="pve:grid pve:gap-3">
      <label className="pve:grid pve:gap-2 pve:text-sm">
        {t("searchMedia")}
        <input
          disabled={disabled}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="pve:box-border pve:w-full pve:rounded-lg pve:border pve:border-solid pve:border-[var(--pve-border,#e3e4e8)] pve:bg-transparent pve:p-3 pve:font-inherit pve:text-inherit"
        />
      </label>
      {fieldError && <p role="alert">{fieldError}</p>}
      {error && (
        <div role="alert">
          <p>{t(error)}</p>
          <Button
            disabled={disabled || progress !== undefined}
            onClick={onRetry}
          >
            {t(error === "mediaUploadFailed" ? "retryUpload" : "retrySearch")}
          </Button>
        </div>
      )}
      <div role="status" aria-live="polite">
        {busy
          ? t("searching")
          : items.length === 0 && !error
            ? t("noMediaFound")
            : ""}
      </div>
      <div className="pve:grid pve:grid-cols-2 pve:gap-2">
        {items.map((asset) => (
          <Button
            key={`${asset.collection}:${asset.id}`}
            variant="outline"
            aria-pressed={isSelected(asset)}
            disabled={disabled}
            className="pve:h-auto pve:min-h-16 pve:flex-col pve:items-start pve:p-3 pve:text-start pve:whitespace-normal"
            onClick={() => onSelect(asset)}
          >
            {asset.thumbnailURL && (
              <MediaThumbnail
                key={asset.thumbnailURL}
                url={asset.thumbnailURL}
              />
            )}
            <span>{asset.label}</span>
            {asset.mimeType && (
              <span className="pve:text-xs pve:opacity-60">
                {asset.mimeType}
              </span>
            )}
          </Button>
        ))}
      </div>
      {onLoadMore && (
        <Button disabled={busy || disabled} onClick={onLoadMore}>
          {t("loadMore")}
        </Button>
      )}
      {onUpload && (
        <label className="pve:grid pve:gap-2 pve:text-sm">
          {t("uploadMedia")}
          <input
            type="file"
            disabled={disabled || progress !== undefined}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUpload(file);
              event.target.value = "";
            }}
          />
        </label>
      )}
      {progress !== undefined && (
        <progress aria-label={t("uploadProgress")} max={100} value={progress} />
      )}
      <Button variant="outline" onClick={openNative}>
        {t("openNativeMediaEditor")}
      </Button>
      <p className="pve:m-0 pve:text-xs pve:opacity-60">
        {t("replacesThisFieldSMediaReferenceSharedAssetMetadata")}
      </p>
    </div>
  );
}

function MediaThumbnail({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  let source: string | undefined;
  try {
    const parsed = new URL(url, window.location.href);
    if (
      !parsed.username &&
      !parsed.password &&
      (parsed.protocol === "https:" ||
        (parsed.protocol === "http:" &&
          parsed.origin === window.location.origin))
    )
      source = parsed.href;
  } catch {
    /* Invalid library thumbnails retain the asset's visible label. */
  }
  if (!source || failed)
    return (
      <span
        aria-hidden="true"
        className="pve:flex pve:aspect-video pve:w-full pve:items-center pve:justify-center pve:rounded pve:bg-[var(--pve-muted-surface,#f4f5f7)] pve:opacity-60"
      >
        <ImageOff size={20} />
      </span>
    );
  return (
    <img
      src={source}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="pve:aspect-video pve:w-full pve:rounded pve:object-cover"
    />
  );
}
