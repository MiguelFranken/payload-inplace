import { unstable_rethrow } from "next/navigation";
import { handleEditorServerFunctions } from "payload-inplace/native";
import type { ServerFunctionClient } from "payload";
import config, { editorOptions } from "@payload-config";
import { FrontendEditor } from "payload-inplace/rsc";
import type { EditorPreviewResponse } from "payload-inplace/types";
import { authorizedEditor } from "../../../lib/authorized-editor";
import { importMap } from "../../(payload)/admin/importMap.js";
import { StoryView } from "../../../components/StoryView";
import { LiveStory } from "../../../components/LiveStory";

/** Renderers own their populated relationships; the plugin's native document
 * protocol intentionally retains raw IDs. Every read keeps the authorized user
 * and native access rather than silently bypassing permissions for a preview.
 */
async function previewDocument(identifier: string | undefined) {
  const result = await authorizedEditor(identifier);
  const document = await result.req.payload.findByID({
    collection: "stories",
    id: result.document.id,
    req: result.req,
    overrideAccess: false,
    draft: true,
    depth: 1,
  });
  return { ...result, document };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ context?: string }>;
}) {
  const { context: identifier } = await searchParams;
  const { req, token, context, document } = await previewDocument(identifier);
  const serverFunction: ServerFunctionClient = async (args) => {
    "use server";
    const { req } = await authorizedEditor(identifier, true);
    return handleEditorServerFunctions({ ...args, config, importMap }, req);
  };
  const refreshPreview = async (): Promise<EditorPreviewResponse> => {
    "use server";
    try {
      const { document } = await previewDocument(identifier);
      return {
        revision: document._veRevision ?? document.updatedAt,
        content: <StoryView document={document} active />,
        preview: <LiveStory document={document} />,
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
  return (
    <FrontendEditor
      req={req}
      token={token}
      options={editorOptions}
      importMap={importMap}
      serverFunction={serverFunction}
      refreshPreview={refreshPreview}
      preview={<LiveStory document={document} />}
      exitURL={`/stories/${document.slug}`}
    >
      <StoryView document={document} active />
    </FrontendEditor>
  );
}
