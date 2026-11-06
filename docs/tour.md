# A tour of the editor

The bundled Still & Form commerce demo uses real native Payload schemas and synthetic content. These are unedited browser captures, not UI mockups. [Run the demo](../CONTRIBUTING.md#run-the-demo); its footer links to the synthetic login. Sign in, return to the page and press the edit icon.

## Write directly on the website

![Inline product heading and compact editor dock](images/ecommerce-editor.png)

Select a terminal heading or paragraph and type. Rich-text fields offer the compatible native-backed formatting surface. Optional hover highlighting helps find targets; direct selections work without it. Settings in the joined caption open native fields. [Bindings](nested-bindings.md) · [Rich text](guides/rich-text.md).

## Choose media visually

![Selected image and contextual media library](images/ecommerce-media.png)

The optional library replaces one native reference. It is reusable in your host, not specific to the demo. [Media setup](guides/media.md).

## Open exactly the fields you need

![Scoped native finish settings](images/ecommerce-fields.png)

This finish is one row inside the product's array. Its SKU, native checkbox and conditional lead time remain native controls. Resize the panel; the website keeps its own layout. [Nested arrays](nested-bindings.md) · [Customization](guides/customization.md).

## Preview and insert a section

![Searchable section picker and transient page preview](images/ecommerce-sections.png)

Hover or focus an option to preview it where the plus was opened. Closing cancels it without a save; insertion uses native defaults. Use the section list for locate, settings and pointer/keyboard reordering. [Catalogue configuration](guides/sections.md).

## Review the saved draft

![Changed-only review before publishing](images/ecommerce-review.png)

Compare the draft with published content or the session baseline. Successful reviewed publication closes editing; another visit still sees published content until that action succeeds. [Publishing and saved versions](guides/publishing.md).

## Your existing website stays yours

![The same storefront without editor controls](images/ecommerce-storefront.png)

Your app owns schemas and design. The demo's [commerce renderer](../apps/demo/commerce/CommercePageView.tsx) is shared by public and active entries. [Screenshot provenance and dimensions](images/README.md).
