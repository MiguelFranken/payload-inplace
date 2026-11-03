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
      /(?:\[project\]\/dist\/|@payloadcms[+/]ui|@payloadcms[+/]richtext|lexical|visual-editor)/.test(
        source,
      )
    )
      throw Error(`Public client module leak: ${source}`);
}
assertPublicGraph(published.clientModules);
// Positive and intentional negative controls prevent empty or ineffective assertions.
if (
  !Object.keys(preview.clientModules).some((source) =>
    source.includes("[project]/dist/frontend/FrontendShell.js"),
  )
)
  throw Error("Active editor graph missing native shell");
let rejected = false;
try {
  assertPublicGraph({
    ...published.clientModules,
    "[project]/dist/preview/PreviewBridge.js": {},
  });
} catch {
  rejected = true;
}
if (!rejected) throw Error("Leak negative control failed");
const chunks = [
  ...new Set(Object.values(published.clientModules).flatMap((m) => m.chunks)),
];
let bytes = 0;
for (const chunk of chunks) {
  const content = fs.readFileSync(
    path.join(root, chunk.replace("/_next/", "")),
    "utf8",
  );
  bytes += Buffer.byteLength(content);
  if (/payload-visual-editor\/v1|data-ve-overlay|ve-workspace/.test(content))
    throw Error(`Editor implementation in public/shared chunk ${chunk}`);
}
const css = Object.values(published.entryCSSFiles).flat();
if (css.some((x) => /visual-editor|admin\/styles/.test(JSON.stringify(x))))
  throw Error("Public editor styles");
fs.mkdirSync("test-results", { recursive: true });
fs.writeFileSync(
  "test-results/production-graph.json",
  JSON.stringify(
    {
      modules: Object.keys(published.clientModules),
      chunks,
      decodedClientReferenceJSBytes: bytes,
      heavyEditorModules: 0,
      launcherClientModules: Object.keys(published.clientModules).filter(
        (source) => source.includes("[project]/dist/launcher/Launcher.js"),
      ).length,
      editorCSS: 0,
      activeControl: true,
      negativeControl: true,
    },
    null,
    2,
  ),
);
console.log(
  `Production graph passed: ${chunks.length} framework client-reference chunks, ${bytes} decoded bytes; editor graph isolated`,
);
