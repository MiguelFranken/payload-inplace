import type { ProductDetails } from "./render-data";

// @ts-expect-error Payload's pricing group has an amount field.
export type MisspelledAmount = ProductDetails["pricing"]["ammount"];
