import fs from "node:fs";
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (
  pkg.name !== "@miguelfranken/payload-visual-editor" ||
  pkg.publishConfig?.registry !== "https://registry.npmjs.org" ||
  pkg.publishConfig?.access !== "public"
)
  throw Error("Explicit public npm distribution policy required");
if (!/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(pkg.version))
  throw Error("Invalid version");
for (const peer of ["payload", "@payloadcms/ui", "next", "react", "react-dom"])
  if (!pkg.peerDependencies[peer] || pkg.dependencies?.[peer])
    throw Error(`Peer-owned runtime required: ${peer}`);
console.log(
  "Release metadata valid; this command does not publish or establish runtime readiness.",
);
