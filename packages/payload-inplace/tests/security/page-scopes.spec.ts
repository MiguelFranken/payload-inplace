import { expect, it, vi } from "vitest";
import type { PayloadRequest } from "payload";
import type { VisualEditorOptions } from "../../src/types.js";
import {
  createContext,
  readEditContext,
  signContext,
  verifyContext,
} from "../../src/server/context.js";
import { scopeEndpoint } from "../../src/server/scopes.js";

function fixture() {
  const owner = { collection: "pages", id: 1, root: "layout" },
    other = { collection: "products", id: 2, root: "presentation.layout" };
  const findByID = vi.fn(
    async ({ collection, id }: { collection: string; id: number }) => ({
      id,
      title: collection,
      _veRevision: 5,
      layout: [],
    }),
  );
  const req = {
    locale: "en",
    i18n: { language: "en" },
    user: { id: 1, collection: "users", _sid: "synthetic-session" },
    headers: new Headers({ origin: "https://website.test" }),
    payload: {
      secret: "synthetic-secret",
      collections: {
        pages: { config: { access: {} } },
        products: { config: { access: {} } },
      },
      findByID,
    },
  } as unknown as PayloadRequest;
  const scopes = [
    { target: owner, label: "Page" },
    { target: other, label: "Product" },
  ];
  const options: VisualEditorOptions = {
    collections: {
      pages: { roots: ["layout"] },
      products: { roots: ["presentation.layout"] },
    },
    previewOrigin: "https://website.test",
    canEdit: () => true,
    pageScopes: () => scopes,
  };
  const current = createContext(req, owner, 900000, "/shop"),
    proof = signContext(current, req.payload.secret);
  const request = (target = other, expectedRevision = 5) => {
    req.json = vi.fn().mockResolvedValue({ proof, target, expectedRevision });
    return scopeEndpoint(req, options, new Set(["https://website.test"]));
  };
  return {
    req,
    options,
    scopes,
    current,
    proof,
    owner,
    other,
    request,
    findByID,
  };
}
it("activates only a current declared page scope and keeps its original page authority", async () => {
  const f = fixture(),
    result = await f.request();
  expect(result.status).toBe(200);
  const cookie = result.headers.getSetCookie()[0]!;
  const next = verifyContext(
    cookie.split(";")[0]!.split("=").slice(1).join("="),
    f.req.payload.secret,
  )!;
  expect(next.target).toEqual(f.other);
  expect(next.pageOwner).toEqual(f.owner);
  expect(next.pagePath).toBe("/shop");
  expect(next.locale).toBe("en");
  expect(next.expires).toBeLessThanOrEqual(f.current.expires + 2);
  expect(next.activatedAt).toBeGreaterThan(f.current.activatedAt!);
  expect(
    (
      await readEditContext(
        f.req,
        signContext(next, f.req.payload.secret),
        f.options,
      )
    ).document.id,
  ).toBe(2);
  f.options.pageScopes = () => [{ target: f.owner, label: "Page" }];
  await expect(
    readEditContext(f.req, signContext(next, f.req.payload.secret), f.options),
  ).rejects.toThrow("allowed page scope");
});
it("reuses a page/document cookie rather than invalidating another tab or accumulating proofs", async () => {
  const f = fixture();
  const first = await f.request(),
    cookie = first.headers.getSetCookie()[0]!.split(";")[0]!;
  const body = await first.json();
  f.req.headers.set(
    "cookie",
    `payload-ve-${f.current.nonce}=${f.proof}; ${cookie}`,
  );
  const second = await f.request();
  expect(second.headers.getSetCookie()).toHaveLength(1);
  expect((await second.json()).context.nonce).toBe(body.context.nonce);
  await expect(
    readEditContext(f.req, f.proof, f.options),
  ).resolves.toMatchObject({ context: { target: f.owner } });
});
it("rejects forged, stale, cross-locale and revoked page scopes before exposing a cookie", async () => {
  const f = fixture();
  expect((await f.request({ ...f.other, id: 999 })).status).toBe(403);
  expect((await f.request(f.other, 4)).status).toBe(409);
  f.req.locale = "de";
  expect((await f.request()).status).toBe(403);
  f.req.locale = "en";
  f.options.canEdit = ({ target }) =>
    target.kind !== "global" && target.collection !== "products";
  const denied = await f.request();
  expect(denied.status).toBe(403);
  expect(denied.headers.get("set-cookie")).toBeNull();
  f.req.headers.set("origin", "https://forged.test");
  f.findByID.mockClear();
  expect((await f.request()).status).toBe(403);
  expect(f.findByID).not.toHaveBeenCalled();
});
