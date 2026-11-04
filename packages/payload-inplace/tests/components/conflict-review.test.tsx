import { expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
const native = vi.hoisted(() => ({
  data: {
    id: 1,
    title: "Mine",
    _veRevision: 1,
    _veActivation: "synthetic-proof",
  },
  replaceState: vi.fn(),
  setData: vi.fn(),
  setDisabled: vi.fn(),
  setModified: vi.fn(),
  resume: vi.fn(),
  getFormState: vi.fn(),
}));
vi.mock("@payloadcms/ui", () => ({
  useConfig: () => ({ config: { routes: { api: "/api" }, blocksMap: {} } }),
  useDocumentInfo: () => ({
    id: 1,
    collectionSlug: "pages",
    data: { id: 1, title: "Before", _veRevision: 1 },
    docConfig: { fields: [{ name: "title", type: "text" }] },
    docPermissions: { update: true },
    setData: native.setData,
  }),
  useForm: () => ({
    getData: () => native.data,
    getFields: () => ({
      title: { value: native.data.title },
      _veRevision: { value: 1 },
      _veActivation: { value: "synthetic-proof" },
    }),
    replaceState: native.replaceState,
    setDisabled: native.setDisabled,
    setModified: native.setModified,
  }),
  useServerFunctions: () => ({ getFormState: native.getFormState }),
  useLocale: () => ({ code: undefined }),
}));
vi.mock("../../src/frontend/recovery.js", () => ({
  useEditorRecovery: () => ({ resume: native.resume }),
}));
import { ConflictReview } from "../../src/frontend/ConflictReview.js";
beforeEach(() => {
  vi.clearAllMocks();
  native.data.title = "Mine";
  native.getFormState.mockImplementation(async ({ data }) => ({
    state: {
      title: { value: data.title },
      _veRevision: { value: data._veRevision },
    },
  }));
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({ document: { id: 1, title: "Theirs", _veRevision: 2 } }),
    ),
  );
});
afterEach(() => vi.restoreAllMocks());
it("requires an explicit overlap choice and updates only native Form after acceptance", async () => {
  const applied = vi.fn();
  render(<ConflictReview onApplied={applied} />);
  const button = await screen.findByText("Use combined copy and save");
  expect(button.hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("radio", { name: "Use latest saved copy" }));
  expect(button.hasAttribute("disabled")).toBe(false);
  fireEvent.click(button);
  await waitFor(() => expect(applied).toHaveBeenCalledOnce());
  expect(native.getFormState).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        title: "Theirs",
        _veRevision: 2,
        _veActivation: "synthetic-proof",
        _status: "draft",
      }),
    }),
  );
  expect(native.replaceState).toHaveBeenCalledOnce();
  expect(native.resume).toHaveBeenCalledOnce();
});
it("does not overwrite input that changed while the comparison was open", async () => {
  const applied = vi.fn();
  render(<ConflictReview onApplied={applied} />);
  const button = await screen.findByText("Use combined copy and save");
  fireEvent.click(screen.getByRole("radio", { name: "Keep your copy" }));
  native.data.title = "Newer local input";
  fireEvent.click(button);
  await screen.findByRole("alert");
  expect(native.replaceState).not.toHaveBeenCalled();
  expect(applied).not.toHaveBeenCalled();
});
it("cancellation aborts a pending comparison and never modifies native fields", async () => {
  let signal: AbortSignal | undefined;
  vi.mocked(fetch).mockImplementation((_url, options) => {
    signal = options?.signal || undefined;
    return new Promise(() => {});
  });
  const view = render(<ConflictReview onApplied={vi.fn()} />);
  view.unmount();
  expect(signal?.aborted).toBe(true);
  expect(native.replaceState).not.toHaveBeenCalled();
});
