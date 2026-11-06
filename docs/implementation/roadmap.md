> Historical milestone snapshot. Version, test counts, pending gates and release holds below describe that dated run. See the [current release/consumer receipt](../validation/workshops-release.json) and the [documentation index](../README.md) for current status and setup.

# Local implementation ledger

Current final acceptance: [21-ticket evidence matrix](../validation/linear-acceptance/README.md), 5 November 2026. All entries below are chronological checkpoints; earlier “pending” statements describe that checkpoint and are superseded by the final matrix. Final counts: 227 unit/component tests, 68 production browser cases, 12 PG and 5 applicable Mongo checks, plus clean installed-archive/cache gates. Local only; release remains held.

Branch: `feature/onpage-roadmap`. Owner instruction: commit completed slices locally; **no push, release or deployment until the owner gives the signal**.

Baseline: `fa1f80f`, 108 unit tests passed before edits. Full roadmap: Linear COURSE-233, children COURSE-234–254. Checked entries mean implemented and locally validated on the declared runtime matrix, not released or deployed. The final evidence and explicit boundaries are recorded below. Work is accepted per domain, not by file movement alone.

- [x] COURSE-234 workspace/build/package preservation
- [x] COURSE-235 native-backed domain controllers
- [x] COURSE-236 domain Vitest/component coverage
- [x] COURSE-237 Oxlint/rule and import boundaries
- [x] COURSE-238 document-bound mapping/diagnostics
- [x] COURSE-239 native v3 compatibility bridge
- [x] COURSE-240 inline Lexical rich text
- [x] COURSE-241 contextual insertion
- [x] COURSE-242 catalogue/transient previews
- [x] COURSE-243 contextual editor strategies
- [x] COURSE-244 contextual media adapter
- [x] COURSE-245 globals/multiple document scopes
- [x] COURSE-246 advisory locks/safe conflict reconciliation
- [x] COURSE-247 typed UI messages/content locales
- [x] COURSE-248 redacted lifecycle events
- [x] COURSE-249 active-editor budgets/latency
- [x] COURSE-250 frontend versions/canvas change navigation
- [x] COURSE-251 optional reusable patterns
- [x] COURSE-252 predictable undo precedence
- [x] COURSE-253 consumer test kit/API examples
- [x] COURSE-254 source text semantics

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

## Domain testing and lint contracts

Relocated all existing suites into named domains and added AST import-boundary negative controls, stable-path contracts and measured domain coverage floors. Native integration remains serial; independent units/components run in parallel. Turbo task hashes now include the exact Node runtime and root script/workspace inputs. See quality-gates.md for measured coverage scope, remaining gaps and rule responsibilities. No speedup is claimed from runs with different inputs.

## Optional contextual media adapter

Implemented a lazy opt-in media strategy with native single/polymorphic reference shapes, cancellable debounced pagination, upload progress/retry, editing-revocation cleanup and native fallback. Native same-origin search retains server ACLs; selecting never mutates shared asset metadata. Component tests cover out-of-order/aborted responses, pagination, invalid/foreign IDs, retry and late upload cancellation. The real demo browser replacement saved only the document reference, retained shared asset metadata and handed back to native UI (7.1s). Full new-media installed-consumer/mobile acceptance remains pending.

## Full production audit and explicit retry regression

A fresh Node 24 production build completed; the first full run passed 49/52 cases. Two failures exposed explicit retry being blocked by the new unacknowledged-attempt gate. Recovery now authorizes exactly the failed attempt for another idle/native submission without falsely acknowledging it as saved. A subsequent failure again requires explicit recovery. The third failure was a stale old-select implementation selector after successful drag/undo behavior; the test now observes the catalogue's semantic listbox. All three focused native browser regressions pass (22.7s). The original stalled Turbopack build was recovered by preserving the old generated output outside the checkout and building a fresh output; no timeout increase or bundler switch was used. Full final production rerun remains required.

## Redacted lifecycle events

Added active-only import-map providers and a typed metadata channel for native save/restore/publication, review and server-preview outcomes. Explicit projection excludes values, raw errors and activation/review credentials. Opaque operation handles settle once; saved previews correlate to their parent save. Pure/component tests cover ordering, redaction, cleanup and observer failures. A real native browser case rejected a save, retried explicitly, reconciled its preview and opened review while the observer rejected every callback (7.9s). Seven Postgres integration tests and three applicable Mongo cases also passed; four PG-only tests remain explicitly skipped on Mongo.

## Reviewed reconciliation and native advisory presence

Added a lazy frozen three-way comparison using the last acknowledged native copy, current working Form and freshly authorized saved draft. Separate leaf changes combine by stable identity; overlaps require explicit Base UI choices, structural overlaps are whole-list decisions and malformed native IDs fail closed. Acceptance rebuilds native field state, preserves current proof/latest revision, resets structural history and delegates saving to the same native queue. Cancellation/late input do not replace native fields.

Added native user-based lock awareness with serialized Postgres lease operations, bounded visible-only heartbeats, exact-stamp cleanup and paused foreign-user controls. No owner profiles, takeover capability, new collection or migration. Native REST lock checks and transactional revision enforcement remain authoritative. Same-account windows remain an advisory limitation, documented explicitly.

