import { expect, it, vi } from "vitest";
import {
  createEditorEventChannel,
  type EditorLifecycleEvent,
} from "../src/events.js";

it("emits one ordered correlated completion, preserves scope and isolates observer failures", async () => {
  let clock = 10;
  const events: EditorLifecycleEvent[] = [];
  const channel = createEditorEventChannel(
    {
      document: { kind: "collection", collection: "pages", id: "one" },
      locale: "de",
    },
    { now: () => clock, id: () => "opaque-operation" },
  );
  const listener = vi.fn((event: EditorLifecycleEvent) => {
    events.push(event);
  });
  channel.subscribe(() => {
    throw Error("secret error detail");
  });
  channel.subscribe(async () => {
    throw Error("rejected observer");
  });
  channel.subscribe(listener);
  channel.activate();
  const save = channel.start("save");
  clock = 37;
  save.settle("conflict", "conflict");
  save.settle("succeeded");
  await Promise.resolve();
  expect(events.map((event) => event.type)).toEqual([
    "activated",
    "operation-started",
    "operation-settled",
  ]);
  expect(events[2]).toMatchObject({
    operationId: "opaque-operation",
    durationMs: 27,
    outcome: "conflict",
    scope: {
      document: { kind: "collection", collection: "pages", id: "one" },
      locale: "de",
    },
  });
  const count = listener.mock.calls.length;
  channel.dispose();
  channel.start("save").settle("succeeded");
  expect(listener).toHaveBeenCalledTimes(count);
});
it("projects provenance rather than forwarding extra transport/content keys", () => {
  const events: EditorLifecycleEvent[] = [];
  const scope = {
    document: {
      kind: "collection" as const,
      collection: "pages",
      id: 1,
      token: "activation-secret",
    },
    locale: "en",
    values: { title: "private copy" },
    reviewToken: "review-secret",
  };
  const channel = createEditorEventChannel(scope);
  channel.activate();
  const unsubscribe = channel.subscribe((event) => {
    events.push(event);
  });
  channel.start("preview").settle("failed", "preview");
  unsubscribe();
  channel.start("save");
  const serialized = JSON.stringify(events);
  expect(serialized).not.toMatch(
    /private copy|activation-secret|review-secret|values|token/,
  );
  expect(events).toHaveLength(3);
  expect(Object.isFrozen(events[0]?.scope.document)).toBe(true);
});
