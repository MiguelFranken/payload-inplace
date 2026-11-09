import { commandIssueText, type CommandIssue } from "./command-issue";
import type { FormState } from "payload";

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map(cloneValue) as T;
  if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype &&
    !("$$typeof" in value)
  )
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, cloneValue(v)]),
    ) as T;
  return value;
}

/** Only the chosen layout subtree enters history. Callbacks/custom component identities stay intact. */
export function snapshotRoot(fields: FormState, root: string): FormState {
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([path]) => path === root || path.startsWith(root + "."))
      .map(([path, field]) => [
        path,
        {
          ...field,
          value: cloneValue(field.value),
          rows: field.rows?.map((row) => ({ ...row })),
        },
      ]),
  );
}

/** Identifies the one native structural mutation; history never replays unrelated later edits. */
export interface StructuralMutation {
  kind: "add" | "duplicate" | "remove" | "move" | "up" | "down";
  id?: string;
}

type ScopeToken = { field: string } | { row: string };

interface Scope {
  path: string;
  tokens: ScopeToken[];
  mutation?: StructuralMutation;
}

const scopes = new WeakMap<FormState, Scope>();

function tokensFor(fields: FormState, path: string): ScopeToken[] {
  let prefix = "";
  return path.split(".").map((part) => {
    const rows = fields[prefix]?.rows;
    const token =
      /^\d+$/.test(part) && rows?.[Number(part)]
        ? { row: String(rows[Number(part)].id) }
        : { field: part };
    prefix = prefix ? `${prefix}.${part}` : part;
    return token;
  });
}

function resolveScope(
  fields: FormState,
  tokens: ScopeToken[],
): string | undefined {
  let path = "";
  for (const token of tokens) {
    if ("field" in token) path = path ? `${path}.${token.field}` : token.field;
    else {
      const index =
        fields[path]?.rows?.findIndex((row) => String(row.id) === token.row) ??
        -1;
      if (index < 0) return;
      path += `.${index}`;
    }
  }
  return path;
}

function mirror(fields: FormState, root: string, previous: FormState) {
  const snapshot = snapshotRoot(fields, root),
    scope = scopes.get(previous);
  if (scope)
    scopes.set(snapshot, {
      ...scope,
      path: resolveScope(fields, scope.tokens) || scope.path,
    });
  return snapshot;
}

function insertionIndex(rows: any[], template: any[], id: string) {
  const original = template.findIndex((row) => String(row.id) === id);
  for (const row of template.slice(original + 1)) {
    const index = rows.findIndex(
      (current) => String(current.id) === String(row.id),
    );
    if (index >= 0) return index;
  }
  for (const row of template.slice(0, original).reverse()) {
    const index = rows.findIndex(
      (current) => String(current.id) === String(row.id),
    );
    if (index >= 0) return index + 1;
  }
  return Math.max(0, Math.min(original, rows.length));
}

/** Materialize only the affected container and row identity. Existing row subtrees come from the current Form, preserving later text and native nested changes.
 * @see StructuralHistory.captureResult records IDs allocated by native add/duplicate operations.
 */
export function materializeStructuralRestore(
  current: FormState,
  snapshot: FormState,
  root: string,
  renderIssue: (issue: CommandIssue) => string = commandIssueText,
): { path: string; fields: FormState } | string {
  const scope = scopes.get(snapshot) || {
    path: root,
    tokens: tokensFor(snapshot, root),
  };
  const path = resolveScope(current, scope.tokens);
  if (!path) return renderIssue({ code: "removed-container" });
  const previousRows = snapshot[scope.path]?.rows || [],
    currentRows = current[path]?.rows || [];
  const mutation = scope.mutation;
  let rows = [...previousRows];
  if (mutation) {
    const id = mutation.id;
    if (!id) return renderIssue({ code: "preparing" });
    const existing = currentRows.find((row) => String(row.id) === id),
      desired = previousRows.find((row) => String(row.id) === id);
    rows = currentRows.filter((row) => String(row.id) !== id);
    if (["move", "up", "down"].includes(mutation.kind) && !existing)
      return renderIssue({ code: "removed-moved-section" });
    if (desired) {
      if (existing && ["add", "duplicate", "remove"].includes(mutation.kind))
        rows = [...currentRows];
      else
        rows.splice(
          insertionIndex(rows, previousRows, id),
          0,
          existing || desired,
        );
    }
  }
  const restored: FormState = {
    [path]: {
      ...snapshot[scope.path],
      ...current[path],
      value: rows.length,
      // Match Payload useField({hasRows:true}): non-empty lists serialize their
      // descendants, never the numeric row-count sentinel (including undo from empty).
      disableFormData: rows.length > 0,
      rows: rows.map((row) => ({ ...row })),
    },
  };
  rows.forEach((row, index) => {
    const currentIndex = currentRows.findIndex(
        (candidate) => String(candidate.id) === String(row.id),
      ),
      fromCurrent = currentIndex >= 0;
    const source = fromCurrent ? current : snapshot,
      sourceIndex = fromCurrent
        ? currentIndex
        : previousRows.findIndex(
            (candidate) => String(candidate.id) === String(row.id),
          );
    const prefix = `${fromCurrent ? path : scope.path}.${sourceIndex}`;
    for (const [field, state] of Object.entries(snapshotRoot(source, prefix)))
      restored[`${path}.${index}${field.slice(prefix.length)}`] = state;
  });
  return { path, fields: restored };
}

/** Bounded native-form mementos with operation scope. Payload remains the sole value and persistence authority. */
export class StructuralHistory {
  private undoStack: FormState[] = [];
  private redoStack: FormState[] = [];
  private pending?: FormState;

  constructor(
    readonly root: string,
    readonly limit = 20,
  ) {}

  checkpoint(
    fields: FormState,
    container = this.root,
    mutation?: StructuralMutation,
  ) {
    this.captureResult(fields);
    if (this.pending) return false;
    const snapshot = snapshotRoot(fields, this.root);
    scopes.set(snapshot, {
      path: container,
      tokens: tokensFor(fields, container),
      mutation,
    });
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
    if (mutation && ["add", "duplicate"].includes(mutation.kind))
      this.pending = snapshot;
    return true;
  }

  /** Seal the single row ID allocated by native addFieldRow after its reducer commit. Never infer an identity from a numeric position. */
  captureResult(fields: FormState): boolean {
    if (!this.pending) return false;
    const scope = scopes.get(this.pending)!;
    const path = resolveScope(fields, scope.tokens);
    if (!path) return false;
    const prior = new Set(
      (this.pending[scope.path]?.rows || []).map((row) => String(row.id)),
    );
    const added = (fields[path]?.rows || []).filter(
      (row) => !prior.has(String(row.id)),
    );
    if (added.length !== 1) return false;
    scope.mutation!.id = String(added[0].id);
    this.pending = undefined;
    return true;
  }

  get canUndo() {
    return this.undoStack.length > 0 && !this.pending;
  }

  get canRedo() {
    return this.redoStack.length > 0 && !this.pending;
  }

  undo(fields: FormState) {
    this.captureResult(fields);
    if (this.pending) return;
    const previous = this.undoStack.pop();
    if (previous) this.redoStack.push(mirror(fields, this.root, previous));
    return previous;
  }

  redo(fields: FormState) {
    if (this.pending) return;
    const next = this.redoStack.pop();
    if (next) this.undoStack.push(mirror(fields, this.root, next));
    return next;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.pending = undefined;
  }
}
