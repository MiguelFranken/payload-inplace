import type { ImportMap, PayloadRequest, ServerFunctionClient } from "payload";
import {
  createClientConfig,
  docAccessOperation,
  getAccessResults,
} from "payload";
import { buildFormState } from "@payloadcms/ui/utilities/buildFormState";
import type { ReactNode } from "react";
import type { VisualEditorOptions } from "../types.js";
import {
  frontendConfig,
  withFrontendImportMap,
} from "../server/frontend-config.js";
import { readEditContext } from "../server/context.js";
import { resolveRoot } from "../schema/resolve.js";
import { RenderServerComponent } from "@payloadcms/ui/elements/RenderServerComponent";
import { editorLabel, resolveTools } from "../server/tools.js";
import {
  DeferredConfiguredFieldPanel as ConfiguredFieldPanel,
  DeferredFrontendShell as FrontendShell,
} from "./DeferredEditor.js";
import { richTextCapabilities } from "../adapters/richtext-capabilities.js";
import { projectCatalogue } from "../server/catalogue.js";
import { frontendStyles } from "./theme.generated.js";

/** Prepare one native Payload Form for an explicitly activated frontend document.
 * The caller renders its real server-component website as children and supplies an authorization-checked native server-function action.
 * Public routes must never import this component. Native CSS and providers are confined to the active editor's shadow root.
 */
