import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useSectionComparison } from "../../src/frontend/controllers/section-comparison";
import { showPublishedSections } from "../../src/frontend/comparison-preview";

const request = { url: "/api/compare", proof: "signed", revision: 4 };
const snapshot = {
  revision: 4,
  draft: [{ id: "d" }],
  published: [{ id: "p" }],
};

afterEach(() => vi.unstubAllGlobals());

it("keeps a cancelled response from reopening comparison", async () => {
  let finish!: (response: Response) => void;
  const fetch = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  vi.stubGlobal("fetch", fetch);
  const { result } = renderHook(() => useSectionComparison(request));

  let pending!: Promise<void>;
  act(() => {
    pending = result.current.open();
  });
  expect(result.current.state.kind).toBe("loading");
  act(() => result.current.close());
  await act(async () => {
    finish(Response.json(snapshot));
    await pending;
  });

  expect(result.current.state.kind).toBe("closed");
  expect(fetch.mock.calls).toHaveLength(1);
});

it("does not switch to published sections from another saved revision", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ ...snapshot, revision: 5 })),
  );
  const { result } = renderHook(() => useSectionComparison(request));
  await act(() => result.current.open());
  act(() => result.current.select("published"));
  expect(result.current.state.kind).toBe("stale");
});

it("substitutes only the active root and keeps the native draft projection intact", () => {
  const draft = {
    title: "Draft",
    main: { intro: "Keep", layout: snapshot.draft },
  };
  const published = showPublishedSections(draft, {
    root: "main.layout",
    rows: snapshot.published,
  });
  expect(published).toEqual({
    title: "Draft",
    main: { intro: "Keep", layout: snapshot.published },
  });
  expect(draft.main.layout).toBe(snapshot.draft);
});
