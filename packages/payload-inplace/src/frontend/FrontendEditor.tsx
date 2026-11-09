import { availablePageScopes } from "../server/scopes";
import { nativeDocumentConfig } from "../server/document";
import {
  nativeDocumentArgs,
  targetSlug,
  targetPolicy,
} from "../state/document-target";
import { createEditorMessages } from "../i18n/messages";
import type { ImportMap, PayloadRequest, ServerFunctionClient } from "payload";
import {
  createClientConfig,
  docAccessOperation,
  docAccessOperationGlobal,
  getAccessResults,
} from "payload";
import { buildFormState } from "@payloadcms/ui/utilities/buildFormState";
import { Fragment, type ReactNode } from "react";
import type { VisualEditorOptions } from "../types";
import {
  frontendConfig,
  withFrontendImportMap,
} from "../server/frontend-config";
import { readEditContext } from "../server/context";
import { resolveRoot, resolveRootScope } from "../schema/resolve";
import { RenderServerComponent } from "@payloadcms/ui/elements/RenderServerComponent";
import { editorLabel, resolveTools } from "../server/tools";
import {
  DeferredConfiguredFieldPanel as ConfiguredFieldPanel,
  DeferredFrontendShell as FrontendShell,
} from "./DeferredEditor";
import { richTextCapabilities } from "../adapters/richtext-capabilities";
import { projectCatalogue } from "../server/catalogue";
import { frontendStyles } from "./theme.generated";

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
  refreshPreview: () => Promise<import("../types").EditorPreviewResponse>;
  exitURL: string;
  theme?: "light" | "dark";
}) {
  const { context, document, pageDocument } = await readEditContext(
    req,
    token,
    options,
  );
  req = withFrontendImportMap(req, importMap);
  const uiLanguage = createEditorMessages(options.ui, req.i18n.language).locale;
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
    label: editorLabel(extension.label, uiLanguage),
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
                title: editorLabel(extension.confirmation.title, uiLanguage),
                description: editorLabel(
                  extension.confirmation.description,
                  uiLanguage,
                ),
                confirmLabel: editorLabel(
                  extension.confirmation.confirmLabel,
                  uiLanguage,
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
      label: editorLabel(panel.label, uiLanguage),
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
  const entity = nativeDocumentConfig(req, context.target);
  const docPermissions =
    context.target.kind === "global"
      ? await docAccessOperationGlobal({
          globalConfig: entity as import("payload").SanitizedGlobalConfig,
          data: { ...document, _status: "draft" },
          req,
        })
      : await docAccessOperation({
          id: context.target.id,
          collection:
            req.payload.collections[context.target.collection as never],
          data: { ...document, _status: "draft" },
          req,
        });
  const publication =
    context.target.kind === "global"
      ? await docAccessOperationGlobal({
          globalConfig: entity as import("payload").SanitizedGlobalConfig,
          data: { ...document, _status: "published" },
          req,
        })
      : await docAccessOperation({
          id: context.target.id,
          collection:
            req.payload.collections[context.target.collection as never],
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
  const clientCollection =
    context.target.kind === "global"
      ? clientConfig.globals.find((g) => g.slug === targetSlug(context.target))!
      : clientConfig.collections.find(
          (c) => c.slug === targetSlug(context.target),
        )!;
  const field = resolveRoot(
    clientCollection.fields as any,
    context.target.root,
  );
  const { state } = await buildFormState({
    ...(nativeDocumentArgs(context.target) as any),
    data: document,
    docPermissions,
    docPreferences: { fields: {} },
    operation: "update",
    renderAllFields: true,
    req,
    schemaPath: targetSlug(context.target),
    skipValidation: true,
    user: req.user!,
  });
  // This virtual transport value is never persisted or placed in a URL; native update hooks reauthorize it.
  state._veActivation = { value: token, initialValue: token, valid: true };
  return (
    <FrontendShell
      key={JSON.stringify([context.target, context.locale, context.nonce])}
      diagnostics={Boolean(
        options.diagnostics && process.env.NODE_ENV !== "production",
      )}
      patterns={
        options.patterns && !options.disabled
          ? {
              canRead: await options.patterns.authorize({
                req,
                target: context.target,
                document,
                operation: "read",
              }),
              canSave:
                Boolean(options.patterns.save) &&
                (await options.patterns.authorize({
                  req,
                  target: context.target,
                  document,
                  operation: "save",
                })),
              allowedBlocks: options.patterns.allowedBlocks,
            }
          : undefined
      }
      ui={options.ui}
      pageScopes={await availablePageScopes(
        req,
        context,
        pageDocument,
        options,
      )}
      sharedStructure={Boolean(
        req.payload.config.localization &&
          !resolveRootScope(entity.fields, context.target.root).localized,
      )}
      context={{
        target: context.target,
        ...(context.locale ? { locale: context.locale } : {}),
        nonce: context.nonce,
        expires: context.expires,
        ...(context.pagePath ? { pagePath: context.pagePath } : {}),
      }}
      richTextCapabilities={richTextCapabilities(
        entity.fields,
        targetSlug(context.target),
        req.payload.config,
      )}
      strategyProviders={[
        ...(options.strategyProviders || []),
        ...(options.providers || []),
      ].map((provider) => (
        <Fragment key={provider.id}>
          {RenderServerComponent({
            Component: provider.Component,
            importMap,
            clientProps: {},
            serverProps: { req, payload: req.payload, user: req.user },
          })}
        </Fragment>
      ))}
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
      statusURL={`${options.editorPath ?? "/visual-editor"}/status?context=${encodeURIComponent(context.nonce)}${context.locale ? `&locale=${encodeURIComponent(context.locale)}` : ""}`}
      exitURL={exitURL}
      policy={targetPolicy(options, context.target)}
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
