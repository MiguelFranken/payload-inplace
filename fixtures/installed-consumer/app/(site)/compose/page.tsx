import { unstable_rethrow } from "next/navigation";
import { handleServerFunctions } from "@payloadcms/next/layouts";
import type { ServerFunctionClient } from "payload";
import config, { editorOptions } from "@payload-config";
import { FrontendEditor } from "payload-inplace/rsc";
import type { EditorPreviewResponse } from "payload-inplace/types";
import { authorizedEditor } from "../../../lib/authorized-editor";
import { importMap } from "../../(payload)/admin/importMap.js";
import { StoryView } from "../../../components/StoryView";
import { LiveStory } from "../../../components/LiveStory";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ context?: string }>;
}) {
  const { context: identifier } = await searchParams;
  const { req, token, context, document } = await authorizedEditor(identifier);
  const serverFunction: ServerFunctionClient = async (args) => {
    "use server";
    await authorizedEditor(identifier, true);
    return handleServerFunctions({ ...args, config, importMap });
  };
  const refreshPreview = async (): Promise<EditorPreviewResponse> => {
    "use server";
    try {
      const { document } = await authorizedEditor(identifier, true);
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
