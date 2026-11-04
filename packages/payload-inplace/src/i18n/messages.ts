import {
  createMessages,
  type MessageOptions,
  type MessageTranslator,
} from "../../../core/src/messages.js";
import { englishMessages, germanMessages } from "./catalogue.js";
export type EditorMessages = MessageTranslator<typeof englishMessages>;
export type EditorMessageOverrides = NonNullable<
  MessageOptions<typeof englishMessages>["overrides"]
>;
/** UI copy/formatting only. This configuration never selects a Payload content locale or expands document access. */
export interface EditorUIOptions {
  locale?: string;
  direction?: "ltr" | "rtl";
  messages?: Record<string, EditorMessageOverrides>;
}
/** Construct an overridable UI catalogue for server renderers, launchers and active controls. Unknown locales fall back to English copy with their own Intl formatting/direction. */
export function createEditorMessages(
  options: EditorUIOptions = {},
  fallbackLocale = "en",
): EditorMessages {
  const locale = options.locale || fallbackLocale,
    language = locale.split("-")[0]?.toLowerCase() || "en";
  return createMessages(englishMessages, {
    locale,
    ...(options.direction ? { direction: options.direction } : {}),
    overrides: {
      ...(language === "de" ? germanMessages : {}),
      ...options.messages?.[language],
      ...options.messages?.[locale],
    },
  });
}
export type { EditorMessageKey } from "./catalogue.js";
