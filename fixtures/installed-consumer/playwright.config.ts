import { defineConfig } from "@playwright/test";
export default defineConfig({
  testMatch: "consumer.spec.ts",
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  use: {
    baseURL: "http://127.0.0.1:3147",
    actionTimeout: 15000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  reporter: [["list"], ["json", { outputFile: "test-results/browser.json" }]],
});
