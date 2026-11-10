"use client";

import { createContext } from "react";
import type { SectionComparisonSnapshot } from "../state/section-comparison";

export type PublishedSections = {
  root: string;
  rows: NonNullable<SectionComparisonSnapshot["published"]>;
};

export const ComparisonPreviewContext = createContext<
  PublishedSections | undefined
>(undefined);

/** Overlay only the active blocks root. Other document fields and server-owned slots retain their existing render source. */
export function showPublishedSections<T extends Record<string, unknown>>(
  document: T,
  { root, rows }: PublishedSections,
): T {
  const path = root.split(".");
  if (
    path.some(
      (key) => !key || ["__proto__", "prototype", "constructor"].includes(key),
    )
  )
    return document;

  function replace(parent: unknown, index: number): unknown {
    const key = path[index];
    if (key === undefined) return rows;
    const record =
      parent && typeof parent === "object"
        ? (parent as Record<string, unknown>)
        : {};
    return {
      ...record,
      [key]: replace(
        Object.hasOwn(record, key) ? record[key] : undefined,
        index + 1,
      ),
    };
  }

  return replace(document, 0) as T;
}
