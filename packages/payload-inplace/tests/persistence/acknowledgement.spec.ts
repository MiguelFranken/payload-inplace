import { it, expect } from "vitest";
import { protectNativeAcknowledgement } from "../../src/state/acknowledgement";
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
    "../../src/state/acknowledgement"
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

it("shares ancestry checks across sibling fields and rejects only the moved subtree", () => {
  let idReads = 0;
  function row(value: string) {
    return {
      get id() {
        idReads++;
        return value;
      },
    };
  }
  const leaves = Object.fromEntries(
    Array.from({ length: 200 }, (_, i) => [
      `layout.0.children.0.field${i}`,
      { value: i },
    ]),
  );
  const submitted = {
    ...leaves,
    layout: { rows: [row("outer")] },
    "layout.0.children": { rows: [row("old-child"), row("other")] },
    "layout.0.heading": { value: "keep" },
  };
  const current = {
    ...submitted,
    layout: { rows: [row("outer")] },
    "layout.0.children": { rows: [row("other"), row("old-child")] },
  };
  const incoming = { ...leaves, "layout.0.heading": { value: "normalized" } };
  expect(protectNativeAcknowledgement(incoming, submitted, current)).toEqual({
    "layout.0.heading": { value: "normalized" },
  });
  expect(idReads).toBe(4);
});

it("rejects a changed outer row even when its nested row ID and value still match", () => {
  const path = "layout.0.children.0.title";
  const submitted = {
    layout: { rows: [{ id: "outer-a" }] },
    "layout.0.children": { rows: [{ id: "same-child" }] },
    [path]: { value: "same text" },
  };
  const current = { ...submitted, layout: { rows: [{ id: "outer-b" }] } };
  expect(
    protectNativeAcknowledgement(
      { [path]: { value: "stale" } },
      submitted,
      current,
    ),
  ).toEqual({});
});

it("compares separately allocated row metadata, counts, and authored fields that only exist in one snapshot", async () => {
  const { nativeSnapshotMatches } = await import(
    "../../src/state/acknowledgement"
  );
  const baseline = { layout: { rows: [{ id: "a", collapsed: true }] } };
  expect(
    nativeSnapshotMatches(baseline, {
      layout: { rows: [{ id: "a", collapsed: false }] },
    }),
  ).toBe(true);
  expect(
    nativeSnapshotMatches(baseline, { layout: { rows: [{ id: "b" }] } }),
  ).toBe(false);
  expect(nativeSnapshotMatches(baseline, { layout: { rows: [] } })).toBe(false);
  expect(nativeSnapshotMatches(baseline, { layout: {} })).toBe(false);
  expect(
    nativeSnapshotMatches(baseline, { ...baseline, newField: { value: 0 } }),
  ).toBe(false);
  expect(
    nativeSnapshotMatches(baseline, {
      ...baseline,
      transient: { valid: true },
    }),
  ).toBe(true);
});

it("rejects old schema data if a block keeps its ID but changes type", async () => {
  const { nativeSnapshotMatches } = await import(
    "../../src/state/acknowledgement"
  );
  const submitted = {
    layout: { value: 1, rows: [{ id: "same-id", blockType: "text" }] },
    "layout.0.heading": { value: "Shared heading" },
  };
  const current = {
    ...submitted,
    layout: { value: 1, rows: [{ id: "same-id", blockType: "hero" }] },
  };
  expect(nativeSnapshotMatches(submitted, current)).toBe(false);
  expect(protectNativeAcknowledgement(submitted, submitted, current)).toEqual(
    {},
  );
});
