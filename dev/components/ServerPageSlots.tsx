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
        <p key={block.id} data-server-revision={document._veRevision}>
          Server result: {document.slug}
        </p>,
      ]),
  );
}
