import { expect, it } from "vitest";
import { changedElements } from "../../src/frontend/comparison-elements";
import type { DocumentChange } from "../../src/state/document-diff";

it("marks rendered field and group bindings for the displayed side", () => {
  const host = document.createElement("main");
  const bind = (
    path: string,
    options: { scope?: string; visible?: boolean } = {},
  ) => {
    const element = document.createElement("div");
    element.style.visibility = "visible";
    Object.assign(element.dataset, {
      veBlock: "hero",
      veRoot: "layout",
      veDocument: options.scope ?? "active",
      veField: path,
    });
    Object.defineProperty(element, "getClientRects", {
      value: () =>
        options.visible === false ? [] : [new DOMRect(10, 10, 100, 20)],
    });
    host.append(element);
    return element;
  };
  const heading = bind("heading");
  const link = bind("action");
  link.removeAttribute("data-ve-field");
  link.dataset.veFields = JSON.stringify(["action.label", "action.href"]);
  const note = bind("note");
  bind("heading", { scope: "another-document" });
  bind("heading", { visible: false });
  bind("cards.@item");
  bind("unchanged");
  document.body.append(host);
  try {
    const change = (
      path: string,
      kind: DocumentChange["kind"] = "changed",
    ): DocumentChange => ({
      path: `sections.@hero.${path}`,
      labels: ["Sections", "Hero 1", path],
      kind,
      before: "old",
      after: kind === "removed" ? undefined : "new",
    });
    const fields = [
      change("heading"),
      change("action.label"),
      change("action.href"),
      change("note", "removed"),
      change("cards.@item.unrendered"),
    ];
    const find = (side: "draft" | "published") =>
      changedElements({
        host,
        root: "layout",
        scopeKey: "active",
        side,
        fields,
        resolve: ([id], path) => `sections.@${id}.${path}`,
      }).map(({ element }) => element);

    expect(find("draft")).toEqual([heading, link]);
    expect(find("published")).toEqual([heading, link, note]);
  } finally {
    host.remove();
  }
});
