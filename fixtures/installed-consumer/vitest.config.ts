import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: { environment: "happy-dom", include: ["strategy.unit.test.tsx"] },
});
