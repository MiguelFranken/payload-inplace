/** Resolve consumer/native label dictionaries with exact locale, language and English fallback.
 * Values remain plain text; components/functions retain their owner's native rendering path.
 */
export function localizedLabel(
  value: unknown,
  locale: string,
  fallback: string,
): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return fallback;
  const labels = value as Record<string, unknown>;
  for (const key of [locale, locale.split("-")[0] || "en", "en"]) {
    if (typeof labels[key] === "string") return labels[key];
  }
  return fallback;
}
