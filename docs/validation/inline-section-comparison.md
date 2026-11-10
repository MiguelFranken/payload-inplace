# Inline section comparison

The Still & Form demo fixture contains one edited heading, one added section,
one removed section, and two reordered sections. Production Chromium checks
open comparison with the keyboard, step through changes, switch to Published,
and close with Escape. The test checks focus restoration, the original route and
saved draft, zero document writes, and denial of the same read without the
activated account session.

The test captures `compare-draft-desktop.png` at 1280px and
`compare-published-mobile.png` at 320px with reduced motion. The second visual
pass verified that the dock sits above the markers and that the navigation
status and version hint wrap as separate lines. The narrow layout fits within
the viewport. Screenshots are available as browser test artifacts.

```sh
VE_PRODUCTION=1 corepack pnpm test:e2e tests/browser/acceptance.e2e.spec.ts --grep 'inline section comparison'
```
