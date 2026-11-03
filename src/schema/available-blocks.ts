import type { BlocksFieldClientProps, ClientBlock } from "payload";
/** Resolve native blockReferences and dynamic add filters without hiding existing rows. An empty native filter explicitly allows no additions. */
export function availableBlocks(
  field: BlocksFieldClientProps["field"],
  blocksMap: Record<string, ClientBlock>,
  filter?: string[],
): ClientBlock[] {
  return (field.blockReferences?.length ? field.blockReferences : field.blocks)
    .map((block) => (typeof block === "string" ? blocksMap[block] : block))
    .filter(
      (block): block is ClientBlock =>
        Boolean(block) && (filter === undefined || filter.includes(block.slug)),
    );
}
