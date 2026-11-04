export type Message =
  | string
  | ({ other: string } & Partial<Record<Intl.LDMLPluralRule, string>>);
type Text<T> = T extends string
  ? T
  : T extends Record<string, unknown>
    ? Extract<T[keyof T], string>
    : never;
type Parameters<S extends string> =
  S extends `${string}{${infer Name}}${infer Rest}`
    ? Name | Parameters<Rest>
    : never;
type Args<T> = T extends string
  ? [Parameters<T>] extends [never]
    ? []
    : [values: Record<Parameters<T>, string | number>]
  : [
      values: { count: number } & Record<
        Exclude<Parameters<Text<T>>, "count">,
        string | number
      >,
    ];
/** UI locale/direction are independent of a document's content locale. Native data requests must not derive their locale from this contract. */
export interface MessageOptions<C extends Record<string, Message>> {
  locale?: string;
  direction?: "ltr" | "rtl";
  overrides?: Partial<{
    [K in keyof C]: C[K] extends string ? string : Message & object;
  }>;
}
/** Stable formatter surface preserves key and parameter inference across package declaration boundaries. */
export interface MessageTranslator<C extends Record<string, Message>> {
  readonly locale: string;
  readonly direction: "ltr" | "rtl";
  t: <K extends keyof C & string>(key: K, ...args: Args<C[K]>) => string;
  number: (value: number) => string;
  date: (
    value: Date | string | number,
    format?: Intl.DateTimeFormatOptions,
  ) => string;
}
const validMessage = (value: unknown): value is Message =>
  typeof value === "string" ||
  Boolean(
    value &&
      typeof value === "object" &&
      "other" in value &&
      typeof value.other === "string" &&
      Object.entries(value).every(
        ([key, text]) =>
          ["zero", "one", "two", "few", "many", "other"].includes(key) &&
          typeof text === "string",
      ),
  );
const placeholders = (value: Message) =>
  new Set(
    (typeof value === "string"
      ? [value]
      : Object.values(value).filter(
          (text): text is string => typeof text === "string",
        )
    ).flatMap((text) =>
      [...text.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(
        (match) => match[1]!,
      ),
    ),
  );
/** A framework-free typed formatter. Overrides with missing/extra placeholders fall back to the source definition; interpolation stays plain text, never HTML. */
export function createMessages<const C extends Record<string, Message>>(
  catalogue: C,
  options: MessageOptions<C> = {},
): MessageTranslator<C> {
  let locale = "en";
  try {
    locale = Intl.getCanonicalLocales(options.locale || "en")[0] || "en";
  } catch {
    /* Invalid consumer locale safely uses English formatting. */
  }
  const direction =
    options.direction ||
    (/^(ar|fa|he|ur)(?:-|$)/i.test(locale) ? "rtl" : "ltr");
  const plural = new Intl.PluralRules(locale),
    numbers = new Intl.NumberFormat(locale);
  function t<K extends keyof C & string>(key: K, ...args: Args<C[K]>): string {
    const source = catalogue[key];
    if (!Object.hasOwn(catalogue, key) || source === undefined)
      throw Error(`Unknown editor message: ${key}`);
    const override = options.overrides?.[key];
    let definition: Message = source;
    if (
      validMessage(override) &&
      (typeof override === "string") === (typeof source === "string")
    ) {
      const expected = placeholders(source),
        provided = placeholders(override);
      if (
        expected.size === provided.size &&
        [...expected].every((name) => provided.has(name))
      )
        definition = override;
    }
    const values = (args[0] || {}) as Record<string, string | number>,
      count = values.count;
    if (
      typeof definition !== "string" &&
      (typeof count !== "number" || !Number.isFinite(count))
    )
      throw Error("Plural messages require a finite count");
    const text =
      typeof definition === "string"
        ? definition
        : definition[
            typeof count === "number" ? plural.select(count) : "other"
          ] || definition.other;
    return text.replace(
      /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g,
      (_match, name: string) => {
        const value = values[name];
        if (typeof value !== "string" && typeof value !== "number")
          throw Error(`Missing message parameter: ${name}`);
        return typeof value === "number" ? numbers.format(value) : value;
      },
    );
  }
  return {
    locale,
    direction,
    t,
    number: (value: number) => numbers.format(value),
    date: (
      value: Date | string | number,
      format: Intl.DateTimeFormatOptions = {
        dateStyle: "medium",
        timeStyle: "short",
      },
    ) => new Intl.DateTimeFormat(locale, format).format(new Date(value)),
  };
}
