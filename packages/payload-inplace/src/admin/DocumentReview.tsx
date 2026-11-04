"use client";
import { useEditorMessages } from "../frontend/messages.js";

import type { ClientBlock, ClientField } from "payload";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  Minus,
  LocateFixed,
  Plus,
} from "lucide-react";
import {
  documentChanges,
  reviewText,
  changedText,
} from "../state/document-diff.js";
import { Button } from "../frontend/ui/button.js";
import { chrome } from "./chrome.js";

/** Only changed native leaves and structural operations are shown; unchanged sibling rows never flood the review. */
export function DocumentReview({
  before,
  after,
  beforeLabel,
  afterLabel,
  de = false,
  fields = [],
  blocksMap = {},
  onLocate,
}: {
  onLocate?: (path: string) => void;
  before: Record<string, any> | null;
  after: Record<string, any>;
  beforeLabel: string;
  afterLabel: string;
  de?: boolean;
  fields?: ClientField[];
  blocksMap?: Record<string, ClientBlock>;
}) {
  const { t, locale } = useEditorMessages(undefined, de ? "de" : "en");

  const changes = documentChanges(before, after, fields, blocksMap, locale);
  const empty = t("empty");
  if (!changes.length)
    return (
      <div className="pve:grid pve:justify-items-center pve:gap-3 pve:py-16 pve:text-center">
        <Check size={24} aria-hidden="true" />
        <h3 className="pve:m-0 pve:text-base pve:font-semibold">
          {t("noChanges")}
        </h3>
        <p
          className={`pve:m-0 pve:max-w-prose pve:text-sm pve:leading-relaxed ${chrome.muted}`}
        >
          {t("thisDraftMatchesTheSelectedComparison")}
        </p>
      </div>
    );
  return (
    <div className="pve:grid pve:gap-4" data-ve-document-diff="">
      {changes.map((change) => {
        const a = reviewText(change.before),
          b = reviewText(change.after),
          text = changedText(a, b);
        const status =
          change.kind === "added"
            ? t("added")
            : change.kind === "removed"
              ? t("removed")
              : change.kind === "moved"
                ? t("moved")
                : t("changed");
        return (
          <section
            key={change.path}
            data-ve-diff-path={change.path}
            className={`pve:min-w-0 pve:overflow-hidden pve:rounded-xl pve:border pve:border-solid ${chrome.border}`}
          >
            <header className="pve:flex pve:flex-wrap pve:items-center pve:justify-between pve:gap-2 pve:bg-[var(--pve-hover,var(--theme-elevation-50))] pve:px-4 pve:py-3">
              <h3 className="pve:m-0 pve:flex pve:min-w-0 pve:flex-wrap pve:items-center pve:gap-1 pve:text-sm pve:font-medium pve:leading-relaxed">
                {change.labels.map((name, index) => (
                  <span
                    key={index}
                    className="pve:inline-flex pve:items-center pve:gap-1"
                  >
                    {index > 0 && (
                      <ArrowRight
                        size={12}
                        aria-hidden="true"
                        className={chrome.muted}
                      />
                    )}
                    {name}
                  </span>
                ))}
              </h3>
              {onLocate && (
                <Button
                  size="icon"
                  className="pve:size-8 pve:ms-auto"
                  aria-label={`${t("showOnPage")}: ${change.labels.join(" / ")}`}
                  tooltip={t("showOnPage")}
                  onClick={() => onLocate(change.path)}
                >
                  <LocateFixed size={15} />
                </Button>
              )}
              <span
                className={`pve:inline-flex pve:items-center pve:gap-1 pve:text-xs ${chrome.muted}`}
              >
                {change.kind === "added" ? (
                  <Plus size={13} />
                ) : change.kind === "removed" ? (
                  <Minus size={13} />
                ) : change.kind === "moved" ? (
                  <ArrowDown size={13} />
                ) : null}
                {status}
              </span>
            </header>
            {change.kind === "moved" ? (
              <p className="pve:m-0 pve:flex pve:items-center pve:gap-3 pve:p-4 pve:text-sm">
                <ArrowUp size={16} aria-hidden="true" />
                {de
                  ? t("positionChange", { from: change.from!, to: change.to! })
                  : t("positionChange", { from: change.from!, to: change.to! })}
              </p>
            ) : (
              <div className="pve:grid pve:min-w-0 pve:md:grid-cols-2">
                <div className="pve:min-w-0 pve:p-4">
                  <h4
                    className={`pve:mb-3 pve:mt-0 pve:flex pve:items-center pve:gap-1.5 pve:text-xs pve:font-medium ${chrome.muted}`}
                  >
                    <Minus size={13} aria-hidden="true" />
                    {beforeLabel}
                  </h4>
                  <p className="pve:m-0 pve:whitespace-pre-wrap pve:text-sm pve:leading-relaxed pve:[overflow-wrap:anywhere]">
                    {a ? (
                      <>
                        {text.prefix}
                        {text.removed && (
                          <del className="pve:rounded-sm pve:bg-[var(--pve-diff-removed-bg,#fef2f2)] pve:text-[var(--pve-diff-removed-text,#912018)]">
                            {text.removed}
                          </del>
                        )}
                        {text.suffix}
                      </>
                    ) : (
                      <span className={chrome.muted}>{empty}</span>
                    )}
                  </p>
                </div>
                <div
                  className={`pve:min-w-0 pve:border-0 pve:border-t pve:border-solid pve:p-4 pve:md:border-l pve:md:border-t-0 ${chrome.border}`}
                >
                  <h4
                    className={`pve:mb-3 pve:mt-0 pve:flex pve:items-center pve:gap-1.5 pve:text-xs pve:font-medium ${chrome.muted}`}
                  >
                    <Plus size={13} aria-hidden="true" />
                    {afterLabel}
                  </h4>
                  <p className="pve:m-0 pve:whitespace-pre-wrap pve:text-sm pve:leading-relaxed pve:[overflow-wrap:anywhere]">
                    {b ? (
                      <>
                        {text.prefix}
                        {text.added && (
                          <ins className="pve:rounded-sm pve:bg-[var(--pve-diff-added-bg,#ecfdf3)] pve:text-[var(--pve-diff-added-text,#067647)] pve:no-underline">
                            {text.added}
                          </ins>
                        )}
                        {text.suffix}
                      </>
                    ) : (
                      <span className={chrome.muted}>{empty}</span>
                    )}
                  </p>
                  {a === b && (
                    <p
                      className={`pve:mb-0 pve:mt-3 pve:text-xs pve:leading-relaxed ${chrome.muted}`}
                    >
                      {t("formattingOrEmbeddedContentChanged")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
