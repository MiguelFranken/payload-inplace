import { headers } from "next/headers";
import { getPayload } from "payload";
import config, { editorOptions } from "@payload-config";
import { EditorPageTransition } from "../../../dist/exports/launcher.js";
import "../../styles.css";
import type { ReactNode } from "react";
export default async function Layout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  let editor = false;
  if (
    !editorOptions.disabled &&
    (requestHeaders.get("cookie") || "").includes("payload-token=")
  ) {
    const payload = await getPayload({ config });
    const { user } = await payload.auth({ headers: requestHeaders });
    editor = Boolean(user && ["admin", "editor"].includes(String(user.role)));
  }
  return (
    <html lang="en">
      <body className="demo:m-0 demo:font-sans demo:bg-white demo:text-neutral-950">
        <header data-test-site-header="">
          Website header{" "}
          <a href="/pages/demo#site-footer">Website navigation</a>
        </header>
        {editor ? (
          <EditorPageTransition>{children}</EditorPageTransition>
        ) : (
          children
        )}
        <footer id="site-footer">Website footer</footer>
      </body>
    </html>
  );
}
