import { it, expect } from "vitest";
import { protectNativeAcknowledgement } from "../../src/state/acknowledgement.js";
it("protects multiple later keystrokes even when native isModified marks only the last field", () => {
  const submitted = {
    title: { value: "sent" },
    caption: { value: "sent caption" },
    _veRevision: { value: 1 },
  };
  const current = {
    title: { value: "new title" },
    caption: { value: "new caption", isModified: true },
    _veRevision: { value: 1 },
  };
  const safe = protectNativeAcknowledgement(
    { ...submitted, _veRevision: { value: 2 } },
    submitted,
    current,
  );
  expect(safe.title?.value).toBeUndefined();
  expect(safe.caption?.value).toBeUndefined();
  expect(safe._veRevision.value).toBe(2);
});
it("does not apply stale row metadata to a different row after reordering", () => {
  const submitted = {
    layout: { value: 2, rows: [{ id: "a" }, { id: "b" }] },
    "layout.0.heading": { value: "A" },
  } as any;
  const current = {
    layout: { value: 2, rows: [{ id: "b" }, { id: "a" }] },
    "layout.0.heading": { value: "B" },
  } as any;
  expect(
    protectNativeAcknowledgement(submitted, submitted, current)[
      "layout.0.heading"
    ],
  ).toBeUndefined();
});

it("keeps unchanged server normalization and revision acknowledgement while rejecting stale row order", () => {
  const submitted: any = {
    title: { value: "  Title  " },
    layout: { value: 2, rows: [{ id: "a" }, { id: "b" }] },
  };
  const current: any = {
    title: { value: "  Title  ", isModified: true },
    layout: { value: 2, rows: [{ id: "b" }, { id: "a" }] },
  };
  const incoming: any = {
    title: { value: "Title", initialValue: "Title" },
    layout: { value: 2, rows: [{ id: "a" }, { id: "b" }] },
  };
  const safe = protectNativeAcknowledgement(incoming, submitted, current);
  expect(safe.title?.value).toBe("Title");
  expect(safe.layout?.rows).toBeUndefined();
});

it("rejects stale validation metadata after a sibling value or row order changes", async () => {
  const { nativeSnapshotMatches } = await import(
    "../../src/state/acknowledgement.js"
  );
  expect(
    nativeSnapshotMatches(
      { title: { value: "old" } },
      { title: { value: "new" } },
    ),
  ).toBe(false);
  expect(
    nativeSnapshotMatches(
      { title: { value: "same", valid: false } },
      { title: { value: "same", valid: true } },
    ),
  ).toBe(true);
});
