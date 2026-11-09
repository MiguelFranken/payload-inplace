import { afterEach, expect, it } from "vitest";
import {
  $getRoot,
  $isTextNode,
  FORMAT_TEXT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  HISTORY_PUSH_TAG,
  SKIP_DOM_SELECTION_TAG,
} from "@payloadcms/richtext-lexical/lexical";
import { mountRichEditor } from "../src/editor";
import { safeLink, type RichDocument } from "../src/document";

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
  const before = runtime.editor.getEditorState().toJSON();
  runtime.editor.update(
    () => {
      const first = $getRoot().getFirstDescendant();
      if ($isTextNode(first)) first.setTextContent("Text undo stays local");
    },
    { discrete: true, tag: [HISTORY_PUSH_TAG, SKIP_DOM_SELECTION_TAG] },
  );
  const changed = runtime.editor.getEditorState().toJSON();
  expect(changed).not.toEqual(before);
  runtime.editor.dispatchCommand(UNDO_COMMAND, undefined);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(runtime.editor.getEditorState().toJSON()).toEqual(before);
  runtime.editor.dispatchCommand(REDO_COMMAND, undefined);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(runtime.editor.getEditorState().toJSON()).toEqual(changed);
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

it("reports collapsed link selection honestly and blocks commands while native editing is disabled", () => {
  const changes: RichDocument[] = [];
  const runtime = mountRichEditor({
    autofocus: false,
    value: documentValue(),
    features: ["bold", "link"],
    onChange: (value) => changes.push(value),
    onError: (error) => {
      throw error;
    },
  });
  dispose = runtime.dispose;
  runtime.editor.update(() => $getRoot().selectEnd(), {
    discrete: true,
    tag: SKIP_DOM_SELECTION_TAG,
  });
  expect(runtime.link("https://example.test")).toBe(false);
  runtime.editor.update(
    () => {
      const first = $getRoot().getFirstDescendant();
      if ($isTextNode(first)) {
        // Headless selection has no DOM reconciliation to inherit the selected node's marks.
        const selection = first.select(0, 5);
        selection.format = first.getFormat();
      }
    },
    { discrete: true, tag: SKIP_DOM_SELECTION_TAG },
  );
  runtime.editor.setEditable(false);
  const before = runtime.editor.getEditorState().toJSON();
  runtime.format("bold");
  expect(runtime.link("https://example.test")).toBe(false);
  expect(runtime.editor.getEditorState().toJSON()).toEqual(before);
  expect(changes).toEqual([]);
  runtime.editor.setEditable(true);
  expect(runtime.link("https://example.test")).toBe(true);
  expect(JSON.stringify(runtime.editor.getEditorState().toJSON())).toContain(
    "https://example.test",
  );
});

it("reports existing marks and selection-only changes without creating persistence writes", () => {
  const changes: RichDocument[] = [];
  const updates: string[][] = [];
  const value = documentValue();
  value.root.children[0].children![0].format = 1;
  const runtime = mountRichEditor({
    autofocus: false,
    value,
    onChange: (next) => changes.push(next),
    onSelectionChange: (next) => updates.push([...next]),
    onError: (error) => {
      throw error;
    },
  });
  dispose = runtime.dispose;
  runtime.editor.update(
    () => {
      const first = $getRoot().getFirstDescendant();
      if ($isTextNode(first)) {
        // Headless selection has no DOM reconciliation to inherit the selected node's marks.
        const selection = first.select(0, 5);
        selection.format = first.getFormat();
      }
    },
    { discrete: true, tag: SKIP_DOM_SELECTION_TAG },
  );
  expect(updates.at(-1)).toContain("bold");
  expect(changes).toHaveLength(0);
  runtime.editor.update(
    () => {
      const plain = $getRoot().getAllTextNodes()[1];
      if ($isTextNode(plain)) {
        const selection = plain.select(0, 3);
        selection.format = plain.getFormat();
      }
    },
    { discrete: true, tag: SKIP_DOM_SELECTION_TAG },
  );
  expect(updates.at(-1)).toEqual([]);
  expect(changes).toHaveLength(0);
});
