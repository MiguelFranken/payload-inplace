# COURSE-297 · Version details on page two

Chromium opened the oldest entry on page two for both a collection and a global with 21 or more saved versions. Each comparison showed the expected current and historical heading. Keyboard navigation returned to the same timeline page. A nonexistent ID sent to the real endpoint produced the unavailable-version alert and left the timeline on page two.

The collection ran at desktop width. The global ran at 320 CSS pixels with reduced motion. Both used Payload 3.94.0, a disposable PostgreSQL database and Next.js Turbopack.

`pnpm test:e2e tests/browser/version-detail.e2e.spec.ts` passed both tests. Workspace typecheck, the version endpoint security tests and the packed package boundary check also passed.
