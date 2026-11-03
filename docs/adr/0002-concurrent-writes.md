# Concurrent-write authority

The supported production adapter is explicit Postgres/Payload 3.91. Native update and restore start a Payload transaction before beforeOperation and read content afterwards. The plugin acquires a transaction-scoped per-document advisory lock there, compares the native Form's expected revision with the latest draft while holding the lock, then lets the native operation validate and persist. A server-assigned monotonic revision is included in the same content/version transaction. There is no separate content mutation endpoint and no raw SQL against content/version tables.

Revision is independent of base updatedAt and mutable autosave version IDs. Missing/stale expected revisions fail with 409, including ordinary CMS and bulk writes. System writers require an explicit server-side context and still serialize. Restore uses its native endpoint and a reviewed revision header; adapter-specific UI transport must be validated before claiming support. Mongo remains a single-writer development harness, with no claimed concurrent-write guarantee.

Runtime disable retains the revision schema/hooks. Consumers must create normal Payload migrations when enabling the adapter and retain schema on rollback. Do not deploy from UI-only acceptance.
