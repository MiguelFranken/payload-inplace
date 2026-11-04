# Workspace and native boundaries

The repository is a private pnpm/Turborepo workspace. `packages/payload-inplace` remains the only public package and owns the unchanged public import names. `apps/demo` is a real synthetic consumer. `packages/core` is private and contains framework-free policy, identity, geometry and annotation contracts. Core imports are linted and checked after resolution so relative imports cannot bypass the fence.

The public build includes core implementations inside its own archive; no private workspace runtime dependency is published. Type declarations and client directives remain part of packed-consumer acceptance. Internal emitted directories are not public API. Peer-owned Payload, React and Next runtimes remain external. Changesets versions the public facade, not the private root, and the existing exact-archive OIDC release remains unchanged.

Turbo caches deterministic outputs and declares their generated CSS/type/assets outputs. Demo CSS is built by the demo launcher, not written as an undeclared side effect of a cached package build. Database, browser, archive and release acceptance remain direct uncached commands. Source-unit tests run through a named Vitest project without requiring the facade build; native integration has a separate serial project and longer database timeout.

Oxlint 1.91 is the primary correctness gate. ESLint retains the original TypeScript recommended parity until the remaining rules are deliberately migrated. React compiler-only refs/immutability/manual-memoization/effect-state rules are not enabled: the supported plugin uses imperative native Payload/DOM synchronization and does not enable React Compiler. Hook dependency findings are initially warnings and must be addressed during domain extraction rather than mechanically remount browser-owned fields. The named scroll-region and status-tooltip focus targets are intentional exceptions to noninteractive-tabindex. Semantic status roles remain valid; prefer-tag-over-role is not adopted as a style-only rewrite.

No compiler upgrade is required for Oxlint. Type-aware Oxlint migration is separate from the existing TypeScript 5.9 typecheck. Public resource isolation, transaction-backed revisions and one native Form/save authority are unchanged constraints.

## Native controller ownership

The native Form is the field and submission authority. `useNativeStructure` owns identity-aware structural intents/history and waits for native row preparation. `usePanelState` owns disclosure transitions; native ownership slots mount at most one control for a path. Idle submission owns only the typing deadline. Recovery delegates retries to that same native queue. `useSavedPreview` owns only single-flight presentation reads and revision floors: it cannot accept field values or submit a document. It uses current callbacks, ignores late unmounted results and rejects responses below the requested floor before accepting a presentation tree.

Optional native fields, consumer strategy providers and streamed presentation content have local Suspense boundaries below the Form owner. Suspending a field/preview must not hide/reveal the whole Form and replay Payload's initialization effect. Development mapping diagnostics run only on explicit target selection; they report bounded, deduplicated reason/path metadata and never content values.

Structural failures use discriminated issue codes with count/block-type parameters. Native command/history adapters accept a formatter; the UI translates the code at its boundary. Default English wrappers preserve existing server/core consumers. This avoids parsing English messages or restarting native work when the display language changes.
