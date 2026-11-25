import type { BlockIdentity } from "./types";

export interface IndexedBlock {
  id: string;
  path: string;
  parent: string;
  index: number;
  blockType: string;
  ancestors: string[];
}

/** Index the blocks root and its row lists without turning positions into identities. */
export function indexBlocks(
  data: unknown,
  root: string,
  isRowList?: (path: string) => boolean,
): IndexedBlock[] {
  const result: IndexedBlock[] = [];
  const visit = (value: unknown, path: string, ancestors: string[]) => {
    if (Array.isArray(value)) {
      if (path !== root && isRowList && !isRowList(path)) return;
      const seen = new Set<string>();
      value.forEach((row, index) => {
        if (!row || typeof row !== "object") return;
        const value = row as Record<string, unknown>;
        const id =
          typeof value.id === "string" || typeof value.id === "number"
            ? String(value.id)
            : "";
        if (id && seen.has(id))
          throw new Error(`Duplicate row identity in ${path}`);
        if (id) seen.add(id);
        if (typeof value.blockType === "string") {
          if (!id) throw new Error(`Missing block identity in ${path}`);
          result.push({
            id,
            path: `${path}.${index}`,
            parent: path,
            index,
            blockType: value.blockType,
            ancestors,
          });
        }
        visit(row, `${path}.${index}`, id ? [...ancestors, id] : ancestors);
      });
    } else if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value))
        if (child && typeof child === "object")
          visit(child, `${path}.${key}`, ancestors);
    }
  };
  visit(data, root, []);
  return result;
}

/** Resolve scoped ancestry on the latest content, never on a cached numeric path. */
export function resolveIdentity(
  index: IndexedBlock[],
  identity: BlockIdentity,
): IndexedBlock | undefined {
  const ancestors = identity.ancestors ?? [];
  const hits = index.filter(
    (row) =>
      row.id === identity.blockId &&
      row.path.startsWith(`${identity.root}.`) &&
      row.ancestors.length === ancestors.length &&
      row.ancestors.every((id, index) => id === ancestors[index]),
  );
  if (hits.length > 1) throw new Error("Ambiguous block identity");
  return hits[0];
}
