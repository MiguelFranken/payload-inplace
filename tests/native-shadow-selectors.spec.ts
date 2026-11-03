import { expect, it } from "vitest";
import { nativeShadowSelector } from "../scripts/native-shadow-selectors.mjs";
it("retains native dark root qualifiers inside the functional shadow host", () => {
  expect(nativeShadowSelector("html[data-theme=dark]")).toBe(
    ":host([data-theme=dark])",
  );
  expect(nativeShadowSelector("html[data-theme=dark] .field")).toBe(
    ":host([data-theme=dark]) .field",
  );
  expect(nativeShadowSelector(":root[data-theme=light]")).toBe(
    ":host([data-theme=light])",
  );
});
it("keeps native body descendants scoped without changing their own attributes", () => {
  expect(nativeShadowSelector(":root")).toBe(":host");
  expect(nativeShadowSelector("html body .field[data-active]")).toBe(
    ":host .pve-native-root .field[data-active]",
  );
});

import postcss from "postcss";
import { nativeShadowStyles } from "../scripts/native-shadow-styles.mjs";
import { nativeStyleUnits } from "../src/frontend/native-style-units.mjs";
it("isolates upstream rem lengths and panel breakpoints while retaining host baseline and reduced motion", () => {
  const result = nativeShadowStyles(
    postcss.parse(
      `html {font-size:13px;--base:calc(1.5 * 1rem)} @media(max-width:1024px){html{font-size:12px}.row{display:block;padding:1rem}} @media(prefers-reduced-motion){.row{transition:none}}`,
    ),
  ).toString();
  expect(result).toContain("--pve-native-rem:13px");
  expect(result).toContain("--pve-native-rem:12px");
  expect(result).toContain("@container pve-native (max-width:1024px)");
  expect(result).toContain("@media(max-width:1024px)");
  expect(result).toContain("var(--pve-native-rem, 13px)");
  expect(result).toContain("@media(prefers-reduced-motion)");
});
it("preserves quoted CSS content and URLs when adapting native lengths", () => {
  expect(
    nativeStyleUnits(`1rem -0.5rem var(--1rem) url(image-1rem.png) "1rem"`),
  ).toBe(
    `calc(1 * var(--pve-native-rem, 13px)) calc(-0.5 * var(--pve-native-rem, 13px)) var(--1rem) url(image-1rem.png) "1rem"`,
  );
});
