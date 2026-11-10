# Add, preview and reorder sections

Configure existing native blocks roots, then bind each rendered section and the list itself. The [binding guide](../nested-bindings.md) covers stable row IDs and empty arrays. An empty list needs a visible consumer-owned area so its insertion control has a meaningful target.

The editor shows one contextual plus at the nearest permitted gap. The section panel provides a list alternative with locate/settings actions and pointer/keyboard reordering. Both use native row operations; dragging does not save intermediate positions. Cross-container moves remain unsupported because they change schema ownership. Native min/max, conditions, block availability and configured fixed-section policies remain authoritative.

## Add useful catalogue entries

```ts
catalogue: {
  editorial: {
    label: 'Studio story',
    description: 'An image-led introduction to your materials and process.',
    group: 'Storytelling',
    thumbnail: { src: '/images/editorial-preview.webp', alt: '' },
    example: {
      eyebrow: 'Inside the studio',
      heading: 'A story worth sharing.',
      description: 'Introduce the people and materials behind the collection.',
      background: 'sage',
    },
  },
},
```

Use your real block slug and valid schema values. Label/description/group/thumbnail describe the option; `example` is transient presentation data. It is not a new schema default, saved draft or independent content model. Do not put credentials, private records or arbitrary relationship IDs into examples. Native field permissions filter transported examples.

## Make hover preview work

Three parts must agree:

1. The catalogue entry has valid `example` values.
2. `FrontendEditor` has a client `preview` that calls `useEditorPreviewData`.
3. That renderer handles the block type with the same real markup, including an empty/example state for server-only data slots.

Hover/focus projects the example at the chosen gap; closing/Escape cancels it with no draft write or history entry. The picker retains its original gap when the preview changes page height. Choosing inserts **native Payload defaults**, not sample copy. Put intended initial content in your schema's `defaultValue`; use the separate opt-in [pattern adapter](../implementation/section-patterns.md) for saved independent section copies.

A server-only renderer can still insert native blocks but cannot display an unsaved browser-side preview of arbitrary server work. Keep business requests/effects out of catalogue hover. The [commerce catalogue](../../apps/demo/payload.config.ts) and [consumer renderer](../../apps/demo/commerce/CommercePageView.tsx) are executable examples.


## Reordering and history

Canvas and list moves resolve stable section IDs against the current native Form and use the same structural command. The source and destination must share a blocks field. Permissions and the configured ordering constraints apply to both surfaces. Dragging makes no draft write until a valid drop. The Sections list provides a keyboard alternative when a dense layout leaves no space for canvas controls.

Undo and redo affect only the structural operation. They preserve newer text edits and unrelated rows. If the original parent or row has disappeared, the editor reports a conflict instead of moving the row now at the old index.
