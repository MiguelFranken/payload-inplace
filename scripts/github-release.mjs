import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

const repo = process.env.GITHUB_REPOSITORY;
const url = `https://github.com/${repo}`;
const runID = process.env.VALIDATION_RUN ?? "";
const digest = process.env.ARCHIVE_SHA256 ?? "";
if (!/^[1-9][0-9]*$/.test(runID) || !/^[a-f0-9]{64}$/.test(digest))
  throw new Error("Numeric validation run ID and archive SHA256 required");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const gh = (...args) => execFileSync("gh", args, { encoding: "utf8" }).trim();
// The release source is the validated main commit; npm bytes must match the validated archive.
const run = JSON.parse(gh("api", `repos/${repo}/actions/runs/${runID}`));
if (
  run.event !== "push" ||
  run.head_branch !== "main" ||
  run.conclusion !== "success" ||
  run.path !== ".github/workflows/validate.yml" ||
  !/^[a-f0-9]{40}$/.test(run.head_sha || "")
)
  throw new Error("Successful main validation run required");
const source = run.head_sha;
git("merge-base", "--is-ancestor", source, "HEAD");
const manifest = JSON.parse(
  git("show", `${source}:packages/payload-inplace/package.json`),
);
const version = manifest.version;
if (manifest.name !== "payload-inplace" || !/^\d+\.\d+\.\d+$/.test(version))
  throw new Error("Stable payload-inplace source package required");
const tag = `v${version}`;
if (git("tag", "--list", tag) && git("rev-parse", `${tag}^{commit}`) !== source)
  throw new Error("Tag points to another commit");

const previous = git(
  "describe",
  "--tags",
  "--abbrev=0",
  "--match",
  "v[0-9]*",
  "--exclude",
  "*-*",
  `${source}^`,
);
const groups = new Map([
  ["feat", ["🚀 Features", []]],
  ["fix", ["🐛 Bug Fixes", []]],
  ["perf", ["⚡ Performance", []]],
  ["docs", ["📚 Documentation", []]],
  ["test", ["🧪 Tests", []]],
  ["other", ["🔧 Other Changes", []]],
]);
for (const line of git(
  "log",
  "--first-parent",
  "--format=%H %s",
  `${previous}..${source}`,
).split("\n")) {
  const [sha, ...words] = line.split(" ");
  const subject = words.join(" ");
  if (/^(docs|chore)\(release\):/.test(subject)) continue;
  const match = subject.match(/^(\w+)(?:\(([^)]+)\))?!?: (.+)$/);
  const group = groups.get(match?.[1]) ?? groups.get("other");
  const summary = (match?.[3] ?? subject).replace(
    /\(#(\d+)\)$/,
    `([#$1](${url}/pull/$1))`,
  );
  group[1].push(
    `- ${match?.[2] ? `**${match[2]}:** ` : ""}${summary} ([${sha.slice(0, 7)}](${url}/commit/${sha}))`,
  );
}

async function verifyRegistry() {
  const registry = "https://registry.npmjs.org/payload-inplace";
  for (let attempt = 0; attempt < 60; attempt++) {
    const response = await fetch(registry + "/latest", {
      signal: AbortSignal.timeout(20000),
    });
    if (response.ok && (await response.json()).version === version) {
      const tar = await fetch(`${registry}/-/payload-inplace-${version}.tgz`, {
        signal: AbortSignal.timeout(30000),
      });
      if (tar.ok) {
        if (
          createHash("sha256")
            .update(Buffer.from(await tar.arrayBuffer()))
            .digest("hex") !== digest
        )
          throw new Error("Published archive mismatch");
        return;
      }
    }
    await delay(15000);
  }
  throw new Error("The verified release is not yet available on npm latest");
}
await verifyRegistry();
const date = git("show", "-s", "--format=%cs", source);
const sections = [...groups.values()]
  .filter(([, rows]) => rows.length)
  .map(([name, rows]) => `### ${name}\n\n${rows.join("\n")}`);
const notes =
  [
    `## [${tag}](${url}/compare/${previous}...${tag}) (${date})`,
    ...sections,
    `[npm package](https://www.npmjs.com/package/payload-inplace/v/${version}) · [Validation](${run.html_url})`,
  ].join("\n\n") + "\n";
const releases = gh(
  "api",
  "--paginate",
  `repos/${repo}/releases?per_page=100`,
  "--jq",
  ".[].tag_name",
).split("\n");
const existing = releases.includes(tag);
execFileSync(
  "gh",
  [
    "release",
    existing ? "edit" : "create",
    tag,
    "--repo",
    repo,
    "--title",
    tag,
    "--notes-file",
    "-",
    "--latest",
    ...(existing
      ? ["--draft=false", "--prerelease=false"]
      : ["--target", source]),
  ],
  { input: notes, stdio: ["pipe", "inherit", "inherit"] },
);
if (
  gh("api", `repos/${repo}/releases/latest`, "--jq", ".tag_name") !== tag ||
  gh("api", `repos/${repo}/commits/${tag}`, "--jq", ".sha") !== source
)
  throw new Error("Release verification failed");
