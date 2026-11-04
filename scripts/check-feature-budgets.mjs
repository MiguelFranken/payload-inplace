import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { gzipSync, brotliCompressSync } from "node:zlib";
import ts from "typescript";
const root = path.resolve("packages/payload-inplace/dist");
const base = "payload-inplace/src/";
const entries = {
  registration: `${base}launcher/DeferredLauncher.js`,
  active: `${base}frontend/FrontendShell.js`,
  catalogue: `${base}frontend/SectionCatalogue.js`,
  review: `${base}admin/DocumentReview.js`,
  versions: `${base}frontend/VersionBrowser.js`,
  media: `${base}frontend/MediaLibraryField.js`,
  richtext: `${base}frontend/InlineRichText.js`,
};
function closure(entry) {
  const files = new Map(),
    peers = new Set();
  const visit = (relative) => {
    if (files.has(relative)) return;
    const file = path.resolve(root, relative);
    if (!file.startsWith(`${root}${path.sep}`))
      throw Error("Artifact import escaped archive");
    const source = fs.readFileSync(file, "utf8");
    files.set(relative, source);
    const parsed = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    );
    for (const statement of parsed.statements) {
      const specifier =
        (ts.isImportDeclaration(statement) ||
          ts.isExportDeclaration(statement)) &&
        statement.moduleSpecifier;
      if (!specifier || !ts.isStringLiteral(specifier)) continue;
      const name = specifier.text;
      if (name.startsWith("."))
        visit(
          path.posix.normalize(
            path.posix.join(path.posix.dirname(relative), name),
          ),
        );
      else peers.add(name);
    }
  };
  visit(entry);
  return { files, peers };
}
const active = closure(entries.active);
const observations = {};
for (const [name, entry] of Object.entries(entries)) {
  if (!["registration", "active"].includes(name) && active.files.has(entry))
    throw Error(`Optional ${name} UI eagerly enters the active static closure`);
  const graph = closure(entry);
  const files = [...graph.files]
    .filter(
      ([file]) =>
        name === "active" || name === "registration" || !active.files.has(file),
    )
    .sort(([a], [b]) => a.localeCompare(b));
  const code = Buffer.from(files.map(([, source]) => source).join("\n"));
  observations[name] = {
    decoded: code.length,
    gzip: gzipSync(code, { level: 9 }).length,
    brotli: brotliCompressSync(code).length,
    modules: files.length,
    sha256: createHash("sha256").update(code).digest("hex"),
    excludedImports: [...graph.peers].sort(),
  };
}
const baselineFile = "docs/validation/performance/feature-budgets.json";
if (process.argv.includes("--record"))
  fs.writeFileSync(
    baselineFile,
    JSON.stringify(
      {
        method:
          "Static emitted own-module closure; optional closures subtract already-loaded active modules. React/Payload/Next/Lexical/Base UI and other bare imports are excluded and listed, not treated as free browser bytes. gzip level 9 and Node default Brotli; not a bundled/transfer size claim.",
        baseline: observations,
        limits: Object.fromEntries(
          Object.entries(observations).map(([name, item]) => [
            name,
            {
              decoded: Math.ceil(item.decoded * 1.2 + 1024),
              gzip: Math.ceil(item.gzip * 1.2 + 512),
            },
          ]),
        ),
      },
      null,
      2,
    ) + "\n",
  );
const limits = JSON.parse(fs.readFileSync(baselineFile, "utf8")).limits;
function assertFeatureBudgets(sizes, ceilings) {
  for (const [name, item] of Object.entries(sizes))
    for (const metric of ["decoded", "gzip"])
      if (!(item[metric] <= ceilings[name]?.[metric]))
        throw Error(`${name} ${metric} exceeds measured feature budget`);
}
assertFeatureBudgets(observations, limits);
let rejected = false;
try {
  assertFeatureBudgets(
    {
      ...observations,
      active: { ...observations.active, gzip: limits.active.gzip + 1 },
    },
    limits,
  );
} catch {
  rejected = true;
}
if (!rejected) throw Error("Feature regression negative control failed");
fs.mkdirSync("test-results", { recursive: true });
fs.writeFileSync(
  "test-results/feature-budgets.json",
  JSON.stringify({ observations, negativeControl: rejected }, null, 2) + "\n",
);
console.log(
  "Feature budgets and lazy-boundary contracts passed",
  Object.fromEntries(
    Object.entries(observations).map(([name, value]) => [
      name,
      { decoded: value.decoded, gzip: value.gzip },
    ]),
  ),
);
