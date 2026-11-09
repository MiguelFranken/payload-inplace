import { expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Floatable } from "@payload-inplace/ui/chrome/floatable/Floatable";
vi.mock("@payloadcms/ui", () => ({
  useTranslation: () => ({ i18n: { language: "en" } }),
}));
vi.mock("@payload-inplace/ui/chrome/floatable/use-panel-resize", () => ({
  usePanelResize: () => ({ id: "test-panel", style: {}, edge: () => ({}) }),
}));
it("keeps contextual footer actions outside the field scroll area and restores the section action", () => {
  const open = vi.fn(),
    close = vi.fn();
  render(
    <Floatable
      title="Image"
      onClose={close}
      actions={<button aria-label="Locate image">Locate</button>}
      footer={<button onClick={open}>Edit all section fields</button>}
    >
      <label>
        Media
        <input />
      </label>
    </Floatable>,
  );
  const panel = screen.getByRole("complementary", { name: "Image" });
  const footer = panel.querySelector("[data-ve-panel-footer]")!;
  expect(
    footer.contains(
      screen.getByRole("button", { name: "Edit all section fields" }),
    ),
  ).toBe(true);
  expect(panel.querySelector("[data-ve-panel-body]")!.contains(footer)).toBe(
    false,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Edit all section fields" }),
  );
  expect(open).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Close Image panel" }));
  expect(close).toHaveBeenCalledOnce();
});

it("leaves asynchronous selected-field focus to its native owner", async () => {
  render(
    <Floatable title="Native settings" autoFocus={false} onClose={() => {}}>
      <input aria-label="First sibling" />
      <textarea aria-label="Selected answer" />
    </Floatable>,
  );
  const selected = screen.getByRole("textbox", { name: "Selected answer" });
  await new Promise(requestAnimationFrame);
  selected.focus();
  await new Promise(requestAnimationFrame);
  expect(document.activeElement).toBe(selected);
});
