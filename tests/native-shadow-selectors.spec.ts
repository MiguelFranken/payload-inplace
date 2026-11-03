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
