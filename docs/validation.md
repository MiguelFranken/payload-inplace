# Validation and remaining gates

Evidence distinguishes source implementation, built tarballs, actual consumer installations, local browser review, registry release and production deployment.

## Current baseline

Payload/UI/Postgres adapter 3.91.0, Next 16.4.2 with explicit Turbopack, React/DOM 19.2.6, Tailwind 4.3.3, Base UI 1.9.0, pnpm 10.28.0. Local commands run on Node 26. Node 24.22.1 CI run 41564926240 passed head b073be9, including the real clean installed consumer. Exact revisions, hashes and coverage are recorded in `validation/2026-11-03-ci.json`.

## Executed checks

- 40 unit tests: schema/identity/protocol/signature boundaries, native acknowledgement races, populated preview projection, structural history, block availability and identity-based reordering. Typecheck, lint and package build pass.
- Real Postgres integration: five passing tests cover native draft/publication, access, concurrency, rollback and reviewed restore. Mongo integration: two passing tests, three Postgres-only skips. Mongo is a single-writer development option, without the Postgres atomic concurrency guarantee.
- Frontend production browser regression: the prior native/optimistic milestone passed 14/14. The latest simplified direct-editing flow passes 19/19 production browser tests, including list/on-page dragging, keyboard focus, actual rich-text rendering, later typing preserved on undo, three successive inline edits without rearming a mode, caret-preserving keyboard save, fresh session reactivation, denied reactivation retaining the working copy, and actionable cold-link recovery. See `2026-11-03-browser.json` and `screenshots/2026-11-03`.
- The current production public client graph has one framework reference chunk (13,888 decoded bytes), and no plugin/native-editor client modules. Active positive and intentional leak negative controls pass. This is a reference-graph metric, not the complete network payload.
- Preserved disabled/installed resource samples cover anonymous, reader and admin identities, three local samples each. Both configurations returned 460,281 decoded external JS/CSS bytes. Inline authorized launcher HTML/CSS is outside that external resource sum. Timing samples are too small to establish general performance equivalence.
- Tarball contents, client directives, public binding graph and upstream attribution are checked by `pack:check`. `test:consumer` checks extracted packed bindings only. `test:installed-consumer` separately builds a real clean app using `stories.article.sections`, native select/RTE/media controls, a consumer renderer, authenticated draft/publication and installed/disabled public-resource checks. See [installed-artifact acceptance](validation/installed-consumer.md) for exact hashes and coverage. `release:check` validates metadata and explicitly does not establish release readiness.

## Implemented safety boundaries

One native Form owns values, validation and persistence. Immediate preview derives from that Form; snapshot/row-identity guards prevent older acknowledgements from overwriting newer edits. Read-only server preview refresh keeps the Form mounted, with retry/download on failure or access loss. Postgres transaction locking and monotonic revisions protect ordinary CMS and visual writes. Saved-draft review is session/revision/content bound. Activation and extension actions recheck current native access and host capability. Public visitors and readers receive no authoring runtime; authorized public launchers use server HTML and a native POST form.

The frontend uses a compact horizontal dock and a single contextual panel. Sections reorder in the list or on bound site elements, with pointer/keyboard, cancellation and undo. Intermediate drag positions never enter FormState. The owner rejected the previous multi-window design; it is not accepted evidence for this redesign.

## Open release gates

- Immutable installed package acceptance in the actual Workshops app, including three representative integration passes and documented public/auth/cache boundaries.
- Matching immutable package acceptance across Workshops and the separate clean installed consumer. The second app passes its baseline; this does not establish Workshops acceptance.
- Explicit compatibility matrix, publication workflow, rollout and rollback verification. The npm package remains unpublished.

No production deployment, customer data mutation or customer communication is claimed. Passing demo tests does not close consumer acceptance or release gates.

## Alpha.1 integration findings (2026-11-03)

Real Workshops Pages exposed an empty native presentational skeleton (`_index-*`) in the Form projection. Review now accepts only recursively empty object containers absent from saved data; unknown primitives, arrays, nulls, changed authored values and changed row identities remain rejected. The demo's Pages layout now uses an unnamed native tab to exercise that schema shape.

