# Frontend component map

A website editor must not import the admin application import map. Navigation plugins and providers can import global utility CSS which overrides the website, even when editor controls themselves use a shadow root.

Generate a separate map with Payload `generateImportMap(frontendConfig(await config))`, setting `admin.importMap.importMapFile` to the frontend map location. Regenerate before development and production builds. Import that map only from protected editor routes and pass it to `FrontendEditor` and native `handleEditorServerFunctions`. Use `frontendConfig(await config)` for the latter as well, and pass the freshly authorized server request as its separate second argument.

`frontendConfig` removes global navigation, providers, dashboard widgets, shell generators and unrelated dependencies. Collection/global fields, document components, access, hooks and schemas are preserved; `visual-editor.*` extension dependencies remain available. Consumer field components must still scope any CSS they import.

`withFrontendImportMap(req, map)` scopes component resolution to a request without changing the shared Payload instance or another request's admin map. It preserves the original native operations and database.

Hover outlines are off by default. Toggle Select content directly in the toolbar to show or hide them. The pressed state reflects highlighting; direct text editing also works with highlighting off. Hover pauses while a settings panel is open. An intentional click on another website field can switch targets and dismiss that panel; direct inline editing remains available independently. The minimized launcher is an icon-only button with an accessible label, accent fill, and a 44px target. Customize its colors with `--pve-accent` and `--pve-accent-contrast`.

Rendered targets choose the smallest explicit field or field-group binding. Plain text uses inline editing only when its native type, permissions, field condition and markup allow it. Compatible Lexical leaves can edit inline; registered single-media strategies can open the contextual picker. Explicit panel bindings, unsupported/custom fields, links, compound targets and whole arrays retain native controls. Whole arrays retain their native structural editor. Explicit row/leaf paths resolve stable row IDs for scoped item panels and inline text; see [nested bindings](nested-bindings.md). `getFieldGroupAttributes` binds one visual object to multiple CMS fields without creating a second form or save path. One outline moves between hovered targets and yields to settings panels.

## Generate the dedicated map

Run a host script through your existing Payload config loader (for example `tsx`), with the app directory as its working directory. Create the destination directory first. Keep the existing `baseDir` so consumer component paths continue to resolve:

```ts
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { generateImportMap } from "payload";
import config from "./payload.config";
import { frontendConfig } from "payload-inplace/server";

const frontend = frontendConfig(await config);
const file = path.resolve("src/generated/frontendImportMap.js");
await mkdir(path.dirname(file), { recursive: true });
frontend.admin.importMap = { ...frontend.admin.importMap, importMapFile: file };
await generateImportMap(frontend, { force: true, log: true });
```

Import this generated map in the protected editor and its reauthorized server function only. Do not mutate the shared `payload.importMap` per request; use `withFrontendImportMap(req, importMap)` where request-local resolution is needed. For native server functions pass `frontendConfig(await config)` and this same map.

The synthetic demo has a deliberately minimal admin map and reuses it; it has no application navigation/provider plugins. A real host with admin extensions needs the separate map above. This distinction matters when adapting the demo.
