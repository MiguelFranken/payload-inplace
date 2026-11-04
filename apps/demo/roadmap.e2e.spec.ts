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
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
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
  await expect(
    page.getByRole("button", { name: "Close Studio story panel", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("an explicitly bound empty native array can add an item on the canvas", async ({
  page,
}) => {
  const { createShopEditor } = await import("./testing/editor-fixtures");
  const { doc } = await createShopEditor(page, { emptyCards: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
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
  const panel = page.getByRole("complementary", {
    name: "Edit content",
    exact: true,
  });
  await expect(
    panel.getByRole("textbox", { name: "Heading", exact: true }),
  ).toBeVisible();
  await expect(panel.getByText("Studio card", { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
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

test("catalogue search and delayed canvas previews cancel without a native save or history entry", async ({
  page,
}) => {
  const { createShopEditor } = await import("./testing/editor-fixtures");
  const { doc } = await createShopEditor(page);
  const patches: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "PATCH" &&
      request.url().includes(`/api/shops/${doc.id}?`)
    )
      patches.push(request.url());
  });
  const hero = page.locator("main > [data-ve-block]").first();
  await hero.scrollIntoViewIfNeeded();
  await hero.hover();
  await page.mouse.wheel(0, 200);
  const add = page.getByRole("combobox", {
    name: "Add section after",
    exact: true,
  });
  await add.click();
  const search = page.getByRole("combobox", { name: "Search sections" });
  await expect(search).toBeVisible();
  await search.fill("does not exist");
  await expect(
    page.getByText("No matching sections.", { exact: true }),
  ).toBeVisible();
  await search.fill("storytelling");
  const story = page.getByRole("option", { name: "Studio story", exact: true });
  await expect(story).toBeVisible();
  await story.hover();
  await expect(
    page.getByRole("heading", { name: "A story worth sharing.", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/roadmap-catalogue-preview.png" });
  // Native autosave's idle deadline passes while only the presentation delta exists.
  await page.waitForTimeout(1800);
  expect(patches).toEqual([]);
  const saved = await (
    await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
  ).json();
  expect(saved._veRevision).toBe(doc._veRevision);
  expect(saved.layout.map((row: any) => row.id)).toEqual(
    doc.layout.map((row: any) => row.id),
  );
  await search.press("Escape");
  await expect(
    page.getByRole("heading", { name: "A story worth sharing.", exact: true }),
  ).toHaveCount(0);
  expect(patches).toEqual([]);
  await expect(
    page.getByRole("navigation", { name: "Editing toolbar" }),
  ).toBeVisible();
});

test("a consumer scalar strategy saves through native Form and can hand back to the native field", async ({
  page,
}) => {
  const { createShopEditor } = await import("./testing/editor-fixtures");
  const { doc } = await createShopEditor(page);
  const select = page.getByRole("button", {
    name: "Select content",
    exact: true,
  });
  if ((await select.getAttribute("aria-pressed")) !== "true")
    await select.click();
  // Consumer-controlled annotation fixture: this real coloured surface addresses one select instead of its whole group.
  const surface = page.locator('[data-ve-field="promo"]');
  await surface.evaluate((element) => {
    element.setAttribute("data-ve-field", "promo.background");
    element.setAttribute("data-ve-edit", "auto");
    element.setAttribute("data-test-strategy-surface", "");
  });
  const target = page.locator("[data-test-strategy-surface]");
  await target.scrollIntoViewIfNeeded();
  await target.click({ position: { x: 8, y: 8 } });
  const presets = page.getByRole("group", { name: "Background presets" });
  await expect(presets).toBeVisible();
  await presets.getByRole("button", { name: "Sand", exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
          ).json()
        ).layout.find((block: any) => block.blockType === "productGrid").promo
          .background,
    )
    .toBe("sand");
  await presets
    .getByRole("button", { name: "Open native field", exact: true })
    .click();
  await expect(presets).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: "Background", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Editing toolbar" }),
  ).toBeVisible();
});

test("saved versions reopen, compare changed content and restore a guarded draft through the native queue", async ({
  page,
}) => {
  const { createShopEditor } = await import("./testing/editor-fixtures");
  const { doc } = await createShopEditor(page);
  const select = page.getByRole("button", {
    name: "Select content",
    exact: true,
  });
  if ((await select.getAttribute("aria-pressed")) !== "true")
    await select.click();
  const heading = page.locator('main [data-ve-field="heading"]').first();
  await heading.click();
  await heading.press("ControlOrMeta+End");
  await heading.pressSequentially(" Revision two");
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
          ).json()
        )._veRevision,
    )
    .toBeGreaterThan(doc._veRevision);
  await heading.press("Escape");
  await expect(
    page.getByRole("button", { name: "Review changes", exact: true }),
  ).toBeEnabled();
  const url = page.url();
  await page.evaluate(() => {
    (window as any).__versionHeader = document.querySelector(
      "[data-test-site-header]",
    );
  });
  await page.getByRole("button", { name: "More tools", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Saved versions", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Saved versions", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: `Compare version ${doc._veRevision}`,
      exact: true,
    })
    .click();
  await expect(page.locator("[data-ve-diff-path]")).not.toHaveCount(0);
  const writes: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "PATCH" &&
      request.url().includes(`/api/shops/${doc.id}?`)
    )
      writes.push(request.url());
  });
  await page
    .getByRole("button", { name: "Restore as draft", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Saved versions", exact: true }),
  ).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
          ).json()
        ).layout[0].heading,
    )
    .toBe(doc.layout[0].heading);
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
          ).json()
        )._veRevision,
    )
    .toBeGreaterThan(doc._veRevision + 1);
  const saved = await (
    await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
  ).json();
  expect(saved._status).toBe("draft");
  expect(page.url()).toBe(url);
  expect(
    await page.evaluate(
      () =>
        (window as any).__versionHeader ===
        document.querySelector("[data-test-site-header]"),
    ),
  ).toBe(true);
  await page.waitForTimeout(1800);
  expect(writes).toHaveLength(1);
  await page.getByRole("button", { name: "More tools", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Saved versions", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Saved versions", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close Saved versions panel", exact: true })
    .click();
  await page.getByRole("button", { name: "More tools", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Saved versions", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Saved versions", exact: true }),
  ).toBeVisible();
});

