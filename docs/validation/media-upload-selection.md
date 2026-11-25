# Media selection during upload

Chromium ran the contextual media picker in the Turbopack demo using an
isolated MongoDB replica set. A test-only upload adapter allowed an upload
response to arrive after cancellation. The desktop success case and 320 px
failure case both used reduced motion and keyboard selection. The picker
cleared progress immediately. The chosen reference survived real Payload
autosave and a browser reload in both cases.

The component tests also cover disabled-field cancellation and a completed
upload selected through the normal upload and retry flow.

The emitted media module closure passed the existing feature budget.

```sh
VE_TEST_SCHEMA=1 corepack pnpm test:e2e tests/browser/roadmap.e2e.spec.ts --grep 'media selection survives|contextual native media'
corepack pnpm test:components packages/payload-inplace/tests/components/media-library.test.tsx
```
