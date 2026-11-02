# Payload Visual Editor

Experimental native-form visual composition for existing Payload CMS blocks. The public plugin owns editor behavior; applications keep their schemas, renderers, permissions and business rules.

The current candidate is **not production ready**. Concurrency, publication review, recovery, full accessibility, public performance baselines and real consumer acceptance remain release gates. See [validation](docs/validation.md).

## Development

Node 24+; pnpm 10.28.0 through Corepack. No private services or credentials are required.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm dev:generate-importmap
corepack pnpm dev
```

Open `http://127.0.0.1:3127/admin`. Synthetic accounts are `admin@example.test`, `editor@example.test`, and `reader@example.test`, each with password `synthetic-demo-password`. These accounts exist only in the disposable local demo. Public routes: `/pages/demo` and `/offers/demo`.

The launcher creates a temporary Mongo replica set, initializes fixtures once, starts explicit Turbopack, and removes the database after shutdown. Production browser runs use a separate `.next-prod` output. Stop the launcher normally to complete cleanup; never reuse a human's running server.

```sh
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test:unit
corepack pnpm test:int
corepack pnpm test:e2e:prod
corepack pnpm pack:check
corepack pnpm test:consumer
corepack pnpm exec node scripts/postgres-test.mjs
corepack pnpm release:check
```

The Postgres command needs local Docker and uses a disposable container with a random localhost port. It cleans up in `finally`.

## Integration contract

Build the package before generating an import map. Import the server plugin from the package root, admin components from `/client`, protected preview from `/preview`, serializable renderer attributes from `/bindings`, and authorization helpers from `/server`. Public renderers must never import `/client`, `/preview` or editor CSS.

```ts
visualEditor({
  collections: {
    pages: { roots: ['layout'] },
    offers: { roots: ['detailPage.layout'] },
  },
  previewOrigin: 'https://your-site.example',
  previewPath: '/visual-editor/preview',
  canEdit: ({ req, document }) => yourDocumentCapability(req.user, document),
})
```

The configured root must already be a blocks field. Existing custom root Field components are rejected with an actionable configuration error rather than overwritten. Existing hooks, document controls and unrelated fields are preserved.

The host supplies a protected preview route which authenticates the current Payload user, verifies `payload-ve` through `readEditContext`, and uses `overrideAccess:false` for user-driven reads. Use the same server renderers for preview and public output. Attach `getBlockAttributes(identity, active)` to actual section roots and mount one `PreviewBridge` only after authorization. Inspect `dev/app/(protected)/visual-editor/preview/page.tsx` for the complete executable example.

A shared preview secret, Draft Mode, a query parameter and the presence of a cookie are not authorization. Activation is an origin-checked POST with a current session, native document capability and host capability. Context is short lived and document scoped. The protected route must use private/no-store HTML/RSC responses. Cross-origin frontends, globals, localization and Lexical-embedded block authoring are not supported by this candidate.

The standard CMS remains the fallback. All edits use its existing Form and save queue. Drafts are shared Payload drafts, not private per-editor branches. Asset uploads remain separate writes.

## Distribution

Source is intended for `MiguelFranken/payload-visual-editor` under MIT. The selected package registry is public npm (`registry.npmjs.org`) with anonymous installs, independently of GitHub source visibility. No stable registry publication is claimed. Local immutable tarballs are produced by `pack:check`, with their checksum in `test-results/package.json`.
