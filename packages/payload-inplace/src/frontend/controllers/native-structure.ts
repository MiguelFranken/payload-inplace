"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useConfig,
  useDocumentInfo,
  useField,
  useForm,
  useFormFields,
} from "@payloadcms/ui";
import type { BlocksFieldClientProps, ClientBlock } from "payload";
import { availableBlocks } from "../../schema/available-blocks.js";
import { collectSections, type NativeSection } from "../../schema/tree.js";
import {
  applyCommand,
  restoreRoot,
  type BlockCommand,
} from "../../adapters/payload-form.js";
import { StructuralHistory } from "../../state/history.js";
import {
  structureTransitionError,
  type StructuralPolicy,
} from "../../state/policy.js";

/** Structural history/index only. Values and all persistence remain in the existing native Form.
 * Row metadata arrives in two phases; captureResult seals the single command after native fields initialize.
 */
export function useNativeStructure({
  root,
  collection,
  nonce,
  field,
  permissions,
  policy,
  disabled,
  onError,
}: {
  root: string;
  collection: string;
  nonce: string;
  field: BlocksFieldClientProps["field"];
  permissions: unknown;
  policy?: StructuralPolicy;
  disabled: boolean;
  onError: (message: string) => void;
}) {
  const form = useForm(),
    { config } = useConfig(),
    info = useDocumentInfo();
  const rootState = useField({ path: root, hasRows: true });
  const [generation, setGeneration] = useState(0);
  const history = useMemo(() => {
    void nonce;
    return new StructuralHistory(root);
  }, [root, nonce]);
  const fingerprint = useFormFields(([fields]) =>
    Object.entries(fields)
      .filter(
        ([path, state]) =>
          (path === root || path.startsWith(root + ".")) && state.rows,
      )
      .map(
        ([path, state]) =>
          `${path}:${state.rows?.map((row) => `${row.id}:${row.blockType}`).join(",")}`,
      )
      .join("|"),
  );
  const revision = info.data?.updatedAt;
  const sections = useMemo(() => {
    // These tokens describe updates in Payload's external mutable form store.
    void fingerprint;
    void generation;
    void revision;
    return collectSections({
      field,
      data: form.getDataByPath(root),
      root,
      schemaPath: `${collection}.${root}`,
      permissions,
      blocksMap: config.blocksMap as Record<string, ClientBlock>,
    });
  }, [
    field,
    form,
    root,
    collection,
    permissions,
    config.blocksMap,
    fingerprint,
    generation,
    revision,
  ]);
  useEffect(() => {
    void fingerprint;
    if (history.captureResult(form.getFields())) setGeneration((n) => n + 1);
  }, [fingerprint, form, history]);
  const invalidate = useCallback(
    (issue?: string) => {
      onError(issue || "");
      setGeneration((n) => n + 1);
      return issue;
    },
    [onError],
  );
  const commandFor = useCallback(
    (section: NativeSection, command: BlockCommand) =>
      invalidate(
        applyCommand(form, root, section.containerSchemaPath, command, {
          disabled: disabled || section.readOnly,
          min: section.field.minRows ?? (section.field.required ? 1 : 0),
          max: section.field.maxRows,
          allowed: availableBlocks(
            section.field,
            config.blocksMap as Record<string, ClientBlock>,
            form.getField(section.parent)?.blocksFilterOptions,
          ).map((b) => b.slug),
          policy: section.parent === root ? policy : undefined,
          history,
          container: section.parent,
        }),
      ),
    [form, root, disabled, config.blocksMap, policy, history, invalidate],
  );
  const rows = form.getDataByPath(root);
  const rootRows = Array.isArray(rows) ? rows : [];
  const atStart = (slug: string) =>
    policy?.first === slug && rootRows[0]?.blockType !== slug;
  const blockChoices = availableBlocks(
    field,
    config.blocksMap as Record<string, ClientBlock>,
    rootState.blocksFilterOptions,
  ).filter(
    (block) =>
      !structureTransitionError(
        rootRows,
        atStart(block.slug)
          ? [{ blockType: block.slug }, ...rootRows]
          : [...rootRows, { blockType: block.slug }],
        policy,
      ),
  );
  const add = (blockType: string) =>
    invalidate(
      applyCommand(
        form,
        root,
        `${collection}.${root}`,
        { type: "add", blockType, at: atStart(blockType) ? "start" : "end" },
        {
          disabled,
          min: field.minRows ?? (field.required ? 1 : 0),
          max: field.maxRows,
          allowed: blockChoices.map((b) => b.slug),
          policy,
          history,
        },
      ),
    );
  const undo = useCallback(
    (redo = false) => {
      if (disabled) return;
      const snapshot = redo
        ? history.redo(form.getFields())
        : history.undo(form.getFields());
      if (snapshot) invalidate(restoreRoot(form, root, snapshot));
    },
    [disabled, form, history, root, invalidate],
  );
  return {
    sections,
    history,
    generation,
    commandFor,
    add,
    undo,
    blockChoices,
    rootRows,
  };
}
