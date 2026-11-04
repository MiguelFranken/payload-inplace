"use client";
import type { BlocksFieldClientProps } from "payload";
import { BlocksField, Button, useDocumentInfo, useFormModified, useTranslation } from "@payloadcms/ui";
/** Native CMS fallback plus an optional link; the editing experience lives on the website frontend. */
export function VisualBlocksField(props: BlocksFieldClientProps & {root: string; editorPath?: string}) {
  const info = useDocumentInfo();
  const modified = useFormModified();
  const {i18n} = useTranslation();
  const url = `${props.editorPath ?? "/visual-editor"}/start?collection=${encodeURIComponent(info.collectionSlug || "")}&id=${encodeURIComponent(String(info.id))}&root=${encodeURIComponent(props.root)}`;
  return <>{info.id && info.hasSavePermission && !props.readOnly && <>
    <Button type="button" buttonStyle="secondary" disabled={modified} el="anchor" url={url}>{i18n.language === "de" ? "Auf der Website bearbeiten" : "Edit on website"}</Button>
    {modified && <p>{i18n.language === "de" ? "Entwurf speichern, bevor du die Website öffnest." : "Save the draft before opening the website."}</p>}
  </>}<BlocksField {...props} /></>;
}