178 unit/component assertions pass in 52 files. Eight real Postgres cases pass. Browser recovery combines disjoint changes after a real stale-write rejection and passes 320px layout (8.6s); two-user lease pause/exit/resume passes at narrow width (5.9s). Full production/installed-archive and access-change/race acceptance still needs its final run; no roadmap ticket is marked complete solely from this slice.

## Visitor graph contract after workspace migration

Updated module detection for the actual nested facade dist layout, retaining old-layout negative controls and explicitly allowing ordinary Next runtime dist files. The active positive control now resolves the real workspace DeferredEditor entry. Deliberate native/editor/core-event leaks are rejected in unit fixtures; the nonempty delivered production observation is still required by the full graph gate. This fixes the gate itself rather than inferring visitor safety from a source-only build.

## Typed messages and content-locale isolation

Introduced framework-free typed interpolation/plurals/Intl formatting, English/German catalogues, consumer overrides and editor-scoped direction. Static/dynamic chrome, recovery identities and native accessibility shims now use message keys. Asynchronous feedback translates at render time without rescheduling native work. Consumer/native labels and validation remain their owner's copy.

Signed activations and review tokens now include the content locale; native draft, version, comparison and presence requests retain that scope. Frontend scope remounts isolate history/selection/acknowledgements. The native bridge accepts a freshly reauthorized server request for form/field/table preparation instead of inheriting the admin's last-used locale. Authoring reads explicitly disable native fallback; shared-root structure explains its cross-language effect.

187 unit/component assertions in 59 files and nine real Postgres cases pass at this slice. Localized inline/native browser acceptance passes (7.5s), as do English/German/RTL desktop/320px and reduced-motion checks (10.9s; RTL spacing follow-up 5.9s). Codex browser inspection confirms the compact panel overlays the unchanged storefront. The full archive/production acceptance and remaining untranslated domain failure codes are still required before COURSE-247 is complete.

See localization.md for the contract and its boundaries.

## Native globals and finite document scopes

Added explicit draft-global configuration and native collection/global adapters, independent per-document revision/review/version/lock authority, server-declared page scope metadata and a native-queue-draining switch coordinator. Document provenance now participates in canvas geometry and foreign selection. See document-scopes.md for configuration, cookie lifecycle and the deliberate raw-global-restore restriction in Payload v3.

Validation: 202 unit/component assertions, TypeScript, lint and 11 Postgres cases pass, including actual competing global writers and leases. The real page/product/global browser sequence passes (9.0s). It found and fixed two integration bugs: global save acknowledgements use `result`, and Payload's stable command object is not a reactive disabled-state subscription. Malformed acknowledgements now preserve native state; scope switching observes the native watch snapshot. Final production/installed-consumer validation remains pending.

## Independent reusable section patterns and native loading isolation

Added an opt-in server storage/authorization adapter, lazy library tab in the existing catalogue and an explicit save-copy control for eligible saved root sections. Pattern input is projected against native schema/ACL, nested row IDs are regenerated and shared asset IDs are retained. Native form-state preparation supplies defaults/components; only one prepared row enters the existing structural command/history/save path. Disabled configuration installs no collection or endpoint and issues no pattern requests. See section-patterns.md.

Local checks pass: 207 unit/component assertions, TypeScript, lint and 12 real Postgres cases, including consumer-owned pattern record access and unchanged source revision. Pattern insertion passes in the real browser (5.8s), and the existing native media drawer retains ownership through a custom-field suspension. A new dirty-native-field browser regression passes (5.8s). This revealed and fixed a wider bug: native field loading could suspend the entire Form and replay Payload initialization, reverting unsaved rows. A local Suspense boundary now contains field loading below its owner. Codex browser review confirmed the compact library presentation and same-page chrome.

## Consumer test kit and checked public contracts

Added optional `/testing` synthetic schema/binding fixtures, deterministic abortable outcomes, a control-only strategy harness and a read-only probe for a real native Form. The test kit contains no save backend and is fenced out of production source/active graphs. The clean external archive fixture now includes unit tests for the same custom number control registered in its native app, plus public-path typechecked annotation/message examples. Its next frozen-archive run will validate those additions; source unit tests are not presented as installed/native proof.

Added generated public API tables with declaration links and CI freshness checks, plus task-oriented testing/extension recipes. Local kit/boundary tests, TypeScript and lint pass. Complete production and installed-archive acceptance remain pending.

## Selection diagnostics, command failures and saved presentation ownership

Added opt-in active-development mapping diagnostics for path/row intent, native overrides, access/condition state, unsafe markup and repeated occurrences. Output contains bounded reason/path metadata, never values. Structural command/history failures now have typed codes and English/German UI formatting while preserving core compatibility wrappers.

Extracted saved-preview single-flight/coalescing and revision-floor handling from the shell. Late unmounted responses cannot update the next document owner; stale presentation reads are rejected before acceptance. Local provider/preview Suspense boundaries preserve the native Form while optional content loads. Three component tests cover coalescing/current callbacks, stale response/explicit retry, access denial and unmount. The streamed structural acknowledgement browser regression remains green.

