import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const repo = process.env.GITHUB_REPOSITORY;
const url = `https://github.com/${repo}`;
const receipt = JSON.parse(
  readFileSync("docs/validation/workshops-release.json", "utf8"),
);
const {
  packageVersion: version,
  packageSourceSHA: source,
  packageSHA256: digest,
} = receipt;
if (
  !/^\d+\.\d+\.\d+$/.test(version) ||
  !/^[a-f0-9]{40}$/.test(source) ||
  !/^[a-f0-9]{64}$/.test(digest) ||
  receipt.packageName !== "payload-inplace" ||
  receipt.result !== "passed"
) {
  throw new Error("Invalid stable release receipt");
}
const tag = `v${version}`;
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const gh = (...args) => execFileSync("gh", args, { encoding: "utf8" }).trim();
git("merge-base", "--is-ancestor", source, "HEAD");
const manifest = JSON.parse(
  git("show", `${source}:packages/payload-inplace/package.json`),
);
if (manifest.version !== version || manifest.name !== receipt.packageName)
  throw new Error("Source package mismatch");
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
    `[npm package](https://www.npmjs.com/package/payload-inplace/v/${version}) · [Validation](${receipt.packageValidationRun}) · [Workshops acceptance](${url}/blob/${git("rev-parse", "HEAD")}/docs/validation/workshops-release.json)`,
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
