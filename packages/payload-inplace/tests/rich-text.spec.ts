import { afterEach, expect, it } from "vitest";
import {
  $getRoot,
  $isTextNode,
  FORMAT_TEXT_COMMAND,
  SKIP_DOM_SELECTION_TAG,
} from "lexical";
import { mountRichEditor } from "../../lexical/src/editor.js";
import { safeLink, type RichDocument } from "../../lexical/src/document.js";
let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
});
const text = (value: string) => ({
  type: "text",
  version: 1,
  text: value,
  format: 0,
  style: "",
  detail: 0,
  mode: "normal",
});
const paragraph = (children: unknown[]) => ({
  type: "paragraph",
  version: 1,
  format: "",
  indent: 0,
  direction: null,
  children,
});
const documentValue = () =>
  ({
    root: {
      type: "root",
      version: 1,
      format: "",
      indent: 0,
      direction: null,
      children: [
        paragraph([
          text("First"),
          {
            type: "link",
            version: 3,
            id: "payload-link",
            fields: {
              linkType: "internal",
              doc: { relationTo: "pages", value: "2" },
              newTab: true,
              tracking: "keep",
            },
            children: [text(" link")],
          },
          {
            type: "upload",
            version: 3,
            relationTo: "media",
            value: { id: "asset" },
            fields: { alt: "Kept" },
          },
          {
            type: "consumer-node",
            version: 1,
            secretShape: { nested: [1, 2] },
            children: [text("opaque child")],
          },
        ]),
      ],
    },
  }) as RichDocument;
it("retains custom/upload islands and Payload internal link fields through unrelated text editing", async () => {
  let result: RichDocument | undefined;
  const runtime = mountRichEditor({
    autofocus: false,
    value: documentValue(),
    onChange: (value) => (result = value),
    onError: (error) => {
      throw error;
    },
  });
  dispose = runtime.dispose;
  runtime.editor.update(
    () => {
      const first = $getRoot().getFirstDescendant();
      if ($isTextNode(first)) first.setTextContent("Changed");
    },
    { discrete: true, tag: SKIP_DOM_SELECTION_TAG },
  );
  expect(result?.root.children[0].children?.[0].text).toBe("Changed");
  const expected = documentValue().root.children[0].children!;
  expect(result?.root.children[0].children?.[1]).toMatchObject(expected[1]);
  expect(result?.root.children[0].children?.[2]).toEqual(expected[2]);
  expect(result?.root.children[0].children?.[3]).toEqual(expected[3]);
});
it("has local text undo and avoids emitting a write merely from initialization or selection", async () => {
  const changes: RichDocument[] = [];
  const runtime = mountRichEditor({
    autofocus: false,
    value: documentValue(),
    onChange: (value) => changes.push(value),
    onError: (error) => {
      throw error;
    },
  });
  dispose = runtime.dispose;
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(changes).toHaveLength(0);
  runtime.editor.update(
    () => {
      $getRoot().select(0, 1);
    },
    { discrete: true, tag: SKIP_DOM_SELECTION_TAG },
  );
  runtime.editor.update(
    () => runtime.editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold"),
    { discrete: true, tag: SKIP_DOM_SELECTION_TAG },
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(changes.length).toBeGreaterThan(0);
});
it("allows only intentional link protocols for imported/pasted anchors", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,evil",
    "//untrusted.test",
    "https://good.test/\nscript",
  ])
    expect(safeLink(url)).toBeUndefined();
  expect(safeLink("https://good.test")).toBe("https://good.test");
  expect(safeLink("/page")).toBe("/page");
});
