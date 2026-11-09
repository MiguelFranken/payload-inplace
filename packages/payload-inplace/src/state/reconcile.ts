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

const overlap = (a: string, b: string) =>
  a === b || a.startsWith(b + ".") || b.startsWith(a + ".");

function patch(change: DocumentChange) {
  const parts = change.path.split(".");
  if (parts.at(-1) === "$position") parts.pop();
  if (parts.at(-1)?.startsWith("@")) parts.pop();
  return { path: parts.join("."), structural: parts.join(".") !== change.path };
}

const roots = (paths: string[]) =>
  [...new Set(paths)].filter(
    (path) =>
      !paths.some((parent) => parent !== path && path.startsWith(parent + ".")),
  );

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
  const mine = localChanges.map(patch),
    theirs = remoteChanges.map(patch),
    conflicted = new Map<string, boolean>();
  for (const a of mine)
    for (const b of theirs)
      if (overlap(a.path, b.path)) {
        const path = a.path.length <= b.path.length ? a.path : b.path;
        // Equal authored results need no user decision.
        if (
          JSON.stringify(readStableValue(local, path)) ===
          JSON.stringify(readStableValue(latest, path))
        )
          continue;
        conflicted.set(
          path,
          Boolean(conflicted.get(path) || a.structural || b.structural),
        );
      }
  const conflicts = roots([...conflicted.keys()]).map((path) => {
    const source = [...localChanges, ...remoteChanges].find(
      (change) => patch(change).path === path,
    );
    const labels = source
      ? patch(source).structural
        ? source.labels.slice(0, -1)
        : source.labels
      : [path];
    return {
      path,
      labels,
      structural: Boolean(conflicted.get(path)),
      local: readStableValue(local, path),
      latest: readStableValue(latest, path),
    };
  });
  const merged = structuredClone(latest);
  for (const path of roots(mine.map((change) => change.path)))
    if (!conflicts.some((conflict) => overlap(conflict.path, path)))
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
