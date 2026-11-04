import { headers } from "next/headers";
import { getPayload } from "payload";
import config, { editorOptions } from "@payload-config";
import { EditorPageTransition } from "../../../dist/exports/launcher.js";
import "../../styles.css";
import {
  StorefrontHeader,
  StorefrontFooter,
} from "../../commerce/StorefrontChrome";
import type { ReactNode } from "react";
export const metadata = {
  title: "Still & Form — Furniture for everyday living",
  description:
    "A small, editable homewares storefront powered by Payload Inplace.",
};
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
      <body className="demo:m-0 demo:font-sans demo:bg-canvas demo:text-ink demo:antialiased">
        <StorefrontHeader />
        {editor ? (
          <EditorPageTransition>{children}</EditorPageTransition>
        ) : (
          children
        )}
        <StorefrontFooter />
      </body>
    </html>
  );
}
