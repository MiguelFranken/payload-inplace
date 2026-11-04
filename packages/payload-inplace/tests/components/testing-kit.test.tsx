import { expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  FieldStrategyHarness,
  createEditorFixture,
  createDeferredResponse,
  inspectNativeField,
} from "../../src/exports/testing.js";
it("isolates synthetic fixtures, encodes stable bindings and settles delayed outcomes once", async () => {
  const a = createEditorFixture(),
    b = createEditorFixture();
  a.document.layout[0]!.heading = "Changed";
  expect(b.document.layout[0]!.heading).toBe("Synthetic heading");
  expect(
    a.binding.row("items", "row.with.dot/%").field("label")["data-ve-field"],
  ).toBe("items.@row%2Ewith%2Edot%2F%25.label");
  const response = createDeferredResponse<number>();
  response.resolve(3);
  response.reject(Error("late"));
  expect(await response.promise).toBe(3);
  const controller = new AbortController(),
    aborted = createDeferredResponse(controller.signal),
    rejection = expect(aborted.promise).rejects.toMatchObject({
      name: "AbortError",
    });
  controller.abort();
  await rejection;
  const field = inspectNativeField(
    {
      disabled: true,
      getFields: () => ({
        price: {
          value: 12,
          passesCondition: false,
          valid: false,
          errorMessage: "Synthetic validation",
        },
      }),
      getData: () => ({ _veRevision: 3 }),
    },
    "price",
  );
  expect(field).toMatchObject({
    exists: true,
    value: 12,
    passesCondition: false,
    formDisabled: true,
    revision: 3,
    error: "Synthetic validation",
  });
});
it("exercises a control's own disabled/error behavior and explicit native handoff without a fake persistence queue", () => {
  const change = vi.fn(),
    handoff = vi.fn();
  const definition = {
    id: "test-number",
    types: ["number"] as const,
    Component: ({
      value,
      setValue,
      disabled,
      error,
      openNative,
    }: import("../../src/frontend/field-strategies.js").ContextualFieldProps<"number">) => (
      <>
        <button disabled={disabled} onClick={() => setValue((value || 0) + 1)}>
          Increase {value}
        </button>
        <button onClick={openNative}>Native</button>
        {error && <p role="alert">{error}</p>}
      </>
    ),
  };
  const view = render(
    <FieldStrategyHarness
      definition={definition}
      field={{ name: "price", type: "number" }}
      initialValue={12}
      onChange={change}
      onNative={handoff}
      fallback={<p>Native fallback</p>}
    />,
  );
  fireEvent.click(screen.getByText("Increase 12"));
  expect(change).toHaveBeenCalledWith(13);
  view.rerender(
    <FieldStrategyHarness
      definition={definition}
      field={{ name: "price", type: "number" }}
      disabled
      error="Synthetic error"
      fallback={<p>Native fallback</p>}
      onChange={change}
      onNative={handoff}
    />,
  );
  fireEvent.click(screen.getByText("Increase 13"));
  expect(change).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("alert").textContent).toBe("Synthetic error");
  fireEvent.click(screen.getByText("Native"));
  expect(handoff).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Native fallback")).toBeTruthy();
});
