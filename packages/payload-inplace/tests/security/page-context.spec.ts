import { describe, expect, it, vi } from "vitest";
import { createContext, signContext } from "../../src/server/context.js";
import {
  readPageEditContext,
  validatePagePath,
} from "../../src/server/page-context.js";
import type { PayloadRequest } from "payload";
import type { VisualEditorOptions } from "../../src/types.js";

function fixture() {
  const document = { id: 1, layout: [], secretDraft: "Authorized draft only" };
  const findByID = vi.fn().mockResolvedValue(document);
  const canEdit = vi.fn().mockResolvedValue(true);
  const req = {
    user: { id: 5, collection: "users", _sid: "session" },
    headers: new Headers(),
    payload: {
      secret: "test-secret",
      collections: { pages: { config: { access: {} } } },
      findByID,
    },
  } as unknown as PayloadRequest;
  const options = {
    collections: { pages: { roots: ["layout"] } },
    previewOrigin: "https://website.test",
    resolvePagePath: () => "/about",
    canEdit,
  } as VisualEditorOptions;
  const context = createContext(
    req,
    { collection: "pages", id: 1, root: "layout" },
    900000,
    "/about",
  );
  const token = signContext(context, req.payload.secret);
  req.headers.set("cookie", `payload-ve-${context.nonce}=${token}`);
  return { req, options, context, token, document, canEdit, findByID };
}

describe("website page activation", () => {
  it("returns drafts only for a signed exact-page activation after native authorization", async () => {
    const f = fixture();
    expect(await readPageEditContext(f.req, "/about", f.options)).toMatchObject(
      { document: f.document, context: f.context },
    );
    expect(f.findByID).toHaveBeenCalledWith(
      expect.objectContaining({
        req: f.req,
        overrideAccess: false,
        draft: true,
      }),
    );
    expect(await readPageEditContext(f.req, "/other", f.options)).toBeNull();
  });
  it.each([
    "forged",
    "expired",
    "logout",
    "session",
    "revoked",
    "disabled",
    "wrong-cookie-name",
  ])("fails closed for %s proofs", async (kind) => {
    const f = fixture();
    if (kind === "forged")
      f.req.headers.set(
        "cookie",
        `payload-ve-${f.context.nonce}=${f.token}bad`,
      );
    if (kind === "expired")
      f.req.headers.set(
        "cookie",
        `payload-ve-${f.context.nonce}=${signContext({ ...f.context, expires: 1 }, f.req.payload.secret)}`,
      );
    if (kind === "logout") f.req.user = null;
    if (kind === "session") (f.req.user as any)._sid = "new-session";
    if (kind === "revoked") f.canEdit.mockResolvedValue(false);
    if (kind === "disabled") f.options.disabled = true;
    if (kind === "wrong-cookie-name")
      f.req.headers.set("cookie", `payload-ve-${"a".repeat(32)}=${f.token}`);
    expect(await readPageEditContext(f.req, "/about", f.options)).toBeNull();
  });
  it("rejects cross-origin and ambiguous activation paths", () => {
    expect(validatePagePath("/workshops/a%20b", "https://website.test")).toBe(
      "/workshops/a%20b",
    );
    for (const path of [
      "//evil.test",
      "/\\evil.test",
      "https://evil.test",
      "/about?draft=true",
      "/about#edit",
      "/a/../b",
      "/a\nb",
    ])
      expect(() => validatePagePath(path, "https://website.test")).toThrow();
  });
});
