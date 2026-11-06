import { createLocalReq } from "payload";
import type { Payload } from "payload";
import { seedCommerce } from "./commerce/seed";

/** Deterministic synthetic content only; no consumer services or customer records. */
export async function seed(payload: Payload) {
  if (
    (await payload.count({ collection: "users", overrideAccess: true }))
      .totalDocs
  )
    return;
  for (const role of ["admin", "editor", "reader"] as const)
    await payload.create({
      collection: "users",
      overrideAccess: true,
      data: {
        email: `${role}@example.test`,
        password: "synthetic-demo-password",
        role,
      },
    });
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
  await seedCommerce(payload);
  for (const collection of ["pages", "offers"]) {
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
      collection: collection as any,
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
