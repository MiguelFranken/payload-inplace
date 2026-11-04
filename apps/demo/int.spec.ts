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
  process.env.VE_TEST_SCHEMA = "1";
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

it("keeps localized native leaves separate while array structure stays shared and credentials remain locale-bound", async () => {
  const { createContext, signContext } = await import(
    "../../packages/payload-inplace/src/server/context.js"
  );
  const users = await payload.find({
    collection: "users",
    where: { role: { equals: "admin" } },
    overrideAccess: true,
  });
  const user = {
    ...users.docs[0],
    collection: "users" as const,
    _sid: "synthetic-localized-session",
  };
  const enReq = await createLocalReq(
    { user, locale: "en", fallbackLocale: false },
    payload,
  );
  const deReq = await createLocalReq(
    { user, locale: "de", fallbackLocale: false },
    payload,
  );
  const created: any = await payload.create({
    collection: "localizedPages" as any,
    data: {
      title: "English page",
      slug: `locale-${Date.now()}`,
      layout: [
        {
          blockType: "localeStory",
          heading: "English headline",
          caption: "English fallback",
          items: [{ label: "English row", sharedCode: "shared-1" }],
        },
      ],
      _status: "draft",
    } as any,
    draft: true,
    req: enReq,
    overrideAccess: false,
  });
  const target = {
    collection: "localizedPages",
    id: created.id,
    root: "layout",
  };
  const deProof = signContext(createContext(deReq, target), payload.secret);
  const read = (req: typeof enReq, fallbackLocale: false | "en" = false) =>
    payload.findByID({
      collection: "localizedPages" as any,
      id: created.id,
      draft: true,
      depth: 0,
      fallbackLocale,
      req,
      overrideAccess: false,
    }) as Promise<any>;
  const missing = await read(deReq);
  expect(missing.layout[0].heading == null).toBe(true);
  expect((await read(deReq, "en")).layout[0].heading).toBe("English headline");
  const german: any = await payload.update({
    collection: "localizedPages" as any,
    id: created.id,
    draft: true,
    req: deReq,
    overrideAccess: false,
    data: {
      _veRevision: missing._veRevision,
      _veActivation: deProof,
      _status: "draft",
      title: "Deutsche Seite",
      layout: [
        {
          ...missing.layout[0],
          heading: "Deutsche Überschrift",
          items: [{ ...missing.layout[0].items[0], label: "Deutsche Zeile" }],
        },
      ],
    } as any,
  });
  const english = await read(enReq);
  expect(english.layout[0].heading).toBe("English headline");
  expect(english.layout[0].items[0].label).toBe("English row");
  expect(german.layout[0].heading).toBe("Deutsche Überschrift");
  expect((await read(deReq)).layout[0].caption == null).toBe(true);
  expect((await read(deReq, "en")).layout[0].caption).toBe("English fallback");
  await payload.update({
    collection: "localizedPages" as any,
    id: created.id,
    draft: true,
    req: deReq,
    overrideAccess: false,
    data: {
      _veRevision: german._veRevision,
      _veActivation: deProof,
      _status: "draft",
      layout: [
        {
          ...german.layout[0],
          items: [
            ...german.layout[0].items,
            { label: "Neue Zeile", sharedCode: "shared-2" },
          ],
        },
      ],
    } as any,
  });
  const structure = await read(enReq);
  expect(structure.layout[0].items).toHaveLength(2);
  expect(structure.layout[0].items[0].label).toBe("English row");
  expect(structure.layout[0].items[1].sharedCode).toBe("shared-2");
  expect(structure.layout[0].items[1].label == null).toBe(true);
  expect(structure.layout[0].items[0].id).toBe(created.layout[0].items[0].id);
  await expect(
    payload.update({
      collection: "localizedPages" as any,
      id: created.id,
      draft: true,
      req: enReq,
      overrideAccess: false,
      data: {
        _veRevision: structure._veRevision,
        _veActivation: deProof,
        _status: "draft",
        title: "Wrong locale",
      } as any,
    }),
  ).rejects.toThrow("expired");
  expect((await read(enReq)).title).toBe("English page");
});

