import { expect, it, vi } from "vitest";
import { act, render, fireEvent, screen } from "@testing-library/react";
import {
  EditorLifecycleProvider,
  useEditorLifecycle,
  useEditorObserver,
} from "../../src/frontend/lifecycle";
import type { EditorLifecycleEvent } from "@payload-inplace/core/events";
vi.mock("@payloadcms/ui", () => ({ useLocale: () => ({ code: "de" }) }));
it("scopes observers to active documents, keeps native work usable after observer rejection and cleans up", async () => {
  const events: EditorLifecycleEvent[] = [];
  function Observer() {
    useEditorObserver((event) => {
      events.push(event);
      return Promise.reject(Error("observer failure"));
    });
    return null;
  }
  function Action() {
    const events = useEditorLifecycle();
    return (
      <button
        onClick={() => {
          const save = events.start("save");
          save.settle("succeeded");
          events.start("preview", save.id).settle("succeeded");
        }}
      >
        Save
      </button>
    );
  }
  const view = render(
    <EditorLifecycleProvider
      target={{ collection: "pages", id: 1, root: "layout" }}
    >
      <Observer />
      <Action />
    </EditorLifecycleProvider>,
  );
  await act(async () => fireEvent.click(screen.getByText("Save")));
  expect(events.map((event) => event.type)).toEqual([
    "activated",
    "operation-started",
    "operation-settled",
    "operation-started",
    "operation-settled",
  ]);
  expect(events[0]?.scope.locale).toBe("de");
  const save = events[1],
    preview = events[3];
  if (
    save?.type === "operation-started" &&
    preview?.type === "operation-started"
  )
    expect(preview.parentOperationId).toBe(save.operationId);
  else throw Error("Missing events");
  view.unmount();
  expect(events).toHaveLength(5);
});
