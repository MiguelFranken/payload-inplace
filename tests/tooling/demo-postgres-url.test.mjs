import assert from "node:assert/strict";
import { test } from "node:test";
import { assertDemoPostgresUrl } from "../../apps/demo/postgres-url.mjs";

test("accepts the isolated database name and its suffixed form", () => {
  for (const url of [
    "postgresql://user:password@localhost:5432/visual_editor",
    "postgres://user:password@[::1]/visual_editor_ci_42?sslmode=require",
    "postgres://localhost/visual%5Feditor",
  ]) {
    assert.doesNotThrow(() => assertDemoPostgresUrl(url));
  }
});

test("rejects malformed and misleading URLs without exposing the input", () => {
  for (const url of [
    undefined,
    "postgresql://user:sensitive@[invalid/visual_editor",
    "https://localhost/visual_editor",
    "postgres:///visual_editor",
    "postgres://localhost/visual_editor_prod/other",
    "postgres://localhost/visual_editor%2Fprod",
    "postgres://localhost/visual_editor%ZZ",
    "postgres://localhost/visual_editorial",
    "postgres://localhost/visual_editor_",
    "postgres://localhost/production?x=/visual_editor",
    "postgres://localhost/production#/visual_editor",
  ]) {
    assert.throws(() => assertDemoPostgresUrl(url), {
      message:
        "Provide an isolated Postgres database named visual_editor or visual_editor_<suffix>",
    });
  }
});
