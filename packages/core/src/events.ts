import type { DocumentReference } from "./document-ref.js";
export type EditorOperation =
  | "save"
  | "preview"
  | "review"
  | "publish"
  | "restore";
export type EditorOutcome = "succeeded" | "failed" | "conflict" | "cancelled";
export type EditorFailureCategory =
  | "network"
  | "session"
  | "validation"
  | "conflict"
  | "preview"
  | "unknown";
type Scope = { document: DocumentReference; locale?: string };
/** Closed event union intentionally excludes values, error messages, raw responses, revisions and all activation/review tokens. */
export type EditorLifecycleEvent =
  | { type: "activated"; scope: Scope }
  | {
      type: "operation-started";
      scope: Scope;
      operation: EditorOperation;
      operationId: string;
      parentOperationId?: string;
    }
  | {
      type: "operation-settled";
      scope: Scope;
      operation: EditorOperation;
      operationId: string;
      parentOperationId?: string;
      outcome: EditorOutcome;
      durationMs: number;
      category?: EditorFailureCategory;
    };
export type EditorObserver = (
  event: EditorLifecycleEvent,
) => void | Promise<void>;
export interface EditorOperationHandle {
  readonly id: string;
  settle: (outcome: EditorOutcome, category?: EditorFailureCategory) => void;
}
/** An active-only metadata channel, not a persistence queue. Observer exceptions/rejections cannot affect native workflows. One handle settles at most once. */
export function createEditorEventChannel(
  scope: Scope,
  {
    now = () => performance.now(),
    id = () => crypto.randomUUID(),
  }: { now?: () => number; id?: () => string } = {},
) {
  const listeners = new Set<EditorObserver>();
  let active = false;
  // Project known provenance explicitly: callers cannot accidentally spread secrets into telemetry.
  const document: DocumentReference =
    scope.document.kind === "global"
      ? { kind: "global", global: scope.document.global }
      : {
          kind: "collection",
          collection: scope.document.collection,
          id: scope.document.id,
        };
  const safeScope = Object.freeze({
    ...(scope.locale ? { locale: scope.locale } : {}),
    document: Object.freeze(document),
  });
  const notify = (listener: EditorObserver, event: EditorLifecycleEvent) => {
    try {
      void Promise.resolve(listener(event)).catch(() => {});
    } catch {
      /* consumer telemetry never controls editing */
    }
  };
  const emit = (event: EditorLifecycleEvent) => {
    if (active)
      for (const listener of listeners) notify(listener, Object.freeze(event));
  };
  return {
    activate() {
      if (active) return;
      active = true;
      emit({ type: "activated", scope: safeScope });
    },
    subscribe(listener: EditorObserver) {
      listeners.add(listener);
      if (active)
        notify(
          listener,
          Object.freeze({ type: "activated", scope: safeScope }),
        );
      return () => {
        listeners.delete(listener);
      };
    },
    start(
      operation: EditorOperation,
      parentOperationId?: string,
    ): EditorOperationHandle {
      const operationId = id(),
        started = now();
      let settled = false;
      emit({
        type: "operation-started",
        scope: safeScope,
        operation,
        operationId,
        ...(parentOperationId ? { parentOperationId } : {}),
      });
      return {
        id: operationId,
        settle(outcome, category) {
          if (settled) return;
          settled = true;
          emit({
            type: "operation-settled",
            scope: safeScope,
            operation,
            operationId,
            ...(parentOperationId ? { parentOperationId } : {}),
            outcome,
            durationMs: Math.max(0, Math.round(now() - started)),
            ...(category ? { category } : {}),
          });
        },
      };
    },
    dispose() {
      active = false;
      listeners.clear();
    },
  };
}
