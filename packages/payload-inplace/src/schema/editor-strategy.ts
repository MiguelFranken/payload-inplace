import type { ClientField, FieldState } from "payload";

/** Strategy resolution never authorizes a write. Native access, conditions and Form validation remain authoritative. */
export type EditorStrategy = {
  kind: "text" | "richText" | "pending" | "native" | "unavailable";
  reason?:
    | "permission"
    | "condition"
    | "custom"
    | "markup"
    | "panel"
    | "unsupported";
};

export function resolveEditorStrategy({
  field,
  state,
  row = false,
  permitted,
  readOnly = false,
  edit,
  markupSafe,
  lexicalFeatures,
  inline = true,
}: {
  field: ClientField;
  state?: FieldState;
  row?: boolean;
  permitted: boolean;
  readOnly?: boolean;
  edit?: "auto" | "inline" | "panel";
  markupSafe: boolean;
  lexicalFeatures?: readonly string[];
  inline?: boolean;
}): EditorStrategy {
  if (!permitted || readOnly || field.admin?.readOnly)
    return { kind: "unavailable", reason: "permission" };
  if (state?.passesCondition === false)
    return { kind: "unavailable", reason: "condition" };
  if (row || edit === "panel" || !inline)
    return { kind: "native", reason: "panel" };
  const lexical = field.type === "richText" && Boolean(lexicalFeatures);
  const custom =
    field.admin &&
    "components" in field.admin &&
    field.admin.components &&
    typeof field.admin.components === "object" &&
    "Field" in field.admin.components &&
    field.admin.components.Field;
  if (custom || (!lexical && state?.customComponents?.Field))
    return { kind: "native", reason: "custom" };
  if (
    (!lexical && !["text", "textarea"].includes(field.type)) ||
    ("hasMany" in field && field.hasMany)
  )
    return { kind: "native", reason: "unsupported" };
  if (!markupSafe) return { kind: "native", reason: "markup" };
  if (!state) return { kind: "pending" };
  return { kind: lexical ? "richText" : "text" };
}
