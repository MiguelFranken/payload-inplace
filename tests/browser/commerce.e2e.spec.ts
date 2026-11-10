import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function productEditor(page: Page, role = "admin") {
  await page.goto("/shop");
  const login = await page.request.post("/api/users/login", {
    data: {
      email: `${role}@example.test`,
      password: "synthetic-demo-password",
    },
  });
  expect(login.ok()).toBeTruthy();
  const source = await page.request.get(
    "/api/products?where[slug][equals]=arc-chair&depth=0",
  );
  const original = (await source.json()).docs[0];
  const clone = (value: any): any =>
    Array.isArray(value)
      ? value.map(clone)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value)
              .filter(([key]) => key !== "id")
              .map(([key, item]) => [key, clone(item)]),
          )
        : value;
  const slug = `arc-proof-${Date.now()}-${role}`;
  const response = await page.request.post("/api/products", {
    data: {
      title: "Commerce proof",
      slug,
      presentation: clone(original.presentation),
      search: original.search,
      ...(role === "admin" ? { internalCost: 310 } : {}),
      _status: "draft",
    },
  });
  expect(response.ok()).toBeTruthy();
  const document = (await response.json()).doc;
  // Fixture creation follows the real review guard instead of bypassing publication.
  await page.goto(`/visual-editor/start?collection=products&id=${document.id}`);
  await page
    .getByRole("button", { name: "Start editing", exact: true })
    .click();
  await expect(
    page.getByRole("navigation", { name: "Editing toolbar" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review changes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Publish reviewed draft", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Publish reviewed draft", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Edit page", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Arc lounge chair", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    (window as any).__commerceHeader = document.querySelector(
      "[data-test-site-header]",
    );
  });
  const url = page.url();
  await page.getByRole("button", { name: "Edit page", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Editing toolbar" }),
  ).toBeVisible();
  expect(page.url()).toBe(url);
  expect(
    await page.evaluate(
      () =>
        (window as any).__commerceHeader ===
        document.querySelector("[data-test-site-header]"),
    ),
  ).toBe(true);
  return document;
}

async function saved(page: Page) {
  await expect(
    page.getByRole("status", { name: "Draft saved", exact: true }),
  ).toBeVisible();
}

test("commerce storefront and product stay readable and public without authoring at desktop and 320px", async ({
  page,
}) => {
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/shop");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "A little more room to slow down.",
    );
    await expect(page.locator("[data-ve-ui]")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Edit page", exact: true }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: `test-results/commerce-storefront-${width}.png`,
      fullPage: width === 320,
    });
    await page.getByRole("link", { name: /Open Arc lounge chair/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Arc lounge chair",
    );
    await expect(page.getByText("€640", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("img", {
        name: "Arc lounge chair in natural oak with oat upholstery",
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: `test-results/commerce-product-${width}.png`,
      fullPage: width === 320,
    });
  }
  const publicProduct = await page.request.get(
    "/api/products?where[slug][equals]=arc-chair&depth=0",
  );
  expect((await publicProduct.json()).docs[0]).not.toHaveProperty(
    "internalCost",
  );
});

test("commerce inline terminals batch saves, preserve nested identity and publish only the reviewed draft", async ({
  page,
  browser,
}) => {
  const product = await productEditor(page);
  const patches: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "PATCH" &&
      request.url().includes(`/api/products/${product.id}?`)
    )
      patches.push(request.url());
  });
  const heading = page.locator("main h1");
  await heading.click();
  await expect(heading).toHaveAttribute("contenteditable", "plaintext-only");
  await heading.press("ControlOrMeta+a");
  await heading.press("ArrowRight");
  await heading.pressSequentially("!!", { delay: 40 });
  await saved(page);
  expect(patches).toHaveLength(1);
  await expect(heading).toHaveText("Arc lounge chair!!");
  await expect(page.locator("[data-ve-selection-outline]")).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Edit content" }),
  ).toHaveCount(0);
  await page.screenshot({ path: "test-results/commerce-inline-editor.png" });
  const value = page.locator('main dd[data-ve-field$=".value"]').first();
  await value.click();
  await expect(value).toHaveAttribute("contenteditable", "plaintext-only");
  await value.fill("Solid oak with a repairable linen seat.");
  await saved(page);
  const care = page.locator('main [data-ve-field$=".instruction"]').first();
  await care.click();
  await expect(care).toHaveAttribute("contenteditable", "plaintext-only");
  await care.fill("Clean the oak with a soft, dry cloth.");
  await saved(page);
  const expectedVariants = structuredClone(
    product.presentation.layout[0].variants,
  );
  expectedVariants[0].details.care[0].instruction =
    "Clean the oak with a soft, dry cloth.";
  const draft = await (
    await page.request.get(`/api/products/${product.id}?draft=true&depth=0`)
  ).json();
  expect(
    draft.presentation.layout[0].specifications.map((row: any) => row.id),
  ).toEqual(
    product.presentation.layout[0].specifications.map((row: any) => row.id),
  );
  expect(draft.presentation.layout[0].variants).toEqual(expectedVariants);
  expect(draft.internalCost).toBe(310);
  const anon = await browser.newContext();
  try {
    const visitor = await anon.newPage();
    await visitor.goto(new URL(`/products/${product.slug}`, page.url()).href);
    await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(
      "Arc lounge chair",
    );
    await page
      .getByRole("button", { name: "Review changes", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Review changes", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Publish reviewed draft", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Publish reviewed draft", exact: true }),
    ).toHaveCount(0);
    await visitor.reload();
    await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(
      "Arc lounge chair!!",
    );
  } finally {
    await anon.close();
  }
});

