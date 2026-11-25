# Storefront example validation

Playwright runs against the real Turbopack demo, a fresh database and synthetic
Payload accounts. The [commerce browser suite](../../tests/browser/commerce.e2e.spec.ts)
covers the anonymous storefront and product page at desktop and 320px, with
axe checks at both widths.

- COURSE-283 types the public and optimistic commerce renderer from the same
  Payload schema. Workspace typecheck checks both paths and rejects a
  misspelled pricing field.
- COURSE-278 checks EUR and USD cents after native draft save and reviewed
  publication. Anonymous product pages and fallback card prices agree, and
  explicit captions remain visible.
- COURSE-279 checks repeated, reordered and absent sections in the editor and
  on the public site. Enter follows header and collection links and focuses
  the destination at desktop and 320px with reduced motion.
- COURSE-281 covers populated, ID-only and cleared relationships. A deleted
  product leaves an explanatory public message at both widths. Enter in the
  editor opens the native relationship control.
- COURSE-282 switches a seeded card to the second product, reloads the draft,
  publishes it and follows the updated link as a visitor.
  The [seed recovery test](../../tests/integration/demo-seed.spec.ts) interrupts
  setup after both products are created, then checks that retry reuses their IDs
  and links both cards without erasing existing edits or translations.
