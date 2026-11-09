# Storefront example

This app shows how a Payload site can consume Inplace. Start with
[`payload.config.ts`](payload.config.ts) for editor configuration,
[`commerce/CommercePageView.tsx`](commerce/CommercePageView.tsx) for field bindings,
and [the editor route](<app/(protected)/visual-editor/page.tsx>) for the native form.

The workspace links the local build through the same `payload-inplace` package
exports that npm consumers use. From the repository root, run
`corepack pnpm build` and `corepack pnpm dev`, then open
[the storefront](http://127.0.0.1:3127/shop).

See [Contributing](../../CONTRIBUTING.md#run-the-demo) for the demo login and
[the test guide](../../tests/README.md) for repository validation.
