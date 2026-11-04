# Native globals and page scopes

Enable draft globals explicitly with `globals: { siteHeader: { roots: ['layout'] } }`. Globals require a transactional concurrency adapter. They use Payload's native POST update, draft/version tables, field access, validation and advisory `globalSlug` locks. No extra content collection or storage backend is installed. Collection targets remain backwards compatible; global targets are `{ kind: 'global', global: 'siteHeader', root: 'layout' }`.

For a website with multiple editable records, `pageScopes(context)` returns a finite catalogue of `{target, label}` entries for the original page owner. Resolve these from trusted server data. Each entry is independently reauthorized; annotations and relationships never grant access. `readPageEditorDocuments` supplies authorized server snapshots for the host renderer outside published caches. The host still owns its header, footer, routing and live rendering.

Exactly one document has a native Form at a time. Switching blurs the active field, drains its existing native queue, disables its controls, checks its current revision on the server and performs a soft page refresh. A failed switch retains the working copy. Draft versions, history, validation and reviewed publication stay document-scoped. The review identifies which document is being published; there is no atomic multi-document publish or cross-document undo.

Use explicit document provenance on bound elements when several records appear on the page. Duplicate row IDs in different documents cannot share a canvas target. Clicking a permitted foreign target selects its document; a subsequent click edits the field. The More tools menu also exposes the permitted document labels.

Activation cookies are bounded to one per exact page/document/root/locale and session. Switching back reuses the nonce; leaving editing clears that page's proofs. A scope's old proof remains valid in another tab until expiry, subject to current authorization and revision checks.

Payload v3's raw global version restore bypasses before-change hooks. Enabled globals therefore reject that raw restore operation. The guarded native version view explains this and links to the editor timeline, which restores through a new native draft update with the same revision guard. Existing global hooks and configured publish controls are preserved; a custom publish control must obey the review contract.

Local evidence: 202 unit/component assertions, 11 Postgres integration cases, TypeScript and both lint gates pass. The real browser page/product/global sequence passes, including dirty switching, global acknowledgement normalization, separate publication, repeated scope selection and a 320px menu. Final production and installed-archive validation remain part of the roadmap acceptance.
