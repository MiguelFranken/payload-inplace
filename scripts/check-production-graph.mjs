import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
const root = "dev/.next-prod";
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
export function assertPublicGraph(modules) {
  for (const source of Object.keys(modules))
    if (
      !source.endsWith("/dist/launcher/DeferredLauncher.js") &&
      /(?:\[project\]\/dist\/|@payloadcms[+/]ui|@payloadcms[+/]richtext|lexical|visual-editor)/.test(
        source,
      )
    )
      throw Error(`Public client module leak: ${source}`);
}
// The route manifest registers both published and authorized RSC branches. The production
// browser observation identifies which registered chunks were actually delivered publicly.
const observation = JSON.parse(
  fs.readFileSync("test-results/public-anonymous.json", "utf8"),
);
if (!observation.production || observation.samples.length !== 3)
  throw Error("Fresh production anonymous resource observations required");
const delivered = new Set(
  observation.samples.flatMap((sample) =>
    sample.resources.map((resource) => resource.url),
  ),
);
const deliveredModules = Object.fromEntries(
  Object.entries(published.clientModules).filter(([, module]) =>
    module.chunks.some((chunk) =>
      delivered.has(chunk.startsWith("/_next/") ? chunk : `/_next/${chunk}`),
    ),
  ),
);
if (!Object.keys(deliveredModules).length)
  throw Error("Empty delivered graph cannot prove isolation");
assertPublicGraph(deliveredModules);
if (
  !Object.keys(preview.clientModules).some((source) =>
    source.includes("[project]/dist/frontend/DeferredEditor.js"),
  )
)
  throw Error("Active editor graph missing native shell");
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
const bootstrap = fs.readFileSync("dist/launcher/DeferredLauncher.js", "utf8");
if (
  Buffer.byteLength(bootstrap) > 4096 ||
  /@payloadcms|\.css|useEffect|useLayoutEffect/.test(bootstrap)
)
  throw Error(
    "The inert public registration must stay small and free of native UI/styles/effects",
  );
let bytes = 0;
for (const chunk of delivered) {
  const content = fs.readFileSync(
    path.join(root, chunk.replace("/_next/", "")),
    "utf8",
  );
  bytes += Buffer.byteLength(content);
  if (
    /payload-visual-editor\/v1|data-ve-overlay|ve-workspace|data-ve-ui|pve:inline-geometry/.test(
      content,
    )
  )
    throw Error(`Editor implementation delivered in public chunk ${chunk}`);
}
fs.writeFileSync(
  "test-results/production-graph.json",
  JSON.stringify(
    {
      registeredModules: Object.keys(published.clientModules).length,
      deliveredModules: Object.keys(deliveredModules),
      chunks: [...delivered],
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
