import { unstable_rethrow } from "next/navigation";
import { handleServerFunctions } from "@payloadcms/next/layouts";
import type { ServerFunctionClient } from "payload";
import config, { editorOptions } from "@payload-config";
import { FrontendEditor } from "../../../../dist/exports/rsc.js";
import { authorizedEditor } from "../../../lib/authorized-editor";
import { importMap } from "../../(payload)/admin/importMap.js";
import { getServerPageSlots } from "../../../components/ServerPageSlots";
import { OptimisticPage } from "../../../components/OptimisticPage";
import { RenderPage } from "../../../components/RenderPage";
export const metadata = {
  robots: { index: false, follow: false },
  title: "Edit website",
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ context?: string }>;
}) {
  const { context: identifier } = await searchParams;
  const { req, context, token } = await authorizedEditor(identifier);
  const serverFunction: ServerFunctionClient = async (args) => {
    "use server";
    await authorizedEditor(identifier, true);
    return handleServerFunctions({ ...args, config, importMap });
  };
  const refreshPreview = async (): Promise<
    import("../../../../dist/exports/types.js").EditorPreviewResponse
  > => {
    "use server";
    try {
      const { req, context } = await authorizedEditor(identifier, true);
      const document = await req.payload.findByID({
        collection: context.target.collection as any,
        id: context.target.id,
        draft: true,
        depth: 1,
        req,
        overrideAccess: false,
      });
      return {
        revision: document._veRevision ?? document.updatedAt,
        content: (
          <RenderPage document={document} root={context.target.root} active />
        ),
        preview: (
          <OptimisticPage
            initialDocument={document}
            root={context.target.root}
            serverContent={await getServerPageSlots(
              document,
              context.target.root,
            )}
          />
        ),
      };
    } catch (error) {
      unstable_rethrow(error);
      return {
        error: [401, 403, 404].includes((error as { status: number }).status)
          ? "denied"
          : "unavailable",
      };
    }
  };
  const document = await req.payload.findByID({
    collection: context.target.collection as any,
    id: context.target.id,
    draft: true,
    depth: 1,
    req,
    overrideAccess: false,
  });
  return (
    <FrontendEditor
      req={req}
      token={token}
      options={editorOptions}
      importMap={importMap}
      serverFunction={serverFunction}
      refreshPreview={refreshPreview}
      preview={
        <OptimisticPage
          initialDocument={document}
          root={context.target.root}
          serverContent={await getServerPageSlots(
            document,
            context.target.root,
          )}
        />
      }
      exitURL={`/${context.target.collection}/${document.slug}`}
    >
      <RenderPage document={document} root={context.target.root} active />
    </FrontendEditor>
  );
}
