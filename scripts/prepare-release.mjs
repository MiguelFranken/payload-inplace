import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { assertReleasePolicy } from "./release-policy.mjs";
const [runID, expectedSHA256, tag = "next"] = process.argv.slice(2);
if (!/^[1-9][0-9]*$/.test(runID || ""))
  throw new Error("Numeric validation run ID required");
const repository = "MiguelFranken/payload-visual-editor";
const api = (endpoint) =>
  JSON.parse(execFileSync("gh", ["api", endpoint], { encoding: "utf8" }));
const run = api(`repos/${repository}/actions/runs/${runID}`);
const headSHA = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
// Gate provenance before downloading anything, and use argument arrays for all external values.
if (
  run.event !== "push" ||
  run.head_branch !== "main" ||
  !/^([a-f0-9]{40})$/.test(run.head_sha || "") ||
  run.conclusion !== "success"
)
  throw new Error("Successful main validation at HEAD required");
const sourceSHA = run.head_sha;
execFileSync("git", ["merge-base", "--is-ancestor", sourceSHA, headSHA]);
const changed = execFileSync(
  "git",
  ["diff", "--name-only", sourceSHA, headSHA],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean);
if (changed.some((file) => !file.startsWith("docs/validation/")))
  throw new Error(
    "Code changed since candidate validation; validate a new candidate",
  );
const directory = fs.mkdtempSync(path.resolve("release-input-"));
try {
  execFileSync(
    "gh",
    [
      "run",
      "download",
      runID,
      "--repo",
      repository,
      "--name",
      "validation",
      "--dir",
      directory,
    ],
    { stdio: "inherit" },
  );
  const read = (relative) =>
    JSON.parse(fs.readFileSync(path.join(directory, relative), "utf8"));
  const receipt = read("test-results/package.json");
  const installed = read("test-results/installed-consumer.json");
  const workshop = JSON.parse(
    fs.readFileSync("docs/validation/workshops-release.json", "utf8"),
  );
  assertReleasePolicy({
    run,
    sourceSHA,
    expectedSHA256,
    receipt,
    installed,
    workshop,
    tag,
  });
  const archiveName = path.basename(receipt.archive);
  if (
    archiveName !== receipt.archive ||
    !/^[a-z0-9._-]+\.tgz$/.test(archiveName)
  )
    throw new Error("Invalid archive name");
  const archive = path.join(directory, archiveName);
  if (
    createHash("sha256").update(fs.readFileSync(archive)).digest("hex") !==
    expectedSHA256
  )
    throw new Error("Archive integrity failure");
  const pkg = JSON.parse(
    execFileSync("tar", ["-xOf", archive, "package/package.json"], {
      encoding: "utf8",
    }),
  );
  if (
    pkg.name !== "@miguel.franken/payload-visual-editor" ||
    pkg.version !== installed.package.version ||
    pkg.publishConfig?.access !== "public" ||
    pkg.publishConfig?.registry !== "https://registry.npmjs.org"
  )
    throw new Error("Public npm artifact identity mismatch");
  fs.mkdirSync("release-output", { recursive: true });
  fs.copyFileSync(archive, "release-output/candidate.tgz");
  fs.writeFileSync(
    "release-output/plan.json",
    JSON.stringify(
      {
        version: pkg.version,
        sourceSHA,
        sha256: expectedSHA256,
        validationRun: runID,
        tag,
        workshop,
      },
      null,
      2,
    ),
  );
  console.log(
    `Prepared ${pkg.name}@${pkg.version} (${expectedSHA256}); no publication performed`,
  );
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