it.skipIf(process.env.VE_DATABASE !== "postgres")(
  "isolates draft globals, rejects stale/cross-document writes and restores through the native draft intent",
  async () => {
    const { createContext, signContext } = await import(
      "../../packages/payload-inplace/src/server/context.js"
    );
    const { signDocumentReview } = await import(
      "../../packages/payload-inplace/src/server/review.js"
    );
    const options = (await import("./payload.config.js")).editorOptions;
    const user = (
      await payload.find({
        collection: "users",
        where: { role: { equals: "admin" } },
        overrideAccess: true,
      })
    ).docs[0];
    const request = () =>
      createLocalReq(
        {
          user: Object.assign(
            { ...user, collection: "users" as const },
            { _sid: "global-fixture" },
          ),
          locale: "en",
          fallbackLocale: false,
        },
        payload,
      );
    const req = await request();
    const target = {
      kind: "global" as const,
      global: "siteHeader",
      root: "layout",
    };
    const original: any = await payload.findGlobal({
      slug: "siteHeader",
      req,
      overrideAccess: false,
      draft: true,
      depth: 0,
    });
    const proof = signContext(createContext(req, target), payload.secret);
    const authenticated = await authorizeTarget(req, target, options);
    expect(authenticated.layout[0].heading).toBe(original.layout[0].heading);
    const changed: any = await payload.updateGlobal({
      slug: "siteHeader",
      req,
      overrideAccess: false,
      draft: true,
      data: {
        _veActivation: proof,
        _veRevision: original._veRevision,
        _status: "draft",
        layout: [{ ...original.layout[0], heading: "Private global heading" }],
      } as any,
    });
    expect(changed._veRevision).toBe(original._veRevision + 1);
    const published: any = await payload.findGlobal({
      slug: "siteHeader",
      req,
      overrideAccess: false,
      draft: false,
      depth: 0,
    });
    expect(published.layout[0].heading).toBe(original.layout[0].heading);
    await expect(
      payload.updateGlobal({
        slug: "siteHeader",
        req: await request(),
        overrideAccess: false,
        draft: true,
        data: {
          _veRevision: original._veRevision,
          _status: "draft",
          layout: original.layout,
        } as any,
      }),
    ).rejects.toMatchObject({ status: 409 });
    const foreign = signContext(
      createContext(req, { collection: "pages", id: 1, root: "layout" }),
      payload.secret,
    );
    await expect(
      payload.updateGlobal({
        slug: "siteHeader",
        req: await request(),
        overrideAccess: false,
        draft: true,
        data: {
          _veRevision: changed._veRevision,
          _veActivation: foreign,
          _status: "draft",
          layout: original.layout,
        } as any,
      }),
    ).rejects.toMatchObject({ status: 403 });
    const versions = await payload.findGlobalVersions({
      slug: "siteHeader",
      sort: "createdAt",
      limit: 1,
      req,
      overrideAccess: false,
    });
    await expect(
      payload.restoreGlobalVersion({
        slug: "siteHeader",
        id: versions.docs[0]!.id,
        req,
        overrideAccess: false,
      }),
    ).rejects.toMatchObject({ status: 409 });
    const restored: any = await payload.updateGlobal({
      slug: "siteHeader",
      req: await request(),
      overrideAccess: false,
      draft: true,
      data: {
        _veActivation: proof,
        _veRevision: changed._veRevision,
        _veRestoreVersion: String(versions.docs[0]!.id),
        _status: "draft",
      } as any,
    });
    expect(restored._veRevision).toBe(changed._veRevision + 1);
    expect(restored._status).toBe("draft");
    expect(restored.layout[0].heading).toBe(original.layout[0].heading);
    const review = signDocumentReview(
      req,
      target,
      restored._veRevision,
      restored,
    );
    const live: any = await payload.updateGlobal({
      slug: "siteHeader",
      req: await request(),
      overrideAccess: false,
      data: {
        ...restored,
        _status: "published",
        _veReviewToken: review,
      } as any,
    });
    expect(live._veRevision).toBe(restored._veRevision + 1);
    expect(live._status).toBe("published");
    const reader = (
      await payload.find({
        collection: "users",
        where: { role: { equals: "reader" } },
        overrideAccess: true,
      })
    ).docs[0];
    const denied = await createLocalReq(
      {
        user: Object.assign(
          { ...reader, collection: "users" as const },
          { _sid: "reader-global" },
        ),
      },
      payload,
    );
    await expect(authorizeTarget(denied, target, options)).rejects.toThrow();
    expect(
      (
        await payload.findByID({
          collection: "pages",
          id: 1,
          draft: true,
          req,
          overrideAccess: false,
        })
      ).layout,
    ).toBeDefined();
  },
);

