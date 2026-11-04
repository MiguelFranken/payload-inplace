"use client";
import { useTranslation } from "@payloadcms/ui";
import type { ReactNode } from "react";
import type { EditorUIOptions } from "../i18n/messages.js";
import { EditorMessagesProvider } from "./messages.js";
/** Native UI language supplies the default; selected document content locale remains owned by Payload's LocaleProvider. */
export function NativeEditorMessages({
  options,
  children,
}: {
  options?: EditorUIOptions;
  children: ReactNode;
}) {
  const { i18n } = useTranslation();
  return (
    <EditorMessagesProvider options={options} fallbackLocale={i18n.language}>
      {children}
    </EditorMessagesProvider>
  );
}
