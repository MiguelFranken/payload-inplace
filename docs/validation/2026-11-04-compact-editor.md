# Compact editor iteration — 4 November 2026

Scope: activated website dock, one native-field panel and complete-draft publication review. The consumer renderer owns actual field placement. No new persistence model, save queue or business command.

## Reproduced causes and corrections

- Review reopening consumed the previous native modal's closed state on the next render. `useModalDismiss` now consumes each close transition once with a current effect callback. Confirmed custom actions use the same fix.
- Pages inherited a 100 ms legacy autosave interval. The plugin applies a 1500 ms idle floor and ignores metadata-only field updates; IME composition pauses persistence. Native background modified bookkeeping could cause an unchanged follow-up save; a successful unchanged authored snapshot now clears it after background processing. Newer local edits remain protected.
- The old review dumped unchanged whole blocks. Schema-aware comparison shows changed leaves, stable-ID row movements, added/removed rows and atomic rich text/relationships. Compare the published version or the immutable draft present when opening this editing session. Publication still requires the complete server-signed saved revision.
- Labels made the dock wide; it now has fixed-size icon actions/status and 500 ms Base UI tooltips. Secondary commands remain in the existing menu. A full-width plus opens the existing accessible Base UI section picker without a redundant label/divider.
- Resize has top/left and diagonal keyboard/pointer paths. A 24px transparent corner target carries a thin curved accent, not an intrusive colored square. Fields retain their DOM and focus; Escape cancels the drag.

## Executed local checks

- Typecheck, lint, build, Changesets-generated 0.0.1 metadata and 96 unit cases passed.
- Disposable PostgreSQL production browser gate: **39/39 passed**. Includes public anonymous/reader/admin-inactive resource isolation, native publication, delayed/out-of-order saves, retained label/tint/caret, row/page reorder, native errors/recovery, 75-block input budget, dark fields, German 320px dock, reduced motion, dialog reopening, review fetch failure/retry, custom-action cancellation/failure/retry, debounce/IME and resize cancellation.
- Production public client graph passed, with an injected-leak negative control.
- Desktop and 320px renders inspected. Axe checks cover the native panel, compact dock and focused review. Found and corrected the small corner target and keyboard-inaccessible diff scroll region. Explicit primary action, changed-text semantics and aria-pressed comparisons provide redundant visual/state cues.
- Codex browser rendered the isolated demo. Generic regressions live here; the Workshops acceptance additionally exercises the actual homepage workshop-feed headline and counts saves.

Current validation is bounded to the pinned supported peers. Screen-reader speech, RTL and real-device touch are not verified. Canonical CI, independent installed consumer, matching Workshops archive acceptance and registry/deployed preview evidence are separate release gates; see the final workshops-release receipt.

## Release contract

0.0.1 is generated with `changeset version` from the owner-requested normal 0.0.x baseline. The pinned Changesets action maintains future version/changelog PRs. Publication remains the existing OIDC workflow with exact CI artifact and matching consumer receipts; new dispatches target `latest`. Existing alpha versions stay immutable.

## Canonical release gates

[Main CI](https://github.com/MiguelFranken/payload-visual-editor/actions/runs/41809345628) passed at `7a616820da320100047c6c1c1f4bd30431fc98e1`: 96 unit, 39 production browser, eight database integration and seven independent installed-consumer checks. The normal 0.0.1 archive has SHA256 `fc2c4dac6ddea64189039b236f4fc5835ffc2cf889545d3a66b5e94182e958e4`. The repaired Changesets workflow also passed.

[Clean Workshops production acceptance](https://playwright-reporter-nine.vercel.app/teams/fluid-bodies/projects/workshops/runs/525) passed all seven cases at `c0262b6caf302cd2c6527ae99ca5e5cbca50ec1a`, with no failures/skips or dirty source. All 16 captures were inspected, including mobile/dark native fields, icon dock, section plus and changed-only review. Registry and deployed-preview outcomes are recorded separately in `workshops-release.json` after they complete.
