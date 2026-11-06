# Saved versions on the website

The history tool now opens a lazy, paginated saved-version browser. Every request carries the existing private activation proof in a POST body, checks the configured origin, reauthorizes the exact document and calls Payload's native `findVersions` with `overrideAccess: false`. Timeline pages contain metadata only. Content is returned only for a selected version belonging to that document.

The comparison reuses the native-schema-labelled changed-only review. Stable row paths encode reserved ID characters consistently with bindings. Show-on-page resolves a changed path against current row identities; deleted/off-page content receives an explanation rather than selecting a different row.

Restoring submits an `_veRestoreVersion` intent through the existing native Form queue. The server re-reads that version with current access, checks its parent and the current revision, and constructs a native draft update. The client comparison snapshot is never accepted as restored content. Old timestamps, publication state, revision and review/activation metadata are excluded; the current revision/activation and draft status are retained. The normal transactional revision guard still runs after preparation and assigns the next revision. Native field access, validation, hooks and acknowledgements remain in charge.

Restore requires a concurrency adapter and no pending local changes. The native Form processes exactly one update. Success clears structural history and selection, keeps the website URL/chrome mounted and leaves publication to a fresh review. Failed/ambiguous writes never automatically retry. The current working copy remains in the Form and the existing conflict monitor prevents stale follow-up saves.

For executed package/native/browser coverage, see the [current validation receipt](../validation/workshops-release.json) and [validation method](../validation.md).
