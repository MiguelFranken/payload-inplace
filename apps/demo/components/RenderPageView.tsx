import { CommercePageView } from "../commerce/CommercePageView";
import { RichText } from "@payloadcms/richtext-lexical/react";
import {
  getBlockAttributes,
  getFieldAttributes,
  getArrayItemAttributes,
  getArrayItemPath,
} from "../../../packages/payload-inplace/dist/exports/bindings.js";
/** The exact same server renderer serves public and authorized preview surfaces. */
export function RenderPageView({
  document,
  root,
  active = false,
  renderImage,
  resolveProduct,
  serverContent,
}: {
  document: any;
  root: string;
  active?: boolean;
  resolveProduct?: (product: any) => any;
  renderImage?: (image: any) => import("react").ReactNode;
  serverContent?: Record<string, import("react").ReactNode>;
}) {
  const rows =
    root.split(".").reduce((value, key) => value?.[key], document) || [];
  if (
    rows.some((block: any) =>
      [
        "collectionHero",
        "productDetails",
        "productGrid",
        "editorial",
        "faq",
      ].includes(block.blockType),
    )
  )
    return (
      <CommercePageView
        document={document}
        root={root}
        active={active}
        renderImage={renderImage}
        resolveProduct={resolveProduct}
      />
    );
  const layout = root.split(".").reduce((v, k) => v?.[k], document) ?? [];
  return (
    <main id="main-content">
      {layout.map((block: any, index: number) => {
        const identity = { root, blockId: block.id };
        if (block.hidden) return null;
        const Heading = index === 0 ? "h1" : "h2";
        const heading =
          block.heading ||
          (block.blockType === "serverData" ? document.title : undefined);
        return (
          <section
            key={block.id}
            {...getBlockAttributes(identity, active)}
            className={`demo:min-h-45 demo:border-0 demo:border-b demo:border-solid demo:border-neutral-200 demo:px-6 demo:py-12 demo:sm:px-12 ${block.appearance?.tone === "dark" ? "demo:bg-neutral-950 demo:text-white" : ""} ${block.appearance?.align === "center" ? "demo:text-center" : ""}`}
          >
            <Heading
              {...getFieldAttributes({ ...identity, field: "heading" }, active)}
              data-ve-placeholder={
                active && !heading ? "Add a heading" : undefined
              }
            >
              {heading || (active ? "Add a heading" : "")}
            </Heading>
            {(block.caption || (active && block.blockType === "hero")) && (
              <p
                {...getFieldAttributes(
                  { ...identity, field: "caption" },
                  active,
                )}
                data-ve-placeholder={
                  active && !block.caption ? "Add a caption" : undefined
                }
                className={
                  block.caption
                    ? undefined
                    : "demo:opacity-65 demo:focus:opacity-100"
                }
              >
                {block.caption || "Add a caption"}
              </p>
            )}
            {block.body?.root && (
              <div
                {...getFieldAttributes({ ...identity, field: "body" }, active)}
                className="demo:max-w-prose demo:text-base demo:leading-relaxed"
              >
                <RichText data={block.body} />
              </div>
            )}
            {(Array.isArray(block.items) ? block.items : []).map(
              (item: any) => (
                <div
                  key={item.id}
                  {...getArrayItemAttributes(
                    { ...identity, field: "items", rowId: item.id },
                    active,
                  )}
                  className="demo:py-3"
                >
                  <p
                    {...getFieldAttributes(
                      {
                        ...identity,
                        field: getArrayItemPath("items", item.id, "label"),
                        edit: "inline",
                      },
                      active,
                    )}
                  >
                    {item.label}
                  </p>
                </div>
              ),
            )}
            {block.blockType === "serverData" &&
              (serverContent?.[block.id] || (
                <p>Server result: {document.slug}</p>
              ))}
            {renderImage
              ? renderImage(block.image)
              : block.image?.url && (
                  <img
                    src={block.image.url}
                    alt={block.image.alt || ""}
                    width={300}
                  />
                )}
          </section>
        );
      })}
    </main>
  );
}
