"use client";

import { useEditorMessages } from "@payload-inplace/ui/localization/EditorMessages";

import type { ClientBlock, ClientField } from "payload";
import { DocumentDiff } from "@payload-inplace/ui/review/document-diff";
import { documentChanges, presentDocumentChange } from "../state/document-diff";

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
  const messages = useEditorMessages(undefined, de ? "de" : "en"),
    { locale } = messages;

  const changes = documentChanges(
    before,
    after,
    fields,
    blocksMap,
    locale,
    messages,
  );
  return (
    <DocumentDiff
      beforeLabel={beforeLabel}
      afterLabel={afterLabel}
      locale={locale}
      onLocate={onLocate}
      changes={changes.map((change) => presentDocumentChange(change, messages))}
    />
  );
}
