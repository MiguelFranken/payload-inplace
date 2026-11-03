import fs from "node:fs";
import postcss from "postcss";
import { nativeShadowSelector } from "./native-shadow-selectors.mjs";
const native = fs.readFileSync(
  new URL(import.meta.resolve("@payloadcms/next/css")),
  "utf8",
);
const tree = postcss.parse(native);
tree.walkRules((rule) => {
  if (rule.parent?.type === "atrule" && /keyframes$/.test(rule.parent.name))
    return;
  rule.selector = nativeShadowSelector(rule.selector);
});
// Lexical's separately bundled feature styles must cross the same shadow boundary.
// Remove exact rules already present in core UI, preserving upstream cascade and conditional groups.
const lexical = postcss.parse(
  fs.readFileSync(
    new URL(
      "./bundled.css",
      import.meta.resolve("@payloadcms/richtext-lexical/client"),
    ),
    "utf8",
  ),
);
const seen = new Set();
function ruleKey(rule) {
  const parents = [];
  for (
    let parent = rule.parent;
    parent && parent.type !== "root";
    parent = parent.parent
  )
    if (parent.type === "atrule")
      parents.unshift(`@${parent.name} ${parent.params}`);
  return `${parents.join("/")}:${rule.toString()}`;
}
tree.walkRules((rule) => seen.add(ruleKey(rule)));
lexical.walkRules((rule) => {
  if (!(rule.parent?.type === "atrule" && /keyframes$/.test(rule.parent.name)))
    rule.selector = nativeShadowSelector(rule.selector);
  const key = ruleKey(rule);
  if (seen.has(key)) rule.remove();
  else seen.add(key);
});
const css = `${tree.toString()}\n${lexical.toString()}\n${fs.readFileSync("src/admin/styles.css", "utf8")}`;
fs.mkdirSync("src/frontend", { recursive: true });
fs.writeFileSync(
  "src/frontend/theme.generated.ts",
  `// Generated from the exact Payload peer and Tailwind inputs. Do not edit.\nexport const frontendStyles: string = ${JSON.stringify(css)};\n`,
);
console.log(
  `Shadow editor styles: ${Buffer.byteLength(css)} bytes (active route only)`,
);

fs.writeFileSync(
  "src/launcher/styles.generated.ts",
  `// Generated Tailwind utilities.\nexport const launcherStyles: string = ${JSON.stringify(fs.readFileSync("src/launcher/styles.css", "utf8"))};\n`,
);

fs.writeFileSync(
  "src/frontend/inline-styles.generated.ts",
  `// Generated Tailwind utilities for the active, browser-owned inline field.\nexport const inlineStyles: string = ${JSON.stringify(fs.readFileSync("src/frontend/inline.styles.css", "utf8"))};\n`,
);
