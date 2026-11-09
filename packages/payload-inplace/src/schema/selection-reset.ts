import type { FieldState } from "payload";
import type { ResolvedBinding } from "./resolve-binding";

/** A reset is offered only for a known writable native value. Groups, custom
 * fields, required values and whole lists stay in their native settings.
 * Array-row removal respects the containing field's minimum, not child requirements.
 */
export function selectionReset(
  binding: ResolvedBinding | undefined,
  state: FieldState | undefined,
  value: unknown,
  permitted: boolean,
):
  | { kind: "clear"; value: "" | null }
  | { kind: "remove"; index: number; id: string }
  | undefined {
  if (
    !binding ||
    !state ||
    !permitted ||
    binding.readOnly ||
    state.passesCondition === false ||
    binding.field.admin?.readOnly ||
    binding.field.admin?.hidden
  )
    return;
  const field = binding.field;
  if (
    field.admin &&
    "components" in field.admin &&
    field.admin.components &&
    typeof field.admin.components === "object" &&
    "Field" in field.admin.components &&
    field.admin.components.Field
  )
    return;
  if (binding.row && field.type === "array") {
    const index = Number(binding.path.slice(binding.path.lastIndexOf(".") + 1));
    const rows = state.rows;
    const row = rows?.[index];
    const minimum = Math.max(field.minRows ?? 0, field.required ? 1 : 0);
    if (
      !row?.id ||
      !value ||
      typeof value !== "object" ||
      !("id" in value) ||
      String(value.id) !== String(row.id) ||
      !rows ||
      rows.length <= minimum ||
      rows.filter((item) => String(item.id) === String(row.id)).length !== 1
    )
      return;
    return { kind: "remove", index, id: String(row.id) };
  }
  if (
    ("required" in field && field.required) ||
    ("hasMany" in field && field.hasMany) ||
    (field.admin &&
      "components" in field.admin &&
      field.admin.components &&
      typeof field.admin.components === "object" &&
      "Field" in field.admin.components &&
      field.admin.components.Field) ||
    (field.type !== "richText" && state.customComponents?.Field)
  )
    return;
  if (["text", "textarea", "email", "code"].includes(field.type))
    return typeof value === "string" && value.length > 0
      ? { kind: "clear", value: "" }
      : undefined;
  if (
    [
      "number",
      "date",
      "upload",
      "relationship",
      "select",
      "radio",
      "richText",
    ].includes(field.type)
  )
    return value !== null && value !== undefined && value !== ""
      ? { kind: "clear", value: null }
      : undefined;
}
