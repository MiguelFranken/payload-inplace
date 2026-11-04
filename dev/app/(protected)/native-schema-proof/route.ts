import { getPayload, createLocalReq } from "payload";
import config from "@payload-config";
import { buildFormState } from "@payloadcms/ui/utilities/buildFormState";
import { unstable_rethrow } from "next/navigation";
import { withFrontendImportMap } from "../../../../dist/server/frontend-config.js";
import { importMap } from "../../(payload)/admin/importMap.js";

/** Test-only native runtime proof. Disabled outside the isolated e2e wrapper, including the interactive demo. */
export async function POST(request: Request) {
  if (process.env.VE_TEST_SCHEMA !== "1")
    return new Response(null, { status: 404 });
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (user?.role !== "admin") return new Response(null, { status: 403 });
  const req = await createLocalReq({ user }, payload);
  const document = (
    await payload.find({
      collection: "shops" as any,
      limit: 1,
      where: { slug: { equals: "home" } },
      req,
      overrideAccess: false,
    })
  ).docs[0];
  const oldConfig = {
    ...payload.config,
    collections: payload.config.collections.map((collection) =>
      collection.slug === "shops"
        ? {
            ...collection,
            fields: collection.fields.filter(
              (field) => "name" in field && field.name === "title",
            ),
          }
        : collection,
    ),
  };
  const oldReq = {
    ...req,
    payload: Object.create(payload, { config: { value: oldConfig } }),
  };
  const build = (request: typeof req) =>
    buildFormState({
      collectionSlug: "shops",
      id: document.id,
      data: structuredClone(document),
      docPermissions: undefined,
      docPreferences: { fields: {} },
      operation: "update",
      renderAllFields: true,
      mockRSCs: true,
      req: request,
      schemaPath: "shops",
      skipValidation: true,
      user,
    });
  let reproduced = false;
  try {
    await build(withFrontendImportMap(oldReq, importMap));
    (globalThis as any)._payload_doNotCacheSchemaMap = true;
    (globalThis as any)._payload_doNotCacheClientConfig = true;
    try {
      await build(req);
    } catch (error) {
      unstable_rethrow(error);
      if (
        !(error instanceof TypeError) ||
        !error.message.includes("Cannot use 'in' operator")
      )
        throw error;
      reproduced = true;
    }
    const { state } = await build(withFrontendImportMap(req, importMap));
    return Response.json({
      reproduced,
      promo: state["layout.1.promo.heading"]?.value,
      card: state["layout.1.cards.0.heading"]?.value,
    });
  } finally {
    withFrontendImportMap(req, importMap);
  }
}
