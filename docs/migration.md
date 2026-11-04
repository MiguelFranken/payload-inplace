# Move to payload-inplace

The public npm package and GitHub repository now share the name **payload-inplace**. Previous publications under `@miguel.franken/payload-visual-editor` remain immutable.

```sh
pnpm remove @miguel.franken/payload-visual-editor
pnpm add payload-inplace
```

Replace the old package prefix in every import, including Payload configuration, native component references and Next aliases/configuration:

```ts
import { visualEditor } from "payload-inplace";
import { FrontendEditor } from "payload-inplace/rsc";
import { getFieldAttributes } from "payload-inplace/bindings";
```

Regenerate both the admin and dedicated frontend import maps using the new package, then rebuild the host. Use the [integration guide](integration.md) and [compatibility contract](compatibility.md) for the pinned runtime.

The exported API, native Form, revision fields, existing data attributes, session cookies and preview protocol retain their behavior. Renaming the dependency does not require transforming CMS documents or removing any migration history. The original scoped package’s 0.0.1 release is recorded in the historical validation receipts; new receipts identify the unscoped package and exact archive.

The renamed repository is [MiguelFranken/payload-inplace](https://github.com/MiguelFranken/payload-inplace). GitHub redirects old repository URLs; update remotes with `git remote set-url origin git@github.com:MiguelFranken/payload-inplace.git`.
