import type {
  Access,
  Block,
  CollectionConfig,
  UploadField,
  Field,
} from "payload";

import { completeCommerceDocument } from "./defaults";

const canEdit: Access = ({ req }) =>
  Boolean(req.user && ["admin", "editor"].includes(req.user.role));
const heading = { name: "heading", type: "text" as const, required: true };
const image: UploadField = {
  name: "image",
  type: "upload" as const,
  relationTo: "media",
};

const background: Field = {
  name: "background",
  type: "select",
  defaultValue: "canvas",
  options: [
    { label: "Canvas", value: "canvas" },
    { label: "Sage", value: "sage" },
    { label: "Sand", value: "sand" },
  ],
};
const action = (name: string, label: string, href: string): Field => ({
  name,
  type: "group",
  fields: [
    { name: "label", type: "text", defaultValue: label },
    {
      name: "href",
      label: "Link target",
      type: "text",
      defaultValue: href,
      validate: (value: unknown) =>
        !value ||
        (typeof value === "string" && /^(?:#|\/(?!\/))/.test(value)) ||
        "Use a page path or an anchor on this page.",
    },
  ],
});

/** Commerce fixtures deliberately combine native groups, named tabs, stable array rows and relationships. No plugin-specific field types are required. */
export const commerceBlocks: Record<string, Block> = {
  collectionHero: {
    slug: "collectionHero",
    labels: {
      singular: "Collection introduction",
      plural: "Collection introductions",
    },
    fields: [
      { name: "eyebrow", type: "text" },
      heading,
      { name: "description", type: "textarea" },
      image,
      action("action", "Explore the collection", "#collection"),
      {
        name: "note",
        type: "text",
        defaultValue: "Thoughtfully made. Meant to stay.",
      },
      background,
    ],
  },
  productGrid: {
    slug: "productGrid",
    labels: { singular: "Product collection", plural: "Product collections" },
    fields: [
      heading,
      { name: "description", type: "textarea" },
      {
        name: "collectionLabel",
        type: "text",
        defaultValue: "The living collection / 01",
      },
      background,
      {
        name: "promo",
        label: "Studio card",
        type: "group",
        fields: [
          {
            name: "eyebrow",
            type: "text",
            defaultValue: "Small collection, lasting choices",
          },
          {
            name: "heading",
            type: "textarea",
            defaultValue: "Space for the things that matter.",
          },
          action("action", "Meet the studio", "#studio-story"),
          { ...background, defaultValue: "sage" },
        ],
      },
      {
        name: "cards",
        type: "array",
        labels: { singular: "Product card", plural: "Product cards" },
        fields: [
          {
            name: "product",
            type: "relationship",
            relationTo: "products",
            maxDepth: 2,
            required: true,
          },
          {
            name: "heading",
            type: "text",
            admin: {
              description:
                "Card copy belongs to this storefront. The linked product stays unchanged.",
            },
          },
          { name: "description", type: "textarea" },
          { name: "priceCaption", type: "text" },
          image,
          { name: "linkLabel", type: "text", defaultValue: "View product" },
        ],
      },
      {
        name: "products",
        admin: { hidden: true },
        type: "relationship",
        relationTo: "products",
        hasMany: true,
        maxDepth: 2,
      },
    ],
  },
  productDetails: {
    slug: "productDetails",
    dbName: "product",
    labels: { singular: "Product details", plural: "Product details" },
    fields: [
      { name: "eyebrow", type: "text" },
      heading,
      { name: "description", type: "textarea" },
      image,
      background,
      action("breadcrumb", "The living collection", "/shop#collection"),
      action("action", "Explore the details", "#product-specifications"),
      {
        name: "finishesHeading",
        type: "text",
        defaultValue: "Available finishes",
      },
      {
        name: "careHeading",
        type: "text",
        defaultValue: "Care for the oak and linen finish",
      },
      {
        name: "purchaseNote",
        type: "text",
        defaultValue: "A demonstration store · No orders or payments",
      },
      {
        name: "pricing",
        type: "group",
        fields: [
          { name: "amount", type: "number", required: true, min: 0 },
          {
            name: "currency",
            type: "select",
            defaultValue: "EUR",
            options: ["EUR", "USD"],
          },
        ],
      },
      {
        name: "variants",
        label: "Finishes",
        type: "array",
        minRows: 1,
        maxRows: 8,
        labels: { singular: "Finish", plural: "Finishes" },
        fields: [
          { name: "name", type: "text", required: true },
          { name: "sku", label: "SKU", type: "text", required: true },
          {
            name: "deliveryNote",
            type: "text",
            defaultValue: "In stock · Ready in 3–5 days",
          },
          { name: "available", type: "checkbox", defaultValue: true },
          {
            name: "leadTime",
            type: "text",
            admin: {
              condition: (_, row) => !row.available,
              description: "Shown only when this finish is made to order.",
            },
          },
          {
            name: "details",
            type: "group",
            fields: [
              { name: "material", type: "text" },
              {
                name: "care",
                type: "array",
                fields: [{ name: "instruction", type: "textarea" }],
              },
            ],
          },
        ],
      },
      {
        name: "specifications",
        type: "array",
        labels: { singular: "Specification", plural: "Specifications" },
        fields: [
          { name: "label", type: "text", required: true },
          { name: "value", type: "textarea", required: true },
        ],
      },
    ],
  },
  editorial: {
    slug: "editorial",
    labels: { singular: "Studio story", plural: "Studio stories" },
    fields: [
      { name: "eyebrow", type: "text", defaultValue: "The way we make" },
      { ...background, defaultValue: "sage" },
      heading,
      { name: "description", type: "textarea" },
      { name: "body", type: "richText" },
      image,
    ],
  },
  faq: {
    slug: "faq",
    labels: { singular: "Questions", plural: "Question sections" },
    fields: [
      heading,
      background,
      {
        name: "items",
        type: "array",
        fields: [
          { name: "question", type: "text", required: true },
          { name: "answer", type: "textarea", required: true },
        ],
      },
    ],
  },
};

/** Existing collection schemas remain the source of truth; the product root sits inside a named native tab. */
export const commerceCollections: CollectionConfig[] = [
  {
    slug: "shops",
    labels: { singular: "Storefront", plural: "Storefronts" },
    admin: { useAsTitle: "title", listSearchableFields: ["title", "slug"] },
    access: {
      read: ({ req }) =>
        req.user ? true : { _status: { equals: "published" } },
      create: canEdit,
      update: canEdit,
      delete: canEdit,
    },
    hooks: { afterRead: [({ doc }) => completeCommerceDocument(doc)] },
    versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 50 },
    fields: [
      { name: "title", type: "text", required: true },
      { name: "slug", type: "text", required: true, unique: true },
      {
        name: "layout",
        type: "blocks",
        blocks: [
          commerceBlocks.collectionHero,
          commerceBlocks.productGrid,
          commerceBlocks.editorial,
          commerceBlocks.faq,
        ],
      },
    ],
  },
  {
    slug: "products",
    labels: { singular: "Product", plural: "Products" },
    admin: { useAsTitle: "title", listSearchableFields: ["title", "slug"] },
    access: {
      read: ({ req }) =>
        req.user ? true : { _status: { equals: "published" } },
      create: canEdit,
      update: canEdit,
      delete: canEdit,
    },
    hooks: { afterRead: [({ doc }) => completeCommerceDocument(doc)] },
    versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 50 },
    fields: [
      { name: "title", type: "text", required: true },
      { name: "slug", type: "text", required: true, unique: true },
      {
        name: "internalCost",
        type: "number",
        access: {
          read: ({ req }) => req.user?.role === "admin",
          update: ({ req }) => req.user?.role === "admin",
        },
      },
      {
        type: "tabs",
        tabs: [
          {
            name: "presentation",
            label: "Storefront content",
            fields: [
              {
                name: "layout",
                type: "blocks",
                blocks: [
                  commerceBlocks.productDetails,
                  commerceBlocks.editorial,
                  commerceBlocks.faq,
                ],
              },
            ],
          },
          {
            name: "search",
            label: "Search appearance",
            fields: [
              { name: "title", type: "text" },
              { name: "description", type: "textarea" },
            ],
          },
        ],
      },
    ],
  },
];
