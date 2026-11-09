"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useEditorPreviewData } from "payload-inplace/frontend";
import { RenderPageView } from "./RenderPageView";

/** Only the explicitly activated route uses a client renderer. Public pages remain server components. */
export function OptimisticPage({
  initialDocument,
  root,
  serverContent,
}: {
  initialDocument: Record<string, any>;
  root: string;
  serverContent?: Record<string, ReactNode>;
}) {
  const document = useEditorPreviewData(initialDocument);
  const [products, setProducts] = useState<Record<string, any>>({});
  const rows =
    root.split(".").reduce((value, key) => value?.[key], document) || [];
  const missing = [
    ...new Set<string>(
      rows.flatMap((block: any) =>
        (block.cards || [])
          .map((card: any) =>
            typeof card.product === "object" ? undefined : card.product,
          )
          .filter(Boolean),
      ),
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
        .then(async (response) => {
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
        product && typeof product === "object" ? product : products[product]
      }
      renderImage={(image) => <PreviewImage image={image} />}
    />
  );
}

/** Relationship resolution is a consumer concern: native media ACL applies, requests abort on changes, and old images are never shown for a new ID. */
function PreviewImage({ image }: { image: any }) {
  const [resolved, setResolved] = useState<any>();
  const id = image && typeof image === "object" ? image.id : image;
  const populated =
    image && typeof image === "object" && image.url
      ? image
      : resolved?.id === id
        ? resolved
        : undefined;
  useEffect(() => {
    if (!id || image?.url) return;
    const controller = new AbortController();
    fetch(`/api/media/${encodeURIComponent(id)}?depth=0`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Media unavailable");
        const document = await response.json();
        if (!controller.signal.aborted) setResolved(document);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [id, Boolean(image?.url)]);
  if (!id) return null;
  return populated?.url ? (
    <img src={populated.url} alt={populated.alt || ""} width={300} />
  ) : (
    <p role="status">Loading image preview…</p>
  );
}
