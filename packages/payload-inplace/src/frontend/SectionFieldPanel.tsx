"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { RenderFields } from "@payloadcms/ui";
import { useEditorMessages } from "@payload-inplace/ui/localization/EditorMessages";
import { fieldOwnershipPaths } from "../schema/project-fields";
import type { projectSectionFieldPanel } from "../schema/section-field-panel";
import { focusNativeField } from "./focus-native-field";
import {
  ContextualFieldEditor,
  type FieldStrategyDefinition,
  type StrategyMatch,
} from "./field-strategies";
import { NativeFieldsOwner } from "./field-ownership";

/** Mounts one native owner for the selected panel and restores focus to its current field path. */
export function SectionFieldPanel({
  panel,
  sectionPath,
  field,
  disabled,
  contextual,
  children,
}: {
  panel: ReturnType<typeof projectSectionFieldPanel>;
  sectionPath: string;
  field?: string;
  disabled: boolean;
  contextual?: { definition: FieldStrategyDefinition; match: StrategyMatch };
  children?: ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const { t } = useEditorMessages();
  const { fields, path, schemaPath, permissions, readOnly, focusPath } = panel;

  useEffect(() => {
    if (container.current)
      return focusNativeField(container.current, focusPath);
  }, [sectionPath, focusPath]);

  const nativeFields = fields.length ? (
    <RenderFields
      margins="small"
      fields={fields}
      parentPath={path}
      parentSchemaPath={schemaPath}
      parentIndexPath=""
      permissions={permissions}
      readOnly={disabled || readOnly}
      forceRender
    />
  ) : null;

  return (
    <div ref={container}>
      {nativeFields ? (
        <NativeFieldsOwner
          key={`${path}:${field || "all"}`}
          paths={fieldOwnershipPaths(fields, path)}
        >
          {contextual ? (
            <ContextualFieldEditor
              definition={contextual.definition}
              context={contextual.match}
              disabled={disabled}
              fallback={nativeFields}
            />
          ) : (
            nativeFields
          )}
        </NativeFieldsOwner>
      ) : (
        <p>{t("thisContentIsNoLongerAvailableAtThisLocation")}</p>
      )}
      {children}
    </div>
  );
}
