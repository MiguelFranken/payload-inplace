import type { BlockIdentity } from "../types.js";

export const PROTOCOL = "payload-visual-editor/v1";

export type BridgeMessage = {
  protocol: typeof PROTOCOL;
  session: string;
  document: string;
  sequence: number;
} & (
  | { type: "ready" | "rendered"; revision: string }
  | { type: "select"; identity: BlockIdentity }
  | { type: "highlight"; identity: BlockIdentity }
  | { type: "refresh" | "stop" }
);

/** Both ends reject foreign windows, origins, sessions, documents, replayed and oversized envelopes. */
export function validateMessage(
  event: Pick<MessageEvent, "data" | "source" | "origin">,
  expected: {
    source: MessageEventSource | null;
    origin: string;
    session: string;
    document: string;
    after: number;
  },
): event is MessageEvent<BridgeMessage> {
  if (
    !expected.source ||
    event.source !== expected.source ||
    event.origin !== expected.origin
  )
    return false;
  const m = event.data;
  try {
    if (JSON.stringify(m).length > 8192) return false;
  } catch {
    return false;
  }
  if (
    !m ||
    m.protocol !== PROTOCOL ||
    m.session !== expected.session ||
    m.document !== expected.document ||
    !Number.isSafeInteger(m.sequence) ||
    m.sequence <= expected.after
  )
    return false;
  if (m.type === "ready" || m.type === "rendered")
    return typeof m.revision === "string" && m.revision.length <= 128;
  if (m.type === "refresh" || m.type === "stop") return true;
  if (m.type !== "select" && m.type !== "highlight") return false;
  const i = m.identity;
  return Boolean(
    i &&
      typeof i.root === "string" &&
      i.root.length < 256 &&
      typeof i.blockId === "string" &&
      i.blockId.length <= 128 &&
      (i.ancestors === undefined ||
        (Array.isArray(i.ancestors) &&
          i.ancestors.length < 32 &&
          i.ancestors.every(
            (x: unknown) => typeof x === "string" && x.length <= 128,
          ))),
  );
}
