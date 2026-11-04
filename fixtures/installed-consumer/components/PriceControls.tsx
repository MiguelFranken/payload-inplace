"use client";
import type { FieldStrategyDefinition } from "payload-inplace/frontend";
/** Shared between the isolated control test and the actual native integration; registration stays in an active-only module. */
export const priceControls: FieldStrategyDefinition<"number"> = {
  id: "synthetic-stepper",
  types: ["number"],
  match: ({ field }) => "name" in field && field.name === "readingTime",
  Component: ({ value, setValue, disabled, error, openNative }) => (
    <div>
      <button disabled={disabled} onClick={() => setValue((value || 0) + 1)}>
        Increase {value}
      </button>
      {error && <p role="alert">{error}</p>}
      <button onClick={openNative}>Native options</button>
    </div>
  ),
};
