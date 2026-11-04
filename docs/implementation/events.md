# Consumer lifecycle observers

Register an active-only import-map component under `providers` and call `useEditorObserver` from `payload-inplace/frontend`:

```tsx
"use client";
import { useEditorObserver } from "payload-inplace/frontend";
export function EditorTelemetry() {
  useEditorObserver((event) => {
    // Choose your own transport. Do not append form values, credentials or raw errors.
    if (event.type === "operation-settled") {
      console.info(event.operation, event.outcome, event.durationMs);
    }
  });
  return null;
}
```

The discriminated union covers activation and start/settled metadata for native save, restore, publication, review and server preview operations. Each operation has an opaque UUID and settles at most once. A saved preview carries the successful save's parent operation ID. Explicit retry creates another operation; failed attempts are never reported as acknowledged successes. Outcomes distinguish success, failure, conflict and cancellation; failure categories exclude raw exception messages.

Scope contains only the collection/global reference and content locale. Events exclude document values, request/response bodies, revisions, session/activation proofs and review tokens. The implementation constructs this projection explicitly. Consumer errors and rejected promises are isolated. Callbacks should remain lightweight; the plugin neither ships a telemetry transport nor grants observers mutation authority. An observer can translate categorized outcomes to a Sentry breadcrumb without sending the editor's content or raw request data.

Providers mount only in an authorized active native Form. Public/inactive visitors initialize no observer, event channel or telemetry request. Unmount removes listeners. Shared admin review controls emit only when an active frontend channel exists. The UI message language and content locale are separate concerns.

Native browser acceptance exercises a synthetic rejected save, explicit retry, successful saved-preview correlation and review while the consumer observer deliberately rejects every callback. The working copy still saves and the event payload contains no copy or transport token. Pure tests cover one-time settlement, denied extra keys, subscription cleanup and synchronous/asynchronous observer failures. These events are observability contracts, not proof of database concurrency; real Postgres integration retains that responsibility.
