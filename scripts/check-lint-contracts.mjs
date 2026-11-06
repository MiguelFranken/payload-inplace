import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { ESLint } from "eslint";

// Use an existing project file so the type-aware parser uses its real tsconfig.
const eslint = new ESLint();

const filePath =
  "packages/payload-inplace/src/frontend/controllers/draft-save.ts";

for (const [call, rejected] of [
  ["task();", true],
  ["void task();", false],
]) {
  const [result] = await eslint.lintText(
    `async function task(){ return 1 }; ${call}`,
    { filePath },
  );
  assert.equal(
    result.messages.some(
      (message) => message.ruleId === "@typescript-eslint/no-floating-promises",
    ),
    rejected,
  );
}
for (const [source, rejected] of [
  ["export const Control = () => <button />;", true],
  [
    'export const Control = () => <button aria-label="Open settings" />;',
    false,
  ],
]) {
  const fixture = `scripts/.lint-control-${process.pid}.tsx`;
  try {
    writeFileSync(fixture, source);
    const result = spawnSync(
      "corepack",
      ["pnpm", "exec", "oxlint", fixture, "--format=json"],
      { encoding: "utf8" },
    );
    assert.equal(result.status !== 0, rejected, result.stdout + result.stderr);
    if (rejected)
      assert.match(
        result.stdout + result.stderr,
        /control-has-associated-label/,
      );
  } finally {
    rmSync(fixture, { force: true });
  }
}

console.log(
  "Lint negative and positive controls passed: typed promises and accessible controls",
);
