import type { BlocksFieldClientProps, ClientBlock } from "payload";
import { documentChanges } from "./document-diff";

type SectionRow = Record<string, unknown>;

export type ComparisonSide = "draft" | "published";

export interface SectionComparisonSnapshot {
  revision: string | number;
  draft: SectionRow[];
  published: SectionRow[] | null;
}

export type SectionChangeKind = "added" | "removed" | "changed" | "moved";

export interface SectionChange {
  id: string;
  kind: SectionChangeKind;
  label: string;
}

/** Read only the authorized blocks root, including named tabs and groups. */
export function comparisonRows(
  document: Record<string, unknown>,
  root: string,
): SectionRow[] {
  const value = root
    .split(".")
    .reduce<unknown>(
      (parent, key) =>
        parent && typeof parent === "object" && Object.hasOwn(parent, key)
          ? (parent as Record<string, unknown>)[key]
          : undefined,
      document,
    );
  return Array.isArray(value) ? value : [];
}

/** Summarize nested changes at the top-level section. Stable IDs keep insertions from marking every following section as moved. */
export function compareSections(
  snapshot: SectionComparisonSnapshot,
  field: BlocksFieldClientProps["field"],
  blocks: Record<string, ClientBlock>,
  locale: string,
): { sections: SectionChange[]; unmapped: boolean } {
  const changes = documentChanges(
    { sections: snapshot.published ?? [] },
    { sections: snapshot.draft },
    [{ ...field, name: "sections", type: "blocks" }],
    blocks,
    locale,
  );
  const sections = new Map<string, SectionChange>();
  for (const change of changes) {
    const [, row, nested] = change.path.split(".");
    if (!row?.startsWith("@")) continue;
    const id = decodeURIComponent(row.slice(1));
    const kind = !nested || nested === "$position" ? change.kind : "changed";
    const previous = sections.get(id);
    if (!previous || previous.kind === "moved") {
      const label = change.labels[1];
      sections.set(id, {
        id,
        kind,
        label: label?.slice(0, label.lastIndexOf(" ")) || id,
      });
    }
  }
  return {
    sections: [...sections.values()],
    unmapped: changes.some((change) => change.path === "sections"),
  };
}
