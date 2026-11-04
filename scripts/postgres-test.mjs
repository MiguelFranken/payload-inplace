import { execFileSync, spawnSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
const name = `payload-visual-editor-${process.pid}`;
const stateFile = path.join(os.tmpdir(), `${name}.server.json`);
let child;
let signal;
for (const name of ["SIGINT", "SIGTERM"])
  process.on(name, () => {
    signal = name;
    child?.kill(name);
  });
const password = randomBytes(16).toString("hex");
try {
  execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "-d",
      "--name",
      name,
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
  const port = execFileSync("docker", ["port", name, "5432/tcp"], {
    encoding: "utf8",
  })
    .trim()
    .split(":")
    .at(-1);
  for (let attempt = 0; attempt < 60; attempt++) {
    if (
      spawnSync("docker", ["exec", name, "pg_isready", "-U", "postgres"], {
        stdio: "ignore",
      }).status === 0
    )
      break;
    await new Promise((r) => setTimeout(r, 250));
    if (attempt === 59) throw Error("Postgres readiness failed");
  }
  child = spawn(
    "corepack",
    [
      "pnpm",
      process.argv[2] === "serve"
        ? "dev"
        : process.argv[2] === "e2e"
          ? "test:e2e:prod"
          : "test:int:postgres",
      ...process.argv.slice(3),
    ],
    {
      env: {
        ...process.env,
        VE_DATABASE: "postgres",
        ...(process.argv[2] === "e2e" ? { VE_TEST_SCHEMA: "1" } : {}),
        VE_RUN_ID: name,
        VE_RUN_STATE: stateFile,
        DATABASE_URL: `postgresql://postgres:${password}@127.0.0.1:${port}/visual_editor`,
      },
      stdio: "inherit",
    },
  );
  process.exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? (signal ? 130 : 1)));
  });
} finally {
  // Playwright may own a separate process group. Stop only the launcher proving this exact run ID.
  if (fs.existsSync(stateFile)) {
    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    if (state.runID === name && Number.isSafeInteger(state.pid)) {
      try {
        process.kill(state.pid, "SIGTERM");
      } catch (e) {
        if (e.code !== "ESRCH") console.error("Could not stop test launcher", e);
      }
      for (let i = 0; i < 40 && fs.existsSync(stateFile); i++)
        await new Promise((r) => setTimeout(r, 100));
    }
    fs.rmSync(stateFile, { force: true });
  }
  spawnSync("docker", ["rm", "-f", name], { stdio: "ignore" });
}
