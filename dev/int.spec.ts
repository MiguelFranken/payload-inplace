import { restoreVersionOperation } from "payload";
import { beforeAll, afterAll, expect, it } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { getPayload, createLocalReq } from "payload";
import type { Payload } from "payload";
import { signReview } from "../src/server/review.js";
import { authorizeTarget } from "../src/server/context.js";
let database: MongoMemoryReplSet | undefined, payload: Payload;
beforeAll(async () => {
  if (process.env.VE_DATABASE !== "postgres") {
    database = await MongoMemoryReplSet.create({
      replSet: { count: 1, dbName: "visual_editor_integration" },
    });
    process.env.DATABASE_URL = database.getUri();
  } else if (!process.env.DATABASE_URL?.includes("visual_editor"))
    throw new Error("Provide an isolated visual_editor Postgres database");
  process.env.VE_SEED = "1";
  const config = (await import("./payload.config.js")).default;
  payload = await getPayload({ config });
});
afterAll(async () => {
  await payload?.destroy();
  await database?.stop();
});
it("persists drafts through native Payload while published content stays unchanged", async () => {
  const pages = await payload.find({
    collection: "pages",
    overrideAccess: true,
    limit: 1,
  });
  const original: any = pages.docs[0];
  const users = await payload.find({
    collection: "users",
    where: { role: { equals: "admin" } },
    overrideAccess: true,
  });
  const user = users.docs[0];
  const req = await createLocalReq(
    { user: { ...user, collection: "users" } },
    payload,
  );
  const layout = original.layout.map((row: any, i: number) =>
    i === 0 ? { ...row, heading: "A saved draft" } : row,
  );
  await payload.update({
    collection: "pages",
    id: original.id,
    data: {
      layout,
      _status: "draft",
      _veRevision: original._veRevision,
    } as any,
    draft: true,
    req,
    overrideAccess: false,
  });
  const draft: any = await payload.findByID({
    collection: "pages",
    id: original.id,
    draft: true,
    req,
    overrideAccess: false,
  });
  expect(draft.layout[0].heading).toBe("A saved draft");
  expect(draft.layout[1].items[0].id).toBe(original.layout[1].items[0].id);
  expect(draft.unrelated).toBe("Keep this value");
  const published: any = await payload.findByID({
    collection: "pages",
    id: original.id,
    draft: false,
    overrideAccess: false,
  });
  expect(published.layout[0].heading).toBe(original.layout[0].heading);
  await payload.update({
    collection: "pages",
    id: original.id,
    data: {
      ...draft,
      _status: "published",
      _veReviewToken: signReview(
        req,
        "pages",
        original.id,
        draft._veRevision ?? 0,
        draft,
      ),
    },
    req,
    overrideAccess: false,
  });
  const final: any = await payload.findByID({
    collection: "pages",
    id: original.id,
    draft: false,
    overrideAccess: false,
  });
  expect(final.layout[0].heading).toBe("A saved draft");
});
it("enforces actual read/update/host capability with a permitted control", async () => {
  const pages = await payload.find({
    collection: "offers",
    overrideAccess: true,
    limit: 1,
  });
  const id = pages.docs[0].id;
  const { editorOptions } = await import("./payload.config.js");
  const users = await payload.find({
    collection: "users",
    overrideAccess: true,
  });
  for (const role of ["editor", "reader"]) {
    const user = users.docs.find((u) => u.role === role)!;
    const req = await createLocalReq(
      { user: { ...user, collection: "users" } },
      payload,
    );
    const result = authorizeTarget(
      req,
      { collection: "offers", id, root: "detailPage.layout" },
      editorOptions,
    );
    if (role === "editor") expect((await result).id).toBe(id);
    else await expect(result).rejects.toThrow();
  }
  const req = await createLocalReq({}, payload);
  await expect(
    authorizeTarget(
      req,
      { collection: "offers", id, root: "detailPage.layout" },
      editorOptions,
    ),
  ).rejects.toThrow();
});

