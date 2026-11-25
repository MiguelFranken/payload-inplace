"use client";

import { useEditorMessages } from "@payload-inplace/ui/localization/EditorMessages";

import { Button, useConfig, useTranslation, useLocale } from "@payloadcms/ui";
import type { ClientBlock } from "payload";
import { useState } from "react";
import { DocumentReview } from "./DocumentReview";

/** Restoring creates a guarded draft; publication remains a separate reviewed operation. */
export function GuardedRestore({
  collection,
  global,
  root,
  editorPath = "/visual-editor",
  id,
  versionID,
  revision,
  current,
  historical,
  reviewedLocale,
  restoreLocales = [],
}: {
  collection?: string;
  global?: string;
  root?: string;
  editorPath?: string;
  id?: string | number;
  versionID: string;
  revision: number;
  current: unknown;
  historical: unknown;
  reviewedLocale?: string;
  restoreLocales?: string[];
}) {
  const { config, getEntityConfig } = useConfig(),
    { i18n } = useTranslation();
  const { t, locale: uiLocale } = useEditorMessages(undefined, i18n.language);

  const locale = useLocale();
  const entity = getEntityConfig(
    global ? { globalSlug: global } : { collectionSlug: collection },
  );
  const de = i18n.language === "de";
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function restore() {
    if (global || !collection || id == null) return;
    setBusy(true);
    setError("");
    const query = new URLSearchParams({ draft: "true" });
    if (reviewedLocale) {
      query.set("locale", reviewedLocale);
      query.set("fallback-locale", "null");
    }
    try {
      const response = await fetch(
        `${config.routes.api}/${collection}/versions/${encodeURIComponent(versionID)}?${query}`,
        {
          method: "POST",
          headers: { "x-visual-editor-revision": String(revision) },
        },
      );
      if (!response.ok)
        throw Error(t("restoreFailedReloadAndReviewTheLatestDraft"));
      window.location.assign(
        `${config.routes.admin}/collections/${collection}/${encodeURIComponent(id)}${reviewedLocale ? `?locale=${encodeURIComponent(reviewedLocale)}` : ""}`,
      );
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <section className="pve:grid pve:gap-5 pve:p-[var(--gutter-h)]">
      <h1>{t("restoreVersion")}</h1>
      <p>
        {global
          ? t("globalRestoreNativeUnsupported")
          : t("restoreCreatesADraftReviewItsChangesBeforePublishing")}
      </p>
      {reviewedLocale && restoreLocales.length > 1 && (
        <p>
          {t("nativeCollectionRestoreScope", {
            locale: reviewedLocale,
            locales: new Intl.ListFormat(uiLocale).format(restoreLocales),
          })}
        </p>
      )}
      <DocumentReview
        before={current as any}
        after={historical as any}
        de={de}
        beforeLabel={t("currentDraft")}
        afterLabel={t("selectedVersion")}
        fields={entity?.fields}
        blocksMap={config.blocksMap as Record<string, ClientBlock>}
      />
      {error && <p role="alert">{error}</p>}
      {global ? (
        root && (
          <Button
            el="anchor"
            url={`${editorPath}/start?kind=global&global=${encodeURIComponent(global)}&root=${encodeURIComponent(root || "")}${locale.code ? `&locale=${encodeURIComponent(locale.code)}` : ""}`}
          >
            {t("editOnWebsite")}
          </Button>
        )
      ) : (
        <Button type="button" disabled={busy} onClick={() => void restore()}>
          {t("restoreAsDraft")}
        </Button>
      )}
    </section>
  );
}
