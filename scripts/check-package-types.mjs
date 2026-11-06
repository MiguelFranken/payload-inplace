import fs from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const receipt = JSON.parse(
  fs.readFileSync("test-results/package.json", "utf8"),
);

const sha256 = createHash("sha256")
  .update(fs.readFileSync(receipt.archive))
  .digest("hex");

if (sha256 !== receipt.sha256)
  throw Error("Type-check archive changed after packing");

// CSS is an asset, not a JavaScript module. Its presence/load is covered by the
// archive and native browser checks. Keep all JavaScript entrypoints checked.
execFileSync(
  "corepack",
  [
    "pnpm",
    "exec",
    "attw",
    receipt.archive,
    "--profile",
    "esm-only",
    "--exclude-entrypoints",
    "styles.css",
  ],
  { stdio: "inherit" },
);

fs.writeFileSync(
  "test-results/package-types.json",
  JSON.stringify(
    {
      sourceSHA: receipt.sourceSHA,
      sha256,
      profile: "esm-only",
      excludedAsset: "styles.css",
      allJavaScriptEntrypoints: true,
      passed: true,
    },
    null,
    2,
  ) + "\n",
);
