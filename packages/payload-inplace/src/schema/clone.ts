import type { Field } from "payload";

/** Clone only schema containers we modify; editor instances, callbacks, regexes and host metadata retain identity. */
export function cloneFields(fields: Field[]): Field[] {
  return fields.map((field) => {
    const copy: any = { ...field };
    if ("fields" in field) copy.fields = cloneFields(field.fields);
    if (field.type === "tabs")
      copy.tabs = field.tabs.map((tab) => ({
        ...tab,
        fields: cloneFields(tab.fields),
      }));
    if (field.type === "blocks") {
      copy.blocks = field.blocks.map((block) => ({
        ...block,
        fields: cloneFields(block.fields),
      }));
      if (field.blockReferences)
        copy.blockReferences = field.blockReferences.map((block) =>
          typeof block === "string"
            ? block
            : { ...block, fields: cloneFields(block.fields) },
        );
    }
    return copy;
  });
}
