import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createLocalReq, getPayload } from "payload";
import config, { editorOptions } from "@payload-config";
import { EditorLauncher } from "payload-inplace/launcher";
import { StoryView } from "../../../../components/StoryView";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "stories",
    where: { slug: { equals: slug } },
    draft: false,
    overrideAccess: false,
    depth: 1,
    limit: 1,
  });
  const document = result.docs[0];
  if (!document) notFound();
  const requestHeaders = await headers();
  let launcher = null;
  if (
    (requestHeaders.get("cookie") || "")
      .split(";")
      .some((cookie) => cookie.trim().startsWith("payload-token="))
  ) {
    const { user } = await payload.auth({ headers: requestHeaders });
    if (user) {
      const req = await createLocalReq({ user }, payload);
      req.headers = new Headers(requestHeaders);
      launcher = (
        <EditorLauncher
          req={req}
          options={editorOptions}
          target={{
            collection: "stories",
            id: document.id,
            root: "article.sections",
          }}
        />
      );
    }
  }
  return (
    <>
      <StoryView document={document} />
      {launcher}
    </>
  );
}
