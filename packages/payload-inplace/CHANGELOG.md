# Changelog

## 0.2.5

### Patch Changes

- 0fd7ca2: Accept every aligned Payload 3.94.x patch release. Peer dependencies now allow `3.91.0 || ~3.94.0`, and `withVisualEditorNext` accepts any 3.94.x version when `payload`, `@payloadcms/ui` and `@payloadcms/next` share that exact version. Consumers on Payload 3.94.1 or 3.94.2 no longer fail during install or Next configuration. The workspace and installed-consumer checks now validate Payload 3.94.2.

## 0.2.4

### Patch Changes

- aa6b4bd: Publish grouped GitHub release notes automatically after verifying the npm archive. This patch exercises the complete release workflow with the existing editor runtime.

## 0.2.3

### Patch Changes

- 601481e: Resolve nested sections by their ordered ancestor IDs, including IDs containing slashes.
- b4affd5: Show the current position of moved sections and the original position of removed sections in document review.
- 7fbda4d: Clear stale populated relationship data from the active preview when the collection or reference ID changes.
- 4349024: Normalize empty native row lists in the active preview without mutating the baseline document.
- 02f06fa: Resolve structural commands and insertion anchors through native Payload row lists so JSON and populated relationships cannot interfere with section identities.
- 895d7b5: Show insertion previews for the first section in optional blocks lists that have no stored value yet.
- 2469e29: Use the saved draft timestamp when copying a section pattern without a concurrency adapter.
- 7de6353: Use the activated content locale when listing, reading, and saving section patterns.
- 86a16c3: Offer a retry for failed pattern pages, keep previously loaded patterns, and omit duplicate entries.
- 36256db: Cancel pending pattern operations when closing the section picker or switching back to ordinary sections.
- d8b9b7b: Enforce nested block row limits in section catalogue previews, with a 100-row default when the schema sets no limit.
- fceabc6: Keep the last selected media reference when an earlier upload completes or fails.
- 88d0c83: Support nested, root, and trailing-slash Payload REST mounts in the native media library.
- 3b60f46: Infer editor text direction from the locale's writing system and continue to honor explicit direction overrides.
- af91c5b: Preserve missing and explicitly empty named tabs when saving and inserting section patterns.

## 0.2.2

### Patch Changes

- 560f2c5: Support the aligned Payload 3.94.0 native editor packages and React 19.3.1 while retaining support for Payload 3.91.0 hosts.

## 0.2.1

### Patch Changes

- 8b41e27: Accept Payload’s native draft option when creating the first draft without an explicit document status. Validate the Next.js bridge against the cache-isolation fixes in Next.js 16.4.6. Preserve typed spaces after formatted text when a storefront uses collapsing whitespace. Make comparison navigation ready when switching highlight modes.

## 0.2.0

### Minor Changes

- 00ffeb9: Compare drafts on the page with separate section and element highlights. The Elements mode outlines changed rendered field bindings and lets you jump between them in page order.
- b7c69d4: Move a selected section one place at a time or choose its destination from the on-page actions menu. Consumers can register server actions for specific block types in that menu.

### Patch Changes

- c2f1048: Keep the storefront’s line wrapping and scroll position when opening inline rich-text editing. Place the caret where the editor was clicked and keep the rendered content visible if inline editing cannot initialize.

## 0.1.0

### Minor Changes

- e93fc13: Compare saved draft and published sections directly on the page. The editor outlines edited, added, removed and moved sections and lets you step through changes while keeping the native draft and its undo history.

### Patch Changes

