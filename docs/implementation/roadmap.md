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
