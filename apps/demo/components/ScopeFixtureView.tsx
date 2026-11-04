import { editable } from "../../../packages/payload-inplace/dist/exports/bindings.js";
import type { EditorTarget } from "../../../packages/payload-inplace/dist/exports/types.js";
export interface ScopeFixtureDocument {
  target: EditorTarget;
  label: string;
  document: Record<string, any>;
}
/** Same consumer renderer for saved server content and the one active native Form. Provenance is explicit on every terminal field, including the shared global. */
export function ScopeFixtureView({
  documents,
  active = false,
}: {
  documents: ScopeFixtureDocument[];
  active?: boolean;
}) {
  return (
    <div className="demo:mx-auto demo:max-w-5xl demo:px-6 demo:pb-32">
      {documents.map(({ target, label, document }) => {
        const reference =
          target.kind === "global"
            ? { kind: "global" as const, global: target.global }
            : {
                kind: "collection" as const,
                collection: target.collection,
                id: target.id,
              };
        const annotation = editable(reference, { enabled: active });
        const rows =
          target.root
            .split(".")
            .reduce<any>((value, key) => value?.[key], document) || [];
        const global = target.kind === "global";
        const heading = rows[0];
        if (!heading) return null;
        const bound = annotation.block<any>({
          root: target.root,
          blockId: heading.id,
        });
        return (
          <section
            key={`${reference.kind}:${label}`}
            data-test-document-scope={global ? "global" : target.collection}
            {...bound.attrs}
            className={`demo:border-0 demo:border-b demo:border-solid demo:border-line demo:py-10 ${global ? "demo:mb-8" : ""}`}
          >
            <p className="demo:mb-3 demo:text-xs demo:uppercase demo:tracking-widest demo:text-muted">
              {label}
            </p>
            <h2
              {...bound.field("heading", { edit: "inline" })}
              data-test-scope-heading={global ? "global" : target.collection}
              className="demo:m-0 demo:max-w-3xl demo:font-display demo:text-4xl demo:font-normal demo:leading-tight demo:sm:text-5xl"
            >
              {heading.heading}
            </h2>
            {heading.caption && (
              <p
                {...bound.field("caption")}
                className="demo:mt-4 demo:max-w-prose demo:text-muted"
              >
                {heading.caption}
              </p>
            )}
            {global && (
              <nav
                aria-label="Shared navigation"
                className="demo:mt-6 demo:flex demo:flex-wrap demo:gap-5"
              >
                {(heading.items || []).map((item: any) => (
                  <a
                    key={item.id}
                    href={item.note}
                    {...bound
                      .row("items", item.id)
                      .field("label", { edit: "inline" })}
                    className="demo:text-forest demo:underline demo:underline-offset-4"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            )}
          </section>
        );
      })}
    </div>
  );
}
