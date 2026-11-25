# Saved pattern picker

Chromium tested the section picker at 1280 px and 320 px with reduced motion.
The demo used Turbopack and an isolated MongoDB replica set. Test responses
returned a first-page failure, then a second-page failure once the first page
had loaded. The editor exposed a keyboard-activatable Retry button for each
failure, retained earlier rows, deduplicated overlapping pages and requested
pages in the order 1, 1, 2, 2, 3. Escape closed the picker.

The cancellation cases deferred a pattern list and a selected pattern read.
Switching modes immediately enabled ordinary sections and cleared the pattern
query. Releasing the delayed responses left the picker open and the draft
unchanged. Choosing Questions by keyboard then saved one ordinary section.
Reopening the picker returned to Sections.

```sh
VE_TEST_SCHEMA=1 corepack pnpm test:e2e tests/browser/pattern-picker.e2e.spec.ts
```
