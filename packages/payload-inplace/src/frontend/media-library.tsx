"use client";

import { EditorMessage } from "./messages.js";

import { lazy, Suspense } from "react";
import type {
  ContextualFieldProps,
  FieldStrategyDefinition,
} from "./field-strategies.js";
import { mediaCollections } from "../schema/media-reference.js";

export type MediaAsset = {
  id: string | number;
  collection: string;
  label: string;
  thumbnailURL?: string;
  mimeType?: string;
};

export type MediaPage = { items: MediaAsset[]; nextCursor?: string };

/** A consumer-owned library reads/uploads assets under its own authorization. It returns references, never a replacement document or trusted external URL. */
export interface MediaLibraryAdapter {
  id: string;
  /** Limit registration to supported asset collections. */
  collections?: readonly string[];
  search(input: {
    query: string;
    cursor?: string;
    collections: readonly string[];
    signal: AbortSignal;
  }): Promise<MediaPage>;
  upload?(input: {
    file: File;
    collections: readonly string[];
    signal: AbortSignal;
    onProgress: (percent: number) => void;
  }): Promise<MediaAsset>;
}

const Library = lazy(() =>
  import("./MediaLibraryField.js").then((module) => ({
    default: module.MediaLibraryField,
  })),
);

/** Opt into a single-reference contextual picker. Has-many fields and native custom fields retain Payload's native editor. Shared asset metadata is never edited implicitly. */
export function defineMediaFieldStrategy(
  library: MediaLibraryAdapter,
): FieldStrategyDefinition<"upload" | "relationship"> {
  return {
    id: library.id,
    types: ["upload", "relationship"],
    match: ({ field }) =>
      mediaCollections(field).some(
        (collection) =>
          !library.collections || library.collections.includes(collection),
      ),
    Component: (props: ContextualFieldProps<"upload" | "relationship">) => (
      <Suspense
        fallback={
          <p role="status">
            <EditorMessage id="loadingMediaLibrary" />
          </p>
        }
      >
        <Library {...props} library={library} />
      </Suspense>
    ),
  };
}

/** Same-origin native Payload media search. Native ACLs apply to every request. Upload and shared metadata editing deliberately delegate to native controls. */
export function createPayloadMediaLibrary({
  id = "payload-media",
  collection,
  apiPath = "/api",
  labelField = "filename",
}: {
  id?: string;
  collection: string;
  apiPath?: string;
  labelField?: string;
}): MediaLibraryAdapter {
  if (
    !/^[a-zA-Z0-9_-]+$/.test(collection) ||
    !/^[a-zA-Z0-9_]+$/.test(labelField) ||
    !/^\/[^/]*$/.test(apiPath) ||
    /[?#]/.test(apiPath)
  )
    throw Error(
      "Native media library needs a same-origin API path and safe field/collection names",
    );
  return {
    id,
    collections: [collection],
    async search({ query, cursor, collections, signal }) {
      if (!collections.includes(collection)) return { items: [] };
      const page = cursor === undefined ? 1 : Number(cursor);
      if (!Number.isSafeInteger(page) || page < 1)
        throw Error("Invalid media page");
      const params = new URLSearchParams({
        limit: "12",
        page: String(page),
        depth: "0",
        sort: "-createdAt",
      });
      if (query) params.set(`where[${labelField}][like]`, query);
      const response = await fetch(
        `${apiPath}/${encodeURIComponent(collection)}?${params}`,
        { signal, credentials: "same-origin", cache: "no-store" },
      );
      if (!response.ok)
        throw Error("Native media search denied or unavailable");
      const data = await response.json();
      if (!Array.isArray(data.docs))
        throw Error("Invalid native media response");
      return {
        items: data.docs
          .filter(
            (doc: Record<string, unknown>) =>
              typeof doc.id === "string" || typeof doc.id === "number",
          )
          .map((doc: Record<string, unknown>) => ({
            id: doc.id as string | number,
            collection,
            label:
              typeof doc[labelField] === "string"
                ? (doc[labelField] as string)
                : String(doc.id),
            ...(typeof doc.thumbnailURL === "string"
              ? { thumbnailURL: doc.thumbnailURL }
              : typeof doc.url === "string" &&
                  typeof doc.mimeType === "string" &&
                  doc.mimeType.startsWith("image/")
                ? { thumbnailURL: doc.url }
                : {}),
            ...(typeof doc.mimeType === "string"
              ? { mimeType: doc.mimeType }
              : {}),
          })),
        ...(data.hasNextPage && Number.isSafeInteger(data.nextPage)
          ? { nextCursor: String(data.nextPage) }
          : {}),
      };
    },
  };
}
