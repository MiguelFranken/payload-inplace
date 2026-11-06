> Historical milestone snapshot. Version, test counts, pending gates and release holds below describe that dated run. See the [current release/consumer receipt](workshops-release.json) and the [documentation index](../README.md) for current status and setup.

# Ecommerce demo and unscoped package migration — 4 November 2026

## Scope

The public package and repository move to `payload-inplace`. Runtime exports keep their names; component-map references and installed-consumer/release gates use the new package identity. Existing CMS revision fields, cookies, attributes and preview protocol remain compatible.

The isolated demo adds native `shops` and `products` collections. The product blocks root is `presentation.layout`, inside a named native tab. Fields include price groups, a related-product collection, conditional finish availability, two-level finish/care arrays, stable specification rows, media and an admin-only cost field. A Tailwind 4 storefront renderer is shared by public RSC and the protected optimistic entry. Its generated photography is uploaded through Payload and served through native WebP derivatives.

## Reproduced correction

Closing a native array-item panel left its target selected. A new pick of that same target did not rerun the open-state effect because only the element/field paths were dependencies. The effect now consumes the fresh selection intent. The regression closes and reopens the same finish panel after editing and saving its conditional fields.

The complete demo now backs promotional cards, product-card presentation, link label/target groups, background choices, delivery notes and supporting labels with native fields. A read-only compatibility hook fills newly introduced fixture content without resetting the running demo database or overwriting existing drafts. Foreign product documents remain independently owned.

A second regression reproduces Payload v3's `hidden in undefined` runtime error: after a partial HMR cache reset, the server map includes new fields while the cached client map does not. The plugin now uses Payload's own three native invalidation flags once per native schema identity, at initial Form and native server-function boundaries. Repeated requests retain the native caches. The real Next test reproduces the error and confirms successful rendering after synchronization; its route is disabled outside the isolated e2e wrapper and requires an admin session.

## Local validation

- Typecheck, lint and build passed; 104 unit tests passed, including actual commerce-schema resolution through two stable array IDs and a group, reorder/deletion behavior, read-only SKU permissions and foreign-relationship traversal rejection.
- The complete isolated Postgres production browser suite passed **42/42**, including the existing editor regressions plus ecommerce desktop/320px accessibility, one-save typing bursts, in-place activation without header remount, nested inline specification/care edits, reviewed publication, scoped native price/finish fields, conditional lead times and repeated panel opening.
- The expanded five-case commerce production suite passed, including promo hover bounds, native background/link settings, inline card copy without related-product writes, and the exact native schema-cache crash/recovery. The full pre-cache-change suite passed 42 existing cases; final combined CI validation follows.
- Native transaction integration passed on Postgres, including shared-draft/public separation, private-field access, retained row IDs and stale revision rejection for the complex product schema.
- Native `/admin/login` uses `autoLogin.prefillOnly: true` for the public synthetic credentials. Visually verified in the Codex browser; login remains manual. This exists only in the unpublished demo config, never the package runtime or Workshops.

## Interface review

Scope: ecommerce homepage/product and the existing editor panel over that frontend. Source conventions: plugin AGENTS, Tailwind-only demo styling, native Payload fields, local `better-*` skills.

| Domain        | Evidence inspected                                                                                                                                           | Result                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Accessibility | Desktop/320px public Axe audits; visible links, heading outline, visible question/answer fields and skip link; existing editor keyboard/reduced-motion suite | No new automated violations; real screen-reader speech unverified                            |
| Layout        | Codex desktop render; complete 320px browser flow; overflow assertions                                                                                       | Corrected content-box width/padding overflow; no remaining clipping in tested widths         |
| Writing       | Storefront, availability, demo scope, settings and actual link destinations                                                                                  | Removed misleading availability checkmarks for made-to-order finishes; no simulated checkout |
| Typography    | System serif display and sans copy, proportional type, tabular prices, actual wrapping                                                                       | Legible at tested widths; no external font dependency                                        |
| Colors        | Warm canvas/ink/muted roles and forest action; browser contrast audit                                                                                        | Public contrast audits passed                                                                |
| UI polish     | Restrained product surfaces, image geometry and native field panel; icon/status controls                                                                     | Kept the consumer's appearance separate from editor chrome                                   |

No new high-severity interface findings remain within this inspected flow. RTL, real-device touch, screen-reader speech and browser engines other than the pinned Chromium are not verified.

Canonical main CI, the independent installed consumer, exact-archive Workshops acceptance and registry/deployment receipts are recorded separately before release.
