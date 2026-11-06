import {
  getArrayItemPath,
  getBlockAttributes,
  getFieldAttributes,
  getFieldGroupAttributes,
} from "./annotations.js";
import { documentKey, type DocumentReference } from "./document-ref.js";
import type { BlockIdentity } from "./types.js";

type Depth = [never, 0, 1, 2, 3, 4];

/** Bounded path inference keeps consumer typechecking predictable for recursive Payload JSON. */
export type BindingPath<T, D extends number = 4> = D extends 0
  ? never
  : T extends readonly (infer Item)[]
    ?
        | `${number}`
        | `@${string}`
        | `${number | `@${string}`}.${BindingPath<NonNullable<Item>, Depth[D & keyof Depth] & number>}`
    : T extends object
      ? {
          [K in keyof T & string]-?:
            | K
            | (NonNullable<T[K]> extends object
                ? `${K}.${BindingPath<NonNullable<T[K]>, Depth[D & keyof Depth] & number>}`
                : never);
        }[keyof T & string]
      : never;

type ArrayKey<T> = string extends keyof T
  ? string
  : {
      [K in keyof T & string]-?: NonNullable<T[K]> extends readonly unknown[]
        ? K
        : never;
    }[keyof T & string];

type Dynamic<T> = unknown extends T ? Record<string, unknown> : NonNullable<T>;

type Row<T, K extends keyof T> = unknown extends T[K]
  ? Record<string, unknown>
  : NonNullable<T[K]> extends readonly (infer Item)[]
    ? Item
    : never;

export type BindingAttributes = Readonly<Record<string, string>>;

/** A consumer places each terminal/row/list annotation exactly where the CMS value is rendered. */
export interface BoundBlock<T = Record<string, unknown>> {
  attrs: BindingAttributes;
  field: (
    path: BindingPath<T>,
    options?: { edit?: "auto" | "inline" | "panel" },
  ) => BindingAttributes;
  group: (paths: readonly BindingPath<T>[]) => BindingAttributes;
  row: <K extends ArrayKey<T>>(
    array: K,
    id: string | number,
  ) => BoundBlock<Row<T, K>>;
  scope: <K extends keyof T & string>(field: K) => BoundBlock<Dynamic<T[K]>>;
  list: (array: ArrayKey<T>, label?: string) => BindingAttributes;
}

/** Path validation is also applied at runtime for generated/dynamic component schemas. */
export function isBindingPath(path: string): boolean {
  if (!path || path.length > 1024) return false;
  return path.split(".").every((part) => {
    if (!part || ["__proto__", "prototype", "constructor"].includes(part))
      return false;
    if (part.startsWith("@")) {
      try {
        return Boolean(decodeURIComponent(part.slice(1)));
      } catch {
        return false;
      }
    }
    return /^[A-Za-z_$][\w$-]*$/.test(part) || /^\d+$/.test(part);
  });
}

/** Bind provenance once, then annotate typed block fields, stable array rows and empty lists.
 * Disabled helpers emit nothing and import no editor/browser runtime.
 */
export function editable(
  document: DocumentReference,
  { enabled = false }: { enabled?: boolean } = {},
) {
  const provenance: Record<string, string> = enabled
    ? { "data-ve-document": documentKey(document) }
    : {};
  const path = (value: string) => {
    if (enabled && !isBindingPath(value))
      throw new TypeError(`Invalid editable path: ${value}`);
    return value;
  };
  function bindBlock<T = Record<string, unknown>>(
    identity: BlockIdentity,
    prefix = "",
    row = false,
  ): BoundBlock<T> {
    const full = (value: string) => path(prefix ? `${prefix}.${value}` : value);
    if (enabled) {
      path(identity.root);
      if (!identity.blockId)
        throw new TypeError("A block binding requires a stable row ID");
    }
    const attrs: Record<string, string> = enabled
      ? { ...getBlockAttributes(identity, true), ...provenance }
      : {};
    if (enabled && row) {
      attrs["data-ve-field"] = prefix;
      attrs["data-ve-edit"] = "panel";
    }
    return {
      attrs,
      field: (value, options) =>
        enabled
          ? {
              ...getFieldAttributes(
                { ...identity, field: full(value), ...options },
                true,
              ),
              ...provenance,
            }
          : {},
      group: (values) =>
        enabled
          ? {
              ...getFieldGroupAttributes(
                { ...identity, fields: values.map((value) => full(value)) },
                true,
              ),
              ...provenance,
            }
          : {},
      row: (array, id) =>
        bindBlock(identity, getArrayItemPath(full(array), id), true),
      scope: (value) => bindBlock(identity, full(value), true),
      list: (array, label) =>
        enabled
          ? {
              ...getBlockAttributes(identity, true),
              ...provenance,
              "data-ve-list": full(array),
              ...(label ? { "data-ve-list-label": label } : {}),
            }
          : {},
    };
  }
  return {
    block: <T = Record<string, unknown>>(
      identity: BlockIdentity,
    ): BoundBlock<T> => bindBlock<T>(identity),
    /** A root container needs no existing row; this makes empty block roots insertable. */
    list: (root: string, label?: string): BindingAttributes =>
      enabled
        ? {
            ...provenance,
            "data-ve-root": path(root),
            "data-ve-list": "",
            ...(label ? { "data-ve-list-label": label } : {}),
          }
        : {},
  };
}
