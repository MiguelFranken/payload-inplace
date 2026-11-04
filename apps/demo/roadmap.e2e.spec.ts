import { test, expect } from "@playwright/test";

test("inline edits preserve mixed-case source under uppercase CSS and keep the host page mounted", async ({
  page,
}) => {
  await page.goto("/shop");
  expect(
    (
      await page.request.post("/api/users/login", {
        data: {
          email: "admin@example.test",
          password: "synthetic-demo-password",
        },
      })
    ).ok(),
  ).toBeTruthy();
  const source = (
    await (
      await page.request.get("/api/shops?where[slug][equals]=home&depth=0")
    ).json()
  ).docs[0];
  const clone = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(clone)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value)
              .filter(([key]) => key !== "id")
              .map(([key, item]) => [key, clone(item)]),
          )
        : value;
  const created = await page.request.post("/api/shops", {
    data: {
      title: "Source text proof",
      slug: `source-text-${Date.now()}`,
      layout: clone(source.layout),
      _status: "draft",
    },
  });
  expect(created.ok()).toBeTruthy();
  const doc = (await created.json()).doc;
  await page.goto(`/visual-editor/start?collection=shops&id=${doc.id}`);
  await page
    .getByRole("button", { name: "Start editing", exact: true })
    .click();
  const toolbar = page.getByRole("navigation", { name: "Editing toolbar" });
  await expect(toolbar).toBeVisible();
  const content = page.getByRole("button", {
    name: "Select content",
    exact: true,
  });
  if ((await content.getAttribute("aria-pressed")) !== "true")
    await content.click();
  const eyebrow = page.locator('[data-ve-field="eyebrow"]').first();
  const original = source.layout[0].eyebrow;
  await expect(eyebrow).toHaveCSS("text-transform", "uppercase");
  expect(await eyebrow.textContent()).toBe(original);
  // Negative control: the old innerText serialization would store the presentation transform.
  expect(await eyebrow.evaluate((el) => (el as HTMLElement).innerText)).toBe(
    original.toUpperCase(),
  );
  await page.evaluate(() => {
    (window as any).__hostHeaderProof = document.querySelector(
      "[data-test-site-header]",
    );
  });
  const url = page.url();
  await eyebrow.click();
  await expect(eyebrow).toHaveAttribute("contenteditable", "plaintext-only");
  await eyebrow.press("End");
  await eyebrow.pressSequentially("!");
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
          ).json()
        ).layout[0].eyebrow,
    )
    .toBe(`${original}!`);
  expect(page.url()).toBe(url);
  expect(
    await page.evaluate(
      () =>
        (window as any).__hostHeaderProof ===
        document.querySelector("[data-test-site-header]"),
    ),
  ).toBe(true);
  await expect(toolbar).toBeVisible();
  await page.screenshot({ path: "test-results/roadmap-source-text.png" });
});

test("canvas insertion chooses an exact stable boundary and cancelling writes nothing", async ({
  page,
}) => {
  const { createShopEditor } = await import("./testing/editor-fixtures");
  const { doc } = await createShopEditor(page);
  const hero = page.locator("main > [data-ve-block]").first();
  await hero.scrollIntoViewIfNeeded();
  await hero.hover();
  await page.mouse.wheel(0, 200);
  const after = page.getByRole("combobox", {
    name: "Add section after",
    exact: true,
  });
  await expect(after).toBeVisible();
  const before = (
    await (
      await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
    ).json()
  )._veRevision;
  await after.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  expect(
    (
      await (
        await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
      ).json()
    )._veRevision,
  ).toBe(before);
  await after.click();
  await page.getByRole("option", { name: "Studio story", exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
          ).json()
        ).layout.length,
    )
    .toBe(doc.layout.length + 1);
  const saved = await (
    await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
  ).json();
  expect(saved.layout[0].id).toBe(doc.layout[0].id);
  expect(saved.layout[1].blockType).toBe("editorial");
  expect(saved.layout[2].id).toBe(doc.layout[1].id);
});

test("an explicitly bound empty native array can add an item on the canvas", async ({
  page,
}) => {
  const { createShopEditor } = await import("./testing/editor-fixtures");
  const { doc } = await createShopEditor(page, { emptyCards: true });
  const list = page.locator('[data-ve-list="cards"]');
  await list.scrollIntoViewIfNeeded();
  await list.hover();
  await page.getByRole("button", { name: "Add item", exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
          ).json()
        ).layout.find((b: any) => b.blockType === "productGrid").cards.length,
    )
    .toBe(1);
});

test("inline Lexical edits structured text through the native queue without replacing page chrome", async ({
  page,
}) => {
  const { createShopEditor } = await import("./testing/editor-fixtures");
  const { doc } = await createShopEditor(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const selectContent = page.getByRole("button", {
    name: "Select content",
    exact: true,
  });
  if ((await selectContent.getAttribute("aria-pressed")) !== "true")
    await selectContent.click();
  const body = page.locator('[data-ve-field="body"]').first();
  await body.scrollIntoViewIfNeeded();
  const before = doc.layout.find(
    (block: any) => block.blockType === "editorial",
  ).body;
  const url = page.url();
  await page.evaluate(() => {
    (window as any).__richHeader = document.querySelector(
      "[data-test-site-header]",
    );
  });
  await body.click();
  const surface = page.locator('[data-ve-inline-active][data-ve-field="body"]');
  await expect(surface).toHaveAttribute("contenteditable", "true");
  await expect(
    page.getByRole("toolbar", { name: "Text formatting" }),
  ).toBeVisible();
  // A rendered rich-text tree is not rewritten until the first actual edit.
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
          ).json()
        )._veRevision,
    )
    .toBe(doc._veRevision);
  await surface.press("ControlOrMeta+End");
  await surface.pressSequentially(" Added inline.");
  await expect
    .poll(async () =>
      JSON.stringify(
        (
          await (
            await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
          ).json()
        ).layout.find((block: any) => block.blockType === "editorial").body,
      ),
    )
    .toContain("Added inline.");
  expect(page.url()).toBe(url);
  expect(
    await page.evaluate(
      () =>
        (window as any).__richHeader ===
        document.querySelector("[data-test-site-header]"),
    ),
  ).toBe(true);
  await expect(surface).toBeFocused();
  expect(before.root.children.length).toBeGreaterThan(0);
  await page.screenshot({ path: "test-results/roadmap-inline-richtext.png" });
  await page
    .getByRole("button", { name: "More text options", exact: true })
    .click();
  await expect(surface).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Close Body panel" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
