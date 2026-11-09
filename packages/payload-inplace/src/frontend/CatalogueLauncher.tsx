"use client";

import { lazy, Suspense, useState, useId, type ComponentProps } from "react";
import { Plus } from "lucide-react";
import { Button } from "@payload-inplace/ui/primitives/button/button";
import type { SectionCatalogue } from "./SectionCatalogue";

const Catalogue = lazy(() =>
  import("./SectionCatalogue").then((module) => ({
    default: module.SectionCatalogue,
  })),
);

/** Optional catalogue/search UI is fetched only after an explicit opening action. */
export function CatalogueLauncher(
  props: ComponentProps<typeof SectionCatalogue>,
) {
  const [loaded, load] = useState(false);
  const pendingPopup = useId();
  const trigger = (
    <Button
      role="combobox"
      aria-expanded={false}
      aria-haspopup="listbox"
      aria-controls={pendingPopup}
      variant={props.triggerVariant === "canvas" ? "canvas" : "secondary"}
      size={props.triggerVariant === "canvas" ? "icon" : "default"}
      className={`${props.triggerVariant === "canvas" ? "pve:size-11" : "pve:w-full"} ${props.className || ""}`}
      aria-label={props.label}
      tooltip={props.label}
      disabled={props.disabled || !props.choices.length}
      onClick={() => {
        props.onOpenChange?.(true);
        load(true);
      }}
    >
      <Plus size={17} />
    </Button>
  );
  return loaded ? (
    <Suspense fallback={trigger}>
      <Catalogue {...props} defaultOpen />
    </Suspense>
  ) : (
    trigger
  );
}
