import { withPayload } from "@payloadcms/next/withPayload";
import path from "node:path";
export default withPayload({
  turbopack: { root: path.resolve(".") },
  devIndicators: false,
  serverExternalPackages: ["payload"],
});
