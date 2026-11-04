import { expect, it, vi, afterEach } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { MediaLibraryField } from "../../src/frontend/MediaLibraryField.js";
import type {
  MediaPage,
  MediaLibraryAdapter,
} from "../../src/frontend/media-library.js";
import type { ClientField } from "payload";
const field = {
  name: "image",
  type: "upload",
  relationTo: "media",
} as const satisfies ClientField;
const props = {
  field,
  path: "image",
  schemaPath: "pages.image",
  disabled: false,
  value: null,
  setValue: vi.fn(),
  openNative: vi.fn(),
};
afterEach(() => vi.useRealTimers());
const tick = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(251);
  });
it("ignores aborted searches, paginates and changes only the selected native reference", async () => {
  vi.useFakeTimers();
  props.setValue.mockClear();
  let complete!: (page: MediaPage) => void;
  let firstSignal!: AbortSignal;
  const search = vi
    .fn<MediaLibraryAdapter["search"]>()
    .mockImplementationOnce(({ signal }) => {
      firstSignal = signal;
      return new Promise((resolve) => {
        complete = resolve;
      });
    })
    .mockResolvedValueOnce({
      items: [{ id: 2, collection: "media", label: "Blue bowl" }],
      nextCursor: "two",
    })
    .mockResolvedValueOnce({
      items: [{ id: 3, collection: "media", label: "Green bowl" }],
    });
  render(<MediaLibraryField {...props} library={{ id: "test", search }} />);
  await tick();
  fireEvent.change(screen.getByLabelText("Search media"), {
    target: { value: "bowl" },
  });
  await tick();
  expect(firstSignal.aborted).toBe(true);
  await act(async () =>
    complete({ items: [{ id: 1, collection: "media", label: "Stale" }] }),
  );
  expect(screen.queryByText("Stale")).toBeNull();
  fireEvent.click(screen.getByText("Load more"));
  await tick();
  expect(screen.getByText("Blue bowl")).toBeTruthy();
  expect(screen.getByText("Green bowl")).toBeTruthy();
  fireEvent.click(screen.getByText("Green bowl"));
  expect(props.setValue).toHaveBeenCalledExactlyOnceWith(3);
  expect(search.mock.calls.at(-1)?.[0]).toMatchObject({
    query: "bowl",
    cursor: "two",
    collections: ["media"],
  });
});
it("retries a failed search, rejects foreign assets and preserves native fallback", async () => {
  vi.useFakeTimers();
  props.openNative.mockClear();
  const search = vi
    .fn<MediaLibraryAdapter["search"]>()
    .mockRejectedValueOnce(Error("offline"))
    .mockResolvedValueOnce({
      items: [
        { id: "https://evil.test", collection: "media", label: "Unsafe" },
        { id: 2, collection: "users", label: "Foreign" },
      ],
    });
  render(<MediaLibraryField {...props} library={{ id: "test", search }} />);
  await tick();
  expect(screen.getByRole("alert")).toBeTruthy();
  fireEvent.click(screen.getByText("Retry search"));
  await tick();
  expect(screen.queryByText("Unsafe")).toBeNull();
  expect(screen.queryByText("Foreign")).toBeNull();
  fireEvent.click(screen.getByText("Open native media editor"));
  expect(props.openNative).toHaveBeenCalledOnce();
});
it("aborts an in-flight upload on revoked editing and never applies its late completion", async () => {
  vi.useFakeTimers();
  props.setValue.mockClear();
  let resolve!: (asset: {
    id: number;
    collection: string;
    label: string;
  }) => void;
  let signal!: AbortSignal;
  const library: MediaLibraryAdapter = {
    id: "test",
    search: async () => ({ items: [] }),
    upload: (input) => {
      signal = input.signal;
      input.onProgress(25);
      return new Promise((done) => {
        resolve = done;
      });
    },
  };
  const view = render(<MediaLibraryField {...props} library={library} />);
  fireEvent.change(screen.getByLabelText("Upload media"), {
    target: { files: [new File(["synthetic"], "test.png")] },
  });
  expect(screen.getByRole("progressbar").getAttribute("value")).toBe("25");
  view.rerender(<MediaLibraryField {...props} library={library} disabled />);
  expect(signal.aborted).toBe(true);
  await act(async () => resolve({ id: 3, collection: "media", label: "Late" }));
  expect(props.setValue).not.toHaveBeenCalled();
});
it("uses native same-origin ACL search and never turns external URLs into asset IDs", async () => {
  const { createPayloadMediaLibrary } = await import(
    "../../src/frontend/media-library.js"
  );
  const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        docs: [
          {
            id: 4,
            filename: "bowl.png",
            mimeType: "image/png",
            url: "/media/bowl.png",
          },
        ],
        hasNextPage: true,
        nextPage: 2,
      }),
    ),
  );
  try {
    const library = createPayloadMediaLibrary({ collection: "media" });
    const page = await library.search({
      query: "bowl",
      collections: ["media"],
      signal: new AbortController().signal,
    });
    expect(page).toEqual({
      items: [
        {
          id: 4,
          collection: "media",
          label: "bowl.png",
          mimeType: "image/png",
          thumbnailURL: "/media/bowl.png",
        },
      ],
      nextCursor: "2",
    });
    expect(fetch.mock.calls[0]?.[0]).toContain(
      "where%5Bfilename%5D%5Blike%5D=bowl",
    );
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({
      credentials: "same-origin",
      cache: "no-store",
    });
    expect(() =>
      createPayloadMediaLibrary({
        collection: "media",
        apiPath: "https://evil.test",
      }),
    ).toThrow();
    await expect(
      library.search({
        query: "",
        collections: ["media"],
        cursor: "not-a-page",
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow("page");
  } finally {
    fetch.mockRestore();
  }
});

it("retries the same failed upload instead of accidentally retrying search", async () => {
  vi.useFakeTimers();
  props.setValue.mockClear();
  const file = new File(["synthetic"], "retry.png", { type: "image/png" });
  const search = vi
    .fn<MediaLibraryAdapter["search"]>()
    .mockResolvedValue({ items: [] });
  const upload = vi
    .fn<NonNullable<MediaLibraryAdapter["upload"]>>()
    .mockRejectedValueOnce(Error("offline"))
    .mockResolvedValueOnce({ id: 9, collection: "media", label: "retry.png" });
  render(
    <MediaLibraryField {...props} library={{ id: "retry", search, upload }} />,
  );
  await tick();
  await act(async () =>
    fireEvent.change(screen.getByLabelText("Upload media"), {
      target: { files: [file] },
    }),
  );
  expect(screen.getByRole("alert").textContent).toContain("Upload failed");
  await act(async () => fireEvent.click(screen.getByText("Retry upload")));
  expect(upload).toHaveBeenCalledTimes(2);
  expect(upload.mock.calls[0]?.[0].file).toBe(file);
  expect(upload.mock.calls[1]?.[0].file).toBe(file);
  expect(search).toHaveBeenCalledTimes(1);
  expect(props.setValue).toHaveBeenCalledExactlyOnceWith(9);
});

it("keeps a missing thumbnail selectable and suppresses unsafe thumbnail protocols", async () => {
  vi.useFakeTimers();
  props.setValue.mockClear();
  render(
    <MediaLibraryField
      {...props}
      library={{
        id: "missing",
        search: async () => ({
          items: [
            {
              id: 1,
              collection: "media",
              label: "Missing image",
              thumbnailURL: "/missing.png",
            },
            {
              id: 2,
              collection: "media",
              label: "Unsafe thumbnail",
              thumbnailURL: "javascript:alert(1)",
            },
          ],
        }),
      }}
    />,
  );
  await tick();
  const missing = screen.getByRole("button", { name: "Missing image" });
  const image = missing.querySelector("img")!;
  expect(image.src).toContain("/missing.png");
  fireEvent.error(image);
  expect(missing.querySelector("img")).toBeNull();
  expect(
    screen
      .getByRole("button", { name: "Unsafe thumbnail" })
      .querySelector("img"),
  ).toBeNull();
  fireEvent.click(missing);
  expect(props.setValue).toHaveBeenCalledExactlyOnceWith(1);
});

it("distinguishes equal IDs in different polymorphic collections, including populated values", async () => {
  vi.useFakeTimers();
  props.setValue.mockClear();
  render(
    <MediaLibraryField
      {...props}
      field={{
        type: "relationship",
        name: "asset",
        relationTo: ["media", "products"],
      }}
      value={{
        relationTo: "products",
        value: { id: 2, title: "Shared product" },
      }}
      library={{
        id: "polymorphic",
        search: async () => ({
          items: [
            { id: 2, collection: "media", label: "Image two" },
            { id: 2, collection: "products", label: "Product two" },
          ],
        }),
      }}
    />,
  );
  await tick();
  expect(
    screen
      .getByRole("button", { name: "Image two" })
      .getAttribute("aria-pressed"),
  ).toBe("false");
  expect(
    screen
      .getByRole("button", { name: "Product two" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Image two" }));
  expect(props.setValue).toHaveBeenCalledExactlyOnceWith({
    relationTo: "media",
    value: 2,
  });
});
