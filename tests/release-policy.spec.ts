import { expect, it } from "vitest";
import { assertReleasePolicy } from "../scripts/release-policy.mjs";
const sha = "a".repeat(40),
  hash = "b".repeat(64);
function proof() {
  return {
    run: {
      repository: { full_name: "MiguelFranken/payload-visual-editor" },
      head_repository: { full_name: "MiguelFranken/payload-visual-editor" },
      event: "push",
      head_branch: "main",
      conclusion: "success",
      path: ".github/workflows/validate.yml",
      head_sha: sha,
    },
    sourceSHA: sha,
    expectedSHA256: hash,
    receipt: { sha256: hash, sourceSHA: sha, sourceDirty: false },
    installed: {
      package: { version: "0.1.0-alpha.3", sha256: hash },
      packageSourceSHA: sha,
      installed: {
        cases: Array.from({ length: 4 }, () => ({ status: "passed" })),
      },
      disabled: {
        cases: Array.from({ length: 3 }, () => ({ status: "passed" })),
      },
    },
    workshop: { packageSHA256: hash, appSHA: "c".repeat(40), result: "passed" },
    tag: "next",
  };
}
it("accepts matching clean main validation and both installed consumers", () =>
  expect(() => assertReleasePolicy(proof())).not.toThrow());
it.each([
  "fork",
  "pull_request",
  "wrong head",
  "dirty",
  "wrong archive",
  "consumer failure",
  "workshop mismatch",
  "prerelease latest",
])("rejects %s release evidence", (kind) => {
  const p = proof();
  if (kind === "fork") p.run.head_repository.full_name = "other/fork";
  if (kind === "pull_request") p.run.event = "pull_request";
  if (kind === "wrong head") p.run.head_sha = "d".repeat(40);
  if (kind === "dirty") p.receipt.sourceDirty = true;
  if (kind === "wrong archive") p.receipt.sha256 = "e".repeat(64);
  if (kind === "consumer failure")
    p.installed.installed.cases[0].status = "failed";
  if (kind === "workshop mismatch") p.workshop.packageSHA256 = "f".repeat(64);
  if (kind === "prerelease latest") p.tag = "latest";
  expect(() => assertReleasePolicy(p)).toThrow();
});
