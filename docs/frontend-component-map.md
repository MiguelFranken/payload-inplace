# Frontend component map

A website editor must not import the admin application import map. Navigation plugins and providers can import global utility CSS which overrides the website, even when editor controls themselves use a shadow root.

Generate a separate map with Payload `generateImportMap(frontendConfig(await config))`, setting `admin.importMap.importMapFile` to the frontend map location. Regenerate before development and production builds. Import that map only from protected editor routes and pass it to `FrontendEditor` and native `handleServerFunctions`. Use `frontendConfig(await config)` for the latter as well.

`frontendConfig` removes global navigation, providers, dashboard widgets, shell generators and unrelated dependencies. Collection/global fields, document components, access, hooks and schemas are preserved; `visual-editor.*` extension dependencies remain available. Consumer field components must still scope any CSS they import.

`withFrontendImportMap(req, map)` scopes component resolution to a request without changing the shared Payload instance or another request's admin map. It preserves the original native operations and database.

Hover outlines are off by default. Toggle Select content directly in the toolbar to show or hide them. The pressed state reflects highlighting; direct text editing also works with highlighting off. Hover and picking pause while a settings panel is open. Direct inline text editing remains available independently. The minimized launcher is an icon-only button with an accessible label, accent fill, and a 44px target. Customize its colors with `--pve-accent` and `--pve-accent-contrast`.

Rendered targets choose the smallest explicit field or field-group binding. Plain text uses inline editing only when its native type, permissions, field condition and markup allow it. Rich text, uploads, links, custom fields and arrays open their native controls automatically. Arrays stay in their native editor to preserve row identity. `getFieldGroupAttributes` binds one visual object to multiple CMS fields without creating a second form or save path. One outline moves between hovered targets and yields to settings panels.
