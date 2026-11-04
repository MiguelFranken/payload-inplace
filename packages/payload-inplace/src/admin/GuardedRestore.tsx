"use client";
import { useEditorMessages } from "../frontend/messages.js";

import { Button, useConfig, useTranslation } from "@payloadcms/ui";
import { useState } from "react";
import { DocumentReview } from "./DocumentReview.js";

/** Restoring creates a guarded draft; publication remains a separate reviewed operation. */
export function GuardedRestore({
  collection,
  id,
  versionID,
  revision,
  current,
  historical,
}: {
  collection: string;
  id: string | number;
  versionID: string;
  revision: number;
  current: unknown;
  historical: unknown;
}) {
  const { config } = useConfig(),
    { i18n } = useTranslation();
  const { t } = useEditorMessages(undefined, i18n.language);

  const de = i18n.language === "de";
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function restore() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `${config.routes.api}/${collection}/versions/${versionID}?draft=true`,
        {
          method: "POST",
          headers: { "x-visual-editor-revision": String(revision) },
        },
      );
      if (!response.ok)
        throw Error(t("restoreFailedReloadAndReviewTheLatestDraft"));
      window.location.assign(
        `${config.routes.admin}/collections/${collection}/${id}`,
      );
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <section className="pve:grid pve:gap-5 pve:p-[var(--gutter-h)]">
      <h1>{t("restoreVersion")}</h1>
      <p>{t("restoreCreatesADraftReviewItsChangesBeforePublishing")}</p>
      <DocumentReview
        before={current as any}
        after={historical as any}
        de={de}
        beforeLabel={t("currentDraft")}
        afterLabel={t("selectedVersion")}
      />
      {error && <p role="alert">{error}</p>}
      <Button type="button" disabled={busy} onClick={() => void restore()}>
        {t("restoreAsDraft")}
      </Button>
    </section>
  );
}
