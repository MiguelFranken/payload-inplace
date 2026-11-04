"use client";
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
        throw Error(
          de
            ? "Wiederherstellen fehlgeschlagen. Aktuellen Entwurf neu laden und prüfen."
            : "Restore failed. Reload and review the latest draft.",
        );
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
      <h1>{de ? "Version wiederherstellen" : "Restore version"}</h1>
      <p>
        {de
          ? "Die Version wird als Entwurf wiederhergestellt. Danach Änderungen prüfen und veröffentlichen."
          : "Restore creates a draft. Review its changes before publishing."}
      </p>
      <DocumentReview
        before={current as any}
        after={historical as any}
        de={de}
        beforeLabel={de ? "Aktueller Entwurf" : "Current draft"}
        afterLabel={de ? "Gewählte Version" : "Selected version"}
      />
      {error && <p role="alert">{error}</p>}
      <Button type="button" disabled={busy} onClick={() => void restore()}>
        {de ? "Als Entwurf wiederherstellen" : "Restore as draft"}
      </Button>
    </section>
  );
}
