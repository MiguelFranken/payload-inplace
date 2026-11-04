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
  synchronizeNativeSchemaCaches(req.payload.config);
  const scope = (payload: PayloadRequest["payload"]) =>
    Object.create(payload, {
      importMap: { value: importMap, writable: true, enumerable: true },
    });
  let payload = scope(req.payload);
  // Native createLocalReq reassigns req.payload during Local API access checks.
  // Preserve the map on that replacement too, including a cold instance with no admin map.
  return Object.defineProperty({ ...req }, "payload", {
    enumerable: true,
    configurable: true,
    get: () => payload,
    set: (next: PayloadRequest["payload"]) => {
      payload = scope(next);
    },
  });
}

const nativeSchemaKey = Symbol.for("payload-inplace.native-schema-config");

/** Keep Payload v3's process-wide server and client schema caches on the same sanitized config.
 * Payload's native hot reload uses these invalidation flags, but separate Next server module graphs
 * can consume only part of that reset. Invalidate the complete trio once per config identity, before
 * native form construction. Ordinary requests and autosaves retain the native caches.
 * No user permissions, document values or shared component maps are cached here.
 * @see withFrontendImportMap establishes this boundary for the initial frontend Form.
 */
export function synchronizeNativeSchemaCaches(config: SanitizedConfig): void {
  const cache = globalThis as typeof globalThis & {
    [nativeSchemaKey]?: SanitizedConfig;
    _payload_doNotCacheClientConfig?: boolean;
    _payload_doNotCacheSchemaMap?: boolean;
    _payload_doNotCacheClientSchemaMap?: boolean;
  };
  if (cache[nativeSchemaKey] === config) return;
  cache[nativeSchemaKey] = config;
  cache._payload_doNotCacheClientConfig = true;
  cache._payload_doNotCacheSchemaMap = true;
  cache._payload_doNotCacheClientSchemaMap = true;
}
