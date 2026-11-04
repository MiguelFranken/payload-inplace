import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPayload, createLocalReq } from "payload";
import config, { editorOptions } from "@payload-config";
import { FrontendEntry } from "../../../../../../packages/payload-inplace/dist/exports/entry.js";
import { RenderPage } from "../../../../components/RenderPage";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    collection?: string;
    id?: string;
    slug?: string;
    root?: string;
    locale?: string;
  }>;
}) {
  const params = await searchParams,
    collection = params.collection || "shops";
  const setting =
    editorOptions.collections[
      collection as keyof typeof editorOptions.collections
    ];
  const root = params.root || setting?.roots[0];
  if (!setting || !setting.roots.includes(root) || editorOptions.disabled)
    notFound();
  const payload = await getPayload({ config }),
    { user } = await payload.auth({ headers: await headers() });
  const req = await createLocalReq(
    { user: user || undefined, locale: params.locale, fallbackLocale: false },
    payload,
  );
  const result = await payload.find({
    collection: collection as any,
    where: params.id
      ? { id: { equals: params.id } }
      : {
          slug: {
            equals: params.slug || (collection === "shops" ? "home" : "demo"),
          },
        },
    draft: Boolean(user),
    depth: 1,
    limit: 1,
    req,
    overrideAccess: false,
  });
  const doc = result.docs[0];
  if (!doc) notFound();
  return (
    <FrontendEntry
      target={{ collection, id: doc.id, root }}
      contentLocale={req.locale === "all" ? undefined : req.locale || undefined}
      signedIn={Boolean(user)}
    >
      <RenderPage document={doc} root={root} />
    </FrontendEntry>
  );
}
