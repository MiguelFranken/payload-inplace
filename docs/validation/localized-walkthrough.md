# Localized storefront walkthrough validation

The [walkthrough](../../apps/demo/README.md#edit-a-translation) runs against
the real Turbopack demo with disposable data. The
[Playwright scenario](../../tests/browser/roadmap.e2e.spec.ts) uses keyboard
navigation to switch languages at 320px with reduced motion. The German
caption starts empty, remains absent for an anonymous visitor after a draft
save, and appears after reviewed publication. The English caption, document ID,
and ordered row IDs survive the German update.
