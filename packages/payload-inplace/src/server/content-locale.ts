import type { PayloadRequest } from "payload";

/** Editing always addresses one native content locale. `all` is a read projection, never an authoring scope. UI message locale is deliberately unrelated. */
export function contentLocale(
  req: Pick<PayloadRequest, "locale">,
): string | undefined {
  if (req.locale === "all")
    throw Error("Choose one content locale before editing");
  return typeof req.locale === "string" && req.locale ? req.locale : undefined;
}
