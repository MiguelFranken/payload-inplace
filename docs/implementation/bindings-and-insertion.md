# Binding rendered content and insertion targets

Use `payload-inplace/bindings` in a server component. Bind the document once, then place metadata on the precise DOM element that renders each value. Metadata identifies content; native access, conditions and server revision guards still authorize every change.

```tsx
const page = editable(
  { kind: "collection", collection: "pages", id: doc.id },
  { enabled: isEditor },
);
const section = page.block<Hero>({ root: "layout", blockId: hero.id });
return (
  <section {...section.attrs}>
    <h1 {...section.field("heading")}>{hero.heading}</h1>
    <div {...section.list("cards")}>
      {hero.cards.map((card) => {
        const row = section.row("cards", card.id);
        return (
          <article {...row.attrs} key={card.id}>
            <h2 {...row.field("title")}>{card.title}</h2>
          </article>
        );
      })}
    </div>
  </section>
);
```

`row().attrs` opens only that row's native fields. `field()` declares a terminal; `group()` opens related native fields. `scope()` descends into a group or named tab. Explicit `edit: 'panel'` keeps a terminal in its native editor. Stable `@` paths escape dots and reserved characters in IDs and remain valid after reordering. Never construct an `@` selector by concatenating raw IDs.

Annotate the root container with `page.list('layout')` to allow insertion when no sections exist. Give empty nested lists a sensible hit area in the consumer. During active editing, restrained plus controls appear at the current section's boundaries or an explicitly bound list. They resolve neighbor IDs again against current native state when chosen. Closing or escaping the picker creates no row, save or history entry. Native permissions, conditions, row limits, available blocks and fixed-section policy still apply.

Disabled helpers emit `{}`. The original `getBlockAttributes`, `getFieldAttributes`, `getFieldGroupAttributes` and `getArrayItemPath` helpers remain supported. Document provenance is validated; another document's annotations are denied until that document is explicitly enabled as an editable scope.

Set `diagnostics: true` during development to explain selected terminal mappings in the console. The active editor checks the current native schema, stable row resolution, explicit inline/container intent, conditions, native overrides, update access, interactive text markup and repeated visible occurrences. Diagnostics contain codes/field paths only, never values or HTML; repeats are informational because responsive duplicates can be intentional. Reports are deduplicated and bounded, run only on selection, and are ignored in production. They never change access or resolve an invalid binding by guessing another field.

## Source text and browser ownership

Plain text adopts consumer markup only when its source is intact. CSS uppercase/capitalize is presentation and does not change saved casing or spaces. An opaque shortened/prefixed renderer projection opens native settings without writing; it cannot discard the invisible remainder of the source. Empty-value placeholders remain presentation until actual input. Once an inline field owns the DOM, browser-created multiline nodes remain valid until ownership ends: pressing Enter must not switch the field to native settings. Native conditions, field access and readOnly still take precedence throughout. The overlay is a selection perimeter, not a replacement text input; that retains the host typography, wrapping, scrolling and native caret/undo. The rich-text twin has the separate lifecycle documented in ADR 0008.
