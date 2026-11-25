import { expect, test } from "@playwright/test";
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