Local validation at this slice: 216 assertions in 73 unit/component files; coverage 80.58% statements, 76.09% branches, 84.15% functions and 82.77% lines for the documented domain denominator. TypeScript, lint and generated API contracts pass. Full production/browser/archive acceptance remains required.

## Undo precedence and draft activation

A real-browser flow now creates a structural move, performs plaintext and Lexical text undo, saves a later headline edit, and undoes the structure. Text history never changes block order; structural undo retains the newer headline and revision/draft status (10.5s). The Lexical unit test now actually dispatches undo and redo and checks serialized state, rather than only checking initialization/formatting.

Activation permission checks now pass draft intent to native update access while retaining the original source document for host capability checks. A published source therefore does not incorrectly require publish authority merely to enter draft editing. Two regression controls cover collection/global intent, unchanged source status and host denial. Native publication/review guards are unchanged. Focused unit, browser, TypeScript, lint and API checks pass.

## Active feature budgets and broad local acceptance

Added own-module compressed-size ceilings, lazy-boundary checks and oversized negative controls. The review renderer now loads on demand under its own Suspense boundary. Production browser measurement records actual native-peer-inclusive bytes/requests, traced JavaScript parse/compile work, script execution and activation/panel/catalogue/review/version/media/RTE/typing/save/reopen timing. See validation/performance/README.md for method, baselines and native-peer limitations. No speculative idle prefetch is enabled.

The first complete 64-case production run passed 61 cases. Three stale test fixtures prevented their intended checks: an English name for a translated toolbar, and review/action failure interceptors that omitted new locale query parameters. Corrected focused runs passed the toolbar/action checks and reached a real review accessibility failure. Review comparison buttons now derive their accessible names from visible text, with counts explained separately; the native 320px Axe/retry/close/reopen flow passes. The Mongo pattern fixture now uses its supported timestamp revision and checks unchanged source content, rather than comparing two missing numeric revisions.

Current local gates: 218 unit/component assertions; 81% statements / 76.64% branches / 84.15% functions / 83.24% lines in the documented denominator; 12 Postgres cases; five applicable Mongo cases with seven explicitly transaction-specific skips. TypeScript and lint pass. A fresh full production run and the clean installed archive remain the final acceptance gates.

## Final local acceptance

All 21 implementation domains above are present and locally validated on the pinned v3 matrix. The final production run passed all 64 cases in 4.3 minutes, including same-page draft activation, delayed/stale/failed saves, caret/selection stability, native fields/drawers, reorder/history, source text, review/retry/reopen, localization/RTL, global/document scopes, patterns and actual admin/panel geometry parity.

The frozen public archive `a25dacbf69794e9a46898a4218f363e8f01e14f4285e14686914d03521f70246` comes from clean source `bc1db9e`. A separate installed production app passed its two public-kit/control unit tests, all four enabled browser cases and three disabled-isolation cases. It saved native and inline structured rich text, custom number controls and reviewed publication, retained unrelated values, and compared inactive resources byte for byte. Its harness source is separately recorded because the host fixture was corrected to use the documented Next bridge, trusted Origin on API draft probes and an explicit inline-body whitelist. These corrections did not alter the frozen package.

Final domain coverage is 218 assertions in 74 files, 81% statements / 76.64% branches / 84.15% functions / 83.24% lines for the documented denominator. All 12 native Postgres cases and five applicable Mongo cases pass. Seven transaction/global cases are intentionally Postgres-only. TypeScript, Oxlint/retained ESLint, generated API freshness, publint, archive/inert bindings, all JavaScript ESM/type entrypoints, feature budgets and visitor graph checks pass. The CSS asset is excluded only from JavaScript type resolution and remains covered by packaging and real browser loading.

See [machine-readable acceptance](../validation/2026-11-04-roadmap/acceptance.json), [production cases](../validation/2026-11-04-roadmap/browser-summary.json), [installed archive receipt](../validation/2026-11-04-roadmap/installed-consumer.json), [native gutter comparison](../validation/2026-11-04-native-panel-gutters.md) and [native adapter inventory](../native-v3-adapters.md). Hardware touch, Firefox/WebKit and full speech-assistive-technology behavior remain unverified; unsupported cross-origin/custom-node authoring and native-peer loading boundaries remain explicit in compatibility/performance docs. Existing hook-dependency migration warnings are retained visibly.

No commits have been pushed. No package version has been published and no deployment has been started during this local implementation. The owner retains the push/release signal.

## Final individual-criteria audit — 5 November 2026

All 21 ticket criteria were rechecked against implementation and actual package/native/browser behavior. The final audit corrected selection ownership, multiline editing, upload retries, polymorphic media identity, native date accessibility and cache-harness provenance. See the [final matrix](../validation/linear-acceptance/README.md) for exact archive/source identities, runtime split, explicit native-peer loading and Mongo concurrency refinements, screenshots and machine-readable receipts. No push, release or deployment occurred.
