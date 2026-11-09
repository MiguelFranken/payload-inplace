import { expect, it, vi, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { EditorMessagesProvider } from "../../src/frontend/messages";
import { MediaLibraryField } from "../../src/frontend/MediaLibraryField";
import type {
  MediaLibraryAdapter,
  MediaPage,
} from "../../src/frontend/media-library";
afterEach(() => vi.useRealTimers());
it("retranslates a late failure without restarting native-adjacent work or changing host direction", async () => {
  vi.useFakeTimers();
  let reject!: (reason: unknown) => void;
  const search = vi.fn<MediaLibraryAdapter["search"]>(
    () =>
      new Promise<MediaPage>((_resolve, no) => {
        reject = no;
      }),
  );
  const library = { id: "fixture", search };
  const field = { name: "image", type: "upload", relationTo: "media" } as const;
  const setValue = vi.fn();
  const ui = (locale: string) => (
    <EditorMessagesProvider
      options={{ locale, messages: { ar: { searchMedia: "بحث الوسائط" } } }}
    >
      <MediaLibraryField
        field={field}
        path="image"
        schemaPath="pages.image"
        value={null}
        disabled={false}
        library={library}
        setValue={setValue}
        openNative={() => {}}
      />
    </EditorMessagesProvider>
  );
  const hostDir = document.documentElement.dir;
  const view = render(ui("en"));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(251);
  });
  view.rerender(ui("de"));
  await act(async () => reject(Error("opaque transport diagnostic")));
  expect(search).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("alert").textContent).toContain(
    "Medien konnten nicht geladen werden",
  );
  view.rerender(ui("ar"));
  expect(
    screen.getByLabelText("بحث الوسائط").closest('[dir="rtl"]'),
  ).not.toBeNull();
  expect(document.documentElement.dir).toBe(hostDir);
  expect(setValue).not.toHaveBeenCalled();
  expect(screen.queryByText("opaque transport diagnostic")).toBeNull();
});
