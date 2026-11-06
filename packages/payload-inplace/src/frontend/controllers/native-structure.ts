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
  useServerFunctions,
} from "@payloadcms/ui";
import type { BlocksFieldClientProps, ClientBlock, ClientField } from "payload";
import type { InsertionTarget } from "../../../../core/src/insertion.js";
import { useEditorMessages } from "../messages.js";
import { formatCommandIssue } from "../../i18n/command-issue.js";
import type { CommandIssue } from "../../state/command-issue.js";
import { authoredFieldKey } from "../../state/autosave.js";
import {
  nativeDocumentArgs,
  targetFromNativeInfo,
} from "../../state/document-target.js";
import { preparedInsertedRow } from "../../../../core/src/row-preparation.js";
import { previewExample } from "../../schema/example-preview.js";
import { resolveBinding } from "../../schema/resolve-binding.js";
import { selectionReset } from "../../schema/selection-reset.js";
import { canUpdateInlineField } from "../../schema/inline-access.js";
import { availableBlocks } from "../../schema/available-blocks.js";
import { resolveRootSchemaPath } from "../../schema/resolve.js";
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
  const { getFormState } = useServerFunctions();
  const messages = useEditorMessages();
  const renderIssue = useCallback(
    (issue: CommandIssue) => formatCommandIssue(messages, issue),
    [messages],
  );
  const patternPreparation = useRef<AbortController | null>(null);
  useEffect(() => () => patternPreparation.current?.abort(), [nonce]);
  useEffect(() => {
    if (disabled) patternPreparation.current?.abort();
  }, [disabled]);
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
  const rootSchemaPath = resolveRootSchemaPath(
    info.docConfig?.fields || [],
    root,
    collection,
  );
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
      schemaPath: rootSchemaPath,
      permissions,
      blocksMap: config.blocksMap as Record<string, ClientBlock>,
    });
  }, [
    field,
    form,
    root,
    collection,
    rootSchemaPath,
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
          renderIssue,
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
    [
      form,
      root,
      disabled,
      config.blocksMap,
      policy,
      history,
      invalidate,
      renderIssue,
    ],
  );
  /** Re-resolve the renderer binding at activation; a prior numeric row path is never reused. */
  function resetBinding(section: NativeSection, name: string) {
    if (disabled || section.readOnly || !section.block)
      return invalidate(renderIssue({ code: "read-only" }));
    const binding = resolveBinding({
      fields: section.block.fields,
      value: form.getDataByPath(section.path),
      binding: name,
      permissions: section.permissions,
    });
    const path = binding && `${section.path}.${binding.path}`;
    const parent = path?.slice(0, path.lastIndexOf("."));
    if (!binding || !path || !parent)
      return invalidate(renderIssue({ code: "read-only" }));
    const reset = selectionReset(
      binding,
      form.getField(binding?.row ? parent! : path!),
      path ? form.getDataByPath(path) : undefined,
      Boolean(
        binding &&
          canUpdateInlineField(section.permissions, binding.permissionPath),
      ),
    );
    if (!reset || !path || !parent)
      return invalidate(renderIssue({ code: "read-only" }));
    if (reset.kind === "remove") {
      if (
        !history.checkpoint(form.getFields(), parent, {
          kind: "remove",
          id: reset.id,
        })
      )
        return invalidate(renderIssue({ code: "preparing" }));
      form.removeFieldRow({ path: parent, rowIndex: reset.index });
    } else form.dispatchFields({ type: "UPDATE", path, value: reset.value });
    form.setModified(true);
    return invalidate();
  }
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
          renderIssue,
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
      if (snapshot) invalidate(restoreRoot(form, root, snapshot, renderIssue));
    },
    [disabled, form, history, root, invalidate, renderIssue],
  );
  function insertionOptions(target: InsertionTarget) {
    if (disabled) return;
    // Resolve from the current native values, including operations since a picker opened.
    const current = collectSections({
      field,
      data: form.getDataByPath(root),
      root,
      schemaPath: rootSchemaPath,
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
  async function insertPattern(
    target: InsertionTarget,
    pattern: { blockType: string; content: Record<string, unknown> },
  ) {
    patternPreparation.current?.abort();
    const request = new AbortController();
    patternPreparation.current = request;
    const options = insertionOptions(target);
    if (
      !options ||
      options.field.type !== "blocks" ||
      !options.choices.some((block) => block.slug === pattern.blockType)
    )
      throw Error("Pattern insertion is no longer available");
    const before = authoredFieldKey(form.getFields());
    const data = { ...form.getData() };
    const path = options.parent.split(".");
    let cursor: Record<string, any> = data;
    for (const segment of path.slice(0, -1)) {
      cursor[segment] = Array.isArray(cursor[segment])
        ? [...cursor[segment]]
        : { ...cursor[segment] };
      cursor = cursor[segment];
    }
    const values = form.getDataByPath(options.parent);
    const rows = Array.isArray(values) ? [...values] : [];
    // Preparation uses a temporary last row; the identity-based command resolves its actual insertion position again.
    const index = rows.length;
    rows.push({
      ...pattern.content,
      blockType: pattern.blockType,
      id: crypto.randomUUID().replaceAll("-", "").slice(0, 24),
    });
    cursor[path.at(-1)!] = rows;
    const result = await getFormState({
      ...nativeDocumentArgs(targetFromNativeInfo(info)),
      data,
      docPermissions: info.docPermissions,
      docPreferences: { fields: {} },
      operation: "update",
      schemaPath: collection,
      renderAllFields: true,
      returnLockStatus: false,
      skipValidation: false,
      signal: request.signal,
    });
    if (
      request.signal.aborted ||
      form.disabled ||
      before !== authoredFieldKey(form.getFields())
    )
      throw Error("Pattern preparation changed; choose the pattern again");
    const prefix = `${options.parent}.${index}.`;
    const state = Object.fromEntries(
      Object.entries(result.state || {})
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, value]) => [key.slice(prefix.length), value]),
    );
    if (!state.id) throw Error("Native pattern preparation failed");
    const issue = insert(target, pattern.blockType, state);
    if (issue) throw Error(issue);
  }
  function insert(
    target: InsertionTarget,
    blockType?: string,
    subFieldState?: import("payload").FormState,
  ) {
    const options = insertionOptions(target);
    if (!options)
      return invalidate(renderIssue({ code: "insertion-unavailable" }));
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
            subFieldState,
            ...(target.kind === "adjacent"
              ? { adjacent: { identity: target.identity, side: target.side } }
              : {}),
          },
      {
        container: parent,
        renderIssue,
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
    insertPattern,
    insert,
    history,
    generation,
    commandFor,
    resetBinding,
    add,
    undo,
    blockChoices,
    rootRows,
  };
}
