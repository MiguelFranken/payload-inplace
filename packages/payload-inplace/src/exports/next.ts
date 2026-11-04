import { createRequire } from "node:module";
import { dirname, relative, resolve, sep } from "node:path";
import type { NextConfig } from "next";

/** Keep Payload's admin RootLayout/global CSS out of website entrypoints while retaining its unchanged native server functions.
 * The exact supported Payload peer owns this internal bridge; installed-consumer and production browser checks validate it.
 * Native admin routes continue to import @payloadcms/next/layouts normally.
 */
export function withVisualEditorNext(
  config: NextConfig,
  { projectDir = process.cwd() }: { projectDir?: string } = {},
): NextConfig {
  const require = createRequire(import.meta.url);
  const layouts = require.resolve("@payloadcms/next/layouts");
  const native = resolve(
    dirname(layouts),
    "../utilities/handleServerFunctions.js",
  );
  // Turbopack treats a leading slash as server-relative, not an absolute filesystem path.
  const local = relative(projectDir, native).split(sep).join("/");
  return {
    ...config,
    turbopack: {
      ...config.turbopack,
      resolveAlias: {
        ...config.turbopack?.resolveAlias,
        "@payload-visual-editor/native-handler": local.startsWith(".")
          ? local
          : `./${local}`,
      },
    },
  };
}
