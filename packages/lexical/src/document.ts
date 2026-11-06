import {
  ElementNode,
  DecoratorNode,
  type LexicalNode,
  type Klass,
  type NodeKey,
  type SerializedLexicalNode,
  type SerializedElementNode,
  type DOMConversionMap,
  type EditorConfig,
} from "lexical";

/** JSON is kept at this boundary; unknown Payload nodes are opaque, never flattened into text. */
export interface RichNode extends SerializedLexicalNode {
  children?: RichNode[];
  [key: string]: unknown;
}

export interface RichDocument {
  root: RichNode & { children: RichNode[] };
}

export function isRichDocument(value: unknown): value is RichDocument {
  if (!value || typeof value !== "object" || !("root" in value)) return false;
  const root = value.root;
  return Boolean(
    root &&
      typeof root === "object" &&
      "type" in root &&
      root.type === "root" &&
      "children" in root &&
      Array.isArray(root.children),
  );
}

export function safeLink(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  const url = value.trim();
  if ([...url].some((char) => char.charCodeAt(0) <= 32)) return;
  return /^(?:https?:\/\/|mailto:|tel:|#|\/(?!\/))/i.test(url)
    ? url
    : undefined;
}

/** Payload's link node stores fields and IDs separately from Lexical's generic URL shape. */
export class PayloadLinkNode extends ElementNode {
  __raw: RichNode;

  static getType() {
    return "link";
  }

  static clone(node: PayloadLinkNode) {
    return new PayloadLinkNode(node.__raw, node.__key);
  }

  constructor(
    raw: RichNode = {
      type: "link",
      version: 3,
      fields: { linkType: "custom", url: "/" },
    },
    key?: NodeKey,
  ) {
    super(key);
    this.__raw = raw;
  }

  static importJSON(raw: RichNode) {
    return new PayloadLinkNode(raw).updateFromJSON(
      raw as SerializedElementNode,
    );
  }

  static importDOM(): DOMConversionMap {
    return {
      a: () => ({
        priority: 1,
        conversion: (dom: Node) => {
          const url = safeLink((dom as HTMLAnchorElement).getAttribute("href"));
          return url
            ? {
                node: new PayloadLinkNode({
                  type: "link",
                  version: 3,
                  id: crypto.randomUUID(),
                  fields: { linkType: "custom", url, newTab: false },
                }),
              }
            : { node: null };
        },
      }),
    };
  }

  createDOM(config: EditorConfig) {
    const element = document.createElement("a");
    if (config.theme.link)
      element.classList.add(...config.theme.link.split(/\s+/).filter(Boolean));
    element.href =
      safeLink((this.__raw.fields as Record<string, unknown>)?.url) || "#";
    return element;
  }

  updateDOM(previous: PayloadLinkNode, dom: HTMLElement) {
    if (this.__raw !== previous.__raw)
      (dom as HTMLAnchorElement).href =
        safeLink((this.__raw.fields as Record<string, unknown>)?.url) || "#";
    return false;
  }

  isInline() {
    return true;
  }

  exportJSON(): SerializedElementNode {
    return {
      ...this.__raw,
      ...super.exportJSON(),
      type: "link",
      version: Number(this.__raw.version || 3),
      fields: this.__raw.fields,
      ...(this.__raw.id ? { id: this.__raw.id } : {}),
    } as SerializedElementNode;
  }
}

/** Unknown/custom nodes are immutable islands. Their complete JSON survives unrelated edits.
 * Consumers use native settings for the island itself; no arbitrary HTML or upload URL is trusted here.
 */
export function opaqueNode(
  type: string,
  label?: () => string,
): Klass<LexicalNode> {
  return class OpaqueNode extends DecoratorNode<null> {
    __raw: RichNode;

    static getType() {
      return type;
    }

    static clone(node: OpaqueNode) {
      return new OpaqueNode(node.__raw, node.__key);
    }

    static importJSON(raw: RichNode) {
      return new OpaqueNode(raw);
    }

    constructor(raw: RichNode, key?: NodeKey) {
      super(key);
      this.__raw = raw;
    }

    exportJSON() {
      return this.__raw;
    }

    createDOM() {
      const dom = document.createElement("span");
      dom.setAttribute("contenteditable", "false");
      dom.dataset.pveOpaque = type;
      dom.textContent = label?.() ?? `[${type} · edit in settings]`;
      return dom;
    }

    updateDOM() {
      return false;
    }

    decorate() {
      return null;
    }

    isInline() {
      return true;
    }

    isKeyboardSelectable() {
      return true;
    }
  };
}

export function unknownNodeTypes(document: RichDocument): string[] {
  const types = new Set<string>();
  const known = new Set([
    "root",
    "paragraph",
    "text",
    "linebreak",
    "tab",
    "heading",
    "quote",
    "list",
    "listitem",
    "link",
  ]);
  function walk(node: RichNode) {
    if (!known.has(node.type)) {
      types.add(node.type);
      return;
    }
    node.children?.forEach(walk);
  }
  walk(document.root);
  return [...types];
}

/** Restore untouched metadata by Lexical node identity, not array position or displayed text. */
export function rememberMetadata(
  node: LexicalNode,
  raw: RichNode,
  metadata: Map<string, RichNode>,
): void {
  metadata.set(node.getKey(), raw);
  if (node instanceof ElementNode)
    node.getChildren().forEach((child, index) => {
      const original = raw.children?.[index];
      if (original) rememberMetadata(child, original, metadata);
    });
}

export function serializeLosslessly(
  node: LexicalNode,
  metadata: Map<string, RichNode>,
): RichNode {
  const current = node.exportJSON() as RichNode;
  const raw = metadata.get(node.getKey());
  return {
    ...raw,
    ...current,
    ...(node instanceof ElementNode
      ? {
          children: node
            .getChildren()
            .map((child) => serializeLosslessly(child, metadata)),
        }
      : {}),
  };
}
