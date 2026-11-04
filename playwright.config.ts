import { defineConfig, devices } from "@playwright/test";
const origin = `http://127.0.0.1:${process.env.VE_PORT || 3127}`;
export default defineConfig({
  testDir: "apps/demo",
  testMatch: [
    "e2e.spec.ts",
    "optimistic.e2e.spec.ts",
    "commerce.e2e.spec.ts",
    "roadmap.e2e.spec.ts",
  ],
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
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
          stdout: "ignore",
          stderr: "pipe",
          command: "node apps/demo/start-server.mjs",
          url: `${origin}/admin/login`,
          reuseExistingServer: false,
          timeout: 240000,
        },
});
