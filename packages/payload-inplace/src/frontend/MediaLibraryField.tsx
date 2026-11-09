"use client";

import type { EditorStaticMessageKey } from "../i18n/catalogue";
import { useEditorMessages } from "./messages";

import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { Button } from "./ui/button";
import type { ContextualFieldProps } from "./field-strategies";
import type { MediaAsset, MediaLibraryAdapter } from "./media-library";
import { mediaCollections, mediaReference } from "../schema/media-reference";

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
  const upload = useRef<AbortController | null>(null),
    failedUpload = useRef<File | null>(null);
  const collections = mediaCollections(field),
    scope = JSON.stringify(collections);
  useEffect(() => {
    if (disabled) {
      upload.current?.abort();
      failedUpload.current = null;
      setError((current) => (current === "mediaUploadFailed" ? null : current));
      setProgress(undefined);
    }
    return () => {
      upload.current?.abort();
      failedUpload.current = null;
    };
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
    failedUpload.current = file;
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
      if (!controller.signal.aborted) {
        setValue(mediaReference(field, asset));
        failedUpload.current = null;
      }
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
            disabled={disabled || progress !== undefined}
            onClick={() => {
              if (error === "mediaUploadFailed") {
                if (failedUpload.current) void uploadFile(failedUpload.current);
              } else
                setRequest((current) => ({
                  ...current,
                  retry: current.retry + 1,
                }));
            }}
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
            aria-pressed={selectedReference(value, asset)}
            disabled={disabled}
            className="pve:h-auto pve:min-h-16 pve:flex-col pve:items-start pve:p-3 pve:text-start pve:whitespace-normal"
            onClick={() => setValue(mediaReference(field, asset))}
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

// Thumbnails are presentation only. A missing image never clears a valid native
// relationship; native media permissions remain authoritative when selecting it.
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

// IDs are only unique within their collection. Payload may supply either a raw
// ID or a populated document, including inside a polymorphic relation wrapper.
function selectedReference(value: unknown, asset: MediaAsset): boolean {
  let reference = value;
  if (reference && typeof reference === "object" && "relationTo" in reference) {
    if (reference.relationTo !== asset.collection || !("value" in reference))
      return false;
    reference = reference.value;
  }
  if (reference && typeof reference === "object" && "id" in reference)
    reference = reference.id;
  return (
    (typeof reference === "string" || typeof reference === "number") &&
    String(reference) === String(asset.id)
  );
}
