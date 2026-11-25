import { expect, test, type Route } from "@playwright/test";
import { createShopEditor } from "./testing/editor-fixtures";

const pattern = (id: string, label: string) => ({
  id,
  label,
  blockType: "editorial",
});

for (const width of [1280, 320]) {
  test(`pattern pagination retries each failed page at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await createShopEditor(page);
    const requestedPages: number[] = [];
    const failedPages = new Set([1, 2]);
    const first = pattern("first", "First pattern");
    const second = pattern("second", "Second pattern");
    const third = pattern("third", "Third pattern");
    const pages = [[first], [first, second, second], [second, third]];
    await page.route("**/api/visual-editor/patterns*", async (route) => {
      const { page: requested } = route.request().postDataJSON();
      requestedPages.push(requested);
      if (failedPages.delete(requested)) {
        await route.fulfill({ status: 503 });
        return;
      }
      await route.fulfill({
        json: { docs: pages[requested - 1], hasNextPage: requested < 3 },
      });
    });

    await page.getByRole("button", { name: "Sections", exact: true }).click();
    await page
      .getByRole("combobox", { name: "Add section", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Saved patterns", exact: true })
      .click();

    const retry = page.getByRole("button", { name: "Retry", exact: true });
    const more = page.getByRole("button", {
      name: "More patterns",
      exact: true,
    });
    const option = (name: string) =>
      page.getByRole("option", { name, exact: true });
    await expect(
      page.getByRole("alert").filter({ hasText: "Could not load patterns." }),
    ).toBeVisible();
    await retry.press("Enter");
    await expect(option(first.label)).toBeVisible();
    await more.press("Enter");

    await expect(retry).toBeVisible();
    await expect(option(first.label)).toBeVisible();
    await retry.press("Enter");
    await expect(option(second.label)).toHaveCount(1);
    await expect(option(first.label)).toHaveCount(1);
    await more.press("Enter");

    await expect(option(third.label)).toBeVisible();
    await expect(option(second.label)).toHaveCount(1);
    await expect(more).toHaveCount(0);
    expect(requestedPages).toEqual([1, 1, 2, 2, 3]);
    await page
      .getByRole("combobox", { name: "Search patterns" })
      .press("Escape");
    await expect(option(third.label)).toBeHidden();
  });
}

for (const width of [1280, 320]) {
  test(`switching to sections cancels pattern work at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const { doc } = await createShopEditor(page);
    const first = pattern("delayed", "Delayed pattern");
    const library = { docs: [first], hasNextPage: false };
    let pendingList: Route | undefined;
    let pendingRead: Route | undefined;
    await page.route("**/api/visual-editor/patterns*", async (route) => {
      const { operation } = route.request().postDataJSON();
      if (operation === "read") pendingRead = route;
      else if (!pendingList) pendingList = route;
      else await route.fulfill({ json: library });
    });

    const add = page.getByRole("combobox", {
      name: "Add section",
      exact: true,
    });
    const pickerModes = page.getByRole("group", { name: "Saved patterns" });
    const sections = pickerModes.getByRole("button", {
      name: "Sections",
      exact: true,
    });
    const patterns = pickerModes.getByRole("button", {
      name: "Saved patterns",
      exact: true,
    });
    const searchSections = page.getByRole("combobox", {
      name: "Search sections",
    });
    const searchPatterns = page.getByRole("combobox", {
      name: "Search patterns",
    });
    const ordinary = page.getByRole("option", {
      name: "Questions",
      exact: true,
    });
    const delayed = page.getByRole("option", {
      name: first.label,
      exact: true,
    });
    const loading = page
      .getByRole("status")
      .filter({ hasText: "Loading patterns…" });

    await page.getByRole("button", { name: "Sections", exact: true }).click();
    await add.click();
    await patterns.press("Enter");
    await expect(loading).toBeVisible();
    await expect.poll(() => Boolean(pendingList)).toBe(true);
    await searchPatterns.fill("Delayed");
    await sections.press("Enter");
    await expect(searchSections).toHaveValue("");
    await expect(ordinary).toBeEnabled();
    await expect(loading).toBeHidden();
    await pendingList!.fulfill({ json: library });
    await expect(delayed).toBeHidden();
    await searchSections.press("Escape");
    await expect(searchSections).toBeHidden();

    await add.click();
    await expect(searchSections).toBeVisible();
    await patterns.press("Enter");
    await delayed.click();
    await expect.poll(() => Boolean(pendingRead)).toBe(true);
    await sections.press("Enter");
    await expect(ordinary).toBeEnabled();
    await pendingRead!.fulfill({
      json: {
        blockType: "editorial",
        content: { heading: "Late pattern content" },
      },
    });
    await expect(searchSections).toBeVisible();
    await searchSections.fill("Questions");
    await searchSections.press("ArrowDown");
    await searchSections.press("Enter");
    await expect(searchSections).toBeHidden();

    await expect
      .poll(async () =>
        (
          await (
            await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
          ).json()
        ).layout.map((row: { blockType: string }) => row.blockType),
      )
      .toEqual([
        ...doc.layout.map((row: { blockType: string }) => row.blockType),
        "faq",
      ]);
    await add.click();
    await expect(searchSections).toBeVisible();
    await expect(ordinary).toBeEnabled();
  });
}
