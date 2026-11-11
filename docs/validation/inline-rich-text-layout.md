# Inline rich-text layout

The browser regression uses a long, justified German paragraph with bold spans,
based on the Workshops homepage. Before the fix, entering inline editing
changed `white-space` from `normal` to `pre-wrap`, changed `word-break` to
`break-word`, and moved the viewport eight pixels in Chromium. WebKit also applied
`line-break: after-white-space` on editable elements, changing the width and
position of bold text in a justified paragraph. A plain contenteditable
fixture reproduced the WebKit shift independently of Lexical.

At 1280 and 320 px, the test compares the original and editable paragraph and
bold span bounds, CSS wrapping rules and page scroll. It clicks into the first
paragraph of a field longer than the viewport, checks that the caret stays in
that paragraph, then closes with Escape and compares the same measurements.
Before and editing screenshots are attached to the test run.

```sh
corepack pnpm exec node scripts/postgres-test.mjs e2e tests/browser/acceptance.e2e.spec.ts --grep 'rich.text|selection geometry'
```
