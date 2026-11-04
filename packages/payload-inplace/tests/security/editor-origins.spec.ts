import { expect, it } from "vitest";
import { trustedEditorOrigins } from "../../src/server/origins.js";
it("trusts only exact configured deployment, alias and Portless origins", () => {
  const origins = trustedEditorOrigins({
    previewOrigin: "https://deployment.example.test",
    additionalPreviewOrigins: [
      "https://branch.example.test/",
      "https://local.example.test:1355",
    ],
  });
  expect(origins.has("https://branch.example.test")).toBe(true);
  expect(origins.has("https://local.example.test:1355")).toBe(true);
  for (const untrusted of [
    "https://branch.example.test.attacker.test",
    "https://local.example.test",
    "null",
    "",
    "https://unlisted.example.test",
  ])
    expect(origins.has(untrusted)).toBe(false);
});
it.each([
  "https://*.example.test",
  "https://example.test/path",
  "https://user:secret@example.test",
  "javascript:alert(1)",
  "https://example.test?query",
  "https://example.test#hash",
])("rejects malformed configured origins: %s", (additional) => {
  expect(() =>
    trustedEditorOrigins({
      previewOrigin: "https://canonical.example.test",
      additionalPreviewOrigins: [additional],
    }),
  ).toThrow();
});
