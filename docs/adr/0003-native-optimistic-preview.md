# Native form, immediate preview, acknowledged persistence

The editor is part of the website. A visible edit must not wait for an autosaved Payload version or a server-component refresh. Payload remains the only form, validation, permission and persistence authority.

Payload's [client preview](https://payloadcms.com/docs/live-preview/client) reacts to unsaved form changes; its [server preview](https://payloadcms.com/docs/live-preview/server) refreshes after saving. The frontend editor uses these same two timescales directly, without an iframe message transport.

## Interaction and ownership

- A bound plain text/textarea field adopts the existing page element with `contenteditable="plaintext-only"`. Its sole `useField` updates the native Form. The browser owns caret, IME and text undo. No native text input mounts for that path simultaneously. Custom/rich/linked markup retains its native editor behind the secondary options button.
- Native field panels project existing schema fields without changing values or bypassing conditions/access. The one contextual panel and any inline editor claim disjoint field paths. Arrays and blocks remain indivisible native controls. The active inline field is excluded from its secondary panel.
- Consumers may supply a `preview` client component to `FrontendEditor`. It calls `useEditorPreviewData(initialAuthorizedPopulatedDocument)` and renders presentational blocks using the same markup as the public server renderer. Its React portal lives in the actual page DOM while sharing the one native Form context.
- Preview data is derived, read-only display output. It is never persisted and has no reducer, save queue or separate stored page tree. Rows match by stable ID; removed rows and cleared media stay removed. Populated relationships survive only when their ID still matches. Native zero-count row controls normalize to empty arrays; genuine numeric fields stay numeric.
- Media population is an authenticated consumer read, separate from saving. The demo aborts obsolete reads and never displays an old asset for a new ID. Production consumers should use their existing authorized media loader/cache and show explicit unavailable/loading states.
- While inline text owns focus/composition, client rendering holds its previous props and server refreshes cannot replace that subtree. The DOM already shows every input. Blur releases the local projection immediately. The server-only fallback waits for an acknowledged revision before replacement. Persistence and other page timers keep running.
- Server data and business queries stay in server components; consumers pass those as React slots into their client presentational renderer. These slots refresh after a real save acknowledgement through the required read-only `refreshPreview` server function. The result is revision-monotonic and coalesced. An unavailable read leaves the Form mounted and offers preview retry without a second write; revoked access freezes editing and preserves the working-copy download. The save path never calls `router.refresh`. Arbitrary server-only transformations cannot be predicted locally and must not be presented as already confirmed.

Saved RSC slots may still suspend after their server action returns. Preview snapshot adoption and release of inline ownership therefore run inside React transitions. The last accepted tree changes only after a successful commit; a speculative suspended render must never write that tree into a shared ref. This keeps the website and native Form visible while streamed slots resolve and avoids repeated teardown/reconnection of native and Base UI controls. The regression fixture deliberately streams a delayed server fragment, verifies persisted block and text changes, and samples toolbar continuity on every animation frame.

## Saving and reconciliation

One idle trigger calls native `Form.submit` with the collection's configured autosave interval. Manual save and reviewed publication use that same Form. Typing/structural edits continue during background autosave and manual draft saves. Ctrl/Cmd+S submits in that same background mode, without moving focus or opening the browser save dialog. No extra write request is introduced for optimistic rendering.

A save response acknowledges its submitted snapshot. Payload 3.91's reducer resets other fields' `isModified` flags when one field updates; its default autosave acceptance therefore cannot protect every field changed during a request. `protectNativeAcknowledgement` omits incoming values when the current native value differs from the submitted snapshot, and rejects indexed field metadata if any ancestor row ID changed. Native submit accepts snapshot-checked server values: the adapter removes changed values and changed row order before the native merge, while retaining untouched server normalization and revision acknowledgements. The same row-identity guard also filters native form-state metadata responses. Revision acknowledgements continue through the native hidden revision field. Regression tests cover multiple newer fields and reordering.

The toolbar distinguishes unsaved changes, saving, acknowledged saved state and failed saves. A failure preserves native fields and optimistic content; automatic saving pauses. Users can download a token-free working copy and explicitly retry. Changed revisions and revoked sessions require reconciliation/reauthentication, never blind retries. Review/publish still requires a server-signed review of the saved revision.

React's [useOptimistic](https://react.dev/reference/react/useOptimistic) is appropriate for temporary Action state. Here a second per-keystroke optimistic store would duplicate the already optimistic native Form and complicate overlapping-save rollback. We derive display from the Form instead.

A consumer preview exception is caught inside the preview portal, preserving the native Form and recovery controls. The saved server renderer becomes a fallback. Payload 3.91 bundles a private Emotion cache with React Select, so an external CacheProvider cannot redirect it. A scoped, coalesced compatibility adapter copies only generated native class rules used in the shadow root; it disconnects on exit and authors no selectors. This pinned-peer compatibility boundary must be checked when upgrading Payload; plugin presentation remains prefixed Tailwind utilities, without handcrafted CSS.

## Consumer sketch

```tsx
// Activated server route only. Public routes keep their normal server renderer.
<FrontendEditor
  {...authorizedNativeProps}
  refreshPreview={refreshAuthorizedServerSlots}
  preview={
    <InstantPage
      initialDocument={authorizedPopulatedDocument}
      serverContent={serverOnlySlots}
    />
  }
>
  <ServerPage document={authorizedPopulatedDocument} />
</FrontendEditor>;

// Client presentational component on the protected editing route.
function InstantPage({ initialDocument, serverContent }) {
  const document = useEditorPreviewData(initialDocument);
  return <PageView document={document} active serverContent={serverContent} />;
}
```

Status: implemented; browser latency/failure, responsive/accessibility and production-isolation evidence must be recorded in `docs/validation` before release readiness is asserted.
