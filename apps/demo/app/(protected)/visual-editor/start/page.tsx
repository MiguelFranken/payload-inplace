import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPayload, createLocalReq } from "payload";
import config, { editorOptions } from "@payload-config";
import { FrontendEntry } from "payload-inplace/entry";
import { RenderPage } from "../../../../components/RenderPage";

export const metadata = { robots: { index: false, follow: false } };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    kind?: string;
    global?: string;
    collection?: string;
    id?: string;
    slug?: string;
    root?: string;
    locale?: string;
  }>;
}) {
  const params = await searchParams;
  if (params.kind === "global") {
    const slug = params.global || "",
      setting = editorOptions.globals?.[slug];
    const root = params.root || setting?.roots[0];
    if (
      !setting ||
      !root ||
      !setting.roots.includes(root) ||
      editorOptions.disabled
    )
      notFound();
    const payload = await getPayload({ config });
    const { user } = await payload.auth({ headers: await headers() });
    if (!user) notFound();
    const req = await createLocalReq(
      { user, locale: params.locale, fallbackLocale: false },
      payload,
    );
    const document = await payload.findGlobal({
      slug: slug as never,
      req,
      overrideAccess: false,
      draft: true,
      depth: 1,
      fallbackLocale: false,
    });
    return (
      <FrontendEntry
        target={{ kind: "global", global: slug, root }}
        signedIn
        contentLocale={
          req.locale === "all" ? undefined : req.locale || undefined
        }
      >
        <RenderPage document={document} root={root} />
      </FrontendEntry>
    );
  }
  const collection = params.collection || "shops";
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
