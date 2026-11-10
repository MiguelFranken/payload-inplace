# Public API reference

Generated from the documented facade exports. Run `corepack pnpm docs:generate`; CI checks freshness with `docs:check`. Types and linked declarations are authoritative for arguments. Start with the [integration guide](integration.md), [binding recipe](implementation/bindings-and-insertion.md), [extension/testing recipes](testing-and-extensions.md) and [editor architecture](architecture.md).

Runtime entrypoints have different ownership: bindings are inert; server/RSC/native stay server-only; frontend/client require an authorized native Form; testing is optional test-only code. An annotation or test fixture never grants access.

## `payload-inplace`

| Export | Kind | Contract |
| --- | --- | --- |
| [`EditorTarget`](../packages/payload-inplace/src/types.ts#L15) | type | See the linked declaration for the exact typed contract. |
| [`visualEditor`](../packages/payload-inplace/src/plugin.ts#L34) | function | Compose opt-in roots without replacing native persistence, existing hooks or unrelated controls. |
| [`VisualEditorOptions`](../packages/payload-inplace/src/types.ts#L21) | interface | Host permission is additional to native collection/document/field access. Never serialize this callback. |

## `payload-inplace/client`

| Export | Kind | Contract |
| --- | --- | --- |
| [`ReviewPublishButton`](../packages/payload-inplace/src/admin/NativeReviewPublishButton.tsx#L6) | value | Native admin styling stays in an async client boundary; the website imports the CSS-free review control. |
| [`RevisionField`](../packages/payload-inplace/src/admin/RevisionField.tsx#L6) | function | The native Form transports revision alongside content and accepts its server acknowledgement. |
| [`VisualBlocksField`](../packages/payload-inplace/src/admin/VisualBlocksField.tsx#L16) | function | Native CMS fallback plus an optional link; the editing experience lives on the website frontend. |

## `payload-inplace/preview`

| Export | Kind | Contract |
| --- | --- | --- |
| [`PreviewBridge`](../packages/payload-inplace/src/preview/PreviewBridge.tsx#L10) | function | Mount once, exclusively after current authorization and explicit activation on the private preview. |

## `payload-inplace/bindings`

| Export | Kind | Contract |
| --- | --- | --- |
| [`BindingAttributes`](../packages/core/src/editable.ts#L46) | type | See the linked declaration for the exact typed contract. |
| [`BindingPath`](../packages/core/src/editable.ts#L13) | type | Bounded path inference keeps consumer typechecking predictable for recursive Payload JSON. |
| [`BoundBlock`](../packages/core/src/editable.ts#L49) | interface | A consumer places each terminal/row/list annotation exactly where the CMS value is rendered. |
| [`documentKey`](../packages/core/src/document-ref.ts#L7) | function | Stable encoded keys avoid ambiguous colon/dot delimiters in consumer IDs. |
| [`DocumentReference`](../packages/core/src/document-ref.ts#L2) | type | Provenance only. Every request still authorizes this document on the server. |
| [`editable`](../packages/core/src/editable.ts#L84) | function | Bind provenance once, then annotate typed block fields, stable array rows and empty lists. Disabled helpers emit nothing and import no editor/browser runtime. |
| [`getArrayItemAttributes`](../packages/core/src/annotations.ts#L52) | function | Address a single native array row. Append a field to the returned data-ve-field path with getFieldAttributes for terminal text; row wrappers open only that row's settings. IDs are URI encoded so dots and reserved characters cannot become path separators. |
| [`getArrayItemPath`](../packages/core/src/annotations.ts#L68) | function | Build a stable dotted row or leaf path. Compose calls for nested arrays; no content values are serialized. |
| [`getBlockAttributes`](../packages/core/src/annotations.ts#L4) | function | Attach only on the authorized preview surface; public rendering gets identical unannotated DOM. |
| [`getFieldAttributes`](../packages/core/src/annotations.ts#L17) | function | A field binding describes provenance, never server write authority. Repeated occurrences share it. |
| [`getFieldGroupAttributes`](../packages/core/src/annotations.ts#L36) | function | Bind one rendered object (for example an image with caption) to several native fields. This opens a scoped native settings panel; it never enables contenteditable or grants write permission. |
| [`isBindingPath`](../packages/core/src/editable.ts#L65) | function | Path validation is also applied at runtime for generated/dynamic component schemas. |
| [`parseDocumentKey`](../packages/core/src/document-ref.ts#L14) | function | Untrusted DOM metadata fails closed; it never becomes a permission grant. |

## `payload-inplace/server`

| Export | Kind | Contract |
| --- | --- | --- |
| [`contentLocale`](../packages/payload-inplace/src/server/content-locale.ts#L4) | function | Editing always addresses one native content locale. `all` is a read projection, never an authoring scope. UI message locale is deliberately unrelated. |
| [`documentKey`](../packages/payload-inplace/src/server/context.ts#L18) | function | Stable document key includes string/numeric identity semantics and the configured root. |
| [`frontendConfig`](../packages/payload-inplace/src/server/frontend-config.ts#L7) | function | Project native field and document components without importing the admin application shell. Generate a separate import map from this config and use it for frontend server functions. Collection/global fields, custom drawers, access, hooks and editor extensions retain their original contracts. |
| [`readEditContext`](../packages/payload-inplace/src/server/context.ts#L208) | function | Recheck active session and authorization on every protected server read. |
| [`readEditorCookie`](../packages/payload-inplace/src/server/page-context.ts#L6) | function | Read only the explicitly named editor proof; ordinary auth cookies are never interpreted as editing activation. |
| [`readPageEditContext`](../packages/payload-inplace/src/server/page-context.ts#L38) | function | Resolve an explicitly activated website page outside published caches. A signed cookie is only a candidate: current user/session, exact path, document access and host capability are checked again before returning drafts. |
| [`readPageEditorDocuments`](../packages/payload-inplace/src/server/scopes.ts#L151) | function | Host-only draft renderer input for an explicitly active page. Every record is reauthorized through the finite page catalogue; this creates no client state, edit permission, save owner or publication batch. Keep it outside published caches. |
| [`validatePagePath`](../packages/payload-inplace/src/server/page-context.ts#L19) | function | Validate a host-resolved pathname before using it for a cookie-backed website session or a soft navigation. |
| [`verifyContext`](../packages/payload-inplace/src/server/context.ts#L33) | function | Verify integrity/expiry before trusting scope; callers still recheck current user/session/capability. |
| [`withFrontendImportMap`](../packages/payload-inplace/src/server/frontend-config.ts#L54) | function | Scope native component resolution to this request without mutating the shared Payload instance. The inherited instance retains its database, collections and native operations; only its component map differs. |

## `payload-inplace/types`

| Export | Kind | Contract |
| --- | --- | --- |
| [`Activation`](../packages/payload-inplace/src/types.ts#L119) | type | Browser-visible activation never includes the signed cookie or underlying authentication session ID. |
| [`BlockIdentity`](../packages/core/src/types.ts#L2) | interface | Stable provenance for one block, independent of native field positions or frameworks. |
| [`CollectionEditorDocument`](../packages/payload-inplace/src/types.ts#L4) | type | Exact document scope for authoring. Root paths are validated against configured block schemas. |
| [`ConcurrencyAdapter`](../packages/payload-inplace/src/types.ts#L107) | interface | Lock the exact write transaction before Payload reads the latest draft. Unsupported adapters must throw. |
| [`EditContext`](../packages/payload-inplace/src/types.ts#L90) | interface | See the linked declaration for the exact typed contract. |
| [`EditorActionExtension`](../packages/payload-inplace/src/types.ts#L158) | interface | Actions are explicit, origin-checked server operations. Delegate writes to existing domain APIs with current req and overrideAccess:false. The plugin authorizes the document and capability again; a client-supplied subject is untrusted host input, never authority. |
| [`EditorBlockControls`](../packages/payload-inplace/src/types.ts#L193) | interface | See the linked declaration for the exact typed contract. |
| [`EditorCapability`](../packages/payload-inplace/src/types.ts#L136) | type | See the linked declaration for the exact typed contract. |
| [`EditorCapabilityContext`](../packages/payload-inplace/src/types.ts#L130) | interface | Server-only capability inputs always come from the authenticated, freshly authorized target. |
| [`EditorCatalogueEntry`](../packages/payload-inplace/src/types.ts#L213) | interface | Describes an allowed block in the active editor; it cannot widen native block/field access. |
| [`EditorControlExtension`](../packages/payload-inplace/src/types.ts#L174) | interface | Consumer controls render inside the contextual surface and can use native fields or invoke capability-checked actions. |
| [`EditorDocument`](../packages/payload-inplace/src/types.ts#L13) | type | Explicit provenance is never authorization; globals require native drafts just like collections. |
| [`EditorExtension`](../packages/payload-inplace/src/types.ts#L180) | type | See the linked declaration for the exact typed contract. |
| [`EditorFieldPanel`](../packages/payload-inplace/src/types.ts#L186) | interface | Paths are native schema names relative to the document or the stable selected block, never DOM text selectors. |
| [`EditorLabel`](../packages/payload-inplace/src/types.ts#L127) | type | See the linked declaration for the exact typed contract. |
| [`EditorPageScope`](../packages/payload-inplace/src/types.ts#L85) | interface | Authenticated activation is short lived and bound to the current Payload session and exact target. |
| [`EditorPanelExtension`](../packages/payload-inplace/src/types.ts#L149) | interface | Panels mount inside the editor's native Form. Consumer components must use NativeFieldSlot for field ownership. |
| [`EditorPreviewResponse`](../packages/payload-inplace/src/types.ts#L208) | type | Every preview read reauthorizes the exact activated target. Denial must be returned without redirecting/unmounting the working Form. |
| [`EditorPreviewSnapshot`](../packages/payload-inplace/src/types.ts#L201) | interface | Authorized server-rendered presentation only; native Form data/persistence is never replaced by this read result. |
| [`EditorTarget`](../packages/payload-inplace/src/types.ts#L15) | type | See the linked declaration for the exact typed contract. |
| [`EditorTool`](../packages/payload-inplace/src/types.ts#L125) | type | Built-in tools are independently configurable; draft persistence still uses the single native Form. |
| [`GlobalEditorDocument`](../packages/payload-inplace/src/types.ts#L10) | type | See the linked declaration for the exact typed contract. |
| [`OperationalWritePolicy`](../packages/payload-inplace/src/types.ts#L113) | interface | A bounded exception for operational state such as capacity, independent from draft editorial publication. |
| [`SectionPatternAdapter`](../packages/payload-inplace/src/types.ts#L230) | interface | Server-only optional storage contract. Every callback must retain tenant/native ACLs (Local API overrideAccess:false). No collection or migration is installed by the plugin. |
| [`SectionPatternSummary`](../packages/payload-inplace/src/types.ts#L223) | interface | Consumer-owned pattern identity, scoped by the adapter's native read access. Copies are independent; asset references remain shared. |
| [`VisualEditorOptions`](../packages/payload-inplace/src/types.ts#L21) | interface | Host permission is additional to native collection/document/field access. Never serialize this callback. |

## `payload-inplace/postgres`

| Export | Kind | Contract |
| --- | --- | --- |
| [`postgresConcurrency`](../packages/payload-inplace/src/server/postgres.ts#L8) | function | Payload 3.91 transaction adapter: serialize the document before native update/restore reads. No direct writes to Payload content/version tables. Transaction-scoped locks release on commit/rollback. |

## `payload-inplace/rsc`

| Export | Kind | Contract |
| --- | --- | --- |
| [`FrontendEditor`](../packages/payload-inplace/src/frontend/FrontendEditor.tsx#L39) | function | Prepare one native Payload Form for an explicitly activated frontend document. The caller renders its real server-component website as children and supplies an authorization-checked native server-function action. Public routes must never import this component. Native CSS and providers are confined to the active editor's shadow root. |
| [`GuardedVersionView`](../packages/payload-inplace/src/admin/GuardedVersionView.tsx#L6) | function | Keep the native restore endpoint while explicitly reviewing the current and historical revision. |

## `payload-inplace/frontend`

| Export | Kind | Contract |
| --- | --- | --- |
| [`ContextualFieldKind`](../packages/payload-inplace/src/frontend/field-strategies.tsx#L17) | type | See the linked declaration for the exact typed contract. |
| [`ContextualFieldProps`](../packages/payload-inplace/src/frontend/field-strategies.tsx#L41) | interface | Values and validation belong to useField; strategy components never receive a document snapshot or save callback. |
| [`ContextualFieldValue`](../packages/payload-inplace/src/frontend/field-strategies.tsx#L29) | type | See the linked declaration for the exact typed contract. |
| [`createPayloadMediaLibrary`](../packages/payload-inplace/src/frontend/media-library.tsx#L74) | function | Same-origin native Payload media search. Native ACLs apply to every request. Upload and shared metadata editing deliberately delegate to native controls. |
| [`defineFieldStrategy`](../packages/payload-inplace/src/frontend/field-strategies.tsx#L73) | function | Retain the field-kind generic when defining a consumer component. No React/editor runtime is created here. |
| [`defineMediaFieldStrategy`](../packages/payload-inplace/src/frontend/media-library.tsx#L48) | function | Opt into a single-reference contextual picker. Has-many fields and native custom fields retain Payload's native editor. Shared asset metadata is never edited implicitly. |
| [`EditorFailureCategory`](../packages/core/src/events.ts#L12) | type | See the linked declaration for the exact typed contract. |
| [`EditorFieldStrategy`](../packages/payload-inplace/src/frontend/field-strategies.tsx#L119) | function | Install a stable, module-level definition from a configured strategy provider. Unmounting releases it. |
| [`EditorLifecycleEvent`](../packages/core/src/events.ts#L23) | type | Closed event union intentionally excludes values, error messages, raw responses, revisions and all activation/review tokens. |
| [`EditorObserver`](../packages/core/src/events.ts#L43) | type | See the linked declaration for the exact typed contract. |
| [`EditorOperation`](../packages/core/src/events.ts#L3) | type | See the linked declaration for the exact typed contract. |
| [`EditorOutcome`](../packages/core/src/events.ts#L10) | type | See the linked declaration for the exact typed contract. |
| [`FieldStrategyDefinition`](../packages/payload-inplace/src/frontend/field-strategies.tsx#L60) | interface | Client-only registration. An explicit panel annotation, native custom Field, denied or conditioned field always retains native authority. |
| [`MediaAsset`](../packages/payload-inplace/src/frontend/media-library.tsx#L12) | type | See the linked declaration for the exact typed contract. |
| [`MediaLibraryAdapter`](../packages/payload-inplace/src/frontend/media-library.tsx#L23) | interface | A consumer-owned library reads/uploads assets under its own authorization. It returns references, never a replacement document or trusted external URL. |
| [`MediaPage`](../packages/payload-inplace/src/frontend/media-library.tsx#L20) | type | See the linked declaration for the exact typed contract. |
| [`NativeFieldSlot`](../packages/payload-inplace/src/frontend/field-ownership.tsx#L147) | function | Mount an existing named native field in a consumer floatable, preserving schema paths, conditions and effective permissions. Full document paths may traverse groups, tabs, arrays and native block rows. Selection-relative paths resolve against the current block identity. |
| [`useEditorMessages`](../packages/ui/src/localization/EditorMessages.tsx#L48) | function | Consumers may use explicit options outside authoring; active controls normally inherit the current editor catalogue. |
| [`useEditorObserver`](../packages/payload-inplace/src/frontend/lifecycle.tsx#L55) | function | Consumer import-map providers opt into metadata events. Changing callbacks neither reloads the document nor changes native submission behavior. |
| [`useEditorPreviewData`](../packages/payload-inplace/src/frontend/preview-data.ts#L18) | function | Read an optimistic projection of the sole native Form, without another document store or persistence path. The initial authorized, populated document supplies relationship objects only while their IDs match. Rendering is held while the browser owns inline composition/caret; direct text is already visible in the DOM. This hook belongs exclusively to an activated client renderer. Keep data loading/domain effects in server slots. |
| [`useVisualEditor`](../packages/payload-inplace/src/frontend/tools-context.tsx#L52) | function | Consumer controls share the current authorized target and native form; server actions recheck their own capability. |

## `payload-inplace/launcher`

| Export | Kind | Contract |
| --- | --- | --- |
| [`EditorLauncher`](../packages/payload-inplace/src/launcher/EditorLauncher.tsx#L13) | function | Mount only for an authenticated CMS editor. Hosts can skip all auth work when their auth cookie is absent. In-place hosts use a small activation adapter; anonymous routes never mount it. Public HTML and published data remain separate from authoring: this serializes only a target and capability-filtered labels, never draft values or activation proof. |
| [`EditorPageTransition`](../packages/payload-inplace/src/launcher/DeferredLauncher.tsx#L20) | function | Keep the small authenticated bridge in a separate client chunk; anonymous responses never render it. |

## `payload-inplace/entry`

| Export | Kind | Contract |
| --- | --- | --- |
| [`FrontendEntry`](../packages/payload-inplace/src/frontend/FrontendEntry.tsx#L14) | function | Explicit frontend sign-in/activation; merely visiting a public page never mounts this component. |

## `payload-inplace/next`

| Export | Kind | Contract |
| --- | --- | --- |
| [`withVisualEditorNext`](../packages/payload-inplace/src/exports/next.ts#L13) | function | Keep Payload's admin RootLayout/global CSS out of website entrypoints while retaining its unchanged native server functions. The exact supported Payload peer owns this internal bridge; installed-consumer and production browser checks validate it. Native admin routes continue to import |

## `payload-inplace/native`

| Export | Kind | Contract |
| --- | --- | --- |
| [`handleEditorServerFunctions`](../packages/payload-inplace/src/exports/native.ts#L26) | value | The host freshly reauthorizes its signed editing scope on every invocation and passes the SERVER request as a separate argument, outside client-spread arguments. Scopes native form/field/table preparation and consumer overrides to that request's content locale, rather than the admin's last-used locale preference. Persistence and ACLs remain native. |
| [`handleServerFunctions`](../packages/payload-inplace/src/exports/native.ts#L17) | value | Standard native admin bridge. Extra client properties can never select an editor request or override its authorization scope. |

## `payload-inplace/routing`

| Export | Kind | Contract |
| --- | --- | --- |
| [`hasPageEditorSession`](../packages/payload-inplace/src/preview/page-routing.ts#L4) | function | A cookie payload is only a routing hint, never draft authority. The destination must run readPageEditContext again. This dependency-free helper lets a host keep its published and activated Next entry bundles separate at the same browser URL. |

## `payload-inplace/messages`

| Export | Kind | Contract |
| --- | --- | --- |
| [`createEditorMessages`](../packages/ui/src/localization/messages.ts#L22) | function | Construct an overridable UI catalogue for server renderers, launchers and active controls. Unknown locales fall back to English copy with their own Intl formatting/direction. |
| [`EditorMessageKey`](../packages/ui/src/localization/catalogue.ts#L357) | type | See the linked declaration for the exact typed contract. |
| [`EditorMessageOverrides`](../packages/ui/src/localization/messages.ts#L10) | type | See the linked declaration for the exact typed contract. |
| [`EditorMessages`](../packages/ui/src/localization/messages.ts#L8) | type | See the linked declaration for the exact typed contract. |
| [`EditorUIOptions`](../packages/ui/src/localization/messages.ts#L15) | interface | UI copy/formatting only. This configuration never selects a Payload content locale or expands document access. |

## `payload-inplace/testing`

| Export | Kind | Contract |
| --- | --- | --- |
| [`createDeferredResponse`](../packages/payload-inplace/src/testing/fixtures.ts#L45) | function | Deterministically delay/reject a synthetic transport result. No clocks, global state or persistence backend is installed. |
| [`createEditorFixture`](../packages/payload-inplace/src/testing/fixtures.ts#L5) | function | Synthetic schema/content only. It neither connects to Payload nor emulates access, save acknowledgements or transactions. |
| [`FieldStrategyHarness`](../packages/payload-inplace/src/testing/FieldStrategyHarness.tsx#L12) | function | Unit-only control harness. Exercises a consumer Component's value/disabled/error/native-handoff UI without pretending to be Payload Form or a save/access backend. Verify registration, ACL and conditions separately in native integration. |
| [`inspectNativeField`](../packages/payload-inplace/src/testing/fixtures.ts#L75) | function | Snapshot a real native Form supplied by a consumer's mounted harness. Read-only probe: it never prepares fields, changes values or asserts ACL/concurrency on a mock's behalf. |
