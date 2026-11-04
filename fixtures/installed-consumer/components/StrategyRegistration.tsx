"use client";
import { EditorFieldStrategy } from "payload-inplace/frontend";
import { priceControls } from "./PriceControls";
export function StrategyRegistration() {
  return <EditorFieldStrategy definition={priceControls} />;
}
