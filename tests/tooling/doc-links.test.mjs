import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const checker = fileURLToPath(
  new URL("../../scripts/check-doc-links.mjs", import.meta.url),
);

test("fenced examples do not supply or renumber Markdown headings", (t) => {
  const cwd = mkdtempSync(path.join(tmpdir(), "pve-doc-links-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  execFileSync("git", ["init", "-q"], { cwd });
  writeFileSync(
    path.join(cwd, "target.md"),
    [
      "````md",
      "```",
      "# Only in backticks",
      "# Real heading",
      "`````",
      "  ~~~ md",
      "# Only in tildes",
      "# Real heading",
      "  ~~~~",
      "# Real heading",
      "## Real heading",
    ].join("\n"),
  );
  const source = path.join(cwd, "source.md");
  const run = () =>
    spawnSync(process.execPath, [checker], { cwd, encoding: "utf8" });
  writeFileSync(
    source,
    "[real](target.md#real-heading) [repeated](target.md#real-heading-1)\n" +
      "~~~markdown\n[example](missing.md)\n~~~\n",
  );
  const pass = run();
  assert.equal(pass.status, 0, pass.stderr);

  writeFileSync(
    source,
    "[backticks](target.md#only-in-backticks) [tildes](target.md#only-in-tildes) " +
      "[extra](target.md#real-heading-2)\n",
  );
  const fail = run();
  assert.equal(fail.status, 1);
  for (const fragment of [
    "only-in-backticks",
    "only-in-tildes",
    "real-heading-2",
  ])
    assert.ok(
      fail.stderr.includes(`source.md: missing heading target.md#${fragment}`),
      fail.stderr,
    );
});
