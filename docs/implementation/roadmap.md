# Local implementation ledger

Branch: `feature/onpage-roadmap`. Owner instruction: commit completed slices locally; **no push, release or deployment until the owner gives the signal**.

Baseline: `fa1f80f`, 108 unit tests passed before edits. Full roadmap: Linear COURSE-233, children COURSE-234–254. Work is accepted per domain, not by file movement alone.

- [ ] COURSE-234 workspace/build/package preservation
- [ ] COURSE-235 native-backed domain controllers
- [ ] COURSE-236 domain Vitest/component coverage
- [ ] COURSE-237 Oxlint/rule and import boundaries
- [ ] COURSE-238 document-bound mapping/diagnostics
- [ ] COURSE-239 native v3 compatibility bridge
- [ ] COURSE-240 inline Lexical rich text
- [ ] COURSE-241 contextual insertion
- [ ] COURSE-242 catalogue/transient previews
- [ ] COURSE-243 contextual editor strategies
- [ ] COURSE-244 contextual media adapter
- [ ] COURSE-245 globals/multiple document scopes
- [ ] COURSE-246 advisory locks/safe conflict reconciliation
- [ ] COURSE-247 typed UI messages/content locales
- [ ] COURSE-248 redacted lifecycle events
- [ ] COURSE-249 active-editor budgets/latency
- [ ] COURSE-250 frontend versions/canvas change navigation
- [ ] COURSE-251 optional reusable patterns
- [ ] COURSE-252 predictable undo precedence
- [ ] COURSE-253 consumer test kit/API examples
- [ ] COURSE-254 source text semantics

## Foundation validation

Workspace build, TypeScript, 108 moved unit tests, Oxlint plus retained ESLint, publint, archive boundaries and the packed binding consumer passed. Turbo reports local cache hits for core and facade builds. Hook dependency migration warnings remain visible; stateful browser/database acceptance and further domain extraction remain pending. See ADR 0007 for packaging and lint migration choices.

## Native controllers and text semantics

Extracted structural/index/history and manual draft submission controllers; autosave now explicitly includes content locale and fallback-locale like manual save. A single panel transition model replaces independent disclosure booleans, with component tests for repeated close/reopen, stale close and queued toggles. DOM plaintext serialization preserves source casing/spaces and browser multiline markup instead of CSS-transformed innerText.

Local verification: 121 unit/component assertions passed including host-alias preservation; TypeScript passed. Focused real-browser source-text regression passed (7.1s), including the negative control where innerText is uppercase but the field's source is mixed case, persisted draft read-back, stable URL and header node identity. Seven Postgres and three applicable Mongo native integration cases passed; four PostgreSQL-specific cases are skipped on Mongo.

Codex browser exposed an undeclared clsx import in the pinned Payload UI client build after removing incidental root hoisting. The v3 Next adapter now resolves that dependency from our own declared runtime only when missing upstream, preserving an explicit consumer alias. Activation, site chrome and sections render correctly in Codex browser. Full production/installed-archive acceptance remains pending.

## Typed bindings and contextual insertion

Added a document-bound, server-safe typed annotation factory for terminals, groups, stable array rows and empty lists. Existing helpers remain supported. Foreign document provenance fails closed. Canvas boundary/list insertion delegates to the same native ADD_ROW/history policy as outline actions, resolving the anchor again when committed. Picker cancellation does not modify the draft. See bindings-and-insertion.md.

Focused browser checks passed for stable neighbor insertion/cancel and an empty nested array. TypeScript, build and both lint gates passed. Further catalogue previews, asynchronous row selection and full keyboard/touch acceptance remain pending; these tickets are not claimed complete yet.

## Inline structured rich text

