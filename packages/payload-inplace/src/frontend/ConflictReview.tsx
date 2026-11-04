"use client";
import type { EditorStaticMessageKey } from "../i18n/catalogue.js";
import { EditorMessageError, editorErrorKey } from "../i18n/failure.js";
import {
  nativeDocumentArgs,
  targetFromNativeInfo,
  targetSlug,
} from "../state/document-target.js";
import { useEditorMessages } from "./messages.js";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { useEffect, useId, useRef, useState } from "react";
import {
  useConfig,
  useDocumentInfo,
  useForm,
  useServerFunctions,
  useLocale,
} from "@payloadcms/ui";
import type { ClientBlock, ClientField } from "payload";
import {
  reconcileDocuments,
  resolveReconciliation,
  type DocumentReconciliation,
} from "../state/reconcile.js";
import { authoredFieldKey } from "../state/autosave.js";
import { DocumentReview } from "../admin/DocumentReview.js";
import { reviewText } from "../state/document-diff.js";
import { Button } from "./ui/button.js";
import { useEditorRecovery } from "./recovery.js";
/** This panel owns comparison snapshots only. Cancellation changes no native values; explicit acceptance rehydrates the sole Form and its existing save queue. */
export function ConflictReview({ onApplied }: { onApplied: () => void }) {
  const { t } = useEditorMessages();

  const choiceId = useId();
  const { config } = useConfig(),
    info = useDocumentInfo(),
    form = useForm(),
    { getFormState } = useServerFunctions(),
    locale = useLocale(),
    recovery = useEditorRecovery();
  const [snapshot, setSnapshot] = useState<{
      base: Record<string, unknown>;
      local: Record<string, unknown>;
      latest: Record<string, unknown>;
      result: DocumentReconciliation;
      key: string;
    }>(),
    [choices, setChoices] = useState<Record<string, "local" | "latest">>({}),
    [loading, setLoading] = useState(true),
    [applying, setApplying] = useState(false),
    [error, setError] = useState<EditorStaticMessageKey | null>(null),
    [tab, setTab] = useState<"local" | "latest">("local");
  const request = useRef<AbortController | null>(null),
    generation = useRef(0);
  const fields = (info.docConfig?.fields || []) as ClientField[],
    blocks = config.blocksMap as Record<string, ClientBlock>;
  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    const current = ++generation.current;
    const base = structuredClone(info.data || {}),
      local = structuredClone(form.getData()),
      key = authoredFieldKey(form.getFields());
    void fetch(
      `${config.routes.api}/visual-editor/latest${locale.code ? `?locale=${encodeURIComponent(locale.code)}&fallback-locale=null` : ""}`,
      {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proof: local._veActivation }),
      },
    )
      .then(async (response) => {
        if (!response.ok)
          throw new EditorMessageError("latestDraftUnavailable");
        return response.json();
      })
      .then(({ document: latest }) => {
        if (controller.signal.aborted || generation.current !== current) return;
        if (key !== authoredFieldKey(form.getFields()))
          throw new EditorMessageError("workingCopyChanged");
        setSnapshot({
          base,
          local,
          latest,
          result: reconcileDocuments(base, local, latest, fields, blocks),
          key,
        });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(editorErrorKey(error, "comparisonUnavailable"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      generation.current++;
    };
    // A comparison is intentionally frozen until dismissed/reopened, never recomputed over typing.
  }, []);
  async function apply() {
    if (!snapshot || applying) return;
    setApplying(true);
    setError(null);
    const current = generation.current;
    try {
      if (snapshot.key !== authoredFieldKey(form.getFields()))
        throw new EditorMessageError("workingCopyChanged");
      const data = resolveReconciliation(snapshot.result, choices);
      data._veActivation = form.getData()._veActivation;
      data._status = "draft";
      const result = await getFormState({
        ...(nativeDocumentArgs(targetFromNativeInfo(info)) as any),
        data,
        docPermissions: info.docPermissions,
        docPreferences: { fields: {} },
        operation: "update",
        renderAllFields: true,
        schemaPath: targetSlug(targetFromNativeInfo(info)),
        skipValidation: true,
        signal: request.current?.signal,
      });
      if (current !== generation.current || request.current?.signal.aborted)
        return;
      if (!result?.state)
        throw new EditorMessageError("nativeFieldsUnavailable");
      result.state._veActivation = {
        ...form.getFields()._veActivation,
        value: data._veActivation,
        initialValue: data._veActivation,
      };
      form.replaceState(result.state);
      info.setData(snapshot.latest);
      form.setDisabled(false);
      form.setModified(true);
      recovery.resume();
      onApplied();
    } catch (error) {
      if (current === generation.current)
        setError(editorErrorKey(error, "recoveryUnavailable"));
    } finally {
      if (current === generation.current) setApplying(false);
    }
  }
  if (loading)
    return <p role="status">{t("loadingTheLatestAuthorizedDraft")}</p>;
  return (
    <div className="pve:grid pve:gap-4">
      <p className="pve:m-0 pve:text-sm">
        {t("compareBothCopiesSeparateFieldChangesAreCombinedOverlapping")}
      </p>
      {error && <p role="alert">{t(error)}</p>}
      {snapshot && (
        <>
          <div
            role="group"
            aria-label={t("compareChanges")}
            className="pve:flex pve:gap-2"
          >
            <Button
              variant="outline"
              aria-pressed={tab === "local"}
              onClick={() => setTab("local")}
            >
              {t("yourChanges")}
            </Button>
            <Button
              variant="outline"
              aria-pressed={tab === "latest"}
              onClick={() => setTab("latest")}
            >
              {t("otherSavedChanges")}
            </Button>
          </div>
          <DocumentReview
            before={snapshot.base}
            after={snapshot[tab]}
            beforeLabel={t("lastSavedCopy")}
            afterLabel={
              tab === "local" ? t("yourWorkingCopy") : t("latestSavedDraft")
            }
            fields={fields}
            blocksMap={blocks}
          />
          {snapshot.result.conflicts.map((conflict) => (
            <fieldset
              key={conflict.path}
              className="pve:m-0 pve:min-w-0 pve:rounded-lg pve:border pve:border-solid pve:border-[var(--pve-border,#e3e4e8)] pve:p-3"
            >
              <legend className="pve:max-w-full pve:break-words pve:text-sm pve:font-medium">
                {conflict.labels.join(" / ")}
              </legend>
              {conflict.structural && (
                <p className="pve:text-sm">
                  {t("thisChoiceReplacesTheWholeListIncludingItsContent")}
                </p>
              )}
              <RadioGroup
                value={choices[conflict.path] || null}
                onValueChange={(choice) => {
                  if (choice === "local" || choice === "latest")
                    setChoices((current) => ({
                      ...current,
                      [conflict.path]: choice,
                    }));
                }}
                aria-label={t("chooseConflictCopy", {
                  label: conflict.labels.join(" / "),
                })}
                className="pve:grid pve:gap-2"
              >
                {(["local", "latest"] as const).map((choice) => (
                  <label
                    key={choice}
                    htmlFor={`${choiceId}:${conflict.path}:${choice}`}
                    aria-label={
                      choice === "local"
                        ? t("keepYourCopy")
                        : t("useLatestSavedCopy")
                    }
                    className="pve:flex pve:items-start pve:gap-2 pve:rounded-lg pve:p-2 pve:text-sm"
                  >
                    <Radio.Root
                      id={`${choiceId}:${conflict.path}:${choice}`}
                      value={choice}
                      aria-label={
                        choice === "local"
                          ? t("keepYourCopy")
                          : t("useLatestSavedCopy")
                      }
                      className="pve:mt-0.5 pve:flex pve:size-4 pve:shrink-0 pve:items-center pve:justify-center pve:rounded-full pve:border pve:border-solid pve:border-[var(--pve-border,#e3e4e8)] pve:bg-transparent pve:data-checked:border-[var(--pve-accent,#3451eb)] pve:focus-visible:outline-2 pve:focus-visible:outline-offset-2 pve:focus-visible:outline-[var(--pve-accent,#3451eb)]"
                    >
                      <Radio.Indicator className="pve:size-2 pve:rounded-full pve:bg-[var(--pve-accent,#3451eb)]" />
                    </Radio.Root>
                    <span className="pve:min-w-0 pve:break-words">
                      <strong>
                        {choice === "local"
                          ? t("keepYourCopy")
                          : t("useLatestSavedCopy")}
                      </strong>
                      <span className="pve:mt-1 pve:block pve:max-h-28 pve:overflow-auto pve:whitespace-pre-wrap pve:opacity-70">
                        {reviewText(conflict[choice]) || t("empty")}
                      </span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </fieldset>
          ))}
          {!snapshot.result.conflicts.length && (
            <p role="status">
              {t("theseChangesAffectSeparateFieldsAndCanBeCombined")}
            </p>
          )}
          <Button
            variant="default"
            disabled={
              applying ||
              snapshot.result.conflicts.some(
                (conflict) => !choices[conflict.path],
              )
            }
            onClick={() => void apply()}
          >
            {applying
              ? t("preparingNativeFields")
              : t("useCombinedCopyAndSave")}
          </Button>
          <p className="pve:m-0 pve:text-xs pve:opacity-70">
            {t("theSaveChecksTheLatestRevisionAgainIfSomeone")}
          </p>
        </>
      )}
    </div>
  );
}
