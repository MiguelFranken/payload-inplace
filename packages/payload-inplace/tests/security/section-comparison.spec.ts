import { expect, it, vi } from "vitest";
import type { PayloadRequest } from "payload";
import type { VisualEditorOptions } from "../../src/types";

const authorize = vi.hoisted(() => vi.fn());
vi.mock("../../src/server/context", () => ({ readEditContext: authorize }));

import { sectionComparisonEndpoint } from "../../src/server/section-comparison";

it("uses the signed global and nested root with native read access and no locale fallback", async () => {
  const draft = [{ id: "one", blockType: "text", heading: "Entwurf" }];
  const published = [{ id: "one", blockType: "text", heading: "Live" }];
  const findGlobal = vi.fn().mockResolvedValue({
    _status: "published",
    privateNote: "Outside the active root",
    main: { layout: published },
  });
  authorize.mockResolvedValue({
    context: {
      target: { kind: "global", global: "homepage", root: "main.layout" },
    },
    document: {
      _veRevision: 5,
      main: { layout: draft },
      privateNote: "Draft note",
    },
  });
  const req = {
    locale: "de",
    headers: new Headers({ Origin: "https://demo.test" }),
    json: async () => ({ proof: "signed", target: { global: "ignored" } }),
    payload: { findGlobal },
  } as unknown as PayloadRequest;
  const options = {} as VisualEditorOptions;
  const origins = new Set(["https://demo.test"]);
  const response = await sectionComparisonEndpoint(req, options, origins);

  expect(authorize).toHaveBeenCalledWith(req, "signed", options);
  expect(findGlobal).toHaveBeenCalledWith({
    slug: "homepage",
    req,
    draft: false,
    depth: 0,
    overrideAccess: false,
    fallbackLocale: false,
  });
  expect(await response.json()).toEqual({ revision: 5, draft, published });
  expect(response.headers.get("cache-control")).toBe("private, no-store");

  findGlobal.mockRejectedValue(Object.assign(Error("Denied"), { status: 403 }));
  const denied = await sectionComparisonEndpoint(req, options, origins);
  expect(denied.status).toBe(403);
  expect(await denied.json()).not.toHaveProperty("draft");
});
