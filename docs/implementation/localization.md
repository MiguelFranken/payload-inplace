# UI messages and native content locales

The editor has two independent locales. `options.ui.locale` controls plugin messages, dates, numbers, plurals and direction. Payload's request/content locale controls native values, field preparation, drafts, versions, review and publication. Never derive the second from the first.

```ts
visualEditor({
  // Existing roots, permissions, origin and concurrency configuration ...
  ui: {
    locale: "de-DE",
    messages: {
      de: { editPage: "Bearbeiten" },
      "de-DE": {
        changedFieldCount: {
          one: "{count} geändertes Feld",
          other: "{count} geänderte Felder",
        },
      },
    },
  },
});
```

`payload-inplace/messages` exports `createEditorMessages` and the typed `EditorUIOptions`, `EditorMessageKey` and override types. The frontend hook inherits the current editor catalogue; explicit options are useful in standalone activation UI. English and German are built in. Unknown locales use English copy with their own Intl formatting and inferred direction; consumers supply their translations. Full locale overrides take precedence over language overrides. Malformed placeholder overrides fall back to source copy. Interpolation is text, never HTML. `direction` can explicitly override inference.

Plugin feedback retains typed message identities through asynchronous work. Translation changes do not restart media searches, saves or reconciliation requests. Native validation, native labels and consumer action results remain owned by Payload/the consumer. `EditorLabel` accepts English fallback plus arbitrary language/full-locale keys. Editor language/direction are scoped to its chrome; the website's `<html>` is unchanged. Canvas text still uses the website's typography and content language.

## Content scope

Activation records one native content locale in its signed credential. The same locale is required on subsequent native writes, latest/version reads and lease requests. Reviewed publication is also locale-bound. `all` is not an editing locale. Changing content locale requires authorizing a new editing scope: the native Form, selection, structural history, review state and pending acknowledgement listeners are remounted for that scope. An old credential cannot write to another locale even if document/revision/content happen to match.

Authoring reads explicitly use `fallbackLocale: false`. In Payload's Local API, `null` means use configured fallback, whereas the REST query string `fallback-locale=null` disables fallback. This distinction matters: rendering a fallback is useful on a public website, but copying it into native fields would silently create translations. Public renderers choose their own fallback policy.

A host's native server action must reauthorize on every invocation and pass the freshly constructed server request **as a separate argument**, outside the client-spread argument object:

```ts
const serverFunction: ServerFunctionClient = async (args) => {
  "use server";
  const { req } = await authorizedEditor(identifier, true);
  return handleEditorServerFunctions({ ...args, config, importMap }, req);
};
```

Import `handleEditorServerFunctions` from `payload-inplace/native`. The v3 bridge scopes native form/field/table preparation and consumer server-function overrides to that request. It preserves native persistence and ACLs. Standard admin callers continue using `handleServerFunctions`. Never forward a client-supplied request or use `verifyContext` alone as authorization: it verifies integrity, while `readEditContext` rechecks current user/session, locale and document capability. The demo's `authorized-editor.ts` shows the complete two-pass flow.

## Shared structure

A non-localized blocks/array field shares its row identities/order across locales even if individual leaves are localized. The section panel explains this when the configured root is shared. Inherited localization on named groups/tabs is considered; translated leaves do not make their parent structure localized. Native Payload remains the schema/write authority. A global revision intentionally serializes writes across locales too, preventing shared structure changes from silently overwriting one another.

The synthetic `localizedPages` fixture proves selected-locale leaf writes, missing-value/fallback handling, stable row IDs, shared structure and cross-locale credential rejection. It is test/demo data, not a migration for consumers.
