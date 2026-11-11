# Edit rich text without changing its presentation

Bind a **native Lexical richText field** on the element containing its rendered rich content. Keep the same renderer in public and active previews:

```tsx
<div
  {...getFieldAttributes(
    { ...identity, field: "body", edit: "inline" },
    active,
  )}
>
  <RichText data={block.body} />
</div>
```

Import the binding helper from `payload-inplace/bindings` and `RichText` from your existing Payload renderer. No strategy provider is needed for the supported native Lexical adapter. If you define `blockControls[slug].inlineEdit`, include `body` in that whitelist. Do not bind Lexical JSON internals like `body.root.children.0`.

## What editors see

Selecting compatible content opens a formatting toolbar near the selection or caret. Bold, italic and underline reflect the current selection. Available commands follow the native field's enabled features. Settings in the selection caption switch to native fields, retaining the value and focusing the selected field.

![A selected phrase in the studio story with the Bold button active above it](../images/ecommerce-rich-text.png)

The inline adapter preserves the renderer's presentation wrapper chain and semantic node classes. Existing React output remains mounted while a temporary twin owns editable DOM; native `useField` owns structured JSON. Saving never converts the field to HTML or plain text. Newly added semantic nodes use compatible shared classes. Test your custom renderer at its actual responsive breakpoints; arbitrary selector-dependent layouts cannot be inferred universally.

## When native settings are the right choice

- Use `edit: 'panel'` for an explicit native-only target.
- Consumer native `Field` overrides, access/readOnly restrictions and false conditions retain their native authority.
- Unsupported custom/upload nodes retain their complete JSON as immutable islands; editing their internals uses native controls.
- Internal relationship-link selection stays native. Safe inline link editing is not a full replacement for every native feature.
- Renderers depending on duplicate IDs, sibling-position selectors or a transformed/shortened content projection should use native settings until an explicit adapter is provided.

Plain text and RTE alternatives are different CMS fields. Bind the field actually rendered, including a plain fallback when rich content is empty. Opening settings must not silently initialize a sibling RTE from fallback text or overwrite the stored plain answer.

## Verify in your renderer

Compare bounds, font, line height, wrapping, paragraphs, lists, links and emphasis before/during/after editing. Type spaces and multiline text, exercise undo/composition, save during slow network, then open native settings and reload the draft. The [rich ownership ADR](../adr/0008-inline-rich-text.md) explains the native-peer loading boundary and lossless-node contract.