test("contextual native media replacement saves only the document reference and keeps native fallback", async ({
  page,
}) => {
  const { createShopEditor } = await import("./testing/editor-fixtures");
  const { doc } = await createShopEditor(page);
  const media = (await (await page.request.get("/api/media?depth=0")).json())
    .docs;
  const originalID = doc.layout[0].image?.id ?? doc.layout[0].image;
  const original = media.find(
    (asset: any) => String(asset.id) === String(originalID),
  );
  const replacement = media.find(
    (asset: any) => String(asset.id) !== String(originalID),
  );
  expect(original).toBeTruthy();
  expect(replacement).toBeTruthy();
  const select = page.getByRole("button", {
    name: "Select content",
    exact: true,
  });
  if ((await select.getAttribute("aria-pressed")) !== "true")
    await select.click();
  const image = page
    .locator("main > [data-ve-block]")
    .first()
    .locator('[data-ve-field="image"]');
  await image.scrollIntoViewIfNeeded();
  await image.click();
  await expect(page.getByLabel("Search media", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: replacement.filename, exact: false })
    .click();
  await expect
    .poll(async () =>
      String(
        (
          await (
            await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
          ).json()
        ).layout[0].image,
      ),
    )
    .toBe(String(replacement.id));
  const unchanged = await (
    await page.request.get(`/api/media/${original.id}?depth=0`)
  ).json();
  expect(unchanged.updatedAt).toBe(original.updatedAt);
  expect(unchanged.alt).toBe(original.alt);
  await page
    .getByRole("button", { name: "Open native media editor", exact: true })
    .click();
  await expect(page.getByLabel("Search media", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Editing toolbar" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/roadmap-media.png" });
});

