import {
  initTransaction,
  commitTransaction,
  killTransaction,
  type PayloadRequest,
  type Where,
} from "payload";
import type { VisualEditorOptions } from "../types.js";
import { readEditContext } from "./context.js";
const collection = "payload-locked-documents" as const;
export type AdvisoryLease = { id: string | number; updatedAt: string };
export type AdvisoryLockState = {
  status: "disabled" | "unavailable" | "owned" | "other" | "released";
  expiresAt?: number;
  heartbeatMs?: number;
  lease?: AdvisoryLease;
};
/** Native user-based locks are advisory; revision transactions still reject stale content writes. Never take over a live foreign lock or remove a newer lease on cleanup. */
export async function manageAdvisoryLock(
  req: PayloadRequest,
  proof: string,
  options: VisualEditorOptions,
  action: "acquire" | "release",
  lease?: AdvisoryLease,
): Promise<AdvisoryLockState> {
  const { context } = await readEditContext(req, proof, options),
    target = context.target;
  const locking =
    req.payload.collections[
      target.collection as keyof typeof req.payload.collections
    ]?.config.lockDocuments;
  if (locking === false || !req.payload.collections[collection])
    return { status: "disabled" };
  if (!options.concurrency) return { status: "unavailable" };
  const duration =
    (typeof locking === "object" ? locking.duration : 300) * 1000;
  const scope: Where = {
    and: [
      { "document.relationTo": { equals: target.collection } },
      { "document.value": { equals: target.id } },
    ],
  };
  const user = { relationTo: req.user!.collection, value: req.user!.id };
  const initialized = await initTransaction(req);
  try {
    await options.concurrency.lock(
      req,
      `payload-inplace-presence:${JSON.stringify([target.collection, String(target.id)])}`,
    );
    if (action === "release") {
      if (lease)
        await req.payload.delete({
          collection,
          where: {
            and: [
              scope,
              { id: { equals: lease.id } },
              { updatedAt: { equals: lease.updatedAt } },
              { "user.relationTo": { equals: user.relationTo } },
              { "user.value": { equals: user.value } },
            ],
          },
          overrideAccess: false,
          req,
        });
      if (initialized) await commitTransaction(req);
      return { status: "released" };
    }
    const now = Date.now(),
      cutoff = new Date(now - duration).toISOString();
    const found = await req.payload.find({
      collection,
      where: { and: [scope, { updatedAt: { greater_than: cutoff } }] },
      sort: "-updatedAt",
      limit: 10,
      depth: 0,
      pagination: false,
      overrideAccess: false,
      req,
    });
    const own = (row: (typeof found.docs)[number]) =>
      row.user.relationTo === user.relationTo &&
      String(
        typeof row.user.value === "object" ? row.user.value.id : row.user.value,
      ) === String(user.value);
    const foreign = found.docs.find((row) => !own(row));
    if (foreign) {
      if (initialized) await commitTransaction(req);
      return {
        status: "other",
        expiresAt: Date.parse(foreign.updatedAt) + duration,
        heartbeatMs: Math.min(30000, Math.max(1000, Math.floor(duration / 3))),
      };
    }
    const previous = found.docs.find(own);
    const current = previous
      ? await req.payload.update({
          collection,
          id: previous.id,
          data: { user },
          overrideAccess: false,
          req,
        })
      : await (async () => {
          await req.payload.delete({
            collection,
            where: { and: [scope, { updatedAt: { less_than_equal: cutoff } }] },
            overrideAccess: false,
            req,
          });
          return req.payload.create({
            collection,
            data: {
              document: {
                relationTo: target.collection as never,
                value: target.id as never,
              },
              user,
            },
            overrideAccess: false,
            req,
          });
        })();
    const result: AdvisoryLockState = {
      status: "owned",
      lease: { id: current.id, updatedAt: current.updatedAt },
      expiresAt: Date.parse(current.updatedAt) + duration,
      heartbeatMs: Math.min(30000, Math.max(1000, Math.floor(duration / 3))),
    };
    if (initialized) await commitTransaction(req);
    return result;
  } catch (error) {
    if (initialized) await killTransaction(req);
    throw error;
  }
}
/** Origin/proof-bound internal lease endpoint. It exposes no lock-owner profile and grants no takeover capability. */
export async function advisoryLockEndpoint(
  req: PayloadRequest,
  options: VisualEditorOptions,
  origins: ReadonlySet<string>,
): Promise<Response> {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  if (!origins.has(req.headers.get("origin") || ""))
    return Response.json({ error: "Invalid origin" }, { status: 403, headers });
  try {
    const input = await req.json?.();
    if (
      !input ||
      typeof input.proof !== "string" ||
      input.proof.length > 4096 ||
      !["acquire", "release"].includes(input.action)
    )
      throw Error("Invalid lease");
    const lease = input.lease;
    if (
      lease &&
      (!["string", "number"].includes(typeof lease.id) ||
        typeof lease.updatedAt !== "string" ||
        !Number.isFinite(Date.parse(lease.updatedAt)))
    )
      throw Error("Invalid lease");
    return Response.json(
      await manageAdvisoryLock(req, input.proof, options, input.action, lease),
      { headers },
    );
  } catch {
    return Response.json(
      { error: "Document presence is unavailable" },
      { status: 403, headers },
    );
  }
}
