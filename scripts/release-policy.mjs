/** A publication consumes a successful main-branch validation artifact; PR artifacts cannot grant publication authority. */
export function assertReleasePolicy({
  run,
  sourceSHA,
  expectedSHA256,
  receipt,
  installed,
  workshop,
  tag,
}) {
  if (
    run.repository?.full_name !== "MiguelFranken/payload-visual-editor" ||
    run.head_repository?.full_name !== run.repository.full_name ||
    run.event !== "push" ||
    run.head_branch !== "main" ||
    run.conclusion !== "success" ||
    run.path !== ".github/workflows/validate.yml" ||
    run.head_sha !== sourceSHA
  )
    throw new Error(
      "A successful same-repository main push validation at the release SHA is required",
    );
  if (
    !/^[a-f0-9]{64}$/.test(expectedSHA256) ||
    receipt.sha256 !== expectedSHA256 ||
    receipt.sourceSHA !== sourceSHA ||
    receipt.sourceDirty
  )
    throw new Error(
      "Clean source and exact immutable archive hash are required",
    );
  if (
    installed.package?.sha256 !== expectedSHA256 ||
    installed.packageSourceSHA !== sourceSHA ||
    !Array.isArray(installed.installed?.cases) ||
    !Array.isArray(installed.disabled?.cases) ||
    installed.installed?.cases?.some((c) => c.status !== "passed") ||
    installed.installed?.cases?.length < 4 ||
    installed.disabled?.cases?.filter((c) => c.status === "passed").length < 3
  )
    throw new Error("Matching clean installed-consumer acceptance is required");
  if (
    workshop.packageSHA256 !== expectedSHA256 ||
    !/^[a-f0-9]{40}$/.test(workshop.appSHA || "") ||
    workshop.result !== "passed"
  )
    throw new Error("Matching committed Workshops acceptance is required");
  if (
    !["next", "latest"].includes(tag) ||
    (installed.package.version.includes("-") && tag !== "next")
  )
    throw new Error(
      "Prereleases publish only to next; stable releases use an explicit tag",
    );
}
