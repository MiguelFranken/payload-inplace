import type { BlocksFieldClientProps, ClientBlock } from "payload";
import { getArrayItemPath } from "@payload-inplace/core/annotations";
import { isBindingPath } from "@payload-inplace/core/editable";
import { collectSections } from "../schema/tree";
import { documentChanges, type DocumentChange } from "./document-diff";

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

/** Canonicalize index-based renderer bindings against the saved side being displayed. */
function stablePath(
  data: unknown,
  path: string,
  rowIndexes: WeakMap<unknown[], Map<string, SectionRow | null>>,
) {
  if (!isBindingPath(path)) return;
  let value = data;
  let result = "";
  for (const part of path.split(".")) {
    if (Array.isArray(value)) {
      let rows = rowIndexes.get(value);
      if (!rows) {
        rows = new Map();
        for (const row of value) {
          if (row?.id == null) continue;
          const key = String(row.id);
          rows.set(key, rows.has(key) ? null : row);
        }
        rowIndexes.set(value, rows);
      }
      const id = part.startsWith("@")
        ? decodeURIComponent(part.slice(1))
        : /^(0|[1-9]\d*)$/.test(part)
          ? value[Number(part)]?.id
          : undefined;
      if (id == null) return;
      const row = rows.get(String(id));
      if (!row) return;
      result = getArrayItemPath(result, id);
      value = row;
    } else {
      result = result ? `${result}.${part}` : part;
      value =
        value && typeof value === "object" && Object.hasOwn(value, part)
          ? (value as SectionRow)[part]
          : undefined;
    }
  }
  return result;
}

/** Resolve both top-level and nested renderer bindings to the paths used in the saved diff. */
export function comparisonBindings(
  rows: SectionRow[],
  field: BlocksFieldClientProps["field"],
  blocksMap: Record<string, ClientBlock>,
) {
  const data = { sections: rows };
  const rowIndexes = new WeakMap<unknown[], Map<string, SectionRow | null>>();
  const bindings = new Map<
    string,
    { prefix: string; value: SectionRow } | null
  >();
  try {
    for (const section of collectSections({
      data: rows,
      field,
      root: "sections",
      blocksMap,
    })) {
      const key = JSON.stringify([
        ...(section.identity.ancestors ?? []),
        section.identity.blockId,
      ]);
      const prefix = stablePath(data, section.path, rowIndexes);
      if (prefix)
        bindings.set(
          key,
          bindings.has(key) ? null : { prefix, value: section.value },
        );
    }
  } catch {
    // Ambiguous section identity cannot safely identify a rendered field.
    bindings.clear();
  }
  return (ancestry: readonly string[], path: string) => {
    const block = bindings.get(JSON.stringify(ancestry));
    if (!block) return;
    const relative = stablePath(block.value, path, rowIndexes);
    return relative ? `${block.prefix}.${relative}` : undefined;
  };
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
): { sections: SectionChange[]; fields: DocumentChange[]; unmapped: boolean } {
  const changes = documentChanges(
    { sections: snapshot.published ?? [] },
    { sections: snapshot.draft },
    [{ ...field, name: "sections", type: "blocks" }],
    blocks,
    locale,
  );
  const sections = new Map<string, SectionChange>();
  const fields: DocumentChange[] = [];
  for (const change of changes) {
    const [, row, nested] = change.path.split(".");
    if (!row?.startsWith("@")) continue;
    if (nested && nested !== "$position") fields.push(change);
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
    fields,
    unmapped: changes.some((change) => change.path === "sections"),
  };
}
