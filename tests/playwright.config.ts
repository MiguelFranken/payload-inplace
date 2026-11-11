import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const origin = `http://127.0.0.1:${process.env.VE_PORT || 3127}`;

const artifactGroup = process.env.VE_BROWSER_ARTIFACTS;
if (artifactGroup && !/^[a-z][a-z0-9-]*$/.test(artifactGroup))
  throw new Error("VE_BROWSER_ARTIFACTS must be a lowercase artifact group");

const results = artifactGroup
  ? `../test-results/${artifactGroup}`
  : "../test-results";

export default defineConfig({
  testDir: "browser",
  outputDir: `${results}/browser`,
  testMatch: [
    "e2e.spec.ts",
    "optimistic.e2e.spec.ts",
    "commerce.e2e.spec.ts",
    "roadmap.e2e.spec.ts",
    "acceptance.e2e.spec.ts",
    "block-actions.e2e.spec.ts",
    "performance.e2e.spec.ts",
  ],
  workers: 1,
  reporter: [["list"], ["json", { outputFile: `${results}/results.json` }]],
  timeout: 60000,
  expect: { timeout: 15000 },
  use: {
    baseURL: origin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
  webServer:
    process.env.VE_EXISTING === "1"
      ? undefined
      : {
          stdout: "pipe",
          stderr: "pipe",
          cwd: fileURLToPath(new URL("..", import.meta.url)),
          command: "node apps/demo/start-server.mjs",
          url: `${origin}/admin/login`,
          reuseExistingServer: false,
          timeout: 240000,
        },
});
