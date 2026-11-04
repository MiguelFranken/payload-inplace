import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
const nativePins = {
  payload: "3.91.0",
  "@payloadcms/ui": "3.91.0",
  "@payloadcms/next": "3.91.0",
  next: "16.4.2",
} as const;
/** Private native handlers and schema caches have a narrower contract than semver.
 * Reject a mismatched host during Next configuration, before an opaque field/render failure.
 */
export function assertNativeVersions(
  versions: Readonly<Record<keyof typeof nativePins, string>>,
): void {
  for (const [name, expected] of Object.entries(nativePins)) {
    const actual = versions[name as keyof typeof nativePins];
    if (actual !== expected)
      throw Error(
        `payload-inplace: unsupported ${name}@${actual}; expected ${expected}. Keep the supported Payload/Next packages aligned before enabling the native editor bridge.`,
      );
  }
}
/** Read package ownership from a resolved public entry. Package.json is not a
 * supported export in Payload v3, so do not assume a package.json subpath works.
 */
export function nativePackageVersion(entry: string, name: string): string {
  for (
    let directory = dirname(entry);
    directory !== dirname(directory);
    directory = dirname(directory)
  ) {
    const file = join(directory, "package.json");
    if (!existsSync(file)) continue;
    const pkg = JSON.parse(readFileSync(file, "utf8")) as {
      name?: unknown;
      version?: unknown;
    };
    if (pkg.name === name && typeof pkg.version === "string")
      return pkg.version;
  }
  throw Error(
    `payload-inplace: cannot identify installed ${name} from its public entry`,
  );
}
