import { headers } from "next/headers";
import { EditorLauncher } from "../../../../../dist/exports/launcher.js";
import { createLocalReq } from "payload";
import { getPayload } from "payload";
import config, { editorOptions } from "@payload-config";
import { notFound } from "next/navigation";
import { RenderPage } from "../../../../components/RenderPage";
export default async function Page({
  params,
}: {
  params: Promise<{ collection: string; slug: string }>;
}) {
  const { collection, slug } = await params;
  if (!["pages", "offers"].includes(collection)) notFound();
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: collection as any,
    where: { slug: { equals: slug } },
    draft: false,
    overrideAccess: false,
    depth: 1,
    limit: 1,
  });
  if (!result.docs[0]) notFound();
  // No auth endpoint, bootstrap or editor code runs for a visitor without a CMS auth cookie.
  const requestHeaders = await headers();
  const hasAuthCookie = (requestHeaders.get("cookie") || "")
    .split(";")
    .some((cookie) =>
      cookie
        .trim()
        .startsWith(`${payload.config.cookiePrefix || "payload"}-token=`),
    );
  let launcher = null;
  if (hasAuthCookie) {
    const { user } = await payload.auth({ headers: requestHeaders });
    if (user) {
      const req = await createLocalReq({ user }, payload);
      req.headers = new Headers(requestHeaders);
      launcher = (
        <EditorLauncher
          req={req}
          target={{
            collection,
            id: result.docs[0].id,
            root: collection === "pages" ? "layout" : "detailPage.layout",
          }}
          options={editorOptions}
        />
      );
    }
  }
  const content = (
    <>
      <RenderPage
        document={result.docs[0]}
        root={collection === "pages" ? "layout" : "detailPage.layout"}
      />
      {launcher}
    </>
  );
  return content;
}
