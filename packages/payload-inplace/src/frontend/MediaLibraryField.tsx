"use client";

import type { EditorStaticMessageKey } from "@payload-inplace/ui/localization/catalogue";
import { MediaLibrary } from "@payload-inplace/ui/media/library";

import { useEffect, useRef, useState } from "react";
import type { ContextualFieldProps } from "./field-strategies";
import type { MediaAsset, MediaLibraryAdapter } from "./media-library";
import { mediaCollections, mediaReference } from "../schema/media-reference";

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
    <MediaLibrary
      busy={busy}
      disabled={disabled}
      error={error}
      fieldError={fieldError}
      items={items}
      isSelected={(asset) => selectedReference(value, asset)}
      onLoadMore={cursor ? () => setRequest({ cursor, retry: 0 }) : undefined}
      onQueryChange={(next) => {
        setQuery(next);
        setRequest({ retry: 0 });
        setItems([]);
        setCursor(undefined);
      }}
      onRetry={() => {
        if (error === "mediaUploadFailed") {
          if (failedUpload.current) void uploadFile(failedUpload.current);
        } else {
          setRequest((current) => ({ ...current, retry: current.retry + 1 }));
        }
      }}
      onSelect={(asset) => setValue(mediaReference(field, asset))}
      onUpload={library.upload ? uploadFile : undefined}
      openNative={openNative}
      progress={progress}
      query={query}
    />
  );
}

// Unwrap a populated or polymorphic Payload reference.
function selectedReference(value: unknown, asset: MediaAsset): boolean {
  let reference = value;
  if (reference && typeof reference === "object" && "relationTo" in reference) {
    if (reference.relationTo !== asset.collection) return false;
    reference = "value" in reference ? reference.value : undefined;
  }
  if (reference && typeof reference === "object" && "id" in reference)
    reference = reference.id;
  return (
    (typeof reference === "string" || typeof reference === "number") &&
    String(reference) === String(asset.id)
  );
}
