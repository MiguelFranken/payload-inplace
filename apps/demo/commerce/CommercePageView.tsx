import type { ReactNode } from "react";
import { RichText } from "@payloadcms/richtext-lexical/react";
import { ArrowDown, ArrowRight, Check, Clock3 } from "lucide-react";
import {
  getArrayItemAttributes,
  getArrayItemPath,
  getBlockAttributes,
  getFieldAttributes,
  getFieldGroupAttributes,
} from "../../../packages/payload-inplace/dist/exports/bindings.js";

type Identity = { root: string; blockId: string };

const sectionClass =
  "demo:box-border demo:mx-auto demo:min-w-0 demo:w-full demo:max-w-7xl demo:px-5 demo:sm:px-8 demo:lg:px-12";

const titleClass =
  "demo:m-0 demo:font-display demo:font-normal demo:leading-[1.08] demo:tracking-tight demo:text-balance demo:whitespace-pre-line";

const copyClass =
  "demo:m-0 demo:max-w-prose demo:text-base demo:leading-relaxed demo:text-muted demo:text-pretty";

const linkClass =
  "demo:inline-flex demo:min-h-11 demo:items-center demo:justify-center demo:gap-3 demo:rounded-full demo:bg-accent demo:px-6 demo:py-3 demo:text-sm demo:font-medium demo:text-white demo:no-underline demo:hover:bg-ink demo:focus-visible:outline-2 demo:focus-visible:outline-offset-4 demo:focus-visible:outline-accent";

