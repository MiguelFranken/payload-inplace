import { expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { installNativeUploadLabels } from "../../src/admin/native-accessibility.js";
import { createEditorMessages } from "../../src/i18n/messages.js";
vi.mock("@payloadcms/ui", () => ({ useModal: vi.fn() }));
it("labels native date inputs and clear controls only inside the mounted editor, preserving consumer names", () => {
  const root = document.createElement("div");
  root.innerHTML = `<div class="field-type date-time-field"><label class="field-label" for="field-releaseAt">Release At</label><div id="field-releaseAt" class="date-time-picker"><input type="text" value="01/15/2027"><button class="date-time-picker__clear-button" type="button"></button></div></div><div class="field-type date-time-field"><label class="field-label" for="field-other">Other date</label><div class="date-time-picker"><input type="text" aria-label="Consumer schedule"></div></div>`;
  const outside = document.createElement("input");
  document.body.append(root, outside);
  const stop = installNativeUploadLabels(root, createEditorMessages().t);
  try {
    expect(screen.getByRole("textbox", { name: "Release At" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Clear selection" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("textbox", { name: "Consumer schedule" }),
    ).toBeTruthy();
    expect(outside.getAttribute("aria-labelledby")).toBeNull();
    expect(root.querySelector("label")?.id).toBe("field-releaseAt-label");
  } finally {
    stop();
    root.remove();
    outside.remove();
  }
});
