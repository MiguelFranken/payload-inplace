import { defineConfig } from "tsdown";
import { readFileSync } from "node:fs";
const manifest = JSON.parse(
  readFileSync(
    new URL("./packages/payload-inplace/package.json", import.meta.url),
    "utf8",
  ),
);
const external = Object.keys({
  ...manifest.dependencies,
  ...manifest.peerDependencies,
}).map(
  (name) =>
    new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:/|$)`),
);
export default defineConfig({
  entry: {
    "core/policy": "packages/core/src/policy.ts",
    "core/geometry": "packages/core/src/geometry.ts",
    "core/annotations": "packages/core/src/annotations.ts",
    "core/identity": "packages/core/src/identity.ts",
    index: "packages/payload-inplace/src/index.ts",
    "exports/routing": "packages/payload-inplace/src/exports/routing.ts",
    "exports/next": "packages/payload-inplace/src/exports/next.ts",
    "exports/native": "packages/payload-inplace/src/exports/native.ts",
    "exports/entry": "packages/payload-inplace/src/exports/entry.ts",
    "exports/launcher": "packages/payload-inplace/src/exports/launcher.ts",
    "exports/frontend": "packages/payload-inplace/src/exports/frontend.ts",
    "exports/client": "packages/payload-inplace/src/exports/client.ts",
    "exports/preview": "packages/payload-inplace/src/exports/preview.ts",
    "exports/bindings": "packages/payload-inplace/src/exports/bindings.ts",
    "exports/rsc": "packages/payload-inplace/src/exports/rsc.ts",
    "exports/server": "packages/payload-inplace/src/exports/server.ts",
    "exports/postgres": "packages/payload-inplace/src/exports/postgres.ts",
    "exports/messages": "packages/payload-inplace/src/exports/messages.ts",
    "exports/types": "packages/payload-inplace/src/exports/types.ts",
  },
  outDir: "packages/payload-inplace/dist",
  unbundle: true,
  format: "esm",
  target: "es2022",
  platform: "neutral",
  clean: true,
  deps: {
    skipNodeModulesBundle: true,
    neverBundle: [
      ...external,
      /^node:/,
      /^@payload-visual-editor\/native-handler$/,
    ],
  },
  dts: true,
  css: { inject: true },
});
