import { editable } from "payload-inplace/bindings";

interface Section {
  id: string;
  heading: string;
  details: { caption: string };
  chapters: { id: string; headline: string; body: { root: object } }[];
}

/** Typechecked public-API recipe: exact terminals, a named group and stable nested rows. */
export function AnnotatedSection({ section }: { section: Section }) {
  const page = editable(
    { kind: "collection", collection: "stories", id: "synthetic" },
    { enabled: true },
  );
  const block = page.block<Section>({
    root: "article.sections",
    blockId: section.id,
  });
  if (false) {
    // @ts-expect-error A scalar field is not an array/list binding.
    void block.row("heading", "wrong");
    // @ts-expect-error Known schema shapes reject unknown field paths.
    void block.field("missing");
  }
  return (
    <section {...block.attrs}>
      <h2 {...block.field("heading")}>{section.heading}</h2>
      <p {...block.scope("details").field("caption")}>
        {section.details.caption}
      </p>
      <div {...block.list("chapters")}>
        {section.chapters.map((chapter) => {
          const row = block.row("chapters", chapter.id);
          return (
            <article key={chapter.id} {...row.attrs}>
              <h3 {...row.field("headline")}>{chapter.headline}</h3>
              <div {...row.field("body", { edit: "panel" })}>
                Consumer rich-text renderer
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
