/** A cookie payload is only a routing hint, never draft authority. The destination must run readPageEditContext again.
 * This dependency-free helper lets a host keep its published and activated Next entry bundles separate at the same browser URL.
 */
export function hasPageEditorSession(
  headers: Headers,
  pathname: string,
  now = Date.now(),
): boolean {
  return (headers.get("cookie") || "").split(";").some((entry) => {
    const [name, value] = entry.trim().split("=");
    if (
      !/^payload-ve-[a-zA-Z0-9_-]{32}$/.test(name) ||
      !value ||
      value.length > 4096
    )
      return false;
    try {
      const encoded = value
        .split(".")[0]
        .replaceAll("-", "+")
        .replaceAll("_", "/");
      const bytes = Uint8Array.from(atob(encoded), (char) =>
        char.charCodeAt(0),
      );
      const context = JSON.parse(new TextDecoder().decode(bytes));
      return (
        name === `payload-ve-${context.nonce}` &&
        context.pagePath === pathname &&
        Number.isFinite(context.expires) &&
        context.expires > now
      );
    } catch {
      return false;
    }
  });
}
