"use client";

import { useEditorMessages } from "@payload-inplace/ui/localization/EditorMessages";

import { NativeFieldSlot } from "./field-ownership";
import { useVisualEditor } from "./tools-context";

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
  const { t } = useEditorMessages();

  const editor = useVisualEditor();
  if (scope === "selection" && !editor.selection)
    return <p>{t("selectASectionOnThePageToSeeIts")}</p>;
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
