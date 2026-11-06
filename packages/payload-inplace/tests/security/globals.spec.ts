import { expect, it, vi } from "vitest";
import type { GlobalConfig, PayloadRequest } from "payload";
import { configureGlobals } from "../../src/server/globals.js";
import { signDocumentReview } from "../../src/server/review.js";
import type { VisualEditorOptions } from "../../src/types.js";

const state = vi.hoisted(() => ({
  latest: {
    _veRevision: 4,
    layout: [{ blockType: "header", id: "one", heading: "Saved" }],
  },
  target: { kind: "global", global: "header", root: "layout" },
  read: vi.fn(),
  restore: vi.fn(),
}));
vi.mock("../../src/server/document.js", () => ({
  readNativeDocument: async () => {
    state.read();
    return state.latest;
  },
}));
vi.mock("../../src/server/context.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/server/context.js")>()),
  readEditContext: async () => ({ context: { target: state.target } }),
}));
vi.mock("../../src/server/versions.js", () => ({
  prepareVersionRestore: (...args: unknown[]) => state.restore(...args),
}));

function fixture() {
  const original: GlobalConfig = {
    slug: "header",
    versions: { drafts: true },
    fields: [
      {
        name: "layout",
        type: "blocks",
        blocks: [
          { slug: "header", fields: [{ name: "heading", type: "text" }] },
        ],
      },
    ],
  };
  const lock = vi.fn().mockImplementation(async () => {
    expect(state.read).not.toHaveBeenCalled();
  });
  const options: VisualEditorOptions = {
    collections: {},
    globals: { header: { roots: ["layout"] } },
    globalPolicies: { header: { layout: { first: "header" } } },
    previewOrigin: "https://site.test",
    canEdit: () => true,
    concurrency: { name: "unit-protocol-only", lock },
  };
  const global = configureGlobals([original], options)[0]!;
  const req = {
    locale: "en",
    context: {},
    headers: new Headers(),
    user: { id: 1, collection: "users", _sid: "synthetic" },
    payload: {
      secret: "synthetic-secret",
      findGlobal: vi.fn().mockResolvedValue(state.latest),
    },
  } as unknown as PayloadRequest;
  const hook = global.hooks!.beforeOperation![0]!;
  state.read.mockClear();
  state.restore.mockReset();
  state.target = { kind: "global", global: "header", root: "layout" };
  const run = (
    data: Record<string, unknown>,
    extra: Record<string, unknown> = {},
  ) =>
    hook({
      args: { data, draft: true, ...extra },
      operation: "update",
      global: global as never,
      req,
      context: req.context,
      overrideAccess: false,
    });
  return { global, original, options, req, lock, hook, run };
}
it("configures only explicit draft globals and rejects unsupported or colliding schemas", () => {
  const f = fixture();
  expect(f.global.fields.length).toBe(4);
  expect(f.original.fields).toHaveLength(1);
  expect(
    configureGlobals([f.original], { ...f.options, globals: undefined })[0],
  ).toBe(f.original);
  expect(() =>
    configureGlobals([f.original], { ...f.options, concurrency: undefined }),
  ).toThrow("transactional");
  expect(() =>
    configureGlobals([{ ...f.original, versions: false }], f.options),
  ).toThrow("drafts");
  expect(() => configureGlobals([], f.options)).toThrow("Unknown");
  expect(() =>
    configureGlobals(
      [
        {
          ...f.original,
          fields: [
            ...f.original.fields,
            { name: "_veRevision", type: "number" },
          ],
        },
      ],
      f.options,
    ),
  ).toThrow("Reserved");
});
it("locks before reading, assigns the authoritative next revision after host hooks and rejects stale updates", async () => {
  const f = fixture();
  const args = await f.run({
    _veRevision: 4,
    _status: "draft",
    layout: state.latest.layout,
  });
  expect(f.lock).toHaveBeenCalledOnce();
  expect(args.data._veRevision).toBe(5);
  const result = await f.global.hooks!.beforeChange!.at(-1)!({
    data: { _veRevision: 999, _status: "draft" },
    global: f.global as never,
    req: f.req,
    context: f.req.context,
  });
  expect(result._veRevision).toBe(5);
  state.read.mockClear();
  await expect(
    f.run({ _veRevision: 3, _status: "draft" }),
  ).rejects.toMatchObject({ status: 409 });
  const fresh = fixture();
  expect(() =>
    fresh.global.hooks!.beforeChange!.at(-1)!({
      data: {},
      global: fresh.global as never,
      req: fresh.req,
      context: fresh.req.context,
    }),
  ).toThrow("authoritative global revision");
});
it("publishes only a matching global review and rejects raw v3 restores and foreign activation", async () => {
  const f = fixture();
  const data = {
    _veRevision: 4,
    _status: "published",
    layout: state.latest.layout,
  };
  await expect(f.run(data, { draft: false })).rejects.toMatchObject({
    status: 409,
  });
  state.read.mockClear();
  const token = signDocumentReview(
    f.req,
    { kind: "global", global: "header" },
    4,
    data,
  );
  await expect(
    f.run({ ...data, _veReviewToken: token }, { draft: false }),
  ).resolves.toBeDefined();
  await expect(
    f.hook({
      args: {},
      operation: "restoreVersion",
      global: f.global as never,
      req: f.req,
      context: f.req.context,
      overrideAccess: false,
    }),
  ).rejects.toMatchObject({ status: 409 });
  state.target = { kind: "global", global: "other", root: "layout" };
  await expect(
    f.run({ _veActivation: "proof", _veRevision: 4 }),
  ).rejects.toMatchObject({ status: 403 });
});
it("resolves valid restore intents as native draft data and does not treat an explicit null root as an unchanged publication", async () => {
  const f = fixture();
  state.restore.mockResolvedValue({
    _veRevision: 4,
    _status: "draft",
    layout: state.latest.layout,
  });
  await expect(
    f.run({
      _veActivation: "proof",
      _veRevision: 4,
      _veRestoreVersion: "version",
    }),
  ).resolves.toMatchObject({ data: { _veRevision: 5 } });
  expect(state.restore).toHaveBeenCalledOnce();
  expect(() =>
    f.global.hooks!.beforeChange!.at(-1)!({
      data: { _status: "published", layout: null },
      originalDoc: state.latest,
      global: f.global as never,
      req: f.req,
      context: f.req.context,
    }),
  ).toThrow("first section");
  await expect(f.run({ _veRestoreVersion: "version" })).rejects.toMatchObject({
    status: 403,
  });
  await expect(
    f.run({ _veActivation: "proof", _veRestoreVersion: "" }),
  ).rejects.toMatchObject({ status: 400 });
});
