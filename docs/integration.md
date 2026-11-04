# Integration guide

Start with the [README quick start](../README.md#quick-start). This guide covers the host-owned routing, authorization and native-form boundaries required for a complete integration.

## Package entry points

Build the package before generating an import map. The server plugin is the package root; `/rsc` supplies `FrontendEditor`; `/entry` supplies the lightweight activation entry; `/frontend` supplies `useEditorPreviewData`, `useVisualEditor` and `NativeFieldSlot`. `/bindings` contains dependency-free renderer attributes. `/server` supplies authorization helpers, `/postgres` the transaction concurrency adapter. `/client` remains native admin integration. `/preview` is the optional bridge for consumers that explicitly need a separate preview surface.

## Configure existing schemas

```ts
visualEditor({
  collections: {
    pages: { roots: ["layout"] },
    offers: { roots: ["detailPage.layout"] },
  },
  previewOrigin: "https://your-site.example",
  // Optional exact aliases owned by this deployment; never populate from request headers.
  additionalPreviewOrigins: ["https://branch.your-site.example"],
  editorPath: "/visual-editor",
  canEdit: ({ req, document }) => yourDocumentCapability(req.user, document),
  concurrency: postgresConcurrency(),
  blockControls: {
    hero: {
      fields: ["heading", "caption", "image"],
      inlineEdit: ["heading", "caption"],
    },
  },
  fieldPanels: [
    {
      id: "search",
      label: "Search appearance",
      fields: ["meta.title", "meta.description"],
    },
    {
      id: "appearance",
      label: "Appearance",
      scope: "selection",
      blockTypes: ["hero"],
      fields: ["appearance.tone"],
    },
  ],
});
```

The root must already be a blocks field. Existing custom root Fields are preserved. Existing hooks, native controls, hidden/unmounted values and unrelated fields retain their owners. Field profiles control presentation; native field access is still the write authority.

## Mount the authorized website entry

Generate a dedicated frontend component map with `frontendConfig` from `/server` and Payload's native `generateImportMap`, using its own `admin.importMap.importMapFile`. Regenerate it before dev/build and use it for the protected route and native server functions. Importing the whole admin application map can pull navigation/plugin CSS onto the website. See [frontend component isolation and field bindings](frontend-component-map.md).

The host owns a protected website entry which authenticates the current Payload session, validates the nonce-scoped activation cookie through `readEditContext`, and uses `overrideAccess:false` for user-driven reads. It supplies `FrontendEditor` with its actual server-rendered page and an authorization-checked native server-function action. The editor portals its one native Form/provider graph into an isolated UI island, while content stays in the real page DOM. See [the protected demo route](<../apps/demo/app/(protected)/visual-editor/page.tsx>) and [authorization helper](../apps/demo/lib/authorized-editor.ts).

### Stay on the actual website

Set `resolvePagePath` to the document's published website pathname (for example `/workshops/silver`), using the current access-checked document identity. Keep query parameters and fragments in the browser; return only the pathname. Undefined retains the dedicated-route integration.

Place `EditorPageTransition` from `/launcher` in the existing shared website layout, only for freshly authorized CMS editors. Render the normal header, footer and providers there. Public entries render published content plus an authorized `EditorLauncher`; they never import the editor, native component map or server-function handler.

For Next internal rewrites, set `skipProxyUrlNormalize: true` and construct the destination with `new URL(request.url)` before changing only its pathname. Keep pathname matching on `request.nextUrl.pathname`. Next otherwise normalizes loopback IPs to `localhost`, which can turn an HTTPS reverse-proxy request (for example Portless) into an external TLS request to its plain HTTP backend. Preserving the original authority works with dynamic ports and IPv4/IPv6, without hardcoded hosts.

The launcher activates a signed, exact-page session, then calls `router.refresh()` through that shared provider. A host proxy can use `hasPageEditorSession` from `/routing` to rewrite the same URL internally to a separate active entry. **This helper only reads an untrusted routing hint.** The active entry must freshly authenticate and call `readPageEditContext(req, pathname, options)` before any draft read, then use the same website renderer and shared layout around `FrontendEditor`. Mark these responses private/no-store. Preserve the original search parameters on the rewrite. Stale sessions render the ordinary published page.

This keeps the browser document, URL, header/footer instances and viewport while loading the current shared Payload draft. It does not enable global Next Draft Mode or put draft data into published caches. Exit clears that session and refreshes the same URL. The launcher waits for hydration, so a cold start cannot fall back to a hard POST navigation. Pending edits reuse Payload's native leave-without-saving guard.

For native server functions on this separate entry, wrap the Next configuration with `withVisualEditorNext(config, { projectDir })` from `/next` and import `handleEditorServerFunctions` from `/native`. Pass the actual Next app directory, especially in a monorepo. The helper resolves the unchanged, version-pinned Payload handler without importing its admin RootLayout/global CSS barrel; it currently supports the pinned Turbopack runtime only. Pass the freshly reauthorized request as the bridge's second argument, outside client-spread arguments: `handleEditorServerFunctions({ ...args, config, importMap }, req)`. Normal admin routes retain their ordinary Payload layout imports.

See [same-page architecture](adr/0006-same-page-editing.md), the [demo shared layout](<../apps/demo/app/(public)/layout.tsx>), [internal entry](<../apps/demo/app/(public)/pve/[collection]/[slug]/page.tsx>) and [proxy](../apps/demo/proxy.ts). The proxy is host-owned so application routing and authentication stay explicit.

### Preview and inline editing

For immediate layout/media/structure preview, pass an optional consumer client renderer as `preview`. It derives display data with `useEditorPreviewData` from the same native Form; it never submits a second document model. Bound plain text is editable directly on the page. The inline adapter adopts the rendered text and writes the native field only on real input; an empty optional CMS value never clears a visible inherited heading merely on focus. Compatible native Lexical fields use a lazy inline surface; unsupported/custom nodes retain their JSON and open native settings for their own editing. Media, links, custom fields and repeated rows retain scoped native controls or explicitly configured compatible strategies; `getFieldGroupAttributes` binds one visual object to several fields. A small secondary options button reveals extra options for inline text. Select content toggles one moving hover outline, off by default; intentional field clicks work independently and hover pauses while panels are open. Browser caret, composition and text undo remain native. Server-only data stays in server-component slots. The required `refreshPreview` server function reauthorizes each read and returns fresh `{ revision, content, preview }` slots after an acknowledged save, or a typed denied/unavailable result. It updates the preview without replacing the native Form or refreshing the entire route. See [optimistic rendering](adr/0003-native-optimistic-preview.md) and [the demo renderer](../apps/demo/components/OptimisticPage.tsx).

### Public routes and authorization

Public routes must not import `/frontend`, `/client`, `/preview` or editor CSS. A server-only `/launcher` integration may conditionally render the small bottom-right launcher for a freshly authorized CMS editor, as explicitly requested by the project owner. Visitors/customer accounts get neither the launcher nor the native editor runtime. Next registers a small inert deferred-client reference in the public graph; production checks bound it to 4KB and exclude launcher execution, native modules, editor styles and authoring requests. The measured demo increase is about 1KB decoded JavaScript, rather than a zero-byte claim. Heavy authoring dependencies load only on explicit activation. The demo performs public published reads first and authorizes the launcher separately; no draft content is serialized through it.

A shared preview secret, Draft Mode, a query parameter and the presence of a cookie are not authorization. Activation is an origin-checked POST with a current session, native document capability and host capability. Context is short lived and document scoped. The protected route must use private/no-store HTML/RSC responses. Cross-origin frontends and editing embedded custom Lexical nodes remain unsupported. This unpublished local branch adds explicitly configured draft globals, finite page document scopes and content localization; see [document scopes](implementation/document-scopes.md), [localization](implementation/localization.md) and [inline rich-text ownership](adr/0008-inline-rich-text.md).

The standard CMS remains the fallback. All edits use the single native Form and persistence path. Native configured autosave, manual draft save and reviewed publication share that Form. Optimistic feedback never means a write has already succeeded; errors retain the working copy and offer explicit recovery. Drafts are shared Payload drafts, not private per-editor branches. Asset uploads remain separate writes.

## Consumer controls and theme

Built-in `tools` can be disabled or server capability-gated. `fieldPanels` declare existing document/selection field paths and optional block-type applicability. Custom `extensions` register panel/control components through Payload's import map, or explicit server actions with optional saved-revision and confirmation requirements. The compact horizontal dock opens one contextual panel at a time; secondary extensions live in More tools. Sections show readable native content names across consumer field names and support list/on-page dragging, keyboard moves and native structural undo. Page controls avoid rendered field text; dense layouts retain the section-list alternative. See [dock and reordering](adr/0005-compact-editor-and-reordering.md).

Custom panels use `NativeFieldSlot` to claim existing fields without duplicate mounts; controls use `useVisualEditor` to open panels or invoke registered actions. Action inputs never grant authority, and consumer writes remain in their existing access-checked domain services. [Workshops analysis](adr/0004-workshops-extension-boundaries.md) explains the balance with real application examples.

Plugin presentation uses Tailwind 4 CLI, prefixed utilities and no Preflight. CSS inputs contain directives/theme configuration; compiled styles are generated, not hand edited. Owned frontend controls adapt shadcn Base UI registry components; native Payload complex fields retain native styling. Consumers can override `--pve-surface`, `--pve-text`, `--pve-muted`, `--pve-border`, `--pve-accent`, panel dimensions and the other tokens in `packages/payload-inplace/src/admin/tailwind.css`. No global reset is applied to the website. Reduced-motion preferences disable selection and disclosure transitions.

## Distribution

See the tested [compatibility contract](compatibility.md), [release and rollback procedure](release.md), and [changelog](../CHANGELOG.md).

The package is published on public npm as `payload-inplace`. Version **0.0.1** starts the normal release line. See the [release guide](release.md) and [verified delivery receipt](validation/workshops-release.json) for artifact and deployment evidence. Local archives from `pack:check` are development candidates, with their checksum in `test-results/package.json`; rebuilding source does not reproduce or replace an already published version.

## Existing operational writes

Existing reviewed domain commands can opt into `operationalWrites[collection]` with a server-only `authorize(req)` callback and explicit named `paths` outside configured visual roots. This is intended for operational data such as capacity. It does not grant access, skip revision checks, or permit publication of a sparse patch: pass the complete live document snapshot plus the latest revision, changing only allowed paths. Preserve any separate editorial draft using the returned revision. Never base authorization on request-body flags; use the existing domain command's server-owned request context. See the real transaction test in `apps/demo/int.spec.ts` and `packages/payload-inplace/src/server/operational-write.ts`.

For terminal text, dotted nested fields and stable array item targets, see [nested bindings](nested-bindings.md). Consumers place the targets; Payload retains field access, conditions and saving.
