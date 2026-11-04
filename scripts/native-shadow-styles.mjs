import { nativeShadowSelector } from "./native-shadow-selectors.mjs";
import { nativeStyleUnits } from "../packages/payload-inplace/src/frontend/native-style-units.mjs";
/** Adapt exact peer CSS, retaining the native cascade and reduced-motion queries. Width breakpoints follow the nearest native surface. */
export function nativeShadowStyles(tree) {
  tree.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && /keyframes$/.test(rule.parent.name))
      return;
    rule.selector = nativeShadowSelector(rule.selector);
    // Preserve Payload's own responsive root baseline rather than inheriting the website's rem.
    if (
      rule.selector
        .split(",")
        .some((selector) => /^:host(?:\([^)]*\))?$/.test(selector))
    ) {
      rule.walkDecls("font-size", (declaration) => {
        if (/^\d+(?:\.\d+)?px$/.test(declaration.value))
          rule.append({ prop: "--pve-native-rem", value: declaration.value });
      });
    }
  });
  tree.walkDecls((declaration) => {
    declaration.value = nativeStyleUnits(declaration.value);
  });
  tree.walkAtRules("media", (query) => {
    if (!/^\((?:min|max)-width:\s*\d+(?:\.\d+)?px\)$/.test(query.params))
      return;
    // The host is outside its shadow tree's containers; its baseline/theme variables retain viewport semantics.
    const roots = query.nodes.filter(
      (node) =>
        node.type === "rule" &&
        node.selector
          .split(",")
          .some((selector) => /^:host(?:\([^)]*\))?$/.test(selector)),
    );
    if (roots.length) {
      const viewport = query.clone({ nodes: [] });
      for (const rule of roots) {
        viewport.append(rule.clone());
        rule.remove();
      }
      query.before(viewport);
    }
    if (!query.nodes.length) {
      query.remove();
      return;
    }
    query.name = "container";
    query.params = `pve-native ${query.params}`;
  });
  return tree;
}
