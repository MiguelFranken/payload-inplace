# Authorization, public routes and caching

Bindings identify where content came from. They never grant write access. The plugin adds a host capability check to native Payload document/field ACLs, conditions, validation and hooks.

## Keep these boundaries explicit

- Configure finite collection/root pairs, optional draft globals and optional page scopes on the server.
- Authenticate the current user and reauthorize signed exact-page/document/locale context on every protected render and native server action.
- Pass the server-created Payload request separately to the native bridge. Never accept a client-supplied request, `overrideAccess`, role or trusted origin.
- Use `overrideAccess: false` with the current request/user for user-driven Local API work. A valid signature alone does not establish current capability.
- Keep `previewOrigin` and owned aliases server-configured, exact and finite. No wildcard/request-derived origin trust.
- Treat shared drafts, version reads, media searches and custom actions as protected operations. A draft-mode cookie or proxy routing hint is not authorization.

## Separate published and activated rendering

The public route reads published content. Keep `FrontendEditor`, native field maps, Lexical and editor CSS out of that route's import graph. A freshly authorized editor can receive the small deferred launcher/transition; anonymous/read-only visitors must not load the active form or issue authoring requests. The demo bounds an inert framework client reference; it does not claim zero public bytes.

Activated HTML/RSC and draft reads are private/no-store and outside shared published cache functions. Keep the real page URL via an internal rewrite, but freshly check the signed scope at its destination. Preserve original authority behind TLS/Portless by following the [same-page integration contract](../integration.md#stay-on-the-actual-website).

## Verify your deployment

Use anonymous, reader and editor sessions. Warm public → active → public in both directions; inspect HTML/RSC, prefetch responses, browser resource requests, CDN headers and any service worker. A local production build cannot establish your CDN's cookie/cache behavior. Test both generated deployment hostnames and configured aliases without weakening access controls.

Postgres revision fields/hooks remain installed when the UI is disabled. Rollback must retain migration history and content. Globals require the transactional adapter. Mongo's demo support does not establish atomic multi-writer safety. [Compatibility](../compatibility.md) · [Release/rollback](../release.md) · [Report a vulnerability](../../SECURITY.md).
