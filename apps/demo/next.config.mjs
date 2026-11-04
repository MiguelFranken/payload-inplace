import { withVisualEditorNext } from "../../packages/payload-inplace/dist/exports/next.js";
import { withPayload } from "@payloadcms/next/withPayload";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export default withPayload(
  withVisualEditorNext(
    {
      distDir: process.env.VE_PRODUCTION === "1" ? ".next-prod" : ".next-e2e",
      turbopack: { root },
      skipProxyUrlNormalize: true,
      devIndicators: false,
      serverExternalPackages: ["mongodb-memory-server", "payload"],
      experimental: { serverActions: { bodySizeLimit: "4mb" } },
    },
    { projectDir: path.dirname(fileURLToPath(import.meta.url)) },
  ),
  { devBundleServerPackages: false },
);
