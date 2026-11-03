# Validation and remaining gates

Evidence distinguishes source implementation, built tarballs, actual consumer installations, local browser review, registry release and production deployment.

## Current baseline

Payload/UI/Postgres adapter 3.91.0, Next 16.4.2 with explicit Turbopack, React/DOM 19.2.6, Tailwind 4.3.3, Base UI 1.9.0, pnpm 10.28.0. Local commands run on Node 26. Node 24 CI passed the prior source milestone at 3987418; the expanded installed-consumer gate is rerun for the latest head before it is claimed green.

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

- Green public Node 24 CI for the current source candidate.
- Immutable installed package acceptance in the actual Workshops app, including three representative integration passes and documented public/auth/cache boundaries.
- Matching immutable package acceptance across Workshops and the separate clean installed consumer. The second app passes its baseline; this does not establish Workshops acceptance.
- Explicit compatibility matrix, publication workflow, rollout and rollback verification. The npm package remains unpublished.

No production deployment, customer data mutation or customer communication is claimed. Passing demo tests does not close consumer acceptance or release gates.
