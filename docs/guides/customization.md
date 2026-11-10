# Configure fields, controls and appearance

Start with bindings and native controls. Add a custom component only when configuration cannot express the intended task. None of these options grants access beyond Payload's native permissions.

## Choose fields and tools

```ts
blockControls: {
  hero: { fields: ['heading', 'body', 'image'], inlineEdit: ['heading', 'body'] },
},
fieldPanels: [
  { id: 'search', label: 'Search appearance', fields: ['meta.title', 'meta.description'] },
  {
    id: 'appearance', label: 'Appearance', scope: 'selection',
    blockTypes: ['hero'], fields: ['appearance.tone'],
  },
],
tools: { history: false },
```

These are entries in your existing `VisualEditorOptions`. Use schema names that exist in your app. A `fields`/`inlineEdit` profile narrows the presented fields; it does not make unrelated or read-only fields editable. Tool keys and capability callback signatures are defined in the [API reference](../api-reference.md).

## Register a custom control or action

Use `strategyProviders` plus `EditorFieldStrategy` for a compatible selected scalar. A definition receives the native value/setter, disabled/error state and `openNative`. It must not own another document store or save callback. [Runnable strategy recipe](../implementation/contextual-fields.md).

Use `extensions` for a full panel/control or explicit server action. Panels mount existing fields through `NativeFieldSlot`; `useVisualEditor` opens registered tools. Actions reauthorize on the server and delegate writes to your existing domain service. Scheduling, recipients and operational statuses remain app-owned, even if displayed on a page. [Test your control](../testing-and-extensions.md).

## Theme the editor

Set inherited CSS variables on the activated website ancestor/root using your own styling system. The package ships its styles; you do not need to compile its Tailwind classes.

```css
:root {
  --pve-accent: #315342;
  --pve-accent-contrast: #ffffff;
  --pve-surface: #ffffff;
  --pve-text: #242823;
  --pve-muted: #5e635c;
  --pve-border: #d9ddd5;
  --pve-panel-padding: 20px;
}
```

This is **host CSS**, not a required plugin stylesheet. Inspect the complete [chrome primitives](../../packages/payload-inplace/src/admin/chrome.tsx) and [panel token fallbacks](../../packages/ui/src/chrome/floatable/Floatable.tsx) before overriding dimensions or stacking. Keep dock and panel geometry within the viewport; test 320px and your fixed bottom bars. Review contrast for your actual surface/text/focus pairs.

Editor chrome uses prefixed Tailwind without Preflight and isolated native styles. Native controls follow Payload's scale and panel width, while editable content keeps your renderer's typography. Do not load the full admin application CSS/map into the website or override all native inputs with storefront styles. [Component-map isolation](../frontend-component-map.md).
