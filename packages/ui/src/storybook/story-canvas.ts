import { waitFor, within } from "storybook/test";

/** Query the editor surface and its portals after the shadow decorator mounts. */
export async function editorStoryCanvas(canvasElement: HTMLElement) {
  const surface = await waitFor(() => {
    const host = canvasElement.querySelector("[data-editor-story]");
    const surface =
      host?.shadowRoot?.querySelector<HTMLElement>("[data-theme]");
    if (!surface) throw new Error("Editor story surface has not mounted");
    return surface;
  });
  return within(surface);
}
