import { expect, it, vi } from "vitest";
import type { PayloadRequest } from "payload";
import type { VisualEditorOptions } from "../../src/types.js";
const hooks = vi.hoisted(() => ({
  authorize: vi.fn(),
  init: vi.fn(async () => true),
  commit: vi.fn(),
  kill: vi.fn(),
}));
vi.mock("payload", async (original) => ({
  ...(await original<typeof import("payload")>()),
  initTransaction: hooks.init,
  commitTransaction: hooks.commit,
  killTransaction: hooks.kill,
}));
vi.mock("../../src/server/context.js", () => ({
  readEditContext: hooks.authorize,
}));
import {
  advisoryLockEndpoint,
  manageAdvisoryLock,
} from "../../src/server/advisory-lock.js";
it("does not mutate disabled/unsupported locks and never exposes owner data on foreign leases", async () => {
  hooks.authorize.mockResolvedValue({
    context: { target: { collection: "pages", id: 1, root: "layout" } },
  });
  const find = vi.fn(async () => ({
      docs: [
        {
          id: 5,
          updatedAt: new Date().toISOString(),
          user: { relationTo: "users", value: 2 },
        },
      ],
    })),
    mutate = vi.fn();
  const req = {
    user: { collection: "users", id: 1 },
    payload: {
      collections: {
        pages: { config: { lockDocuments: true } },
        "payload-locked-documents": {},
      },
      find,
      update: mutate,
      delete: mutate,
      create: mutate,
    },
  } as unknown as PayloadRequest;
  expect(
    await manageAdvisoryLock(
      req,
      "proof",
      {} as VisualEditorOptions,
      "acquire",
    ),
  ).toEqual({ status: "unavailable" });
  expect(find).not.toHaveBeenCalled();
  const lock = vi.fn();
  const state = await manageAdvisoryLock(
    req,
    "proof",
    { concurrency: { name: "test", lock } } as unknown as VisualEditorOptions,
    "acquire",
  );
  expect(state.status).toBe("other");
  expect(state).not.toHaveProperty("user");
  expect(mutate).not.toHaveBeenCalled();
  expect(find).toHaveBeenCalledWith(
    expect.objectContaining({ overrideAccess: false, req }),
  );
  expect(lock).toHaveBeenCalled();
});
it("denies forged origins and revoked sessions before exposing lock state", async () => {
  const origins = new Set(["https://demo.test"]),
    options = {} as VisualEditorOptions;
  const req = {
    headers: new Headers({ origin: "https://evil.test" }),
    json: async () => ({ proof: "proof", action: "acquire" }),
  } as PayloadRequest;
  expect((await advisoryLockEndpoint(req, options, origins)).status).toBe(403);
  hooks.authorize.mockRejectedValue(Error("revoked"));
  req.headers = new Headers({ origin: "https://demo.test" });
  expect((await advisoryLockEndpoint(req, options, origins)).status).toBe(403);
});
