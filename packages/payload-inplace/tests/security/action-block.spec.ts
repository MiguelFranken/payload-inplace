import { beforeEach, expect, test, vi } from "vitest";
import type { PayloadRequest } from "payload";
import { resolveActionBlock } from "../../src/server/action-block";

const access = vi.hoisted(() => vi.fn());
vi.mock("payload", () => ({
  docAccessOperation: access,
  docAccessOperationGlobal: access,
}));

const root = "content.layout";
const group = {
  slug: "group",
  fields: [
    { type: "blocks", name: "layout", blocks: [{ slug: "text", fields: [] }] },
  ],
};
const config = {
  slug: "pages",
  fields: [
    {
      type: "group",
      name: "content",
      fields: [{ type: "blocks", name: "layout", blocks: [group] }],
    },
  ],
};
const req = {
  payload: {
    config: {},
    collections: { pages: { config } },
    globals: { config: [config] },
  },
} as unknown as PayloadRequest;
const document = {
  content: {
    layout: [
      {
        id: "group1",
        blockType: "group",
        layout: [{ id: "same", blockType: "text" }],
      },
      {
        id: "group2",
        blockType: "group",
        layout: [{ id: "same", blockType: "text" }],
      },
    ],
  },
};
const context = {
  req,
  target: { collection: "pages", id: "page", root },
  document,
};
const identity = { root, blockId: "same", ancestors: ["group2"] };

beforeEach(() => access.mockReset());

test("uses the freshly resolved native path and scopes repeated nested IDs", async () => {
  access.mockResolvedValue({ fields: { content: true } });
  expect(await resolveActionBlock(context, identity, ["text"])).toEqual({
    identity,
    blockType: "text",
    path: "content.layout.1.layout.0",
  });
  expect(
    await resolveActionBlock(
      { ...context, target: { kind: "global", global: "pages", root } },
      identity,
      ["text"],
    ),
  ).toMatchObject({ identity });
  expect(
    await resolveActionBlock(context, { ...identity, ancestors: [] }, ["text"]),
  ).toBeUndefined();
});

test("rejects malformed identity, disallowed slugs and read-only fields", async () => {
  access.mockResolvedValue({ fields: { content: true } });
  for (const input of [
    null,
    { ...identity, root: "other" },
    { ...identity, ancestors: [9] },
    { ...identity, blockId: "" },
  ])
    expect(await resolveActionBlock(context, input, ["text"])).toBeUndefined();
  expect(access).not.toHaveBeenCalled();
  expect(
    await resolveActionBlock(context, identity, ["group"]),
  ).toBeUndefined();
  access.mockResolvedValue({ fields: { content: { update: false } } });
  expect(await resolveActionBlock(context, identity, ["text"])).toBeUndefined();
  access.mockResolvedValue({
    fields: {
      content: { fields: { layout: { blocks: { group: { update: false } } } } },
    },
  });
  expect(await resolveActionBlock(context, identity, ["text"])).toBeUndefined();
});
