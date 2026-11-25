# Consumer media upload validation

The [media walkthrough](../guides/media.md#try-a-consumer-owned-upload) uses
the real Turbopack demo with `VE_DEMO_MEDIA_UPLOAD=1`. The
[Playwright scenario](../../tests/browser/roadmap.e2e.spec.ts) verifies that a
demo admin uploads successfully at desktop width. The same flow at 320px
receives a Payload create-permission denial for the editor role and recovers
using a native selection. Each successful selection changes only the hero's
draft media reference.
