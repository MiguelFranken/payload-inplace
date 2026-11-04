"use client";
import { createPortal } from "react-dom";
import {
  Component,
  startTransition,
  useCallback,
  useLayoutEffect,
  useMemo,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  RootProvider,
  DocumentInfoProvider,
  EditDepthProvider,
  OperationProvider,
  Form,
  useConfig,
  useDocumentInfo,
  useForm,
  useServerFunctions,
} from "@payloadcms/ui";
import type { BlocksFieldClientProps, FormState } from "payload";
import {
  EditorToolsProvider,
  type ResolvedEditorExtension,
} from "./tools-context.js";
import { FieldOwnershipProvider } from "./field-ownership.js";
import type { EditorTool } from "../types.js";
import type { Activation } from "../types.js";
import type { StructuralPolicy } from "../state/policy.js";
import {
  RecoveryContext,
  NativeSubmissionMonitor,
  useRecoveryState,
} from "./recovery.js";
import { ReviewBaselineContext } from "../admin/review-baseline.js";
import { NativeAutosaveTrigger } from "./NativeAutosaveTrigger.js";
import { InlinePreviewContext, NativePreviewSync } from "./inline-preview.js";
import { installNativeRuntimeStyles } from "./native-runtime-styles.js";
import {
  protectNativeAcknowledgement,
  nativeSnapshotMatches,
} from "../state/acknowledgement.js";
import { PreviewStatusContext } from "./preview-status.js";
import type { EditorPreviewSnapshot, EditorPreviewResponse } from "../types.js";
import { FieldStrategiesProvider } from "./field-strategies.js";
import { TransientPreviewProvider } from "./transient-preview.js";
import { FrontendControls } from "./FrontendControls.js";

type ShellProps = {
  strategyProviders?: ReactNode;
  catalogue?: import("../types.js").VisualEditorOptions["catalogue"];
  richTextCapabilities?: import("../adapters/richtext-capabilities.js").RichTextCapabilities;
  blockControls?: import("../types.js").VisualEditorOptions["blockControls"];
  tools: EditorTool[];
  extensions: ResolvedEditorExtension[];
  children: ReactNode;
  /** Optional client presentational renderer, rendered inside native Form via a portal into the actual website. */
  preview?: ReactNode;
  refreshPreview: () => Promise<EditorPreviewResponse>;
  context: Activation;
  css: string;
  theme: "light" | "dark";
  rootProps: Omit<ComponentProps<typeof RootProvider>, "children">;
  initialData: Record<string, any>;
  initialState: FormState;
  field: BlocksFieldClientProps["field"];
  fieldPermissions: any;
  docPermissions: any;
  hasPublishPermission: boolean;
  statusURL: string;
  exitURL: string;
  policy?: StructuralPolicy;
};

/** One native form/provider graph is portalled into an isolated UI island; the real website stays in the page DOM.
 * Bootstrap state is retained across saved-server RSC refreshes so a refresh cannot reset newer local keystrokes.
 */
