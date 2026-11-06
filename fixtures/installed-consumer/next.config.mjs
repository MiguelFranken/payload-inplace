import { withVisualEditorNext } from "payload-inplace/next";
import { withPayload } from "@payloadcms/next/withPayload";
import path from "node:path";

export default withPayload(
  withVisualEditorNext(
    {
      turbopack: { root: path.resolve(".") },
      devIndicators: false,
      serverExternalPackages: ["payload"],
    },
    { projectDir: path.resolve(".") },
  ),
);
