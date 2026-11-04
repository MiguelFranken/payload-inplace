import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
const base = "packages/payload-inplace";
const manifest = JSON.parse(fs.readFileSync(`${base}/package.json`, "utf8"));
const entries = Object.entries(manifest.exports)
  .filter(([, value]) => typeof value === "object" && value.types)
  .map(([subpath]) => ({
    subpath,
    source: `${base}/src/${subpath === "." ? "index" : `exports/${subpath.slice(2)}`}.ts`,
  }));
const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(
  config.config,
  ts.sys,
  process.cwd(),
);
const program = ts.createProgram(
    entries.map((entry) => entry.source),
    parsed.options,
  ),
  checker = program.getTypeChecker();
const escape = (value) =>
  value.replaceAll("|", "\\|").replaceAll(/\s+/g, " ").trim();
let output =
  "# Public API reference\n\nGenerated from the documented facade exports. Run `corepack pnpm docs:generate`; CI checks freshness with `docs:check`. Types and linked declarations are authoritative for arguments. Start with the [integration guide](integration.md), [binding recipe](implementation/bindings-and-insertion.md), [extension/testing recipes](testing-and-extensions.md) and [native ownership ADR](adr/0007-workspace-and-native-boundaries.md).\n\nRuntime entrypoints have different ownership: bindings are inert; server/RSC/native stay server-only; frontend/client require an authorized native Form; testing is optional test-only code. An annotation or test fixture never grants access.\n";
for (const entry of entries) {
  const source = program.getSourceFile(entry.source),
    module = source && checker.getSymbolAtLocation(source);
  if (!module) throw Error(`Cannot inspect public entry ${entry.source}`);
  output += `\n## \`payload-inplace${entry.subpath === "." ? "" : entry.subpath.slice(1)}\`\n\n| Export | Kind | Contract |\n| --- | --- | --- |\n`;
  for (const symbol of checker
    .getExportsOfModule(module)
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const target =
      symbol.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(symbol)
        : symbol;
    const declaration = target.declarations?.[0];
    if (!declaration) throw Error(`Missing declaration for ${symbol.name}`);
    const file = declaration.getSourceFile(),
      line =
        file.getLineAndCharacterOfPosition(declaration.getStart()).line + 1;
    const sourcePath = path
      .relative("docs", file.fileName)
      .split(path.sep)
      .join("/");
    const description = ts.displayPartsToString(
      target.getDocumentationComment(checker),
    );
    const kind =
      target.flags & ts.SymbolFlags.Function
        ? "function"
        : target.flags & ts.SymbolFlags.Interface
          ? "interface"
          : target.flags & ts.SymbolFlags.TypeAlias
            ? "type"
            : "value";
    output += `| [\`${symbol.name}\`](${sourcePath}#L${line}) | ${kind} | ${escape(description || "See the linked declaration for the exact typed contract.")} |\n`;
  }
}
const filename = "docs/api-reference.md";
if (process.argv.includes("--check")) {
  if (!fs.existsSync(filename) || fs.readFileSync(filename, "utf8") !== output)
    throw Error("Public API reference is stale: run pnpm docs:generate");
  console.log(
    `Public API reference matches ${entries.length} facade entrypoints`,
  );
} else fs.writeFileSync(filename, output);
