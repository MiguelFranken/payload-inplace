import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { assertDemoPostgresUrl } from "./postgres-url.mjs";

const port = process.env.VE_PORT || "3127";
const postgres = process.env.VE_DATABASE === "postgres";
const production = process.env.VE_PRODUCTION === "1";
const watching = process.argv.includes("--watch");

if (watching && production)
  throw Error("Watch mode requires the development demo");

if (postgres) assertDemoPostgresUrl(process.env.DATABASE_URL);

let ownedMedia;
let ownedDatabase;
let runState;
let database;
const children = new Map();
let interrupted;
const processGroups = process.platform !== "win32";

function signalChild(pid, signal) {
  try {
    process.kill(processGroups ? -pid : pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}

async function stopChildren(signal) {
  const active = [...children];
  for (const [pid] of active) signalChild(pid, signal);
  const timeout = setTimeout(() => {
    for (const [pid] of active)
      if (children.has(pid)) signalChild(pid, "SIGKILL");
  }, 5000);
  timeout.unref();
  try {
    await Promise.allSettled(active.map(([, exited]) => exited));
  } finally {
    clearTimeout(timeout);
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (interrupted) return;
    interrupted = signal;
    void stopChildren(signal);
  });
}

async function run(executable, args, env) {
  if (interrupted) return;
  const processHandle = spawn(executable, args, {
    detached: processGroups,
    env,
    stdio: "inherit",
  });
  const pid = processHandle.pid;
  const exited = new Promise((resolve, reject) => {
    processHandle.once("error", reject);
    processHandle.once("exit", resolve);
  });
  if (pid) children.set(pid, exited);
  try {
    const code = await exited;
    if (code !== 0 && !interrupted)
      throw Error(`${args.join(" ")} exited with code ${code}`);
  } finally {
    children.delete(pid);
    // Wrappers (pnpm, Next) can exit before their workers.
    if (pid && processGroups) signalChild(pid, "SIGKILL");
  }
}

try {
  const mediaDirectory = process.env.VE_MEDIA_DIR
    ? path.resolve(process.env.VE_MEDIA_DIR)
    : (ownedMedia = fs.mkdtempSync(
        path.join(os.tmpdir(), "payload-ve-media-"),
      ));
  fs.mkdirSync(mediaDirectory, { recursive: true });

  if (!postgres) {
    // Keep the path even if Mongo fails before it records its instance info.
    ownedDatabase = fs.mkdtempSync(path.join(os.tmpdir(), "payload-ve-mongo-"));
    database = new MongoMemoryReplSet({
      instanceOpts: [{ dbPath: ownedDatabase }],
      replSet: {
        count: 1,
        dbName: `visual_editor_${process.pid}`,
        // The launcher owns Mongo shutdown even when Playwright signals its group.
        spawn: { detached: processGroups },
      },
    });
    await database.start();
    await database.waitUntilRunning();
  }

  if (!interrupted) {
    const env = {
      ...process.env,
      DATABASE_URL: database?.getUri() || process.env.DATABASE_URL,
      PAYLOAD_SECRET: randomBytes(32).toString("hex"),
      VE_ORIGIN: `http://127.0.0.1:${port}`,
      VE_MEDIA_DIR: mediaDirectory,
      NEXT_TELEMETRY_DISABLED: "1",
    };

    if (process.env.VE_RUN_STATE && process.env.VE_RUN_ID) {
      fs.writeFileSync(
        process.env.VE_RUN_STATE,
        JSON.stringify({ runID: process.env.VE_RUN_ID, pid: process.pid }),
        { mode: 0o600 },
      );
      runState = process.env.VE_RUN_STATE;
    }

    const next = fileURLToPath(import.meta.resolve("next/dist/bin/next"));
    const address = ["--hostname", "127.0.0.1", "--port", port];
    if (watching) await run("corepack", ["pnpm", "build"], env);
    await run("corepack", ["pnpm", "build:demo:css"], env);
    await run(
      process.execPath,
      [
        fileURLToPath(import.meta.resolve("tsx/cli")),
        "apps/demo/prepare-db.ts",
      ],
      { ...env, VE_SEED: "1" },
    );
    if (production) {
      await run(
        process.execPath,
        [next, "build", "apps/demo", "--turbopack"],
        env,
      );
      await run(
        process.execPath,
        [next, "start", "apps/demo", ...address],
        env,
      );
    } else {
      const server = run(
        process.execPath,
        [
          next,
          "dev",
          "apps/demo",
          "--turbopack",
          "--no-server-fast-refresh",
          ...address,
        ],
        env,
      );
      if (watching) {
        const watcher = run(
          process.execPath,
          ["apps/demo/watch-sources.mjs"],
          env,
        );
        await Promise.race([server, watcher]);
      } else await server;
    }
  }
} finally {
  try {
    await stopChildren(interrupted || "SIGTERM");
    await database?.stop();
  } finally {
    if (ownedDatabase)
      fs.rmSync(ownedDatabase, { recursive: true, force: true });
    if (ownedMedia) fs.rmSync(ownedMedia, { recursive: true, force: true });
    if (runState) fs.rmSync(runState, { force: true });
  }
}
if (interrupted) process.exitCode = 128 + os.constants.signals[interrupted];
