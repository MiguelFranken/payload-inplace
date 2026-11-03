import selectorParser from "postcss-selector-parser";

/** Adapt the pinned native Payload stylesheet to its isolated shadow host, including root theme qualifiers. */
export function nativeShadowSelector(selector) {
  return selectorParser((selectors) => {
    selectors.walkPseudos((pseudo) => {
      if (pseudo.value === ":root") pseudo.value = ":host";
    });
    selectors.walkTags((tag) => {
      if (tag.value === "html")
        tag.replaceWith(selectorParser.pseudo({ value: ":host" }));
      if (tag.value === "body")
        tag.replaceWith(selectorParser.className({ value: "pve-native-root" }));
    });
    // `:host[data-theme=dark]` cannot match the host across a shadow boundary.
    // Keep every qualifier inside the native functional host selector instead.
    selectors.walkPseudos((host) => {
      if (host.value !== ":host" || host.nodes?.length) return;
      const siblings = host.parent.nodes,
        index = siblings.indexOf(host);
      let start = index,
        end = index + 1;
      while (start > 0 && siblings[start - 1].type !== "combinator") start--;
      while (end < siblings.length && siblings[end].type !== "combinator")
        end++;
      const qualifiers = siblings
        .slice(start, end)
        .filter((node) => node !== host);
      if (!qualifiers.length) return;
      const argument = selectorParser.selector();
      for (const node of qualifiers) argument.append(node.clone());
      host.append(argument);
      for (const node of qualifiers) node.remove();
    });
  }).processSync(selector);
}
