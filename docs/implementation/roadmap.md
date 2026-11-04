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
