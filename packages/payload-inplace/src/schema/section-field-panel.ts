import type { ClientField } from "payload";
import { resolveBinding, type ResolvedBinding } from "./resolve-binding";
import type { NativeSection } from "./tree";

type Section = Pick<NativeSection, "path" | "schemaPath" | "permissions">;

/** Project only the native fields owned by a terminal, array item, or same-parent group. */
export function projectSectionFieldPanel({
  section,
  configuredFields,
  binding,
  field,
  group,
  canInline,
  sectionValue,
}: {
  section: Section;
  configuredFields: ClientField[];
  binding?: ResolvedBinding;
  field?: string;
  group?: readonly string[];
  canInline: boolean;
  sectionValue: unknown;
}) {
  const grouped = group?.map((path) =>
    resolveBinding({
      fields: configuredFields,
      value: sectionValue,
      binding: path,
      permissions: section.permissions,
    }),
  );
  const matchingGroup =
    grouped?.length &&
    grouped.every((item): item is ResolvedBinding =>
      Boolean(item && !item.row && item.parentPath === grouped[0]?.parentPath),
    )
      ? grouped
      : undefined;

  const scope = binding || matchingGroup?.[0];
  const fields = binding
    ? binding.row
      ? binding.row.fields
      : canInline
        ? binding.siblings
        : [binding.field]
    : field
      ? []
      : group
        ? (matchingGroup?.map((item) => item.field) ?? [])
        : configuredFields;

  return {
    fields,
    path: [section.path, binding?.row ? binding.path : scope?.parentPath]
      .filter(Boolean)
      .join("."),
    schemaPath: [
      section.schemaPath,
      binding?.row ? binding.schemaPath : scope?.parentSchemaPath,
    ]
      .filter(Boolean)
      .join("."),
    permissions: binding?.row
      ? binding.row.permissions
      : scope
        ? scope.permissions
        : section.permissions,
    readOnly: scope?.readOnly,
    focusPath:
      binding && !binding.row ? `${section.path}.${binding.path}` : undefined,
  };
}
