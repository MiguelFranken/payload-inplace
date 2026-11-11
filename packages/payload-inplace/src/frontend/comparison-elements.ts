import { elementRect } from "../preview/geometry";
import type {
  ComparisonSide,
  SectionChange,
} from "../state/section-comparison";
import type { DocumentChange } from "../state/document-diff";

export type ComparisonTarget = SectionChange & { element: HTMLElement };

function boundPaths(element: HTMLElement): string[] {
  const { veField, veFields } = element.dataset;
  if (veField) return [veField];
  try {
    const paths: unknown = JSON.parse(veFields ?? "[]");
    return Array.isArray(paths)
      ? paths.filter((path): path is string => typeof path === "string")
      : [];
  } catch {
    return [];
  }
}

/** Match the most specific rendered binding for each changed value on this saved side. */
export function changedElements({
  host,
  root,
  scopeKey,
  side,
  fields,
  resolve,
}: {
  host: HTMLElement;
  root: string;
  scopeKey: string;
  side: ComparisonSide;
  fields: readonly DocumentChange[];
  resolve: (ancestry: readonly string[], path: string) => string | undefined;
}): ComparisonTarget[] {
  const candidates = new Map<string, HTMLElement[]>();
  const order = new Map<HTMLElement, number>();
  for (const element of host.querySelectorAll<HTMLElement>(
    "[data-ve-field],[data-ve-fields]",
  )) {
    const { veBlock, veRoot, veAncestors, veDocument } = element.dataset;
    if (!veBlock || veRoot !== root || (veDocument && veDocument !== scopeKey))
      continue;
    let ancestry: unknown;
    try {
      ancestry = JSON.parse(veAncestors ?? "[]");
    } catch {
      continue;
    }
    if (
      !Array.isArray(ancestry) ||
      ancestry.some((id) => typeof id !== "string")
    )
      continue;
    for (const path of boundPaths(element)) {
      const key = resolve([...ancestry, veBlock], path);
      if (!key) continue;
      const existing = candidates.get(key);
      if (existing) existing.push(element);
      else candidates.set(key, [element]);
      if (!order.has(element)) order.set(element, order.size);
    }
  }
  const targets = new Map<HTMLElement, ComparisonTarget>();
  const rendered = new Map<HTMLElement, boolean>();
  for (const change of fields) {
    if ((side === "draft" ? change.after : change.before) === undefined)
      continue;
    let key =
      change.kind === "moved"
        ? change.path.slice(0, -".$position".length)
        : change.path;
    while (key.indexOf(".", "sections.".length) >= 0) {
      const elements = candidates.get(key)?.filter((element) => {
        if (!rendered.has(element))
          rendered.set(
            element,
            Boolean(elementRect(element)) &&
              getComputedStyle(element).visibility === "visible",
          );
        return rendered.get(element);
      });
      if (elements?.length) {
        for (const element of elements) {
          if (targets.has(element)) continue;
          targets.set(element, {
            id: String(order.get(element)),
            element,
            kind: change.kind,
            label: change.labels.slice(2).join(" › "),
          });
        }
        break;
      }
      key = key.slice(0, key.lastIndexOf("."));
      // A row wrapper represents a structural row change. Missing leaf bindings
      // must not turn into a highlight around the entire row or array.
      if (key.slice(key.lastIndexOf(".") + 1).startsWith("@")) break;
    }
  }
  return [...targets.values()].sort((a, b) => Number(a.id) - Number(b.id));
}
