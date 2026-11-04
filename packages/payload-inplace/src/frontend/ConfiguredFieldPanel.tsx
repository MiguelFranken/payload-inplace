"use client";
import { NativeFieldSlot } from "./field-ownership.js";
import { useVisualEditor } from "./tools-context.js";
/** Declarative field panels reuse native controls; consumers only list existing field paths. */
export function ConfiguredFieldPanel({
  fields,
  scope = "document",
  blockTypes,
}: {
  fields: string[];
  scope?: "document" | "selection";
  blockTypes?: string[];
}) {
  const editor = useVisualEditor();
  if (scope === "selection" && !editor.selection)
    return <p>Select a section on the page to see its options.</p>;
  return (
    <div className="pve:grid pve:gap-4">
      {fields.map((path) => (
        <NativeFieldSlot
          key={path}
          path={path}
          scope={scope}
          blockTypes={blockTypes}
        />
      ))}
    </div>
  );
}
