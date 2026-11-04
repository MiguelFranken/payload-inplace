import fs from "node:fs";
import path from "node:path";
const root = path.resolve("packages/core/src");
function check(directory) {
  for (const name of fs.readdirSync(directory)) {
    const file = path.join(directory, name);
    if (fs.statSync(file).isDirectory()) {
      check(file);
      continue;
    }
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(
      /(?:from|import)\s*["']([^"']+)["']/g,
    )) {
      const spec = match[1];
      if (
        !spec.startsWith(".") ||
        !path.resolve(path.dirname(file), spec).startsWith(root + path.sep)
      )
        throw new Error(`Core import crosses its boundary: ${file}: ${spec}`);
    }
  }
}
check(root);
console.log("Framework-free core import boundary passed");
