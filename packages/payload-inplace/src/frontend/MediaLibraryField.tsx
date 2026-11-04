"use client";
import type { EditorStaticMessageKey } from "../i18n/catalogue.js";
import { useEditorMessages } from "./messages.js";

import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button.js";
import type { ContextualFieldProps } from "./field-strategies.js";
import type { MediaAsset, MediaLibraryAdapter } from "./media-library.js";
import { mediaCollections, mediaReference } from "../schema/media-reference.js";
/** Mounted only while its contextual strategy owns this native field. Cancellation/late responses never write a value. */
export function MediaLibraryField({
  library,
  field,
  setValue,
  value,
  disabled,
  openNative,
  error: fieldError,
}: ContextualFieldProps<"upload" | "relationship"> & {
  library: MediaLibraryAdapter;
}) {
  const { t } = useEditorMessages();

  const [query, setQuery] = useState(""),
    [items, setItems] = useState<MediaAsset[]>([]),
    [cursor, setCursor] = useState<string>(),
    [request, setRequest] = useState<{ cursor?: string; retry: number }>({
      retry: 0,
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<EditorStaticMessageKey | null>(null),
    [progress, setProgress] = useState<number>();
  const upload = useRef<AbortController | null>(null);
  const collections = mediaCollections(field),
    scope = JSON.stringify(collections);
  useEffect(() => {
    if (disabled) {
      upload.current?.abort();
      setProgress(undefined);
    }
    return () => upload.current?.abort();
  }, [disabled, library, scope]);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError(null);
    const timer = setTimeout(() => {
      void library
        .search({
          query,
          cursor: request.cursor,
          collections: JSON.parse(scope),
          signal: controller.signal,
        })
        .then((page) => {
          if (controller.signal.aborted) return;
          const safe = page.items.filter((asset) => {
            try {
              mediaReference(field, asset);
              return true;
            } catch {
              return false;
            }
          });
          setItems((previous) =>
            request.cursor
              ? [
                  ...new Map(
                    [...previous, ...safe].map((item) => [
                      `${item.collection}:${item.id}`,
                      item,
                    ]),
                  ).values(),
                ]
              : safe,
          );
          setCursor(page.nextCursor);
        })
        .catch(() => {
          if (!controller.signal.aborted) setError("mediaSearchFailed");
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [library, query, request, scope, field]);
  async function uploadFile(file: File) {
    if (disabled || !library.upload) return;
    upload.current?.abort();
    const controller = new AbortController();
    upload.current = controller;
    setProgress(0);
    setError(null);
    try {
      const asset = await library.upload({
        file,
        collections,
        signal: controller.signal,
        onProgress: (value) => {
          if (!controller.signal.aborted)
            setProgress(Math.max(0, Math.min(100, value)));
        },
      });
      if (!controller.signal.aborted) setValue(mediaReference(field, asset));
    } catch {
      if (!controller.signal.aborted) setError("mediaUploadFailed");
    } finally {
      if (!controller.signal.aborted) setProgress(undefined);
    }
  }
  return (
    <div className="pve:grid pve:gap-3">
      <label className="pve:grid pve:gap-2 pve:text-sm">
        {t("searchMedia")}
        <input
          disabled={disabled}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setRequest({ retry: 0 });
            setItems([]);
            setCursor(undefined);
          }}
          className="pve:box-border pve:w-full pve:rounded-lg pve:border pve:border-solid pve:border-[var(--pve-border,#e3e4e8)] pve:bg-transparent pve:p-3 pve:font-inherit pve:text-inherit"
        />
      </label>
      {fieldError && <p role="alert">{fieldError}</p>}
      {error && (
        <div role="alert">
          <p>{t(error)}</p>
          <Button
            onClick={() =>
              setRequest((current) => ({
                ...current,
                retry: current.retry + 1,
              }))
            }
          >
            {t("retrySearch")}
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
            aria-pressed={
              String(
                value && typeof value === "object"
                  ? "value" in value
                    ? value.value
                    : "id" in value
                      ? value.id
                      : undefined
                  : value,
              ) === String(asset.id)
            }
            disabled={disabled}
            className="pve:h-auto pve:min-h-16 pve:flex-col pve:items-start pve:p-3 pve:text-start pve:whitespace-normal"
            onClick={() => setValue(mediaReference(field, asset))}
          >
            {asset.thumbnailURL &&
              /^(?:\/[^/]|https:\/\/)/.test(asset.thumbnailURL) && (
                <img
                  src={asset.thumbnailURL}
                  alt=""
                  loading="lazy"
                  className="pve:aspect-video pve:w-full pve:rounded pve:object-cover"
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
      {cursor && (
        <Button
          disabled={busy || disabled}
          onClick={() => setRequest({ cursor, retry: 0 })}
        >
          {t("loadMore")}
        </Button>
      )}
      {library.upload && (
        <label className="pve:grid pve:gap-2 pve:text-sm">
          {t("uploadMedia")}
          <input
            type="file"
            disabled={disabled || progress !== undefined}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadFile(file);
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
