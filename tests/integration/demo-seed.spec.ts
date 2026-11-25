import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { createLocalReq, getPayload, type Payload } from "payload";
import { expect, it, vi } from "vitest";
import { seed } from "../../apps/demo/seed.js";

it("resumes after accounts and midway through commerce without overwriting fixtures", async () => {
  let database: MongoMemoryReplSet | undefined;
  let payload: Payload | undefined;
  const mediaDirectory = mkdtempSync(path.join(tmpdir(), "pve-seed-test-"));
  try {
    // This scenario always owns its Mongo database, including in the Postgres lane.
    database = await MongoMemoryReplSet.create({
      replSet: { count: 1, dbName: "visual_editor_seed_recovery" },
    });
    vi.stubEnv("VE_DATABASE", "mongo");
    vi.stubEnv("VE_SEED", "0");
    vi.stubEnv("VE_MEDIA_DIR", mediaDirectory);
    vi.stubEnv("DATABASE_URL", database.getUri());
    const config = (await import("../../apps/demo/payload.config.js")).default;
    const api = (payload = await getPayload({ config }));
    const find = <
      T extends "users" | "media" | "products" | "shops" | "pages" | "offers",
    >(
      collection: T,
    ) =>
      api.find({
        collection,
        depth: 0,
        pagination: false,
        overrideAccess: true,
      });
    const updateGlobal = vi.spyOn(api, "updateGlobal");
    updateGlobal.mockRejectedValueOnce(new Error("interrupted after accounts"));
    await expect(seed(api)).rejects.toThrow("interrupted after accounts");
    updateGlobal.mockRestore();
    const accounts = (await find("users")).docs;
    expect(accounts.map((user) => user.email).sort()).toEqual([
      "admin@example.test",
      "editor@example.test",
      "reader@example.test",
    ]);
    expect((await find("media")).totalDocs).toBe(0);

    const create = api.create.bind(api);
    const interrupt = vi
      .spyOn(api, "create")
      .mockImplementation(async (args) => {
        if (args.collection === "shops")
          throw new Error("interrupted during commerce");
        return create(args);
      });
    await expect(seed(api)).rejects.toThrow("interrupted during commerce");
    interrupt.mockRestore();
    const [product] = (await api.find({ collection: "products", depth: 0 }))
      .docs;
    const existingMedia = (await api.find({ collection: "media", depth: 0 }))
      .docs;
    expect(existingMedia).toHaveLength(2);
    expect((await find("shops")).totalDocs).toBe(0);

    const req = await createLocalReq(
      { context: { visualEditorSystemWrite: true } },
      api,
    );
    await api.update({
      collection: "products",
      id: product.id,
      req,
      data: { title: "Edited product" },
    });
    await api.update({
      collection: "media",
      id: existingMedia[0].id,
      data: { alt: "Edited alt" },
    });
    await api.updateGlobal({ slug: "siteHeader", req, data: { layout: [] } });

    await seed(api);
    await seed(api);

    expect((await find("users")).docs.map((user) => user.id).sort()).toEqual(
      accounts.map((user) => user.id).sort(),
    );
    const media = (await api.find({ collection: "media", depth: 0 })).docs;
    expect(media.map((item) => item.id).sort()).toEqual(
      existingMedia.map((item) => item.id).sort(),
    );
    expect(media.find((item) => item.id === existingMedia[0].id)?.alt).toBe(
      "Edited alt",
    );
    const chair = media.find((item) => item.filename === "arc-chair.png");
    const studio = media.find((item) => item.filename === "studio.png");
    expect(chair).toBeDefined();
    expect(studio).toBeDefined();
    const products = await api.find({ collection: "products", depth: 0 });
    expect(products.docs).toEqual([
      expect.objectContaining({
        id: product.id,
        title: "Edited product",
        slug: "arc-chair",
        presentation: expect.objectContaining({
          layout: expect.arrayContaining([
            expect.objectContaining({ image: chair?.id }),
          ]),
        }),
      }),
    ]);
    const shops = await api.find({ collection: "shops", depth: 0 });
    expect(shops.docs).toEqual([
      expect.objectContaining({
        slug: "home",
        layout: expect.arrayContaining([
          expect.objectContaining({
            blockType: "collectionHero",
            image: studio?.id,
          }),
          expect.objectContaining({
            blockType: "productGrid",
            cards: [
              expect.objectContaining({
                product: product.id,
                image: chair?.id,
              }),
            ],
          }),
        ]),
      }),
    ]);
    for (const collection of ["pages", "offers"] as const)
      expect((await find(collection)).docs).toEqual([
        expect.objectContaining({ slug: "demo" }),
      ]);
    expect(
      (await api.findGlobal({ slug: "siteHeader", draft: true })).layout,
    ).toEqual([]);
  } finally {
    await payload?.destroy();
    await database?.stop();
    vi.unstubAllEnvs();
    rmSync(mediaDirectory, { recursive: true, force: true });
  }
});
