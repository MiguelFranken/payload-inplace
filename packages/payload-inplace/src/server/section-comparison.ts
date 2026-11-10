import type { PayloadRequest } from "payload";
import type { VisualEditorOptions } from "../types";
import {
  comparisonRows,
  type SectionComparisonSnapshot,
} from "../state/section-comparison";
import { readEditContext } from "./context";
import { readNativeDocument } from "./document";

/** Return only the active root's readable saved values. The activation proof binds the target, user, session and content locale. */
export async function sectionComparisonEndpoint(
  req: PayloadRequest,
  options: VisualEditorOptions,
  trustedOrigins: ReadonlySet<string>,
): Promise<Response> {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  if (!trustedOrigins.has(req.headers.get("origin") || ""))
    return Response.json({ error: "Invalid origin" }, { status: 403, headers });

  try {
    const input = await req.json?.();
    if (typeof input?.proof !== "string" || input.proof.length > 4096)
      throw new Error("Invalid comparison request");
    const { context, document } = await readEditContext(
      req,
      input.proof,
      options,
    );
    const { target } = context;
    let published: SectionComparisonSnapshot["published"] = null;
    try {
      const live = await readNativeDocument(req, target, false);
      if (live._status === "published")
        published = comparisonRows(live, target.root);
    } catch (error) {
      if ((error as { status?: number }).status !== 404) throw error;
    }

    const snapshot: SectionComparisonSnapshot = {
      revision: document._veRevision ?? document.updatedAt,
      draft: comparisonRows(document, target.root),
      published,
    };
    return Response.json(snapshot, { headers });
  } catch {
    return Response.json(
      { error: "Section comparison is unavailable. Check access and retry." },
      { status: 403, headers },
    );
  }
}
