import type { BlockIdentity } from "./types";

/** Anchors carry identity, not stale array positions, until a command executes. */
export type InsertionTarget =
  | { kind: "adjacent"; identity: BlockIdentity; side: "before" | "after" }
  | { kind: "list"; root: string; field: string; identity?: BlockIdentity };
