import { expect, it, vi } from "vitest";
import type { PayloadRequest } from "payload";
import {
  prepareVersionRestore,
  versionEndpoint,
} from "../src/server/versions.js";
import type { VisualEditorOptions } from "../src/types.js";
vi.mock("../src/server/context.js", () => ({
  readEditContext: async () => ({
    context: { target: { collection: "pages", id: "p", root: "layout" } },
    document: { _veRevision: 4, updatedAt: "current" },
  }),
}));
vi.mock("../src/server/tools.js", () => ({
  resolveTools: async () => ({ tools: ["history"] }),
}));
const options = {
  collections: { pages: { roots: ["layout"] } },
  canEdit: () => true,
  previewOrigin: "https://app.test",
  concurrency: { name: "test-only", lock: async () => {} },
} satisfies VisualEditorOptions;
const historical = {
  id: "p",
  updatedAt: "old",
  createdAt: "old",
  _veRevision: 1,
  _status: "published",
  _veReviewToken: "never-restore",
  title: "Original",
  layout: [{ id: "row", blockType: "text", heading: "Then" }],
};
const request = (parent = "p") =>
  ({
    headers: new Headers({ origin: "https://app.test" }),
    payload: {
      findVersions: vi.fn(async () => ({
        docs: [{ id: "v1", parent, version: historical, updatedAt: "old" }],
        hasNextPage: false,
        page: 1,
      })),
    },
  }) as unknown as PayloadRequest;
it("resolves a version intent on the server, retaining the current revision and draft/publication boundaries", async () => {
  const req = request();
  const data = await prepareVersionRestore(req, "proof", "v1", 4, options);
  expect(data).toMatchObject({
    title: "Original",
    layout: historical.layout,
    _status: "draft",
    _veRevision: 4,
    _veActivation: "proof",
  });
  expect(data).not.toHaveProperty("id");
  expect(data).not.toHaveProperty("_veReviewToken");
  expect(data).not.toHaveProperty("updatedAt");
  expect(req.payload.findVersions).toHaveBeenCalledWith(
    expect.objectContaining({
      overrideAccess: false,
      req,
      where: { and: [{ parent: { equals: "p" } }, { id: { equals: "v1" } }] },
    }),
  );
  await expect(
    prepareVersionRestore(req, "proof", "v1", 3, options),
  ).rejects.toThrow("revision");
  await expect(
    prepareVersionRestore(request("other"), "proof", "v1", 4, options),
  ).rejects.toThrow("version");
  await expect(
    prepareVersionRestore(req, "proof", "v1", 4, {
      ...options,
      concurrency: undefined,
    }),
  ).rejects.toThrow("concurrency");
});
it("returns only timeline metadata until a scoped version is explicitly requested and rejects untrusted origins", async () => {
  const req = request();
  req.json = async () => ({ proof: "proof", page: 1 });
  const response = await versionEndpoint(
    req,
    options,
    new Set(["https://app.test"]),
  );
  const result = await response.json();
  expect(result.versions[0].id).toBe("v1");
  expect(JSON.stringify(result)).not.toContain("Original");
  expect(result.version).toBeUndefined();
  req.headers.set("origin", "https://evil.test");
  expect(
    (await versionEndpoint(req, options, new Set(["https://app.test"]))).status,
  ).toBe(403);
});
