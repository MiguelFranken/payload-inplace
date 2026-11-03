# Same-page editing with separate render entries

## Decision

Keep the real website URL and shared layout. An explicitly activated, short-lived signed page session selects a separately compiled active render entry through a host-owned internal rewrite. A shared authenticated `EditorPageTransition` runs a Next soft refresh and restores the viewport; it does not navigate to an editor page. Header, footer and layout providers retain their instances. Query parameters and fragments remain in the browser.

Public entries keep published cache functions and render an access-checked launcher. Active entries authenticate afresh, validate the signed exact-path/document context, then read shared Payload drafts outside those caches. Every native server function, preview refresh and media operation retains fresh authorization. Cookie presence is not authority: `hasPageEditorSession` is intentionally only a bounded routing hint. Invalid, stale or revoked contexts fall back to published rendering. No global Next Draft Mode cookie is required.

The native Form owns values, validation, autosave, structural history and publication. The website renderer owns model-to-DOM rendering. `InlineText` adopts the actual rendered text and sends only user input into the native field. It must never initialize textContent from an empty optional raw CMS value: that erased inherited headings on focus. Detached elements cannot commit on teardown. Existing IME, native undo and newer-input/old-save protection stay intact.

## Why separate entries

Importing the active editor/map into the public Server Component graph caused Next to expose native client modules and styles before activation, even behind conditional rendering. Importing `handleServerFunctions` through Payload's layouts barrel also hoisted admin RootLayout CSS onto the real website. Keeping an internal active entry and lazy native wrappers preserves the real website while retaining resource isolation.

`withVisualEditorNext` maps a private virtual module to the unchanged installed Payload server handler. Turbopack needs an app-relative alias, not an absolute filesystem path. This is a deliberately narrow, exact-peer compatibility bridge; it never replaces native field or persistence behavior. Public declarations do not expose the virtual module. Production builds and independent installed-package acceptance guard the supported runtime.

The deferred authenticated provider adds an inert client-reference registration to the public graph. The measured demo delta is 1,139 decoded JavaScript bytes. Checks allow only that exact module below 4KB, reject forbidden native modules/styles, and verify that anonymous and reader sessions never fetch the actual launcher/transition implementation. This is an explicit small cost, not a claim of zero additional public bytes.

## Interaction and validation

Activation waits until its shared client bridge hydrates; the disabled server fallback cannot issue an accidental native POST/303 hard reload. The native leave-without-saving component protects ordinary website navigation while a save or recoverable working copy remains pending. Selection intercepts only explicitly bound content; existing unbound website interactions remain intact, while website form submission is suppressed during editing.

The production Postgres browser suite covers fallback text, delayed acknowledgements, validation/retry, nested arrays, native fields, pointer/keyboard reordering and the same-page transition. The transition test verifies unpublished draft loading, original document/header/footer identity, URL/search/hash, scroll restoration, exit and cancelled navigation during a held save. The actual consumer additionally compares headline computed styles before and during editing and checks page/console errors.

The old dedicated route remains a compatibility path for hosts that omit `resolvePagePath`. Cross-origin frontends, globals and localized editing remain outside this candidate. Drafts are shared CMS drafts, not private editor branches.

## Reverse-proxy URL preservation

The host enables Next's supported `skipProxyUrlNormalize` flag and builds the rewrite destination from the original `request.url`, changing only the pathname. Matching still uses `request.nextUrl.pathname`. NextURL normalizes loopback IPs to `localhost`; behind TLS termination that changed authority was classified as an external rewrite and attempted TLS against a plain HTTP backend. Keeping the original authority avoids that extra request for arbitrary ports and IPv4/IPv6, while hosted origins stay untouched. The consumer validates this through real HTTPS Portless activation and saving, not only direct HTTP production tests.
