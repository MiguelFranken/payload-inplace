import { expect, it, vi } from "vitest";
import type { PayloadRequest } from "payload";
import {
  createContext,
  readEditContext,
  signContext,
  verifyContext,
} from "../../src/server/context";
import { signReview, validateReview } from "../../src/server/review";
import type { VisualEditorOptions } from "../../src/types";
it("binds activation and reviewed publication to a single content locale before protected reads", async () => {
  const findByID = vi.fn().mockResolvedValue({ id: 1, layout: [] });
  const req = {
    locale: "de",
    user: { id: 1, collection: "users", _sid: "synthetic" },
    payload: {
      secret: "synthetic-secret",
      collections: { pages: { config: { access: {} } } },
      findByID,
    },
  } as unknown as PayloadRequest;
  const target = { collection: "pages", id: 1, root: "layout" };
  const options = {
    collections: { pages: { roots: ["layout"] } },
    canEdit: () => true,
  } as unknown as VisualEditorOptions;
  const proof = signContext(createContext(req, target), req.payload.secret);
  expect(verifyContext(proof, req.payload.secret)?.locale).toBe("de");
  await readEditContext(req, proof, options);
  const review = signReview(req, "pages", 1, 1, { title: "Entwurf" });
  expect(validateReview(req, review, "pages", 1, 1, { title: "Entwurf" })).toBe(
    true,
  );
  req.locale = "en";
  findByID.mockClear();
  await expect(readEditContext(req, proof, options)).rejects.toThrow("expired");
  expect(findByID).not.toHaveBeenCalled();
  expect(validateReview(req, review, "pages", 1, 1, { title: "Entwurf" })).toBe(
    false,
  );
  req.locale = "all";
  expect(() => createContext(req, target)).toThrow("one content locale");
  expect(
    verifyContext(
      signContext(
        {
          ...createContext({ ...req, locale: "de" } as PayloadRequest, target),
          locale: "all",
        },
        req.payload.secret,
      ),
      req.payload.secret,
    ),
  ).toBeNull();
});
