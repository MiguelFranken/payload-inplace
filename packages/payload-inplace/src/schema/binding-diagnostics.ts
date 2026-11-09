import type { ClientField, FieldState } from "payload";
import { isBindingPath } from "@payload-inplace/core/editable";
import { resolveBinding } from "./resolve-binding";
import { canUpdateInlineField } from "./inline-access";

/** Development metadata only. No values, HTML, user/session details or credentials are included. Codes explain mapping/fallback; they never authorize a write. */
export interface BindingDiagnostic {
  code:
    | "unsafe-path"
    | "unresolved-path"
    | "unresolved-row"
    | "row-is-not-terminal"
    | "container-is-not-terminal"
    | "native-override"
    | "read-only"
    | "condition-hidden"
    | "unsafe-text-markup"
    | "repeated-occurrence";
  path: string;
  severity: "warning" | "info";
}

/** Explain an explicit terminal against the current native schema and metadata. Dynamic annotations use the same resolver as editing; no copied document model is introduced. */
export function diagnoseBinding({
  fields,
  value,
  binding,
  permissions,
  edit = "auto",
  state,
  interactiveMarkup = false,
  occurrences = 1,
}: {
  fields: ClientField[];
  value: unknown;
  binding: string;
  permissions?: unknown;
  edit?: "auto" | "inline" | "panel";
  state?: FieldState;
  interactiveMarkup?: boolean;
  occurrences?: number;
}): BindingDiagnostic[] {
  const issue = (
    code: BindingDiagnostic["code"],
    severity: BindingDiagnostic["severity"] = "warning",
  ): BindingDiagnostic[] => [{ code, path: binding, severity }];
  if (!isBindingPath(binding)) return issue("unsafe-path");
  const resolved = resolveBinding({ fields, value, binding, permissions });
  if (!resolved)
    return issue(
      binding.split(".").some((part) => part.startsWith("@"))
        ? "unresolved-row"
        : "unresolved-path",
    );
  if (edit === "inline" && resolved.row) return issue("row-is-not-terminal");
  if (
    edit === "inline" &&
    ["group", "array", "blocks"].includes(resolved.field.type)
  )
    return issue("container-is-not-terminal");
  if (
    resolved.readOnly ||
    !canUpdateInlineField(permissions, resolved.permissionPath)
  )
    return issue("read-only", "info");
  if (state?.passesCondition === false)
    return issue("condition-hidden", "info");
  const components =
    resolved.field.admin && "components" in resolved.field.admin
      ? resolved.field.admin.components
      : undefined;
  if (
    state?.customComponents?.Field ||
    (components &&
      typeof components === "object" &&
      "Field" in components &&
      components.Field)
  )
    return issue("native-override", "info");
  if (
    edit !== "panel" &&
    ["text", "textarea"].includes(resolved.field.type) &&
    interactiveMarkup
  )
    return issue("unsafe-text-markup");
  return occurrences > 1 ? issue("repeated-occurrence", "info") : [];
}
