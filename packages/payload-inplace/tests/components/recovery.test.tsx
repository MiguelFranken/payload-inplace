import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  NativeSubmissionMonitor,
  RecoveryContext,
  useRecoveryState,
} from "../../src/frontend/recovery";
import { createDeferredResponse } from "../../src/testing/fixtures";

const state = vi.hoisted(() => ({
  revision: 7,
  processing: false,
  background: false,
  fields: {} as Record<
    string,
    { value: string; valid?: boolean; errorMessage?: string }
  >,
  formRef: { current: null },
  setModified: vi.fn(),
  setDisabled: vi.fn(),
}));

vi.mock("@payloadcms/ui", () => ({
  useDocumentInfo: () => ({ data: {} }),
  useForm: () => ({
    formRef: state.formRef,
    getData: () => ({ _veRevision: state.revision }),
    getFields: () => state.fields,
    setModified: state.setModified,
    setDisabled: state.setDisabled,
  }),
  useFormFields: (select: (value: [typeof state.fields]) => string) =>
    select([state.fields]),
  useFormProcessing: () => state.processing,
  useFormBackgroundProcessing: () => state.background,
}));

function Monitor({ statusURL = "/status?context=synthetic-a" }) {
  const recovery = useRecoveryState(statusURL);
  return (
    <RecoveryContext value={recovery}>
      <NativeSubmissionMonitor />
      <button onClick={recovery.started}>Start save</button>
      <button onClick={recovery.saved}>Acknowledge save</button>
      <button onClick={recovery.resume}>Retry</button>
      <output aria-label="Failure">{JSON.stringify(recovery.failure)}</output>
    </RecoveryContext>
  );
}

const focus = () => fireEvent.focus(window);
const start = () => fireEvent.click(screen.getByText("Start save"));
const acknowledge = () => fireEvent.click(screen.getByText("Acknowledge save"));
const failure = () => JSON.parse(screen.getByLabelText("Failure").textContent!);

beforeEach(() => {
  state.revision = 7;
  state.processing = false;
  state.background = false;
  state.fields = { headline: { value: "Keep this edit" } };
  state.setDisabled.mockClear();
  state.setModified.mockClear();
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
});

afterEach(() => vi.restoreAllMocks());

it("ignores a pre-save revision after the native Form acknowledges the newer write", async () => {
  const old = createDeferredResponse<Response>();
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockImplementationOnce(() => old.promise)
    .mockResolvedValueOnce(Response.json({ revision: 8 }));
  const view = render(<Monitor />);
  focus();
  state.background = true;
  start();
  expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);

  state.revision = 8;
  state.background = false;
  acknowledge();
  view.rerender(<Monitor />);
  await act(async () => old.resolve(Response.json({ revision: 7 })));
  expect(failure()).toBeNull();
  expect(state.setDisabled).not.toHaveBeenCalled();
  expect(state.setModified).not.toHaveBeenCalled();
  await act(async () => {
    focus();
  });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(failure()).toBeNull();
});

it.each(["http", "network"] as const)(
  "ignores an obsolete %s failure while a native save is running",
  async (kind) => {
    const old = createDeferredResponse<Response>();
    vi.spyOn(globalThis, "fetch").mockImplementationOnce(() => old.promise);
    render(<Monitor />);
    focus();
    state.processing = true;
    start();
    await act(async () => {
      if (kind === "http") old.resolve(new Response(null, { status: 403 }));
      else old.reject(new Error("Network changed"));
    });
    expect(failure()).toBeNull();
    expect(state.setDisabled).not.toHaveBeenCalled();
    expect(state.setModified).not.toHaveBeenCalled();
  },
);

it("ignores an old scope's deferred JSON without releasing the new scope's probe", async () => {
  const oldBody = createDeferredResponse<{ revision: number }>();
  const fresh = createDeferredResponse<Response>();
  const old = new Response("{}");
  vi.spyOn(old, "json").mockImplementationOnce(() => oldBody.promise);
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(old)
    .mockImplementationOnce(() => fresh.promise);
  const view = render(<Monitor />);
  await act(async () => {
    focus();
  });
  expect(old.json).toHaveBeenCalledOnce();

  view.rerender(<Monitor statusURL="/status?context=synthetic-b" />);
  expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  focus();
  await act(async () => oldBody.resolve({ revision: 99 }));
  expect(failure()).toBeNull();
  expect(state.setDisabled).not.toHaveBeenCalled();
  focus();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[1]?.[0]).toBe("/status?context=synthetic-b");
  await act(async () => fresh.resolve(Response.json({ revision: 7 })));
  expect(failure()).toBeNull();
});

it("prioritizes failed-save diagnostics and preserves native field errors after metadata clears", async () => {
  const old = createDeferredResponse<Response>();
  const diagnostic = createDeferredResponse<Response>();
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockImplementationOnce(() => old.promise)
    .mockImplementationOnce(() => diagnostic.promise);
  const view = render(<Monitor />);
  focus();
  state.background = true;
  state.fields.headline = {
    value: "Keep this edit",
    valid: false,
    errorMessage: "A longer headline is required",
  };
  start();
  expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);

  state.fields.headline = { value: "Keep this edit" };
  state.background = false;
  view.rerender(<Monitor />);
  expect(fetch).toHaveBeenCalledTimes(2);
  focus();
  await act(async () => old.resolve(new Response(null, { status: 403 })));
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(failure()).toBeNull();

  await act(async () => diagnostic.resolve(Response.json({ revision: 7 })));
  expect(failure()).toEqual({
    kind: "validation",
    messageKey: "fieldsNeedAttention",
    paths: ["headline"],
    fieldErrors: { headline: "A longer headline is required" },
  });
  expect(state.fields.headline.value).toBe("Keep this edit");
  expect(state.setDisabled).not.toHaveBeenCalled();
  expect(state.setModified).toHaveBeenCalledExactlyOnceWith(true);
  fireEvent.click(screen.getByText("Retry"));
  expect(failure()).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(2);
});

it.each([
  [
    () => new Response(null, { status: 401 }),
    "session",
    "editingAccessExpired",
  ],
  [() => new Response(null, { status: 503 }), "network", "connectionLost"],
  [
    () => Response.json({ revision: 8 }),
    "conflict",
    "draftChangedInAnotherSession",
  ],
] as const)(
  "continues to report %s when the current Form owns the response",
  async (response, kind, messageKey) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response());
    render(<Monitor />);
    await act(async () => {
      focus();
    });
    expect(failure()).toEqual({ kind, messageKey });
    expect(state.setDisabled).toHaveBeenCalledExactlyOnceWith(true);
    expect(state.setModified).toHaveBeenCalledExactlyOnceWith(true);
  },
);
