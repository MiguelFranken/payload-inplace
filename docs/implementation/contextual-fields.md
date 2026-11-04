# Consumer contextual fields

A strategy provider is a client component registered through Payload's import map. It mounts only inside the activated native Form. A consumer can replace a compatible selected scalar control without replacing persistence, conditions or validation.

```tsx
'use client'
import { EditorFieldStrategy, defineFieldStrategy } from 'payload-inplace/frontend'

const price = defineFieldStrategy({
  id: 'price-control',
  types: ['number'],
  match: ({ schemaPath }) => schemaPath.endsWith('.pricing.amount'),
  Component: ({ value, setValue, disabled, openNative }) => <>
    <button disabled={disabled} onClick={() => setValue((value ?? 0) + 1)}>Increase price</button>
    <button onClick={openNative}>More options</button>
  </>,
})
export function MyStrategies() { return <EditorFieldStrategy definition={price} /> }
```

```ts
visualEditor({
  // normal collections, origins and permissions configuration…
  strategyProviders: [{ id: 'shop-controls', Component: './MyStrategies#MyStrategies' }],
})
```

Keep definitions at module scope (or memoized). The provider's ID is unique among configured extensions/providers; registered strategy IDs are unique within one document. Higher `priority` wins, with ID as a deterministic tie-break. A matching `mode: 'native'` definition disables a contextual/inline override without replacing Payload UI. Type inference restricts the component's field/value contract to its declared field kinds.

Place a scalar binding where the value is rendered. A group/row binding still opens grouped native fields; an explicit `edit: 'panel'` requests native UI and takes precedence. Native readOnly/access/conditions and custom Field overrides cannot acquire a contextual owner. The strategy's setter checks the current native condition again before changing the native field. The server rechecks all write authority.

The component receives one field, not a document copy or a save callback. `openNative()` unmounts the custom control before native fields mount under the same ownership claim. Rendering/predicate failures fall back to native UI. Use the host's design system or native Payload primitives inside the isolated shadow surface; never import storefront resets or unscoped admin CSS.

The demo registers a native-button background palette. The browser acceptance fixture binds its coloured surface to the scalar background field, saves through the real native queue and hands back to the actual native select. Pure component tests cover permissions/condition changes and ownership handoff; they are not concurrency evidence.
