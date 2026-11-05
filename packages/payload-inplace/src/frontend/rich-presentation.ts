import {
  $getNearestNodeFromDOMNode,
  type LexicalEditor,
  type EditorThemeClasses,
} from "lexical";
/** Keep renderer-owned wrapper classes in normal flow. Mount Lexical at the
 * innermost single-child presentation wrapper instead of discarding typography,
 * spacing and descendant selectors between the binding and its rich nodes.
 * Semantic classes remain CSS driven, so responsive rules continue to apply.
 */
export function createRichSurface(original: HTMLElement): {
  surface: HTMLElement;
  editor: HTMLElement;
  theme: EditorThemeClasses;
  source: HTMLElement;
} {
  const surface = original.cloneNode(false) as HTMLElement;
  surface.removeAttribute("id");
  let source = original,
    editor = surface;
  while (
    source.childElementCount === 1 &&
    [...source.childNodes].every(
      (node) => node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim(),
    )
  ) {
    const child = source.firstElementChild;
    if (
      !(child instanceof HTMLElement) ||
      !["DIV", "SECTION", "ARTICLE"].includes(child.tagName)
    )
      break;
    const clone = child.cloneNode(false) as HTMLElement;
    clone.removeAttribute("id");
    editor.append(clone);
    source = child;
    editor = clone;
  }
  const classes = (selector: string) => {
    const nodes = [...source.querySelectorAll<HTMLElement>(selector)];
    return nodes.length
      ? [...nodes[0].classList]
          .filter((name) =>
            nodes.every((node) => node.classList.contains(name)),
          )
          .join(" ")
      : "";
  };
  return {
    surface,
    editor,
    source,
    theme: {
      paragraph: classes("p"),
      heading: Object.fromEntries(
        ["h1", "h2", "h3", "h4", "h5", "h6"].map((tag) => [tag, classes(tag)]),
      ),
      quote: classes("blockquote"),
      link: classes("a"),
      list: { ul: classes("ul"), ol: classes("ol"), listitem: classes("li") },
      text: {
        bold: classes("strong,b"),
        italic: classes("em,i"),
        underline: classes("u"),
        code: classes("code"),
      },
    },
  };
}

/** Restore per-node renderer classes by Lexical identity, not a mutable paragraph
 * index. New nodes inherit only common semantic classes; changing a node's type
 * never carries paragraph-specific classes into a heading or list.
 */
export function preserveRichClasses(
  editor: LexicalEditor,
  source: HTMLElement,
): () => void {
  const root = editor.getRootElement();
  const classes = new Map<string, { tag: string; names: string[] }>();
  if (root)
    editor.read(() => {
      for (const tag of [
        "p",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "blockquote",
        "ul",
        "ol",
        "li",
        "a",
      ]) {
        const rendered = [...source.querySelectorAll<HTMLElement>(tag)];
        root.querySelectorAll<HTMLElement>(tag).forEach((element, index) => {
          const node = $getNearestNodeFromDOMNode(element);
          if (node && rendered[index])
            classes.set(node.getKey(), {
              tag: element.tagName,
              names: [...rendered[index].classList],
            });
        });
      }
    });
  const apply = () => {
    // Lexical installs pre-wrap on its root; retain the renderer cascade instead.
    // Text-node pre-wrap is overridden by the inline surface's inherit utility.
    if (root?.style.whiteSpace) root.style.removeProperty("white-space");
    for (const [key, presentation] of classes) {
      const element = editor.getElementByKey(key);
      if (element?.tagName === presentation.tag && presentation.names.length)
        element.classList.add(...presentation.names);
    }
  };
  apply();
  return editor.registerUpdateListener(apply);
}
