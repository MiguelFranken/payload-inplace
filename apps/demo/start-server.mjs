import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { assertDemoPostgresUrl } from "./postgres-url.mjs";

const port = process.env.VE_PORT || "3127";
const postgres = process.env.VE_DATABASE === "postgres";

if (postgres) assertDemoPostgresUrl(process.env.DATABASE_URL);

let ownedMedia;
let runState;
let database;
let child;
let interrupted;
const processGroups = process.platform !== "win32";

function signalChild(pid, signal) {
  try {
    process.kill(processGroups ? -pid : pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    interrupted ??= signal;
    if (child?.pid) signalChild(child.pid, signal);
  });
}

async function run(executable, args, env) {
  if (interrupted) return;
  const processHandle = spawn(executable, args, {
    detached: processGroups,
    env,
    stdio: "inherit",
  });
  child = processHandle;
  const pid = processHandle.pid;
  const cleanupController = new AbortController();
  const escalate = () => {
    if (!pid) return;
    void delay(5000, undefined, {
      signal: cleanupController.signal,
      ref: false,
    })
      .then(() => signalChild(pid, "SIGKILL"))
      .catch((error) => {
        if (error.name !== "AbortError") throw error;
      });
  };
  process.once("SIGINT", escalate);
  process.once("SIGTERM", escalate);

  try {
    const code = await new Promise((resolve, reject) => {
      processHandle.once("error", reject);
      processHandle.once("exit", resolve);
    });
    if (code !== 0 && !interrupted)
      throw Error(`${args.join(" ")} exited with code ${code}`);
  } finally {
    process.removeListener("SIGINT", escalate);
    process.removeListener("SIGTERM", escalate);
    cleanupController.abort();
    child = undefined;
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
    database = new MongoMemoryReplSet({
      replSet: { count: 1, dbName: `visual_editor_${process.pid}` },
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
    await run("corepack", ["pnpm", "build:demo:css"], env);
    await run(
      process.execPath,
      [
        fileURLToPath(import.meta.resolve("tsx/cli")),
        "apps/demo/prepare-db.ts",
      ],
      { ...env, VE_SEED: "1" },
    );
    if (process.env.VE_PRODUCTION === "1") {
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
      await run(
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
    }
  }
} finally {
  try {
    await database?.stop();
  } finally {
    if (ownedMedia) fs.rmSync(ownedMedia, { recursive: true, force: true });
    if (runState) fs.rmSync(runState, { force: true });
  }
}
if (interrupted) process.exitCode = 128 + os.constants.signals[interrupted];