Added the private Lexical runtime boundary, server-projected native capabilities, one strategy classifier and a lazy inline surface bound to native useField. Payload link metadata and unknown/custom/upload islands round-trip through unrelated edits. Native Field overrides stay native. The temporary DOM twin leaves React's original subtree mounted; geometry and the existing preview guard retain selection continuity. Common marks are compact; block styles are secondary; complex/internal links retain native settings. ADR 0008 records tradeoffs and remaining acceptance.

All four focused roadmap browser cases passed (18.9s), including structured text save/focus and native settings handoff. Further paste/IME/link/undo/latency and installed-consumer acceptance remain pending. No ticket is marked Done based only on this first rich-text slice.

## Searchable catalogue and disposable previews

Added a lazy Base UI catalogue with descriptions, searchable groups, thumbnails with missing-media fallback and explicit empty results. Examples are redacted against native field permissions before transport. A transient insertion delta projects against current stable IDs; it never replaces native Form data. Server-only hosts get catalogue metadata without pretending to preview their server renderer. Choosing still inserts native defaults, not the displayed example. The open canvas picker retains its original target rather than following pointer movement onto another section.

137 unit/component assertions pass. Focused browser acceptance passed for cancel/reopen and exact insertion, plus delayed example preview, group search, empty results and cancellation across the autosave idle deadline with zero PATCH requests and an unchanged native revision. A screenshot review found padding on Base UI's always-mounted empty live region; spacing was moved onto its conditional child. Further row-selection initialization and broader mobile/keyboard/production acceptance remain pending.

## Consumer field strategies

Added typed, document-local strategy registration through configured import-map providers. Definitions declare compatible kinds, optional matching/priority and native-only overrides. The selected strategy mounts under the existing single field owner and uses a guarded native useField bridge. Explicit native annotations, consumer native Field overrides, ACL/readOnly and native conditions retain precedence. Native handoff unmounts the custom control before mounting native UI.

140 unit/component assertions, TypeScript and lint passed. A real native browser fixture selected a custom background palette, persisted the select value and handed back to Payload's actual native field (7.0s). Further custom media adapters and packed external strategy fixture acceptance remain tracked separately.

## Saved version timeline and native restore intent

Implemented lazy, scope-authorized native version pagination and changed-only comparison. Timeline reads expose metadata only until selection. Show-on-page resolves current stable row identities. Restore sends a server-resolved intent through the same native Form submission queue, preserving the transactional revision guard and reviewed publication. Pending edits block restoration; success resets structural history/selection without replacing the website route or header.

142 unit/component assertions, TypeScript and lint passed. A real browser/Postgres case compared/restored a version with exactly one PATCH, a new revision/draft status, retained header/URL and repeated close/reopen (9.9s). Access-revocation/race/pagination and broad production acceptance remain pending.

## Native asynchronous readiness and idle submission

Canvas insertion now keeps only a pending row intent. Selection waits until native row metadata, the row's ID field and leaf fields agree, then opens the new block or just the inserted array item's fields. Another selection cancels that intent. It never selects an older row occupying the same numeric path. The history capture also observes native preparation completion.

Extracted an idle-trigger controller with no document/persistence store. Callback/metadata refreshes do not restart the typing deadline; composition and native processing cancel it. Unacknowledged native attempts wait for explicit recovery. Rejected callbacks produce recovery feedback without an unhandled timer rejection.

146 unit/component assertions passed, including fake-timer typing/metadata/in-flight/composition/scope cleanup cases. Real browser checks passed for correctly scoped new block/array controls (9.5s), and one-save typing bursts plus composition (14.2s). TypeScript and lint passed.

## Metadata policy and revision characterization

Centralized private transport/root-metadata classification across authored hashes, review candidates, diffs, autosave fingerprints, version copies, presentation and working-copy downloads. Nested row IDs remain content identity. Added direct revision-guard characterization for lock-before-read order, stale/bulk writes, exact reviewed publication, explicit system scope, guarded native restores and authoritative revision assignment. These unit fixtures complement the real database race tests; they do not claim concurrency proof.

151 unit/component assertions, TypeScript and lint passed.
