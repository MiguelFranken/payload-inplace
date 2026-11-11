# Inline section comparison

The Still & Form demo fixture contains an edited heading and link, one added section,
one removed section, and two reordered sections. Production Chromium checks
open comparison with the keyboard, step through changes, switch to Published,
and close with Escape. The test checks focus restoration, the original route and
saved draft, zero document writes, and denial of the same read without the
activated account session.

The test switches to **Elements** with the keyboard and verifies the selected
outline matches the heading's measured box on Draft at desktop width and
Published at 320px with reduced motion. Switching back to **Sections** restores
navigation for reordered and removed sections. Screenshots of both modes at
both widths are available as browser test artifacts.

```sh
corepack pnpm exec node scripts/postgres-test.mjs e2e tests/browser/acceptance.e2e.spec.ts --grep 'inline section comparison'
```
