import "server-only";
import type { ReactNode } from "react";
/** Example server-only block output stays authoritative until a saved revision refreshes this route. */
export async function getServerPageSlots(
  document: Record<string, any>,
  root: string,
): Promise<Record<string, ReactNode>> {
  const layout = root.split(".").reduce((value, key) => value?.[key], document);
  return Object.fromEntries(
    (Array.isArray(layout) ? layout : [])
      .filter((block) => block.blockType === "serverData")
      .map((block) => [
        block.id,
        <ServerResult key={block.id} document={document} />,
      ]),
  );
}

async function ServerResult({ document }: { document: Record<string, any> }) {
  // A deterministic streamed server fragment exercises preview adoption under real RSC latency.
  if (
    document.slug?.startsWith("streaming-optimistic") &&
    document._veRevision > 1
  )
    await new Promise((resolve) => setTimeout(resolve, 1800));
  return (
    <p data-server-revision={document._veRevision}>
      Server result: {document.slug}
    </p>
  );
}
