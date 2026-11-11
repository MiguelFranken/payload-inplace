import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { createShopEditor } from "./testing/editor-fixtures";

const output = path.resolve(
  process.env.DOCS_MEDIA_OUTPUT || "test-results/docs-media",
);

/** Capture the rendered page at native 2x density, without altering image pixels. */
async function capture(page: Page, name: string) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images]
        .filter((image) => image.complete)
        .map((image) => image.decode().catch(() => {})),
    );
  });
  await page.screenshot({
    path: path.join(output, `${name}.png`),
    animations: "disabled",
  });
}

async function activate(page: Page, route: string) {
  await page.goto(route);
  const launch = page.getByRole("button", { name: "Edit page", exact: true });
  await expect(launch).toBeEnabled();
  await launch.click();
  await expect(
    page.getByRole("navigation", { name: "Editing toolbar" }),
  ).toBeVisible();
}

// One disposable server/database owns the complete screenshot set. Nothing is published.
test("capture consumer documentation and validate responsive commerce layouts", async ({
  page,
}) => {
  await fs.mkdir(output, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [1440, 820, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ["/shop", "/products/arc-chair"]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      if (width === 1440 && route === "/shop")
        await capture(page, "ecommerce-storefront");
      else
        await capture(
          page,
          `layout-${route === "/shop" ? "storefront" : "product"}-${width}`,
        );
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  const login = await page.request.post("/api/users/login", {
    data: { email: "admin@example.test", password: "synthetic-demo-password" },
  });
  expect(login.ok()).toBe(true);
  await activate(page, "/products/arc-chair");
  const heading = page.locator("main h1");
  await heading.click();
  await expect(heading).toHaveAttribute("contenteditable", "plaintext-only");
  await capture(page, "ecommerce-editor");
  await page
    .getByRole("img", {
      name: "Arc lounge chair in natural oak with oat upholstery",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "arc-chair.png image/png", exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-ve-selection-outline]")).toBeVisible();
  const mediaBounds = await page
    .locator('main [data-ve-field="image"]')
    .first()
    .boundingBox();
  const photoBounds = await page
    .getByRole("img", {
      name: "Arc lounge chair in natural oak with oat upholstery",
      exact: true,
    })
    .boundingBox();
  expect(Math.abs(mediaBounds!.height - photoBounds!.height)).toBeLessThan(2);
  await capture(page, "ecommerce-media");
  await page.getByRole("button", { name: /^Close .* panel$/ }).click();
  const product = (
    await (
      await page.request.get(
        "/api/products?where[slug][equals]=arc-chair&draft=true&depth=0",
      )
    ).json()
  ).docs[0];
  const variant = product.presentation.layout[0].variants[0];
  await page.locator(`main [data-ve-field="variants.@${variant.id}"]`).click();
  const panel = page.getByRole("complementary", { name: "Edit content" });
  await expect(panel.getByRole("textbox", { name: /^SKU/ })).toHaveValue(
    "ARC-OAK-OAT",
  );
  await panel
    .getByRole("checkbox", { name: "Available", exact: true })
    .uncheck();
  const leadTime = panel.getByRole("textbox", {
    name: "Lead Time",
    exact: true,
  });
  await expect(leadTime).toBeVisible();
  const finishSave = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().includes(`/api/products/${product.id}?`) &&
      response.ok(),
  );
  await leadTime.fill("Made to order in 2 weeks");
  await finishSave;
  await expect(
    page.getByRole("status", { name: "Draft saved", exact: true }),
  ).toBeVisible();
  await capture(page, "ecommerce-fields");
  await page.getByRole("button", { name: /^Close .* panel$/ }).click();
  await heading.click();
  await heading.fill("Arc lounge chair — natural oak");
  await expect(
    page.getByRole("status", { name: "Draft saved", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review changes", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Review changes", exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-ve-document-diff]")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish reviewed draft", exact: true }),
  ).toBeEnabled();
  const availability = page.locator('[data-ve-diff-path$=".available"]');
  await expect(availability.locator("del")).toHaveText("Yes");
  await expect(availability.locator("ins")).toHaveText("No");
  await capture(page, "ecommerce-review");

  await page.getByRole("button", { name: "Keep editing" }).click();
  await page.getByRole("button", { name: "More tools" }).click();
  await page.getByRole("menuitem", { name: "Compare sections" }).click();
  const comparison = page.getByRole("region", { name: "Compare sections" });
  const edited = page
    .locator("[data-ve-comparison-marker]")
    .filter({ hasText: "Edited" });
  await expect(
    comparison.getByRole("button", { name: "Draft", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(heading).toHaveText("Arc lounge chair — natural oak");
  await expect(edited).toBeVisible();
  await capture(page, "ecommerce-comparison-draft");

  await comparison
    .getByRole("button", { name: "Elements", exact: true })
    .click();
  await expect(
    comparison.getByText("2 changed elements", { exact: true }),
  ).toBeVisible();
  await expect(edited).toHaveCount(0);
  await capture(page, "ecommerce-comparison-elements");
  await comparison
    .getByRole("button", { name: "Sections", exact: true })
    .click();

  const published = comparison.getByRole("button", {
    name: "Published",
    exact: true,
  });
  await published.click();
  await expect(published).toHaveAttribute("aria-pressed", "true");
  await expect(heading).toHaveText("Arc lounge chair");
  await expect(edited).toBeVisible();
  await capture(page, "ecommerce-comparison-published");
  await page.keyboard.press("Escape");
  await expect(comparison).toHaveCount(0);
  await expect(heading).toHaveText("Arc lounge chair — natural oak");

  await activate(page, "/shop");
  const hero = page.locator("main > [data-ve-block]").first();
  await hero.scrollIntoViewIfNeeded();
  await hero.hover();
  await page.mouse.wheel(0, 200);
  const add = page.getByRole("combobox", { name: "Add section", exact: true });
  await add.click();
  const search = page.getByRole("combobox", { name: "Search sections" });
  await search.fill("information");
  await page.getByRole("option", { name: "Questions", exact: true }).hover();
  await expect(
    page.getByRole("heading", {
      name: "Your questions, answered.",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("heading", { name: "Your questions, answered.", exact: true })
    .scrollIntoViewIfNeeded();
  await capture(page, "ecommerce-sections");
  await search.press("Escape");
  await expect(
    page.getByRole("heading", {
      name: "Your questions, answered.",
      exact: true,
    }),
  ).toHaveCount(0);
  const copy =
    "Natural oak, a softly woven seat, and a solid frame. Built to last.";
  const phrase = "Built to last.";
  await createShopEditor(page, { richText: copy });
  const story = page.locator("#studio-story");
  const description = story.locator('[data-ve-field="description"]');
  await description.click();
  await description.fill("");
  await expect(
    page.getByRole("status", { name: "Draft saved", exact: true }),
  ).toBeVisible();

  const body = story.locator('[data-ve-field="body"]');
  await body.click();
  const editable = page.locator(
    '[data-ve-inline-active][contenteditable="true"]',
  );
  const formatting = page.getByRole("toolbar", { name: "Text formatting" });
  const bold = formatting.getByRole("button", { name: "Bold", exact: true });
  await expect(editable).toHaveText(copy);
  await editable.locator("p").evaluate((paragraph, phrase) => {
    const text = document
      .createTreeWalker(paragraph, NodeFilter.SHOW_TEXT)
      .nextNode();
    const start = text?.textContent?.indexOf(phrase) ?? -1;
    if (!text || start < 0) throw new Error("Missing rich-text fixture phrase");
    const range = document.createRange();
    range.setStart(text, start);
    range.setEnd(text, start + phrase.length);
    const selection = getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  }, phrase);
  await bold.click();
  await expect(bold).toHaveAttribute("aria-pressed", "true");
  await expect(editable.locator("strong")).toHaveText(phrase);
  await expect(
    page.getByRole("button", { name: "Review changes", exact: true }),
  ).toBeEnabled();
  await capture(page, "ecommerce-rich-text");
  expect(errors).toEqual([]);
});
