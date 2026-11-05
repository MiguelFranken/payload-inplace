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

it("retains focus when Payload replaces a lazy editor but respects a user focus change", async () => {
  document.body.innerHTML =
    '<div><div data-field-path="layout.0.body"><div contenteditable="true"></div></div><input></div>';
  const container = document.body.firstElementChild as HTMLElement;
  cleanups.push(focusNativeField(container, "layout.0.body"));
  const original = container.querySelector("[contenteditable]") as HTMLElement;
  await waitFor(() => expect(document.activeElement).toBe(original));
  const replacement = original.cloneNode() as HTMLElement;
  original.replaceWith(replacement);
  await waitFor(() => expect(document.activeElement).toBe(replacement));
  const input = container.querySelector("input")!;
  input.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  input.focus();
  replacement.replaceWith(original);
  await new Promise(requestAnimationFrame);
  expect(document.activeElement).toBe(input);
});

for (const selectedPath of [undefined, "layout.0.heading"]) {
  it(`respects another native field taking focus before autofocus settles (${selectedPath ?? "section"})`, async () => {
    document.body.innerHTML =
      '<div><input id="field-layout__0__heading"><div data-field-path="layout.0.body"><div contenteditable="true"></div></div></div>';
    const container = document.body.firstElementChild as HTMLElement;
    cleanups.push(focusNativeField(container, selectedPath));
    const richText = container.querySelector(
      "[contenteditable]",
    ) as HTMLElement;
    richText.focus();
    richText.textContent = "Keep native rich text input";
    await new Promise(requestAnimationFrame);
    expect(document.activeElement).toBe(richText);
    expect(container.querySelector("input")?.value).toBe("");
  });
}

it("survives panel header focus management before its native field mounts", async () => {
  document.body.innerHTML =
    '<div><button>Back to sections</button><div data-field-path="layout.0.body"></div></div>';
  const container = document.body.firstElementChild as HTMLElement;
  cleanups.push(focusNativeField(container, "layout.0.body"));
  container.querySelector("button")!.focus();
  const initialInput = document.createElement("input");
  container.prepend(initialInput);
  initialInput.focus();
  const editor = document.createElement("div");
  editor.contentEditable = "true";
  container.lastElementChild!.append(editor);
  await waitFor(() => expect(document.activeElement).toBe(editor));
});
