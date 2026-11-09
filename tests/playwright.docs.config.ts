import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/** Opt-in documentation captures; normal acceptance runs never rewrite media. */
export default defineConfig({
  ...base,
  testMatch: "docs-media.spec.ts",
  timeout: 180000,
  reporter: "list",
  projects: [
    {
      name: "documentation",
      use: {
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 2,
        contextOptions: { reducedMotion: "reduce" },
      },
    },
  ],
});