it.runIf(process.env.VE_DATABASE === "postgres")(
  "serializes native writes and rejects same-user/two-user stale writes without lost updates",
  async () => {
    const users = await payload.find({
      collection: "users",
      overrideAccess: true,
    });
    const admin = users.docs.find((u) => u.role === "admin")!,
      editor = users.docs.find((u) => u.role === "editor")!;
    const makeReq = (user: any) =>
      createLocalReq({ user: { ...user, collection: "users" } }, payload);
    const req = await makeReq(admin);
    const list = await payload.find({
      collection: "offers",
      limit: 1,
      req,
      overrideAccess: false,
      draft: true,
      depth: 0,
    });
    let doc: any = list.docs[0];
    for (const secondUser of [admin, editor]) {
      const [a, b] = await Promise.all([makeReq(admin), makeReq(secondUser)]);
      const writes = await Promise.allSettled([
        payload.update({
          collection: "offers",
          id: doc.id,
          draft: true,
          req: a,
          overrideAccess: false,
          data: {
            title: "First candidate",
            _veRevision: doc._veRevision,
          } as any,
        }),
        payload.update({
          collection: "offers",
          id: doc.id,
          draft: true,
          req: b,
          overrideAccess: false,
          data: {
            unrelated: "Second candidate",
            _veRevision: doc._veRevision,
          } as any,
        }),
      ]);
      expect(writes.filter((w) => w.status === "fulfilled")).toHaveLength(1);
      expect(writes.filter((w) => w.status === "rejected")).toHaveLength(1);
      expect(
        (writes.find((w) => w.status === "rejected") as PromiseRejectedResult)
          .reason,
      ).toMatchObject({ status: 409 });
      const next: any = await payload.findByID({
        collection: "offers",
        id: doc.id,
        draft: true,
        req,
        overrideAccess: false,
      });
      expect(next._veRevision).toBe(doc._veRevision + 1);
      doc = next;
    }
    await expect(
      payload.update({
        collection: "offers",
        id: doc.id,
        req,
        draft: true,
        overrideAccess: false,
        data: { title: "Missing revision" },
      }),
    ).rejects.toMatchObject({ status: 409 });
    const incomplete: any = await payload.update({
      collection: "offers",
      id: doc.id,
      req,
      draft: true,
      overrideAccess: false,
      data: {
        title: "",
        _status: "draft",
        _veRevision: doc._veRevision,
      } as any,
    });
    const before = incomplete._veRevision;
    await expect(
      payload.update({
        collection: "offers",
        id: doc.id,
        req,
        overrideAccess: false,
        data: {
          ...incomplete,
          _status: "published",
          _veReviewToken: signReview(req, "offers", doc.id, before, incomplete),
        } as any,
      }),
    ).rejects.toMatchObject({ status: 400 });
    const current: any = await payload.findByID({
      collection: "offers",
      id: doc.id,
      draft: true,
      req,
      overrideAccess: false,
    });
    expect(current._veRevision).toBe(before);
  },
);
it.runIf(process.env.VE_DATABASE === "postgres")(
  "guarded native restore advances revision and rejects stale restore",
  async () => {
    const users = await payload.find({
      collection: "users",
      where: { role: { equals: "admin" } },
      overrideAccess: true,
    });
    const req = await createLocalReq(
      { user: { ...users.docs[0], collection: "users" } },
      payload,
    );
    const list = await payload.find({
      collection: "pages",
      limit: 1,
      req,
      draft: true,
      overrideAccess: false,
    });
    const doc: any = list.docs[0];
    const versions = await payload.findVersions({
      collection: "pages",
      where: { parent: { equals: doc.id } },
      limit: 1,
      req,
      overrideAccess: false,
    });
    const version = versions.docs[0];
    req.headers.set("x-visual-editor-revision", String(doc._veRevision));
    const restored: any = await restoreVersionOperation({
      collection: payload.collections.pages,
      id: version.id,
      draft: true,
      req,
      overrideAccess: false,
    });
    expect(restored._veRevision).toBe(doc._veRevision + 1);
    await expect(
      restoreVersionOperation({
        collection: payload.collections.pages,
        id: version.id,
        draft: true,
        req,
        overrideAccess: false,
      }),
    ).rejects.toMatchObject({ status: 409 });
  },
);

it.runIf(process.env.VE_DATABASE === "postgres")(
  "rejects implicit publication and changed/stale reviewed payloads",
  async () => {
    const users = await payload.find({
      collection: "users",
      where: { role: { equals: "admin" } },
      overrideAccess: true,
    });
    const req = await createLocalReq(
      { user: { ...users.docs[0], collection: "users" } },
      payload,
    );
    const list = await payload.find({
      collection: "pages",
      limit: 1,
      req,
      draft: true,
      overrideAccess: false,
    });
    const doc: any = list.docs[0];
    await expect(
      payload.update({
        collection: "pages",
        id: doc.id,
        req,
        overrideAccess: false,
        data: { title: "Unreviewed", _veRevision: doc._veRevision } as any,
      }),
    ).rejects.toMatchObject({ status: 409 });
    const token = signReview(req, "pages", doc.id, doc._veRevision, doc);
    await expect(
      payload.update({
        collection: "pages",
        id: doc.id,
        req,
        overrideAccess: false,
        data: {
          ...doc,
          title: "Changed after review",
          _status: "published",
          _veReviewToken: token,
        } as any,
      }),
    ).rejects.toMatchObject({ status: 409 });
    await payload.update({
      collection: "pages",
      id: doc.id,
      req,
      draft: true,
      overrideAccess: false,
      data: { ...doc, title: "Remote draft", _status: "draft" } as any,
    });
    await expect(
      payload.update({
        collection: "pages",
        id: doc.id,
        req,
        overrideAccess: false,
        data: { ...doc, _status: "published", _veReviewToken: token } as any,
      }),
    ).rejects.toMatchObject({ status: 409 });
  },
);
