# Supported runtime contract

Payload and Next remain version-pinned. React is limited to the 19.2 patch line, covering the independent consumer and Workshops host versions; other runtime combinations remain unverified.

| Surface                         | Verified scope                                                                                                                           | Boundary                                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Payload / UI / Lexical adapter / Postgres | 3.91.0                                                                                                                                   | All packages must match exactly                                                                     |
| Same-page native handler bridge | Exact Payload Next 3.91.0 internal handler, app-relative Turbopack alias                                                                 | Requires `/next` configuration and `/native` import; other bundlers/peer versions unverified        |
| Next / React / React DOM        | 16.4.2 / React 19.2 patch line (`~19.2.4`), tested with 19.2.6 in the independent consumer and 19.2.4 in Workshops, production Turbopack | Other versions and bundlers are unverified                                                          |
| Node / pnpm                     | Node 24 CI, Node 26 local; pnpm 10.28.0                                                                                                  | Node 24 is the release runtime                                                                      |
| Database                        | Postgres 17.11, real transactional competing writers                                                                                     | Mongo is a development/demo single-writer fallback; no atomic concurrency guarantee                 |
| Documents                       | Collections and explicitly configured draft globals; nested groups/tabs/arrays and blockReferences                                       | Finite authorized page scopes and native locales; no cross-origin frontend                          |
| Native fields                   | Text, selects, upload/media drawers, arrays, Lexical and custom native components                                                        | Compatible Lexical terminals edit inline; custom/upload islands retain JSON and use native settings |
| Browser                         | Chromium desktop and 320px reflow, keyboard, reduced motion                                                                              | Firefox/WebKit, hardware touch and full assistive-technology speech are unverified                  |
| Theme / language                | Native light/dark controls; typed English/German UI messages, native content locale, one RTL fixture                                     | Consumer token overrides need their own contrast review                                             |
| Deployment                      | Same-origin local production builds, private/no-store editor responses, published public caches                                          | No production CDN/service-worker guarantee is claimed without deployment-specific checks            |

The published 0.0.x line includes the roadmap features. The [current delivery receipt](validation/workshops-release.json) identifies the exact released archive and the consumer checks performed. A package release does not imply deployment in your own application. The exact installed-consumer and Workshops package hashes live in `docs/validation`; historical reports retain their original candidate identifiers. Source-demo success is not a substitute for installed package acceptance.

The plugin uses the consumer’s matching `@payloadcms/richtext-lexical` peer
and its public Lexical re-exports. The inline editor mounts Lexical directly and
retains one pinned dependency on `@lexical/history` for `registerHistory`, which
Payload 3.91.0 does not re-export. The installed-consumer check verifies that
history resolves the same Lexical runtime as Payload and exercises undo and redo.

## Public resources and permissions are different guarantees

The public route graph and actual script/style/API requests must exclude native editor clients until activation. Static asset URLs are public and are not secrets. A server-rendered minimized launcher and lazy same-page transition are allowed only after a fresh CMS-editor capability check; neither loads the native form. Next registers an inert deferred-client reference in the public graph (about 1KB decoded in the demo, enforced below 4KB); anonymous/reader requests never download its lazy launcher/transition implementation. Anonymous/customer visits do not initialize Payload merely to discover editor eligibility.

The active route independently checks the current user, native document permissions and the signed document-scoped activation on every protected operation. Draft Mode and cookies alone grant no access. Draft data never enters shared public cache functions. Disabling the UI preserves revision columns and native write guards.

## Measurement method

CI uses a production build, an active-route graph positive control, an injected forbidden-module negative control and browser resources for anonymous, reader and inactive author identities. The independent legacy installed app compares enabled/disabled public resource sets byte for byte. The same-page demo separately bounds its inert deferred-client reference and proves no native field/style or authoring requests before activation. Timing samples are local diagnostic evidence, not a universal latency claim. The active 75-block typing probe records frame latency against a 100ms p95 budget. Geometry work is frame-coalesced; drag only commits the native mutation on drop. History is bounded and scoped to structural operations.

## Early compatibility failure

`withVisualEditorNext` resolves the public entries of Payload, UI, Payload Next and Next, reads the owning package identity, and rejects versions outside the exact supported native pins before private-handler aliasing. `server/runtime-compatibility.ts` owns this assertion; `exports/next.ts` owns resolution and the Turbopack bridge. Contract tests include each wrong-version combination and the supported control. This intentionally fails early instead of allowing a mismatched schema cache to surface later as an undefined `clientField` error. React remains constrained by the declared 19.2 peer patch range.
