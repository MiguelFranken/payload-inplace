import type { CollectionSlug, PayloadRequest } from "payload";
import type { VisualEditorOptions } from "../types.js";
import { readEditContext } from "./context.js";
import { resolveTools } from "./tools.js";
interface VersionRow {
  id: string | number;
  parent?: unknown;
  version: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}
/** Reauthorize every version read through the activated target and native readVersions, including the exact parent. */
export async function readSavedVersions(
  req: PayloadRequest,
  proof: string,
  options: VisualEditorOptions,
  { page = 1, versionID }: { page?: number; versionID?: string } = {},
) {
  const { context, document } = await readEditContext(req, proof, options);
  const tools = await resolveTools(options, {
    req,
    target: context.target,
    document,
  });
  if (!tools.tools.includes("history"))
    throw new Error("Version history is unavailable");
  const result = await req.payload.findVersions({
    collection: context.target.collection as CollectionSlug,
    where: {
      and: [
        { parent: { equals: context.target.id } },
        ...(versionID ? [{ id: { equals: versionID } }] : []),
      ],
    },
    limit: versionID ? 1 : 20,
    page,
    sort: "-updatedAt",
    depth: 0,
    req,
    overrideAccess: false,
  });
  const docs = result.docs as unknown as VersionRow[];
  return {
    context,
    document,
    docs,
    hasNextPage: result.hasNextPage,
    page: result.page ?? page,
  };
}
/** A restore intent is resolved server-side into a normal native draft update. The client cannot supply its historical snapshot.
 * Revision assignment, validation, field access and the sole Form queue remain unchanged.
 */
export async function prepareVersionRestore(
  req: PayloadRequest,
  proof: string,
  versionID: string,
  expected: unknown,
  options: VisualEditorOptions,
): Promise<Record<string, unknown>> {
  if (!options.concurrency)
    throw new Error(
      "Version restore requires a configured concurrency adapter",
    );
  const { context, document, docs } = await readSavedVersions(
    req,
    proof,
    options,
    { versionID },
  );
  const version = docs[0];
  const parent =
    version?.parent &&
    typeof version.parent === "object" &&
    "id" in version.parent
      ? version.parent.id
      : version?.parent;
  if (
    !version ||
    String(parent) !== String(context.target.id) ||
    expected !== (document._veRevision ?? 0)
  )
    throw new Error(
      "The version or current revision changed. Review it again.",
    );
  const omitted = new Set([
    "id",
    "createdAt",
    "updatedAt",
    "_status",
    "_veRevision",
    "_veActivation",
    "_veReviewToken",
    "_veRestoreVersion",
  ]);
  return {
    ...Object.fromEntries(
      Object.entries(version.version).filter(([key]) => !omitted.has(key)),
    ),
    _status: "draft",
    _veRevision: expected,
    _veActivation: proof,
  };
}
/** Read-only, bounded timeline response; no draft values are sent until a particular authorized version is selected. */
export async function versionEndpoint(
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
      throw new Error("Invalid version request");
    const page = "page" in input ? input.page : 1,
      versionID = "versionID" in input ? input.versionID : undefined;
    if (
      !Number.isSafeInteger(page) ||
      (page as number) < 1 ||
      (page as number) > 1000 ||
      (versionID !== undefined &&
        (typeof versionID !== "string" || !versionID || versionID.length > 128))
    )
      throw new Error("Invalid version request");
    const result = await readSavedVersions(req, input.proof, options, {
      page: page as number,
      ...(typeof versionID === "string" ? { versionID } : {}),
    });
    return Response.json(
      {
        page: result.page,
        hasNextPage: result.hasNextPage,
        revision: result.document._veRevision ?? result.document.updatedAt,
        restorable: Boolean(options.concurrency),
        versions: result.docs.map((row) => ({
          id: String(row.id),
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          status: row.version._status,
          revision: row.version._veRevision,
        })),
        ...(versionID ? { version: result.docs[0]?.version ?? null } : {}),
      },
      { headers },
    );
  } catch {
    return Response.json(
      { error: "Saved versions are unavailable. Check access and retry." },
      { status: 403, headers },
    );
  }
}
