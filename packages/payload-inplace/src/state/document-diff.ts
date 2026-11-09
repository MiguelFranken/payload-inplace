import { createEditorMessages, type EditorMessages } from "@payload-inplace/ui/localization/messages";
import { localizedLabel } from "../i18n/labels";
import type { ClientBlock, ClientField } from "payload";
import { getArrayItemPath } from "@payload-inplace/core/annotations";
import { isDocumentMetadataField } from "@payload-inplace/core/document-metadata";
import { namedField } from "../schema/project-fields";

/** One authored leaf or structural row change. Stable row IDs prevent a move from appearing as rewritten content. */
export type DocumentChange = {
  path: string;
  labels: string[];
  kind: "added" | "removed" | "changed" | "moved";
  before: unknown;
  after: unknown;
  from?: number;
  to?: number;
};

function equal(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (
    !a ||
    !b ||
    typeof a !== "object" ||
    typeof b !== "object" ||
    Array.isArray(a) !== Array.isArray(b)
  )
    return false;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => equal((a as any)[key], (b as any)[key]))
  );
}

function title(value: unknown, fallback: string, locale: string): string {
  const label = localizedLabel(value, locale, "");
  if (label) return label;
  return fallback
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function rowIDs(rows: unknown[]): string[] | undefined {
  if (!rows.every((row) => isRecord(row) && row.id != null)) return;
  const ids = rows.map((row) => String((row as any).id));
  return new Set(ids).size === ids.length ? ids : undefined;
}

/** Compare the complete authorized saved document using native labels and stable iterable identity.
 * Metadata is ignored only at the document root; rich text/JSON/relationships stay atomic so formatting and custom values cannot disappear from review.
 */
export function documentChanges(
  before: Record<string, any> | null,
  after: Record<string, any>,
  fields: ClientField[] = [],
  blocksMap: Record<string, ClientBlock> = {},
  locale = "en",
  messages: Pick<EditorMessages, "t" | "number"> = createEditorMessages({
    locale,
  }),
): DocumentChange[] {
  const changes: DocumentChange[] = [];
  function walk(
    a: any,
    b: any,
    path: string,
    labels: string[],
    schema: ClientField[] = [],
    field?: ClientField,
  ) {
    if (equal(a, b)) return;
    const kind =
      a === undefined ? "added" : b === undefined ? "removed" : "changed";
    const push = () =>
      changes.push({ path, labels, kind, before: a, after: b });
    if (Array.isArray(a) && Array.isArray(b)) {
      const fromIDs = rowIDs(a),
        toIDs = rowIDs(b);
      if (
        fromIDs &&
        toIDs &&
        (field?.type === "blocks" || field?.type === "array" || !field)
      ) {
        const commonFrom = fromIDs.filter((id) => toIDs.includes(id)),
          commonTo = toIDs.filter((id) => fromIDs.includes(id));
        for (const id of [
          ...toIDs,
          ...fromIDs.filter((id) => !toIDs.includes(id)),
        ]) {
          const from = fromIDs.indexOf(id),
            to = toIDs.indexOf(id),
            old = a[from],
            next = b[to],
            row = next || old;
          const block =
            row.blockType &&
            (blocksMap[row.blockType] ||
              (field?.type === "blocks" &&
                field.blocks?.find((block) => block.slug === row.blockType)));
          const rowName =
            row.blockName ||
            title(
              block?.labels?.singular,
              row.blockType || messages.t("item"),
              locale,
            );
          const rowLabels = [
              ...labels,
              `${rowName} ${messages.number(Math.max(from, to) + 1)}`,
            ],
            rowPath = getArrayItemPath(path, id);
          if (from < 0 || to < 0 || old.blockType !== next.blockType) {
            changes.push({
              path: rowPath,
              labels: rowLabels,
              kind: from < 0 ? "added" : to < 0 ? "removed" : "changed",
              before: old,
              after: next,
            });
            continue;
          }
          if (commonFrom.indexOf(id) !== commonTo.indexOf(id))
            changes.push({
              path: `${rowPath}.$position`,
              labels: rowLabels,
              kind: "moved",
              before: from + 1,
              after: to + 1,
              from: from + 1,
              to: to + 1,
            });
          const rowFields =
            block?.fields || (field?.type === "array" ? field.fields : []);
          walk(old, next, rowPath, rowLabels, rowFields);
        }
        return;
      }
      push();
      return;
    }
    // Atomic native fields may contain nested JSON/formatting with no visible text change.
    if (
      ["richText", "json", "relationship", "upload", "point"].includes(
        field?.type || "",
      ) ||
      a?.root ||
      b?.root
    ) {
      push();
      return;
    }
    if (
      (isRecord(a) || a == null) &&
      (isRecord(b) || b == null) &&
      (isRecord(a) || isRecord(b))
    ) {
      const keys = [
        ...new Set([...Object.keys(a || {}), ...Object.keys(b || {})]),
      ];
      if (!keys.length && path) {
        push();
        return;
      }
      for (const key of keys) {
        if (
          (path === "" && isDocumentMetadataField(key)) ||
          (path.includes(".@") && key === "id")
        )
          continue;
        const child = namedField(schema, key),
          childLabel = title(
            child && "label" in child ? child.label : undefined,
            key,
            locale,
          );
        const nextFields =
          child && "fields" in child
            ? child.fields
            : child?.type === "tabs"
              ? child.tabs.flatMap((tab) => tab.fields)
              : [];
        walk(
          a?.[key],
          b?.[key],
          [path, key].filter(Boolean).join("."),
          [...labels, childLabel],
          nextFields,
          child,
        );
      }
      return;
    }
    push();
  }
  walk(before || {}, after, "", [], fields);
  return changes;
}

/** Plain-text representation for review; never inject CMS HTML. Rich-text formatting remains a structural diff even if these strings match. */
export function reviewText(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value))
    return value.map(reviewText).filter(Boolean).join("\n");
  const object = value as Record<string, any>;
  if (object.root) return reviewText(object.root);
  if (typeof object.text === "string") return object.text;
  if (Array.isArray(object.children)) return reviewText(object.children);
  return Object.entries(object)
    .filter(([key]) => !["id", "blockType", "blockName"].includes(key))
    .map(
      ([key, entry]) => `${title(undefined, key, "en")}: ${reviewText(entry)}`,
    )
    .join("\n");
}

/** Linear-time character boundary diff, with Unicode code points kept intact and shared context left unmarked. */
export function changedText(before: string, after: string) {
  const a = Array.from(before),
    b = Array.from(after);
  let start = 0,
    end = 0;
  while (start < Math.min(a.length, b.length) && a[start] === b[start]) start++;
  while (
    end < Math.min(a.length, b.length) - start &&
    a[a.length - end - 1] === b[b.length - end - 1]
  )
    end++;
  return {
    prefix: a.slice(0, start).join(""),
    removed: a.slice(start, a.length - end).join(""),
    added: b.slice(start, b.length - end).join(""),
    suffix: end ? a.slice(-end).join("") : "",
  };
}
