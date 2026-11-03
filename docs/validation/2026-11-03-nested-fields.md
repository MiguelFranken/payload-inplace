# Nested field editing follow-up

Scope: activated website selection → terminal plain text → scoped native array-row settings → save/review. This supersedes the earlier statement that all array contents need the whole array editor. It does not certify arbitrary consumer overrides or every field implementation.

Implementation candidate: `0.1.0-alpha.11`, source `72725d1cefde99da60c6c82e44cdf9b9c43b287d`. The local Workshops archive has SHA256 `dfd378be12069372acd708f62ff83d8aa106ce26caf2aa716ffc61e49b31f76e`. It is an immutable local candidate, not a new public npm release.

## Evidence

[Exact-code CI](https://github.com/MiguelFranken/payload-visual-editor/actions/runs/41653426277) succeeded: typecheck/lint/build, 68 unit tests, 28 production Postgres browser cases, six Postgres integration cases, clean binding consumer, production graph/boundary checks and seven installed-consumer cases. Mongo integration ran two applicable cases with four adapter-specific skips; Postgres ran all six.

Local isolated production Postgres also passed all 28 browser cases. The new browser case types into an array leaf, saves, opens a row-only panel, edits its native field, saves and reloads. Resolver cases cover nested/escaped IDs, reordering, missing/duplicate rows, unknown paths and inherited read-only/read denial.

A real Workshops installation passed its synthetic end-to-end flow: the chapter textarea edits inline; its row panel exposes exactly three native inputs without a containing array control; the second row remains unchanged; anonymous output retains published content until explicit reviewed publication. Local acceptance run `20261103T142907Z-55992` passed in 28.8s. A prior run stopped at a test locator selecting the hidden mobile copy; the corrected assertion addresses the visible desktop chapter. No owner content was edited by these synthetic checks.

An independent Chrome inspection focused existing homepage chapter text on desktop and a visible mobile sticky chapter at 320px. Both became a single inline textbox with no panel. The mobile document width was 320px, and toolbar horizontal bounds were approximately 20–308px. Rich text opened its native editor instead, with zero inline editors and zero hover outlines. The public launcher measured 44×44px, white on the accent fill, with an accessible name and no visible text label. No text was entered during this owner-page inspection.

Native RSC list-key diagnostics introduced by consumer JSX spread placement were corrected in the consumer. A fresh Next MCP read then reported no configuration or session runtime errors. Existing Sass build warnings are a separate consumer concern.

## Interface assessment

Nearest explicit targets distinguish text from row settings; no extra editing mode or persistence mechanism was added. Stable IDs preserve the target across reorder. Native field labels, access, conditions and validation remain authoritative. The outline moves as one box, highlighting remains optional, and panels pause hover feedback. Row settings preserve the one-native-Form ownership boundary.

Desktop and narrow row-panel captures were inspected. They contain only the selected row's fields, use the existing single dock/panel relationship, and keep the close/back controls reachable. Screenshot checkpoint utilities reset page scroll by design; capture preparation should restore the selected chapter as context. Native complex fields retain their Payload styling.

Not verified: hardware touch/IME behavior, screen-reader speech, arbitrary custom controls, arbitrary consumer themes, full browser matrix and production rollout. Codex browser transport was unavailable; the independent review used the task-scoped agent-browser Chrome session. The server was launched through normal HTTPS Portless, not an alternate localhost-only route.
