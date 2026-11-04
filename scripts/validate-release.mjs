import fs from "node:fs";
import policy from "../release.config.mjs";
const pkg = JSON.parse(fs.readFileSync("packages/payload-inplace/package.json", "utf8"));
if (
  pkg.name !== policy.package ||
  pkg.publishConfig?.registry !== policy.registry ||
  pkg.publishConfig?.access !== policy.access
)
  throw Error("Explicit public npm distribution policy required");
if (!/^\d+\.\d+\.\d+$/.test(pkg.version))
  throw Error("Normal release version required; generate it with Changesets");
if (
  !fs.existsSync(".changeset/config.json") ||
  !fs.readFileSync("packages/payload-inplace/CHANGELOG.md", "utf8").includes(`## ${pkg.version}`)
)
  throw Error(
    "Changesets configuration and matching generated changelog required",
  );
for (const peer of ["payload", "@payloadcms/ui", "next", "react", "react-dom"])
  if (!pkg.peerDependencies[peer] || pkg.dependencies?.[peer])
    throw Error(`Peer-owned runtime required: ${peer}`);
console.log(
  "Release metadata valid; this command does not publish or establish runtime readiness.",
);
