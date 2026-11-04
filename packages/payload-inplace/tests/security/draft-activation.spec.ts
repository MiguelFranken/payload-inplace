import { expect, it, vi } from "vitest";
import type { PayloadRequest } from "payload";
import { authorizeTarget } from "../../src/server/context.js";
import type { EditorTarget, VisualEditorOptions } from "../../src/types.js";
const state = vi.hoisted(() => ({ permission: vi.fn(), read: vi.fn() }));
vi.mock("payload", async (original) => ({
  ...(await original<typeof import("payload")>()),
  docAccessOperationGlobal: state.permission,
}));
vi.mock("../../src/server/document.js", () => ({
  nativeDocumentConfig: (req: PayloadRequest) => req.payload.config.globals[0],
  readNativeDocument: state.read,
}));
it.each([false, true])(
  "authorizes draft intent for a published source while retaining host checks (global=%s)",
  async (global) => {
    const source = { id: 1, _status: "published", layout: [] };
    const update = vi.fn(
      ({ data }: { data: Record<string, unknown> }) => data._status === "draft",
    );
    const canEdit = vi.fn(() => true);
    state.read.mockResolvedValue(source);
    state.permission.mockImplementation(({ data }) => ({
      update: data._status === "draft",
    }));
    const req = {
      user: { id: 1, collection: "users" },
      payload: {
        config: { globals: [{ slug: "header", versions: { drafts: true } }] },
        collections: {
          users: { config: { access: { admin: () => true } } },
          pages: { config: { access: { update } } },
        },
        findByID: vi.fn().mockResolvedValue(source),
      },
    } as unknown as PayloadRequest;
    const options: VisualEditorOptions = {
      collections: { pages: { roots: ["layout"] } },
      globals: { header: { roots: ["layout"] } },
      canEdit,
      previewOrigin: "https://site.test",
    };
    const target: EditorTarget = global
      ? { kind: "global", global: "header", root: "layout" }
      : { collection: "pages", id: 1, root: "layout" };
    expect(await authorizeTarget(req, target, options)).toBe(source);
    expect(source._status).toBe("published");
    expect(canEdit).toHaveBeenCalledWith({ req, target, document: source });
    if (global)
      expect(state.permission).toHaveBeenCalledWith(
        expect.objectContaining({ data: { ...source, _status: "draft" } }),
      );
    else
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { ...source, _status: "draft" } }),
      );
    canEdit.mockReturnValue(false);
    await expect(authorizeTarget(req, target, options)).rejects.toThrow(
      "Editor access denied",
    );
  },
);
