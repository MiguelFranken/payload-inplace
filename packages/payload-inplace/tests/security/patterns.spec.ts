import { expect, it, vi } from "vitest";
import type { PayloadRequest } from "payload";
import type { VisualEditorOptions } from "../../src/types.js";
import {
  patternEndpoint,
  patternOperation,
} from "../../src/server/patterns.js";

const fixtures = vi.hoisted(() => ({
  access: true,
  doc: {
    _veRevision: 4,
    layout: [
      {
        id: "section",
        blockType: "text",
        heading: "Saved",
        items: [{ id: "nested", label: "Child" }],
      },
    ],
  },
}));
vi.mock("../../src/server/context.js", () => ({
  readEditContext: async () => ({
    context: { target: { collection: "pages", id: 1, root: "layout" } },
    document: fixtures.doc,
  }),
}));
vi.mock("payload", () => ({
  docAccessOperation: async () => ({
    fields: { layout: { blocks: { text: { fields: true } } } },
  }),
  docAccessOperationGlobal: vi.fn(),
}));

const field = {
  name: "layout",
  type: "blocks",
  blocks: [
    {
      slug: "text",
      fields: [
        { name: "heading", type: "text" },
        {
          name: "items",
          type: "array",
          fields: [{ name: "label", type: "text" }],
        },
      ],
    },
  ],
};

const req = {
  user: { id: 1 },
  payload: {
    collections: { pages: { config: { fields: [field] } } },
    config: { blocks: [] },
  },
} as unknown as PayloadRequest;

const setup = () => {
  const list = vi.fn(async () => ({
    docs: [
      { id: "mine", label: "My section", blockType: "text" },
      { id: "old", label: "Old", blockType: "removed" },
    ],
    hasNextPage: false,
  }));
  const read = vi.fn(async () => ({
    blockType: "text",
    content: {
      heading: "Library",
      secret: "drop",
      items: [{ id: "old", label: "Nested" }],
    },
  }));
  const save = vi.fn(async () => ({
    id: "new",
    label: "Saved copy",
    blockType: "text",
  }));
  const options = {
    patterns: {
      allowedBlocks: ["text"],
      authorize: () => fixtures.access,
      list,
      read,
      save,
    },
  } as unknown as VisualEditorOptions;
  return { list, read, save, options };
};
it("authorizes each library action, filters stale types, projects copies and saves only the server-owned revision", async () => {
  const { options, list, read, save } = setup();
  const base = { proof: "synthetic" };
  expect(
    await patternOperation(req, options, { ...base, operation: "list" }),
  ).toEqual({
    docs: [{ id: "mine", label: "My section", blockType: "text" }],
    hasNextPage: false,
  });
  expect(list).toHaveBeenCalledWith(
    expect.objectContaining({ req, page: 1, limit: 20 }),
  );
  const copy: any = await patternOperation(req, options, {
    ...base,
    operation: "read",
    id: "mine",
  });
  expect(copy.content.heading).toBe("Library");
  expect(copy.content.secret).toBeUndefined();
  expect(copy.content.items[0].id).not.toBe("old");
  await patternOperation(req, options, {
    ...base,
    operation: "save",
    label: " My copy ",
    identity: { root: "layout", blockId: "section" },
    expectedRevision: 4,
  });
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({
      label: "My copy",
      content: expect.objectContaining({ heading: "Saved" }),
    }),
  );
  await expect(
    patternOperation(req, options, {
      ...base,
      operation: "save",
      label: "Stale",
      identity: { root: "layout", blockId: "section" },
      expectedRevision: 3,
    }),
  ).rejects.toThrow();
  fixtures.access = false;
  for (const operation of ["list", "read", "save"] as const)
    await expect(
      patternOperation(req, options, { ...base, operation, id: "mine" }),
    ).rejects.toThrow("access denied");
  expect(read).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledTimes(1);
  fixtures.access = true;
});
it("fails closed when disabled, with invalid transport, wrong origin or invalid schema/provider output", async () => {
  const { options, read, save } = setup(),
    origins = new Set(["https://shop.test"]);
  const request = (value: unknown, origin = "https://shop.test") =>
    ({
      ...req,
      headers: new Headers({ origin }),
      json: async () => value,
    }) as PayloadRequest;
  for (const input of [
    {},
    { proof: "x", operation: "list", page: -1 },
    { proof: "x", operation: "read", id: "x".repeat(129) },
  ])
    expect(
      (await patternEndpoint(request(input), options, origins)).status,
    ).toBe(403);
  expect(
    (
      await patternEndpoint(
        request({ proof: "x", operation: "list" }, "https://evil.test"),
        options,
        origins,
      )
    ).status,
  ).toBe(403);
  await expect(
    patternOperation(
      req,
      { ...options, disabled: true },
      { proof: "x", operation: "list" },
    ),
  ).rejects.toThrow();
  read.mockResolvedValueOnce({ blockType: "removed", content: {} } as any);
  await expect(
    patternOperation(req, options, {
      proof: "x",
      operation: "read",
      id: "old",
    }),
  ).rejects.toThrow("no longer allowed");
  save.mockResolvedValueOnce({ id: "", label: "Bad", blockType: "text" });
  await expect(
    patternOperation(req, options, {
      proof: "x",
      operation: "save",
      label: "Copy",
      identity: { root: "layout", blockId: "section" },
      expectedRevision: 4,
    }),
  ).rejects.toThrow("Invalid pattern storage");
  expect(
    (
      await patternEndpoint(
        request({ proof: "x", operation: "list" }),
        options,
        origins,
      )
    ).status,
  ).toBe(200);
});
