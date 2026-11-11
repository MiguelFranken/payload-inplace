# Payload Inplace documentation

Edit your existing Payload v3 website without moving the work into the admin UI. Start with one collection and one blocks root; add optional integrations after that flow works.

## Start here

| Guide                                 | Use it to                                                                              |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| [Getting started](getting-started.md) | Install, connect the same-page entries and verify your first saved draft               |
| [Editor tour](tour.md)                | See inline editing, media, section previews and draft comparisons in the commerce demo |
| [Compatibility](compatibility.md)     | Check exact Payload/Next peer versions before installing                               |
| [Troubleshooting](troubleshooting.md) | Diagnose missing targets, blank fields, styling, previews and denied requests          |

## Build your integration

- [Map rendered content](nested-bindings.md): terminal text, groups, stable nested rows and empty lists.
- [Inline rich text](guides/rich-text.md): native Lexical fields, styling fidelity and fallback behavior.
- [Media selection](guides/media.md): register the shared image picker or your own authorized library.
- [Sections and hover previews](guides/sections.md): catalogue examples, native defaults, insertion and reorder.
- [Controls and theming](guides/customization.md): field profiles, panels, custom strategies and CSS variables.
- [Drafts, review and publication](guides/publishing.md): shared drafts, on-page comparison, field-level review, versions and recovery.
- [Same-page host integration](integration.md): complete runtime, routing and server-function contracts.
- [Frontend component map](frontend-component-map.md): native fields without the admin application shell.
- [Security and caching](guides/security.md): current-user access, trusted origins and published/active isolation.

## Optional integrations

- [Globals and multiple documents](implementation/document-scopes.md)
- [Content locales and editor language](implementation/localization.md)
- [Conflict recovery and advisory locks](implementation/conflicts-and-locks.md)
- [Reusable section patterns](implementation/section-patterns.md)
- [Custom contextual fields](implementation/contextual-fields.md)
- [Lifecycle observers](implementation/events.md)
- [Test a custom control and your integration](testing-and-extensions.md)

## Reference and development

[Public API](api-reference.md) · [Architecture](architecture.md) · [Native v3 adapters](native-v3-adapters.md) · [Quality gates](implementation/quality-gates.md) · [Validation](validation.md) · [Release process](release.md) · [Changelog](../CHANGELOG.md) · [Contributing](../CONTRIBUTING.md)

The [architecture guide](architecture.md) links the decisions that still constrain the implementation. The [validation guide](validation.md) explains which checks to run and where to find release evidence. Existing installations of the former scoped package can use the separate [migration guide](migration.md).
