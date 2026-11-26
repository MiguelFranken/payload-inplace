import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const previousPayload = "3.91.0";
/** Payload 3.94 patch releases keep the private handler and schema-cache contract used here. */
const currentPayloadLine = /^3\.94\.\d+$/;
const supportedNext = "16.4.6";

/** Private native handlers and schema caches have a narrower contract than semver.
 * Payload, UI and Payload Next must be one exact aligned version: 3.91.0 or a 3.94.x patch.
 * Reject a mismatched host during Next configuration, before an opaque field/render failure.
 */
export function assertNativeVersions(
  versions: Readonly<
    Record<"payload" | "@payloadcms/ui" | "@payloadcms/next" | "next", string>
  >,
): void {
  const payload = versions.payload;
  if (payload !== previousPayload && !currentPayloadLine.test(payload))
    throw Error(
      `payload-inplace: unsupported payload@${payload}; expected ${previousPayload} or 3.94.x. Keep the supported Payload/Next packages aligned before enabling the native editor bridge.`,
    );
  const expected = {
    "@payloadcms/ui": payload,
    "@payloadcms/next": payload,
    next: supportedNext,
  } as const;
  for (const [name, pin] of Object.entries(expected)) {
    const actual = versions[name as keyof typeof expected];
    if (actual !== pin)
      throw Error(
        `payload-inplace: unsupported ${name}@${actual}; expected ${pin}. Keep the supported Payload/Next packages aligned before enabling the native editor bridge.`,
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
