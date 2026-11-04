/** Wait for native ADD_ROW's metadata and asynchronous leaf state to agree on one new row identity. */
export function preparedInsertedRow(
  fields: Readonly<
    Record<
      string,
      { value?: unknown; rows?: { id?: unknown; blockType?: unknown }[] }
    >
  >,
  container: string,
  before: ReadonlySet<string>,
) {
  const rows = fields[container]?.rows || [];
  const added = rows.flatMap((row, index) =>
    (typeof row.id === "string" || typeof row.id === "number") &&
    !before.has(String(row.id))
      ? [{ id: String(row.id), index, blockType: row.blockType }]
      : [],
  );
  if (added.length !== 1) return;
  const row = added[0]!,
    path = `${container}.${row.index}`;
  if (String(fields[`${path}.id`]?.value) !== row.id) return;
  const leaf = Object.keys(fields).some(
    (key) =>
      key.startsWith(path + ".") &&
      !["id", "blockType", "blockName"].includes(key.slice(path.length + 1)),
  );
  if (!leaf) return;
  return {
    id: row.id,
    index: row.index,
    path,
    ...(typeof row.blockType === "string" ? { blockType: row.blockType } : {}),
  };
}
