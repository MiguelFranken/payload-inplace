# Typed values in draft review

The Still & Form product regression edits the price and an availability
checkbox through the native field panels. Chromium verifies that the review
highlights the entire values `640` and `690`, and the complete labels `Yes`
and `No`. At 320px with reduced motion, the before and after values stack,
the diff fits the viewport, and Escape closes the review.

Unit coverage checks scalar values, string-backed dates and choices,
relationships and uploads, coordinates, and JSON. It also verifies that
plain-text edits retain shared context and a formatting-only rich-text
change still has an explanation.

```sh
VE_PORT=3176 node scripts/postgres-test.mjs e2e tests/browser/commerce.e2e.spec.ts --grep 'commerce compound price'
```
