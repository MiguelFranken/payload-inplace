import { withPayload } from "@payloadcms/next/withPayload";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export default withPayload(
  {
    distDir: process.env.VE_PRODUCTION === "1" ? ".next-prod" : ".next-e2e",
    turbopack: { root },
    devIndicators: false,
    serverExternalPackages: ["mongodb-memory-server", "payload"],
    experimental: { serverActions: { bodySizeLimit: "4mb" } },
  },
  { devBundleServerPackages: false },
);
