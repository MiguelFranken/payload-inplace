import { headers } from "next/headers";
import { createLocalReq, getPayload } from "payload";
import config, { editorOptions } from "@payload-config";
import { readPageEditContext } from "../../dist/exports/server.js";
import PublishedPage from "../app/(public)/[collection]/[slug]/page";
import { DocumentEditor } from "../app/(protected)/visual-editor/page";

/** A rewrite is only a routing hint. Authenticate and validate the exact signed website path before reading a draft or returning editor output. */
export async function renderPageEntry(collection: string, slug: string, pathname: string) {
  const fallback = () => <PublishedPage params={Promise.resolve({ collection, slug })} />;
  const requestHeaders = await headers();
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: requestHeaders });
  if (!user) return fallback();
  const req = await createLocalReq({ user }, payload);
  req.headers = new Headers(requestHeaders);
  const active = await readPageEditContext(req, pathname, editorOptions);
  if (!active || active.context.target.collection !== collection) return fallback();
  return <DocumentEditor identifier={active.context.nonce} />;
}
