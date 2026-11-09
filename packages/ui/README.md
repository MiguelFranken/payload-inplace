# Editor UI

This private workspace contains the views shipped through `payload-inplace`.
Browse by feature under `src/chrome`, `src/sections`, `src/canvas`,
`src/inline-editing`, `src/media`, and `src/review`. Base UI primitives and
the portal host live in `src/primitives`. Message catalogues and locale
selection live in `src/localization`.

Keep view props with their components. Pass user actions through callbacks and
reserve providers for ambient UI concerns, such as messages and portals.
Payload forms, permissions, fetches, saves, and DOM binding resolution belong
to the plugin. Story files sit beside the components and use synthetic data.
They are discovered by [Storybook](../../apps/storybook/.storybook/main.ts).
