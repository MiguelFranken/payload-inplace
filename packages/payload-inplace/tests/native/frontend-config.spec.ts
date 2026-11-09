import { expect, it } from "vitest";
import {
  frontendConfig,
  synchronizeNativeSchemaCaches,
  withFrontendImportMap,
} from "../../src/server/frontend-config";

it("removes shell CSS entrypoints while preserving native fields, drawers, hooks and extensions", () => {
  const field = {
    name: "title",
    type: "text",
    admin: { components: { Field: "/CustomField" } },
  };
  const collection = {
    slug: "pages",
    fields: [field],
    admin: {
      components: {
        views: { edit: { root: { Component: "/CustomDocument" } } },
      },
    },
  };
  const config: any = {
    admin: {
      components: { Nav: "/Sidebar", providers: ["/CommandMenu"] },
      avatar: { Component: "/Avatar" },
      dashboard: { widgets: [{ Component: "/Widget" }] },
      importMap: { baseDir: "/repo", generators: [() => {}] },
      dependencies: {
        "visual-editor.facts": { path: "/Facts" },
        navigation: { path: "/Nav" },
      },
    },
    collections: [collection],
    globals: [],
    hooks: { afterError: [() => {}] },
    endpoints: [],
  };
  const projected = frontendConfig(config);
  expect(projected.admin.components.providers).toEqual([]);
  expect(projected.admin.components.Nav).toBe(false);
  expect(projected.admin.avatar).toBe("default");
  expect(projected.admin.dashboard.widgets).toEqual([]);
  expect(projected.admin.importMap).toEqual({
    baseDir: "/repo",
    generators: [],
  });
  expect(projected.admin.dependencies).toEqual({
    "visual-editor.facts": { path: "/Facts" },
  });
  expect(projected.collections).toBe(config.collections);
  expect(projected.collections[0]).toBe(collection);
  expect(projected.hooks).toBe(config.hooks);
  expect(projected.endpoints).toBe(config.endpoints);
  expect(config.admin.components.providers).toEqual(["/CommandMenu"]);
});

it("keeps concurrent frontend component maps off the shared Payload instance", () => {
  const adminMap = { admin: () => null },
    a = { a: () => null },
    b = { b: () => null };
  const payload: any = {
    importMap: adminMap,
    db: {},
    find() {
      return this.db;
    },
  };
  const req: any = { payload, user: { id: 1 }, context: { authorized: true } };
  const first = withFrontendImportMap(req, a),
    second = withFrontendImportMap(req, b);
  expect(first.payload.importMap).toBe(a);
  expect(second.payload.importMap).toBe(b);
  expect(payload.importMap).toBe(adminMap);
  expect((first.payload as any).find()).toBe(payload.db);
  expect(first.user).toBe(req.user);
  expect(first.context).toBe(req.context);
});

it("preserves the request map when native Local API operations replace a cold payload instance", () => {
  const original: any = { importMap: undefined, db: {} };
  const map = { field: () => null };
  const req = withFrontendImportMap({ payload: original } as any, map);
  req.payload = original;
  expect(req.payload.importMap).toBe(map);
  expect(req.payload.db).toBe(original.db);
  expect(original.importMap).toBeUndefined();
});

it("invalidates all three native schema caches together only when native fields change, retaining caches for shell projections", () => {
  const cache = globalThis as any;
  const config = { collections: [], globals: [], blocks: [] } as any;
  synchronizeNativeSchemaCaches(config);
  expect([
    cache._payload_doNotCacheClientConfig,
    cache._payload_doNotCacheSchemaMap,
    cache._payload_doNotCacheClientSchemaMap,
  ]).toEqual([true, true, true]);
  cache._payload_doNotCacheClientConfig = false;
  cache._payload_doNotCacheSchemaMap = false;
  cache._payload_doNotCacheClientSchemaMap = false;
  synchronizeNativeSchemaCaches(config);
  expect(cache._payload_doNotCacheSchemaMap).toBe(false);
  synchronizeNativeSchemaCaches(
    frontendConfig({
      ...config,
      admin: { components: {}, dashboard: {}, importMap: {} },
    }),
  );
  expect(cache._payload_doNotCacheSchemaMap).toBe(false);
  synchronizeNativeSchemaCaches({ ...config, collections: [] });
  expect([
    cache._payload_doNotCacheClientConfig,
    cache._payload_doNotCacheSchemaMap,
    cache._payload_doNotCacheClientSchemaMap,
  ]).toEqual([true, true, true]);
});
