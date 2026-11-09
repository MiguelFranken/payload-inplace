import { expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode, Suspense, use, useEffect, useState } from "react";
import {
  FieldOwnershipProvider,
  NativeFieldsOwner,
} from "../../src/frontend/field-ownership";
vi.mock("@payloadcms/ui", () => ({
  Button: () => null,
  RenderFields: () => null,
  useConfig: () => ({}),
  useDocumentInfo: () => ({}),
  useForm: () => ({}),
}));
it("contains a lazy native field reveal without replaying initialization effects above the field owner", async () => {
  const initialize = vi.fn();
  let resolve!: () => void;
  function LazyField() {
    const [pending, setPending] = useState<Promise<void>>();
    if (pending) use(pending);
    return (
      <button
        onClick={() =>
          setPending(
            new Promise<void>((done) => {
              resolve = done;
            }),
          )
        }
      >
        Load field
      </button>
    );
  }
  function NativeOwner() {
    useEffect(() => {
      initialize();
    }, []);
    return (
      <FieldOwnershipProvider>
        <NativeFieldsOwner path="layout.0">
          <LazyField />
        </NativeFieldsOwner>
      </FieldOwnershipProvider>
    );
  }
  render(
    <StrictMode>
      <Suspense fallback={<p>Outer fallback</p>}>
        <NativeOwner />
      </Suspense>
    </StrictMode>,
  );
  const initial = initialize.mock.calls.length;
  await act(async () => { fireEvent.click(screen.getByText("Load field")); });
  expect(screen.getByText("Loading fields…")).toBeTruthy();
  expect(screen.queryByText("Outer fallback")).toBeNull();
  await act(async () => resolve());
  expect(screen.getByText("Load field")).toBeTruthy();
  expect(initialize).toHaveBeenCalledTimes(initial);
});
