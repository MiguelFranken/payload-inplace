import { expect, it, vi } from "vitest";
import type { PayloadRequest } from "payload";
import type { VisualEditorOptions } from "../../src/types";

const authorize = vi.hoisted(() => vi.fn());
vi.mock("../../src/server/context.js", () => ({ readEditContext: authorize }));

import { latestDraftEndpoint } from "../../src/server/reconcile";
it("requires a trusted origin and fresh activation authorization, ignores forged targets and returns only the native authorized draft", async () => {
  const options = {} as VisualEditorOptions,
    origins = new Set(["https://demo.test"]);
  const req = (origin: string, input: unknown) =>
    ({
      headers: new Headers({ origin }),
      json: async () => input,
    }) as PayloadRequest;
  authorize.mockResolvedValue({
    context: { target: { collection: "pages", id: 1 } },
    document: { id: 1, title: "Authorized copy" },
  });
  const denied = await latestDraftEndpoint(
    req("https://evil.test", { proof: "signed" }),
    options,
    origins,
  );
  expect(denied.status).toBe(403);
  expect(authorize).not.toHaveBeenCalled();
  const allowed = await latestDraftEndpoint(
    req("https://demo.test", {
      proof: "signed",
      target: { collection: "users", id: 2 },
    }),
    options,
    origins,
  );
  expect(await allowed.json()).toEqual({
    document: { id: 1, title: "Authorized copy" },
  });
  expect(allowed.headers.get("cache-control")).toContain("no-store");
  expect(authorize).toHaveBeenLastCalledWith(
    expect.anything(),
    "signed",
    options,
  );
  authorize.mockRejectedValue(Error("revoked"));
  expect(
    (
      await latestDraftEndpoint(
        req("https://demo.test", { proof: "signed" }),
        options,
        origins,
      )
    ).status,
  ).toBe(403);
});
