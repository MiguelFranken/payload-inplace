import { expect, test } from "@playwright/test";
import { createShopEditor } from "./testing/editor-fixtures";

test("selected block arrows and position picker move the same draft row and support undo", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { doc } = await createShopEditor(page);
  const ids = doc.layout.map((block: { id: string }) => block.id);
  const story = page.locator("#studio-story");
  const selectStory = () => story.click({ position: { x: 12, y: 16 } });
  const caption = page.locator("[data-ve-selection-outline]");
  const up = caption.getByRole("button", {
    name: "Move section up",
    exact: true,
  });
  const down = caption.getByRole("button", {
    name: "Move section down",
    exact: true,
  });
  const more = caption.getByRole("button", { name: "More section actions" });
  const menu = page.getByRole("menu", { exact: true });
  const read = async () => {
    const response = await page.request.get(
      `/api/shops/${doc.id}?draft=true&depth=0`,
    );
    expect(response.ok()).toBeTruthy();
    return response.json();
  };
  const order = async () =>
    (await read()).layout.map((block: { id: string }) => block.id);

  await page.addStyleTag({
    content: `[data-ve-block="${ids[3]}"]:not([data-ve-field]):not([data-ve-fields]) { min-height: 1100px; }`,
  });
  await selectStory();
  await expect(up).toBeEnabled();
  await expect(down).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath("block-actions.png") });
  await down.click();
  await expect.poll(order).toEqual([ids[0], ids[1], ids[3], ids[2]]);
  await expect(down).toBeDisabled();
  await expect(more).toBeInViewport();
  await expect(up).toBeEnabled();
  await up.click();
  await expect.poll(order).toEqual(ids);

  await page.setViewportSize({ width: 320, height: 720 });
  await story.scrollIntoViewIfNeeded();
  await expect(more).toBeInViewport();
  await more.press("Enter");
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitem", { name: "Move to position" }).press("Enter");
  const positions = page.getByRole("complementary", {
    name: "Move to position",
  });
  await expect(positions).toBeVisible();
  await expect(
    positions.getByRole("button", { name: /Position 1\b/ }),
  ).toHaveCount(0);
  const second = positions.getByRole("button", { name: /Position 2\b/ });
  await expect(second).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath("block-position-mobile.png"),
  });
  await page.keyboard.press("Escape");
  await expect(positions).toHaveCount(0);
  await expect(more).toBeFocused();

  await more.click();
  await menu.getByRole("menuitem", { name: "Move to position" }).click();
  await second.click();
  await expect.poll(order).toEqual([ids[0], ids[2], ids[1], ids[3]]);
  await expect(up).toBeDisabled();
  const native = await read();
  expect(native.layout[1]).toMatchObject({
    id: ids[2],
    heading: doc.layout[2].heading,
  });
  await page.keyboard.press("Control+z");
  await expect.poll(order).toEqual(ids);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("custom block actions only accept the authorized matching saved block", async ({
  page,
  baseURL,
}, testInfo) => {
  const { doc } = await createShopEditor(page);
  const caption = page.locator("[data-ve-selection-outline]");
  const menu = page.getByRole("menu", { exact: true });
  const more = caption.getByRole("button", { name: "More section actions" });

  await page.getByRole("button", { name: "More tools", exact: true }).click();
  await expect(
    menu.getByRole("menuitem", { name: "Check story section" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.locator("#studio-story").click({ position: { x: 12, y: 16 } });
  await more.click();
  await expect(
    menu.getByRole("menuitem", { name: "Check story section" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("block-actions-menu.png"),
  });
  await menu.getByRole("menuitem", { name: "Check story section" }).click();

  const panel = page.getByRole("complementary", {
    name: "Check story section",
  });
  const result = page.waitForResponse(
    (response) =>
      response.url().includes("/api/visual-editor/action") &&
      response.request().method() === "POST",
  );
  await panel
    .getByRole("button", { name: "Check story section", exact: true })
    .click();
  const response = await result;
  expect(response.ok(), await response.text()).toBeTruthy();
  expect(await response.json()).toMatchObject({
    message: "Checked the saved story at layout.2.",
  });

  const input = response.request().postDataJSON();
  for (const block of [
    undefined,
    { ...input.block, root: "other" },
    { ...input.block, blockId: doc.layout[0].id },
    { ...input.block, ancestors: ["another-container"] },
  ]) {
    const rejected = await page.request.post("/api/visual-editor/action", {
      headers: { Origin: new URL(baseURL!).origin },
      data: { ...input, block },
    });
    expect(rejected.status()).toBe(403);
  }
});
