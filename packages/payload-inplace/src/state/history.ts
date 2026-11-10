import { commandIssueText, type CommandIssue } from "./command-issue";
import type { FormField, FormState } from "payload";

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

function copyField(field: FormField): FormField {
  return {
    ...field,
    value: cloneValue(field.value),
    rows: field.rows?.map((row) => ({ ...row })),
  };
}

/** Only the chosen layout subtree enters history. Callbacks/custom component identities stay intact. */
export function snapshotRoot(fields: FormState, root: string): FormState {
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([path]) => path === root || path.startsWith(root + "."))
      .map(([path, field]) => [path, copyField(field)]),
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
  const scope = scopes.get(previous);
  const path = scope
    ? (resolveScope(fields, scope.tokens) ?? scope.path)
    : root;
  const snapshot = snapshotRoot(fields, path);
  if (scope) scopes.set(snapshot, { ...scope, path });
  return snapshot;
}

type Rows = NonNullable<FormField["rows"]>;

function rowPositions(rows: Rows): Map<string, number> {
  const positions = new Map<string, number>();
  for (const [index, row] of rows.entries()) {
    const id = String(row.id);
    if (!positions.has(id)) positions.set(id, index);
  }
  return positions;
}

function insertionIndex(rows: Rows, template: Rows, original: number) {
  const positions = rowPositions(rows);
  for (let i = original + 1; i < template.length; i++) {
    const index = positions.get(String(template[i]!.id));
    if (index !== undefined) return index;
  }
  for (let i = original - 1; i >= 0; i--) {
    const index = positions.get(String(template[i]!.id));
    if (index !== undefined) return index + 1;
  }
  return Math.max(0, Math.min(original, rows.length));
}

function collectRowFields(
  fields: FormState,
  container: string,
  destinations: Map<string, number[]>,
  output: [string, FormField][][],
) {
  if (!destinations.size) return;
  const prefix = `${container}.`;
  for (const [path, field] of Object.entries(fields)) {
    if (!path.startsWith(prefix)) continue;
    const dot = path.indexOf(".", prefix.length);
    const sourceIndex = path.slice(prefix.length, dot < 0 ? undefined : dot);
    const indices = destinations.get(sourceIndex);
    if (!indices) continue;
    const suffix = dot < 0 ? "" : path.slice(dot);
    for (const index of indices)
      output[index]!.push([suffix, copyField(field)]);
  }
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
  const currentPositions = rowPositions(currentRows);
  const previousPositions = rowPositions(previousRows);
  const mutation = scope.mutation;
  let rows = [...previousRows];
  if (mutation) {
    const id = mutation.id;
    if (!id) return renderIssue({ code: "preparing" });
    const currentIndex = currentPositions.get(id);
    const previousIndex = previousPositions.get(id);
    const existing =
      currentIndex === undefined ? undefined : currentRows[currentIndex];
    const desired =
      previousIndex === undefined ? undefined : previousRows[previousIndex];
    rows = currentRows.filter((row) => String(row.id) !== id);
    if (["move", "up", "down"].includes(mutation.kind) && !existing)
      return renderIssue({ code: "removed-moved-section" });
    if (desired) {
      if (existing && ["add", "duplicate", "remove"].includes(mutation.kind))
        rows = [...currentRows];
      else
        rows.splice(
          insertionIndex(rows, previousRows, previousIndex!),
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
  const currentDestinations = new Map<string, number[]>();
  const previousDestinations = new Map<string, number[]>();
  const rowFields: [string, FormField][][] = rows.map(() => []);
  for (const [index, row] of rows.entries()) {
    const id = String(row.id);
    const currentIndex = currentPositions.get(id);
    const sourceIndex = currentIndex ?? previousPositions.get(id);
    if (sourceIndex === undefined) continue;
    const destinations =
      currentIndex !== undefined ? currentDestinations : previousDestinations;
    const key = String(sourceIndex);
    const indices = destinations.get(key);
    if (indices) indices.push(index);
    else destinations.set(key, [index]);
  }
  collectRowFields(current, path, currentDestinations, rowFields);
  collectRowFields(snapshot, scope.path, previousDestinations, rowFields);
  for (const [index, entries] of rowFields.entries())
    for (const [suffix, state] of entries)
      restored[`${path}.${index}${suffix}`] = state;
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
    if (container !== this.root && !container.startsWith(this.root + "."))
      return false;
    this.captureResult(fields);
    if (this.pending) return false;
    const snapshot = snapshotRoot(fields, container);
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
