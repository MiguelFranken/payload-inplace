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
  // Payload UI 3.91's bundled client imports clsx without declaring it. Resolve
  // that exact compatibility dependency from our own declared runtime; never
  // depend on a consumer's incidental hoist. Preserve an explicit host alias.
  const compatibility: Record<string, string> = {};
  try {
    createRequire(require.resolve("@payloadcms/ui")).resolve("clsx");
  } catch {
    const clsx = relative(projectDir, require.resolve("clsx"))
      .split(sep)
      .join("/");
    compatibility.clsx = clsx.startsWith(".") ? clsx : `./${clsx}`;
  }
  return {
    ...config,
    turbopack: {
      ...config.turbopack,
      resolveAlias: {
        ...compatibility,
        ...config.turbopack?.resolveAlias,
        "@payload-visual-editor/native-handler": local.startsWith(".")
          ? local
          : `./${local}`,
      },
    },
  };
}
