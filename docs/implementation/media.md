# Contextual media libraries

A consumer import-map provider registers `EditorFieldStrategy` with `defineMediaFieldStrategy(library)`. The same native field bridge applies ACL, conditions, read-only and custom Field precedence. Explicit `edit: 'panel'` still requests native controls. The picker handles one upload/relationship reference; has-many fields remain native. Polymorphic references retain `{ relationTo, value }`. URLs cannot be used as IDs.

`createPayloadMediaLibrary({ collection: 'media', apiPath: '/api' })` searches the host's native same-origin collection under the logged-in user's native access. It delegates uploads and shared metadata to the native editor. Custom adapters may supply cancellable paginated search and upload/progress. Returning an asset selects only its ID; it never rewrites the media document, alt text or captions. Document-specific alt/caption overrides remain separate consumer fields.

Search is debounced and abortable; late results are discarded, pagination retains prior choices and duplicates are coalesced by collection/ID. Failures offer retry/native fallback. Closing or losing edit access aborts upload work. Arbitrary external thumbnail URLs are limited to HTTPS; they are presentation, never write authorization. Server native validation remains authoritative for every relationship.

The library UI is lazy and loaded only when the strategy owns a selected field. Disabled registration adds no collection, migration or request. The demo registers a media collection search without introducing a second persistence endpoint.
