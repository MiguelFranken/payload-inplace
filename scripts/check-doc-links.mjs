import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

// Check the repository's reader-facing docs, including historical evidence links.
// Generated API source fragments use GitHub line anchors, not Markdown headings.
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "--", "*.md"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(
    (file) =>
      file &&
      !file.startsWith(".agents/") &&
      !file.startsWith(".changeset/") &&
      !file.endsWith("AGENTS.md"),
  );

const issues = [];

let checked = 0;

const slug = (heading) =>
  heading
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^\p{L}\p{N}_\-\s]/gu, "")
    .replace(/ /g, "-");

const headings = (source) => {
  const seen = new Map();
  return new Set(
    [...source.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => {
      const base = slug(match[1]);
      const count = seen.get(base) || 0;
      seen.set(base, count + 1);
      return count ? `${base}-${count}` : base;
    }),
  );
};

for (const file of [...new Set(files)]) {
  const text = fs
    .readFileSync(file, "utf8")
    .replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, "");
  const references = [
    ...[...text.matchAll(/\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g)].map((m) =>
      m[1].replace(/^<|>$/g, ""),
    ),
    ...[...text.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]),
  ];
  for (let ref of references) {
    const own =
      /^https:\/\/(?:github\.com\/MiguelFranken\/payload-inplace\/(?:blob|tree)\/main|raw\.githubusercontent\.com\/MiguelFranken\/payload-inplace\/main)\//;
    let target;
    if (own.test(ref)) {
      ref = ref.replace(own, "");
      target = path.resolve(ref.split("#")[0]);
    } else {
      if (/^[a-z][a-z\d+.-]*:/i.test(ref) || ref.startsWith("//")) continue;
      target = path.resolve(
        path.dirname(file),
        decodeURIComponent(ref.split("#")[0] || path.basename(file)),
      );
    }
    const fragment = ref.includes("#")
      ? decodeURIComponent(ref.slice(ref.indexOf("#") + 1))
      : "";
    checked++;
    if (!fs.existsSync(target)) {
      issues.push(`${file}: missing ${ref}`);
      continue;
    }
    if (fragment && fs.statSync(target).isFile()) {
      const source = fs.readFileSync(target, "utf8");
      if (/^L\d+(?:-L\d+)?$/.test(fragment)) {
        const end = Number(fragment.split("-L").at(-1).replace(/^L/, ""));
        if (end > source.split("\n").length)
          issues.push(`${file}: stale line ${ref}`);
      } else if (target.endsWith(".md") && !headings(source).has(fragment))
        issues.push(`${file}: missing heading ${ref}`);
    }
  }
}
if (issues.length) {
  console.error(issues.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Checked ${checked} local links and fragments across ${new Set(files).size} Markdown files`,
  );
