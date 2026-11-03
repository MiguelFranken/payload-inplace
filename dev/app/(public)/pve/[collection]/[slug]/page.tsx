import PublishedPage from "../../../[collection]/[slug]/page";
import { headers } from "next/headers";
import { createLocalReq, getPayload } from "payload";
import config, { editorOptions } from "@payload-config";
import { readPageEditContext } from "../../../../../../dist/exports/server.js";
import { DocumentEditor } from "../../../../(protected)/visual-editor/page";
/** A rewrite is only a hint. Reauthorize exact path, target and current session before returning any draft/editor output. */
export default async function Page({
  params,
}: {
  params: Promise<{ collection: string; slug: string }>;
}) {
  const { collection, slug } = await params;
  const requestHeaders = await headers(),
    payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: requestHeaders });
  if (!user)
    return <PublishedPage params={Promise.resolve({ collection, slug })} />;
  const req = await createLocalReq({ user }, payload);
  req.headers = new Headers(requestHeaders);
  const active = await readPageEditContext(
    req,
    `/${collection}/${slug}`,
    editorOptions,
  );
  if (!active || active.context.target.collection !== collection)
    return <PublishedPage params={Promise.resolve({ collection, slug })} />;
  return <DocumentEditor identifier={active.context.nonce} />;
}
