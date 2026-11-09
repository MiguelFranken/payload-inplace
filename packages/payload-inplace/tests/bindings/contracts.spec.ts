import { describe, expect, it } from "vitest";
import { resolveRoot } from "../../src/schema/resolve";
import { indexBlocks, resolveIdentity } from "../../src/state/identity";
import {
  getBlockAttributes,
  getFieldGroupAttributes,
} from "../../src/preview/bindings";
import { PROTOCOL, validateMessage } from "../../src/preview/protocol";
import { signContext, verifyContext } from "../../src/server/context";
describe("authoring contracts", () => {
  it("resolves transparent containers and named tabs without conflating data/schema paths", () => {
    const root: any = { name: "layout", type: "blocks", blocks: [] };
    expect(
      resolveRoot(
        [
          {
            type: "row",
            fields: [
              {
                type: "tabs",
                tabs: [{ name: "detailPage", label: "Page", fields: [root] }],
              },
            ],
          },
        ] as any,
        "detailPage.layout",
      ),
    ).toBe(root);
    expect(() => resolveRoot([root], "__proto__.layout")).toThrow();
    expect(() => resolveRoot([root], "other")).toThrow();
  });
  it("resolves stable identity after moves and rejects duplicate IDs in a container", () => {
    const a = { id: "a", blockType: "hero" },
      b = { id: "b", blockType: "text" };
    expect(
      resolveIdentity(indexBlocks([b, a], "layout"), {
        root: "layout",
        blockId: "a",
      })?.path,
    ).toBe("layout.1");
    expect(() => indexBlocks([a, a], "layout")).toThrow("Duplicate");
    expect(() => indexBlocks([{ blockType: "hero" }], "layout")).toThrow(
      "Missing",
    );
  });
  it("emits no public annotations by default", () =>
    expect(getBlockAttributes({ root: "layout", blockId: "a" })).toEqual({}));
  it("rejects forged, replayed, oversized and cross-document messages with active positive control", () => {
    const source = {} as Window;
    const expected = {
      source,
      origin: "https://example.test",
      session: "active",
      document: "pages:1",
      after: 0,
    };
    const data = {
      protocol: PROTOCOL,
      session: "active",
      document: "pages:1",
      sequence: 1,
      type: "select",
      identity: { root: "layout", blockId: "a" },
    };
    const event = { source, origin: expected.origin, data };
    expect(validateMessage(event, expected)).toBe(true);
    for (const patch of [
      { session: "wrong" },
      { document: "wrong" },
      { sequence: 0 },
      { type: "mutate" },
      { identity: { root: "x", blockId: "a".repeat(9000) } },
    ])
      expect(
        validateMessage({ ...event, data: { ...data, ...patch } }, expected),
      ).toBe(false);
    expect(validateMessage({ ...event, source: {} as Window }, expected)).toBe(
      false,
    );
    expect(
      validateMessage({ ...event, origin: "https://attacker.test" }, expected),
    ).toBe(false);
  });
  it("keeps grouped rendered targets explicit and absent from public HTML", () => {
    const identity = {
      root: "layout",
      blockId: "a",
      fields: ["media", "caption"],
    };
    expect(getFieldGroupAttributes(identity)).toEqual({});
    expect(getFieldGroupAttributes(identity, true)).toEqual({
      "data-ve-block": "a",
      "data-ve-root": "layout",
      "data-ve-ancestors": "[]",
      "data-ve-fields": '["media","caption"]',
    });
  });
  it("requires intact unexpired signed activation", () => {
    const context = {
      target: { collection: "pages", id: 1, root: "layout" },
      user: "users:1",
      session: "session",
      expires: 2000,
      nonce: "nonce",
    };
    const signed = signContext(context, "secret");
    expect(verifyContext(signed, "secret", 1000)).toEqual(context);
    expect(verifyContext(signed, "other", 1000)).toBeNull();
    expect(verifyContext(signed, "secret", 2000)).toBeNull();
    expect(verifyContext(signed + "x", "secret", 1000)).toBeNull();
  });
});
