> Historical milestone snapshot. Version, test counts, pending gates and release holds below describe that dated run. See the [current release/consumer receipt](workshops-release.json) and the [documentation index](../README.md) for current status and setup.

> Historical iteration report. The final alpha.5 candidate and current acceptance are recorded in [the final validation report](2026-11-03-final.md).

# Direct website editing interface review

## Scope and coverage

Reviewed the complete default English/light demo flow: authorized public launcher → inline text editing → secondary native settings → sections/add/reorder → acknowledged save/recovery. Desktop 1280×720 and narrow 320×740. React 19, Payload 3.91 native Form/complex fields, Tailwind prefixes without Preflight, shadcn Base Nova components backed by Base UI, dnd-kit, consumer `--pve-*` variables and a shadow-root chrome surface.

Conventions inspected: repository `AGENTS.md`, copied `better-interface` and all six owning skills/references, native Payload control implementations, and ADRs 0003–0005. This is a screen/flow review requested by the owner, not a full repository or PR review.

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | Rendered accessibility tree, native media/RTE labels, inline labels, keyboard menus/select, panel autofocus/return, minimize/expand, pointer and keyboard drag/cancel, 320px control bounds, reduced motion, axe | Clear within the reported scope |
| Layout | Actual desktop/mobile renders of the dock, single panel, section list, select popup, native field settings, public launcher, recovery | Clear; no wrapping multi-window toolbar remains |
| Writing | Entry, Edit/Sections labels, content-based row names, fixed-first explanation, saved/pending/error states, working-copy/reopen/sign-in actions | Clear; primary actions describe content editing rather than inspection |
| Typography | Actual system font rendering, compact control scale, heading/type hierarchy, long row titles at narrow width | Clear; complete row text remains reachable through the row's accessible name and settings/site content |
| Colors | Rendered default surface/text/muted/primary pairs, named status icons/text, selection/focus treatment | Clear for the measured default pairs |
| UI polish | Rendered radius/spacing, 557×54px desktop dock, single anchored panel, stable-width save status, hover/selection transitions and reduced motion | Clear within the reported scope |

## Findings

No actionable interface findings remain in the reviewed flow. A separate installed-consumer review subsequently found heading-name assumptions and drag chips covering tightly padded text; schema-derived labels and collision-aware grip placement resolve those generic issues, with dedicated unit and installed-browser assertions. The owner's previous rejection was treated as a task-flow problem: entry is one click, three successive inline fields require three content clicks and zero mode-rearming clicks, section navigation and settings have separate controls, invalid additions are absent, and structural undo preserves later text. Those changes are implemented and covered by behavioral browser tests.

## Verification

- Production browser command: `VE_PORT=3137 node scripts/postgres-test.mjs e2e`. The sanitized case-level result and axe output are in `2026-11-03-browser.json`; representative renders are in `screenshots/2026-11-03`.
- Browser checks exercise native media/RTE editing, real rendered rich text, inline editing/save/publish, delayed responses with later typing, failed saves, denied/unavailable preview reads, explicit recovery, empty-layout construction, list/page pointer and keyboard reordering, cancellation, fixed-first rules, and keyboard panel/menu/select focus.
- An actual in-app browser walk independently verified one-click entry and immediate focus on existing page text. No user's page text was changed during this review.
- The rendered default white surface gave text `rgb(47,47,47)` 13.39:1, muted text `rgb(74,74,74)` 8.86:1, and white on primary `rgb(52,81,235)` 5.96:1. These measurements do not certify consumer-overridden colors.
- Typecheck/lint/build, 40 unit tests and five real Postgres integration tests pass. They complement rendered review and do not substitute for it.

**Not verified:** full assistive-technology speech output, forced-colors mode, browser 200% zoom beyond the 320px reflow test, dark themes, RTL, every translation, touch-device hardware and arbitrary consumer overrides. Native media/RTE full interactions were reviewed on desktop; narrow controls include hero fields/select/upload. Actual Workshops and a separate installed consumer are outside this interface verdict and retain their project acceptance gates.

## Verdict

Approve for the explicitly reviewed default demo flow. This is not project release approval or acceptance of unreviewed consumer/theme/assistive-technology surfaces.
