# Test and extend an integration

Use the public package entrypoints. The clean external fixture under `fixtures/installed-consumer` installs only the packed archive, typechecks the examples, tests the custom control, builds the real Next/Payload v3 app and runs native browser acceptance. It has no source aliases or links to private workspace packages.

## Isolate a custom control

Import `FieldStrategyHarness` from `payload-inplace/testing` in a test. Pass the same `FieldStrategyDefinition` used by your active registration component, the native field contract and an initial value. Assert visible value changes, disabled/error presentation and native handoff. `components/PriceControls.tsx` and `strategy.unit.test.tsx` are runnable examples. The harness intentionally does not suppress invalid control callbacks: a control that ignores disabled must fail your assertion.

This is a control unit test, not a fake Payload server. It does not prove access, conditions, validation, schema preparation, concurrent writes or saves. Test those against the real native Form. The external fixture registers that same control through the import map, edits its real `readingTime` number field and hands back to the native number input before reviewed publication. The separate reader/access tests remain mandatory.

`inspectNativeField(useForm(), path)` can read a mounted native harness's field value, condition, row IDs, form-disabled state and current revision. It never writes or prepares fields. It includes test values: do not use it for production telemetry. `createEditorFixture` supplies fresh synthetic schema/data, stable row IDs containing reserved characters, a group and an empty list. `createDeferredResponse(signal)` lets tests deliberately resolve/reject/abort requests in any order without a second persistence implementation.

The testing entrypoint is optional and forbidden in production package source/application graphs. Keep it in test files. It requires no test framework at runtime; consumers choose Vitest or another runner.

## Annotate nested content

Use the inert `payload-inplace/bindings` helpers in the host's renderer. `examples/nested-bindings.tsx` typechecks named groups, terminal fields, stable nested rows, a list that remains addressable when empty and explicit native rich-text fallback. Keep leaf text markup faithful to its source; CSS casing is presentation. Explicit terminal placement decides where editors click. Attributes never authorize writes.

## Own fields, not copies

Register contextual controls with `EditorFieldStrategy` under the activated Form. Receive one native `useField` value and setter; do not add a document store, independent autosave or REST update in the control. Use `NativeFieldSlot` for configured panels and let it manage mutually exclusive ownership. Call `openNative` for advanced options or unsupported rich text. Custom/native field overrides, conditions and ACL retain precedence.

The optional [media adapter](implementation/media.md) searches/uploads through the consumer's authorized media API. Return native reference IDs; replacing a reference must not edit shared asset metadata. Abort late requests on close/revocation and show explicit retry. Never hide a failed upload behind an automatic retry loop.

## Keep saves and languages scoped

Typing updates native fields immediately, then the one native queue saves after an idle pause. Recovery retains the working copy and requires an explicit retry; a stale acknowledgement never owns newer typing. Only signed saved revisions may publish. [Content locale](implementation/localization.md) and UI language are independent; `examples/ui-messages.ts` verifies typed override/parameter contracts. Shared array structure can affect all locales even when individual leaves are translated.

Globals and related records use [finite document scopes](implementation/document-scopes.md), each with independent access, revision, history and review. [Patterns](implementation/section-patterns.md) are independent copies through optional consumer-owned storage. Neither feature implies shared publication or live synchronization.

## Upgrade and verify

Use the exact supported v3 peer matrix in the [compatibility guide](compatibility.md). Regenerate the host import map after adding a provider. Re-run unit control tests, native permissions/conditions/validation, real browser editing/save/review and the public graph check. A mocked adapter is never concurrency evidence. Keep published/anonymous routes free of active Form, Lexical, media, test-kit and server imports.

See the generated [public API reference](api-reference.md) for the current facade exports and source contracts. CI checks its freshness; the task-oriented recipes explain ownership and failure behavior beyond symbol lists.
