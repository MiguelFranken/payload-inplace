# Background preset validation

The [Playwright scenario](../../tests/browser/roadmap.e2e.spec.ts) runs against
the real storefront at 320px with reduced motion. It checks the announced
Sage and Sand states via `aria-pressed`, uses Space to change presets, and
verifies that Payload saves the change. The native editor retains the working
value when editing is disabled after a failed save.
