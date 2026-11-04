import { expect, it } from "vitest";
import type { ClientField } from "payload";
import { commerceBlocks } from "../../../../apps/demo/commerce/schema";
import { getArrayItemPath } from "../../src/preview/bindings";
import { resolveBinding } from "../../src/schema/resolve-binding";
import { commercePath, demoRoot } from "../../../../apps/demo/commerce/paths";

it("targets a care instruction through two stable array IDs and a group after the finishes reorder", () => {
  const value = {
    variants: [
      {
        id: "oak",
        details: { care: [{ id: "first", instruction: "Dry cloth" }] },
      },
      {
        id: "moss.finish",
        details: { care: [{ id: "wash", instruction: "Mild soap" }] },
      },
    ],
  };
  const binding = getArrayItemPath(
    getArrayItemPath("variants", "moss.finish", "details.care"),
    "wash",
    "instruction",
  );
  const args = {
    fields: commerceBlocks.productDetails.fields as ClientField[],
    binding,
    value,
  };
  expect(resolveBinding(args)?.path).toBe(
    "variants.1.details.care.0.instruction",
  );
  value.variants.reverse();
  expect(resolveBinding(args)?.path).toBe(
    "variants.0.details.care.0.instruction",
  );
  value.variants[0].details.care = [];
  expect(resolveBinding(args)).toBeUndefined();
});

it("scopes finish panels without crossing relationship documents or bypassing field permissions", () => {
  const value = {
    variants: [{ id: "finish", name: "Oak", sku: "SKU-1" }],
    pricing: { amount: 640, currency: "EUR" },
  };
  const args = {
    fields: commerceBlocks.productDetails.fields as ClientField[],
    value,
    permissions: {
      variants: {
        update: true,
        fields: { sku: { update: false }, name: { update: true } },
      },
    },
  };
  expect(
    resolveBinding({ ...args, binding: "variants.@finish.sku" })?.readOnly,
  ).toBe(true);
  expect(
    resolveBinding({ ...args, binding: "variants.@finish.name" })?.readOnly,
  ).toBe(false);
  expect(
    resolveBinding({ ...args, binding: "variants.@finish" })?.row?.fields.map(
      (field) => ("name" in field ? field.name : undefined),
    ),
  ).toContain("sku");
  expect(
    resolveBinding({ ...args, binding: "pricing.amount" })?.field.type,
  ).toBe("number");
  expect(
    resolveBinding({
      fields: commerceBlocks.productGrid.fields as ClientField[],
      value: { products: [{ id: 2, presentation: value }] },
      binding: "products.0.presentation.pricing.amount",
    }),
  ).toBeUndefined();
});

it("keeps the canonical storefront URL and named product root independent from activation hints", () => {
  expect(commercePath("shops", "home")).toBe("/shop");
  expect(commercePath("products", "arc-chair")).toBe("/products/arc-chair");
  expect(demoRoot("products")).toBe("presentation.layout");
  expect(commercePath("users", "admin")).toBeUndefined();
});

it("binds nested promotion, card and action targets to their own native scopes", () => {
  const fields = commerceBlocks.productGrid.fields as ClientField[];
  const value = {
    promo: {
      heading: "Space",
      action: { label: "Studio", href: "#studio" },
      background: "sage",
    },
    cards: [{ id: "card", product: "foreign", heading: "Chair" }],
  };
  expect(
    resolveBinding({ fields, value, binding: "promo.heading" })?.path,
  ).toBe("promo.heading");
  expect(resolveBinding({ fields, value, binding: "promo.action" })?.path).toBe(
    "promo.action",
  );
  expect(
    resolveBinding({ fields, value, binding: "cards.@card.heading" })?.path,
  ).toBe("cards.0.heading");
  expect(
    resolveBinding({ fields, value, binding: "cards.@card.product.heading" }),
  ).toBeUndefined();
});
