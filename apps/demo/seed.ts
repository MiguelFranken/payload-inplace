import { createLocalReq } from "payload";
import type { Payload } from "payload";
import { seedCommerce } from "./commerce/seed";
import { seedTranslation } from "./lib/translation-example";

/** Deterministic synthetic content only; no consumer services or customer records. */
export async function seed(payload: Payload) {
  for (const role of ["admin", "editor", "reader"] as const) {
    const email = `${role}@example.test`;
    const { totalDocs } = await payload.count({
      collection: "users",
      where: { email: { equals: email } },
      overrideAccess: true,
    });
    if (!totalDocs)
      await payload.create({
        collection: "users",
        overrideAccess: true,
        data: { email, password: "synthetic-demo-password", role },
      });
  }
  const header = await payload.findGlobal({
    slug: "siteHeader",
    depth: 0,
    draft: true,
    overrideAccess: true,
  });
  if (!header.updatedAt) await seedHeader(payload);
  await seedCommerce(payload);
  await seedTranslation(payload);
  for (const collection of ["pages", "offers"] as const) {
    const { totalDocs } = await payload.count({
      collection,
      where: { slug: { equals: "demo" } },
      overrideAccess: true,
    });
    if (totalDocs) continue;
    const layout = [
      {
        blockType: "hero",
        heading: "A public synthetic page",
        caption: "",
        privateNote: "Admin only",
      },
      {
        blockType: "text",
        heading: "Second section",
        items: [{ label: "Preserve nested identity" }],
      },
      { blockType: "serverData", heading: "Rendered on the server" },
    ];
    await payload.create({
      collection,
      overrideAccess: true,
      data: {
        title: `${collection} demo`,
        slug: "demo",
        unrelated: "Keep this value",
        ...(collection === "pages" ? { layout } : { detailPage: { layout } }),
        _status: "published",
      },
    });
  }
}

async function seedHeader(payload: Payload) {
  const systemReq = await createLocalReq(
    { context: { visualEditorSystemWrite: true } },
    payload,
  );
  await payload.updateGlobal({
    slug: "siteHeader" as never,
    req: systemReq,
    overrideAccess: true,
    data: {
      _status: "published",
      layout: [
        {
          blockType: "siteHeaderBlock",
          heading: "Still & Form",
          caption: "Considered everyday things",
          items: [
            { label: "Collection", note: "/shop" },
            { label: "Our story", note: "/shop#studio-story" },
          ],
        },
      ],
    } as never,
  });
}
