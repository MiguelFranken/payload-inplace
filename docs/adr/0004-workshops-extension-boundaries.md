# Workshops analysis: configuration and consumer tools

Read-only analysis of the Fluid Bodies Workshops source informed these boundaries. No customer records, production settings or domain workflows were changed by this analysis.

## Existing patterns inspected

- `collections/pages/Pages.ts`: localized layout, unnamed content tabs and SEO metadata. Declarative field panels can expose search title/description without duplicating the native document.
- `collections/workshops/Workshops.ts`: `detailPage.layout`, validated hero/term-selection composition, hidden legacy fields, scheduling defaults, details and social metadata. Schema paths differ from indexed data paths. Hidden mirrors must survive unmounted controls.
- `blocks/ContentModules/config.ts` and `fields.ts`: Inhalt/Darstellung/Datenquelle grouping, conditional gallery/text-media/accordion controls. Keep native conditional fields together; a consumer profile chooses which existing native fields appear, without rewriting schemas or weakening field access.
- `admin/components/views/AttendeeCollectionEditView.tsx`, `WorkshopSessionEditView.tsx`: card-based related summaries, operational facts, lazy panels and explicit domain actions. The useful pattern is progressive disclosure and grouped tasks; website authoring should not copy an entire admin record view.
- `admin/components/list-filters/DisplayOptions.tsx` and display toggles: declarative capabilities, native controls and a single owner for preferences. Temporary panel positions/selection belong to editor UI state; persisted display preferences remain host-owned.
- `admin/components/actions/AttendeeTestimonialInvitationActionButton.tsx`: preview recipients/prior delivery state, template choice and request-key idempotency before a domain action. A generic content plugin must not send to arbitrary recipients or directly toggle operational status.
- Pages terms-document generation and Workshops publish analytics hooks: publication can generate legal documents and analytics. Draft preview must not simulate these effects or call publication hooks.

## Three extension levels

| Use case                                                         | Configuration/API                                                | Ownership                                           |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------- |
| Headline/caption                                                 | `blockControls[slug].inlineEdit`                                 | Existing bound plain text + native useField         |
| Images, rich text, repeated items                                | `blockControls[slug].fields`                                     | Existing native controls, secondary options         |
| Gallery arrangement, text alignment, data-source labels          | Selection `fieldPanels`, optional `blockTypes`                   | Existing native fields/conditions                   |
| Search metadata or visibility fields                             | Document `fieldPanels`                                           | Existing field ACL/hooks                            |
| Related session facts, media guidance, content health            | Custom panel/control `Component`                                 | Consumer read loaders + native form context         |
| Invitation preview, scheduling review, legal publish preparation | Explicit custom action or custom panel with domain server action | Consumer permission/idempotency/lifecycle contracts |

`canUse` filters tools on the server and is checked again for actions. It never grants document or field access. `showInDock:false` permits consumer controls to own a trigger. Panels use `NativeFieldSlot` for existing fields to avoid duplicate mounted native field owners. Actions can require a saved revision and a confirmation. They receive freshly authorized `req`, target and document; all additional subjects/inputs are untrusted. Writes delegate to existing domain operations with `overrideAccess:false`, preserving every cancellation, delivery, legal and lifecycle invariant.

Scheduling, payment, attendee status and recipient fields are not made generically inline-editable just because a website can display them. A consumer may expose complete custom UI, but must keep those writes in its owning domain service. This is the boundary between a reusable content editor and an application admin.

## Demo coverage

The demo config includes inline heading/caption profiles, a hero-only Appearance panel, document Search appearance fields, a custom Page details trigger/panel with a native title slot, and a consumer-defined saved-content check action. These are demonstrations; actual packaged Workshops integration and three distinct validated consumer iterations remain a separate release gate.
