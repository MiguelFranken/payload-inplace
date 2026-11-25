"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useEditorPreviewData } from "payload-inplace/frontend";
import { RenderPageView } from "./RenderPageView";
import {
  isCommerceBlock,
  pageRows,
  populated,
  type MediaDocument,
  type MediaRelationship,
  type ProductDocument,
} from "../commerce/render-data";

/** Only the explicitly activated route uses a client renderer. Public pages remain server components. */
export function OptimisticPage({
  initialDocument,
  root,
  serverContent,
}: {
  initialDocument: Record<string, unknown>;
  root: string;
  serverContent?: Record<string, ReactNode>;
}) {
  const document = useEditorPreviewData(initialDocument);
  const [products, setProducts] = useState<Record<string, ProductDocument>>({});
  const rows = pageRows(document, root).filter(isCommerceBlock);
  const missing = [
    ...new Set(
      rows
        .filter((block) => block.blockType === "productGrid")
        .flatMap((block) => block.cards ?? [])
        .map((card) => card.product)
        .filter(
          (product) =>
            typeof product === "string" || typeof product === "number",
        )
        .map(String),
    ),
  ]
    .sort()
    .join(",");
  useEffect(() => {
    if (!missing) return;
    const controller = new AbortController();
    for (const id of missing.split(",")) {
      fetch(`/api/products/${encodeURIComponent(id)}?depth=2`, {
        signal: controller.signal,
      })
        .then(async (response): Promise<ProductDocument> => {
          if (!response.ok) throw new Error("Product unavailable");
          return response.json();
        })
        .then((product) => {
          if (!controller.signal.aborted)
            setProducts((current) => ({ ...current, [id]: product }));
        })
        .catch(() => {});
    }
    return () => controller.abort();
  }, [missing]);
  return (
    <RenderPageView
      document={document}
      root={root}
      active
      serverContent={serverContent}
      resolveProduct={(product) =>
        populated(product) ??
        (product == null ? undefined : products[String(product)])
      }
      renderImage={(image) => <PreviewImage image={image} />}
    />
  );
}

/** Relationship resolution is a consumer concern: native media ACL applies, requests abort on changes, and old images are never shown for a new ID. */
function PreviewImage({ image }: { image: MediaRelationship }) {
  const [resolved, setResolved] = useState<MediaDocument>();
  const media = populated(image);
  const id = media?.id ?? (typeof image === "object" ? undefined : image);
  const url = media?.url;
  const current = url ? media : resolved?.id === id ? resolved : undefined;
  useEffect(() => {
    if (id == null || url) return;
    const controller = new AbortController();
    fetch(`/api/media/${encodeURIComponent(id)}?depth=0`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Media unavailable");
        const document: MediaDocument = await response.json();
        if (!controller.signal.aborted) setResolved(document);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [id, url]);
  if (id == null) return null;
  return current?.url ? (
    <img src={current.url} alt={current.alt || ""} width={300} />
  ) : (
    <p role="status">Loading image preview…</p>
  );
}
