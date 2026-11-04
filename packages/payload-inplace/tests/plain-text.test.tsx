import { describe, expect, it } from "vitest";
import { readPlainText } from "../src/adapters/plain-text.js";
describe("authored plaintext semantics", () => {
  it("preserves source casing, spaces and NBSP regardless of CSS transforms", () => {
    const el = document.createElement("h2");
    el.style.textTransform = "uppercase";
    el.textContent = "Objects for  everyday\u00a0living";
    expect(readPlainText(el)).toBe("Objects for  everyday\u00a0living");
  });
  it.each([
    ["First<div>Second</div>", "First\nSecond"],
    ["<div>First</div><div>Second</div>", "First\nSecond"],
    ["First<br>Second", "First\nSecond"],
    ["First<div><br></div>", "First\n"],
    ["<div><br></div><div><br></div>", "\n"],
    ["<br>", ""],
    ["First<div><br></div><div><br></div>", "First\n\n"],
  ])("serializes browser paragraph markup %s", (html, expected) => {
    const el = document.createElement("div");
    el.innerHTML = html;
    expect(readPlainText(el, true)).toBe(expected);
    expect(readPlainText(el, false)).toBe(expected.replace(/\n/g, " "));
  });
});
