import { expect, it } from "vitest";
import {
  assertPublicGraph,
  assertActiveGraph,
} from "../../../../scripts/production-graph-contract.mjs";
it("rejects native/editor leaks in both the former flat layout and the actual workspace facade", () => {
  expect(() =>
    assertPublicGraph({
      "[project]/apps/demo/components/Public.js": {},
      "[project]/node_modules/next/dist/client/app-router.js": {},
      "[project]/packages/payload-inplace/dist/payload-inplace/src/launcher/DeferredLauncher.js":
        {},
    }),
  ).not.toThrow();
  for (const module of [
    "[project]/dist/frontend/DeferredEditor.js",
    "[project]/packages/payload-inplace/dist/payload-inplace/src/frontend/DeferredEditor.js",
    "[project]/packages/payload-inplace/dist/core/src/events.js",
    "[project]/node_modules/@payloadcms/ui/dist/exports/client/index.js",
    "[project]/node_modules/lexical/Lexical.js",
  ])
    expect(() => assertPublicGraph({ [module]: {} })).toThrow("leak");
});
it("requires a real active shell positive control in either package layout", () => {
  expect(() => assertActiveGraph({})).toThrow("missing");
  for (const module of [
    "[project]/dist/frontend/DeferredEditor.js",
    "[project]/packages/payload-inplace/dist/payload-inplace/src/frontend/DeferredEditor.js",
  ])
    expect(() => assertActiveGraph({ [module]: {} })).not.toThrow();
});
