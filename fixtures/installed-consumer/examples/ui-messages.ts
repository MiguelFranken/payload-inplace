import { createEditorMessages } from "payload-inplace/messages";

/** UI language is independent from the native content locale selected by signed activation. */
export const messages = createEditorMessages({
  locale: "de",
  messages: { de: { selectContent: "Inhalte auswählen" } },
});

export const structuralNote = messages.t("sharedSectionStructure", {
  locale: "en",
});

if (false) {
  // @ts-expect-error Required message parameters cannot be omitted.
  messages.t("sharedSectionStructure");
}
