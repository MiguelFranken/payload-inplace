<p align="center">
  <img src="https://raw.githubusercontent.com/MiguelFranken/payload-visual-editor/main/assets/icon.png" width="96" height="96" alt="">
</p>

<h1 align="center">Payload Visual Editor</h1>

<p align="center">
  Edit the website, right where the content lives.<br>
  Inline text, native Payload fields and reviewed drafts on your existing frontend.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@miguel.franken/payload-visual-editor"><img src="https://img.shields.io/npm/v/@miguel.franken/payload-visual-editor/latest?color=3847f4&label=npm" alt="Latest npm version"></a>
  <a href="https://github.com/MiguelFranken/payload-visual-editor/actions/workflows/validate.yml"><img src="https://github.com/MiguelFranken/payload-visual-editor/actions/workflows/validate.yml/badge.svg?branch=main" alt="Main validation status"></a>
  <a href="https://github.com/MiguelFranken/payload-visual-editor/blob/main/docs/compatibility.md"><img src="https://img.shields.io/badge/Payload-3.91-3847f4" alt="Payload 3.91 compatibility"></a>
  <a href="https://github.com/MiguelFranken/payload-visual-editor/blob/main/LICENSE"><img src="https://img.shields.io/github/license/MiguelFranken/payload-visual-editor?color=3847f4" alt="MIT license"></a>
</p>

<p align="center">
  <a href="#what-you-get">What you get</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#compatibility">Compatibility</a> ·
  <a href="#documentation">Documentation</a> ·
  <a href="https://github.com/MiguelFranken/payload-visual-editor/blob/main/CONTRIBUTING.md">Contributing</a>
</p>

## What you get

- **Edit on the actual page.** Keep the website URL, header, footer and scroll position when entering edit mode.
- **Write directly in text.** Bind a headline or paragraph to its native field, including terminal fields inside array rows. Extra settings stay secondary.
- **Use familiar CMS controls.** Media, relationships, rich text and compound objects open scoped native Payload fields in a resizable panel.
- **Keep the controls close.** An icon dock, optional moving selection outline, section reordering and jump-to-section actions stay out of the content's way.
- **See changes immediately.** Optimistic rendering and debounced draft saves share one native Form. Review only changed fields before publishing.
- **Keep your existing app.** You own the schemas, renderers, authorization and business rules. Bindings identify content; Payload access rules still govern reads and writes.

<img src="https://raw.githubusercontent.com/MiguelFranken/payload-visual-editor/main/docs/images/inline-editing.png" width="1280" alt="Bundled demo with a headline selected for inline editing and a compact icon toolbar in the bottom-right corner.">

_Actual bundled demo. The plugin adds editing controls around your frontend; your application defines the page design._

<details>
<summary>See section controls and the add-section picker</summary>

<img src="https://raw.githubusercontent.com/MiguelFranken/payload-visual-editor/main/docs/images/sections.png" width="1280" alt="Sections panel with reorder handles, jump and settings actions, and an icon-only add-section picker.">

</details>

## Quick start

The current release targets **Payload 3 + Next.js App Router with Turbopack**. This is a host integration: configure the plugin, bind your renderer, then connect an authorized website entry. Installing the package alone does not activate editing.

### 1. Install and configure

```sh
pnpm add @miguel.franken/payload-visual-editor
```

Add the plugin to your existing Payload configuration. This example assumes a `pages` collection with an existing `layout` blocks field and a `hero` block with `heading`, `caption` and `image` fields:

```ts
import { visualEditor } from "@miguel.franken/payload-visual-editor";
import { postgresConcurrency } from "@miguel.franken/payload-visual-editor/postgres";
import { canEditWebsite } from "./access/canEditWebsite"; // Your application's policy.

const editor = visualEditor({
  collections: { pages: { roots: ["layout"] } },
  previewOrigin: process.env.SITE_ORIGIN!, // Your configured website origin.
  resolvePagePath: ({ document }) =>
    document.slug === "home" ? "/" : `/${document.slug}`,
  canEdit: ({ req, document }) => canEditWebsite(req.user, document),
  concurrency: postgresConcurrency(),
  blockControls: {
    hero: {
      fields: ["heading", "caption", "image"],
      inlineEdit: ["heading", "caption"],
    },
  },
});

// Include editor in your existing buildConfig({ plugins: [...] }).
```

`canEditWebsite` is your own server-side authorization function. Install the plugin's additive revision fields through your normal Payload migration workflow before enabling the Postgres concurrency guard. See [installation and upgrades](https://github.com/MiguelFranken/payload-visual-editor/blob/main/docs/release.md#install-enable-and-upgrade).

### 2. Bind your rendered content

Use the dependency-free helpers on the elements that correspond to CMS content. Stable block and row IDs keep targets correct after reordering.

