import type { CollectionConfig } from "payload";
import type { SectionPatternAdapter } from "payload-inplace/types";

/** Synthetic test-only storage demonstrates native record ownership, not an alternative document save backend. */
export const patternCollection: CollectionConfig = {
  slug: "sectionPatterns",
  admin: { hidden: true, useAsTitle: "label" },
  access: {
    read: ({ req }) => (req.user ? { owner: { equals: req.user.id } } : false),
    create: ({ req }) =>
      Boolean(req.user && ["admin", "editor"].includes(req.user.role)),
    update: () => false,
    delete: () => false,
  },
  hooks: {
    beforeChange: [({ data, req }) => ({ ...data, owner: req.user?.id })],
  },
  fields: [
    { name: "label", type: "text", required: true },
    { name: "blockType", type: "text", required: true },
    { name: "content", type: "json", required: true },
    {
      name: "owner",
      type: "relationship",
      relationTo: "users",
      required: true,
      admin: { readOnly: true },
    },
  ],
};

export const patternAdapter: SectionPatternAdapter = {
  allowedBlocks: ["text", "editorial", "productGrid"],
  authorize: ({ req }) =>
    Boolean(req.user && ["admin", "editor"].includes(req.user.role)),
  list: async ({ req, page, limit }) => {
    const result = await req.payload.find({
      collection: "sectionPatterns" as never,
      page,
      limit,
      req,
      overrideAccess: false,
      depth: 0,
    });
    return {
      docs: result.docs.map((doc: any) => ({
        id: String(doc.id),
        label: doc.label,
        blockType: doc.blockType,
      })),
      hasNextPage: result.hasNextPage,
    };
  },
  read: async ({ req, id }) => {
    const doc: any = await req.payload.findByID({
      collection: "sectionPatterns" as never,
      id,
      req,
      overrideAccess: false,
      depth: 0,
    });
    return { blockType: doc.blockType, content: doc.content };
  },
  save: async ({ req, label, blockType, content }) => {
    const doc: any = await req.payload.create({
      collection: "sectionPatterns" as never,
      data: { label, blockType, content } as never,
      req,
      overrideAccess: false,
      depth: 0,
    });
    return { id: String(doc.id), label: doc.label, blockType: doc.blockType };
  },
};
