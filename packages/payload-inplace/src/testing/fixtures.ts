import type { ClientField, FormState } from "payload";
import { editable } from "../../../core/src/editable.js";

/** Synthetic schema/content only. It neither connects to Payload nor emulates access, save acknowledgements or transactions. */
export function createEditorFixture() {
  const document = {
    id: "synthetic-page",
    _veRevision: 3,
    updatedAt: "2026-01-01T00:00:00.000Z",
    layout: [
      {
        id: "section.with.dot",
        blockType: "testSection",
        heading: "Synthetic heading",
        price: 12,
        details: { caption: "Grouped caption" },
        items: [{ id: "row.with.dot/%", label: "First row" }],
        empty: [] as { id: string; label: string }[],
      },
    ],
  };
  const fields: ClientField[] = [
    { name: "heading", type: "text" },
    { name: "price", type: "number" },
    {
      name: "details",
      type: "group",
      fields: [{ name: "caption", type: "text" }],
    },
    { name: "items", type: "array", fields: [{ name: "label", type: "text" }] },
    { name: "empty", type: "array", fields: [{ name: "label", type: "text" }] },
  ];
  const target = {
    kind: "collection" as const,
    collection: "testPages",
    id: document.id,
  };
  const binding = editable(target, { enabled: true }).block<
    (typeof document.layout)[number]
  >({ root: "layout", blockId: document.layout[0]!.id });
  return { document, target, fields, binding };
}

/** Deterministically delay/reject a synthetic transport result. No clocks, global state or persistence backend is installed. */
export function createDeferredResponse<T>(signal?: AbortSignal) {
  let resolvePromise!: (value: T) => void,
    rejectPromise!: (error: unknown) => void,
    settled = false;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  const settle = (complete: () => void) => {
    if (settled) return;
    settled = true;
    signal?.removeEventListener("abort", abort);
    complete();
  };
  const abort = () =>
    settle(() =>
      rejectPromise(
        new DOMException("Synthetic request aborted", "AbortError"),
      ),
    );
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  return {
    promise,
    resolve: (value: T) => settle(() => resolvePromise(value)),
    reject: (error: unknown) => settle(() => rejectPromise(error)),
  };
}

/** Snapshot a real native Form supplied by a consumer's mounted harness. Read-only probe: it never prepares fields, changes values or asserts ACL/concurrency on a mock's behalf. */
export function inspectNativeField(
  form: {
    getFields: () => FormState;
    getData: () => Record<string, unknown>;
    disabled: boolean;
  },
  path: string,
) {
  const field = form.getFields()[path];
  return {
    exists: Boolean(field),
    value: structuredClone(field?.value),
    passesCondition: field?.passesCondition !== false,
    formDisabled: form.disabled,
    error: field?.errorMessage,
    revision: form.getData()._veRevision,
    rowIDs: field?.rows?.map((row) => String(row.id)) || [],
  };
}
