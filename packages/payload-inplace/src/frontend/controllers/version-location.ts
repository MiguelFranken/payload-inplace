import type { NativeSection } from "../../schema/tree";

function findUniqueRowIndex(rows: unknown[], id: string): number {
  let match = -1;
  for (const [index, row] of rows.entries()) {
    if (
      !row ||
      typeof row !== "object" ||
      !("id" in row) ||
      (typeof row.id !== "string" && typeof row.id !== "number") ||
      String(row.id) !== id
    )
      continue;
    if (match !== -1) return -1;
    match = index;
  }
  return match;
}

/** Walk the change's stable ancestry in the current Form, then try the nearest rendered section first. */
export function locateVersionChange(
  path: string,
  document: unknown,
  sections: readonly NativeSection[],
  showSection: (section: NativeSection) => boolean,
): boolean {
  const sectionsByPath = new Map(
    sections.map((section) => [section.path, section]),
  );
  const candidates: NativeSection[] = [];
  const rowIds: string[] = [];
  const nativePath: string[] = [];
  let value = document;

  for (const part of path.split(".")) {
    if (!part || ["__proto__", "prototype", "constructor"].includes(part))
      break;
    if (Array.isArray(value)) {
      if (!part.startsWith("@")) break;
      let id: string;
      try {
        id = decodeURIComponent(part.slice(1));
      } catch {
        break;
      }
      const index = findUniqueRowIndex(value, id);
      if (index === -1) break;
      nativePath.push(String(index));

      const section = sectionsByPath.get(nativePath.join("."));
      if (section) {
        const ancestors = section.identity.ancestors ?? [];
        // A structural update may move rows before the section index rerenders.
        if (
          section.identity.blockId === id &&
          ancestors.length === rowIds.length &&
          ancestors.every((ancestor, position) => ancestor === rowIds[position])
        )
          candidates.push(section);
      }
      rowIds.push(id);
      value = value[index];
    } else if (
      value &&
      typeof value === "object" &&
      Object.hasOwn(value, part)
    ) {
      nativePath.push(part);
      value = (value as Record<string, unknown>)[part];
    } else break;
  }

  return candidates.reverse().some((section) => showSection(section));
}
