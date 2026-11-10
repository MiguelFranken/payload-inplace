"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ComparisonSide,
  SectionComparisonSnapshot,
} from "../../state/section-comparison";

type ComparisonState =
  | { kind: "closed" | "loading" | "error" | "stale" }
  | {
      kind: "ready";
      side: ComparisonSide;
      snapshot: SectionComparisonSnapshot;
    };

/** One cancellable read per comparison. A late response cannot reopen the view or replace the active draft. */
export function useSectionComparison({
  url,
  proof,
  revision,
  locale,
}: {
  url: string;
  proof: unknown;
  revision: string | number | undefined;
  locale?: string;
}) {
  const [state, setState] = useState<ComparisonState>({ kind: "closed" });
  const active = useRef<AbortController>(null);

  useEffect(() => () => active.current?.abort(), []);

  async function open() {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setState({ kind: "loading" });
    try {
      const response = await fetch(
        locale ? `${url}?locale=${encodeURIComponent(locale)}` : url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proof }),
          signal: controller.signal,
          cache: "no-store",
        },
      );
      if (!response.ok) throw Error("Comparison unavailable");
      const snapshot: SectionComparisonSnapshot = await response.json();
      if (controller.signal.aborted) return;
      if (
        !Array.isArray(snapshot.draft) ||
        !(snapshot.published === null || Array.isArray(snapshot.published))
      )
        throw Error("Invalid comparison response");
      setState(
        snapshot.revision === revision
          ? { kind: "ready", snapshot, side: "draft" }
          : { kind: "stale" },
      );
    } catch {
      if (!controller.signal.aborted) setState({ kind: "error" });
    }
  }

  function close() {
    active.current?.abort();
    setState({ kind: "closed" });
  }

  function select(side: ComparisonSide) {
    setState((current) =>
      current.kind === "ready" &&
      (side === "draft" || current.snapshot.published !== null)
        ? { ...current, side }
        : current,
    );
  }

  return {
    state:
      state.kind === "ready" && state.snapshot.revision !== revision
        ? { kind: "stale" as const }
        : state,
    open,
    close,
    select,
  };
}
