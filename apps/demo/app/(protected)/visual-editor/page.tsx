import { readDemoDocument } from "../../../lib/read-demo-document";
import { commercePath } from "../../../commerce/paths";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { handleEditorServerFunctions } from "payload-inplace/native";
import type { ServerFunctionClient } from "payload";
import config, { editorOptions } from "@payload-config";
import { FrontendEditor } from "../../../../../packages/payload-inplace/dist/exports/rsc.js";
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
  return <DocumentEditor identifier={identifier!} />;
}

/** The same document editor can be mounted inside a host website route without replacing its layout. */
export async function DocumentEditor({ identifier }: { identifier: string }) {
  const { req, context, token } = await authorizedEditor(identifier);
  const serverFunction: ServerFunctionClient = async (args) => {
    "use server";
    const { req } = await authorizedEditor(identifier, true);
    return handleEditorServerFunctions({ ...args, config, importMap }, req);
  };
  const refreshPreview = async (): Promise<
    import("../../../../../packages/payload-inplace/dist/exports/types.js").EditorPreviewResponse
  > => {
    "use server";
    try {
      const { req, context } = await authorizedEditor(identifier, true);
      const document = await readDemoDocument(req, context.target);
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
  const document = await readDemoDocument(req, context.target);
  const demoUILocale =
    process.env.VE_TEST_SCHEMA === "1"
      ? (await cookies()).get("demo-editor-ui")?.value
      : undefined;
  const options = ["en", "de", "ar"].includes(demoUILocale || "")
    ? {
        ...editorOptions,
        ui: {
          locale: demoUILocale,
          messages: {
            ar: {
              selectContent: "تحديد المحتوى",
              sections: "الأقسام",
              savedVersions: "الإصدارات المحفوظة",
              reviewChanges: "مراجعة التغييرات",
              minimizeEditor: "تصغير المحرر",
              closePanel: "إغلاق اللوحة",
            },
          },
        },
      }
    : editorOptions;
  return (
    <FrontendEditor
      theme={
        (await cookies()).get("payload-theme")?.value === "dark"
          ? "dark"
          : "light"
      }
      req={req}
      token={token}
      options={options}
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
      exitURL={
        context.target.kind === "global"
          ? "/shop"
          : commercePath(context.target.collection, String(document.slug)) ||
            `/${context.target.collection}/${document.slug}`
      }
    >
      <RenderPage document={document} root={context.target.root} active />
    </FrontendEditor>
  );
}