export async function FrontendEditor({
  req,
  token,
  options,
  importMap,
  serverFunction,
  children,
  preview,
  refreshPreview,
  exitURL,
  theme = "light",
}: {
  req: PayloadRequest;
  token: string;
  options: VisualEditorOptions;
  importMap: ImportMap;
  serverFunction: ServerFunctionClient;
  children: ReactNode;
  /** Client presentational renderer using useEditorPreviewData. Server-only fragments may be passed into it as slots. */
  preview?: ReactNode;
  /** Host server function reauthorizes and returns fresh presentation; never redirects on denial. See EditorPreviewResponse. */
  refreshPreview: () => Promise<import("../types.js").EditorPreviewResponse>;
  exitURL: string;
  theme?: "light" | "dark";
}) {
  const { context, document } = await readEditContext(req, token, options);
  req = withFrontendImportMap(req, importMap);
  const available = await resolveTools(options, {
    req,
    target: context.target,
    document,
  });
  const extensions = available.extensions.map((extension) => ({
    id: extension.id,
    kind: extension.kind,
    showInDock: extension.showInDock,
    requireSaved:
      extension.kind === "action" ? extension.requireSaved : undefined,
    label: editorLabel(extension.label, req.i18n.language),
    ...(extension.kind !== "action"
      ? {
          width: extension.width,
          content: RenderServerComponent({
            Component: extension.Component,
            importMap,
            clientProps: { extensionId: extension.id, target: context.target },
            serverProps: {
              req,
              payload: req.payload,
              user: req.user,
              document,
              target: context.target,
            },
          }),
        }
      : {
          confirmation: extension.confirmation
            ? {
                title: editorLabel(
                  extension.confirmation.title,
                  req.i18n.language,
                ),
                description: editorLabel(
                  extension.confirmation.description,
                  req.i18n.language,
                ),
                confirmLabel: editorLabel(
                  extension.confirmation.confirmLabel,
                  req.i18n.language,
                ),
                destructive: extension.confirmation.destructive,
              }
            : undefined,
        }),
  }));
  extensions.push(
    ...available.fieldPanels.map((panel) => ({
      id: panel.id,
      kind: "panel" as const,
      showInDock: panel.showInDock,
      requireSaved: undefined,
      label: editorLabel(panel.label, req.i18n.language),
      width: panel.width,
      content: (
        <ConfiguredFieldPanel
          fields={panel.fields}
          scope={panel.scope}
          blockTypes={panel.blockTypes}
        />
      ),
    })),
  );
  const collection =
    req.payload.collections[
      context.target.collection as keyof typeof req.payload.collections
    ];
  const docPermissions = await docAccessOperation({
    id: context.target.id,
    collection,
    data: { ...document, _status: "draft" },
    req,
  });
  const publication = await docAccessOperation({
    id: context.target.id,
    collection,
    data: { ...document, _status: "published" },
    req,
  });
  const permissions = await getAccessResults({ req });
  // Payload's getClientConfig cache is keyed only by language. A frontend projection must not
  // reuse or replace an admin request's component graph; build this explicitly authorized projection locally.
  const nativeClientConfig = createClientConfig({
    config: frontendConfig(req.payload.config),
    i18n: req.i18n,
    importMap,
    user: req.user!,
  });
  // Prevent the native ThemeProvider from writing the storefront's documentElement or theme cookies.
  const safeImportMap = {
    ...nativeClientConfig.admin.importMap,
    generators: [],
  };
  const clientConfig = {
    ...nativeClientConfig,
    admin: {
      ...nativeClientConfig.admin,
      importMap: { ...safeImportMap, generators: [] },
      theme,
    },
  };
  const clientCollection = clientConfig.collections.find(
    (c) => c.slug === context.target.collection,
  )!;
  const field = resolveRoot(
    clientCollection.fields as any,
    context.target.root,
  );
  const { state } = await buildFormState({
    id: context.target.id,
    collectionSlug: context.target.collection,
    data: document,
    docPermissions,
    docPreferences: { fields: {} },
    operation: "update",
    renderAllFields: true,
    req,
    schemaPath: context.target.collection,
    skipValidation: true,
    user: req.user!,
  });
  // This virtual transport value is never persisted or placed in a URL; native update hooks reauthorize it.
  state._veActivation = { value: token, initialValue: token, valid: true };
  return (
    <FrontendShell
      key={context.nonce}
      context={{
        target: context.target,
        nonce: context.nonce,
        expires: context.expires,
        ...(context.pagePath ? { pagePath: context.pagePath } : {}),
      }}
      richTextCapabilities={richTextCapabilities(
        collection.config.fields,
        context.target.collection,
        req.payload.config,
      )}
      catalogue={projectCatalogue(
        options.catalogue,
        field as import("payload").BlocksFieldClientProps["field"],
        context.target.root
          .split(".")
          .reduce(
            (p: unknown, key: string) =>
              p &&
              typeof p === "object" &&
              "fields" in p &&
              p.fields &&
              typeof p.fields === "object"
                ? (p.fields as Record<string, unknown>)[key]
                : undefined,
            docPermissions,
          ),
        clientConfig.blocksMap as Record<string, import("payload").ClientBlock>,
      )}
      blockControls={options.blockControls}
      tools={available.tools}
      extensions={extensions}
      preview={preview}
      refreshPreview={refreshPreview}
      initialData={document}
      initialState={state}
      field={field as any}
      fieldPermissions={context.target.root
        .split(".")
        .reduce((p: any, key) => p?.fields?.[key], docPermissions)}
      docPermissions={docPermissions}
      hasPublishPermission={Boolean(publication.update)}
      statusURL={`${options.editorPath ?? "/visual-editor"}/status?context=${encodeURIComponent(context.nonce)}`}
      exitURL={exitURL}
      policy={
        options.policies?.[context.target.collection]?.[context.target.root]
      }
      css={frontendStyles}
      theme={theme}
      rootProps={{
        config: clientConfig,
        dateFNSKey: req.i18n.dateFNSKey,
        fallbackLang: req.payload.config.i18n.fallbackLanguage,
        languageCode: req.i18n.language,
        languageOptions: [],
        locale: req.locale && req.locale !== "all" ? req.locale : undefined,
        permissions,
        serverFunction,
        theme,
        translations: req.i18n.translations,
        user: req.user!,
      }}
    >
      {children}
    </FrontendShell>
  );
}
