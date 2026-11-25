# Saved pattern picker

Chromium tested the section picker at 1280 px and 320 px with reduced motion.
The demo used Turbopack and an isolated MongoDB replica set. Test responses
returned a first-page failure, then a second-page failure once the first page
had loaded. The editor exposed a keyboard-activatable Retry button for each
failure, retained earlier rows, deduplicated overlapping pages and requested
pages in the order 1, 1, 2, 2, 3. Escape closed the picker.

```sh
VE_TEST_SCHEMA=1 corepack pnpm test:e2e tests/browser/pattern-picker.e2e.spec.ts
```
