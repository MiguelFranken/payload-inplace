import { expect, it, vi } from "vitest";
import type { PayloadRequest } from "payload";
import { revisionGuard, assignRevision } from "../src/server/revision.js";
import { signReview } from "../src/server/review.js";
function fixture(
  user: unknown = { id: "editor", collection: "users", _sid: "session" },
) {
  const calls: string[] = [];
  const latest = {
    id: "p",
    _veRevision: 4,
    title: "Saved",
    layout: [{ id: "row", blockType: "text" }],
    capacity: 2,
  };
  const req = {
    user,
    headers: new Headers(),
    context: {},
    payload: {
      secret: "synthetic-unit-secret",
      findByID: vi.fn(async () => {
        calls.push("read");
        return latest;
      }),
      findVersions: vi.fn(async () => ({ docs: [{ parent: "p" }] })),
    },
  } as unknown as PayloadRequest;
  const adapter = {
    name: "fake-not-concurrency-proof",
    lock: vi.fn(async () => {
      calls.push("lock");
    }),
  };
  const guard = revisionGuard("pages", adapter);
  const run = (operation: string, args: Record<string, unknown>) =>
    guard({ operation, args, req } as unknown as Parameters<typeof guard>[0]);
  return { req, latest, adapter, calls, run };
}
it("locks before reading the current revision and rejects stale/missing/bulk expected revisions", async () => {
  const f = fixture();
  const args = {
    id: "p",
    draft: true,
    data: { _status: "draft", _veRevision: 4, title: "Changed" },
  };
  await f.run("update", args);
  expect(f.calls).toEqual(["lock", "read"]);
  expect(args.data._veRevision).toBe(5);
  expect(
    assignRevision({
      data: { _veRevision: 1 },
      operation: "update",
      req: f.req,
      collection: { slug: "pages" },
      originalDoc: { id: "p" },
    } as unknown as Parameters<typeof assignRevision>[0]),
  ).toMatchObject({ _veRevision: 5 });
  for (const revision of [undefined, 3, "4", NaN])
    await expect(
      f.run("update", {
        id: "p",
        draft: true,
        data: { _status: "draft", _veRevision: revision },
      }),
    ).rejects.toThrow("changed");
  const untouched = fixture();
  await expect(untouched.run("update", { data: {} })).rejects.toThrow("Bulk");
  expect(untouched.adapter.lock).not.toHaveBeenCalled();
});
it("binds publication to the reviewed snapshot and exact saved revision", async () => {
  const f = fixture(),
    candidate = { ...f.latest, title: "Saved", _status: "published" };
  await expect(
    f.run("create", { data: { _status: "published" } }),
  ).rejects.toThrow("draft first");
  await expect(
    f.run("update", { id: "p", data: { ...candidate } }),
  ).rejects.toThrow("review");
  const token = signReview(f.req, "pages", "p", 4, candidate);
  await f.run("update", {
    id: "p",
    data: { ...candidate, _veReviewToken: token },
  });
  await expect(
    f.run("update", {
      id: "p",
      data: { ...candidate, title: "Unreviewed", _veReviewToken: token },
    }),
  ).rejects.toThrow("review");
});
it("requires an explicit server-only system-write context and never rolls a restored revision backwards", async () => {
  const ordinary = fixture(null);
  await expect(
    ordinary.run("update", {
      id: "p",
      draft: true,
      overrideAccess: true,
      data: { _veRevision: 1 },
    }),
  ).rejects.toThrow("changed");
  const system = fixture(null);
  system.req.context.visualEditorSystemWrite = true;
  const args = {
    id: "p",
    draft: true,
    overrideAccess: true,
    data: { title: "Trusted" },
  };
  await system.run("update", args);
  expect(args.data).toHaveProperty("_veRevision", 5);
  const restore = fixture();
  await expect(
    restore.run("restoreVersion", { id: "version", draft: false }),
  ).rejects.toThrow("draft");
  await expect(
    restore.run("restoreVersion", { id: "version", draft: true }),
  ).rejects.toThrow("changed");
  restore.req.headers.set("x-visual-editor-revision", "4");
  await restore.run("restoreVersion", { id: "version", draft: true });
  expect(
    assignRevision({
      data: { _veRevision: 1 },
      operation: "update",
      req: restore.req,
      collection: { slug: "pages" },
      originalDoc: { id: "p" },
    } as unknown as Parameters<typeof assignRevision>[0]),
  ).toMatchObject({ _veRevision: 5 });
});
it("keeps deletion serialized and fails when authoritative revision assignment is absent", async () => {
  const f = fixture();
  await f.run("delete", { id: "p" });
  expect(f.calls).toEqual(["lock"]);
  expect(() =>
    assignRevision({
      data: {},
      operation: "update",
      req: f.req,
      collection: { slug: "pages" },
      originalDoc: { id: "p" },
    } as unknown as Parameters<typeof assignRevision>[0]),
  ).toThrow("authoritative");
  expect(
    assignRevision({
      data: {},
      operation: "create",
      req: f.req,
    } as unknown as Parameters<typeof assignRevision>[0]),
  ).toEqual({ _veRevision: 1 });
});