- 23f2284: Reduce the work needed to track edits, acknowledge saves, undo structural changes, and review large drafts. Existing field ownership, row identity, and conflict decisions are preserved.
- 4e11277: Keep the native editor responsive when a background status response belongs to an older save or activation. A current access denial or validation error still enters the normal recovery flow.
- dffffed: Keep the active content locale when reopening an editor session after a failed save or expired activation.
- d6905b0: Retain the latest idle draft edit while another autosave is running. Obsolete scope failures no longer interrupt a newer editing session.
- 61a7b1c: Coalesce repeated manual save requests that target the same Payload form, including a save triggered while switching document scopes.
- 6642605: Keep the visible page preview stable while newer saves are acknowledged. Superseded server snapshots are skipped and an older snapshot cannot replace a newer one.
- 1600743: Locate saved changes by stable section identity after reordering. When a nested block is hidden or removed, scroll to its closest rendered parent section.
- 6c40642: Show boolean, number, date, choice, and reference changes as whole values in the review dialog. Keep inline highlights for prose, and preserve structured values such as JSON and coordinates.

## 0.0.10

### Patch Changes

- 4ecca88: Extract editor chrome, sections, media, review, and inline editing views into a private UI workspace. Add Storybook with colocated stories for the shared views and use the same components and editor styles in the plugin.
- eccb33d: Clarify consumer setup and optional integrations, refresh the screenshot tour, and document current compatibility and release boundaries.
- 62c2de4: Use the host’s matching `@payloadcms/richtext-lexical` peer for the inline editor’s Lexical imports. Install it at the same version as Payload. The build also emits declaration maps for source navigation in the repository.

## 0.0.9

### Patch Changes

- a0cab5f: Keep the selected inline field populated in native settings and focus its exact native input, including asynchronously mounted rich-text editors. Avoid hiding an existing answer while showing an empty sibling field.

  Keep the canvas insertion picker anchored while a temporary hover preview changes the page layout, preventing previews from cancelling themselves.

## 0.0.8

### Patch Changes

- Keep inline rich-text typography and renderer wrapper layouts intact, including prose spacing, grid placement, responsive styles and semantic node classes. Join contextual settings and safe optional-field/array-item reset actions to the selection label. Use neutral editing controls and a clearer section insertion boundary; preserve native array serialization when undoing removal of the last item.

## 0.0.7

### Patch Changes

- Resolve exact Payload schema paths through unnamed tabs and structural wrappers so inline rich text and native field panels work in consumer schemas. Keep contextual actions in a stable floatable footer and give every editor action and section-insertion trigger a persistent neutral button surface. Keep the compact rich-text toolbar above the active selection or caret and reflect current bold, italic and underline marks without creating saves.

## 0.0.6

### Patch Changes

- Keep the active content outline aligned during host transforms and smooth-scroll settling, even when size stays unchanged. Pause measurements in hidden documents and avoid redundant geometry writes.

## 0.0.5

### Patch Changes

- Preserve native document ID types for advisory locks when DOM routes supply string IDs. Release every mounted advisory lease before ending website editing, pause heartbeats during deactivation and recover leases when exit fails. Keep publication terminal and validate fresh activation in the independent package consumer.

## 0.0.4

### Patch Changes

- f9782f4: Retain selected media outlines while contextual fields are open. Keep reviewed publication available after native save metadata changes instead of falling back to an inconsistent direct publish button. Compact the toolbar, move persistence feedback beside it with a two-second acknowledged state, and make canvas insertion controls clearly visible and consistent before and after lazy catalogue loading.

  Use one gap insertion control rather than simultaneous before/after controls on a hovered section.

  Track selected text and rich-text surface geometry during wrapping and resizing. Preserve configured review roots even without the optional transactional adapter.

  End website editing after successful reviewed publication, using the existing same-page deactivation transition. Failed publication retains the working editor.

## 0.0.3

### Patch Changes

- 32dc5e8: Add native-form-backed inline Lexical editing, typed document-bound annotations, contextual insertion, searchable section previews, optional media/field strategies and reusable section patterns. Support explicitly scoped draft globals and content locales, version comparisons, lock awareness and safe conflict recovery. Preserve native save ownership, source text, caret and selection during asynchronous work; correct floating native field gutters and overflow.

  Restructure development into a pnpm/Turborepo workspace with domain Vitest, Oxlint boundaries, a consumer test kit, checked API recipes and measured active-feature performance budgets. The public package and same-page authorization contracts remain version-pinned to Payload 3.91.

