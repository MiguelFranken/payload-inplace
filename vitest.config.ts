import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
const root = fileURLToPath(new URL(".", import.meta.url));
export default defineConfig({
  esbuild: { jsx: "automatic" },
  root,
  test: {
    projects: [
      {
        test: {
          name: "unit",
          root,
          include: ["packages/*/tests/**/*.spec.ts"],
          environment: "node",
          testTimeout: 5000,
          fileParallelism: true,
        },
      },
      {
        test: {
          name: "components",
          root,
          include: ["packages/*/tests/**/*.test.tsx"],
          environment: "happy-dom",
          setupFiles: ["./vitest.setup.ts"],
          testTimeout: 5000,
          fileParallelism: true,
        },
      },
      {
        test: {
          name: "native-integration",
          root,
          include: ["apps/demo/int.spec.ts"],
          environment: "node",
          testTimeout: 60000,
          hookTimeout: 120000,
          fileParallelism: false,
        },
      },
    ],
  },
});
