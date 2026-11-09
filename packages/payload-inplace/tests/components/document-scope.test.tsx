import { expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render, fireEvent, screen } from "@testing-library/react";
import {
  NativeDocumentScopes,
  useDocumentScopes,
} from "../../src/frontend/document-scope";

const state = vi.hoisted(() => ({
  modified: false,
  processing: false,
  background: false,
  disabled: false,
  failure: null as unknown,
  status: "owned",
  refresh: vi.fn(),
  save: vi.fn(),
  data: { _veActivation: "synthetic-proof", _veRevision: 4 },
  fields: { heading: { value: "Current" } },
  switching: vi.fn(),
}));
vi.mock("@payloadcms/ui", () => ({
  useConfig: () => ({ config: { routes: { api: "/api" } } }),
  useDocumentInfo: () => ({ data: { _veRevision: 4 } }),
  useForm: () => ({
    get disabled() {
      return state.disabled;
    },
    getData: () => state.data,
    getFields: () => state.fields,
  }),
  useWatchForm: () => ({ disabled: state.disabled }),
  useFormModified: () => state.modified,
  useFormProcessing: () => state.processing,
  useFormBackgroundProcessing: () => state.background,
}));
vi.mock("../../src/frontend/recovery.js", () => ({
  useEditorRecovery: () => ({ failure: state.failure }),
}));
vi.mock("../../src/frontend/advisory-lock.js", () => ({
  useAdvisoryLock: () => ({ status: state.status }),
}));
vi.mock("../../src/frontend/controllers/draft-save.js", () => ({
  useNativeDraftSave: () => state.save,
}));
vi.mock("../../src/launcher/EditorPageTransition.js", () => ({
  useEditorPageTransition: () => state.refresh,
}));

const owner = { collection: "pages", id: 1, root: "layout" },
  other = { kind: "global" as const, global: "siteHeader", root: "layout" };

const scopes = [
  { target: owner, label: "Page" },
  { target: other, label: "Header" },
];

function Controls() {
  const scope = useDocumentScopes();
  return (
    <>
      <button
        onClick={() => scope.request({ kind: "global", global: "siteHeader" })}
      >
        Header
      </button>
      <button
        onClick={() =>
          scope.request({ kind: "collection", collection: "secret", id: 9 })
        }
      >
        Forged
      </button>
      <button onClick={scope.cancel}>Cancel</button>
      <output>
        {scope.phase}:{scope.error}
      </output>
    </>
  );
}

const ui = () => (
  <NativeDocumentScopes
    context={{
      target: owner,
      nonce: "synthetic-nonce",
      expires: Date.now() + 60000,
      locale: "de",
      pagePath: "/shop",
    }}
    scopes={scopes}
    onSwitching={(value) => {
      state.switching(value);
      state.disabled = value;
    }}
  >
    <Controls />
  </NativeDocumentScopes>
);
beforeEach(() => {
  Object.assign(state, {
    modified: false,
    processing: false,
    background: false,
    disabled: false,
    failure: null,
    status: "owned",
  });
  state.refresh.mockReset();
  state.save.mockReset();
  state.switching.mockReset();
});
afterEach(() => vi.restoreAllMocks());
it("waits for native save completion and disabled controls before switching without copying values", async () => {
  state.modified = true;
  state.save.mockResolvedValue(undefined);
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (url, input) => {
      expect(state.disabled).toBe(true);
      expect(String(url)).toContain("locale=de");
      expect(JSON.parse(String(input?.body))).toEqual({
        proof: "synthetic-proof",
        target: other,
        expectedRevision: 4,
      });
      return new Response("{}");
    });
  const view = render(ui());
  fireEvent.click(screen.getByText("Header"));
  await act(async () => {});
  expect(state.save).toHaveBeenCalledTimes(1);
  expect(fetch).not.toHaveBeenCalled();
  state.modified = false;
  state.background = true;
  view.rerender(ui());
  await act(async () => {});
  expect(fetch).not.toHaveBeenCalled();
  state.background = false;
  view.rerender(ui());
  await act(async () => {});
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(state.refresh).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("status").textContent).toContain("navigating");
});
it("retains the current native copy on denial and retries only after another explicit request", async () => {
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("{}", { status: 403 }));
  render(ui());
  fireEvent.click(screen.getByText("Forged"));
  await act(async () => {});
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("Header"));
  await act(async () => {});
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(state.refresh).not.toHaveBeenCalled();
  expect(state.disabled).toBe(false);
  expect(screen.getByRole("status").textContent).toContain(
    "documentSwitchFailed",
  );
  await act(async () => {});
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText("Header"));
  await act(async () => {});
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("aborts a late scope response on unmount and never refreshes the replacement document", async () => {
  let finish!: (response: Response) => void, signal!: AbortSignal;
  vi.spyOn(globalThis, "fetch").mockImplementation((_url, input) => {
    signal = input!.signal!;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  const view = render(ui());
  fireEvent.click(screen.getByText("Header"));
  await act(async () => {});
  view.unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => finish(new Response("{}")));
  expect(state.refresh).not.toHaveBeenCalled();
});
