/** Inline adoption requires explicit native update permission at every named ancestor. Unknown or unreadable fields stay in native settings. */
export function canUpdateInlineField(permissions: any, path: string): boolean {
  const parts = path.split(".");
  if (
    !path ||
    parts.some((part) =>
      ["__proto__", "constructor", "prototype"].includes(part),
    )
  )
    return false;
  let node = permissions;
  for (let index = 0; index < parts.length; index++) {
    if (node === true) return true;
    if (node === false || node?.read === false || node?.update === false)
      return false;
    node = node?.[parts[index]];
    if (index < parts.length - 1) {
      if (node === true) return true;
      if (node === false || node?.read === false || node?.update === false)
        return false;
      node = node?.fields;
    }
  }
  return node === true || (node?.read !== false && node?.update === true);
}
