import type { Media, Product, Shop } from "../payload-types";

type ProductBlock = NonNullable<
  NonNullable<Product["presentation"]>["layout"]
>[number];

export type CommerceBlock = NonNullable<Shop["layout"]>[number] | ProductBlock;
export type ProductDetails = Extract<
  ProductBlock,
  { blockType: "productDetails" }
>;

type DemoID = number | string;
type WithDemoID<T extends { id: number }> = Omit<T, "id"> & { id: DemoID };
type Relationship<T> = DemoID | T | null | undefined;

// The checked-in types are generated with Postgres. The demo also runs on Mongo.
export type ProductDocument = WithDemoID<Product>;
export type MediaDocument = WithDemoID<Media>;
export type ProductRelationship = Relationship<ProductDocument>;
export type MediaRelationship = Relationship<MediaDocument>;

export function populated<T>(value: Relationship<T>): T | undefined {
  return value != null && typeof value === "object" ? value : undefined;
}

export function pageRows(
  document: Record<string, unknown>,
  root: string,
): unknown[] {
  const value = root
    .split(".")
    .reduce<unknown>(
      (current, key) =>
        current !== null && typeof current === "object" && key in current
          ? (current as Record<string, unknown>)[key]
          : undefined,
      document,
    );
  return Array.isArray(value) ? value : [];
}

/** The root comes from the demo's configured Payload schema. Discriminate its blocks from the other demo fixtures. */
export function isCommerceBlock(block: unknown): block is CommerceBlock {
  if (block == null || typeof block !== "object" || !("blockType" in block))
    return false;

  const types: Record<CommerceBlock["blockType"], true> = {
    collectionHero: true,
    productDetails: true,
    productGrid: true,
    editorial: true,
    faq: true,
  };
  return (
    typeof block.blockType === "string" && Object.hasOwn(types, block.blockType)
  );
}
