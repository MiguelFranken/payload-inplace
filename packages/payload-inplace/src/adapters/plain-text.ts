const blocks = new Set(["DIV", "P", "LI", "PRE", "BLOCKQUOTE"]);
/** Read authored text rather than CSS-transformed innerText. Browser-created plaintext
 * paragraphs are line breaks; layout wrapping and pseudo-elements are not content.
 * Keep intentional spaces/NBSP; a lone BR is the browser's empty editable placeholder.
 */
export function readPlainText(element: HTMLElement, multiline = false): string {
  function read(parent: Node): string {
    const children = [...parent.childNodes];
    if (children.length === 1 && children[0]?.nodeName === "BR") return "";
    let result = "",
      previousBlock = false,
      seen = false;
    for (const child of children) {
      const block = blocks.has(child.nodeName);
      if (
        seen &&
        (block || previousBlock) &&
        (!result.endsWith("\n") || previousBlock)
      )
        result += "\n";
      if (child.nodeType === 3) result += child.nodeValue || "";
      else if (child.nodeName === "BR") result += "\n";
      else result += read(child);
      previousBlock = block;
      seen = true;
    }
    return result;
  }
  const value = read(element).replace(/\r\n?/g, "\n");
  return multiline ? value : value.replace(/\n/g, " ");
}
