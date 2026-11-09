import { expect, it } from "vitest";
import type { ReactElement } from "react";
import type { DocumentViewServerProps } from "payload";
import { GuardedVersionView } from "../../src/admin/GuardedVersionView";
it("formats unavailable-version feedback in a server render without invoking client hooks", async () => {
  const result = await GuardedVersionView({
    initPageResult: { req: { i18n: { language: "de" } } },
    routeSegments: [],
  } as unknown as DocumentViewServerProps);
  expect((result as ReactElement<{ children: string }>).props.children).toBe(
    "Version nicht verfügbar.",
  );
});
