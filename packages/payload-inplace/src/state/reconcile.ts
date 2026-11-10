import type { ClientBlock, ClientField } from "payload";
import {
  readStableValue,
  writeStableValue,
} from "@payload-inplace/core/stable-value";
import { assertReconcileIdentities } from "../schema/reconcile-identities";
import { documentChanges, type DocumentChange } from "./document-diff";

export interface ReconciliationConflict {
  labels: string[];
  path: string;
  structural: boolean;
  local: unknown;
  latest: unknown;
}

export interface DocumentReconciliation {
  merged: Record<string, unknown>;
  conflicts: ReconciliationConflict[];
  localChanges: DocumentChange[];
  remoteChanges: DocumentChange[];
}

interface Patch {
  structural: boolean;
  labels: string[];
}

function ancestors(path: string): string[] {
  const parents: string[] = [];
  for (
    let dot = path.lastIndexOf(".");
    dot >= 0;
    dot = path.lastIndexOf(".", dot - 1)
  ) {
    parents.push(path.slice(0, dot));
    if (dot === 0) break;
  }
  return parents;
}

function indexPatches(changes: DocumentChange[]): Map<string, Patch> {
  const patches = new Map<string, Patch>();
  for (const change of changes) {
    const parts = change.path.split(".");
    if (parts.at(-1) === "$position") parts.pop();
    if (parts.at(-1)?.startsWith("@")) parts.pop();
    const path = parts.join(".");
    const structural = path !== change.path;
    const existing = patches.get(path);
    if (existing) existing.structural ||= structural;
    else
      patches.set(path, {
        structural,
        labels: structural ? change.labels.slice(0, -1) : change.labels,
      });
  }
  return patches;
}

/** Record whether any patch below each ancestor changes list structure. */
function descendants(
  patches: ReadonlyMap<string, Patch>,
): Map<string, boolean> {
  const result = new Map<string, boolean>();
  for (const [path, { structural }] of patches)
    for (const parent of ancestors(path))
      result.set(parent, Boolean(result.get(parent) || structural));
  return result;
}

function roots<T>(paths: ReadonlyMap<string, T>): string[] {
  return [...paths.keys()].filter(
    (path) => !ancestors(path).some((parent) => paths.has(parent)),
  );
}

/** Three-way comparison uses native schema atomicity and stable row identity. Only disjoint authored patches merge automatically; a structural overlap becomes an explicit whole-list choice. Metadata always comes from latest. */
export function reconcileDocuments(
  base: Record<string, unknown>,
  local: Record<string, unknown>,
  latest: Record<string, unknown>,
  fields: ClientField[] = [],
  blocks: Record<string, ClientBlock> = {},
): DocumentReconciliation {
  for (const snapshot of [base, local, latest])
    assertReconcileIdentities(snapshot, fields, blocks);
  const localChanges = documentChanges(base, local, fields, blocks),
    remoteChanges = documentChanges(base, latest, fields, blocks);
  const mine = indexPatches(localChanges);
  const theirs = indexPatches(remoteChanges);
  const remoteDescendants = descendants(theirs);
  const conflicted = new Map<string, ReconciliationConflict>();
  const equalOutcomes = new Set<string>();
  function compare(path: string, structural: boolean) {
    const existing = conflicted.get(path);
    if (existing) {
      existing.structural ||= structural;
      return;
    }
    if (equalOutcomes.has(path)) return;
    const localValue = readStableValue(local, path);
    const latestValue = readStableValue(latest, path);
    if (JSON.stringify(localValue) === JSON.stringify(latestValue)) {
      equalOutcomes.add(path);
      return;
    }
    conflicted.set(path, {
      path,
      labels: (mine.get(path) ?? theirs.get(path))?.labels ?? [path],
      structural,
      local: localValue,
      latest: latestValue,
    });
  }

  for (const [path, { structural }] of mine) {
    // Exact and descendant matches both compare the same local subtree.
    const exact = theirs.get(path);
    const below = remoteDescendants.get(path);
    if (exact || below !== undefined)
      compare(path, Boolean(structural || exact?.structural || below));
    for (const parent of ancestors(path)) {
      const remote = theirs.get(parent);
      if (remote) compare(parent, structural || remote.structural);
    }
  }

  const conflicts = roots(conflicted).map((path) => conflicted.get(path)!);
  const conflictAncestors = new Set(
    conflicts.flatMap(({ path }) => ancestors(path)),
  );
  const merged = structuredClone(latest);
  for (const path of roots(mine))
    if (
      !conflicted.has(path) &&
      !conflictAncestors.has(path) &&
      !ancestors(path).some((parent) => conflicted.has(parent))
    )
      writeStableValue(merged, path, readStableValue(local, path));
  return { merged, conflicts, localChanges, remoteChanges };
}

/** Resolve every overlapping patch explicitly before updating native Form. Missing choices fail closed; the returned snapshot is never persisted directly by this helper. */
export function resolveReconciliation(
  result: DocumentReconciliation,
  choices: Record<string, "local" | "latest">,
): Record<string, unknown> {
  const merged = structuredClone(result.merged);
  for (const conflict of result.conflicts) {
    const choice = choices[conflict.path];
    if (choice !== "local" && choice !== "latest")
      throw Error("Review every conflicting field");
    writeStableValue(merged, conflict.path, conflict[choice]);
  }
  return merged;
}
