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

## Edit a translation

Sign in as a demo editor and open the same studio visit in
[English](http://127.0.0.1:3127/translations/en/studio-visit) and
[German](http://127.0.0.1:3127/translations/de/studio-visit). The German caption
starts empty. Both languages share the same two rows in the same order, with
their own labels.

1. Open **Edit page** on the German page. Select **Add a caption** and enter
   **Samstags beginnen die Führungen um zehn Uhr.**
2. Wait for **Draft saved**, then reload the public German URL in a private
   window. The caption is still absent.
3. In the editor, choose **Review changes**, then **Publish reviewed draft**.
   Reload the German public page to see the caption. Switch to English to see
   the original caption and shared row order.

Copy the localized collection in [payload.config.ts](payload.config.ts), the
[locale route](<app/(public)/translations/[locale]/[slug]/page.tsx>), and the
[scope authorization](lib/authorized-editor.ts) and [draft read](lib/read-demo-document.ts)
patterns. Adapt the bindings in [RenderPageView](components/RenderPageView.tsx)
to your schema. [Translation seed](lib/translation-example.ts) is synthetic
data for the walkthrough. The public route and editor both disable content
fallback here so readers can see exactly where a translation is missing.
