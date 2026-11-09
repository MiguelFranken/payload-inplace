import { describe, expect, it } from "vitest";
import { autosaveDelay, authoredFieldKey } from "../../src/state/autosave";
describe("native autosave idle policy", () => {
  it("batches legacy short intervals while respecting longer consumer intervals", () => {
    expect(autosaveDelay(100)).toBe(1500);
    expect(autosaveDelay(2000)).toBe(2000);
    expect(autosaveDelay(NaN)).toBe(1500);
  });
  it("ignores metadata changes and tracks authored values and stable row order", () => {
    const field = { value: "a", valid: true };
    expect(
      authoredFieldKey({ updatedAt: { value: "old" }, title: field }),
    ).toBe(authoredFieldKey({ title: field, updatedAt: { value: "new" } }));
    expect(authoredFieldKey({ title: field })).toBe(
      authoredFieldKey({ title: { ...field, valid: false } }),
    );
    expect(authoredFieldKey({ title: field })).not.toBe(
      authoredFieldKey({ title: { ...field, value: "ab" } }),
    );
    expect(
      authoredFieldKey({ layout: { rows: [{ id: "a" }, { id: "b" }] } }),
    ).not.toBe(
      authoredFieldKey({ layout: { rows: [{ id: "b" }, { id: "a" }] } }),
    );
  });
});

it("allows explicit recovery without acknowledging the failed native write or allowing another automatic retry", async () => {
  const { canScheduleNativeSave } = await import("../../src/state/autosave");
  expect(canScheduleNativeSave(0, 0, 0)).toBe(true);
  expect(canScheduleNativeSave(1, 0, 0)).toBe(false);
  expect(canScheduleNativeSave(1, 0, 1)).toBe(true);
  expect(canScheduleNativeSave(2, 0, 1)).toBe(false);
  expect(canScheduleNativeSave(2, 2, 1)).toBe(true);
});