test("commerce compound price and array-item panels use native fields, conditions and repeatable reopening", async ({
  page,
}) => {
  const product = await productEditor(page, "editor");
  await page.locator("main [data-ve-fields]").click();
  const panel = page.getByRole("complementary", { name: "Edit content" });
  await expect(
    panel.getByRole("spinbutton", { name: /^Amount/ }),
  ).toBeVisible();
  await expect(
    panel.getByRole("textbox", { name: "Internal Cost", exact: true }),
  ).toHaveCount(0);
  await panel.getByRole("spinbutton", { name: /^Amount/ }).fill("690");
  await saved(page);
  await expect(page.getByText("€690", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Close .* panel$/ }).click();
  const variant = product.presentation.layout[0].variants[0];
  await page.locator(`main [data-ve-field="variants.@${variant.id}"]`).click();
  await expect(panel.getByRole("textbox", { name: /^SKU/ })).toHaveValue(
    "ARC-OAK-OAT",
  );
  await expect(
    panel.getByRole("textbox", { name: "Lead Time", exact: true }),
  ).toHaveCount(0);
  await panel
    .getByRole("checkbox", { name: "Available", exact: true })
    .uncheck();
  const lead = panel.getByRole("textbox", { name: "Lead Time", exact: true });
  await expect(lead).toBeVisible();
  await lead.fill("Made to order in 2 weeks");
  await saved(page);
  await expect(
    page.getByText("Made to order in 2 weeks", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Close .* panel$/ }).click();
  await page.locator(`main [data-ve-field="variants.@${variant.id}"]`).click();
  await expect(panel.getByRole("textbox", { name: /^SKU/ })).toHaveValue(
    "ARC-OAK-OAT",
  );
  const draft = await (
    await page.request.get(`/api/products/${product.id}?draft=true&depth=0`)
  ).json();
  expect(draft).not.toHaveProperty("internalCost");
  expect(draft.presentation.layout[0].variants[0].details.care).toEqual(
    product.presentation.layout[0].variants[0].details.care,
  );
  expect(draft.presentation.layout[0].pricing).toEqual({
    amount: 690,
    currency: "EUR",
  });
  await page.screenshot({ path: "test-results/commerce-native-fields.png" });
  await page
    .getByRole("button", { name: "Review changes", exact: true })
    .click();
  const diff = page.locator("[data-ve-document-diff]");
  const available = diff.locator("[data-ve-diff-path$='.available']");
  await expect(available.locator("del")).toHaveText("Yes");
  await expect(available.locator("ins")).toHaveText("No");
  const amount = diff.locator("[data-ve-diff-path$='.pricing.amount']");
  await expect(amount.locator("del")).toHaveText("640");
  await expect(amount.locator("ins")).toHaveText("690");
  await page.screenshot({ path: "test-results/commerce-typed-review.png" });

  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await available.scrollIntoViewIfNeeded();
  await expect(available.locator("ins")).toBeVisible();
  expect(
    await diff.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/commerce-typed-review-narrow.png",
  });
  await page.keyboard.press("Escape");
  await expect(diff).toHaveCount(0);
});

