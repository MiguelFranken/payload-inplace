import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useNativeDraftSave } from "../../src/frontend/controllers/draft-save";
import type { EditorTarget } from "../../src/types";

const state = vi.hoisted(() => {
  const makeForm = () => ({
    disabled: false,
    formRef: { current: null },
    submit: vi.fn<() => Promise<void>>(),
    setBackgroundProcessing: vi.fn<(active: boolean) => void>(),
  });
  return {
    form: makeForm(),
    makeForm,
    modified: true,
    processing: false,
    background: false,
    locale: "en",
  };
});

vi.mock("@payloadcms/ui", () => ({
  useConfig: () => ({ config: { routes: { api: "/custom-api/" } } }),
  useForm: () => state.form,
  useFormBackgroundProcessing: () => state.background,
  useFormModified: () => state.modified,
  useFormProcessing: () => state.processing,
  useLocale: () => ({ code: state.locale }),
}));

const page: EditorTarget = { collection: "pages", id: 1, root: "layout" };
const header: EditorTarget = {
  kind: "global",
  global: "header",
  root: "layout",
};

function holdSubmission(form = state.form) {
  let resolve!: () => void;
  const pending = new Promise<void>((finish) => {
    resolve = finish;
  });
  form.submit.mockReturnValueOnce(pending);
  return resolve;
}

beforeEach(() => {
  Object.assign(state, {
    form: state.makeForm(),
    modified: true,
    processing: false,
    background: false,
    locale: "en",
  });
});

describe("manual draft submission", () => {
  it("coalesces rapid dock and scope-switch triggers through the same form", async () => {
    const { submit, setBackgroundProcessing } = state.form;
    const pending = holdSubmission();
    const dock = renderHook(() => useNativeDraftSave(page, false));
    const scopeSwitcher = renderHook(() => useNativeDraftSave(page, false));

    const first = dock.result.current();
    await dock.result.current();
    await scopeSwitcher.result.current();

    expect(submit).toHaveBeenCalledExactlyOnceWith({
      action:
        "/custom-api/pages/1?locale=en&depth=0&fallback-locale=null&draft=true",
      method: "PATCH",
      overrides: { _status: "draft" },
      acceptValues: true,
      disableFormWhileProcessing: false,
      disableSuccessStatus: true,
      skipValidation: true,
    });
    expect(setBackgroundProcessing.mock.calls).toEqual([[true]]);

    pending();
    await first;
    expect(setBackgroundProcessing.mock.calls).toEqual([[true], [false]]);
  });

  it("releases the guard when the native submit rejects and allows explicit retry", async () => {
    const { submit, setBackgroundProcessing } = state.form;
    const save = renderHook(() => useNativeDraftSave(page, false));
    submit.mockRejectedValueOnce(new Error("Native preflight failed"));

    await expect(save.result.current()).rejects.toThrow(
      "Native preflight failed",
    );
    await save.result.current();

    expect(submit).toHaveBeenCalledTimes(2);
    expect(setBackgroundProcessing.mock.calls).toEqual([
      [true],
      [false],
      [true],
      [false],
    ]);
  });

  it("uses the current scope and locale once the same form is available", async () => {
    const { submit } = state.form;
    const pending = holdSubmission();
    const save = renderHook<
      ReturnType<typeof useNativeDraftSave>,
      { target: EditorTarget }
    >(({ target }) => useNativeDraftSave(target, false), {
      initialProps: { target: page },
    });
    const first = save.result.current();

    state.form = { ...state.form };
    state.locale = "de";
    save.rerender({ target: header });
    await save.result.current();
    expect(submit).toHaveBeenCalledTimes(1);

    pending();
    await first;
    await save.result.current();
    expect(submit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action:
          "/custom-api/globals/header?locale=de&depth=0&fallback-locale=null&draft=true",
        method: "POST",
      }),
    );
  });

  it("keeps pending work on independent forms separate", async () => {
    const oldForm = state.form;
    const pending = holdSubmission();
    const oldSave = renderHook(() => useNativeDraftSave(page, false));
    const first = oldSave.result.current();

    const newForm = state.makeForm();
    state.form = newForm;
    const current = holdSubmission();
    const newSave = renderHook(() => useNativeDraftSave(header, false));
    const second = newSave.result.current();
    expect(newForm.submit).toHaveBeenCalledTimes(1);

    pending();
    await first;
    expect(oldForm.setBackgroundProcessing.mock.calls).toEqual([
      [true],
      [false],
    ]);
    expect(newForm.setBackgroundProcessing.mock.calls).toEqual([[true]]);

    current();
    await second;
    expect(newForm.setBackgroundProcessing.mock.calls).toEqual([
      [true],
      [false],
    ]);
  });

  it.each([
    { disabled: true },
    { formDisabled: true },
    { modified: false },
    { processing: true },
    { background: true },
  ])("defers to current form state (%j)", async (gates) => {
    state.form.disabled = "formDisabled" in gates;
    Object.assign(state, gates);
    const save = renderHook(() =>
      useNativeDraftSave(page, "disabled" in gates),
    );

    await save.result.current();

    expect(state.form.submit).not.toHaveBeenCalled();
    expect(state.form.setBackgroundProcessing).not.toHaveBeenCalled();
  });
});
