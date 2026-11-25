import { afterEach, expect, it, vi } from "vitest";
import { createPayloadMediaLibrary } from "../../src/frontend/media-library";

afterEach(() => vi.unstubAllGlobals());

it.each([
  [undefined, "/api/media"],
  ["/api", "/api/media"],
  ["/api/", "/api/media"],
  ["/cms/api", "/cms/api/media"],
  ["/cms/api/", "/cms/api/media"],
  ["/", "/media"],
] as const)(
  "resolves mount %s to %s on the same origin",
  async (apiPath, pathname) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json({ docs: [] }));
    vi.stubGlobal("fetch", fetch);
    const library = createPayloadMediaLibrary({ collection: "media", apiPath });
    const signal = new AbortController().signal;
    await library.search({ query: "photo", collections: ["media"], signal });
    const [request, options] = fetch.mock.calls[0]!;
    const origin = "https://shop.example";
    const url = new URL(String(request), origin);
    expect(url.origin).toBe(origin);
    expect(url.pathname).toBe(pathname);
    expect(url.searchParams.get("where[filename][like]")).toBe("photo");
    expect(options).toEqual({
      signal,
      credentials: "same-origin",
      cache: "no-store",
    });
  },
);

it.each([
  "api",
  "https://elsewhere.example/api",
  "//elsewhere.example/api",
  "/\\elsewhere.example/api",
  "/\t/elsewhere.example/api",
  "/cms//api",
  "/api?locale=de",
  "/api#media",
])("rejects an invalid mount %s", (apiPath) => {
  expect(() =>
    createPayloadMediaLibrary({ collection: "media", apiPath }),
  ).toThrow("same-origin API path");
});
