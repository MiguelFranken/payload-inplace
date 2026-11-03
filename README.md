# Payload Visual Editor

Experimental native-form visual composition for existing Payload CMS blocks. The public plugin owns editor behavior; applications keep their schemas, renderers, permissions and business rules.

The current candidate is **not production ready**. Real packaged consumer acceptance, a genuine second app, compatibility coverage and release CI remain open gates. Implemented safety behavior and its measured validation are tracked separately. See [validation](docs/validation.md).

## Development

Node 24+; pnpm 10.28.0 through Corepack. No private services or credentials are required.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm dev:generate-importmap
corepack pnpm dev
```

Open `http://127.0.0.1:3127/visual-editor/start?collection=pages&slug=demo` to sign in and edit the actual website. The native CMS remains at `/admin`. Synthetic accounts are `admin@example.test`, `editor@example.test`, and `reader@example.test`, each with password `synthetic-demo-password`. These accounts exist only in the disposable local demo. Public routes: `/pages/demo` and `/offers/demo`.

The launcher creates a temporary Mongo replica set, initializes fixtures once, starts explicit Turbopack, and removes the database after shutdown. Production browser runs use a separate `.next-prod` output. Stop the launcher normally to complete cleanup; never reuse a human's running server.

```sh
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test:unit
corepack pnpm test:int
VE_PORT=3137 corepack pnpm exec node scripts/postgres-test.mjs e2e
corepack pnpm pack:check
corepack pnpm test:consumer
corepack pnpm exec node scripts/postgres-test.mjs
corepack pnpm release:check
```

The Postgres command needs local Docker and uses a disposable container with a random localhost port. It cleans up in `finally`.

## Integration contract

Build the package before generating an import map. The server plugin is the package root; `/rsc` supplies `FrontendEditor`; `/entry` supplies the lightweight activation entry; `/frontend` supplies `useEditorPreviewData`, `useVisualEditor` and `NativeFieldSlot`. `/bindings` contains dependency-free renderer attributes. `/server` supplies authorization helpers, `/postgres` the transaction concurrency adapter. `/client` remains native admin integration. `/preview` is the optional bridge for consumers that explicitly need a separate preview surface.

```ts
visualEditor({
  collections: {
    pages: { roots: ["layout"] },
    offers: { roots: ["detailPage.layout"] },
  },
  previewOrigin: "https://your-site.example",
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

The host owns a protected website route which authenticates the current Payload session, validates the nonce-scoped activation cookie through `readEditContext`, and uses `overrideAccess:false` for user-driven reads. It supplies `FrontendEditor` with its actual server-rendered page and an authorization-checked native server-function action. The editor portals its one native Form/provider graph into an isolated UI island, while content stays in the real page DOM. See [the protected demo route](<dev/app/(protected)/visual-editor/page.tsx>) and [authorization helper](dev/lib/authorized-editor.ts).

For immediate layout/media/structure preview, pass an optional consumer client renderer as `preview`. It derives display data with `useEditorPreviewData` from the same native Form; it never submits a second document model. Bound plain text is editable directly on the page. A small secondary options button reveals additional native fields. Browser caret, composition and text undo remain native. Server-only data stays in server-component slots. The required `refreshPreview` server function reauthorizes each read and returns fresh `{ revision, content, preview }` slots after an acknowledged save, or a typed denied/unavailable result. It updates the preview without replacing the native Form or refreshing the entire route. See [optimistic rendering](docs/adr/0003-native-optimistic-preview.md) and [the demo renderer](dev/components/OptimisticPage.tsx).

Public routes must not import `/frontend`, `/client`, `/preview` or editor CSS. A server-only `/launcher` integration may conditionally render the small bottom-right launcher for a freshly authorized CMS editor, as explicitly requested by the project owner. Visitors/customer accounts get neither the launcher nor the native editor runtime. Heavy authoring dependencies load only on explicit activation. The demo performs public published reads first and authorizes the launcher separately; no draft content is serialized through it.

A shared preview secret, Draft Mode, a query parameter and the presence of a cookie are not authorization. Activation is an origin-checked POST with a current session, native document capability and host capability. Context is short lived and document scoped. The protected route must use private/no-store HTML/RSC responses. Cross-origin frontends, globals, localization and Lexical-embedded block authoring are not supported by this candidate.

The standard CMS remains the fallback. All edits use the single native Form and persistence path. Native configured autosave, manual draft save and reviewed publication share that Form. Optimistic feedback never means a write has already succeeded; errors retain the working copy and offer explicit recovery. Drafts are shared Payload drafts, not private per-editor branches. Asset uploads remain separate writes.

## Consumer controls and theme

Built-in `tools` can be disabled or server capability-gated. `fieldPanels` declare existing document/selection field paths and optional block-type applicability. Custom `extensions` register panel/control components through Payload's import map, or explicit server actions with optional saved-revision and confirmation requirements. The compact horizontal dock opens one contextual panel at a time; secondary extensions live in More tools. Sections support list and on-page drag handles, keyboard moves and native structural undo. See [dock and reordering](docs/adr/0005-compact-editor-and-reordering.md).

Custom panels use `NativeFieldSlot` to claim existing fields without duplicate mounts; controls use `useVisualEditor` to open panels or invoke registered actions. Action inputs never grant authority, and consumer writes remain in their existing access-checked domain services. [Workshops analysis](docs/adr/0004-workshops-extension-boundaries.md) explains the balance with real application examples.

Plugin presentation uses Tailwind 4 CLI, prefixed utilities and no Preflight. CSS inputs contain directives/theme configuration; compiled styles are generated, not hand edited. Owned frontend controls adapt shadcn Base UI registry components; native Payload complex fields retain native styling. Consumers can override `--pve-surface`, `--pve-text`, `--pve-muted`, `--pve-border`, `--pve-accent`, panel dimensions and the other tokens in `src/admin/tailwind.css`. No global reset is applied to the website. Reduced-motion preferences disable selection and disclosure transitions.

## Distribution

Source is intended for `MiguelFranken/payload-visual-editor` under MIT. The selected package registry is public npm (`registry.npmjs.org`) with anonymous installs, independently of GitHub source visibility. No stable registry publication is claimed. Local immutable tarballs are produced by `pack:check`, with their checksum in `test-results/package.json`.
