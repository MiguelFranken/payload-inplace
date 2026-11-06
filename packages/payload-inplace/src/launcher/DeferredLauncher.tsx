"use client";

import { lazy, Suspense, type ComponentProps } from "react";
import type { EditorPageTransition as TransitionProps } from "./EditorPageTransition.js";
import type { InPlaceLauncher as LauncherProps } from "./InPlaceLauncher.js";

const Transition = lazy(() =>
  import("./EditorPageTransition.js").then((module) => ({
    default: module.EditorPageTransition,
  })),
);

const Launcher = lazy(() =>
  import("./InPlaceLauncher.js").then((module) => ({
    default: module.InPlaceLauncher,
  })),
);

/** Keep the small authenticated bridge in a separate client chunk; anonymous responses never render it. */
export function DeferredEditorPageTransition(
  props: ComponentProps<typeof TransitionProps>,
) {
  return (
    <Suspense fallback={props.children}>
      <Transition {...props} />
    </Suspense>
  );
}

/** Only an authorized launcher requests activation JavaScript; the server-rendered control waits for hydration instead of causing a hard navigation. */
export function DeferredInPlaceLauncher(
  props: ComponentProps<typeof LauncherProps>,
) {
  return (
    <Suspense
      fallback={
        <form
          method="post"
          action={props.action}
          className="pvl:fixed pvl:end-5 pvl:bottom-4 pvl:z-[var(--pve-z-index,2147483000)] pvl:m-0 pvl:font-[family-name:var(--pve-font-family,system-ui)]"
        >
          <fieldset
            disabled
            aria-busy="true"
            className="pvl:m-0 pvl:border-0 pvl:p-0"
          >
            {props.children}
          </fieldset>
        </form>
      }
    >
      <Launcher {...props} />
    </Suspense>
  );
}
