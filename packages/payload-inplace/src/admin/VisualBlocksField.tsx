"use client";
import { useEditorMessages } from "../frontend/messages.js";

import type { BlocksFieldClientProps } from "payload";
import {
  BlocksField,
  Button,
  useDocumentInfo,
  useFormModified,
  useTranslation,
} from "@payloadcms/ui";
/** Native CMS fallback plus an optional link; the editing experience lives on the website frontend. */
export function VisualBlocksField(
  props: BlocksFieldClientProps & { root: string; editorPath?: string },
) {
  const info = useDocumentInfo();
  const modified = useFormModified();
  const { i18n } = useTranslation();
  const { t } = useEditorMessages(undefined, i18n.language);

  const url = `${props.editorPath ?? "/visual-editor"}/start?collection=${encodeURIComponent(info.collectionSlug || "")}&id=${encodeURIComponent(String(info.id))}&root=${encodeURIComponent(props.root)}`;
  return (
    <>
      {info.id && info.hasSavePermission && !props.readOnly && (
        <>
          <Button
            type="button"
            buttonStyle="secondary"
            disabled={modified}
            el="anchor"
            url={url}
          >
            {t("editOnWebsite")}
          </Button>
          {modified && <p>{t("saveTheDraftBeforeOpeningTheWebsite")}</p>}
        </>
      )}
      <BlocksField {...props} />
    </>
  );
}
