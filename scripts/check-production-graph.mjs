import {
  assertPublicGraph,
  assertActiveGraph,
  assertObservedResourceContent,
  observedPublicResources,
  selectDeliveredModules,
} from "./production-graph-contract.mjs";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.join(
  "apps/demo",
  process.env.VE_NEXT_DIST_DIR || ".next-prod",
);

function manifest(route) {
  const context = {};
  vm.runInNewContext(
    fs.readFileSync(
      `${root}/server/app/${route}/page_client-reference-manifest.js`,
      "utf8",
    ),
    context,
  );
  return Object.values(context.__RSC_MANIFEST)[0];
}

const published = manifest("(public)/[collection]/[slug]"),
  preview = manifest("(protected)/visual-editor");

// The route manifest registers both published and authorized RSC branches. The production
// browser observation identifies which registered chunks were actually delivered publicly.
const observation = JSON.parse(
  fs.readFileSync("test-results/public-anonymous.json", "utf8"),
);

const buildId = fs.readFileSync(path.join(root, "BUILD_ID"), "utf8").trim();
const { rootMainFiles } = JSON.parse(
  fs.readFileSync(path.join(root, "build-manifest.json"), "utf8"),
);
const delivered = observedPublicResources(observation, buildId, rootMainFiles);
const deliveredModules = selectDeliveredModules(
  published.clientModules,
  delivered,
);

assertPublicGraph(deliveredModules);

assertActiveGraph(preview.clientModules);

let rejected = false;

try {
  assertPublicGraph({
    ...deliveredModules,
    "[project]/dist/preview/PreviewBridge.js": {},
  });
} catch {
  rejected = true;
}
if (!rejected) throw Error("Leak negative control failed");

const bootstrap = fs.readFileSync(
  "packages/payload-inplace/dist/payload-inplace/src/launcher/DeferredLauncher.js",
  "utf8",
);

if (
  Buffer.byteLength(bootstrap) > 4096 ||
  /@payloadcms|\.css|useEffect|useLayoutEffect/.test(bootstrap)
)
  throw Error(
    "The inert public registration must stay small and free of native UI/styles/effects",
  );

let bytes = 0;

for (const [chunk, resource] of delivered) {
  const content = fs.readFileSync(
    path.join(root, chunk.slice("/_next/".length)),
  );
  assertObservedResourceContent(resource, content);
  bytes += content.byteLength;
  if (
    /payload-visual-editor\/v1|data-ve-overlay|ve-workspace|data-ve-ui|pve:inline-geometry/.test(
      content.toString("utf8"),
    )
  )
    throw Error(`Editor implementation delivered in public chunk ${chunk}`);
}

fs.writeFileSync(
  "test-results/production-graph.json",
  JSON.stringify(
    {
      buildId,
      registeredModules: Object.keys(published.clientModules).length,
      deliveredModules: Object.keys(deliveredModules),
      chunks: [...delivered.keys()],
      decodedDeliveredBytes: bytes,
      heavyEditorModules: 0,
      deferredRegistrationBytes: Buffer.byteLength(bootstrap),
      activeControl: true,
      negativeControl: true,
    },
    null,
    2,
  ),
);

console.log(
  `Production delivered graph passed: ${delivered.size} JS/CSS resources, ${bytes} decoded bytes; native editor remains unloaded`,
);
