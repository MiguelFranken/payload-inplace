import fs from "node:fs";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";
const native = fs.readFileSync(
  new URL(import.meta.resolve("@payloadcms/next/css")),
  "utf8",
);
const tree = postcss.parse(native);
tree.walkRules((rule) => {
  if (rule.parent?.type === "atrule" && /keyframes$/.test(rule.parent.name))
    return;
  rule.selector = selectorParser((selectors) => {
    selectors.walkPseudos((pseudo) => {
      if (pseudo.value === ":root") pseudo.value = ":host";
    });
    selectors.walkTags((tag) => {
      if (tag.value === "html")
        tag.replaceWith(selectorParser.pseudo({ value: ":host" }));
      if (tag.value === "body")
        tag.replaceWith(selectorParser.className({ value: "pve-native-root" }));
    });
  }).processSync(rule.selector);
});
const css = `${tree.toString()}\n${fs.readFileSync("src/admin/styles.css", "utf8")}`;
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
