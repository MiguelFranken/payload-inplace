# Map the website to native Payload fields

Place bindings on the actual semantic element. The nearest bound ancestor wins: a paragraph can edit text inside a clickable row inside a section. Consumers choose where those targets exist. Bindings contain provenance only; the current native schema, field conditions and permissions still decide what can be edited.

```tsx
import {
  getArrayItemAttributes,
  getArrayItemPath,
  getFieldAttributes,
} from 'payload-inplace/bindings'

const identity = { root: 'layout', blockId: section.id }

<li {...getArrayItemAttributes({ ...identity, field: 'chapters', rowId: chapter.id }, active)}>
  <h3 {...getFieldAttributes({
    ...identity,
    field: getArrayItemPath('chapters', chapter.id, 'title'),
    edit: 'inline',
  }, active)}>{chapter.title}</h3>
  <p {...getFieldAttributes({
    ...identity,
    field: getArrayItemPath('chapters', chapter.id, 'text'),
    edit: 'inline',
  }, active)}>{chapter.text}</p>
</li>
```

Clicking the paragraph edits only its native textarea in place. Clicking the row's unbound space opens only that item's fields in the native panel. The whole array control is not mounted. A supported native Lexical leaf can edit inline; single media can use the optional media strategy. Unsupported/custom or explicitly native fields open their own scoped controls. Text settings show sibling options within the same row; the secondary “all section fields” action deliberately opens the complete section.

`edit: 'inline'` declares a terminal plain-text target. It is a preference, never an override of field type, read-only state, permission or conditions. Plain-text adoption requires a single native text/textarea field, faithful source text without child elements, and an element outside links/buttons/form controls. Native compatible Lexical fields use the separate structured adapter; see [rich text](guides/rich-text.md). Mark composite/rendered markup with `edit: 'panel'`. Omitted or `auto` chooses from these same safeguards; compatible rich-text leaves use the inline adapter, while multiple-field targets remain native panels.

Paths use dots. Groups and named tabs use field names, for example `appearance.caption`. Native numeric array paths such as `chapters.0.text` work, but renderer bindings should use `chapters.@row-id.text`. `getArrayItemPath` escapes IDs (including dots) and can be composed for nested arrays:

```ts
const links = getArrayItemPath("chapters", chapter.id, "links");
const label = getArrayItemPath(links, link.id, "label");
```

ID selectors resolve against the current Form values every time. Reordering follows the same row; missing or duplicate IDs fail closed. Relationship documents, JSON and Lexical internals are not path-addressable CMS fields. Nested Payload blocks retain their existing block identity/ancestor bindings.

`getFieldGroupAttributes` may bind several sibling fields, including siblings inside one specific array row. Fields from different parents should use their own targets or the common row/group target. A row binding never grants structural add/remove/reorder authority.

Internally the resolver uses Payload's exported `getFieldPaths` from `payload/shared`, preserving unnamed row/tab schema paths. Scoped row panels follow `packages/ui/src/fields/Array/ArrayRow.tsx`: the row's numeric data path, the array's schema path and its child permissions are passed to the existing `RenderFields`. One native Form and persistence queue remain responsible for every edit. No independent array state or second save endpoint is introduced.

All helpers return `{}` outside explicitly active authoring. Keep them in the protected renderer; published rendering needs no editor clients or styles.

## Complete mappings

Bind the collection root/empty list as well as blocks, rows and visible leaves. [Document-bound bindings](implementation/bindings-and-insertion.md) provide `editable`, `block`, `row`, `scope`, `field`, `group` and `list` helpers. Bind the actual rendered source when a component chooses a plain fallback over an empty RTE. A hidden/empty optional element has no canvas target; retain its row/section settings path instead. Clicking settings transfers field ownership and focuses that native path.
