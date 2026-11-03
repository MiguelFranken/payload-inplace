import type { ClientField } from "payload";
import type { NativeSection } from "./tree.js";
/** Derive a readable row name from native schema/value/permission state, independent of consumer field naming.
 * Hidden, denied and conditionally inactive fields never become navigation labels. This is display data only.
 */
export function sectionHeading(
  section: NativeSection,
  states: Readonly<Record<string, { passesCondition?: boolean }>> = {},
): string | undefined {
  const candidates: { name: string; value: string }[] = [];
  const readable = (permission: any) =>
    permission === true || permission?.read === true;
  function visit(
    fields: ClientField[],
    value: any,
    permissions: any,
    path: string,
  ) {
    for (const field of fields) {
      if (field.admin?.hidden) continue;
      if (field.type === "tabs") {
        for (const tab of field.tabs) {
          const name = "name" in tab ? tab.name : undefined;
          const permission =
            name && permissions !== true ? permissions?.[name] : permissions;
          if (
            name &&
            (!readable(permission) ||
              states[`${path}.${name}`]?.passesCondition === false)
          )
            continue;
          visit(
            tab.fields,
            name ? value?.[name] : value,
            name && permission !== true ? permission?.fields : permission,
            name ? `${path}.${name}` : path,
          );
        }
      } else if (!("name" in field)) {
        if ("fields" in field) visit(field.fields, value, permissions, path);
      } else {
        const permission =
          permissions === true ? true : permissions?.[field.name];
        const next = `${path}.${field.name}`;
        if (!readable(permission) || states[next]?.passesCondition === false)
          continue;
        if (field.type === "group")
          visit(
            field.fields,
            value?.[field.name],
            permission === true ? true : permission.fields,
            next,
          );
        else if (
          (field.type === "text" || field.type === "textarea") &&
          !["id", "blockType"].includes(field.name)
        ) {
          const text = value?.[field.name];
          if (typeof text === "string" && text.trim())
            candidates.push({ name: field.name, value: text.trim() });
        }
      }
    }
  }
  visit(
    section.block?.fields || [],
    section.value,
    section.permissions,
    section.path,
  );
  const priority = [
    "blockName",
    "heading",
    "headline",
    "title",
    "name",
    "label",
  ];
  return (
    priority
      .map((name) => candidates.find((item) => item.name === name)?.value)
      .find(Boolean) || candidates[0]?.value
  );
}
