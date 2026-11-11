# On-page block actions

The Chromium acceptance tests use the Still & Form demo with an isolated
PostgreSQL database. They verify adjacent moves, the fixed-first constraint,
the exact position picker at 320 px, Escape and keyboard focus restoration,
native draft order, structural undo and keeping the moved block in view when
a tall sibling would push it off screen. The contextual action test verifies
the server-resolved row path and rejects requests without an identity or with a
mismatched root, block type or ancestor.

The focused Vitest tests cover nested containers, read-only fields and repeated
row IDs in different ancestors. The documentation capture runs at 2× density
and uses the same real browser controls.

```sh
corepack pnpm test:unit
corepack pnpm exec node scripts/postgres-test.mjs e2e tests/browser/block-actions.e2e.spec.ts
corepack pnpm docs:media
```
