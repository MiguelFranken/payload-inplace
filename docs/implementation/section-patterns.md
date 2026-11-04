# Optional independent section patterns

`options.patterns` is a server-only adapter with `allowedBlocks`, `authorize`, `list`, `read` and optional `save`. The plugin creates no collection or migration. When omitted/disabled there is no pattern endpoint, library tab, save control or library request. A read-only adapter omits `save`.

The consumer owns storage, tenant filtering and native record ACL. Every callback receives the freshly authorized `req`, exact target and current saved document; use Local API `overrideAccess:false`. The synthetic demonstration is `apps/demo/lib/pattern-fixture.ts`: owner-scoped native records, immutable copies and no production/customer data.

The section picker offers the library only after explicit opening. List/read requests are cancellable; no library prefetch runs at idle. Saving a pattern copies an eligible saved root section, identified by its stable row ID and current native revision. Pending document changes disable the save-copy control. The server rereads source content: a client cannot submit arbitrary content as a pattern.

Insertion reads and projects against the current target schema and field access. Hidden, read-only, virtual and unknown keys are omitted. Nested array/block rows receive fresh IDs. Obsolete nested blocks and exceeded row limits reject the copy. Relationship/upload values retain native IDs, so the asset is shared but its metadata is not cloned or edited. Payload rich-text data stays structured. Future pattern edits never change existing inserted sections.

The native form-state preparation builds defaults, conditions, custom components and validation for a temporary candidate. Only its prepared row is passed into the existing ADD_ROW command; the complete working copy is never replaced. A changed working copy or revoked/disabled scope cancels preparation. The ordinary policy, native draft queue, structural history, review and publication still apply. This first adapter contract saves root sections; nested content within a section is copied recursively. Library types must be valid for the configured root. Native dynamic filters are checked again at insertion.

Lazy native controls are isolated inside their own Suspense boundary, below the field owner. This is required because hiding/revealing Payload v3's Form replays its initialization effects in development and can reset an unsaved draft. The Form and sole save owner remain mounted while an individual field loads.
