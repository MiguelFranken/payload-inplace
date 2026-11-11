import {
  docAccessOperation,
  docAccessOperationGlobal,
  type BlocksFieldClientProps,
  type ClientBlock,
  type SanitizedGlobalConfig,
} from "payload";
import type { EditorActionBlock, EditorCapabilityContext } from "../types";
import { resolveRoot } from "../schema/resolve";
import { collectSections } from "../schema/tree";
import { nativeDocumentConfig } from "./document";

/** Resolve a menu action against the current native schema, saved rows and document permissions. */
export async function resolveActionBlock(
  { req, target, document }: EditorCapabilityContext,
  input: unknown,
  blockTypes: readonly string[],
): Promise<EditorActionBlock | undefined> {
  if (!input || typeof input !== "object") return;
  const { root, blockId, ancestors = [] } = input as Record<string, unknown>;
  if (
    root !== target.root ||
    typeof blockId !== "string" ||
    !blockId ||
    blockId.length > 128 ||
    !Array.isArray(ancestors) ||
    ancestors.length > 32 ||
    ancestors.some((id) => typeof id !== "string" || !id || id.length > 128)
  )
    return;

  const entity = nativeDocumentConfig(req, target);
  const field = resolveRoot(entity.fields, target.root);
  const data = { ...document, _status: "draft" };
  const permissions =
    target.kind === "global"
      ? await docAccessOperationGlobal({
          globalConfig: entity as SanitizedGlobalConfig,
          data,
          req,
        })
      : await docAccessOperation({
          collection: req.payload.collections[target.collection as never],
          id: target.id,
          data,
          req,
        });
  const segments = target.root.split(".");
  let rootPermissions: any = permissions;
  for (const segment of segments) {
    rootPermissions =
      rootPermissions === true ? true : rootPermissions?.fields?.[segment];
    if (
      rootPermissions === false ||
      rootPermissions?.read === false ||
      rootPermissions?.update === false
    )
      return;
  }
  const sections = collectSections({
    field: field as unknown as BlocksFieldClientProps["field"],
    data: segments.reduce<unknown>(
      (value, key) => (value as Record<string, unknown> | undefined)?.[key],
      document,
    ),
    root: target.root,
    permissions: rootPermissions,
    readOnly: field.admin?.readOnly === true,
    blocksMap: Object.fromEntries(
      (req.payload.config.blocks || []).map((block) => [
        block.slug,
        block as unknown as ClientBlock,
      ]),
    ),
  });
  const matches = sections.filter(
    ({ identity }) =>
      identity.blockId === blockId &&
      identity.ancestors?.length === ancestors.length &&
      identity.ancestors.every((id, index) => id === ancestors[index]),
  );
  const [section] = matches;
  const blockType = section?.block?.slug;
  if (
    matches.length !== 1 ||
    section.readOnly ||
    !blockType ||
    !blockTypes.includes(blockType)
  )
    return;
  return { identity: section.identity, blockType, path: section.path };
}
