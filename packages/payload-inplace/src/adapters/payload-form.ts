import { commandIssueText, type CommandIssue } from "../state/command-issue";
import type { FormState } from "payload";
import type { useForm } from "@payloadcms/ui";
import type { BlockIdentity } from "../types";
import {
  snapshotRoot,
  materializeStructuralRestore,
} from "../state/history";
import { indexBlocks, resolveIdentity } from "../state/identity";
import { structureTransitionIssue } from "../state/policy";
import type { StructuralPolicy } from "../state/policy";
import type { StructuralHistory } from "../state/history";

type NativeForm = ReturnType<typeof useForm>;

export type BlockCommand =
  | {
      type: "add";
      blockType: string;
      /** Prepared by native form-state for an optional independent pattern copy. */
      subFieldState?: FormState;
      at?: "start" | "end";
      adjacent?: { identity: BlockIdentity; side: "before" | "after" };
    }
  | { type: "add-array"; at?: "start" | "end" }
  | { type: "move"; identity: BlockIdentity; over: BlockIdentity }
  | { type: "up" | "down" | "remove" | "duplicate"; identity: BlockIdentity };

/** Single structural command service for tree, canvas and keyboard; current identity is resolved at execution. */
export function applyCommand(
  form: NativeForm,
  root: string,
  schemaPath: string,
  command: BlockCommand,
  options: {
    renderIssue?: (issue: CommandIssue) => string;
    container?: string;
    disabled: boolean;
    min: number;
    max?: number;
    allowed: string[];
    policy?: StructuralPolicy;
    history: StructuralHistory;
  },
): string | undefined {
  const failure = options.renderIssue || commandIssueText;
  if (options.disabled) return failure({ code: "read-only" });
  const container = options.container ?? root;
  const rootValue = form.getDataByPath(root),
    containerValue = form.getDataByPath(container);
  const rootData = Array.isArray(rootValue) ? rootValue : [];
  const data = Array.isArray(containerValue) ? containerValue : [];
  const adding = command.type === "add" || command.type === "add-array";
  const hit = adding
    ? undefined
    : resolveIdentity(indexBlocks(rootData, root), command.identity);
  if (!adding && !hit) return failure({ code: "missing-section" });
  if (hit?.parent !== undefined && hit.parent !== container)
    return failure({ code: "nested-controls" });
  const index = hit?.index ?? data.length;
  const destination =
    command.type === "move"
      ? resolveIdentity(indexBlocks(rootData, root), command.over)
      : undefined;
  if (
    command.type === "move" &&
    (!destination || destination.parent !== container)
  )
    return failure({ code: "different-container" });
  if (command.type === "move" && destination?.index === index) return;
  const to =
    command.type === "move"
      ? destination!.index
      : index + (command.type === "up" ? -1 : 1);
  const anchor =
    command.type === "add" && command.adjacent
      ? resolveIdentity(indexBlocks(rootData, root), command.adjacent.identity)
      : undefined;
  if (
    command.type === "add" &&
    command.adjacent &&
    (!anchor || anchor.parent !== container)
  )
    return failure({ code: "missing-anchor" });
  const insertIndex =
    anchor && command.type === "add"
      ? anchor.index + (command.adjacent?.side === "after" ? 1 : 0)
      : adding && command.at === "start"
        ? 0
        : data.length;
  const next = [...data];
  if (command.type === "add") {
    if (!options.allowed.includes(command.blockType))
      return failure({ code: "block-disallowed" });
    next.splice(insertIndex, 0, { blockType: command.blockType });
  } else if (command.type === "add-array") next.splice(insertIndex, 0, {});
  else if (command.type === "remove") next.splice(index, 1);
  else if (command.type === "duplicate") {
    if (!options.allowed.includes(data[index].blockType))
      return failure({ code: "duplicate-disallowed" });
    next.splice(index + 1, 0, data[index]);
  } else {
    if (to < 0 || to >= data.length) return failure({ code: "boundary" });
    next.splice(to, 0, ...next.splice(index, 1));
  }
  if (next.length < options.min && next.length < data.length)
    return failure({ code: "min-sections", count: options.min });
  if (
    options.max !== undefined &&
    next.length > options.max &&
    next.length > data.length
  )
    return failure({ code: "max-sections", count: options.max });
  const error = structureTransitionIssue(data, next, options.policy);
  if (error) return failure(error);
  if (
    !options.history.checkpoint(form.getFields(), container, {
      kind: command.type === "add-array" ? "add" : command.type,
      id:
        adding || command.type === "duplicate"
          ? undefined
          : command.identity.blockId,
    })
  )
    return failure({ code: "preparing" });
  if (command.type === "add")
    form.addFieldRow({
      path: container,
      schemaPath,
      blockType: command.blockType,
      rowIndex: insertIndex,
      subFieldState: command.subFieldState,
    });
  else if (command.type === "add-array")
    form.addFieldRow({ path: container, schemaPath, rowIndex: insertIndex });
  else if (command.type === "remove")
    form.removeFieldRow({ path: container, rowIndex: index });
  else if (command.type === "duplicate") {
    const state = duplicateRowState(form.getFields(), `${container}.${index}`);
    form.addFieldRow({
      path: container,
      schemaPath,
      blockType: data[index].blockType,
      rowIndex: index + 1,
      subFieldState: state,
    });
  } else
    form.moveFieldRow({
      path: container,
      moveFromIndex: index,
      moveToIndex: to,
    });
  form.setModified(true);
}

/** Restore only the recorded structural operation; live row content, nested edits and current revision/metadata remain current. */
export function restoreRoot(
  form: NativeForm,
  root: string,
  snapshot: FormState,
  renderIssue: (issue: CommandIssue) => string = commandIssueText,
) {
  const result = materializeStructuralRestore(
    form.getFields(),
    snapshot,
    root,
    renderIssue,
  );
  if (typeof result === "string") return result;
  for (const path of Object.keys(form.getFields()))
    if (path === result.path || path.startsWith(result.path + "."))
      form.dispatchFields({ type: "REMOVE", path });
  form.dispatchFields({ type: "UPDATE_MANY", formState: result.fields });
  form.setModified(true);
}

/** Typing/Lexical and modal owners keep their native undo shortcuts. */
export function ownsTypingOrModal(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="dialog"]:not([data-ve-workspace-dialog]),dialog[open]:not([data-ve-workspace-dialog]),.drawer',
      ),
    )
  );
}

/** Clone the native row slice and regenerate every nested row ID, including non-ObjectID custom identities. */
export function duplicateRowState(
  fields: FormState,
  rowPath: string,
): FormState {
  const snapshot = snapshotRoot(fields, rowPath);
  const state: FormState = Object.fromEntries(
    Object.entries(snapshot).map(([path, field]) => [
      path.slice(rowPath.length + 1),
      field,
    ]),
  );
  for (const [path, field] of Object.entries(state))
    if (path === "id" || path.endsWith(".id")) {
      const id = crypto.randomUUID().replaceAll("-", "").slice(0, 24);
      field.value = id;
      field.initialValue = id;
    }
  for (const [path, field] of Object.entries(state))
    if (field.rows)
      field.rows = field.rows.map((row, index) => ({
        ...row,
        id: String(
          state[`${path}.${index}.id`]?.value ??
            crypto.randomUUID().replaceAll("-", "").slice(0, 24),
        ),
      }));
  return state;
}
