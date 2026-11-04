import { expect, it } from "vitest";
import { render, fireEvent, screen, cleanup } from "@testing-library/react";
import {
  FieldStrategyHarness,
  createEditorFixture,
  createDeferredResponse,
  inspectNativeField,
} from "payload-inplace/testing";
import { priceControls as stepper } from "./components/PriceControls";
it("tests a public control without source aliases or a demo boot", () => {
  const values: number[] = [];
  const view = render(
    <FieldStrategyHarness
      definition={stepper}
      field={{ type: "number", name: "price" }}
      initialValue={12}
      onChange={(value) => values.push(value!)}
      fallback={<p>Native handoff</p>}
    />,
  );
  fireEvent.click(screen.getByText("Increase 12"));
  expect(values).toEqual([13]);
  view.rerender(
    <FieldStrategyHarness
      definition={stepper}
      field={{ type: "number", name: "price" }}
      initialValue={12}
      disabled
      error="Synthetic validation"
    />,
  );
  fireEvent.click(screen.getByText("Increase 13"));
  expect(values).toEqual([13]);
  expect(screen.getByRole("alert").textContent).toBe("Synthetic validation");
  cleanup();
  render(
    <FieldStrategyHarness
      definition={stepper}
      field={{ type: "number", name: "price" }}
      fallback={<p>Native handoff</p>}
    />,
  );
  fireEvent.click(screen.getByText("Native options"));
  expect(screen.getByText("Native handoff")).toBeTruthy();
  cleanup();
});
it("provides isolated bindings, deterministic failures and read-only native probes", async () => {
  const one = createEditorFixture(),
    two = createEditorFixture();
  one.document.layout[0]!.heading = "Changed";
  expect(two.document.layout[0]!.heading).toBe("Synthetic heading");
  expect(
    one.binding.row("items", "row.with.dot/%").field("label")["data-ve-field"],
  ).toBe("items.@row%2Ewith%2Edot%2F%25.label");
  const pending = createDeferredResponse<number>();
  pending.resolve(3);
  pending.resolve(4);
  expect(await pending.promise).toBe(3);
  const request = new AbortController(),
    aborted = createDeferredResponse(request.signal);
  const rejected = expect(aborted.promise).rejects.toMatchObject({
    name: "AbortError",
  });
  request.abort();
  await rejected;
  expect(
    inspectNativeField(
      {
        disabled: false,
        getFields: () => ({ price: { value: 12, passesCondition: false } }),
        getData: () => ({ _veRevision: 3 }),
      },
      "price",
    ),
  ).toMatchObject({ value: 12, passesCondition: false, revision: 3 });
});
