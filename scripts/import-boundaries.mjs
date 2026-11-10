import path from "node:path";
import ts from "typescript";

const normalized = (file) => file.split(path.sep).join("/");

function staysIn(file, spec, directory) {
  return (
    spec.startsWith(".") &&
    path.resolve(path.dirname(file), spec).startsWith(directory + path.sep)
  );
}

const workspaceSpecifier =
  /^(?:@internal\/|@payload-inplace\/(?:core|lexical|ui)\/)/;
const resolutionCaches = new Map();

function workspaceSource(file, spec, root) {
  if (spec.startsWith(".")) return path.resolve(path.dirname(file), spec);
  if (!workspaceSpecifier.test(spec)) return undefined;

  if (!resolutionCaches.has(root)) {
    const config = ts.readConfigFile(
      path.join(root, "tsconfig.json"),
      ts.sys.readFile,
    );
    if (config.error)
      throw Error(`Cannot read TypeScript configuration in ${root}`);
    const { options } = ts.convertCompilerOptionsFromJson(
      config.config.compilerOptions,
      root,
    );
    resolutionCaches.set(root, {
      options,
      cache: ts.createModuleResolutionCache(root, (name) => name, options),
    });
  }
  const { options, cache } = resolutionCaches.get(root);
  const result = ts.resolveModuleName(spec, file, options, ts.sys, cache);
  if (!result.resolvedModule)
    throw Error(`Unresolved workspace import: ${file}: ${spec}`);
  return result.resolvedModule.resolvedFileName;
}

/** Parse imports instead of matching source text, including type-only edges and lazy imports. */
export function importEdges(file, source) {
  const result = [];
  const tree = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  function visit(node) {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const clause = node.importClause,
        named = clause?.namedBindings;
      result.push({
        spec: node.moduleSpecifier.text,
        typeOnly: Boolean(
          clause?.isTypeOnly ||
            (clause &&
              !clause.name &&
              named &&
              ts.isNamedImports(named) &&
              named.elements.length &&
              named.elements.every((part) => part.isTypeOnly)),
        ),
      });
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      result.push({
        spec: node.moduleSpecifier.text,
        typeOnly: Boolean(
          node.isTypeOnly ||
            (node.exportClause &&
              ts.isNamedExports(node.exportClause) &&
              node.exportClause.elements.length &&
              node.exportClause.elements.every((part) => part.isTypeOnly)),
        ),
      });
    else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    )
      result.push({ spec: node.arguments[0].text, typeOnly: false });
    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    )
      result.push({ spec: node.argument.literal.text, typeOnly: true });
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return result;
}

/** Enforce dependency direction for framework-free, Lexical and native client sources. Type-only client contracts are allowed; inert bindings have a stricter transitive gate. */
export function checkSourceBoundary(file, source, root = process.cwd()) {
  const name = normalized(path.relative(root, file));
  const core = path.join(root, "packages/core/src");
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  let client = false;
  for (const statement of tree.statements) {
    if (
      !ts.isExpressionStatement(statement) ||
      !ts.isStringLiteral(statement.expression)
    )
      break;
    if (statement.expression.text === "use client") client = true;
  }
  for (const edge of importEdges(file, source)) {
    const resolved = normalized(
      name.startsWith("packages/payload-inplace/src/") ||
        name.startsWith("apps/demo/")
        ? (workspaceSource(file, edge.spec, root) ?? "")
        : "",
    );
    if (
      name.startsWith("apps/demo/") &&
      /\/packages\/payload-inplace\/(?:src|dist)\//.test(resolved)
    )
      throw Error(
        `Demo bypasses the public package exports: ${name}: ${edge.spec}`,
      );
    if (
      name.startsWith("packages/payload-inplace/src/") &&
      !name.includes("/src/testing/") &&
      !name.endsWith("/src/exports/testing.ts") &&
      (edge.spec === "payload-inplace/testing" ||
        /\/src\/testing\//.test(resolved))
    )
      throw Error(
        `Production source imports a testing helper: ${name}: ${edge.spec}`,
      );
    if (
      name.startsWith("packages/core/src/") &&
      !staysIn(file, edge.spec, core)
    )
      throw Error(`Core import crosses its boundary: ${name}: ${edge.spec}`);
    if (
      name.startsWith("packages/ui/src/") &&
      (/^(?:payload(?:-inplace)?(?:\/|$)|@payloadcms\/|next(?:\/|$)|@internal\/|@payload-inplace\/lexical(?:\/|$))/.test(
        edge.spec,
      ) ||
        (edge.spec.startsWith(".") &&
          !staysIn(file, edge.spec, path.join(root, "packages/ui/src"))))
    )
      throw Error(
        `UI source crosses into the Payload integration: ${name}: ${edge.spec}`,
      );
    if (name.startsWith("packages/lexical/src/")) {
      const allowed = [
        "@payloadcms/richtext-lexical/lexical",
        "@lexical/history",
      ];
      if (
        !staysIn(file, edge.spec, path.join(root, "packages/lexical/src")) &&
        !allowed.some(
          (prefix) =>
            edge.spec === prefix || edge.spec.startsWith(prefix + "/"),
        )
      )
        throw Error(
          `Lexical runtime crosses its boundary: ${name}: ${edge.spec}`,
        );
    }
    if (
      name.startsWith("packages/payload-inplace/src/") &&
      client &&
      !edge.typeOnly
    ) {
      if (
        /\/src\/(?:server\/|(?:plugin|exports\/(?:server|rsc|next|postgres|native))(?:\.|$))/.test(
          resolved,
        ) ||
        /^payload-inplace\/(?:server|rsc|next|postgres|native)$/.test(edge.spec)
      )
        throw Error(
          `Client editor imports a server module: ${name}: ${edge.spec}`,
        );
    }
  }
}

/** Even type declarations from the inert bindings API stay independent of native UI/server packages. */
export function checkBindingsGraph(entry, read, root = process.cwd()) {
  const visited = new Set();
  const resolve = (file, spec) => {
    const base = workspaceSource(file, spec, root);
    if (!base)
      throw Error(`Bindings graph imports a package: ${file}: ${spec}`);
    const stem = base.replace(/\.(?:m?js|tsx?)$/, "");
    for (const candidate of [stem + ".ts", stem + ".tsx", base, stem + ".mjs"])
      if (read(candidate) !== undefined) return candidate;
    throw Error(`Unresolved binding import: ${file}: ${spec}`);
  };
  function visit(file) {
    if (visited.has(file)) return;
    visited.add(file);
    const name = normalized(path.relative(root, file));
    if (
      !name.startsWith("packages/core/src/") &&
      ![
        "packages/payload-inplace/src/exports/bindings.ts",
        "packages/payload-inplace/src/preview/bindings.ts",
      ].includes(name)
    )
      throw Error(`Bindings graph crossed into editor/server: ${name}`);
    const source = read(file);
    if (source === undefined) throw Error(`Missing binding source: ${name}`);
    for (const edge of importEdges(file, source))
      visit(resolve(file, edge.spec));
  }
  visit(entry);
  return visited.size;
}
