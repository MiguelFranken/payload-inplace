import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

const domains = [
  "bindings",
  "commands",
  "persistence",
  "security",
  "native",
  "geometry",
  "consumer",
  "packaging",
];

export default defineConfig({
  esbuild: { jsx: "automatic" },
  root,
  resolve: {
    alias: {
      "@internal": fileURLToPath(
        new URL("./packages/payload-inplace/src", import.meta.url),
      ),
    },
  },
  test: {
    projects: [
      ...domains.map((domain) => ({
        extends: true as const,
        test: {
          name: `unit:plugin:${domain}`,
          root,
          include: [`packages/payload-inplace/tests/${domain}/**/*.spec.ts`],
          environment: "node" as const,
          testTimeout: 5000,
          fileParallelism: true,
        },
      })),
      ...["core", "lexical"].map((domain) => ({
        extends: true as const,
        test: {
          name: `unit:${domain}`,
          root,
          include: [`packages/${domain}/tests/**/*.spec.ts`],
          environment: "node" as const,
          testTimeout: 5000,
          fileParallelism: true,
        },
      })),
      {
        extends: true as const,
        test: {
          name: "components",
          root,
          include: ["packages/*/tests/components/**/*.test.tsx"],
          environment: "happy-dom",
          setupFiles: ["./vitest.setup.ts"],
          testTimeout: 5000,
          fileParallelism: true,
        },
      },
      {
        extends: true as const,
        test: {
          name: "native-integration",
          root,
          include: ["tests/integration/int.spec.ts"],
          environment: "node",
          testTimeout: 60000,
          hookTimeout: 120000,
          fileParallelism: false,
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary", "html", "lcov"],
      reportsDirectory: "test-results/coverage",
      include: [
        "packages/core/src/**/*.ts",
        "packages/lexical/src/**/*.ts",
        "packages/payload-inplace/src/state/**/*.ts",
        "packages/payload-inplace/src/schema/**/*.ts",
        "packages/payload-inplace/src/server/**/*.ts",
        "packages/payload-inplace/src/adapters/**/*.ts",
      ],
      exclude: ["**/types.ts", "**/*.generated.ts"],
      thresholds: {
        statements: 76,
        branches: 72,
        functions: 80,
        lines: 78,
        "packages/payload-inplace/src/server/review.ts": {
          lines: 92,
          branches: 93,
          functions: 100,
        },
        "packages/payload-inplace/src/server/revision.ts": {
          lines: 93,
          branches: 87,
          functions: 100,
        },
        "packages/payload-inplace/src/server/origins.ts": {
          lines: 100,
          branches: 90,
          functions: 100,
        },
        "packages/payload-inplace/src/server/operational-write.ts": {
          lines: 100,
          branches: 88,
          functions: 100,
        },
        "packages/payload-inplace/src/state/acknowledgement.ts": {
          lines: 90,
          branches: 92,
          functions: 75,
        },
        "packages/payload-inplace/src/schema/inline-access.ts": {
          lines: 93,
          branches: 91,
          functions: 100,
        },
        "packages/payload-inplace/src/schema/resolve-binding.ts": {
          lines: 90,
          branches: 84,
          functions: 100,
        },
        "packages/core/src/identity.ts": {
          lines: 100,
          branches: 89,
          functions: 100,
        },
        "packages/core/src/policy.ts": {
          lines: 100,
          branches: 95,
          functions: 100,
        },
      },
    },
  },
});
