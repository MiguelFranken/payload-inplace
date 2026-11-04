/** Keep upstream root-relative lengths inside the native island; a site's html font size must not scale CMS fields.
 * @param {string} value Native declaration value, including Emotion's generated rules.
 */
export function nativeStyleUnits(value) {
  return value.replace(
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|url\([^)]*\))|(?<![\w.-])(-?(?:\d*\.)?\d+)rem\b/gi,
    (match, literal, number) =>
      literal ? match : `calc(${number} * var(--pve-native-rem, 13px))`,
  );
}
