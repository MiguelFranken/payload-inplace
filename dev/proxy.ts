import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { hasPageEditorSession } from "../dist/exports/routing.js";
/** Keep the actual browser URL and common website layout while selecting a separate, reauthorized authoring bundle. */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (
    process.env.VE_DISABLED !== "1" &&
    request.cookies.has("payload-token") &&
    (path === "/shop" ||
      /^\/(pages|offers|shops|products)\/[^/]+$/.test(path)) &&
    hasPageEditorSession(request.headers, path)
  ) {
    const url = new URL(request.url);
    url.pathname = `/pve${path}`;
    const response = NextResponse.rewrite(url);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Vary", "Cookie");
    return response;
  }
  return NextResponse.next();
}
export const config = {
  matcher: [
    "/shop",
    "/pages/:slug",
    "/offers/:slug",
    "/shops/:slug",
    "/products/:slug",
  ],
};
