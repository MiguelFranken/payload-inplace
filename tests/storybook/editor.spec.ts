import { expect, test } from "@playwright/test";

const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`;

test("all registered stories render inside the editor shadow boundary", async ({
  page,
  request,
}) => {
  const response = await request.get("/index.json");
  expect(response.ok()).toBeTruthy();
  const { entries } = (await response.json()) as {
    entries: Record<string, { type: string }>;
  };
  expect(Object.keys(entries).length).toBeGreaterThanOrEqual(18);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [id, entry] of Object.entries(entries)) {
    if (entry.type !== "story") continue;
    await page.goto(story(id));
    await expect(
      page.locator("#storybook-root [data-ve-ui]").first(),
      id,
    ).toBeAttached();
    await expect(page.locator("#error-message"), id).not.toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("catalogue keyboard focus and popup stay in the shadow root at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(story("editor-sections-catalogue--searchable"));
  const add = page.getByRole("combobox", { name: "Add section", exact: true });
  await add.focus();
  await add.press("Enter");
  const search = page.getByRole("combobox", { name: /search sections/i });
  await expect(search).toBeFocused();
  await search.fill("Studio");
  const option = page.getByRole("option", { name: "Studio story" });
  await expect(option).toBeVisible();
  expect(
    await option.evaluate(
      (element) => element.getRootNode() instanceof ShadowRoot,
    ),
  ).toBe(true);
  const bounds = await option.boundingBox();
  expect(bounds?.x).toBeGreaterThanOrEqual(0);
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(320);
  await search.press("Escape");
  await expect(add).toBeFocused();
});

test("the review exposes both comparison values without narrow-width overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(story("editor-review-document-diff--changed"));
  await expect(page.locator("del")).toHaveText("the home");
  await expect(page.locator("ins")).toHaveText("everyday living");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});
