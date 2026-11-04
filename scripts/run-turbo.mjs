import { spawnSync } from "node:child_process";
// Native build/unit caches must not migrate silently between supported Node runtimes.
const result = spawnSync(
  "corepack",
  ["pnpm", "exec", "turbo", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: { ...process.env, INPLACE_NODE_RUNTIME: process.version },
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? (result.signal === "SIGINT" ? 130 : 1);
