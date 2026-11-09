"use client";

import {
  createContext,
  use,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  useConfig,
  useDocumentInfo,
  useForm,
  useWatchForm,
  useFormModified,
  useFormProcessing,
  useFormBackgroundProcessing,
} from "@payloadcms/ui";
import type { Activation, EditorTarget } from "../types";
import type { DocumentReference } from "@payload-inplace/core/document-ref";
import { targetDocumentKey, targetScopeKey } from "../state/document-target";
import { authoredFieldKey } from "../state/autosave";
import { useEditorPageTransition } from "../launcher/EditorPageTransition";
import { useNativeDraftSave } from "./controllers/draft-save";
import { useEditorRecovery } from "./recovery";
import { useAdvisoryLock } from "./advisory-lock";
import type { EditorStaticMessageKey } from "@payload-inplace/ui/localization/catalogue";

export interface ResolvedPageScope {
  target: EditorTarget;
  label: string;
}

const Context = createContext<{
  scopes: ResolvedPageScope[];
  active?: ResolvedPageScope;
  phase: "idle" | "waiting" | "locking" | "requesting" | "navigating";
  error?: EditorStaticMessageKey;
  request: (document: DocumentReference, root?: string) => boolean;
  cancel: () => void;
}>({ scopes: [], phase: "idle", request: () => false, cancel: () => {} });

/** Coordinates disclosure/activation only. The existing native Form is the sole value/save owner; a dirty document is saved before leaving, then its controls are disabled before activation. */
export function NativeDocumentScopes({
  context,
  scopes = [],
  onSwitching,
  children,
}: {
  context: Activation;
  scopes?: ResolvedPageScope[];
  onSwitching: (value: boolean) => void;
  children: ReactNode;
}) {
  const form = useForm(),
    info = useDocumentInfo(),
    { config } = useConfig(),
    modified = useFormModified(),
    processing = useFormProcessing(),
    background = useFormBackgroundProcessing();
  // useForm exposes a stable mutable command object; subscribe to the native watch snapshot for disabled transitions.
  const { disabled } = useWatchForm();
  const recovery = useEditorRecovery(),
    advisory = useAdvisoryLock(),
    refresh = useEditorPageTransition();
  const [pending, setPending] = useState<ResolvedPageScope>(),
    [phase, setPhase] = useState<
      "idle" | "waiting" | "locking" | "requesting" | "navigating"
    >("idle"),
    [error, setError] = useState<EditorStaticMessageKey>();
  const disposed = useRef(false),
    request = useRef<AbortController | null>(null),
    saveStarted = useRef(false);
  const save = useNativeDraftSave(
    context.target,
    Boolean(recovery.failure || advisory.status === "other"),
  );
  useEffect(() => {
    disposed.current = false;
    return () => {
      disposed.current = true;
      request.current?.abort();
    };
  }, []);
  const fail = useEffectEvent(() => {
    setError("documentSwitchFailed");
    setPending(undefined);
    setPhase("idle");
    onSwitching(false);
  });
  const start = useEffectEvent(async (next: ResolvedPageScope) => {
    if (!refresh || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    const before = authoredFieldKey(form.getFields());
    setPhase("requesting");
    try {
      const response = await fetch(
        `${config.routes.api}/visual-editor/scope${context.locale ? `?locale=${encodeURIComponent(context.locale)}` : ""}`,
        {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proof: form.getData()._veActivation,
            target: next.target,
            expectedRevision:
              form.getData()._veRevision ?? info.data?.updatedAt,
          }),
        },
      );
      if (!response.ok) throw Error("Scope denied");
      if (disposed.current || controller.signal.aborted) return;
      // Native controls were disabled before the request. Unexpected consumer writes do not silently discard a working copy.
      if (before !== authoredFieldKey(form.getFields()))
        throw Error("Working copy changed during activation");
      setPhase("navigating");
      refresh();
    } catch {
      if (!disposed.current && !controller.signal.aborted) fail();
    } finally {
      request.current = null;
    }
  });
  const drive = useEffectEvent(() => {
    if (
      !pending ||
      !refresh ||
      phase === "requesting" ||
      phase === "navigating"
    )
      return;
    if (recovery.failure || advisory.status === "other") {
      fail();
      return;
    }
    if (processing || background) return;
    if (modified) {
      if (phase === "locking") {
        onSwitching(false);
        setPhase("waiting");
      }
      if (!saveStarted.current) {
        saveStarted.current = true;
        void save().catch(() => {
          if (!disposed.current) fail();
        });
      }
      return;
    }
    if (phase === "waiting") {
      onSwitching(true);
      setPhase("locking");
      return;
    }
    if (phase === "locking" && disabled) void start(pending);
  });
  useEffect(() => {
    drive();
  }, [
    pending,
    phase,
    modified,
    processing,
    background,
    disabled,
    recovery.failure,
    advisory.status,
  ]);
  function choose(document: DocumentReference, root?: string) {
    if (!refresh || phase === "requesting" || phase === "navigating")
      return false;
    const next = scopes.find(
      (scope) =>
        targetDocumentKey(scope.target) === targetDocumentKey(document) &&
        (!root || root === scope.target.root),
    );
    if (!next) return false;
    if (targetScopeKey(next.target) === targetScopeKey(context.target))
      return true;
    (window.document.activeElement as HTMLElement | null)?.blur();
    setError(undefined);
    saveStarted.current = false;
    setPending(next);
    setPhase("waiting");
    return true;
  }
  function cancel() {
    if (phase === "requesting" || phase === "navigating") return;
    setPending(undefined);
    setPhase("idle");
    setError(undefined);
    onSwitching(false);
  }
  return (
    <Context
      value={{
        scopes: refresh ? scopes : [],
        active: scopes.find(
          (scope) =>
            targetScopeKey(scope.target) === targetScopeKey(context.target),
        ),
        phase,
        error,
        request: choose,
        cancel,
      }}
    >
      {children}
    </Context>
  );
}

/** Foreign DOM provenance can request only a server-declared scope; the switch endpoint authorizes it again. */
export function useDocumentScopes() {
  return use(Context);
}
