import { resolve } from "node:path";
import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { withVisualEditorNext } from "../../src/exports/next";
import { hasPageEditorSession } from "../../src/preview/page-routing";
import { signContext } from "../../src/server/context";

it("preserves host Turbopack options and resolves only the pinned native handler without RootLayout", () => {
  const config = withVisualEditorNext({
    turbopack: { root: "/host", resolveAlias: { existing: "./existing" } },
  });
  expect(config.turbopack?.root).toBe("/host");
  expect(config.turbopack?.resolveAlias?.existing).toBe("./existing");
  const alias = config.turbopack?.resolveAlias?.[
    "@payload-visual-editor/native-handler"
  ] as string;
  expect(alias.startsWith(".")).toBe(true);
  const path = resolve(process.cwd(), alias);
  expect(path).toMatch(/utilities\/handleServerFunctions\.js$/);
  expect(readFileSync(path, "utf8")).toContain("baseServerFunctions");
  expect(readFileSync(path, "utf8")).not.toMatch(
    /(?:from|import).*?(?:layouts\/Root|scss\/app)/,
  );
});

it("treats a cookie only as an exact-path, bounded routing candidate, including unicode paths", () => {
  const context = {
    target: { collection: "pages", id: 1, root: "layout" },
    user: "users:1",
    session: "session",
    nonce: "a".repeat(32),
    pagePath: "/about",
    expires: 1000,
  };
  const token = signContext(context, "test-secret");
  const headers = new Headers({
    cookie: `payload-ve-${context.nonce}=${token}`,
  });
  expect(hasPageEditorSession(headers, "/about", 1)).toBe(true);
  expect(hasPageEditorSession(headers, "/other", 1)).toBe(false);
  expect(hasPageEditorSession(headers, "/about", 1001)).toBe(false);
  expect(
    hasPageEditorSession(
      new Headers({ cookie: "payload-ve-invalid=malformed" }),
      "/about",
      1,
    ),
  ).toBe(false);
  // Integrity is deliberately not checked here: destination authorization must reject a forged candidate.
  expect(
    hasPageEditorSession(
      new Headers({ cookie: `payload-ve-${context.nonce}=${token}forged` }),
      "/about",
      1,
    ),
  ).toBe(true);
});

it("preserves an explicit host compatibility alias", () => {
  const config = withVisualEditorNext({
    turbopack: { resolveAlias: { clsx: "./host-clsx" } },
  });
  expect(config.turbopack?.resolveAlias?.clsx).toBe("./host-clsx");
});

it("rejects unsupported native package combinations before field rendering", async () => {
  const { assertNativeVersions } = await import(
    "../../src/server/runtime-compatibility"
  );
  const supported = {
    payload: "3.91.0",
    "@payloadcms/ui": "3.91.0",
    "@payloadcms/next": "3.91.0",
    next: "16.4.2",
  };
  expect(() => assertNativeVersions(supported)).not.toThrow();
  for (const name of Object.keys(supported)) {
    expect(() =>
      assertNativeVersions({ ...supported, [name]: "4.0.0" }),
    ).toThrow(`unsupported ${name}@4.0.0`);
  }
});
