"use client";
import type { ReactNode } from "react";
import { chrome } from "./chrome.js";

const metadata = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "_status",
  "_veRevision",
  "_veReviewToken",
  "_veActivation",
]);
function label(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}
function equal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((k) => equal((a as any)[k], (b as any)[k]))
  );
}
function Value({
  value,
  empty,
  depth = 0,
}: {
  value: any;
  empty: string;
  depth?: number;
}): ReactNode {
  if (value === null || value === undefined || value === "")
    return <span className={chrome.muted}>{empty}</span>;
  if (typeof value !== "object")
    return (
      <span className="pve:whitespace-pre-wrap pve:[overflow-wrap:anywhere]">
        {String(value)}
      </span>
    );
  // Lexical content is read as text, never injected as HTML. Keep its complete structure available below.
  if (value.root?.children)
    return (
      <Value value={value.root.children} empty={empty} depth={depth + 1} />
    );
  if (typeof value.text === "string") return value.text;
  if (Array.isArray(value))
    return value.length ? (
      <ol className="pve:m-0 pve:grid pve:gap-4 pve:ps-5">
        {value.map((entry, i) => (
          <li key={i}>
            <Value value={entry} empty={empty} depth={depth + 1} />
          </li>
        ))}
      </ol>
    ) : (
      <span className={chrome.muted}>{empty}</span>
    );
  if (Array.isArray(value.children))
    return <Value value={value.children} empty={empty} depth={depth + 1} />;
  return (
    <dl className="pve:m-0 pve:grid pve:gap-3">
      {Object.entries(value)
        .filter(([key]) => !["id", "blockName"].includes(key))
        .map(([key, entry]) => (
          <div key={key} className="pve:grid pve:gap-1">
            <dt className={`pve:text-xs ${chrome.muted}`}>{label(key)}</dt>
            <dd className="pve:m-0">
              <Value value={entry} empty={empty} depth={depth + 1} />
            </dd>
          </div>
        ))}
    </dl>
  );
}

/** Compares the entire authorized saved document, including fields outside the selected visual root.
 * Native metadata is excluded only at the document level; nested content and stable row identity still affect comparison.
 */
export function DocumentReview({
  before,
  after,
  beforeLabel,
  afterLabel,
  de = false,
}: {
  before: Record<string, any> | null;
  after: Record<string, any>;
  beforeLabel: string;
  afterLabel: string;
  de?: boolean;
}) {
  const keys = [
    ...new Set([...Object.keys(before || {}), ...Object.keys(after || {})]),
  ].filter((k) => !metadata.has(k));
  const changes = keys.filter((key) => !equal(before?.[key], after?.[key]));
  const empty = de ? "Kein Inhalt" : "No content";
  return (
    <div className="pve:grid pve:gap-5">
      {!changes.length && (
        <p className={`pve:m-0 pve:text-sm ${chrome.muted}`}>
          {de
            ? "Keine inhaltlichen Änderungen gegenüber der veröffentlichten Version."
            : "No content changes from the published version."}
        </p>
      )}
      {changes.map((key) => (
        <section
          key={key}
          className={`pve:min-w-0 pve:overflow-hidden pve:rounded-lg pve:border pve:border-solid ${chrome.border}`}
        >
          <h3
            className={`pve:m-0 pve:bg-[var(--theme-elevation-50)] pve:px-5 pve:py-3 pve:text-sm pve:font-semibold ${chrome.border}`}
          >
            {label(key)}
          </h3>
          <div className="pve:grid pve:min-w-0 pve:gap-6 pve:p-5 pve:md:grid-cols-2">
            {[
              [beforeLabel, before?.[key]],
              [afterLabel, after?.[key]],
            ].map(([title, value], i) => (
              <div
                key={i}
                className="pve:grid pve:min-w-0 pve:content-start pve:gap-3 pve:text-sm pve:leading-relaxed"
              >
                <h4
                  className={`pve:m-0 pve:text-xs pve:font-medium ${chrome.muted}`}
                >
                  {title}
                </h4>
                <Value value={value} empty={empty} />
              </div>
            ))}
          </div>
        </section>
      ))}
      <details
        className={`pve:rounded-lg pve:border pve:border-solid pve:p-5 ${chrome.border}`}
      >
        <summary className="pve:cursor-pointer pve:text-sm pve:font-medium">
          {de
            ? "Gesamten gespeicherten Entwurf anzeigen"
            : "View complete saved draft"}
        </summary>
        <div className="pve:mt-5 pve:grid pve:gap-6">
          {keys.map((key) => (
            <section
              key={key}
              className="pve:grid pve:gap-3 pve:text-sm pve:leading-relaxed"
            >
              <h3 className={chrome.heading}>{label(key)}</h3>
              <Value value={after[key]} empty={empty} />
            </section>
          ))}
        </div>
      </details>
    </div>
  );
}
