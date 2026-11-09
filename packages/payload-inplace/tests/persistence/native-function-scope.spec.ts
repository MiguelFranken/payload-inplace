import { expect, it, vi } from "vitest";
import type { DefaultServerFunctionArgs } from "payload";
import { scopeNativeFunction } from "../../src/adapters/native-function-scope";
it("applies the current server-authorized locale and user after client/native arguments", async () => {
  const req = { locale: "de" },
    user = { id: "editor" },
    permissions = { collections: {} },
    locale = { code: "de" };
  const fn = vi.fn().mockResolvedValue({ state: {} });
  const scope = { req, user, permissions, locale } as unknown as Pick<
    DefaultServerFunctionArgs,
    "req" | "user" | "permissions" | "locale"
  >;
  await scopeNativeFunction(
    fn,
    scope,
  )({
    req: { locale: "en" },
    user: { id: "other" },
    locale: { code: "en" },
    data: { title: "Entwurf" },
  } as unknown as DefaultServerFunctionArgs);
  expect(fn).toHaveBeenCalledWith(
    expect.objectContaining({ ...scope, data: { title: "Entwurf" } }),
  );
});
