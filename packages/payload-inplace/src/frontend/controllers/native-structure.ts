"use client";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useConfig,
  useDocumentInfo,
  useField,
  useForm,
  useFormFields,
} from "@payloadcms/ui";
import type { BlocksFieldClientProps, ClientBlock, ClientField } from "payload";
import type { InsertionTarget } from "../../../../core/src/insertion.js";
import { preparedInsertedRow } from "../../../../core/src/row-preparation.js";
import { previewExample } from "../../schema/example-preview.js";
import { resolveBinding } from "../../schema/resolve-binding.js";
import { canUpdateInlineField } from "../../schema/inline-access.js";
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
  onInserted,
}: {
  root: string;
  collection: string;
  nonce: string;
  field: BlocksFieldClientProps["field"];
  permissions: unknown;
  policy?: StructuralPolicy;
  disabled: boolean;
  onError: (message: string) => void;
  onInserted?: (row: {
    id: string;
    path: string;
    target: InsertionTarget;
    blockType?: string;
  }) => boolean;
}) {
  const form = useForm(),
    { config } = useConfig(),
    info = useDocumentInfo();
  const pending = useRef<
    | {
        target: InsertionTarget;
        container: string;
        before: Set<string>;
      }
    | undefined
  >(undefined);
  const inserted = useEffectEvent(
    (row: {
      id: string;
      path: string;
      target: InsertionTarget;
      blockType?: string;
    }) => onInserted?.(row),
  );
  const prepared = useFormFields(([fields]) => {
    const intent = pending.current;
    if (!intent) return "";
    const row = preparedInsertedRow(fields, intent.container, intent.before);
    return row ? JSON.stringify(row) : "";
  });
  useEffect(() => {
    pending.current = undefined;
  }, [nonce]);
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
    void prepared;
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
    prepared,
    revision,
  ]);
  useEffect(() => {
    const intent = pending.current;
    if (!prepared || !intent) return;
    const row = JSON.parse(prepared) as {
      id: string;
      path: string;
      blockType?: string;
    };
    if (inserted({ ...row, target: intent.target }))
      pending.current = undefined;
  }, [prepared, sections]);
  useEffect(() => {
    void fingerprint;
    if (history.captureResult(form.getFields())) setGeneration((n) => n + 1);
  }, [fingerprint, prepared, form, history]);
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
  function insertionOptions(target: InsertionTarget) {
    if (disabled) return;
    // Resolve from the current native values, including operations since a picker opened.
    const current = collectSections({
      field,
      data: form.getDataByPath(root),
      root,
      schemaPath: `${collection}.${root}`,
      permissions,
      blocksMap: config.blocksMap as Record<string, ClientBlock>,
    });
    const same = (identity: import("../../types.js").BlockIdentity) =>
      current.find(
        (s) =>
          s.identity.blockId === identity.blockId &&
          JSON.stringify(s.identity.ancestors || []) ===
            JSON.stringify(identity.ancestors || []),
      );
    const section =
      target.kind === "adjacent" || target.identity
        ? same(target.identity!)
        : undefined;
    let nativeField: ClientField = { ...field, type: "blocks" },
      parent = root,
      schema = `${collection}.${root}`,
      readonly = false;
    if (target.kind === "adjacent") {
      if (!section) return;
      nativeField = { ...section.field, type: "blocks" };
      parent = section.parent;
      schema = section.containerSchemaPath;
      readonly = section.readOnly;
    } else if (target.identity) {
      if (!section || !target.field) return;
      const binding = resolveBinding({
        fields: section.block?.fields || [],
        value: form.getDataByPath(section.path),
        binding: target.field,
        permissions: section.permissions,
      });
      if (
        !binding ||
        binding.row ||
        !canUpdateInlineField(section.permissions, binding.permissionPath)
      )
        return;
      nativeField = binding.field;
      parent = `${section.path}.${binding.path}`;
      schema = `${section.schemaPath}.${binding.schemaPath}`;
      readonly = section.readOnly || binding.readOnly;
    } else if (target.root !== root || target.field) return;
    if (
      readonly ||
      nativeField.admin?.readOnly ||
      !["array", "blocks"].includes(nativeField.type) ||
      form.getField(parent)?.passesCondition === false
    )
      return;
    const f = nativeField as Extract<ClientField, { type: "blocks" | "array" }>;
    const values = form.getDataByPath(parent),
      rows = Array.isArray(values) ? values : [];
    if (f.maxRows !== undefined && rows.length >= f.maxRows) return;
    const choices =
      f.type === "blocks"
        ? availableBlocks(
            f,
            config.blocksMap as Record<string, ClientBlock>,
            form.getField(parent)?.blocksFilterOptions,
          ).filter((block) => {
            const next = [...rows];
            const index =
              target.kind === "adjacent" && section
                ? section.index + (target.side === "after" ? 1 : 0)
                : next.length;
            next.splice(index, 0, { blockType: block.slug });
            return !structureTransitionError(
              rows,
              next,
              parent === root ? policy : undefined,
            );
          })
        : [];
    if (f.type === "blocks" && !choices.length) return;
    return { field: f, parent, schema, choices };
  }
  function previewInsertion(
    target: InsertionTarget,
    blockType: string,
    example: Record<string, unknown>,
  ) {
    const options = insertionOptions(target),
      block = options?.choices.find((block) => block.slug === blockType);
    if (!options || !block) return;
    const projection = previewExample(
      block.fields,
      example,
      true,
      config.blocksMap as Record<string, ClientBlock>,
    );
    return {
      target,
      row: {
        ...projection,
        blockType,
        id: `ve-preview-${crypto.randomUUID()}`,
      },
    };
  }
  function insert(target: InsertionTarget, blockType?: string) {
    const options = insertionOptions(target);
    if (!options)
      return invalidate("This insertion point is no longer available.");
    const { field: f, parent, schema, choices } = options;
    pending.current = {
      target,
      container: parent,
      before: new Set(
        (form.getField(parent)?.rows || []).map((row) => String(row.id)),
      ),
    };
    const issue = applyCommand(
      form,
      root,
      schema,
      f.type === "array"
        ? { type: "add-array" }
        : {
            type: "add",
            blockType: blockType || "",
            ...(target.kind === "adjacent"
              ? { adjacent: { identity: target.identity, side: target.side } }
              : {}),
          },
      {
        container: parent,
        disabled,
        min: f.minRows ?? (f.required ? 1 : 0),
        max: f.maxRows,
        allowed: choices.map((b) => b.slug),
        policy: parent === root ? policy : undefined,
        history,
      },
    );
    if (issue) pending.current = undefined;
    return invalidate(issue);
  }
  const cancelInsertionIntent = useCallback(() => {
    pending.current = undefined;
  }, []);
  return {
    sections,
    cancelInsertionIntent,
    insertionOptions,
    previewInsertion,
    insert,
    history,
    generation,
    commandFor,
    add,
    undo,
    blockChoices,
    rootRows,
  };
}
