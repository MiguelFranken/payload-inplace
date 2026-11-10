import { isDocumentMetadataField } from "@payload-inplace/core/document-metadata";
import type { FormState } from "payload";

/** Local preview is immediate; persistence waits for a typing pause even when a consumer's legacy live-preview interval is very short. */
export function autosaveDelay(configured: number): number {
  return Number.isFinite(configured) ? Math.max(1500, configured) : 1500;
}

function authoredPaths(paths: string[]): string[] {
  return paths
    .filter((path) => !isDocumentMetadataField(path))
    .sort((a, b) => a.localeCompare(b));
}

function serializeAuthoredFields(fields: FormState, paths: string[]): string {
  return JSON.stringify(
    paths.map((path) => {
      const state = fields[path]!;
      return [
        path,
        state.value,
        state.rows?.map((row) => [row.id, row.blockType]),
      ];
    }),
  );
}

/** Native validation/condition acknowledgements do not restart the idle timer; only authored values and row identity/order do. */
export function authoredFieldKey(fields: FormState): string {
  return serializeAuthoredFields(fields, authoredPaths(Object.keys(fields)));
}

/** Reuse native field order across keystrokes. Values are read on every call, including in-place updates from custom fields. */
export function createAuthoredFieldKey() {
  let previous: string[] = [];
  let ordered: string[] = [];
  return (fields: FormState): string => {
    const paths = Object.keys(fields);
    if (
      paths.length !== previous.length ||
      paths.some((path, index) => path !== previous[index])
    ) {
      previous = paths;
      ordered = authoredPaths(paths);
    }
    return serializeAuthoredFields(fields, ordered);
  };
}

/** A failed/unacknowledged native attempt cannot retry on a timer. Explicit recovery authorizes only the attempt the editor reviewed. */
export function canScheduleNativeSave(
  attempt: number,
  acknowledged: number,
  retryAuthorized: number,
): boolean {
  return attempt <= Math.max(acknowledged, retryAuthorized);
}
