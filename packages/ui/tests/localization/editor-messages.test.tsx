import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import {
  EditorMessage,
  EditorMessagesProvider,
} from "../../src/localization/EditorMessages";

it("updates editor copy and direction while leaving the document direction alone", () => {
  const hostDirection = document.documentElement.dir;
  const view = render(
    <EditorMessagesProvider options={{ locale: "de-CH" }}>
      <EditorMessage id="addSection" />
    </EditorMessagesProvider>,
  );

  const surface = view.container.firstElementChild;
  expect(surface?.getAttribute("lang")).toBe("de-CH");
  expect(screen.getByText("Abschnitt hinzufügen")).toBeTruthy();

  view.rerender(
    <EditorMessagesProvider
      options={{ locale: "ar", messages: { ar: { addSection: "إضافة قسم" } } }}
    >
      <EditorMessage id="addSection" />
    </EditorMessagesProvider>,
  );

  expect(surface?.getAttribute("dir")).toBe("rtl");
  expect(screen.getByText("إضافة قسم")).toBeTruthy();
  expect(document.documentElement.dir).toBe(hostDirection);
});
