"use client";

import { createContext, use, useMemo, type ReactNode } from "react";
import {
  createEditorMessages,
  type EditorUIOptions,
  type EditorMessages,
} from "./messages";
import type { EditorStaticMessageKey } from "./catalogue";

const defaults = createEditorMessages();

const Context = createContext<EditorMessages | null>(null);

/** Keeps copy/direction inside the editor island. It does not alter the host document language or native content locale. */
export function EditorMessagesProvider({
  options,
  fallbackLocale = "en",
  children,
}: {
  options?: EditorUIOptions;
  fallbackLocale?: string;
  children: ReactNode;
}) {
  const { locale, direction, messages: overrides } = options || {};
  const messages = useMemo(
    () =>
      createEditorMessages(
        { locale, direction, messages: overrides },
        fallbackLocale,
      ),
    [locale, direction, overrides, fallbackLocale],
  );
  return (
    <Context value={messages}>
      <div
        className="pve:contents"
        lang={messages.locale}
        dir={messages.direction}
      >
        {children}
      </div>
    </Context>
  );
}

/** Consumers may use explicit options outside authoring; active controls normally inherit the current editor catalogue. */
export function useEditorMessages(
  options?: EditorUIOptions,
  fallbackLocale = "en",
): EditorMessages {
  const context = use(Context);
  const explicit = options !== undefined;
  const { locale, direction, messages } = options || {};
  return useMemo(
    () =>
      explicit
        ? createEditorMessages({ locale, direction, messages }, fallbackLocale)
        : context ||
          (fallbackLocale === "en"
            ? defaults
            : createEditorMessages({}, fallbackLocale)),
    [context, explicit, locale, direction, messages, fallbackLocale],
  );
}

/** Small text leaf for class-based error boundaries that cannot call hooks. */
export function EditorMessage({ id }: { id: EditorStaticMessageKey }) {
  return useEditorMessages().t(id);
}
