# Editor writing direction

Chromium opened and closed Sections using the keyboard at 1280 px and 320 px,
with reduced motion enabled. The panel fit each viewport. It computed
left-to-right direction for English, German and `ar-Latn`, and right-to-left
direction for Arabic, `az-Arab` and Pashto. The host document's direction
stayed the same throughout.

Formatter tests cover the same script distinctions, invalid locale fallback
and explicit direction overrides.

```sh
VE_TEST_SCHEMA=1 corepack pnpm test:e2e tests/browser/roadmap.e2e.spec.ts --grep 'editor chrome follows the locale writing direction'
```
