import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  SectionPatterns,
  useSectionPatterns,
} from "../../src/frontend/section-patterns";

const state = vi.hoisted(() => ({ getData: vi.fn() }));
vi.mock("@payloadcms/ui", () => ({
  useConfig: () => ({ config: { routes: { api: "/api" } } }),
  useForm: () => ({ getData: state.getData }),
}));
afterEach(() => vi.unstubAllGlobals());

it.each([undefined, 4])(
  "copies against the saved revision (%s)",
  async (revision) => {
    const timestamp = "2026-11-25T10:00:00.000Z";
    state.getData.mockReturnValue({
      _veActivation: "proof",
      _veRevision: revision,
      updatedAt: timestamp,
    });
    const fetch = vi.fn(async () => Response.json({ id: "copy" }));
    vi.stubGlobal("fetch", fetch);
    function Save() {
      const patterns = useSectionPatterns()!;
      return (
        <button
          onClick={() =>
            void patterns.save(
              { root: "layout", blockId: "one" },
              "Copy",
              new AbortController().signal,
            )
          }
        >
          Save copy
        </button>
      );
    }
    render(
      <SectionPatterns
        capabilities={{ canRead: true, canSave: true, allowedBlocks: ["text"] }}
      >
        <Save />
      </SectionPatterns>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save copy" }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/visual-editor/patterns",
        expect.objectContaining({
          body: JSON.stringify({
            operation: "save",
            identity: { root: "layout", blockId: "one" },
            label: "Copy",
            proof: "proof",
            expectedRevision: revision ?? timestamp,
          }),
        }),
      ),
    );
  },
);
