import { expect, it } from "vitest";
import path from "node:path";
import {
  checkSourceBoundary,
  checkBindingsGraph,
  importEdges,
} from "../../../../scripts/import-boundaries.mjs";
const root = "/synthetic-repository";
it("detects static, lazy and type-only boundary violations without confusing comments with imports", () => {
  const core = path.join(root, "packages/core/src/case.ts");
  for (const source of [
    'import type { Payload } from "payload";',
    'const load=()=>import("react");',
    'type P = import("payload").Payload;',
    'export * from "../../payload-inplace/src/types.js";',
  ])
    expect(() => checkSourceBoundary(core, source, root)).toThrow("Core");
  expect(() =>
    checkSourceBoundary(
      core,
      '// import "react";\nimport type { X } from "./types.js";',
      root,
    ),
  ).not.toThrow();
  expect(
    importEdges(core, 'import {type X} from "./types.js";')[0].typeOnly,
  ).toBe(true);
  expect(() =>
    checkSourceBoundary(
      path.join(root, "packages/lexical/src/case.ts"),
      'import React from "react";',
      root,
    ),
  ).toThrow("Lexical");
});
it("fences native client runtime from server modules while allowing explicit type-only contracts", () => {
  const file = path.join(
    root,
    "packages/payload-inplace/src/frontend/case.tsx",
  );
  expect(() =>
    checkSourceBoundary(
      file,
      '/* leading comment */ "use strict";"use client";import {read} from "../server/context.js";',
      root,
    ),
  ).toThrow("server");
  expect(() =>
    checkSourceBoundary(
      file,
      '"use client";import type {Contract} from "../server/contracts.js";',
      root,
    ),
  ).not.toThrow();
});
it("finds transitive editor leakage in the public inert bindings graph", () => {
  const entry = path.join(
      root,
      "packages/payload-inplace/src/exports/bindings.ts",
    ),
    helper = path.join(root, "packages/core/src/annotations.ts"),
    client = path.join(root, "packages/payload-inplace/src/frontend/case.ts");
  const modules = new Map([
    [entry, 'export * from "../../../core/src/annotations.js";'],
    [helper, "export const attr = 1;"],
  ]);
  expect(
    checkBindingsGraph(entry, (file: string) => modules.get(file), root),
  ).toBe(2);
  modules.set(
    helper,
    'export * from "../../payload-inplace/src/frontend/case.js";',
  );
  modules.set(client, '"use client";export const editor=true;');
  expect(() =>
    checkBindingsGraph(entry, (file: string) => modules.get(file), root),
  ).toThrow("editor/server");
});
it("keeps test fixtures out of production source even through relative imports", () => {
  const file = path.join(
    root,
    "packages/payload-inplace/src/frontend/case.tsx",
  );
  for (const source of [
    'import { createEditorFixture } from "payload-inplace/testing";',
    'export * from "../testing/fixtures.js";',
  ])
    expect(() => checkSourceBoundary(file, source, root)).toThrow(
      "testing helper",
    );
  expect(() =>
    checkSourceBoundary(
      path.join(root, "packages/payload-inplace/src/exports/testing.ts"),
      'export * from "../testing/fixtures.js";',
      root,
    ),
  ).not.toThrow();
});
