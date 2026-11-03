import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import vm from "node:vm";
const repo = process.cwd();
const receipt = JSON.parse(
  fs.readFileSync("test-results/package.json", "utf8"),
);
if (!receipt.sourceSHA || receipt.sourceDirty)
  throw Error("Commit the package source before installed-artifact acceptance");
const archive = path.resolve(receipt.archive);
const hash = (data) => createHash("sha256").update(data).digest("hex");
if (hash(fs.readFileSync(archive)) !== receipt.sha256)
  throw Error("Packed candidate changed after its integrity check");
const directory = fs.mkdtempSync(
  path.join(os.tmpdir(), "pve-installed-consumer-"),
);
const container = `pve-consumer-${process.pid}`;
let server, childInFlight;
let interrupted = false;
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    interrupted = true;
    for (const child of [childInFlight, server])
      if (child?.exitCode === null) {
        try {
          process.kill(-child.pid, signal);
        } catch (error) {
          if (error.code !== "ESRCH") throw error;
        }
      }
  });
const password = randomBytes(16).toString("hex");
const env = Object.fromEntries(
  ["PATH", "HOME", "TMPDIR", "CI", "PLAYWRIGHT_BROWSERS_PATH"].flatMap((key) =>
    process.env[key] ? [[key, process.env[key]]] : [],
  ),
);
Object.assign(env, {
  NEXT_TELEMETRY_DISABLED: "1",
  PAYLOAD_CONFIG_PATH: path.join(directory, "payload.config.ts"),
  PAYLOAD_SECRET: randomBytes(32).toString("hex"),
  CONSUMER_MEDIA: path.join(directory, "media"),
});
async function run(args, extra = {}) {
  if (interrupted) throw Error("Installed consumer interrupted");
  const child = spawn("corepack", ["pnpm", ...args], {
    cwd: directory,
    env: { ...env, ...extra },
    stdio: "inherit",
    detached: true,
  });
  childInFlight = child;
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", resolve);
  });
  childInFlight = undefined;
  if (code !== 0) {
    const artifacts = path.join(directory, "test-results");
    if (fs.existsSync(artifacts))
      fs.cpSync(
        artifacts,
        path.join(repo, "test-results/installed-consumer-debug"),
        { recursive: true },
      );
    throw Error(`Clean consumer command failed: pnpm ${args.join(" ")}`);
  }
}
async function stopServer() {
  if (!server || server.exitCode !== null) return;
  const closed = new Promise((resolve) => server.once("exit", resolve));
  process.kill(-server.pid, "SIGTERM");
  await Promise.race([
    closed,
    new Promise((resolve) => setTimeout(resolve, 5000)),
  ]);
  try {
    process.kill(-server.pid, "SIGKILL");
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
  server = undefined;
}
function graph() {
  const sandbox = {};
  vm.runInNewContext(
    fs.readFileSync(
      path.join(
        directory,
        ".next/server/app/(site)/stories/[slug]/page_client-reference-manifest.js",
      ),
      "utf8",
    ),
    sandbox,
  );
  const publicModules = Object.values(sandbox.__RSC_MANIFEST)[0].clientModules;
  const forbidden = Object.keys(publicModules).filter((source) =>
    /payload-visual-editor|@payloadcms[+/]ui|richtext.*lexical.*client/.test(
      source,
    ),
  );
  if (forbidden.length)
    throw Error(`Installed public client leak: ${forbidden.join(", ")}`);
  return { modules: Object.keys(publicModules), editorClientModules: 0 };
}
function reports() {
  const report = JSON.parse(
    fs.readFileSync(path.join(directory, "test-results/browser.json"), "utf8"),
  );
  const cases = [],
    resources = [];
  function visit(suite) {
    for (const spec of suite.specs || [])
      for (const test of spec.tests || [])
        for (const result of test.results || []) {
          if (!["passed", "skipped"].includes(result.status))
            throw Error(`Installed browser failure: ${spec.title}`);
          cases.push({
            name: spec.title,
            status: result.status,
            durationMs: result.duration,
          });
          for (const item of result.attachments || [])
            if (item.name === "public-resources")
              resources.push(
                JSON.parse(
                  item.body
                    ? Buffer.from(item.body, "base64").toString("utf8")
                    : fs.readFileSync(item.path, "utf8"),
                ),
              );
        }
    for (const child of suite.suites || []) visit(child);
  }
  visit(report);
  if (cases.length !== 4 || resources.length !== 3)
    throw Error("Missing installed consumer cases or public resource evidence");
  return { cases, resources };
}
async function check(disabled) {
  env.CONSUMER_DISABLED = disabled ? "1" : "0";
  await run(["build"]);
  const publicGraph = graph();
  server = spawn("corepack", ["pnpm", "start"], {
    cwd: directory,
    env,
    stdio: "inherit",
    detached: true,
  });
  let ready = false;
  for (let attempt = 0; attempt < 240; attempt++) {
    if (interrupted) throw Error("Installed consumer interrupted");
    if (server.exitCode !== null)
      throw Error("Installed consumer server exited before readiness");
    try {
      const res = await fetch("http://127.0.0.1:3147/stories/packed-proof");
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {
      /* Wait only for this owned process. */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) throw Error("Installed consumer readiness timed out");
  await run(["exec", "playwright", "test"]);
  const result = { disabled, publicGraph, ...reports() };
  if (!disabled)
    fs.copyFileSync(
      path.join(directory, "test-results/installed-mobile.png"),
      path.join(repo, "test-results/installed-consumer-mobile.png"),
    );
  await stopServer();
  return result;
}
try {
  fs.cpSync("fixtures/installed-consumer", directory, { recursive: true });
  fs.copyFileSync(archive, path.join(directory, "candidate.tgz"));
  const entries = fs
    .readdirSync(directory, { recursive: true })
    .filter(
      (name) => /\.(?:tsx?|mjs|json)$/.test(name) && name !== "candidate.tgz",
    )
    .sort();
  for (const name of entries)
    if (
      /\.\.?\/.*dist\//.test(
        fs.readFileSync(path.join(directory, name), "utf8"),
      )
    )
      throw Error(`Source alias in clean consumer: ${name}`);
  const templateHash = hash(
    entries
      .map(
        (name) =>
          name + "\n" + fs.readFileSync(path.join(directory, name), "utf8"),
      )
      .join("\n"),
  );
  execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "-d",
      "--name",
      container,
      "-e",
      `POSTGRES_PASSWORD=${password}`,
      "-e",
      "POSTGRES_DB=visual_editor",
      "-p",
      "127.0.0.1::5432",
      "postgres:17-alpine@sha256:266d3c257594e195b309ae9d1805e54c788f1d7b375f56bf6c367aac6c917e7b",
    ],
    { stdio: ["ignore", "pipe", "inherit"] },
  );
  const port = execFileSync("docker", ["port", container, "5432/tcp"], {
    encoding: "utf8",
  })
    .trim()
    .split(":")
    .at(-1);
  env.DATABASE_URL = `postgresql://postgres:${password}@127.0.0.1:${port}/visual_editor`;
  for (let i = 0; i < 60; i++) {
    if (
      spawnSync("docker", ["exec", container, "pg_isready", "-U", "postgres"], {
        stdio: "ignore",
      }).status === 0
    )
      break;
    if (i === 59) throw Error("Clean consumer database readiness failed");
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  await run(["install", "--no-frozen-lockfile"]);
  await run(["exec", "tsx", "seed.ts"], { CONSUMER_SEED: "1" });
  await run(["exec", "payload", "generate:importmap"]);
  await run(["typecheck"]);
  const installed = await check(false),
    disabled = await check(true);
  for (const sample of installed.resources) {
    const baseline = disabled.resources.find(
      (item) => item.role === sample.role,
    );
    if (
      JSON.stringify(sample.resources) !== JSON.stringify(baseline?.resources)
    )
      throw Error(`Inactive resource mismatch for ${sample.role}`);
  }
  fs.writeFileSync(
    path.join(repo, "test-results/installed-consumer.json"),
    JSON.stringify(
      {
        package: {
          version: JSON.parse(fs.readFileSync("package.json", "utf8")).version,
          sha256: receipt.sha256,
        },
        packageSourceSHA: receipt.sourceSHA,
        harnessSourceSHA: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        templateSHA256: templateHash,
        dependencyLockSHA256: hash(
          fs.readFileSync(path.join(directory, "pnpm-lock.yaml")),
        ),
        runtime: process.version,
        scope:
          "separate clean installed app; stories.article.sections; production Turbopack; disposable Postgres",
        installed,
        disabled,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Installed consumer production, native-field, publication and disabled-isolation checks passed",
  );
} finally {
  await stopServer();
  spawnSync("docker", ["rm", "-f", container], { stdio: "ignore" });
  fs.rmSync(directory, { recursive: true, force: true });
}
