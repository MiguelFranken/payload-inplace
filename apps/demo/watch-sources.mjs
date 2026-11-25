import { spawn } from "node:child_process";
import { watch } from "node:fs";

const packageBuild = [
  ["--filter", "payload-inplace", "build:css"],
  [
    "--filter",
    "payload-inplace",
    "exec",
    "tsdown",
    "--no-clean",
    "--logLevel",
    "warn",
  ],
];
const demoBuild = [["build:demo:css"]];
const isSource = (file) =>
  /\.[cm]?[jt]sx?$/.test(file) && !file.endsWith(".generated.ts");
const isTailwind = (file) => /(?:^|[./\\])tailwind\.css$/.test(file);

function pnpm(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("corepack", ["pnpm", ...args], { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(Error(`pnpm ${args.join(" ")} exited with code ${code}`)),
    );
  });
}

function queueBuild(steps) {
  let pending = false;
  let building = false;
  let timer;
  async function flush() {
    if (building || !pending) return;
    building = true;
    pending = false;
    try {
      for (const args of steps) await pnpm(args);
    } catch (error) {
      console.error(
        "Watch rebuild failed. The next source edit will retry.",
        error,
      );
    } finally {
      building = false;
      if (pending) schedule();
    }
  }
  function schedule() {
    pending = true;
    clearTimeout(timer);
    timer = setTimeout(flush, 120);
  }
  return schedule;
}

const rebuildPackage = queueBuild(packageBuild);
const rebuildDemo = queueBuild(demoBuild);

for (const workspace of ["payload-inplace", "ui", "core", "lexical"])
  watch(`packages/${workspace}/src`, { recursive: true }, (_, file) => {
    if (!file || isSource(file) || isTailwind(file)) rebuildPackage();
  });

for (const directory of ["app", "components", "commerce"])
  watch(`apps/demo/${directory}`, { recursive: true }, (_, file) => {
    if (!file || isSource(file)) rebuildDemo();
  });

watch("apps/demo", (_, file) => {
  if (!file || isTailwind(file)) rebuildDemo();
});

console.log("Watching workspace package sources and demo Tailwind inputs");
