# Binding rendered content and insertion targets

Use `payload-inplace/bindings` in a server component. Bind the document once, then place metadata on the precise DOM element that renders each value. Metadata identifies content; native access, conditions and server revision guards still authorize every change.

```tsx
const page = editable({ kind: 'collection', collection: 'pages', id: doc.id }, { enabled: isEditor });
const section = page.block<Hero>({ root: 'layout', blockId: hero.id });
return <section {...section.attrs}>
  <h1 {...section.field('heading')}>{hero.heading}</h1>
  <div {...section.list('cards')}>
    {hero.cards.map(card => {
      const row = section.row('cards', card.id);
      return <article {...row.attrs} key={card.id}>
        <h2 {...row.field('title')}>{card.title}</h2>
      </article>;
    })}
  </div>
</section>;
```

`row().attrs` opens only that row's native fields. `field()` declares a terminal; `group()` opens related native fields. `scope()` descends into a group or named tab. Explicit `edit: 'panel'` keeps a terminal in its native editor. Stable `@` paths escape dots and reserved characters in IDs and remain valid after reordering. Never construct an `@` selector by concatenating raw IDs.

Annotate the root container with `page.list('layout')` to allow insertion when no sections exist. Give empty nested lists a sensible hit area in the consumer. During active editing, restrained plus controls appear at the current section's boundaries or an explicitly bound list. They resolve neighbor IDs again against current native state when chosen. Closing or escaping the picker creates no row, save or history entry. Native permissions, conditions, row limits, available blocks and fixed-section policy still apply.

Disabled helpers emit `{}`. The original `getBlockAttributes`, `getFieldAttributes`, `getFieldGroupAttributes` and `getArrayItemPath` helpers remain supported. Document provenance is validated; another document's annotations are denied until that document is explicitly enabled as an editable scope.
