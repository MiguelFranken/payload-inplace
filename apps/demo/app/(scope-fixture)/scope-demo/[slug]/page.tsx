import { headers } from "next/headers";
import { notFound, unstable_rethrow } from "next/navigation";
import { createLocalReq, getPayload, type ServerFunctionClient } from "payload";
import config, { editorOptions } from "@payload-config";
import {
  readPageEditContext,
  readPageEditorDocuments,
} from "payload-inplace/server";
import { FrontendEditor } from "payload-inplace/rsc";
import { handleEditorServerFunctions } from "payload-inplace/native";
import { EditorPageTransition } from "payload-inplace/launcher";
import { authorizedEditor } from "../../../../lib/authorized-editor";
import { importMap } from "../../../(payload)/admin/importMap.js";
import { ScopeFixtureView } from "../../../../components/ScopeFixtureView";
import { ScopeFixturePreview } from "../../../../components/ScopeFixturePreview";

/** Synthetic multi-document acceptance route. Anonymous requests never request the active client renderer or any draft. */
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!slug.startsWith("scope-")) notFound();
  const payload = await getPayload({ config }),
    requestHeaders = await headers();
  const { user } = await payload.auth({ headers: requestHeaders });
  if (!user) notFound();
  const req = await createLocalReq({ user }, payload);
  req.headers = new Headers(requestHeaders);
  const active = await readPageEditContext(
    req,
    `/scope-demo/${slug}`,
    editorOptions,
  );
  const owner = active?.context.pageOwner || active?.context.target;
  if (!active || owner?.kind === "global" || owner?.collection !== "pages")
    notFound();
  const page = await payload.findByID({
    collection: "pages",
    id: owner.id,
    draft: true,
    req,
    overrideAccess: false,
  });
  if (page.slug !== slug) notFound();
  const result = await readPageEditorDocuments(
    req,
    active.token,
    editorOptions,
  );
  const identifier = active.context.nonce;
  const serverFunction: ServerFunctionClient = async (args) => {
    "use server";
    const { req } = await authorizedEditor(identifier, true);
    return handleEditorServerFunctions({ ...args, config, importMap }, req);
  };
  const refreshPreview = async (): Promise<
    import("payload-inplace/types").EditorPreviewResponse
  > => {
    "use server";
    try {
      const { req, token } = await authorizedEditor(identifier, true);
      const result = await readPageEditorDocuments(req, token, editorOptions);
      const current = result.documents.find(
        (item) =>
          JSON.stringify(item.target) === JSON.stringify(result.context.target),
      );
      if (!current) return { error: "denied" };
      return {
        revision: current.document._veRevision ?? current.document.updatedAt,
        content: <ScopeFixtureView documents={result.documents} active />,
        preview: (
          <ScopeFixturePreview
            documents={result.documents}
            target={result.context.target}
          />
        ),
      };
    } catch (error) {
      unstable_rethrow(error);
      return { error: "denied" };
    }
  };
  return (
    <EditorPageTransition>
      <FrontendEditor
        req={req}
        token={active.token}
        options={editorOptions}
        importMap={importMap}
        serverFunction={serverFunction}
        refreshPreview={refreshPreview}
        exitURL="/shop"
        preview={
          <ScopeFixturePreview
            documents={result.documents}
            target={result.context.target}
          />
        }
      >
        <ScopeFixtureView documents={result.documents} active />
      </FrontendEditor>
    </EditorPageTransition>
  );
}
