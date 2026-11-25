import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testMatch: "overlay-benchmark.spec.ts",
  timeout: 120000,
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "320px",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 320, height: 900 },
      },
    },
  ],
});