test("every storefront block exposes nested terminals, promotion settings and owned product cards", async ({
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
  const stripIDs = (value: any): any =>
    Array.isArray(value)
      ? value.map(stripIDs)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value)
              .filter(([key]) => key !== "id")
              .map(([key, item]) => [key, stripIDs(item)]),
          )
        : value;
  const created = await page.request.post("/api/shops", {
    data: {
      title: "Complete storefront proof",
      slug: `shop-proof-${Date.now()}`,
      layout: stripIDs(source.layout),
      _status: "draft",
    },
  });
  expect(created.ok()).toBeTruthy();
  const shop = (await created.json()).doc;
  await page.goto(`/visual-editor/start?collection=shops&id=${shop.id}`);
  await page
    .getByRole("button", { name: "Start editing", exact: true })
    .click();
  const panel = page.getByRole("complementary", { name: "Edit content" });
  await expect(
    page.getByRole("navigation", { name: "Editing toolbar" }),
  ).toBeVisible();
  const promo = page.locator('main [data-ve-field="promo"]');
  await page
    .getByRole("button", { name: "Select content", exact: true })
    .click();
  await promo.scrollIntoViewIfNeeded();
  await promo.hover({ position: { x: 8, y: 8 } });
  const hover = page.locator("[data-ve-hover-outline]");
  await expect(hover).toBeVisible();
  const promoBox = await promo.boundingBox();
  await expect
    .poll(async () => Math.round((await hover.boundingBox())!.width))
    .toBe(Math.round(promoBox!.width));
  await promo.click({ position: { x: 8, y: 8 } });
  await expect(
    panel.getByRole("textbox", { name: "Eyebrow", exact: true }),
  ).toBeVisible();
  await expect(
    panel.getByRole("textbox", { name: "Link target", exact: true }),
  ).toBeVisible();
  await panel
    .getByRole("combobox", { name: "Background", exact: true })
    .click();
  await page.getByRole("option", { name: "Sand", exact: true }).click();
  await saved(page);
  await expect(promo).toHaveClass(/demo:bg-photo/);
  await page.getByRole("button", { name: /^Close .* panel$/ }).click();
  const edit = async (selector: string, text: string) => {
    const terminal = page.locator(selector).first();
    await terminal.click();
    await expect(terminal).toHaveAttribute("contenteditable", "plaintext-only");
    await terminal.fill(text);
    await saved(page);
    await expect(terminal).toHaveText(text);
    await expect(panel).toHaveCount(0);
  };
  await edit('main [data-ve-field="promo.heading"]', "Room for what matters.");
  await page.screenshot({ path: "test-results/commerce-promo-editor.png" });
  await page.locator('main [data-ve-field="promo.action"]').click();
  await expect(
    panel.getByRole("textbox", { name: "Label", exact: true }),
  ).toHaveValue("Meet the studio");
  await expect(
    panel.getByRole("textbox", { name: "Link target", exact: true }),
  ).toHaveValue("#studio-story");
  await page.getByRole("button", { name: /^Close .* panel$/ }).click();
  await edit(
    'main [data-ve-field$=".heading"][data-ve-field^="cards."]',
    "A quiet corner chair",
  );
  await edit('main [data-ve-field="note"]', "Made for everyday life.");
  await expect(
    page.locator('main a[data-ve-field^="cards."][data-ve-field$=".product"]'),
  ).toHaveAttribute("href", "/products/arc-chair");
  await expect(
    page
      .getByRole("img", {
        name: "Arc lounge chair in natural oak with oat upholstery",
      })
      .first(),
  ).toBeVisible();
  await edit('main [data-ve-field="eyebrow"]', "Considered essentials");
  await edit(
    'main [data-ve-field$=".answer"]',
    "Every visible content element can be edited.",
  );
  const draft = await (
    await page.request.get(`/api/shops/${shop.id}?draft=true&depth=0`)
  ).json();
  const grid = draft.layout.find(
    (block: any) => block.blockType === "productGrid",
  );
  expect(grid.promo).toMatchObject({
    heading: "Room for what matters.",
    background: "sand",
    action: { label: "Meet the studio", href: "#studio-story" },
  });
  expect(grid.cards[0].heading).toBe("A quiet corner chair");
  const product = (
    await (
      await page.request.get(
        "/api/products?where[slug][equals]=arc-chair&depth=0",
      )
    ).json()
  ).docs[0];
  expect(product.presentation.layout[0].heading).toBe("Arc lounge chair");
  await page.screenshot({ path: "test-results/commerce-complete-editing.png" });
});

test("native schema hot reload synchronizes client and server maps before rendering new fields", async ({
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
  const proof = await page.request.post("/native-schema-proof");
  expect(proof.ok(), await proof.text()).toBeTruthy();
  expect(await proof.json()).toEqual({
    reproduced: true,
    promo: "Space for the things that matter.",
    card: "Arc lounge chair",
  });
});