A draft with several required singleton sections can be constructed incrementally. Existing required sections cannot be removed or duplicated, and publication still applies the complete structural policy. Inline focus now uses compiled, prefixed Tailwind utilities in the active document head so the editor's selection perimeter does not compete with the browser's text-line outline; forced-colors mode retains its native indicator. Classes and styles are removed on unmount.

`operationalWrites` is a server-only integration contract for existing reviewed business commands. It retains native access and expected-revision locking. A permitted publication must contain the complete current live snapshot, differing only at explicitly configured operational paths outside visual roots. A sparse patch, an editorial change, an unapproved context and a stale revision are rejected. Consumers remain responsible for restoring a concurrent private draft with the returned revision; the real Postgres integration test exercises separate live/draft content through this sequence.

Local checks: 47 unit tests, 6 real Postgres integration tests, typecheck and lint passed. The 19 production browser cases passed for the inline-focus, transparent-tab review and incremental-policy changes; the subsequent operational-write addition is covered by the real Postgres cases and will also run through CI's complete browser suite. Workshops consumer acceptance remains in progress.

## Alpha.2 real-render refinements (2026-11-03)

The real German 320px render exposed dock overflow despite the original English narrow-screen tests. Small screens now expose minimize in More tools; at 360px and below the save status remains announced without taking visual width. A German browser case verifies that every visible dock button remains inside its border and that minimize remains reachable. The host example preserves the actual CMS request language instead of silently replacing it with the Local API fallback language.

Real Workshop forms also expose native zero-row controls for empty, unmounted arrays. Review accepts `0` only against a saved empty array; a non-empty saved array still requires its exact row values and identities. The demo includes an unmounted native metadata array to reproduce that shape. Checks passed: 48 unit cases, 20 production browser cases, 6 real Postgres transaction cases, typecheck, lint, and the zero-editor public graph assertion. Interactive development may set an ignored persistent `VE_MEDIA_DIR`; test defaults remain temporary.

## Alpha.3 hardening and release preparation (2026-11-03)

Native shadow selector adaptation now retains root theme qualifiers inside `:host(...)`, fixing dark controls without changing the website theme. English/German narrow controls, dark native fields with axe, repeated panel listener/observer cleanup and a 75-block typing-frame budget are exercised in production browser tests. The measured local typing p95 was 6.3ms against a 100ms budget; this is a bounded synthetic document, not a claim about every consumer page.

Validation recovery links directly to native fields even after their panels unmount, mounts one field owner, explains the native error and retries through the same Form. Feedback and panels share a measured stack clearance; long feedback scrolls within a bounded surface. Successful correction returns focus to More tools. A native draft-validation fixture proves server rejection, retained input, 320px correction and successful readback. Production Turbopack needs one consistent Payload server runtime to preserve native error-class identity; demo and installed-consumer configs externalize `payload` explicitly.

Local build/type/lint, 59 units and 6 real Postgres cases pass. The 23 pre-existing production cases pass after these changes; the additional focused native validation/focus case passes. The complete 24-case run and matching immutable consumer archive are required in CI before final candidate acceptance. Manual release CI and negative-control policy tests now reject mismatched source/archive/consumer evidence and prereleases on the stable channel. Npm account trusted-publisher activation remains external account configuration; no registry publication or production deployment is claimed.

## Alpha.4 submission-error race (2026-11-03)

CI run 41618592172 returned a correct native ValidationError but exposed an asynchronous metadata race: a subsequent native Form-state refresh could clear the error marker before the revision-status request completed. Recovery now subscribes to native field errors and retains only their paths/messages for the current submission attempt. It stores no document values and creates no save queue. The regression delays the revision check while ordinary native refreshes finish; correction still reveals the original field/message and native retry persists the fixed value. Local full production browser suite: 24/24 passed; 59 units, typecheck, lint and build pass. The independent consumer now receives a temporary public-npm user config so developer credentials/scoped registries cannot influence anonymous peer installation.
