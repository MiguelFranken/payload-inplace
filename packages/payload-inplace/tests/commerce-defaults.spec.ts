import { expect, it } from "vitest";
import { completeCommerceDocument } from "../../../apps/demo/commerce/defaults";
import { mergePreviewData } from "../src/state/preview-data";

it("adds missing CMS-backed demo content without mutating existing drafts or replacing intentional empty values", () => {
  const draft = {
    layout: [
      {
        id: "grid",
        blockType: "productGrid",
        heading: "My draft",
        promo: { heading: "", action: { label: "Custom", href: "#custom" } },
        cards: [],
        unknown: "retained",
      },
    ],
  };
  const before = structuredClone(draft);
  const result = completeCommerceDocument(draft);
  expect(draft).toEqual(before);
  expect(result.layout[0]).toMatchObject({
    heading: "My draft",
    unknown: "retained",
    cards: [],
    promo: {
      heading: "",
      background: "sage",
      action: { label: "Custom", href: "#custom" },
    },
  });
});
it("projects legacy product relationships into stable owned card rows and never recreates removed cards", () => {
  const product = {
    id: "product",
    title: "Chair",
    presentation: {
      layout: [
        {
          blockType: "productDetails",
          heading: "Arc",
          pricing: { amount: 640, currency: "EUR" },
          image: "photo",
        },
      ],
    },
  };
  const doc = {
    layout: [{ id: "grid", blockType: "productGrid", products: [product] }],
  };
  const one = completeCommerceDocument(doc);
  expect(one.layout[0].cards[0]).toMatchObject({
    heading: "Arc",
    priceCaption: "€640",
    product,
    image: "photo",
  });
  expect(completeCommerceDocument(doc).layout[0].cards[0].id).toBe(
    one.layout[0].cards[0].id,
  );
  expect(one.layout[0].products).toEqual([]);
  one.layout[0].cards = [];
  expect(completeCommerceDocument(one).layout[0].cards).toEqual([]);
  expect(doc.layout[0].products).toEqual([product]);
});
it("retains populated has-many relationship previews by ID across reorder and rejects stale objects for changed IDs", () => {
  const first = { id: "one", title: "One" },
    second = { id: "two", title: "Two" };
  expect(mergePreviewData([first, second], ["two", "one", "new"])).toEqual([
    second,
    first,
    "new",
  ]);
  expect(mergePreviewData([first], [])).toEqual([]);
});
