import { restoreVersionOperation } from "payload";
import { beforeAll, afterAll, expect, it } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { getPayload, createLocalReq } from "payload";
import type { Payload } from "payload";
import { signReview } from "../../packages/payload-inplace/src/server/review.js";
import { authorizeTarget } from "../../packages/payload-inplace/src/server/context.js";
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

it.skipIf(process.env.VE_DATABASE !== "postgres")(
  "keeps bounded operational writes separate from private drafts and still requires revision/access",
  async () => {
    const user = (
      await payload.find({
        collection: "users",
        where: { role: { equals: "admin" } },
        overrideAccess: true,
      })
    ).docs[0];
    const req = await createLocalReq(
      { user: { ...user, collection: "users" } },
      payload,
    );
    const created: any = await payload.create({
      collection: "offers",
      req,
      overrideAccess: false,
      draft: true,
      data: {
        title: "Operational acceptance",
        slug: `operational-${Date.now()}`,
        _status: "draft",
        unrelated: "Operational initial",
        detailPage: {
          layout: [{ blockType: "hero", heading: "Public heading" }],
        },
      } as any,
    });
    const live: any = await payload.update({
      collection: "offers",
      id: created.id,
      req,
      overrideAccess: false,
      data: {
        ...created,
        _status: "published",
        _veReviewToken: signReview(
          req,
          "offers",
          created.id,
          created._veRevision,
          created,
        ),
      } as any,
    });
    const privateDraft: any = await payload.update({
      collection: "offers",
      id: live.id,
      req,
      overrideAccess: false,
      draft: true,
      data: {
        ...live,
        _status: "draft",
        detailPage: {
          layout: live.detailPage.layout.map((row: any) => ({
            ...row,
            heading: "Private heading",
          })),
        },
      } as any,
    });
    const candidate = {
      ...live,
      _veRevision: privateDraft._veRevision,
      unrelated: "Operational updated",
    };
    await expect(
      payload.update({
        collection: "offers",
        id: live.id,
        req,
        overrideAccess: false,
        data: candidate as any,
      }),
    ).rejects.toMatchObject({ status: 409 });
    req.context.reviewedDemoOperation = true;
    await expect(
      payload.update({
        collection: "offers",
        id: live.id,
        req,
        overrideAccess: false,
        data: { ...candidate, _veRevision: live._veRevision } as any,
      }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      payload.update({
        collection: "offers",
        id: live.id,
        req,
        overrideAccess: false,
        data: { ...candidate, title: "Unreviewed editorial title" } as any,
      }),
    ).rejects.toMatchObject({ status: 409 });
    const operational: any = await payload.update({
      collection: "offers",
      id: live.id,
      req,
      overrideAccess: false,
      data: candidate as any,
    });
    await payload.update({
      collection: "offers",
      id: live.id,
      req,
      overrideAccess: false,
      draft: true,
      data: {
        ...privateDraft,
        unrelated: operational.unrelated,
        _veRevision: operational._veRevision,
      } as any,
    });
    const published: any = await payload.findByID({
      collection: "offers",
      id: live.id,
      draft: false,
      overrideAccess: false,
    });
    const draft: any = await payload.findByID({
      collection: "offers",
      id: live.id,
      draft: true,
      req,
      overrideAccess: false,
    });
    expect(published.detailPage.layout[0].heading).toBe("Public heading");
    expect(draft.detailPage.layout[0].heading).toBe("Private heading");
    expect(published.unrelated).toBe("Operational updated");
    expect(draft.unrelated).toBe("Operational updated");
    expect(draft._veRevision).toBe(operational._veRevision + 1);
  },
);

it("keeps complex product drafts, nested row IDs and field permissions with guarded revisions where supported", async () => {
  const admin = (
    await payload.find({
      collection: "users",
      overrideAccess: true,
      where: { role: { equals: "admin" } },
    })
  ).docs[0];
  const editor = (
    await payload.find({
      collection: "users",
      overrideAccess: true,
      where: { role: { equals: "editor" } },
    })
  ).docs[0];
  const req = await createLocalReq(
    { user: { ...admin, collection: "users" } },
    payload,
  );
  const original = (
    await payload.find({
      collection: "products",
      overrideAccess: false,
      req,
      where: { slug: { equals: "arc-chair" } },
      depth: 0,
    })
  ).docs[0];
  const data = structuredClone(original.presentation!);
  const first = data.layout![0];
  if (first.blockType !== "productDetails")
    throw Error("Product fixture missing");
  first.heading = "A considered product draft";
  first.variants![1].details!.care![0].instruction = "A new care instruction";
  const updated = await payload.update({
    collection: "products",
    id: original.id,
    overrideAccess: false,
    req,
    draft: true,
    data: {
      presentation: data,
      _status: "draft",
      _veRevision: original._veRevision,
    },
  });
  const transactional = process.env.VE_DATABASE === "postgres";
  if (transactional)
    expect(updated._veRevision).toBe((original._veRevision ?? 0) + 1);
  expect(updated.presentation?.layout?.map((row) => row.id)).toEqual(
    original.presentation?.layout?.map((row) => row.id),
  );
  expect(updated.internalCost).toBe(310);
  const published = await payload.findByID({
    collection: "products",
    id: original.id,
    draft: false,
    overrideAccess: false,
    depth: 0,
  });
  expect(published.presentation?.layout?.[0]).toMatchObject({
    heading: "Arc lounge chair",
  });
  const editorReq = await createLocalReq(
    { user: { ...editor, collection: "users" } },
    payload,
  );
  const allowed = await payload.findByID({
    collection: "products",
    id: original.id,
    draft: true,
    overrideAccess: false,
    req: editorReq,
    depth: 0,
  });
  expect(allowed).not.toHaveProperty("internalCost");
  expect(allowed.presentation?.layout?.[0]).toMatchObject({
    heading: "A considered product draft",
  });
  if (transactional)
    await expect(
      payload.update({
        collection: "products",
        id: original.id,
        draft: true,
        overrideAccess: false,
        req,
        data: {
          presentation: original.presentation,
          _status: "draft",
          _veRevision: original._veRevision,
        },
      }),
    ).rejects.toMatchObject({ status: 409 });
});

it.skipIf(process.env.VE_DATABASE !== "postgres")(
  "native advisory leases respect another user, heartbeat, expiry and exact-stamp cleanup",
  async () => {
    const { manageAdvisoryLock } = await import(
      "../../packages/payload-inplace/src/server/advisory-lock.js"
    );
    const { createContext, signContext } = await import(
      "../../packages/payload-inplace/src/server/context.js"
    );
    const { editorOptions } = await import("./payload.config.js");
    const admins = await payload.find({
      collection: "users",
      where: { role: { equals: "admin" } },
      overrideAccess: true,
      limit: 1,
    });
    const other = await payload.create({
      collection: "users",
      data: {
        email: `lease-${Date.now()}@example.test`,
        password: "synthetic-lease-password",
        role: "admin",
      },
      overrideAccess: true,
    });
    const makeReq = (user: typeof other, sid: string) =>
      createLocalReq(
        { user: { ...user, collection: "users", _sid: sid } as any },
        payload,
      );
    const a = await makeReq(admins.docs[0]!, "synthetic-a"),
      b = await makeReq(other, "synthetic-b");
    const pages = await payload.find({
        collection: "pages",
        overrideAccess: true,
        limit: 1,
      }),
      target = { collection: "pages", id: pages.docs[0]!.id, root: "layout" };
    const proofA = signContext(createContext(a, target), payload.secret),
      proofB = signContext(createContext(b, target), payload.secret);
    const original = payload.collections.pages.config.lockDocuments;
    payload.collections.pages.config.lockDocuments = { duration: 1 };
    try {
      const first = await manageAdvisoryLock(
        a,
        proofA,
        editorOptions,
        "acquire",
      );
      expect(first.status).toBe("owned");
      expect(first.lease).toBeTruthy();
      await new Promise((resolve) => setTimeout(resolve, 10));
      const heartbeat = await manageAdvisoryLock(
        a,
        proofA,
        editorOptions,
        "acquire",
      );
      expect(heartbeat.lease?.updatedAt).not.toBe(first.lease?.updatedAt);
      const foreign = await manageAdvisoryLock(
        b,
        proofB,
        editorOptions,
        "acquire",
      );
      expect(foreign.status).toBe("other");
      expect(JSON.stringify(foreign)).not.toMatch(/email|password|user/);
      await manageAdvisoryLock(
        a,
        proofA,
        editorOptions,
        "release",
        first.lease,
      );
      expect(
        (await manageAdvisoryLock(b, proofB, editorOptions, "acquire")).status,
      ).toBe("other");
      await manageAdvisoryLock(
        a,
        proofA,
        editorOptions,
        "release",
        heartbeat.lease,
      );
      expect(
        (await manageAdvisoryLock(b, proofB, editorOptions, "acquire")).status,
      ).toBe("owned");
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const expired = await manageAdvisoryLock(
        a,
        proofA,
        editorOptions,
        "acquire",
      );
      expect(expired.status).toBe("owned");
      await manageAdvisoryLock(
        a,
        proofA,
        editorOptions,
        "release",
        expired.lease,
      );
    } finally {
      payload.collections.pages.config.lockDocuments = original;
    }
  },
);