it.runIf(process.env.VE_DATABASE === "postgres")(
  "serializes global writers and leases without conflating collection identities",
  async () => {
    const { createContext, signContext } = await import(
      "../../packages/payload-inplace/src/server/context.js"
    );
    const { manageAdvisoryLock } = await import(
      "../../packages/payload-inplace/src/server/advisory-lock.js"
    );
    const options = (await import("./payload.config.js")).editorOptions;
    const users = (
      await payload.find({ collection: "users", overrideAccess: true })
    ).docs;
    const makeReq = (role: string) =>
      createLocalReq(
        {
          user: Object.assign(
            {
              ...users.find((user) => user.role === role)!,
              collection: "users" as const,
            },
            { _sid: `global-race-${role}` },
          ),
          locale: "en",
          fallbackLocale: false,
        },
        payload,
      );
    const target = {
      kind: "global" as const,
      global: "siteHeader",
      root: "layout",
    };
    const read = async () =>
      payload.findGlobal({
        slug: "siteHeader",
        req: await makeReq("admin"),
        overrideAccess: false,
        draft: true,
        depth: 0,
      }) as Promise<any>;
    for (const second of ["admin", "editor"]) {
      const base = await read();
      const writes = await Promise.allSettled(
        ["admin", second].map(async (role, index) =>
          payload.updateGlobal({
            slug: "siteHeader",
            req: await makeReq(role),
            overrideAccess: false,
            draft: true,
            data: {
              _status: "draft",
              _veRevision: base._veRevision,
              layout: [{ ...base.layout[0], heading: `Race ${index}` }],
            } as any,
          }),
        ),
      );
      expect(
        writes.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        writes.find((result) => result.status === "rejected"),
      ).toMatchObject({ reason: { status: 409 } });
      expect((await read())._veRevision).toBe(base._veRevision + 1);
    }
    const a = await makeReq("admin"),
      b = await makeReq("editor");
    const proofA = signContext(createContext(a, target), payload.secret),
      proofB = signContext(createContext(b, target), payload.secret);
    const owned = await manageAdvisoryLock(a, proofA, options, "acquire");
    expect(owned.status).toBe("owned");
    expect(
      (await manageAdvisoryLock(b, proofB, options, "acquire")).status,
    ).toBe("other");
    const row = await payload.find({
      collection: "payload-locked-documents",
      where: { globalSlug: { equals: "siteHeader" } },
      overrideAccess: true,
    });
    expect(row.docs).toHaveLength(1);
    expect(row.docs[0]!.document == null).toBe(true);
    await manageAdvisoryLock(a, proofA, options, "release", owned.lease);
    const next = await manageAdvisoryLock(b, proofB, options, "acquire");
    expect(next.status).toBe("owned");
    await manageAdvisoryLock(b, proofB, options, "release", next.lease);
  },
);

it("keeps consumer-owned pattern storage behind native record ACL without changing the source draft", async () => {
  const { patternOperation } = await import(
    "../../packages/payload-inplace/src/server/patterns.js"
  );
  const { createContext, signContext } = await import(
    "../../packages/payload-inplace/src/server/context.js"
  );
  const { patternAdapter } = await import("./lib/pattern-fixture.js");
  const editorOptions = (await import("./payload.config.js")).editorOptions;
  const options = { ...editorOptions, patterns: patternAdapter };
  const users = (
    await payload.find({ collection: "users", overrideAccess: true })
  ).docs;
  const request = (role: string) =>
    createLocalReq(
      {
        user: Object.assign(
          {
            ...users.find((user) => user.role === role)!,
            collection: "users" as const,
          },
          { _sid: `pattern-${role}` },
        ),
        locale: "en",
        fallbackLocale: false,
      },
      payload,
    );
  const req = await request("editor");
  const document: any = (
    await payload.find({
      collection: "pages",
      limit: 1,
      draft: true,
      req,
      overrideAccess: false,
      depth: 0,
    })
  ).docs[0];
  const target = { collection: "pages", id: document.id, root: "layout" };
  const proof = signContext(createContext(req, target), payload.secret);
  const section = document.layout.find((row: any) => row.blockType === "text");
  const saved: any = await patternOperation(req, options, {
    proof,
    operation: "save",
    label: "Synthetic section",
    identity: { root: "layout", blockId: section.id },
    expectedRevision: document._veRevision ?? document.updatedAt,
  });
  const list: any = await patternOperation(req, options, {
    proof,
    operation: "list",
  });
  expect(list.docs.some((row: any) => row.id === saved.id)).toBe(true);
  const copy: any = await patternOperation(req, options, {
    proof,
    operation: "read",
    id: saved.id,
  });
  expect(copy.content.heading).toBe(section.heading);
  expect(copy.content.items[0].id).not.toBe(section.items[0].id);
  const unchanged: any = await payload.findByID({
    collection: "pages",
    id: document.id,
    req,
    overrideAccess: false,
    draft: true,
  });
  expect(unchanged._veRevision ?? unchanged.updatedAt).toBe(
    document._veRevision ?? document.updatedAt,
  );
  expect(unchanged.layout).toEqual(document.layout);
  const other = await request("admin"),
    otherProof = signContext(createContext(other, target), payload.secret);
  const otherList: any = await patternOperation(other, options, {
    proof: otherProof,
    operation: "list",
  });
  expect(otherList.docs.some((row: any) => row.id === saved.id)).toBe(false);
  await expect(
    patternOperation(other, options, {
      proof: otherProof,
      operation: "read",
      id: saved.id,
    }),
  ).rejects.toThrow();
  const reader = await request("reader"),
    readerProof = signContext(createContext(reader, target), payload.secret);
  await expect(
    patternOperation(reader, options, {
      proof: readerProof,
      operation: "read",
      id: saved.id,
    }),
  ).rejects.toThrow();
});
