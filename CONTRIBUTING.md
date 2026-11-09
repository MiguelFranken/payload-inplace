# Contributing

Generic editor behavior, schema adapters, preview contracts and synthetic regressions belong in this repository. Applications keep their renderers, authorization policies and business rules. Read [AGENTS.md](AGENTS.md) before changing those boundaries.

## Run the demo

Node 24+; pnpm 10.28.0 through Corepack. No private services or credentials are required.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm dev:generate-importmap
corepack pnpm dev
```

Open `http://127.0.0.1:3127/shop` to explore the homewares demo. Use its footer’s **Try Payload Inplace** link to sign in, then activate the small edit button on the actual page. The native CMS remains at `/admin`. Synthetic accounts are `admin@example.test`, `editor@example.test`, and `reader@example.test`, each with password `synthetic-demo-password`. These accounts exist only in the disposable local demo. Native `/admin/login` prefills the admin account through Payload’s `admin.autoLogin.prefillOnly`; login still requires pressing the button. Public ecommerce routes are `/shop` and `/products/arc-chair`. Legacy `/pages/demo` and `/offers/demo` routes remain regression fixtures.

The launcher creates a temporary Mongo replica set, initializes fixtures once, starts explicit Turbopack, and removes the database after shutdown. Production browser runs use a separate `.next-prod` output. Stop the launcher normally to complete cleanup; never reuse a human's running server.

## Imports and test layout

The [demo](apps/demo/README.md) uses the public `payload-inplace` entry points.
The workspace links them to the local build. Keep browser scenarios and
integration setup in [the repository tests](tests/README.md).

In plugin source, use extensionless relative imports for nearby modules,
`@internal/*` for deeper links within the plugin, and workspace package subpaths
for Core and Lexical. The build resolves both private workspaces into the npm
artifact. Keep explicit extensions in paths passed to Node for direct file
loading.

### Navigate to source in Zed

Open the repository root in Zed and run `corepack pnpm build`. Declaration
maps let Go to Definition on a demo import such as
`postgresConcurrency` jump to its original TypeScript source. If the
language server still has an older build open, run
`editor: restart language server` from Zed’s command palette.
The maps use source files from this checkout.

The shared [Zed settings](.zed/settings.json) exclude generated build, cache,
dependency, and test directories from the project tree and file search.
TypeScript can still return declaration files in Go to Implementation results.
Use Go to Definition for a direct jump from a demo import to its source.

## Validate changes

```sh
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm docs:check
corepack pnpm test:unit
corepack pnpm test:int
VE_PORT=3137 corepack pnpm exec node scripts/postgres-test.mjs e2e
corepack pnpm pack:check
corepack pnpm test:consumer
corepack pnpm test:installed-consumer
corepack pnpm exec node scripts/postgres-test.mjs
corepack pnpm release:check
```

Postgres integration and installed-consumer commands need local Docker and use disposable containers with random localhost database ports. The installed consumer uses an empty temporary app directory, anonymous public-npm peers and the exact checked tarball; commit source before `pack:check` so its receipt has immutable provenance. It cleans up in `finally`.

## Refresh documentation screenshots

After building the package, run the opt-in capture workflow:

```sh
corepack pnpm docs:media
```

It builds the synthetic demo with Turbopack, owns a disposable Mongo database and captures a real Chromium session at **1440 × 1000 CSS pixels / 2× density**. It also checks the storefront and product at 820px and 320px with Axe and horizontal-overflow assertions. This is a focused documentation flow, not the full acceptance suite. No external account, publication or customer data is involved.

Review all images under `test-results/docs-media` before replacing the six `ecommerce-*.png` files in `docs/images`. Copy the original PNGs unchanged; do not upscale, retouch or include loading/error states. See [image provenance](docs/images/README.md). Normal CI acceptance does not run this opt-in config or rewrite README assets. Run `corepack pnpm docs:check` after updating Markdown; it checks generated API freshness and local file/heading links, including repository URLs used by npm's README.

## Change and release workflow

Use [Conventional Commits](https://www.conventionalcommits.org/), for example `fix(editor): preserve inline selection while saving`. Include a `.changeset/*.md` entry for consumer-visible changes; `corepack pnpm changeset` creates one. Describe the user-facing outcome and choose the appropriate version bump.

The Changesets workflow opens a version PR and generates the changelog. It does not publish. Publication uses the exact main-CI archive after independent installed-consumer and Workshops acceptance, through the separate OIDC release workflow. See [the release guide](docs/release.md).

Keep fixtures synthetic and never commit secrets or private consumer data. Preserve native Payload field access, one Form and one persistence queue. Public routes must remain free of the active editor runtime. For editor interface changes, use the repository's `better-interface` guidance and validate desktop, 320px, keyboard and reduced-motion behavior. Record meaningful validation evidence in `docs/validation`.