## 0.0.2

### Patch Changes

- 8e4d8b2: Add the package icon, discovery metadata and a clearer README with installation examples, integration guides and demo screenshots.
- 86b1307: Move the package to the public unscoped `payload-inplace` name. Reopen scoped settings when the same element is selected again after closing its panel. Add a Tailwind ecommerce demo with named-tab product roots, two-level nested terminal fields, native price/finish controls, conditional fields, relationships and permission/draft regression coverage.

  Synchronize native server/client schema caches on config changes to prevent hot-reload form crashes. Preserve populated has-many relationship previews by stable ID. Complete every commerce block with native CMS-backed copy, links, appearance and independently editable product-card rows.

  Keep native field ownership while custom controls suspend, preserving open media drawers and input identity. Move selection-relative field claims atomically without mounting overlapping native controls.

## 0.0.1

### Patch Changes

- Start the normal 0.0.x release line. Compact the website toolbar into accessible icon controls with delayed tooltips and an icon save indicator. Batch typing with an idle debounce while preserving immediate inline feedback and newer edits during saves. Fix repeated review and confirmation openings, add a focused changed-field review with published/session comparisons, and support accented diagonal panel resizing.

## 0.1.0-alpha.15

- Adopt streamed server previews in React transitions without hiding the website or reconnecting its controls.
- Keep inline intent while Payload prepares a newly added row’s native field state.
- Locate a section from its list row or open field panel without selecting or changing its content.
- Keep the selected field’s label, tint, DOM and focus stable through native draft saves.
- Resize the contextual panel from its top and left edges, with keyboard controls and viewport bounds.
- Preserve Payload’s native root-unit scale inside isolated styles; adapt field layouts to panel width.
- Measure fragment-bound canvas blocks through their rendered content and retain stable drag bindings across native moves; make keyboard destinations follow sibling identity.
- Accept additional exact, server-configured preview origins for deployment aliases.

## 0.1.0-alpha.14

- Preserve rendered fallback text when inline editing begins; save only real input and ignore detached DOM during teardown.
- Activate and exit editing on the actual website URL with a soft refresh, preserving shared page chrome, query parameters, fragments and viewport.
- Scope draft activation to signed, freshly authorized page sessions; keep public and active rendering entries separate.
- Defer native fields/styles and bridge Payload server functions without importing its admin layout; support the pinned Turbopack runtime through `/next` and `/native`.
- Wait for the activation bridge on cold hydration and reuse Payload's native unsaved-navigation guard.

## 0.1.0-alpha.5 — candidate

- Preserve native unrestricted permissions when mounting fields from named tabs, including consumer custom fields after saves.

## 0.1.0-alpha.4

- Retain native validation errors per submission so slower form-state refreshes cannot remove correction links.
- Isolate clean-consumer npm configuration from the developer's credentials and scoped registries.

## 0.1.0-alpha.3

- Edit bound plain text directly on the website through one native Payload Form, with immediate optimistic preview and background native persistence.
- Use a compact horizontal dock, one contextual panel, shadcn Base UI menus/selects, list/page drag-and-drop and keyboard structural undo.
- Configure native field panels or register consumer controls, panels and access-checked actions.
- Guard native CMS and website writes with Postgres transaction revisions and document-wide reviewed publication. Preserve newer typing and unrelated native values.
- Recover failed saves and expired sessions explicitly; navigate directly to invalid native fields, including closed panels.
- Isolate native light/dark styles inside the editor. Keep anonymous and inactive public routes free of editor client resources.
- Validate separate installed consumers and actual Workshops Pages/Workshop roots. Keep capacity and scheduling in their existing domain commands.

The alpha entries above are historical. Current normal releases and their compatibility, migration and rollback boundaries are documented in the repository guides.
