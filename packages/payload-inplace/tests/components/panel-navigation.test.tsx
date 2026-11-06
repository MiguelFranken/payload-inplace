import {
  render,
  renderHook,
  act,
  screen,
  fireEvent,
} from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePanelNavigation } from "../../src/frontend/controllers/panel-navigation.js";

function Harness() {
  const state = usePanelNavigation();
  return (
    <>
      <button onClick={() => state.setOutline((v) => !v)}>Sections</button>
      <button onClick={() => state.setSettingsOpen(true)}>Settings</button>
      <button onClick={() => state.setCustomTool("seo")}>SEO</button>
      <button onClick={() => state.setValidationPath("layout.1.heading")}>
        Validation
      </button>
      <button onClick={() => state.close()}>Close</button>
      <output aria-label="Open panel">{state.panel.kind}</output>
      <button onClick={() => state.setOutline(false)}>
        Close stale sections
      </button>
    </>
  );
}
describe("native editor disclosure", () => {
  it("reopens every panel after repeated close and replaces the previous view", () => {
    render(<Harness />);
    for (let repeat = 0; repeat < 3; repeat++)
      for (const [button, kind] of [
        ["Sections", "sections"],
        ["Settings", "settings"],
        ["SEO", "extension"],
        ["Validation", "validation"],
      ]) {
        fireEvent.click(screen.getByRole("button", { name: button }));
        expect(screen.getByRole("status").textContent).toBe(kind);
        fireEvent.click(screen.getByRole("button", { name: "Close" }));
        expect(screen.getByRole("status").textContent).toBe("closed");
      }
  });
  it("does not let a stale close callback dismiss a replacement panel", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Sections" }));
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Close stale sections" }),
    );
    expect(screen.getByRole("status").textContent).toBe("settings");
  });
  it("applies queued toggles to the latest disclosure state", () => {
    const { result } = renderHook(usePanelNavigation);
    act(() => {
      result.current.setOutline((v) => !v);
      result.current.setOutline((v) => !v);
    });
    expect(result.current.panel.kind).toBe("closed");
  });
});
