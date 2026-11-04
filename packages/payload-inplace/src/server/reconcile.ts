import type { PayloadRequest } from "payload";
import type { VisualEditorOptions } from "../types.js";
import { readEditContext } from "./context.js";
/** Read only: reauthorize the exact active target and return its current native draft. Clients compare locally; eventual writes still require the native revision guard and field ACLs. */
export async function latestDraftEndpoint(
  req: PayloadRequest,
  options: VisualEditorOptions,
  trustedOrigins: ReadonlySet<string>,
): Promise<Response> {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  if (!trustedOrigins.has(req.headers.get("origin") || ""))
    return Response.json({ error: "Invalid origin" }, { status: 403, headers });
  try {
    const input: unknown = await req.json?.();
    if (
      !input ||
      typeof input !== "object" ||
      !("proof" in input) ||
      typeof input.proof !== "string" ||
      input.proof.length > 4096
    )
      throw Error("Invalid recovery request");
    const { document } = await readEditContext(req, input.proof, options);
    return Response.json({ document }, { headers });
  } catch {
    return Response.json(
      { error: "The current draft is unavailable. Check your editing access." },
      { status: 403, headers },
    );
  }
}
