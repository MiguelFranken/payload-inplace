"use client";

import { useEditorPreviewData } from "../../../packages/payload-inplace/dist/exports/frontend.js";
import type { EditorTarget } from "../../../packages/payload-inplace/dist/exports/types.js";
import {
  ScopeFixtureView,
  type ScopeFixtureDocument,
} from "./ScopeFixtureView";

const key = (target: EditorTarget) =>
  target.kind === "global"
    ? `g:${target.global}`
    : `c:${target.collection}:${target.id}`;

/** Only the active native Form projects optimistic values. Other documents are authorized saved presentation, with no second client store or save queue. */
export function ScopeFixturePreview({
  documents,
  target,
}: {
  documents: ScopeFixtureDocument[];
  target: EditorTarget;
}) {
  const current = documents.find((item) => key(item.target) === key(target));
  const data = useEditorPreviewData(current!.document);
  return (
    <ScopeFixtureView
      active
      documents={documents.map((item) =>
        key(item.target) === key(target) ? { ...item, document: data } : item,
      )}
    />
  );
}
