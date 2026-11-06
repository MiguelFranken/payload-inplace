"use client";

import {
  SectionPatterns,
  type PatternCapabilities,
} from "./section-patterns.js";
import { nativeSavedDocument } from "../adapters/native-response.js";
import {
  nativeDocumentArgs,
  nativeDocumentPath,
  nativeDocumentMethod,
  targetDocumentKey,
  targetSlug,
} from "../state/document-target.js";
import {
  NativeDocumentScopes,
  type ResolvedPageScope,
} from "./document-scope.js";
import { useSavedPreview } from "./controllers/saved-preview.js";
import { useEditorMessages } from "./messages.js";
import { EditorMessage } from "./messages.js";

import { NativeEditorMessages } from "./native-messages.js";
import { createPortal } from "react-dom";
import {
  Component,
  Suspense,
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
import { EditorLifecycleProvider, useEditorLifecycle } from "./lifecycle.js";
import type { EditorOperationHandle } from "../../../core/src/events.js";
import { AdvisoryLockContext, useNativeAdvisoryLock } from "./advisory-lock.js";
import { FrontendControls } from "./FrontendControls.js";

type ShellProps = {
  diagnostics?: boolean;
  patterns?: PatternCapabilities;
  pageScopes?: ResolvedPageScope[];
  sharedStructure?: boolean;
  ui?: import("../i18n/messages.js").EditorUIOptions;
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
        data-ve-document-scope={targetDocumentKey(bootstrap.context.target)}
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
                  <NativeEditorMessages options={bootstrap.ui}>
                    <DocumentInfoProvider
                      {...(nativeDocumentArgs(bootstrap.context.target) as any)}
                      initialData={bootstrap.initialData}
                      initialState={bootstrap.initialState}
                      docPermissions={bootstrap.docPermissions}
                      hasSavePermission={Boolean(
                        bootstrap.docPermissions.update,
                      )}
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
                          <EditorLifecycleProvider
                            target={bootstrap.context.target}
                          >
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
                          </EditorLifecycleProvider>
                        </OperationProvider>
                      </EditDepthProvider>
                    </DocumentInfoProvider>
                  </NativeEditorMessages>
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
  const advisory = useNativeAdvisoryLock(
    config.routes.api,
    String(props.initialState._veActivation?.value || ""),
    props.context.locale,
  );
  const events = useEditorLifecycle(),
    pendingOperation = useRef<EditorOperationHandle | null>(null),
    lastSave = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (recovery.failure) {
      pendingOperation.current?.settle(
        recovery.failure.kind === "conflict" ? "conflict" : "failed",
        recovery.failure.kind,
      );
      pendingOperation.current = null;
    }
  }, [recovery.failure]);
  useEffect(() => () => pendingOperation.current?.settle("cancelled"), []);
  const { t } = useEditorMessages();
  const [switchingDocument, setSwitchingDocument] = useState(false);
  const nativeForm = useRef<ReturnType<typeof useForm> | null>(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const savedPreview = useSavedPreview({
    initialRevision:
      props.initialData._veRevision ?? props.initialData.updatedAt,
    refresh: props.refreshPreview,
    accept: props.onSnapshot,
    denied: () => {
      recovery.setFailure({
        kind: "session",
        messageKey: "editingAccessExpiredWithWorkingCopy",
      });
      nativeForm.current?.setDisabled(true);
    },
  });
  const inFlightChange = useRef<AbortController | null>(null),
    generation = useRef(0);
  useEffect(() => () => inFlightChange.current?.abort(), []);
  return (
    <ReviewBaselineContext value={props.initialData}>
      <RecoveryContext value={recovery}>
        <AdvisoryLockContext value={advisory}>
          <Form
            initialState={props.initialState}
            isDocumentForm
            method={nativeDocumentMethod(props.context.target)}
            action={`${nativeDocumentPath(config.routes.api, props.context.target)}?draft=true&depth=0`}
            className="pve:contents"
            disabled={
              switchingDocument ||
              !info.hasSavePermission ||
              advisory.status === "other" ||
              Boolean(
                recovery.failure && recovery.failure.kind !== "validation",
              )
            }
            disableValidationOnSubmit
            onSubmit={(_fields, data) => {
              recovery.started();
              pendingOperation.current?.settle("cancelled");
              pendingOperation.current = events.start(
                data._status === "published"
                  ? "publish"
                  : data._veRestoreVersion
                    ? "restore"
                    : "save",
              );
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
                  ...(nativeDocumentArgs(props.context.target) as any),
                  docPermissions: info.docPermissions,
                  docPreferences: { fields: {} },
                  formState,
                  operation: "update",
                  schemaPath: targetSlug(props.context.target),
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
              if (!active.current) return;
              const doc = nativeSavedDocument(json, props.context.target);
              if (!doc) throw Error(t("savedFieldsUnavailable"));
              const result = await getFormState({
                ...(nativeDocumentArgs(props.context.target) as any),
                data: doc,
                formState: ctx?.formState,
                docPermissions: info.docPermissions,
                docPreferences: { fields: {} },
                operation: "update",
                schemaPath: targetSlug(props.context.target),
                renderAllFields: false,
                skipValidation: true,
              });
              if (!active.current) return;
              if (!result?.state) throw new Error(t("savedFieldsUnavailable"));
              result.state._veActivation = props.initialState._veActivation;
              recovery.saved();
              info.setData(doc);
              info.setLastUpdateTime(new Date(doc.updatedAt).getTime());
              lastSave.current = pendingOperation.current?.id;
              pendingOperation.current?.settle("succeeded");
              pendingOperation.current = null;
              void savedPreview.request(
                doc._veRevision ?? doc.updatedAt,
                lastSave.current,
              );
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
                pending: savedPreview.pending,
                error: savedPreview.error ? t(savedPreview.error) : "",
                retry: savedPreview.retry,
              }}
            >
              <SectionPatterns capabilities={props.patterns}>
                <NativeDocumentScopes
                  context={props.context}
                  scopes={props.pageScopes}
                  onSwitching={setSwitchingDocument}
                >
                  <EditorToolsProvider
                    context={props.context}
                    tools={props.tools}
                    extensions={props.extensions}
                  >
                    <FieldOwnershipProvider>
                      <FieldStrategiesProvider>
                        <Suspense fallback={null}>
                          {props.strategyProviders}
                        </Suspense>
                        <TransientPreviewProvider
                          capable={Boolean(props.preview)}
                        >
                          {props.preview && props.previewTarget && (
                            <PreviewPortal
                              target={props.previewTarget}
                              ready={props.previewReady}
                              onReady={props.onPreviewReady}
                            >
                              <Suspense fallback={props.children}>
                                <PreviewBoundary fallback={props.children}>
                                  {props.preview}
                                </PreviewBoundary>
                              </Suspense>
                            </PreviewPortal>
                          )}
                          <FrontendControls
                            diagnostics={props.diagnostics}
                            sharedStructure={props.sharedStructure}
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
                </NativeDocumentScopes>
              </SectionPatterns>
            </PreviewStatusContext>
            <NativeAutosaveTrigger />
            <NativeSubmissionMonitor />
            <NativePreviewSync />
          </Form>
        </AdvisoryLockContext>
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
          <EditorMessage id="theInstantPreviewCouldNotRenderYourWorkingCopy" />
        </p>
        {this.props.fallback}
      </>
    ) : (
      this.props.children
    );
  }
}
