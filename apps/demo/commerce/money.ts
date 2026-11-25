import type { ProductDetails } from "./render-data";

export function money(pricing?: ProductDetails["pricing"]): string {
  if (typeof pricing?.amount !== "number") return "";

  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: pricing.currency || "EUR",
    minimumFractionDigits: Number.isInteger(pricing.amount) ? 0 : 2,
  }).format(pricing.amount);
}