/** A consumer-owned ecommerce renderer shared by public RSC and the active optimistic preview. Bindings select native schema fields; they never grant writes to related documents. */
export function CommercePageView({
  document,
  root,
  active = false,
  renderImage,
  resolveProduct,
}: {
  document: any;
  root: string;
  active?: boolean;
  renderImage?: (image: any) => ReactNode;
  resolveProduct?: (product: any) => any;
}) {
  const blocks =
    root.split(".").reduce((value, key) => value?.[key], document) || [];
  const photo = (image: any, className = "") => (
    <div
      className={`demo:overflow-hidden demo:bg-photo demo:outline demo:outline-1 demo:-outline-offset-1 demo:outline-black/10 demo:[&_img]:block demo:[&_img]:h-full demo:[&_img]:w-full demo:[&_img]:object-cover ${className}`}
    >
      {renderImage ? (
        renderImage(image)
      ) : image?.url ? (
        <img
          src={image.sizes?.card?.url || image.url}
          alt={image.alt || ""}
          width={image.sizes?.card?.width || image.width || 1200}
          height={image.sizes?.card?.height || image.height || 900}
        />
      ) : null}
    </div>
  );
  const list = (identity: Identity, name: string) =>
    active
      ? { ...getBlockAttributes(identity, true), "data-ve-list": name }
      : {};
  const field = (
    identity: Identity,
    name: string,
    edit: "inline" | "panel" = "inline",
  ) => getFieldAttributes({ ...identity, field: name, edit }, active);
  return (
    <main
      {...(active ? { "data-ve-root": root, "data-ve-list": "" } : {})}
      id="main-content"
      className="demo:pb-16"
    >
      {blocks.map((block: any) => {
        const identity = { root, blockId: block.id };
        const attrs = getBlockAttributes(identity, active);
        if (block.blockType === "collectionHero")
          return (
            <section
              key={block.id}
              {...attrs}
              className={`${sectionClass} demo:grid demo:gap-8 demo:py-10 demo:lg:grid-cols-[0.9fr_1.1fr] demo:lg:items-center demo:lg:gap-16 demo:md:py-12 ${tone(block.background)}`}
            >
              <div className="demo:flex demo:flex-col demo:items-start demo:gap-6">
                <p
                  {...field(identity, "eyebrow")}
                  className="demo:m-0 demo:text-xs demo:font-medium demo:tracking-widest demo:uppercase demo:text-muted"
                >
                  {block.eyebrow}
                </p>
                <h1
                  {...field(identity, "heading")}
                  className={`${titleClass} demo:max-w-[12ch] demo:text-5xl demo:sm:text-6xl demo:lg:text-7xl`}
                >
                  {block.heading}
                </h1>
                <p
                  {...field(identity, "description")}
                  className={`${copyClass} demo:max-w-sm`}
                >
                  {block.description}
                </p>
                <a
                  {...field(identity, "action", "panel")}
                  href={href(block.action?.href)}
                  className={linkClass}
                >
                  {block.action?.label}{" "}
                  <ArrowRight size={17} aria-hidden="true" />
                </a>
                <p
                  {...field(identity, "note")}
                  className="demo:m-0 demo:pt-2 demo:text-xs demo:tracking-wide demo:text-muted"
                >
                  {block.note}
                </p>
              </div>
              <div {...field(identity, "image")}>
                {photo(
                  block.image,
                  "demo:aspect-[5/4] demo:rounded-t-[5rem] demo:lg:rounded-t-[7rem]",
                )}
              </div>
            </section>
          );
        if (block.blockType === "productDetails")
          return (
            <section
              key={block.id}
              {...attrs}
              className={`${sectionClass} demo:py-8 demo:md:py-12 ${tone(block.background)}`}
            >
              <a
                {...field(identity, "breadcrumb", "panel")}
                href={href(block.breadcrumb?.href)}
                className="demo:mb-7 demo:inline-flex demo:min-h-10 demo:items-center demo:gap-2 demo:text-sm demo:text-muted demo:underline demo:underline-offset-4"
              >
                {block.breadcrumb?.label}
              </a>
              <div className="demo:grid demo:gap-9 demo:md:grid-cols-[1.1fr_0.9fr] demo:md:gap-16">
                <div {...field(identity, "image")} className="demo:self-start">
                  {photo(block.image, "demo:aspect-[4/5] demo:rounded-sm")}
                </div>
                <div className="demo:min-w-0 demo:grid demo:gap-6 demo:md:py-2">
                  <p
                    {...field(identity, "eyebrow")}
                    className="demo:m-0 demo:text-xs demo:tracking-widest demo:uppercase demo:text-muted"
                  >
                    {block.eyebrow}
                  </p>
                  <h1
                    {...field(identity, "heading")}
                    className={`${titleClass} demo:text-5xl demo:lg:text-6xl`}
                  >
                    {block.heading}
                  </h1>
                  <p
                    {...getFieldGroupAttributes(
                      {
                        ...identity,
                        fields: ["pricing.amount", "pricing.currency"],
                      },
                      active,
                    )}
                    className="demo:m-0 demo:text-xl demo:tabular-nums"
                  >
                    {money(block.pricing)}
                  </p>
                  <p {...field(identity, "description")} className={copyClass}>
                    {block.description}
                  </p>
                  <div id="finishes" className="demo:grid demo:gap-3 demo:pt-2">
                    <h2
                      {...field(identity, "finishesHeading")}
                      className="demo:m-0 demo:text-sm demo:font-medium"
                    >
                      {block.finishesHeading}
                    </h2>
                    {(block.variants || []).map((variant: any) => (
                      <div
                        key={variant.id}
                        {...getArrayItemAttributes(
                          { ...identity, field: "variants", rowId: variant.id },
                          active,
                        )}
                        className="demo:flex demo:items-start demo:gap-3 demo:rounded-lg demo:border demo:border-solid demo:border-line demo:p-4"
                      >
                        {variant.available ? (
                          <Check
                            size={17}
                            aria-hidden="true"
                            className="demo:mt-0.5 demo:shrink-0 demo:text-accent"
                          />
                        ) : (
                          <Clock3
                            size={17}
                            aria-hidden="true"
                            className="demo:mt-0.5 demo:shrink-0 demo:text-muted"
                          />
                        )}
                        <div className="demo:min-w-0 demo:grid demo:gap-1">
                          <p
                            {...field(
                              identity,
                              getArrayItemPath("variants", variant.id, "name"),
                            )}
                            className="demo:m-0 demo:text-sm demo:font-medium"
                          >
                            {variant.name}
                          </p>
                          <p
                            {...field(
                              identity,
                              getArrayItemPath(
                                "variants",
                                variant.id,
                                variant.available ? "deliveryNote" : "leadTime",
                              ),
                            )}
                            className="demo:m-0 demo:text-xs demo:leading-relaxed demo:text-muted"
                          >
                            {variant.available
                              ? variant.deliveryNote
                              : variant.leadTime || "Made to order"}
                          </p>
                          {variant.details?.material && (
                            <p
                              {...field(
                                identity,
                                getArrayItemPath(
                                  "variants",
                                  variant.id,
                                  "details.material",
                                ),
                              )}
                              className="demo:m-0 demo:text-xs demo:leading-relaxed demo:text-muted"
                            >
                              {variant.details.material}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <a
                    {...field(identity, "action", "panel")}
                    href={href(block.action?.href)}
                    className={`${linkClass} demo:w-full demo:box-border`}
                  >
                    {block.action?.label}{" "}
                    <ArrowDown size={16} aria-hidden="true" />
                  </a>
                  <p
                    {...field(identity, "purchaseNote")}
                    className="demo:m-0 demo:text-center demo:text-xs demo:text-muted"
                  >
                    {block.purchaseNote}
                  </p>
                  <dl
                    id="product-specifications"
                    className="demo:m-0 demo:divide-y demo:divide-line"
                  >
                    {(block.specifications || []).map((spec: any) => (
                      <div
                        key={spec.id}
                        {...getArrayItemAttributes(
                          {
                            ...identity,
                            field: "specifications",
                            rowId: spec.id,
                          },
                          active,
                        )}
                        className="demo:py-4"
                      >
                        <dt
                          {...field(
                            identity,
                            getArrayItemPath(
                              "specifications",
                              spec.id,
                              "label",
                            ),
                          )}
                          className="demo:text-sm demo:font-medium"
                        >
                          {spec.label}
                        </dt>
                        <dd
                          {...field(
                            identity,
                            getArrayItemPath(
                              "specifications",
                              spec.id,
                              "value",
                            ),
                          )}
                          className="demo:m-0 demo:mt-2 demo:text-sm demo:leading-relaxed demo:text-muted"
                        >
                          {spec.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {block.variants?.[0]?.details?.care?.length > 0 && (
                    <section
                      aria-label="Product care"
                      className="demo:rounded-lg demo:bg-soft demo:p-5"
                    >
                      <h2
                        {...field(identity, "careHeading")}
                        className="demo:m-0 demo:mb-3 demo:text-sm demo:font-medium"
                      >
                        {block.careHeading}
                      </h2>
                      <ul className="demo:m-0 demo:grid demo:gap-3 demo:ps-4 demo:text-sm demo:leading-relaxed demo:text-muted">
                        {block.variants[0].details.care.map((care: any) => {
                          const carePath = getArrayItemPath(
                            "variants",
                            block.variants[0].id,
                            "details.care",
                          );
                          return (
                            <li
                              key={care.id}
                              {...getArrayItemAttributes(
                                {
                                  ...identity,
                                  field: carePath,
                                  rowId: care.id,
                                },
                                active,
                              )}
                            >
                              <p
                                {...field(
                                  identity,
                                  getArrayItemPath(
                                    carePath,
                                    care.id,
                                    "instruction",
                                  ),
                                )}
                                className="demo:m-0"
                              >
                                {care.instruction}
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  )}
                </div>
              </div>
            </section>
          );
        if (block.blockType === "productGrid")
          return (
            <section
              id="collection"
              key={block.id}
              {...attrs}
              className={`${sectionClass} demo:py-12 demo:md:py-16 ${tone(block.background)}`}
            >
              <div className="demo:mb-8 demo:flex demo:flex-wrap demo:items-end demo:justify-between demo:gap-5">
                <div className="demo:grid demo:gap-3">
                  <h2
                    {...field(identity, "heading")}
                    className={`${titleClass} demo:text-4xl demo:md:text-5xl`}
                  >
                    {block.heading}
                  </h2>
                  <p {...field(identity, "description")} className={copyClass}>
                    {block.description}
                  </p>
                </div>
                <span
                  {...field(identity, "collectionLabel")}
                  className="demo:text-xs demo:tracking-wide demo:text-muted"
                >
                  {block.collectionLabel}
                </span>
              </div>
              <div
                {...list(identity, "cards")}
                className={`demo:grid demo:gap-7 demo:md:grid-cols-2 ${active && !block.cards?.length ? "demo:min-h-20" : ""}`}
              >
                {(block.cards || []).map((card: any) => {
                  const product = resolveProduct
                    ? resolveProduct(card.product)
                    : card.product;
                  const details = product?.presentation?.layout?.find(
                    (row: any) => row.blockType === "productDetails",
                  );
                  const cardPath = (name: string) =>
                    getArrayItemPath("cards", card.id, name);
                  return (
                    <article
                      key={card.id}
                      {...getArrayItemAttributes(
                        { ...identity, field: "cards", rowId: card.id },
                        active,
                      )}
                      className="demo:min-w-0"
                    >
                      <div {...field(identity, cardPath("image"))}>
                        {photo(
                          card.image || details?.image,
                          "demo:aspect-[5/4] demo:rounded-sm demo:[&_img]:object-[center_58%]",
                        )}
                      </div>
                      <div className="demo:flex demo:items-center demo:justify-between demo:gap-4 demo:pt-4">
                        <h3
                          {...field(identity, cardPath("heading"))}
                          className="demo:m-0 demo:text-base demo:font-medium"
                        >
                          {card.heading ?? details?.heading ?? product?.title}
                        </h3>
                        <span
                          {...field(identity, cardPath("priceCaption"))}
                          className="demo:text-sm demo:tabular-nums"
                        >
                          {card.priceCaption ?? money(details?.pricing)}
                        </span>
                      </div>
                      <p
                        {...field(identity, cardPath("description"))}
                        className="demo:m-0 demo:mt-2 demo:text-sm demo:text-muted"
                      >
                        {card.description}
                      </p>
                      <div className="demo:mt-2 demo:flex demo:items-center demo:gap-1">
                        <span
                          {...field(identity, cardPath("linkLabel"))}
                          className="demo:text-sm"
                        >
                          {card.linkLabel}
                        </span>
                        <a
                          {...field(identity, cardPath("product"), "panel")}
                          href={
                            product?.slug
                              ? `/products/${encodeURIComponent(product.slug)}`
                              : undefined
                          }
                          aria-label={`Open ${card.heading || product?.title || "product"}`}
                          className="demo:inline-flex demo:size-10 demo:items-center demo:justify-center demo:rounded-full demo:text-ink demo:hover:bg-soft demo:focus-visible:outline-2 demo:focus-visible:outline-offset-2 demo:focus-visible:outline-accent"
                        >
                          <ArrowRight size={18} aria-hidden="true" />
                        </a>
                      </div>
                    </article>
                  );
                })}
                <div
                  {...field(identity, "promo", "panel")}
                  className={`demo:flex demo:min-h-56 demo:flex-col demo:justify-between demo:gap-8 demo:rounded-sm demo:p-8 demo:md:p-12 ${tone(block.promo?.background)}`}
                >
                  <p
                    {...field(identity, "promo.eyebrow")}
                    className="demo:m-0 demo:text-xs demo:tracking-widest demo:uppercase demo:text-muted"
                  >
                    {block.promo?.eyebrow}
                  </p>
                  <p
                    {...field(identity, "promo.heading")}
                    className={`${titleClass} demo:max-w-xs demo:text-4xl`}
                  >
                    {block.promo?.heading}
                  </p>
                  <a
                    {...field(identity, "promo.action", "panel")}
                    href={href(block.promo?.action?.href)}
                    className="demo:inline-flex demo:min-h-10 demo:items-center demo:gap-3 demo:self-start demo:text-sm demo:text-ink demo:underline demo:underline-offset-4"
                  >
                    {block.promo?.action?.label}
                    <ArrowRight size={16} aria-hidden="true" />
                  </a>
                </div>
              </div>
            </section>
          );
        if (block.blockType === "editorial")
          return (
            <section
              id="studio-story"
              key={block.id}
              {...attrs}
              className={tone(block.background)}
            >
              <div
                className={`${sectionClass} demo:grid demo:items-center demo:gap-9 demo:py-12 demo:md:grid-cols-2 demo:md:gap-12 demo:lg:gap-20 demo:md:py-16 ${tone(block.background)}`}
              >
                <div {...field(identity, "image")}>
                  {photo(block.image, "demo:aspect-square demo:rounded-sm")}
                </div>
                <div className="demo:grid demo:gap-6">
                  <p
                    {...field(identity, "eyebrow")}
                    className="demo:m-0 demo:text-xs demo:tracking-widest demo:uppercase demo:text-muted"
                  >
                    {block.eyebrow}
                  </p>
                  <h2
                    {...field(identity, "heading")}
                    className={`${titleClass} demo:text-4xl demo:md:text-5xl`}
                  >
                    {block.heading}
                  </h2>
                  <p {...field(identity, "description")} className={copyClass}>
                    {block.description}
                  </p>
                  {block.body?.root && (
                    <div {...field(identity, "body")} className={copyClass}>
                      <RichText data={block.body} />
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        if (block.blockType === "faq")
          return (
            <section
              key={block.id}
              {...attrs}
              className={`${sectionClass} demo:py-12 demo:md:grid demo:md:grid-cols-2 demo:md:gap-12 demo:lg:gap-20 demo:md:py-16 ${tone(block.background)}`}
            >
              <h2
                {...field(identity, "heading")}
                className={`${titleClass} demo:mb-8 demo:text-4xl`}
              >
                {block.heading}
              </h2>
              <div
                {...list(identity, "items")}
                className={`demo:grid demo:gap-3 ${active && !block.items?.length ? "demo:min-h-20" : ""}`}
              >
                {(block.items || []).map((item: any) => (
                  <article
                    key={item.id}
                    {...getArrayItemAttributes(
                      { ...identity, field: "items", rowId: item.id },
                      active,
                    )}
                    className="demo:rounded-lg demo:border demo:border-solid demo:border-line demo:p-5"
                  >
                    <h3
                      {...field(
                        identity,
                        getArrayItemPath("items", item.id, "question"),
                      )}
                      className="demo:m-0 demo:text-sm demo:font-medium"
                    >
                      {item.question}
                    </h3>
                    <p
                      {...field(
                        identity,
                        getArrayItemPath("items", item.id, "answer"),
                      )}
                      className="demo:mb-0 demo:mt-4 demo:text-sm demo:leading-relaxed demo:text-muted"
                    >
                      {item.answer}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          );
        return null;
      })}
    </main>
  );
}

function money(pricing: any) {
  if (typeof pricing?.amount !== "number") return "";
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: pricing.currency || "EUR",
    maximumFractionDigits: 0,
  }).format(pricing.amount);
}

function tone(value: string) {
  return value === "sage"
    ? "demo:bg-soft"
    : value === "sand"
      ? "demo:bg-photo"
      : "demo:bg-canvas";
}

function href(value: unknown) {
  return typeof value === "string" && /^(?:#|\/(?!\/))/.test(value)
    ? value
    : undefined;
}
