# Native conflict recovery and lock awareness

Each document keeps one native Payload Form and save queue. Its last acknowledged native document is the comparison base. A stale write is rejected by the existing transaction-backed revision guard; the working Form is retained and disabled until the editor chooses recovery.

The lazy comparison panel fetches the current draft through an origin/proof-bound read-only endpoint. It rechecks visual capability and native read/update access. The endpoint accepts no alternate document target and sends no lock-owner profile. Comparison snapshots are frozen until dismissed; they never become a second persistence store. Cancellation writes nothing.

The native schema diff defines atomicity: rich text, JSON and relationships remain atomic; native row identity resolves nested leaves after moves. Disjoint authored patches can be combined. Same-field edits require an explicit choice. A structural overlap is an explicit whole-list choice with its content, never a guessed index merge. Invalid native row IDs fail closed. Unknown JSON is not reinterpreted as a native list merely because it has IDs.

Acceptance calls native `getFormState` to reauthorize/rebuild field metadata, retains the current activation proof, uses latest server revision/security metadata and rehydrates the sole Form. The existing idle/native queue saves once. A further intervening write still fails the transaction guard and requires another comparison. No reconciliation endpoint writes or publishes content. The comparison uses native field labels; escaped stable paths remain internal selection keys. Download/reload stays available when a schema or access change cannot be reconciled safely.

## Native advisory locks

Payload v3 stores user-based locks in `payload-locked-documents`. The adapter respects the collection's native locking switch/duration and uses current-user Local API calls with `overrideAccess: false`. A separate transaction-scoped presence lock serializes our lease operations. Native content revision locking remains independent and mandatory for concurrent content writes.

An active document acquires or renews only an available/current-user lease. It never takes over a live foreign lock. Foreign locks pause content selection/native Form writes and show a compact check-again notice without exposing a name or email. The standard Payload REST update handler already checks native locks (`overrideLock` defaults to false); no new override is introduced.

Heartbeats are bounded to at most one per second and normally one per 30 seconds, derived from native duration. Hidden/unmounted scopes abort pending checks and best-effort release their exact last lock ID/timestamp under the same user and document. A newer heartbeat cannot be deleted by an older cleanup. Failed cleanup expires according to native duration. There is no retry loop on unavailable presence, no public/inactive heartbeat and no new collection or migration.

Native locks are advisory and user-based. Two windows belonging to one account do not become independent exclusive owners; revision transactions still decide stale saves. The Postgres concurrency adapter is required for our serialized presence mutation. Unsupported adapters report presence unavailable; they do not claim equivalent atomic ownership. Native admin clients may use their own lock lifecycle; this adapter does not replace it or expose a takeover action.

## Local evidence

These are the roadmap implementation baseline results, not the current suite count; see [current validation](../validation.md).

Pure/component contracts cover disjoint/same-field changes, reordered/deleted/duplicate IDs, atomic JSON, named groups/tabs, explicit choices, changed input and cancellation. A real native two-writer test rejects the stale save, cancels/reopens comparison, combines separate changes and preserves the other writer's title with exactly the next draft revision. It also checks 320px overflow.

Eight Postgres tests pass, including two users, heartbeat, expiry and exact-stamp cleanup. A real two-user browser test verifies pause, narrow feedback, exit cleanup and immediate resumed selection (5.9s). Visibility and late-abort component tests prove bounded scheduling and cleanup. Mongo remains an explicitly unsupported atomic-presence fallback; the Postgres-specific acceptance is not claimed for it.
