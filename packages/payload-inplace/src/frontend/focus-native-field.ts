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
  let lastFocused: HTMLElement | undefined;
  function resolveTarget() {
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
    return target;
  }
  function focus() {
    frame = 0;
    if (disposed || !container.isConnected || lastFocused?.isConnected) return;
    const target = resolveTarget();
    if (!target || target.getAttribute("aria-disabled") === "true") return;
    // Payload may replace a lazy Lexical root during initialization. Keep
    // observing until the user deliberately moves focus or the panel closes.
    lastFocused = target;
    if (
      (target.getRootNode() as Document | ShadowRoot).activeElement !== target
    )
      target.focus({ preventScroll: true });
  }
  function schedule() {
    if (!disposed && !frame) frame = requestAnimationFrame(focus);
  }
  const cancel = () => {
    disposed = true;
    observer.disconnect();
    cancelAnimationFrame(frame);
    container.removeEventListener("focusout", schedule);
    container.removeEventListener("focusin", respectFocus);
    container.ownerDocument.removeEventListener("pointerdown", cancel, true);
    container.removeEventListener("keydown", navigate, true);
  };
  // Programmatic focus is also deliberate navigation (e.g. native field APIs).
  // Only reconnect a replaced owner; never pull focus out of another control.
  const respectFocus = (event: FocusEvent) => {
    if (event.target !== resolveTarget()) cancel();
  };
  const navigate = (event: KeyboardEvent) => {
    if (event.key === "Tab") cancel();
  };
  container.addEventListener("focusout", schedule);
  container.addEventListener("focusin", respectFocus);
  container.ownerDocument.addEventListener("pointerdown", cancel, true);
  container.addEventListener("keydown", navigate, true);
  observer.observe(container, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["contenteditable", "disabled"],
  });
  schedule();
  return cancel;
}
