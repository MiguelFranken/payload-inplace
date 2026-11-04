"use client";
import {
  createContext,
  use,
  useEffect,
  useEffectEvent,
  useMemo,
  type ReactNode,
} from "react";
import {
  createEditorEventChannel,
  type EditorObserver,
} from "../../../core/src/events.js";
import {
  documentReference,
  targetDocumentKey,
} from "../state/document-target.js";
import { useLocale } from "@payloadcms/ui";
import type { EditorTarget } from "../types.js";
const Context = createContext<ReturnType<
  typeof createEditorEventChannel
> | null>(null);
/** Mounts only inside an activated native document scope. No telemetry transport is provided by the plugin. */
export function EditorLifecycleProvider({
  target,
  locale,
  children,
}: {
  target: EditorTarget;
  locale?: string;
  children: ReactNode;
}) {
  const nativeLocale = useLocale();
  locale ??= nativeLocale.code || undefined;
  const scope = targetDocumentKey(target);
  const channel = useMemo(
    () =>
      createEditorEventChannel({
        document: documentReference(target),
        ...(locale ? { locale } : {}),
      }),
    [scope, locale],
  );
  useEffect(() => {
    channel.activate();
    return () => channel.dispose();
  }, [channel]);
  return <Context value={channel}>{children}</Context>;
}
/** Consumer import-map providers opt into metadata events. Changing callbacks neither reloads the document nor changes native submission behavior. */
export function useEditorObserver(observer: EditorObserver) {
  const channel = use(Context),
    observe = useEffectEvent(observer);
  useEffect(() => channel?.subscribe((event) => observe(event)), [channel]);
}
/** Internal orchestration starts metadata-only handles after native state transitions. */
export function useEditorLifecycle() {
  const channel = use(Context);
  if (!channel) throw Error("Lifecycle events require an activated document");
  return channel;
}

/** Shared admin controls may run outside frontend authoring and therefore emit nothing. */
export function useOptionalEditorLifecycle() {
  return use(Context);
}
