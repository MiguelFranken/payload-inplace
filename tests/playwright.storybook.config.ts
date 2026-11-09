import { defineConfig } from "@playwright/test";

const port = process.env.STORYBOOK_TEST_PORT || "6010";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "storybook",
  outputDir: "../test-results/storybook",
  use: { baseURL, browserName: "chromium", trace: "retain-on-failure" },
  webServer: {
    cwd: new URL("..", import.meta.url).pathname,
    command: `corepack pnpm --filter @payload-inplace/storybook exec vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `${baseURL}/index.json`,
  },
});
