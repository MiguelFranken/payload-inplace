import { afterEach, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { focusNativeField } from "../../src/frontend/focus-native-field.js";
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  document.body.innerHTML = "";
});
it("focuses the selected populated native leaf rather than its first sibling", async () => {
  document.body.innerHTML =
    '<div><input id="field-layout__0__items__1__title"><textarea id="field-layout__0__items__1__text">Existing answer</textarea></div>';
  const container = document.body.firstElementChild as HTMLElement;
  cleanups.push(focusNativeField(container, "layout.0.items.1.text"));
  await waitFor(() =>
    expect(document.activeElement).toBe(container.querySelector("textarea")),
  );
  expect(container.querySelector("textarea")?.value).toBe("Existing answer");
});
it("waits for the selected lazy rich-text owner without focusing another field", async () => {
  document.body.innerHTML =
    '<div><input><div data-field-path="layout.0.items.1.body"></div></div>';
  const container = document.body.firstElementChild as HTMLElement;
  cleanups.push(focusNativeField(container, "layout.0.items.1.body"));
  await new Promise(requestAnimationFrame);
  expect(document.activeElement).not.toBe(container.querySelector("input"));
  const editor = document.createElement("div");
  editor.contentEditable = "true";
  container.lastElementChild!.append(editor);
  await waitFor(() => expect(document.activeElement).toBe(editor));
});
it("does not steal focus if the panel is dismissed before the control mounts", async () => {
  document.body.innerHTML =
    '<div data-field-path="layout.0.body"></div><button>Elsewhere</button>';
  const container = document.body.firstElementChild as HTMLElement;
  const stop = focusNativeField(container, "layout.0.body");
  stop();
  const button = document.querySelector("button")!;
  button.focus();
  container.innerHTML = '<div contenteditable="true"></div>';
  await new Promise(requestAnimationFrame);
  expect(document.activeElement).toBe(button);
});
