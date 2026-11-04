/** The demo's public URL contract is shared by launchers, redirects and the reauthorized entry. It carries no authorization. */
export function commercePath(
  collection: string,
  slug: string,
): string | undefined {
  if (collection === "shops" && slug === "home") return "/shop";
  if (collection === "shops") return `/shops/${encodeURIComponent(slug)}`;
  if (collection === "products") return `/products/${encodeURIComponent(slug)}`;
  return undefined;
}

/** Resolve only configured collection roots. Unknown routes must never silently select a different document surface. */
export function demoRoot(collection: string): string {
  return collection === "products"
    ? "presentation.layout"
    : collection === "offers"
      ? "detailPage.layout"
      : "layout";
}
