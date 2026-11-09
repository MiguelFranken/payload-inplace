import {
  docAccessOperation,
  docAccessOperationGlobal,
  type ClientBlock,
  type ClientField,
  type BlocksFieldClientProps,
  type PayloadRequest,
  type SanitizedGlobalConfig,
} from "payload";
import type { EditorCapabilityContext, VisualEditorOptions } from "../types";
import { readEditContext } from "./context";
import { nativeDocumentConfig } from "./document";
import { resolveRoot } from "../schema/resolve";
import { collectSections } from "../schema/tree";
import { copyPatternFields } from "../schema/pattern-copy";

/** Reauthorize a library operation independently from draft editing; the adapter must enforce its own storage/tenant ACL too. */
export async function patternOperation(
  req: PayloadRequest,
  options: VisualEditorOptions,
  input: {
    proof: string;
    operation: "list" | "read" | "save";
    page?: number;
    id?: string;
    label?: string;
    identity?: import("../types").BlockIdentity;
    expectedRevision?: unknown;
  },
) {
  const adapter = options.patterns;
  if (!adapter || options.disabled) throw Error("Patterns unavailable");
  const { context, document } = await readEditContext(
    req,
    input.proof,
    options,
  );
  const capability: EditorCapabilityContext = {
    req,
    target: context.target,
    document,
  };
  const operation = input.operation === "save" ? "save" : "read";
  if (!(await adapter.authorize({ ...capability, operation })))
    throw Error("Pattern access denied");
  const entity = nativeDocumentConfig(req, context.target);
  const root = resolveRoot(entity.fields, context.target.root);
  const blocks = Object.fromEntries(
    (req.payload.config.blocks || []).map((block) => [block.slug, block]),
  ) as unknown as Record<string, ClientBlock>;
  const choices = (root.blockReferences || root.blocks).map((block) =>
    typeof block === "string" ? blocks[block] : block,
  );
  const allowed = new Set(
    adapter.allowedBlocks.filter((slug) =>
      choices.some((block) => block?.slug === slug),
    ),
  );
  const validSummary = (value: import("../types").SectionPatternSummary) =>
    typeof value.id === "string" &&
    value.id.length > 0 &&
    value.id.length <= 128 &&
    typeof value.label === "string" &&
    value.label.length > 0 &&
    value.label.length <= 120 &&
    allowed.has(value.blockType);
  if (input.operation === "list") {
    const result = await adapter.list({
      ...capability,
      page: input.page || 1,
      limit: 20,
    });
    return {
      docs: result.docs.slice(0, 20).filter(validSummary),
      hasNextPage: Boolean(result.hasNextPage),
    };
  }
  const permissions =
    context.target.kind === "global"
      ? await docAccessOperationGlobal({
          globalConfig: entity as SanitizedGlobalConfig,
          data: { ...document, _status: "draft" },
          req,
        })
      : await docAccessOperation({
          collection:
            req.payload.collections[context.target.collection as never],
          id: context.target.id,
          data: { ...document, _status: "draft" },
          req,
        });
  const rootPermission = context.target.root
    .split(".")
    .reduce((p: any, key) => p?.fields?.[key], permissions);
  if (input.operation === "read") {
    if (typeof input.id !== "string" || !input.id || input.id.length > 128)
      throw Error("Invalid pattern identity");
    const stored = await adapter.read({ ...capability, id: input.id });
    const block = choices.find((block) => block?.slug === stored.blockType);
    if (!block || !allowed.has(block.slug))
      throw Error("Pattern block is no longer allowed");
    const blockPermission =
      rootPermission === true ? true : rootPermission?.blocks?.[block.slug];
    if (
      blockPermission === false ||
      blockPermission?.read === false ||
      blockPermission?.update === false
    )
      throw Error("Pattern field access denied");
    const content = copyPatternFields(
      block.fields as ClientField[],
      stored.content,
      blockPermission === true ? true : blockPermission?.fields,
      blocks,
    );
    if (JSON.stringify(content).length > 262144)
      throw Error("Pattern is too large");
    return { blockType: block.slug, content };
  }
  if (
    !adapter.save ||
    typeof input.label !== "string" ||
    !input.label.trim() ||
    input.label.trim().length > 120 ||
    !input.identity ||
    input.expectedRevision !== (document._veRevision ?? document.updatedAt)
  )
    throw Error("Save and review the current section before saving a pattern");
  const sections = collectSections({
    field: root as unknown as BlocksFieldClientProps["field"],
    root: context.target.root,
    data: context.target.root
      .split(".")
      .reduce<any>((value, key) => value?.[key], document),
    permissions: rootPermission,
    blocksMap: blocks,
  });
  const section = sections.find(
    (section) =>
      section.identity.blockId === input.identity!.blockId &&
      JSON.stringify(section.identity.ancestors || []) ===
        JSON.stringify(input.identity!.ancestors || []),
  );
  if (
    !section?.block ||
    section.parent !== context.target.root ||
    section.readOnly ||
    !allowed.has(section.block.slug)
  )
    throw Error("Section is not eligible for patterns");
  const content = copyPatternFields(
    section.block.fields,
    section.value,
    section.permissions,
    blocks,
  );
  if (JSON.stringify(content).length > 262144)
    throw Error("Pattern is too large");
  const result = await adapter.save({
    ...capability,
    label: input.label.trim(),
    blockType: section.block.slug,
    content,
  });
  if (!validSummary(result)) throw Error("Invalid pattern storage response");
  return result;
}

/** Opt-in, origin-checked library transport; it never saves the edited document. */
export async function patternEndpoint(
  req: PayloadRequest,
  options: VisualEditorOptions,
  origins: ReadonlySet<string>,
) {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  if (!origins.has(req.headers.get("origin") || ""))
    return Response.json(
      { error: "Patterns unavailable" },
      { status: 403, headers },
    );
  try {
    const input = await req.json?.();
    if (
      !input ||
      JSON.stringify(input).length > 8192 ||
      typeof input.proof !== "string" ||
      !["list", "read", "save"].includes(input.operation) ||
      (input.page !== undefined &&
        (!Number.isSafeInteger(input.page) ||
          input.page < 1 ||
          input.page > 100))
    )
      throw Error("Invalid pattern request");
    return Response.json(await patternOperation(req, options, input), {
      headers,
    });
  } catch {
    return Response.json(
      { error: "Pattern operation unavailable" },
      { status: 403, headers },
    );
  }
}
