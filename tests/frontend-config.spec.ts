import { expect, it } from "vitest";
import {
  frontendConfig,
  withFrontendImportMap,
} from "../src/server/frontend-config.js";

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
