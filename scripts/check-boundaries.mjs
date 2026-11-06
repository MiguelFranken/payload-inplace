import fs from "node:fs";
import path from "node:path";
import {
  checkSourceBoundary,
  checkBindingsGraph,
} from "./import-boundaries.mjs";

const root = process.cwd();

let count = 0;

function check(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) check(file);
    else if (/\.(ts|tsx)$/.test(file) && !file.endsWith(".generated.ts")) {
      checkSourceBoundary(file, fs.readFileSync(file, "utf8"), root);
      count++;
    }
  }
}

for (const domain of ["core", "lexical", "payload-inplace"])
  check(path.join(root, "packages", domain, "src"));

const nodes = checkBindingsGraph(
  path.join(root, "packages/payload-inplace/src/exports/bindings.ts"),
  (file) => (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : undefined),
  root,
);

console.log(
  `Source boundaries passed: ${count} modules; ${nodes} inert binding modules`,
);
