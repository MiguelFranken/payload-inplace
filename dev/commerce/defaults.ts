import { createHash } from "node:crypto";

const action = (label: string, href: string) => ({ label, href });
const defaults: Record<string, Record<string, any>> = {
  collectionHero: {
    background: "canvas",
    action: action("Explore the collection", "#collection"),
    note: "Thoughtfully made. Meant to stay.",
  },
  productGrid: {
    background: "canvas",
    collectionLabel: "The living collection / 01",
    promo: {
      eyebrow: "Small collection, lasting choices",
      heading: "Space for the things that matter.",
      background: "sage",
      action: action("Meet the studio", "#studio-story"),
    },
  },
  productDetails: {
    background: "canvas",
    breadcrumb: action("The living collection", "/shop#collection"),
    action: action("Explore the details", "#product-specifications"),
    finishesHeading: "Available finishes",
    careHeading: "Care for the oak and linen finish",
    purchaseNote: "A demonstration store · No orders or payments",
  },
  editorial: { background: "sage", eyebrow: "The way we make" },
  faq: { background: "canvas" },
};
function fill(value: any, fallback: any): any {
  if (value == null) return structuredClone(fallback);
  if (typeof fallback !== "object" || Array.isArray(fallback)) return value;
  return {
    ...value,
    ...Object.fromEntries(
      Object.entries(fallback).map(([key, item]) => [
        key,
        fill(value[key], item),
      ]),
    ),
  };
}

/** Add newly CMS-backed demo copy on read without writing or resetting existing drafts.
 * Legacy relationship lists project into stable native card rows. An explicit empty cards array remains empty.
 * This compatibility hook is demo-only; it never changes related product documents or the plugin's Form state.
 */
export function completeCommerceDocument(
  doc: Record<string, any>,
): Record<string, any> {
  const complete = (blocks: any[]) =>
    blocks?.map((original) => {
      const block = fill(original, defaults[original.blockType] || {});
      if (
        block.blockType === "productGrid" &&
        !block.cards?.length &&
        block.products?.length
      ) {
        block.cards = (block.products || []).map((product: any) => {
          const id = typeof product === "object" ? product.id : product;
          const detail = product?.presentation?.layout?.find(
            (row: any) => row.blockType === "productDetails",
          );
          return {
            id: createHash("sha256")
              .update(`${block.id}:${id}`)
              .digest("hex")
              .slice(0, 24),
            product,
            ...(detail?.heading || product?.title
              ? { heading: detail?.heading || product.title }
              : {}),
            description: "Natural oak · Two upholstery finishes",
            priceCaption: detail?.pricing
              ? new Intl.NumberFormat("en-IE", {
                  style: "currency",
                  currency: detail.pricing.currency || "EUR",
                  maximumFractionDigits: 0,
                }).format(detail.pricing.amount)
              : undefined,
            image: detail?.image || null,
            linkLabel: "View product",
          };
        });
        block.products = [];
      }
      if (block.blockType === "productDetails")
        block.variants = block.variants?.map((row: any) => ({
          ...row,
          deliveryNote: row.deliveryNote ?? "In stock · Ready in 3–5 days",
        }));
      return block;
    });
  return {
    ...doc,
    ...(doc.layout ? { layout: complete(doc.layout) } : {}),
    ...(doc.presentation
      ? {
          presentation: {
            ...doc.presentation,
            layout: complete(doc.presentation.layout),
          },
        }
      : {}),
  };
}
