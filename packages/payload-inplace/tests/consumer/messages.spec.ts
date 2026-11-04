import { expect, it } from "vitest";
import { createEditorMessages } from "../../src/i18n/messages.js";
import { englishMessages, germanMessages } from "../../src/i18n/catalogue.js";
import { editorLabel } from "../../src/server/tools.js";
it("keeps complete German catalogues and typed consumer fallback separate from content locale", () => {
  expect(Object.keys(germanMessages).sort()).toEqual(
    Object.keys(englishMessages).sort(),
  );
  const messages = createEditorMessages({
    locale: "de-DE",
    messages: {
      de: { editPage: "Bearbeiten" },
      "de-DE": { editPage: "Hier bearbeiten" },
    },
  });
  expect(messages.t("editPage")).toBe("Hier bearbeiten");
  expect(messages.t("changedFieldCount", { count: 1 })).toBe(
    "1 geändertes Feld",
  );
  expect(messages.t("changedFieldCount", { count: 1200 })).toBe(
    "1.200 geänderte Felder",
  );
  for (const [key, definition] of Object.entries(englishMessages)) {
    const values: Record<string, string | number> = { count: 2 };
    const templates =
      typeof definition === "string" ? [definition] : Object.values(definition);
    for (const text of templates)
      for (const [, name] of text.matchAll(/\{(\w+)\}/g))
        values[name!] ??= "<plain text>";
    expect(Reflect.apply(messages.t, undefined, [key, values])).not.toMatch(
      /\{\w+\}/,
    );
  }
  expect(createEditorMessages({ locale: "fr" }).t("editPage")).toBe(
    "Edit page",
  );
  expect(editorLabel({ en: "Settings", fr: "Réglages" }, "fr-FR")).toBe(
    "Réglages",
  );
  expect(editorLabel({ en: "Settings", fr: "Réglages" }, "ja")).toBe(
    "Settings",
  );
});

it("resolves consumer labels for UI language and keeps drag/retry feedback overridable", async () => {
  const { localizedLabel } = await import("../../src/i18n/labels.js");
  expect(
    localizedLabel({ en: "Section", fr: "Rubrique" }, "fr-FR", "fallback"),
  ).toBe("Rubrique");
  expect(localizedLabel({ fr: "Rubrique" }, "ja", "fallback")).toBe("fallback");
  expect(localizedLabel(() => "server component", "en", "fallback")).toBe(
    "fallback",
  );
  const messages = createEditorMessages({
    locale: "de-DE",
    messages: {
      de: {
        retryUpload: "Noch einmal hochladen",
        sectionMoved: "{label} → {position}",
      },
    },
  });
  expect(messages.t("retryUpload")).toBe("Noch einmal hochladen");
  expect(
    messages.t("sectionMoved", { label: "Abschnitt", position: 1200 }),
  ).toBe("Abschnitt → 1.200");
  expect(messages.t("dragInstructions")).toContain("Leertaste");
});
