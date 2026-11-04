import { cookies, headers } from "next/headers";
import { getPayload, createLocalReq } from "payload";
import config, { editorOptions } from "@payload-config";
import { notFound } from "next/navigation";
import {
  readEditContext,
  documentKey,
} from "../../../../../../packages/payload-inplace/dist/exports/server.js";
import { PreviewBridge } from "../../../../../../packages/payload-inplace/dist/exports/preview.js";
import { RenderPage } from "../../../../components/RenderPage";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ context?: string }>;
}) {
  const { context: identifier } = await searchParams;
  if (!identifier || !/^[a-zA-Z0-9_-]{32}$/.test(identifier)) notFound();
  const requestHeaders = await headers();
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: requestHeaders });
  if (!user) notFound();
  const req = await createLocalReq({ user }, payload);
  req.headers = new Headers(requestHeaders);
  const token = (await cookies()).get(`payload-ve-${identifier}`)?.value || "";
  let result;
  try {
    result = await readEditContext(req, token, editorOptions);
  } catch {
    notFound();
  }
  const { context } = result;
  const document = await payload.findByID({
    collection: context.target.collection as any,
    id: context.target.id,
    draft: true,
    depth: 1,
    req,
    overrideAccess: false,
  });
  if (context.nonce !== identifier) notFound();
  return (
    <>
      <RenderPage document={document} root={context.target.root} active />
      <PreviewBridge
        session={context.nonce}
        documentKey={documentKey(context.target)}
        revision={String(document.updatedAt)}
        origin={editorOptions.previewOrigin}
        expires={context.expires}
      />
    </>
  );
}
