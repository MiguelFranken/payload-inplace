import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
const original = process.cwd();
const directory = fs.mkdtempSync(
  path.join(os.tmpdir(), "inplace-clean-workspace-"),
);
const sourceSHA = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const hash = (data) => createHash("sha256").update(data).digest("hex");
const env = {
  ...process.env,
  NPM_CONFIG_USERCONFIG: path.join(directory, ".npmrc"),
  TURBO_TELEMETRY_DISABLED: "1",
  NEXT_TELEMETRY_DISABLED: "1",
};
function run(args, extra = {}) {
  const result = spawnSync("corepack", ["pnpm", ...args], {
    cwd: directory,
    env: { ...env, ...extra },
    encoding: "utf8",
  });
  if (result.status !== 0) throw Error(result.stdout + result.stderr);
  return result.stdout + result.stderr;
}
const roots = [
  "packages/core/dist",
  "packages/lexical/dist",
  "packages/payload-inplace/dist",
];
function outputs() {
  const files = [];
  for (const root of roots) {
    for (const name of fs
      .readdirSync(path.join(directory, root), { recursive: true })
      .sort()) {
      const relative = path.posix.join(root, String(name));
      if (fs.statSync(path.join(directory, relative)).isFile())
        files.push([
          relative,
          hash(fs.readFileSync(path.join(directory, relative))),
        ]);
    }
  }
  return hash(JSON.stringify(files));
}
function summaries(log) {
  const summary = fs
    .readdirSync(path.join(directory, ".turbo/runs"))
    .sort()
    .at(-1);
  const data = JSON.parse(
    fs.readFileSync(path.join(directory, ".turbo/runs", summary), "utf8"),
  );
  return {
    tasks: data.tasks.map((task) => ({
      task: task.taskId,
      hash: task.hash,
      cache: task.cache.status,
    })),
    logSHA256: hash(log),
  };
}
function build(name, extra = {}) {
  const start = performance.now();
  const log = run(
    [
      "exec",
      "node",
      "scripts/run-turbo.mjs",
      "run",
      "build",
      "--filter=payload-inplace",
      "--summarize",
    ],
    extra,
  );
  return {
    name,
    ms: Math.round(performance.now() - start),
    outputSHA256: outputs(),
    ...summaries(log),
  };
}
try {
  execFileSync("tar", ["-xf", "-", "-C", directory], {
    input: execFileSync("git", ["archive", sourceSHA], {
      maxBuffer: 64 * 1024 * 1024,
    }),
  });
  fs.writeFileSync(
    path.join(directory, ".npmrc"),
    "registry=https://registry.npmjs.org\n",
  );
  const installStart = performance.now();
  run(["install", "--frozen-lockfile"]);
  const installMs = Math.round(performance.now() - installStart);
  const cold = build("cold"),
    warm = build("warm");
  if (
    cold.outputSHA256 !== warm.outputSHA256 ||
    !warm.tasks.every((task) => task.cache === "HIT")
  )
    throw Error("Warm cache is not equivalent to the cold output");
  // Delete only generated outputs inside this disposable checkout. The next run
  // must restore them from cache rather than rely on an earlier dist directory.
  for (const root of roots)
    fs.rmSync(path.join(directory, root), { recursive: true, force: true });
  const restored = build("restored");
  if (
    restored.outputSHA256 !== cold.outputSHA256 ||
    !restored.tasks.every((task) => task.cache === "HIT")
  )
    throw Error("Cache did not restore every generated output");
  const file = path.join(directory, "packages/core/src/policy.ts");
  const before = fs.readFileSync(file, "utf8");
  fs.writeFileSync(file, before + "\n// controlled cache invalidation probe\n");
  const changed = build("source-changed");
  if (
    !changed.tasks.some((task) => task.cache !== "HIT") ||
    changed.tasks.find((task) => task.task.startsWith("@payload-inplace/core"))
      ?.hash ===
      cold.tasks.find((task) => task.task.startsWith("@payload-inplace/core"))
        ?.hash
  )
    throw Error("Changed core source did not invalidate dependent tasks");
  fs.writeFileSync(file, before);
  const environment = build("environment-changed", { NODE_ENV: "production" });
  if (environment.tasks.every((task) => task.cache === "HIT"))
    throw Error("Declared environment input did not invalidate tasks");
  const report = {
    sourceSHA,
    node: process.version,
    install: { frozen: true, ms: installMs },
    runs: [cold, warm, restored, changed, environment],
    method:
      "Tracked clean checkout, frozen public pnpm install; cold/warm equivalence and deletion/restoration of generated dist; controlled source/env invalidation. Times include process startup. No speedup extrapolation.",
  };
  fs.mkdirSync(path.join(original, "test-results"), { recursive: true });
  fs.writeFileSync(
    path.join(original, "test-results/workspace-cache.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
