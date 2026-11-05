/** Focus the native owner of a selected leaf after its control mounts.
 * Payload scalar inputs use field IDs; Lexical uses data-field-path on its
 * asynchronous root. Never focus a different sibling while waiting for it.
 * Returns cleanup for panel dismissal or a new selection.
 */
export function focusNativeField(
  container: HTMLElement,
  path?: string,
): () => void {
  let frame = 0;
  let disposed = false;
  const observer = new MutationObserver(schedule);
  function focus() {
    frame = 0;
    if (disposed || !container.isConnected) return;
    const selector =
      "input:not([type=hidden]):not(:disabled),textarea:not(:disabled),[contenteditable=true]";
    let field: HTMLElement | undefined;
    if (path) {
      const id = `field-${path.replaceAll(".", "__")}`;
      field = [
        ...container.querySelectorAll<HTMLElement>("[id],[data-field-path]"),
      ].find(
        (element) =>
          element.id === id || element.getAttribute("data-field-path") === path,
      );
    } else field = container.querySelector<HTMLElement>(selector) || undefined;
    const target = field?.matches(selector)
      ? field
      : field?.querySelector<HTMLElement>(selector);
    if (!target || target.getAttribute("aria-disabled") === "true") return;
    target.focus({ preventScroll: true });
    observer.disconnect();
    disposed = true;
  }
  function schedule() {
    if (!disposed && !frame) frame = requestAnimationFrame(focus);
  }
  observer.observe(container, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["contenteditable", "disabled"],
  });
  schedule();
  return () => {
    disposed = true;
    observer.disconnect();
    cancelAnimationFrame(frame);
  };
}