export function FrontendShell(props: ShellProps) {
  const bootstrap = useRef(props).current;
  const [serverSnapshot, setServerSnapshot] = useState<EditorPreviewSnapshot>({
    revision: props.initialData._veRevision ?? props.initialData.updatedAt,
    content: props.children,
    preview: props.preview,
  });
  const acceptSnapshot = useCallback(
    (snapshot: EditorPreviewSnapshot) =>
      startTransition(() =>
        setServerSnapshot((current) =>
          snapshot.revision >= current.revision
            ? {
                ...snapshot,
                preview:
                  snapshot.preview === undefined
                    ? current.preview
                    : snapshot.preview,
              }
            : current,
        ),
      ),
    [],
  );
  const host = useRef<HTMLDivElement>(null);
  const [previewTarget, setPreviewTarget] = useState<HTMLDivElement | null>(
    null,
  );
  const [previewReady, setPreviewReady] = useState(false);
  const [shadow, setShadow] = useState<ShadowRoot | null>(null);
  useLayoutEffect(
    () => (shadow ? installNativeRuntimeStyles(shadow) : undefined),
    [shadow],
  );
  const [inlineActive, setInlineActive] = useState(false),
    [waitingForInlineSave, setWaitingForInlineSave] = useState(false);
  const floor = useRef<string | number>(
    props.initialData._veRevision ?? props.initialData.updatedAt,
  );
  const begin = useCallback(() => {
    setInlineActive(true);
    setWaitingForInlineSave(true);
  }, []);
  const end = useCallback(
    () => startTransition(() => setInlineActive(false)),
    [],
  );
  const synchronized = useCallback((revision: string | number) => {
    if (revision >= floor.current) floor.current = revision;
    startTransition(() => setWaitingForInlineSave(false));
  }, []);
  const inlineGuard = useMemo(
    () => ({ active: inlineActive, begin, end, synchronized }),
    [inlineActive, begin, end, synchronized],
  );
  const accepted = useRef({
    revision: props.initialData._veRevision ?? props.initialData.updatedAt,
    children: props.children,
    preview: props.preview,
  });
  const propsRevision =
    props.initialData._veRevision ?? props.initialData.updatedAt;
  const source =
    serverSnapshot.revision >= propsRevision
      ? serverSnapshot
      : {
          revision: propsRevision,
          content: props.children,
          preview: props.preview,
        };
  const revision = source.revision;
  // A suspended preview must not leak into an urgent editor render through a ref.
  // Retain only the last committed tree while inline editing owns the page DOM.
  const visible =
    !inlineActive &&
    !waitingForInlineSave &&
    revision >= floor.current &&
    revision >= accepted.current.revision
      ? { revision, children: source.content, preview: source.preview }
      : accepted.current;
  useLayoutEffect(() => {
    accepted.current = visible;
  }, [visible]);
  useEffect(() => {
    if (host.current)
      setShadow(
        host.current.shadowRoot || host.current.attachShadow({ mode: "open" }),
      );
  }, []);
  return (
    <InlinePreviewContext value={inlineGuard}>
      {props.preview ? (
        <div ref={setPreviewTarget} data-ve-preview="">
          {!previewReady && visible.children}
        </div>
      ) : (
        visible.children
      )}
      <div
        ref={host}
        data-ve-ui=""
        data-theme={bootstrap.theme}
        style={
          {
            "--z-modal": "calc(var(--pve-z-index,2147483000) + 100)",
          } as import("react").CSSProperties
        }
      >
        {shadow &&
          createPortal(
            <>
              <style>{bootstrap.css}</style>
              <div className="pve-native-root pve:contents!">
                <RootProvider {...bootstrap.rootProps}>
                  <DocumentInfoProvider
                    collectionSlug={bootstrap.context.target.collection as any}
                    id={bootstrap.context.target.id}
                    initialData={bootstrap.initialData}
                    initialState={bootstrap.initialState}
                    docPermissions={bootstrap.docPermissions}
                    hasSavePermission={Boolean(bootstrap.docPermissions.update)}
                    hasPublishPermission={bootstrap.hasPublishPermission}
                    hasPublishedDoc={
                      bootstrap.initialData._status === "published"
                    }
                    currentEditor={bootstrap.rootProps.user as any}
                    isEditing
                    isLocked={false}
                    lastUpdateTime={new Date(
                      bootstrap.initialData.updatedAt,
                    ).getTime()}
                    mostRecentVersionIsAutosaved={false}
                    unpublishedVersionCount={0}
                    versionCount={0}
                  >
                    <EditDepthProvider>
                      <OperationProvider operation="update">
                        <NativeDocumentForm
                          {...bootstrap}
                          onSnapshot={acceptSnapshot}
                          preview={visible.preview}
                          previewTarget={previewTarget}
                          previewReady={previewReady}
                          onPreviewReady={() => setPreviewReady(true)}
                          renderedRevision={visible.revision}
                        >
                          {visible.children}
                        </NativeDocumentForm>
                      </OperationProvider>
                    </EditDepthProvider>
                  </DocumentInfoProvider>
                </RootProvider>
              </div>
            </>,
            shadow,
          )}
      </div>
    </InlinePreviewContext>
  );
}
function NativeDocumentForm(
  props: ShellProps & {
    renderedRevision: string | number;
    onSnapshot: (snapshot: EditorPreviewSnapshot) => void;
    previewTarget: HTMLElement | null;
    previewReady: boolean;
    onPreviewReady: () => void;
  },
) {
  const info = useDocumentInfo(),
    { config } = useConfig(),
    { getFormState } = useServerFunctions();
  const recovery = useRecoveryState(props.statusURL);
  const nativeForm = useRef<ReturnType<typeof useForm> | null>(null);
  const [previewPending, setPreviewPending] = useState(false),
    [previewError, setPreviewError] = useState("");
  const previewRead = useRef(false),
    requested = useRef<string | number>(
      props.initialData._veRevision ?? props.initialData.updatedAt,
    ),
    disposed = useRef(false);
  useEffect(() => {
    disposed.current = false;
    return () => {
      disposed.current = true;
    };
  }, []);
  async function refreshSavedPreview(revision: string | number) {
    if (revision > requested.current) requested.current = revision;
    if (previewRead.current || disposed.current) return;
    previewRead.current = true;
    setPreviewPending(true);
    setPreviewError("");
    try {
      let again = false;
      do {
        const minimum = requested.current;
        const result = await props.refreshPreview();
        if (disposed.current) return;
        if ("error" in result) {
          if (result.error === "denied") {
            recovery.setFailure({
              kind: "session",
              message:
                "Editing access expired or was revoked. Your working copy is retained. Download it before signing in again.",
            });
            nativeForm.current?.setDisabled(true);
          } else
            setPreviewError(
              "Your draft is saved. The server preview could not refresh.",
            );
          break;
        }
        props.onSnapshot(result);
        if (result.revision < minimum) {
          setPreviewError(
            "Your draft is saved. The server preview has not reached its saved revision yet.",
          );
          break;
        }
        again = requested.current > result.revision;
      } while (again);
    } catch {
      if (!disposed.current)
        setPreviewError(
          "Your draft is saved. The server preview could not refresh.",
        );
    } finally {
      previewRead.current = false;
      if (!disposed.current) setPreviewPending(false);
    }
  }
  const inFlightChange = useRef<AbortController | null>(null),
    generation = useRef(0);
  useEffect(() => () => inFlightChange.current?.abort(), []);
  return (
    <ReviewBaselineContext value={props.initialData}>
      <RecoveryContext value={recovery}>
        <Form
          initialState={props.initialState}
          isDocumentForm
          method="PATCH"
          action={`${config.routes.api}/${props.context.target.collection}/${props.context.target.id}?draft=true&depth=0`}
          className="pve:contents"
          disabled={!info.hasSavePermission}
          disableValidationOnSubmit
          onSubmit={() => {
            recovery.started();
            generation.current++;
            inFlightChange.current?.abort();
          }}
          onChange={[
            async ({ formState, submitted }) => {
              inFlightChange.current?.abort();
              const controller = new AbortController();
              inFlightChange.current = controller;
              const before = generation.current;
              const result = await getFormState({
                id: props.context.target.id,
                collectionSlug: props.context.target.collection,
                docPermissions: info.docPermissions,
                docPreferences: { fields: {} },
                formState,
                operation: "update",
                schemaPath: props.context.target.collection,
                renderAllFields: false,
                returnLockStatus: false,
                skipValidation: !submitted,
                signal: controller.signal,
              });
              if (controller.signal.aborted || before !== generation.current)
                return undefined as unknown as FormState;
              if (result?.state)
                result.state._veActivation = props.initialState._veActivation;
              if (
                !nativeSnapshotMatches(
                  formState,
                  nativeForm.current?.getFields() || formState,
                )
              )
                return undefined as unknown as FormState;
              return result?.state || formState;
            },
          ]}
          onSuccess={async (json: any, ctx) => {
            const doc = json.doc || json;
            const result = await getFormState({
              id: props.context.target.id,
              collectionSlug: props.context.target.collection,
              data: doc,
              formState: ctx?.formState,
              docPermissions: info.docPermissions,
              docPreferences: { fields: {} },
              operation: "update",
              schemaPath: props.context.target.collection,
              renderAllFields: false,
              skipValidation: true,
            });
            if (!result?.state)
              throw new Error(
                "Saved; unable to refresh native field state. Reload the saved draft.",
              );
            result.state._veActivation = props.initialState._veActivation;
            recovery.saved();
            info.setData(doc);
            info.setLastUpdateTime(new Date(doc.updatedAt).getTime());
            void refreshSavedPreview(doc._veRevision ?? doc.updatedAt);
            return protectNativeAcknowledgement(
              result.state,
              ctx?.formState || {},
              nativeForm.current?.getFields() || ctx?.formState || {},
            );
          }}
        >
          <CaptureNativeForm formRef={nativeForm} />
          <PreviewStatusContext
            value={{
              pending: previewPending,
              error: previewError,
              retry: () => void refreshSavedPreview(requested.current),
            }}
          >
            <EditorToolsProvider
              context={props.context}
              tools={props.tools}
              extensions={props.extensions}
            >
              <FieldOwnershipProvider>
                <FieldStrategiesProvider>
                  {props.strategyProviders}
                  <TransientPreviewProvider capable={Boolean(props.preview)}>
                    {props.preview && props.previewTarget && (
                      <PreviewPortal
                        target={props.previewTarget}
                        ready={props.previewReady}
                        onReady={props.onPreviewReady}
                      >
                        <PreviewBoundary fallback={props.children}>
                          {props.preview}
                        </PreviewBoundary>
                      </PreviewPortal>
                    )}
                    <FrontendControls
                      context={props.context}
                      richTextCapabilities={props.richTextCapabilities}
                      field={props.field}
                      blockControls={props.blockControls}
                      catalogue={props.catalogue}
                      permissions={props.fieldPermissions}
                      policy={props.policy}
                      exitURL={props.exitURL}
                      renderedRevision={props.renderedRevision}
                    />
                  </TransientPreviewProvider>
                </FieldStrategiesProvider>
              </FieldOwnershipProvider>
            </EditorToolsProvider>
          </PreviewStatusContext>
          <NativeAutosaveTrigger />
          <NativeSubmissionMonitor />
          <NativePreviewSync />
        </Form>
      </RecoveryContext>
    </ReviewBaselineContext>
  );
}

/** The native Form stays in its isolated UI island; the consumer renders in the real website DOM with that same React context. */
function PreviewPortal({
  target,
  ready,
  onReady,
  children,
}: {
  target: HTMLElement;
  ready: boolean;
  onReady: () => void;
  children: ReactNode;
}) {
  useLayoutEffect(() => {
    onReady();
  }, [target]);
  return ready ? createPortal(children, target) : null;
}

function CaptureNativeForm({
  formRef,
}: {
  formRef: React.RefObject<ReturnType<typeof useForm> | null>;
}) {
  const form = useForm();
  useLayoutEffect(() => {
    formRef.current = form;
    return () => {
      formRef.current = null;
    };
  }, [form, formRef]);
  return null;
}
/** Consumer preview failures must not unmount the native working copy or persistence/recovery controls. */
class PreviewBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <>
        <p role="alert">
          The instant preview could not render. Your working copy is retained in
          the editor. Reload after saving to restore the preview.
        </p>
        {this.props.fallback}
      </>
    ) : (
      this.props.children
    );
  }
}
