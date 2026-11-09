import { expect, it } from "vitest";
import { createRichSurface } from "../../src/frontend/rich-presentation";
it("preserves nested renderer typography and grid placement without freezing computed sizes", () => {
  const original = document.createElement("div");
  original.className = "grid grid-cols-3";
  original.setAttribute("data-ve-field", "body");
  original.innerHTML =
    '<div class="col-start-2 col-span-2"><div id="rendered-prose" class="prose responsive-type"><h4 class="headline">News</h4><p class="intro">Hello <strong class="emphasis">world</strong></p><p>Second</p><ul class="bullets"><li class="item">One</li></ul></div></div>';
  const result = createRichSurface(original);
  expect(result.surface.className).toBe("grid grid-cols-3");
  expect(result.surface.firstElementChild?.className).toBe(
    "col-start-2 col-span-2",
  );
  expect(result.editor.className).toBe("prose responsive-type");
  expect(result.surface.getAttribute("data-ve-field")).toBe("body");
  expect(result.editor.getAttribute("data-ve-field")).toBeNull();
  expect(result.surface.querySelector("[id]")).toBeNull();
  expect(result.editor.childNodes.length).toBe(0);
  expect(result.theme).toMatchObject({
    paragraph: "",
    heading: { h4: "headline" },
    text: { bold: "emphasis" },
    list: { ul: "bullets", listitem: "item" },
  });
  expect(original.querySelectorAll("p").length).toBe(2);
  expect(result.surface.getAttribute("style")).toBeNull();
});
it("keeps a direct rich root as-is instead of treating a paragraph or heading as a presentation wrapper", () => {
  for (const tag of ["p", "h2", "blockquote", "ul"]) {
    const original = document.createElement("div");
    original.innerHTML = `<${tag}>Text</${tag}>`;
    const result = createRichSurface(original);
    expect(result.editor).toBe(result.surface);
  }
});

it("decorates supported nodes without disrupting a rich document containing opaque nodes", async () => {
  const { mountRichEditor } = await import("@payload-inplace/lexical/editor");
  const { preserveRichClasses } = await import(
    "../../src/frontend/rich-presentation"
  );
  const original = document.createElement("div");
  original.innerHTML =
    '<div><p class="first">Hello <a href="/studio">link</a></p><span>Upload</span></div>';
  document.body.append(original);
  const { surface, editor, theme, source } = createRichSurface(original);
  original.after(surface);
  const text = (value: string) => ({
    type: "text",
    version: 1,
    text: value,
    format: 0,
    style: "",
    mode: "normal",
    detail: 0,
  });
  const runtime = mountRichEditor({
    element: editor,
    theme,
    value: {
      root: {
        type: "root",
        version: 1,
        format: "",
        indent: 0,
        direction: null,
        children: [
          {
            type: "paragraph",
            version: 1,
            format: "",
            indent: 0,
            direction: null,
            children: [
              text("Hello "),
              {
                type: "link",
                version: 3,
                fields: { linkType: "custom", url: "/studio" },
                children: [text("link")],
              },
            ],
          },
          {
            type: "upload",
            version: 3,
            relationTo: "media",
            value: 1,
            fields: {},
          },
        ],
      },
    },
    onChange: () => {},
    onError: (error) => {
      throw error;
    },
    autofocus: false,
  });
  const dispose = preserveRichClasses(runtime.editor, source);
  expect(editor.querySelector("p")?.className).toContain("first");
  dispose();
  runtime.dispose();
  surface.remove();
  original.remove();
});
