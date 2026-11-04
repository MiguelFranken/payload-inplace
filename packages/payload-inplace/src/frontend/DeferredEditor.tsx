"use client";
import { lazy, Suspense, type ComponentProps } from "react";
import type { FrontendShell } from "./FrontendShell.js";
import type { ConfiguredFieldPanel } from "./ConfiguredFieldPanel.js";

const Shell = lazy(() =>
  import("./FrontendShell.js").then((module) => ({
    default: module.FrontendShell,
  })),
);
const Panel = lazy(() =>
  import("./ConfiguredFieldPanel.js").then((module) => ({
    default: module.ConfiguredFieldPanel,
  })),
);

/** The public route can reference an authorized RSC branch without eagerly importing native UI into its client entry.
 * Keep real website content visible while the activated editor chunk loads.
 */
export function DeferredFrontendShell(
  props: ComponentProps<typeof FrontendShell>,
) {
  return (
    <Suspense fallback={props.children}>
      <Shell
        key={JSON.stringify([
          props.context.target,
          props.context.locale,
          props.context.nonce,
        ])}
        {...props}
      />
    </Suspense>
  );
}

/** Configured native fields load only when their authorized panel is rendered. */
export function DeferredConfiguredFieldPanel(
  props: ComponentProps<typeof ConfiguredFieldPanel>,
) {
  return (
    <Suspense fallback={null}>
      <Panel {...props} />
    </Suspense>
  );
}
