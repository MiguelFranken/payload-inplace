import {
  createEditor,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  FORMAT_TEXT_COMMAND,
  COMMAND_PRIORITY_HIGH,
  type TextFormatType,
  type LexicalEditor,
} from "lexical";
import {
  registerRichText,
  HeadingNode,
  QuoteNode,
  $createHeadingNode,
  $createQuoteNode,
} from "@lexical/rich-text";
import {
  ListNode,
  ListItemNode,
  registerList,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { registerHistory, createEmptyHistoryState } from "@lexical/history";
import { mergeRegister } from "@lexical/utils";
import { $setBlocksType } from "@lexical/selection";
import {
  safeLink,
  isRichDocument,
  unknownNodeTypes,
  opaqueNode,
  PayloadLinkNode,
  rememberMetadata,
  serializeLosslessly,
  type RichNode,
  type RichDocument,
} from "./document.js";
export type RichFormat =
  | TextFormatType
  | "paragraph"
  | "h2"
  | "h3"
  | "quote"
  | "bullet"
  | "number"
  | "unlink";
/** Mount a lazily loaded, non-React Lexical surface. Native Form owns the value and persistence.
 * No server acknowledgement is applied to a focused editor; dispose before changing field ownership.
 */
export function mountRichEditor({
  element,
  value,
  onChange,
  onError,
  features,
  unsupportedNodeLabel,
  autofocus = true,
  disabled = false,
}: {
  /** Omit for deterministic headless serialization/command tests. */
  element?: HTMLElement;
  value: unknown;
  onChange: (value: RichDocument) => void;
  onError: (error: Error) => void;
  disabled?: boolean;
  features?: readonly string[];
  /** Presentation-only label for immutable custom/upload islands; never serialized. */
  unsupportedNodeLabel?: (type: string) => string;
  /** Hosts may defer focus to their own click/caret placement; headless state tests disable DOM focus. */
  autofocus?: boolean;
}) {
  const document: RichDocument = isRichDocument(value)
    ? value
    : {
        root: {
          type: "root",
          version: 1,
          children: [
            {
              type: "paragraph",
              version: 1,
              children: [],
              direction: null,
              format: "",
              indent: 0,
            },
          ],
          direction: null,
          format: "",
          indent: 0,
        },
      };
  const editor = createEditor({
    namespace: "payload-inplace-inline",
    editable: !disabled,
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      PayloadLinkNode,
      ...unknownNodeTypes(document).map((type) =>
        opaqueNode(
          type,
          unsupportedNodeLabel ? () => unsupportedNodeLabel(type) : undefined,
        ),
      ),
    ],
    theme: {
      text: {
        bold: "pvi:font-bold",
        italic: "pvi:italic",
        underline: "pvi:underline",
        strikethrough: "pvi:line-through",
        code: "pvi:font-mono",
      },
      link: "pvi:underline",
      list: { ul: "pvi:list-disc", ol: "pvi:list-decimal" },
    },
    onError,
  });
  const metadata = new Map<string, RichNode>();
  const state = editor.parseEditorState(JSON.stringify(document));
  state.read(() => rememberMetadata($getRoot(), document.root, metadata));
  editor.setEditorState(state);
  if (element) {
    element.contentEditable = String(!disabled);
    editor.setRootElement(element);
  }
  const disposePlugins = mergeRegister(
    editor.registerCommand(
      FORMAT_TEXT_COMMAND,
      (format) => features !== undefined && !features.includes(format),
      COMMAND_PRIORITY_HIGH,
    ),
    registerRichText(editor),
    registerList(editor),
    registerHistory(editor, createEmptyHistoryState(), 300),
  );
  if (element && autofocus) {
    editor.update(
      () => {
        $getRoot().selectEnd();
      },
      { discrete: true, tag: "initialize" },
    );
    editor.focus(undefined, { defaultSelection: "rootEnd" });
  }
  editor.update(() => {}, { discrete: true, tag: "initialize" });
  let previous = editor
    .getEditorState()
    .read(() => JSON.stringify(serializeLosslessly($getRoot(), metadata)));
  const dispose = mergeRegister(
    disposePlugins,
    editor.registerUpdateListener(
      ({ editorState, dirtyElements, dirtyLeaves, tags }) => {
        if (
          (!dirtyElements.size && !dirtyLeaves.size) ||
          editor.isComposing() ||
          tags.has("initialize")
        )
          return;
        const root = editorState.read(
          () =>
            serializeLosslessly($getRoot(), metadata) as RichDocument["root"],
        );
        const serialized = JSON.stringify(root);
        if (serialized === previous) return;
        previous = serialized;
        onChange({ root });
      },
    ),
  );
  return {
    editor,
    format: (format: RichFormat) => formatRichText(editor, format),
    link: (url: string) => {
      const safe = safeLink(url);
      if (
        !editor.isEditable() ||
        !safe ||
        (features && !features.includes("link"))
      )
        return false;
      let applied = false;
      editor.update(
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || selection.isCollapsed()) return;
          const nodes = selection.extract();
          if (!nodes.length) return;
          const existing = nodes[0].getParent();
          if (existing instanceof PayloadLinkNode) {
            const writable = existing.getWritable();
            applied = true;
            writable.__raw = {
              ...writable.__raw,
              fields: {
                ...(writable.__raw.fields as Record<string, unknown>),
                linkType: "custom",
                url: safe,
              },
            };
            return;
          }
          // Only contiguous inline siblings can be wrapped; multi-block links remain native settings.
          if (
            !nodes.every(
              (node) =>
                node.getParent() === existing &&
                (node.isInline() || node.getType() === "text"),
            )
          )
            return;
          const link = new PayloadLinkNode({
            type: "link",
            version: 3,
            id: crypto.randomUUID(),
            fields: { linkType: "custom", url: safe, newTab: false },
          });
          nodes[0].insertBefore(link);
          link.append(...nodes);
          link.selectEnd();
          applied = true;
        },
        { discrete: true },
      );
      return applied;
    },
    dispose: () => {
      dispose();
      editor.setRootElement(null);
    },
  };
}
/** Formatting updates the existing Lexical transaction and its local text history. */
export function formatRichText(editor: LexicalEditor, format: RichFormat) {
  if (!editor.isEditable()) return;
  if (format === "bullet" || format === "number") {
    editor.dispatchCommand(
      format === "bullet"
        ? INSERT_UNORDERED_LIST_COMMAND
        : INSERT_ORDERED_LIST_COMMAND,
      undefined,
    );
    return;
  }
  if (["paragraph", "h2", "h3", "quote"].includes(format)) {
    editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection))
        $setBlocksType(selection, () =>
          format === "quote"
            ? $createQuoteNode()
            : format === "paragraph"
              ? $createParagraphNode()
              : $createHeadingNode(format as "h2" | "h3"),
        );
    });
    return;
  }
  if (format === "unlink") {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection))
        for (const node of selection.getNodes()) {
          const parent = node.getParent();
          if (parent instanceof PayloadLinkNode) {
            parent.getChildren().forEach((child) => parent.insertBefore(child));
            parent.remove();
          }
        }
    });
    return;
  }
  editor.dispatchCommand(FORMAT_TEXT_COMMAND, format as TextFormatType);
}