```tsx
import {
  getBlockAttributes,
  getFieldAttributes,
} from "@miguel.franken/payload-visual-editor/bindings";

// active comes from the authorized editor entry.
function Hero({
  block,
  active,
}: {
  block: { id: string; heading: string };
  active: boolean;
}) {
  const identity = { root: "layout", blockId: block.id };

  return (
    <section {...getBlockAttributes(identity, active)}>
      <h2
        {...getFieldAttributes(
          { ...identity, field: "heading", edit: "inline" },
          active,
        )}
      >
        {block.heading}
      </h2>
    </section>
  );
}
```

Use `getArrayItemPath('chapters', row.id, 'text')` for a nested terminal field. Bind an entire row or several related fields to open just their native settings. [Nested bindings and terminal fields →](https://github.com/MiguelFranken/payload-visual-editor/blob/main/docs/nested-bindings.md)

### 3. Connect the website entry

The host authenticates the current Payload user, validates the document-scoped editor session and mounts `FrontendEditor` around the same page renderer. Keep the normal website layout, generate a separate frontend component map and connect the authorized refresh/server-function bridge. The launcher uses a soft refresh to enter and leave editing on the current URL.

Follow the [complete integration guide](https://github.com/MiguelFranken/payload-visual-editor/blob/main/docs/integration.md), including the [same-page architecture](https://github.com/MiguelFranken/payload-visual-editor/blob/main/docs/adr/0006-same-page-editing.md) and [component-map isolation](https://github.com/MiguelFranken/payload-visual-editor/blob/main/docs/frontend-component-map.md). The [bundled demo](https://github.com/MiguelFranken/payload-visual-editor/tree/main/dev) is an executable reference. [Run it locally →](https://github.com/MiguelFranken/payload-visual-editor/blob/main/CONTRIBUTING.md#run-the-demo)

## Make it fit your application

Choose editable field profiles, enable individual tools, add native field panels or register custom controls and access-checked actions. Custom panels use the same Form and native fields. Theme the editor with `--pve-*` CSS variables; its prefixed Tailwind styles omit Preflight and isolate native field styling from your website.

[Controls and theming →](https://github.com/MiguelFranken/payload-visual-editor/blob/main/docs/integration.md#consumer-controls-and-theme)

## Compatibility

| Runtime                                     | Current tested versions                                            |
| ------------------------------------------- | ------------------------------------------------------------------ |
| Payload, `@payloadcms/ui`, Postgres adapter | **3.91.0**                                                         |
| Next.js                                     | **16.4.2**, App Router, Turbopack                                  |
| React / React DOM                           | **19.2.6**                                                         |
| Node.js                                     | **24+**, CI on Node 24                                             |
| Database                                    | Postgres with transactional revision guards; MongoDB demo coverage |

The native handler bridge is version-pinned. Globals, localization, cross-origin frontends and inline authoring inside Lexical are outside the current contract. The normal npm release line starts at **0.0.1**; the [compatibility guide](https://github.com/MiguelFranken/payload-visual-editor/blob/main/docs/compatibility.md) defines the tested scope.

## Documentation

| Guide                                                                                                                     | What it covers                                                                       |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [Integration](https://github.com/MiguelFranken/payload-visual-editor/blob/main/docs/integration.md)                       | Configuration, same-page routing, authorization, preview and public-route boundaries |
| [Nested bindings](https://github.com/MiguelFranken/payload-visual-editor/blob/main/docs/nested-bindings.md)               | Terminal text, dotted paths, stable array rows and compound selections               |
| [Frontend component map](https://github.com/MiguelFranken/payload-visual-editor/blob/main/docs/frontend-component-map.md) | Native controls and custom components without loading the whole admin application    |
| [Compatibility](https://github.com/MiguelFranken/payload-visual-editor/blob/main/docs/compatibility.md)                   | Exact runtime versions, supported capabilities and validation limits                 |
| [Releases and rollback](https://github.com/MiguelFranken/payload-visual-editor/blob/main/docs/release.md)                 | Changesets, immutable CI artifacts, npm provenance and safe upgrades                 |
| [Changelog](https://github.com/MiguelFranken/payload-visual-editor/blob/main/CHANGELOG.md)                                | Published package changes                                                            |
| [Contributing](https://github.com/MiguelFranken/payload-visual-editor/blob/main/CONTRIBUTING.md)                          | Local demo, synthetic accounts and validation commands                               |

## License

[MIT](https://github.com/MiguelFranken/payload-visual-editor/blob/main/LICENSE). Built as an independent plugin for Payload CMS. Upstream licenses are listed in [NOTICE](https://github.com/MiguelFranken/payload-visual-editor/blob/main/NOTICE).
