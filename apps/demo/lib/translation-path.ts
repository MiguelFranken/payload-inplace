export const translationLocales = ["en", "de"] as const;
export type TranslationLocale = (typeof translationLocales)[number];

export function translationPath(
  locale: TranslationLocale,
  slug: string,
): string {
  return `/translations/${locale}/${encodeURIComponent(slug)}`;
}
