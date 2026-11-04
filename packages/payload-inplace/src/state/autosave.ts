import type { FormState } from "payload";

/** Local preview is immediate; persistence waits for a typing pause even when a consumer's legacy live-preview interval is very short. */
export function autosaveDelay(configured: number): number {
  return Number.isFinite(configured) ? Math.max(1500, configured) : 1500;
}

/** Native validation/condition acknowledgements do not restart the idle timer; only authored values and row identity/order do. */
export function authoredFieldKey(fields: FormState): string {
  return JSON.stringify(
    Object.entries(fields)
      .filter(
        ([path]) =>
          ![
            "id",
            "createdAt",
            "updatedAt",
            "_status",
            "_veRevision",
            "_veActivation",
            "_veReviewToken",
            "_veRestoreVersion",
          ].includes(path),
      )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, state]) => [
        path,
        state.value,
        state.rows?.map((row) => [row.id, row.blockType]),
      ]),
  );
}
