/** Payload 3.91 publishes React Select with a bundled private Emotion context. An external CacheProvider cannot redirect that cache.
 * Copy only its generated class rules actually used inside the editor shadow root, preserving native styling without authored CSS or global resets.
 * CSSOM insertions do not emit DOM mutations; native control mounts/class changes trigger the coalesced read after their insertion effects finish.
 */
export function installNativeRuntimeStyles(root: ShadowRoot): () => void {
  const style = document.createElement("style");
  style.dataset.veNativeRuntime = "";
  root.append(style);
  let frame = 0,
    disposed = false,
    previous = "";
  function sync() {
    frame = 0;
    if (disposed) return;
    const classes = new Set(
      [...root.querySelectorAll<HTMLElement>("[class]")].flatMap((node) =>
        [...node.classList].filter((name) => name.startsWith("css-")),
      ),
    );
    function select(rules: CSSRuleList): string {
      return [...rules]
        .flatMap((rule) => {
          if ("selectorText" in rule) {
            const used = [
              ...(rule as CSSStyleRule).selectorText.matchAll(
                /\.(css-[a-zA-Z0-9_-]+)/g,
              ),
            ].some((match) => classes.has(match[1]));
            return used ? [rule.cssText] : [];
          }
          if ("cssRules" in rule && "conditionText" in rule) {
            const nested = select(
              (rule as unknown as CSSGroupingRule).cssRules,
            );
            return nested
              ? [
                  rule.cssText.slice(0, rule.cssText.indexOf("{") + 1) +
                    nested +
                    "}",
                ]
              : [];
          }
          return [];
        })
        .join("\n");
    }
    let css = "";
    for (const source of document.querySelectorAll<HTMLStyleElement>(
      "style[data-emotion]",
    )) {
      try {
        if (source.sheet) css += select(source.sheet.cssRules);
      } catch {
        /* Ignore inaccessible foreign sheets. */
      }
    }
    if (css !== previous) {
      previous = css;
      style.textContent = css;
    }
  }
  function schedule(records?: MutationRecord[]) {
    if (
      records?.every(
        (record) =>
          record.target === style || record.target.parentNode === style,
      )
    )
      return;
    if (!frame) frame = requestAnimationFrame(sync);
  }
  const controls = new MutationObserver(schedule),
    sheets = new MutationObserver(schedule);
  controls.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class"],
  });
  sheets.observe(document.head, {
    subtree: true,
    childList: true,
    characterData: true,
  });
  schedule();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    controls.disconnect();
    sheets.disconnect();
    style.remove();
  };
}