test("lifecycle observers correlate failed and retried saves without leaking content or breaking review", async ({
  page,
}) => {
  const { createShopEditor } = await import("./testing/editor-fixtures");
  const { doc } = await createShopEditor(page);
  await page.evaluate(() => {
    const target = window as Window & {
      __demoRejectObserver?: boolean;
      __observed?: unknown[];
    };
    target.__demoRejectObserver = true;
    target.__observed = [];
    window.addEventListener("payload-inplace:demo-event", (event) =>
      target.__observed!.push((event as CustomEvent).detail),
    );
  });
  await page.route(`**/api/shops/${doc.id}?*`, async (route) => {
    if (route.request().method() === "PATCH")
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          errors: [{ message: "Synthetic save unavailable" }],
        }),
      });
    else await route.continue();
  });
  const select = page.getByRole("button", {
    name: "Select content",
    exact: true,
  });
  if ((await select.getAttribute("aria-pressed")) !== "true")
    await select.click();
  const heading = page.locator('[data-ve-field="heading"]').first();
  await heading.click();
  await heading.fill("Observed private copy");
  await expect(
    page.getByRole("alert").filter({ hasText: "Saving did not finish" }),
  ).toBeVisible();
  await page.unroute(`**/api/shops/${doc.id}?*`);
  await page.getByRole("button", { name: "Retry saving", exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
          ).json()
        ).layout[0].heading,
    )
    .toBe("Observed private copy");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            (
              window as Window & {
                __observed?: {
                  type: string;
                  operation: string;
                  outcome?: string;
                }[];
              }
            ).__observed || []
          ).filter(
            (event) =>
              event.type === "operation-settled" &&
              event.operation === "preview" &&
              event.outcome === "succeeded",
          ).length,
      ),
    )
    .toBe(1);
  await page
    .getByRole("button", { name: "Review changes", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const events = await page.evaluate(
    () =>
      (
        window as Window & {
          __observed?: {
            type: string;
            operation: string;
            operationId: string;
            parentOperationId?: string;
            outcome?: string;
            scope: { document: { id: string | number } };
          }[];
        }
      ).__observed || [],
  );
  expect(
    events.filter(
      (event) =>
        event.operation === "save" && event.type === "operation-started",
    ),
  ).toHaveLength(2);
  expect(
    events.filter(
      (event) =>
        event.operation === "save" &&
        event.type === "operation-settled" &&
        event.outcome === "succeeded",
    ),
  ).toHaveLength(1);
  expect(
    events.some(
      (event) =>
        event.operation === "review" &&
        event.type === "operation-settled" &&
        event.outcome === "succeeded",
    ),
  ).toBe(true);
  expect(
    events.filter(
      (event) =>
        event.operation === "save" &&
        event.type === "operation-settled" &&
        event.outcome === "failed",
    ),
  ).toHaveLength(1);
  const save = events.find(
    (event) =>
      event.operation === "save" &&
      event.type === "operation-settled" &&
      event.outcome === "succeeded",
  );
  expect(
    events.find((event) => event.operation === "preview")?.parentOperationId,
  ).toBe(save?.operationId);
  expect(
    events.every((event) => String(event.scope.document.id) === String(doc.id)),
  ).toBe(true);
  expect(JSON.stringify(events)).not.toMatch(
    /Observed private copy|_veActivation|reviewToken|password|candidate|formState/,
  );
});

