import type { ImportMap, PayloadRequest, SanitizedConfig } from "payload";

/** Project native field and document components without importing the admin application shell.
 * Generate a separate import map from this config and use it for frontend server functions.
 * Collection/global fields, custom drawers, access, hooks and editor extensions retain their original contracts.
 */
export function frontendConfig(config: SanitizedConfig): SanitizedConfig {
  return {
    ...config,
    admin: {
      ...config.admin,
      components: {
        Nav: false,
        actions: [],
        afterDashboard: [],
        afterLogin: [],
        afterNav: [],
        afterNavLinks: [],
        beforeDashboard: [],
        beforeLogin: [],
        beforeNav: [],
        beforeNavLinks: [],
        graphics: { Icon: false, Logo: false },
        header: [],
        logout: { Button: false },
        providers: [],
        settingsMenu: [],
        views: {
          account: {
            ...config.admin.components.views?.account,
            Component: false,
          },
          dashboard: {
            ...config.admin.components.views?.dashboard,
            Component: false,
          },
        },
      },
      avatar: "default",
      dashboard: { ...config.admin.dashboard, widgets: [] },
      importMap: { ...config.admin.importMap, generators: [] },
      dependencies: Object.fromEntries(
        Object.entries(config.admin.dependencies || {}).filter(([key]) =>
          key.startsWith("visual-editor."),
        ),
      ),
    },
  };
}

/** Scope native component resolution to this request without mutating the shared Payload instance.
 * The inherited instance retains its database, collections and native operations; only its component map differs.
 */
export function withFrontendImportMap(
  req: PayloadRequest,
  importMap: ImportMap,
): PayloadRequest {
  return {
    ...req,
    payload: Object.create(req.payload, {
      importMap: { value: importMap, writable: true, enumerable: true },
    }),
  };
}
