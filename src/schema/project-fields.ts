import type { ClientField } from "payload";
/** Project an authoring presentation without changing schemas, persisted values, native conditions or access control. */
export function projectFields(
  fields: ClientField[],
  include?: string[],
  prefix = "",
): ClientField[] {
  if (!include) return fields;
  return fields.flatMap((field): ClientField[] => {
    if (field.type === "tabs") {
      const tabs = field.tabs.flatMap((tab) => {
        const path =
          "name" in tab ? [prefix, tab.name].filter(Boolean).join(".") : prefix;
        const children = projectFields(tab.fields, include, path);
        return children.length ? [{ ...tab, fields: children }] : [];
      });
      return tabs.length ? [{ ...field, tabs } as ClientField] : [];
    }
    if (!("name" in field)) {
      if (!("fields" in field)) return [];
      const children = projectFields(field.fields, include, prefix);
      return children.length
        ? [{ ...field, fields: children } as ClientField]
        : [];
    }
    const path = [prefix, field.name].filter(Boolean).join(".");
    if (include.includes(path)) return [field];
    if ("fields" in field && include.some((p) => p.startsWith(path + "."))) {
      const children = projectFields(field.fields, include, path);
      return children.length
        ? [{ ...field, fields: children } as ClientField]
        : [];
    }
    return [];
  });
}
/** Resolve named native field provenance through transparent rows/tabs and named groups. Array contents use their native array editor. */
export function namedField(
  fields: ClientField[],
  path: string,
): ClientField | undefined {
  const projected = projectFields(fields, [path]);
  function find(fields: ClientField[]): ClientField | undefined {
    for (const field of fields) {
      if ("name" in field && field.name === path.split(".").at(-1))
        return field;
      if (field.type === "tabs") {
        for (const tab of field.tabs) {
          const hit = find(tab.fields);
          if (hit) return hit;
        }
      } else if ("fields" in field) {
        const hit = find(field.fields);
        if (hit) return hit;
      }
    }
  }
  return find(projected);
}

/** Exclude the field owned by an inline editor while retaining native grouping and sibling conditions. */
export function excludeFields(
  fields: ClientField[],
  exclude: string[],
  prefix = "",
): ClientField[] {
  return fields.flatMap((field): ClientField[] => {
    if (field.type === "tabs") {
      const tabs = field.tabs.flatMap((tab) => {
        const path =
          "name" in tab ? [prefix, tab.name].filter(Boolean).join(".") : prefix;
        if (exclude.includes(path)) return [];
        const children = excludeFields(tab.fields, exclude, path);
        return children.length ? [{ ...tab, fields: children }] : [];
      });
      return tabs.length ? [{ ...field, tabs } as ClientField] : [];
    }
    const path =
      "name" in field ? [prefix, field.name].filter(Boolean).join(".") : prefix;
    if ("name" in field && exclude.includes(path)) return [];
    if ("fields" in field && field.type !== "array") {
      const children = excludeFields(field.fields, exclude, path);
      return children.length
        ? [{ ...field, fields: children } as ClientField]
        : [];
    }
    return [field];
  });
}
/** Native field mount claims follow projected leaf paths; arrays and blocks remain indivisible native controls. */
export function fieldOwnershipPaths(
  fields: ClientField[],
  prefix: string,
): string[] {
  return fields.flatMap((field) => {
    if (field.type === "tabs")
      return field.tabs.flatMap((tab) =>
        fieldOwnershipPaths(
          tab.fields,
          "name" in tab ? `${prefix}.${tab.name}` : prefix,
        ),
      );
    const path = "name" in field ? `${prefix}.${field.name}` : prefix;
    if ("fields" in field && field.type !== "array")
      return fieldOwnershipPaths(field.fields, path);
    return "name" in field && field.type !== "ui" ? [path] : [];
  });
}
