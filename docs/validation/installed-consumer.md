# Installed-artifact acceptance

The separate `fixtures/installed-consumer` app is copied to an empty temporary directory. It installs the checked tarball and public npm peers, generates its own Payload import map, and runs production Turbopack builds against a disposable Postgres database. It imports no plugin source aliases and uses its own `stories.article.sections` schema, callout/quotation blocks, renderer and `/compose` editing route.

## Recorded candidate

- Version: `0.1.0-alpha.0`; source `ea20dcbbea9e89f86ad3cfb984aba14b9f0e96a4`.
- Archive SHA256: `8b8bf62c41fc2a030c2f3e6b753bba85082e08fcdfc563f27bd9d1cb65fecb99`.
- App template SHA256: `719c900d2f0d773163d9271da6c42d43871616616537c8a407c60a516eefb2f0`.
- Resolved dependency lock SHA256: `e1006f6283dc6cfe822753b751899180f5717e5c69f9cd8a393d9212eac5a585`.
- Detailed sanitized result: [2026-11-03-installed-consumer.json](2026-11-03-installed-consumer.json).

## Observed behavior

Four installed-mode browser cases pass: anonymous/reader/author public isolation, and the complete authorized nested-root draft/review/publish flow. Three disabled-mode public cases pass; the authoring case is intentionally skipped with authoring disabled. Installed/disabled public script and stylesheet resource sets match for every identity, and both public client graphs contain zero editor client modules.

The active case verifies real native select and Lexical editing, the native media field mount, preservation of unrelated data and the second block, immediate inline editing, private/no-store protected output, public content remaining unchanged before publication, and the updated published content afterwards. The 320px review checks content-based section names, active toolbar state and the page grip staying outside the bound headline. This does not claim an actual asset upload in this second app; the source demo separately exercises that interaction.

The first installed iteration revealed generic row-name assumptions and drag chips covering tightly padded text. Those fixes returned to plugin source with eight focused unit regressions, followed by a new immutable tarball and a fresh clean-app run. The fixture's API clients send an explicit same-origin header for private reads, preserving native Payload CSRF enforcement.

## Tested compatibility

| Payload / UI / Postgres adapter | Next | React / DOM | Database | Runtime | Evidence |
| --- | --- | --- | --- | --- | --- |
| 3.91.0 | 16.4.2, Turbopack production | 19.2.6 | postgres (PostgreSQL) 17.11 | v26.0.0 | Local source demo and separate installed app |

Peer ranges remain exact. Node 24 remote CI passed the earlier source milestone and now includes this installed-app gate; latest-head status must be verified separately. Mongo remains a documented single-writer development option, without Postgres concurrency guarantees. Globals, cross-origin frontends, localization and Lexical-embedded block authoring are unsupported.

## Remaining project gates

Actual Workshops integration and its three representative passes are not established by this fixture. The exact archive is prepared in a separate Work checkout; required 1Password environment generation timed out, so no application runtime or database mutation was attempted there. Matching-artifact Workshops acceptance, broader compatibility, release workflow/registry setup and production rollout remain distinct gates.