test("a stale native writer reviews and combines disjoint changes without replacing another editor’s fields", async ({
  page,
}) => {
  const { createShopEditor } = await import("./testing/editor-fixtures");
  const { doc } = await createShopEditor(page);
  let release!: () => void, started!: () => void;
  const waiting = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route(`**/api/shops/${doc.id}?*`, async (route) => {
    if (route.request().method() === "PATCH") {
      started();
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await route.continue();
    } else await route.continue();
  });
  const select = page.getByRole("button", {
    name: "Select content",
    exact: true,
  });
  if ((await select.getAttribute("aria-pressed")) !== "true")
    await select.click();
  const heading = page.locator('[data-ve-field="heading"]').first();
  await heading.click();
  await heading.fill("My recovered heading");
  await waiting;
  const before = await (
    await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
  ).json();
  const remote = await page.request.patch(
    `/api/shops/${doc.id}?draft=true&depth=0`,
    {
      data: {
        title: "Remote title kept",
        _status: "draft",
        _veRevision: before._veRevision,
      },
    },
  );
  expect(remote.ok()).toBeTruthy();
  const rejected = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      new URL(response.url()).pathname === `/api/shops/${doc.id}`,
  );
  release();
  expect((await rejected).status()).toBe(409);
  await page.unroute(`**/api/shops/${doc.id}?*`);
  await page
    .getByRole("button", { name: "Compare and recover", exact: true })
    .click();
  const panel = page.getByRole("complementary", {
    name: "Resolve draft conflict",
    exact: true,
  });
  await expect(
    panel.getByText(
      "These changes affect separate fields and can be combined safely.",
    ),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/roadmap-conflict-comparison.png",
  });
  await page.setViewportSize({ width: 320, height: 760 });
  await expect(panel).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/roadmap-conflict-comparison-320.png",
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await panel
    .getByRole("button", {
      name: "Close Resolve draft conflict panel",
      exact: true,
    })
    .click();
  expect(
    (
      await (
        await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
      ).json()
    ).layout[0].heading,
  ).not.toBe("My recovered heading");
  await page
    .getByRole("button", { name: "Compare and recover", exact: true })
    .click();
  await panel
    .getByRole("button", { name: "Use combined copy and save", exact: true })
    .click();
  await expect(panel).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
          ).json()
        ).layout[0].heading,
    )
    .toBe("My recovered heading");
  const saved = await (
    await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
  ).json();
  expect(saved.title).toBe("Remote title kept");
  expect(saved._veRevision).toBe((await remote.json()).doc._veRevision + 1);
  expect(saved._status).toBe("draft");
  await page.screenshot({
    path: "test-results/roadmap-conflict-recovered.png",
  });
});

test("native advisory locks pause another user and release when the original editor exits", async ({
  page,
  browser,
}) => {
  const { createShopEditor } = await import("./testing/editor-fixtures");
  const { doc } = await createShopEditor(page);
  const email = `lease-browser-${Date.now()}@example.test`,
    password = "synthetic-lease-browser";
  expect(
    (
      await page.request.post("/api/users", {
        data: { email, password, role: "admin" },
      })
    ).ok(),
  ).toBeTruthy();
  const other = await browser.newContext();
  try {
    const login = await other.request.post(
      new URL("/api/users/login", page.url()).href,
      { data: { email, password } },
    );
    expect(login.ok()).toBeTruthy();
    const second = await other.newPage();
    await second.goto(
      new URL(`/visual-editor/start?collection=shops&id=${doc.id}`, page.url())
        .href,
    );
    await second
      .getByRole("button", { name: "Start editing", exact: true })
      .click();
    await expect(
      second
        .getByRole("status")
        .filter({ hasText: "Another editor is working on this document." }),
    ).toBeVisible();
    await expect(
      second.getByRole("button", { name: "Select content", exact: true }),
    ).toBeDisabled();
    await second.setViewportSize({ width: 320, height: 760 });
    expect(
      await second.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await second.screenshot({
      path: "test-results/roadmap-native-lock-320.png",
    });
    await page.getByRole("button", { name: "More tools", exact: true }).click();
    await page
      .getByRole("menuitem", { name: "Exit editing", exact: true })
      .click();
    await expect(
      page.getByRole("navigation", { name: "Editing toolbar" }),
    ).toHaveCount(0);
    await second
      .getByRole("button", { name: "Check again", exact: true })
      .click();
    await expect(
      second.getByRole("button", { name: "Select content", exact: true }),
    ).toBeEnabled();
    await expect(
      second
        .getByRole("status")
        .filter({ hasText: "Another editor is working on this document." }),
    ).toHaveCount(0);
  } finally {
    await other.close();
  }
});
