import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import {
  assertPublicGraph,
  assertActiveGraph,
  assertObservedResourceContent,
  observedPublicResources,
  selectDeliveredModules,
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

const buildId = "synthetic-current-build";
const runtime = "static/chunks/runtime.js";
const url = `/_next/${runtime}`;
const bytes = Buffer.from("abc");
const sha256 = createHash("sha256").update(bytes).digest("hex");

function observe() {
  return {
    role: "anonymous",
    production: true,
    buildId,
    samples: Array.from({ length: 3 }, () => ({
      resources: [{ url, bytes: bytes.byteLength, sha256 }],
    })),
  };
}

it("requires an observation for the exact current anonymous production build", () => {
  const observation = observe();
  expect(observedPublicResources(observation, buildId, [runtime]).size).toBe(1);
  expect(() =>
    observedPublicResources(observation, "synthetic-older-build", [runtime]),
  ).toThrow("from this build");
  expect(() =>
    observedPublicResources({ ...observation, role: "reader" }, buildId, [
      runtime,
    ]),
  ).toThrow("anonymous");
  expect(() =>
    observedPublicResources({ ...observation, production: false }, buildId, [
      runtime,
    ]),
  ).toThrow("production");
});

it("requires every sample to include the build's public runtime chunks", () => {
  const observation = observe();
  const other = {
    ...observation.samples[0]!.resources[0]!,
    url: "/_next/static/chunks/other.js",
  };
  observation.samples[1]!.resources = [other];
  expect(() =>
    observedPublicResources(observation, buildId, [runtime]),
  ).toThrow(`sample missing ${url}`);
  observation.samples.pop();
  expect(() =>
    observedPublicResources(observation, buildId, [runtime]),
  ).toThrow("observations from this build required");
});

it("rejects missing fingerprints, inconsistent duplicate assets, and non-static paths", () => {
  const observation = observe();
  const resource = observation.samples[1]!.resources[0]!;
  resource.sha256 = "";
  expect(() =>
    observedPublicResources(observation, buildId, [runtime]),
  ).toThrow("Invalid public resource fingerprint");
  resource.sha256 = "0".repeat(64);
  expect(() =>
    observedPublicResources(observation, buildId, [runtime]),
  ).toThrow("Inconsistent public resource");
  resource.url = "/_next/static/../wrong.js";
  expect(() =>
    observedPublicResources(observation, buildId, [runtime]),
  ).toThrow("Invalid public resource fingerprint");
});

it("rejects equal-length resources with different contents", () => {
  const resource = observe().samples[0]!.resources[0]!;
  expect(() => assertObservedResourceContent(resource, bytes)).not.toThrow();
  expect(() =>
    assertObservedResourceContent(resource, Buffer.from("abd")),
  ).toThrow(`differs from production build: ${url}`);
});

it("selects delivered modules from either manifest path format and fails if nothing matches", () => {
  const modules = {
    path: { chunks: [runtime] },
    url: { chunks: [url] },
    deferred: { chunks: ["static/chunks/deferred.js"] },
  };
  const delivered = observedPublicResources(observe(), buildId, [url]);
  expect(selectDeliveredModules(modules, delivered)).toEqual({
    path: modules.path,
    url: modules.url,
  });
  expect(() => selectDeliveredModules(modules, new Map())).toThrow(
    "Empty delivered graph",
  );
});
