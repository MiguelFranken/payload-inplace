import { RichText } from "@payloadcms/richtext-lexical/react";
import {
  getBlockAttributes,
  getFieldAttributes,
} from "@miguel.franken/payload-visual-editor/bindings";
/** The consumer's own view shares markup between its public server page and active client projection. */
export function StoryView({
  document,
  active = false,
}: {
  document: any;
  active?: boolean;
}) {
  return (
    <main className="site:mx-auto site:max-w-4xl site:px-6 site:py-16">
      {document.article.sections.map((section: any, index: number) => {
        const identity = { root: "article.sections", blockId: section.id };
        const Heading = index === 0 ? "h1" : "h2";
        return (
          <section
            key={section.id}
            {...getBlockAttributes(identity, active)}
            className={`site:mb-6 site:rounded-2xl site:border site:border-solid site:border-stone-200 site:p-8 ${section.tone === "quiet" ? "site:bg-stone-100" : "site:bg-white"}`}
          >
            <Heading
              {...getFieldAttributes(
                { ...identity, field: "headline" },
                active,
              )}
              className="site:m-0 site:text-3xl site:font-semibold site:tracking-tight"
            >
              {section.headline}
            </Heading>
            {section.blockType === "callout" ? (
              <p
                {...getFieldAttributes(
                  { ...identity, field: "summary" },
                  active,
                )}
                className="site:mt-4 site:text-lg site:leading-relaxed"
              >
                {section.summary}
              </p>
            ) : (
              <p
                {...getFieldAttributes(
                  { ...identity, field: "attribution" },
                  active,
                )}
              >
                {section.attribution}
              </p>
            )}
            {section.body?.root && (
              <div
                {...getFieldAttributes({ ...identity, field: "body" }, active)}
              >
                <RichText data={section.body} />
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}
