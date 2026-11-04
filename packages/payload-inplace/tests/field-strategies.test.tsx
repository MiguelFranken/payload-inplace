import { expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  FieldStrategiesProvider,
  EditorFieldStrategy,
  useFieldStrategy,
  defineFieldStrategy,
  ContextualFieldEditor,
} from "../src/frontend/field-strategies.js";
import type { ClientField, FieldState } from "payload";
const bridge = vi.hoisted(() => ({
  setValue: vi.fn(),
  condition: true,
  disabled: false,
}));
vi.mock("@payloadcms/ui", () => ({
  useField: () => ({
    value: 2,
    setValue: bridge.setValue,
    disabled: bridge.disabled,
  }),
  useForm: () => ({ getField: () => ({ passesCondition: bridge.condition }) }),
}));
const definition = defineFieldStrategy({
  id: "number-buttons",
  types: ["number"],
  Component: ({ value, setValue, openNative }) => (
    <>
      <button onClick={() => setValue((value ?? 0) + 1)}>Increase</button>
      <button onClick={openNative}>Native</button>
    </>
  ),
});
const context = {
  field: { name: "price", type: "number" } as ClientField,
  path: "layout.0.price",
  schemaPath: "pages.layout.product.price",
};
function Match({
  state,
  permitted = true,
}: {
  state?: FieldState;
  permitted?: boolean;
}) {
  const match = useFieldStrategy(context, state, permitted);
  return <p>{match?.id || "native"}</p>;
}
it("registers document-local strategies and preserves conditions/permissions/native overrides", () => {
  const view = render(
    <FieldStrategiesProvider>
      <EditorFieldStrategy definition={definition} />
      <Match state={{ value: 2 }} />
    </FieldStrategiesProvider>,
  );
  expect(screen.getByText("number-buttons")).toBeTruthy();
  view.rerender(
    <FieldStrategiesProvider>
      <EditorFieldStrategy definition={definition} />
      <Match state={{ value: 2, passesCondition: false }} />
    </FieldStrategiesProvider>,
  );
  expect(screen.getByText("native")).toBeTruthy();
  view.rerender(
    <FieldStrategiesProvider>
      <EditorFieldStrategy definition={definition} />
      <Match state={{ value: 2 }} permitted={false} />
    </FieldStrategiesProvider>,
  );
  expect(screen.getByText("native")).toBeTruthy();
  view.rerender(
    <FieldStrategiesProvider>
      <EditorFieldStrategy definition={definition} />
      <Match
        state={
          { value: 2, customComponents: { Field: "override" } } as FieldState
        }
      />
    </FieldStrategiesProvider>,
  );
  expect(screen.getByText("native")).toBeTruthy();
});
it("writes through the guarded native bridge and hands ownership back to native fields", () => {
  bridge.condition = true;
  bridge.setValue.mockClear();
  render(
    <ContextualFieldEditor
      definition={definition}
      context={context}
      disabled={false}
      fallback={<p>Native field</p>}
    />,
  );
  fireEvent.click(screen.getByText("Increase"));
  expect(bridge.setValue).toHaveBeenLastCalledWith(3);
  bridge.condition = false;
  fireEvent.click(screen.getByText("Increase"));
  expect(bridge.setValue).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText("Native"));
  expect(screen.queryByText("Increase")).toBeNull();
  expect(screen.getByText("Native field")).toBeTruthy();
  bridge.condition = true;
});
it("retains the number field contract for consumer typechecking", () => {
  defineFieldStrategy({
    id: "typed",
    types: ["number"],
    Component: ({ field }) => {
      // @ts-expect-error Number fields cannot expose select options.
      void field.options;
      return null;
    },
  });
});
