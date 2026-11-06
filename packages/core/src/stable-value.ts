const unsafe = new Set(["__proto__", "prototype", "constructor"]);

function parentOf(
  document: unknown,
  path: string,
): { parent: Record<string, unknown>; key: string } {
  const parts = path.split(".");
  if (!parts.length || parts.length > 128) throw Error("Invalid stable path");
  let value = document;
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index]!;
    if (!part || unsafe.has(part)) throw Error("Unsafe stable path");
    if (Array.isArray(value)) {
      if (!part.startsWith("@")) throw Error("Stable rows require identity");
      let id: string;
      try {
        id = decodeURIComponent(part.slice(1));
      } catch {
        throw Error("Invalid row identity");
      }
      const hits = value.filter(
        (row) =>
          row &&
          typeof row === "object" &&
          "id" in row &&
          String(row.id) === id,
      );
      if (hits.length !== 1)
        throw Error("Unresolved or ambiguous row identity");
      if (index === parts.length - 1)
        throw Error("Replace a complete list through its named path");
      value = hits[0];
    } else {
      if (!value || typeof value !== "object")
        throw Error("Unresolved stable parent");
      if (index === parts.length - 1)
        return { parent: value as Record<string, unknown>, key: part };
      if (!Object.hasOwn(value, part)) throw Error("Unresolved stable path");
      value = (value as Record<string, unknown>)[part];
    }
  }
  throw Error("Invalid stable path");
}

/** Read a known stable leaf/list in a comparison snapshot. Missing/duplicate row IDs fail closed; no numeric index fallback. */
export function readStableValue(document: unknown, path: string): unknown {
  const { parent, key } = parentOf(document, path);
  return parent[key];
}

/** Apply a reviewed patch only to the caller's disposable snapshot. Native Form and server validation remain the write authority. Undefined represents deletion. */
export function writeStableValue(
  document: unknown,
  path: string,
  value: unknown,
): void {
  const { parent, key } = parentOf(document, path);
  if (value === undefined) delete parent[key];
  else parent[key] = structuredClone(value);
}
