import type { EditorStaticMessageKey } from "@payload-inplace/ui/localization/catalogue";

/** Plugin-owned failures retain a message identity through asynchronous work; native/consumer field validation stays native text. */
export class EditorMessageError extends Error {
  constructor(readonly key: EditorStaticMessageKey) {
    super(key);
    this.name = "EditorMessageError";
  }
}

/** Unknown transport/adapter errors never become untranslated or sensitive UI strings. */
export function editorErrorKey(
  error: unknown,
  fallback: EditorStaticMessageKey,
): EditorStaticMessageKey {
  return error instanceof EditorMessageError ? error.key : fallback;
}
