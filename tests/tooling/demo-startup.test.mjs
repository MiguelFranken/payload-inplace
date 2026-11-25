import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

function setup(t, overrides = {}) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "pve-startup-test-"));
  const stateFile = path.join(directory, "run.json");
  const env = {
    ...process.env,
    TMPDIR: directory,
    VE_MEDIA_DIR: "",
    VE_RUN_ID: "startup-test",
    VE_RUN_STATE: stateFile,
    VE_DATABASE: "postgres",
    DATABASE_URL: "postgres://localhost/visual_editor",
    ...overrides,
  };
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return {
    directory,
    env,
    launch() {
      const child = spawn(process.execPath, ["apps/demo/start-server.mjs"], {
        env,
        stdio: "ignore",
      });
      t.after(() => child.kill("SIGTERM"));
      return { child, exited: once(child, "exit") };
    },
    assertCleaned() {
      assert.ok(!existsSync(stateFile), "run state leaked");
      assert.ok(
        !readdirSync(directory).some((name) =>
          name.startsWith("payload-ve-media-"),
        ),
        "temporary media leaked",
      );
    },
  };
}

test("invalid configuration does not leave owned resources", async (t) => {
  const run = setup(t, { DATABASE_URL: "postgres://localhost/other" });
  assert.deepEqual(await run.launch().exited, [1, null]);
  run.assertCleaned();
});

test("failed Mongo startup cleans owned directories", async (t) => {
  const run = setup(t, {
    VE_DATABASE: "mongo",
    MONGOMS_SYSTEM_BINARY: "/nonexistent/pve-demo-mongod",
  });
  assert.deepEqual(await run.launch().exited, [1, null]);
  run.assertCleaned();
  assert.deepEqual(readdirSync(run.directory), []);
});

for (const useCallerMedia of [false, true]) {
  test(
    `interrupting CSS kills its process group with ${useCallerMedia ? "caller" : "owned"} media`,
    {
      skip: process.platform === "win32",
      timeout: 12000,
    },
    async (t) => {
      const run = setup(t);
      const marker = path.join(run.directory, "worker");
      const media = path.join(run.directory, "caller-media");
      if (useCallerMedia) {
        mkdirSync(media);
        writeFileSync(path.join(media, "keep.txt"), "kept");
        run.env.VE_MEDIA_DIR = media;
      }
      writeFileSync(
        path.join(run.directory, "corepack"),
        '#!/bin/sh\nsleep 60 &\nworker=$!\ntrap \'wait "$worker"; exit 0\' TERM\nprintf "%s" "$worker" > "$DEMO_TEST_WORKER"\nwait "$worker"\n',
        { mode: 0o700 },
      );
      run.env.PATH = `${run.directory}${path.delimiter}${run.env.PATH}`;
      run.env.DEMO_TEST_WORKER = marker;
      const { child, exited } = run.launch();
      const deadline = Date.now() + 5000;
      while (
        !existsSync(marker) &&
        child.exitCode === null &&
        Date.now() < deadline
      )
        await delay(20);
      assert.ok(existsSync(marker), "style subprocess did not start");
      const worker = Number(readFileSync(marker, "utf8"));
      child.kill("SIGTERM");
      assert.deepEqual(await exited, [143, null]);
      run.assertCleaned();
      assert.throws(() => process.kill(worker, 0), { code: "ESRCH" });
      if (useCallerMedia)
        assert.equal(
          readFileSync(path.join(media, "keep.txt"), "utf8"),
          "kept",
        );
    },
  );
}
