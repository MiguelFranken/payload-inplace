# Add editing to an existing Next.js website

This guide targets **Payload/UI/Next adapter 3.91.0, Next 16.4.2 App Router with Turbopack, React 19.2.x and Node 24+**. Keep Payload packages aligned; the native bridge checks exact supported versions. See [compatibility](compatibility.md).

You need an existing collection with drafts and a native blocks field, a page renderer, and a current-user editing policy. The plugin does not generate your website. For a working app before integrating yours, [run the commerce demo](../CONTRIBUTING.md#run-the-demo).

## 1. Install the public package

```sh
pnpm add payload-inplace @payloadcms/richtext-lexical@3.91.0
```

The npm package contains its own compiled styles and private workspace code. You do not need Tailwind or Turborepo in your host. Do not import anything from `dist/` or `packages/core`.

## 2. Configure one document root

In your Payload config, reuse your existing collection and renderer:

```ts
import { visualEditor, type VisualEditorOptions } from "payload-inplace";
import { postgresConcurrency } from "payload-inplace/postgres";
import { canEditWebsite } from "./access/canEditWebsite";

export const editorOptions: VisualEditorOptions = {
  collections: { pages: { roots: ["layout"] } },
  previewOrigin: process.env.SITE_ORIGIN!,
  resolvePagePath: ({ document }) =>
    document.slug === "home" ? "/" : `/${document.slug}`,
  canEdit: ({ req, document }) => canEditWebsite(req.user, document),
  concurrency: postgresConcurrency(),
};

// In your existing buildConfig: plugins: [...otherPlugins, visualEditor(editorOptions)]
```

`canEditWebsite` is your application's server-side policy, additional to native Payload access. `SITE_ORIGIN` is an exact server-configured website origin, including its development port. Configure owned aliases with `additionalPreviewOrigins`; do not trust arbitrary incoming Host headers.

Keep `versions.drafts` enabled. With Postgres, generate/review/apply the additive revision-field migration through your existing Payload migration process before serving the new config. Keep the executable migration, schema snapshot and index together. The plugin does not transform content or run production migrations for you.

**Check:** the configured root resolves to the actual native blocks field. Named groups/tabs use dotted roots such as `presentation.layout`. Existing CMS document controls still render after regenerating the admin import map.

## 3. Bind the actual rendered elements

```tsx
import {
  getBlockAttributes,
  getFieldAttributes,
} from "payload-inplace/bindings";

export function Hero({
  block,
  active = false,
}: {
  block: { id: string; heading: string };
  active?: boolean;
}) {
  const identity = { root: "layout", blockId: block.id };
  return (
    <section {...getBlockAttributes(identity, active)}>
      <h1
        {...getFieldAttributes(
          { ...identity, field: "heading", edit: "inline" },
          active,
        )}
      >
        {block.heading}
      </h1>
    </section>
  );
}
```

`active` comes from the authorized render entry. Leave the public renderer inactive. Bind every authored leaf you want editors to select; mapping is explicit, not guessed from matching strings. Use stable Payload row IDs for arrays, and a group binding for a visual object backed by several fields. [Complete binding recipes](nested-bindings.md).

**Check:** active output contains block and field attributes on the real semantic nodes. Inactive helpers return `{}`. Do not bind a displayed related product to the page's own content path.

## 4. Wire the host entries

This step is app-specific. The demo is a complete reference; replace its fixture data loaders and authentication with your own, and use public package imports. Keep these files/roles separate:

| Host file or role       | What it must do                                                                                                                                        | Executable reference                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Next config             | Wrap your existing `withPayload` config with `withVisualEditorNext(config, { projectDir })`; keep explicit Turbopack and `skipProxyUrlNormalize: true` | [next.config.mjs](../apps/demo/next.config.mjs)                               |
| Frontend map generation | Generate a dedicated map from `frontendConfig(await config)` before dev/build                                                                          | [map generation recipe](frontend-component-map.md#generate-the-dedicated-map) |
| Shared website layout   | Preserve header/footer/providers; mount `EditorPageTransition` only for freshly authorized CMS editors                                                 | [shared layout](<../apps/demo/app/(public)/layout.tsx>)                       |
| Published route         | Read published data and conditionally render the server-only `EditorLauncher` with the current request and exact target                                | [published page](<../apps/demo/app/(public)/[collection]/[slug]/page.tsx>)    |
| Proxy                   | Internally rewrite only your website paths with `hasPageEditorSession`; preserve authority, query and private/no-store output                          | [proxy.ts](../apps/demo/proxy.ts)                                             |
| Active entry            | Authenticate and call `readPageEditContext(req, pathname, editorOptions)` before any draft read; invalid sessions fall back to published output        | [page-entry.tsx](../apps/demo/lib/page-entry.tsx)                             |
| Protected editor        | Reauthorize the nonce-scoped context; mount `FrontendEditor` with your dedicated map, native server function and renderer                              | [DocumentEditor](<../apps/demo/app/(protected)/visual-editor/page.tsx>)       |
| Native server function  | Reauthorize every invocation; pass the server-created `req` separately to `handleEditorServerFunctions({ ...args, config, importMap }, req)`           | [authorization helper](../apps/demo/lib/authorized-editor.ts)                 |

These are reference roles, not a requirement to copy the demo's folder names. Match the proxy's destination to your internal entry, and keep that entry under the same shared layout. Cookie presence/`hasPageEditorSession` is only a routing hint, never draft permission. Do not put `FrontendEditor` or the native component map in your published route graph. [Full integration contract](integration.md) · [Component map generation](frontend-component-map.md).

**Check:** an anonymous visit shows only published content. After login and pressing Edit page, the URL, header/footer instances and scroll remain; the current shared draft appears. Exit returns to published rendering on the same URL.

## 5. Add immediate preview

Keep your server renderer as `FrontendEditor` children. For immediate structure/media changes, also pass an activated client renderer as `preview`:

```tsx
"use client";
import { useEditorPreviewData } from "payload-inplace/frontend";
import { PageView } from "./PageView";

export function InstantPage({ initialDocument }) {
  const document = useEditorPreviewData(initialDocument);
  return <PageView document={document} active />;
}
```

`initialDocument` must be the authorized, populated draft, not an anonymous/public snapshot. Use your generated document type in the host. Reuse the same presentational markup; resolve changed relationship IDs with authorized loaders. Keep server-only data as React slots. Supply the required read-only `refreshPreview` server function, returning fresh `{ revision, content, preview }` or `{ error: 'denied' | 'unavailable' }` after reauthorization. See the complete [demo editor](<../apps/demo/app/(protected)/visual-editor/page.tsx>) and [optimistic renderer](../apps/demo/components/OptimisticPage.tsx).

**Check:** typing updates immediately; a short burst creates one idle draft save rather than one version per character. Hover previews require this renderer plus [catalogue examples](guides/sections.md), and must not create any save.

## 6. Verify before enabling

Test with an editor, a read-only account and an anonymous browser. Edit a scalar, nested row, native field and supported RTE; save, reopen, review, publish and exit. Confirm published content stays unchanged until publication and unrelated/hidden fields survive. Check 320px, keyboard, repeated close/reopen and a failed save retaining the working copy. Verify your CDN never caches active draft HTML/RSC as public output.

Follow [security and caching](guides/security.md), [testing](testing-and-extensions.md) and [upgrade/rollback](release.md#install-enable-and-upgrade). Missing controls? Start with [troubleshooting](troubleshooting.md).
