import type { CollectionConfig, Config } from "payload";
import { describe, expect, it, vi } from "vitest";
import { visualEditor } from "../../src/plugin";
import { assignRevision } from "../../src/server/revision";
import type { VisualEditorOptions } from "../../src/types";

const options: VisualEditorOptions = {
  collections: { pages: { roots: ["content.layout"] } },
  previewOrigin: "https://example.test",
  canEdit: () => true,
};

function fixture() {
  const beforeOperation = vi.fn();
  const beforeChange = vi.fn();
  const collection: CollectionConfig = {
    slug: "pages",
    versions: { drafts: true },
    fields: [
      {
        name: "content",
        type: "group",
        fields: [{ name: "layout", type: "blocks", blocks: [] }],
      },
    ],
    hooks: { beforeChange: [beforeChange], beforeOperation: [beforeOperation] },
    admin: { custom: { consumer: true } },
  };
  const unrelated: CollectionConfig = { slug: "news", fields: [] };
  const config = { collections: [collection, unrelated] } as Config;
  return { config, collection, unrelated, beforeOperation, beforeChange };
}

function root(collection: CollectionConfig) {
  const group = collection.fields[0];
  if (group?.type !== "group") throw Error("Expected group fixture");
  return group.fields[0];
}

describe("collection editor configuration", () => {
  it("decorates only the configured root and leaves the original schema alone", async () => {
    const { config, collection, unrelated, beforeChange, beforeOperation } =
      fixture();
    const result = await visualEditor(options)(config);
    const [pages, news] = result.collections!;
    expect(news).toBe(unrelated);
    expect(root(collection)?.admin?.components).toBeUndefined();
    expect(root(pages!)?.admin?.components).toMatchObject({
      Field: {
        path: "payload-inplace/client#VisualBlocksField",
        clientProps: { root: "content.layout" },
      },
    });
    expect(pages?.admin?.custom).toEqual({
      consumer: true,
      visualEditorRoots: ["content.layout"],
    });
    expect(pages?.hooks?.beforeOperation).toEqual([
      expect.any(Function),
      beforeOperation,
    ]);
    expect(pages?.hooks?.beforeChange).toEqual([
      beforeChange,
      expect.any(Function),
    ]);
  });

  it("retains custom fields and publish controls when revision protection is enabled", async () => {
    const { config, collection, beforeChange, beforeOperation } = fixture();
    Object.assign(root(collection)!, {
      admin: { components: { Field: "./CustomBlocks" } },
    });
    collection.admin!.components = { edit: { PublishButton: "./Publish" } };
    const result = await visualEditor({
      ...options,
      concurrency: { name: "test", lock: async () => {} },
    })(config);
    const pages = result.collections![0]!;
    expect(root(pages)?.admin?.components).toMatchObject({
      Field: "./CustomBlocks",
    });
    expect(pages.admin?.components?.edit?.PublishButton).toBe("./Publish");
    expect(pages.admin?.components?.views?.edit).toMatchObject({
      version: { Component: "payload-inplace/rsc#GuardedVersionView" },
    });
    expect(pages.hooks?.beforeOperation).toEqual([
      expect.any(Function),
      expect.any(Function),
      beforeOperation,
    ]);
    expect(pages.hooks?.beforeChange).toEqual([
      beforeChange,
      expect.any(Function),
      assignRevision,
    ]);
  });

  it("returns the same config when disabled without concurrency", async () => {
    const { config } = fixture();
    expect(await visualEditor({ ...options, disabled: true })(config)).toBe(
      config,
    );
  });

  it("retains revision wiring without replacing the editor field when disabled", async () => {
    const { config } = fixture();
    const result = await visualEditor({
      ...options,
      disabled: true,
      concurrency: { name: "test", lock: async () => {} },
    })(config);
    const pages = result.collections![0]!;
    expect(root(pages)?.admin?.components).toBeUndefined();
    expect(pages.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "_veRevision" }),
      ]),
    );
  });
});
