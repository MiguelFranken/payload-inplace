import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
async function createEditor(page: any, collection = "pages") {
  await page.goto("/visual-editor/start?collection=pages&slug=demo");
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("synthetic-demo-password");
  await page
    .getByRole("button", { name: "Sign in and start editing", exact: true })
    .click();
  await expect(
    page.getByRole("navigation", { name: "Editing toolbar" }),
  ).toBeVisible();
  const response = await page.request.post(`/api/${collection}`, {
    data: {
      title: "Optimistic proof",
      slug: `optimistic-${Date.now()}`,
      _status: "draft",
      layout: [
        {
          blockType: "hero",
          heading: "Immediate heading",
          caption: "Keep caption",
          privateNote: "Retain private",
          appearance: { tone: "light", align: "start" },
        },
        { blockType: "text", heading: "Second editable section" },
        { blockType: "serverData", heading: "Server-only fragment" },
      ],
    },
  });
  expect(response.ok()).toBeTruthy();
  const doc = (await response.json()).doc;
  await page.goto(`/visual-editor/start?collection=${collection}&id=${doc.id}`);
  await page
    .getByRole("button", { name: "Start editing", exact: true })
    .click();
  await expect(
    page.getByRole("navigation", { name: "Editing toolbar" }),
  ).toBeVisible();
  return doc;
}
async function selectHeading(page: any) {
  await page.getByRole("button", { name: "Edit content", exact: true }).click();
  await page
    .getByRole("heading", { name: "Immediate heading", exact: true })
    .click();
  return page.locator('main [contenteditable="plaintext-only"]');
}
test("instant inline edits and appearance survive delayed native saves and newer typing", async ({
  page,
}, testInfo) => {
  const doc = await createEditor(page);
  let release!: () => void, started!: () => void;
  const held = new Promise<void>((r) => (release = r)),
    requestStarted = new Promise<void>((r) => (started = r));
  let delayed = false;
  await page.route(`**/api/pages/${doc.id}?*`, async (route) => {
    if (route.request().method() === "PATCH" && !delayed) {
      delayed = true;
      started();
      await held;
    }
    await route.continue();
  });
  try {
    const inline = await selectHeading(page);
    await expect(
      page.getByRole("complementary", { name: "Edit content" }),
    ).toHaveCount(0);
    await inline.fill("Instant first edit");
    await expect(inline).toHaveText("Instant first edit");
    await expect(inline).toBeFocused();
    await requestStarted;
    await inline.press("End");
    await inline.pressSequentially(" and newer typing");
    await expect(inline).toHaveText("Instant first edit and newer typing");
    await page.screenshot({ path: "test-results/optimistic-save-pending.png" });
    release();
    await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
    await expect(inline).toBeFocused();
    await expect(inline).toHaveText("Instant first edit and newer typing");
    await page
      .getByRole("button", { name: "Options for Heading", exact: true })
      .click();
    const settings = page.getByRole("complementary", { name: "Edit content" });
    await expect(
      settings.getByRole("textbox", { name: "Heading", exact: true }),
    ).toHaveCount(0);
    await expect(
      settings.getByRole("textbox", { name: "Caption", exact: true }),
    ).toHaveCount(1);
    await page.getByRole("button", { name: "More tools", exact: true }).click();
    await page
      .getByRole("menuitem", { name: "Appearance", exact: true })
      .click();
    const appearance = page.getByRole("complementary", {
      name: "Appearance",
      exact: true,
    });
    await appearance.getByRole("combobox", { name: "Background" }).click();
    await page.getByText("Dark", { exact: true }).click();
    await expect(page.locator("main section").first()).toHaveCSS(
      "background-color",
      "lab(2.75381 0 0)",
    );
    await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
    const saved = await (
      await page.request.get(`/api/pages/${doc.id}?draft=true&depth=0`)
    ).json();
    expect(saved.layout[0].heading).toBe("Instant first edit and newer typing");
    expect(saved.layout[0].privateNote).toBe("Retain private");
    expect(saved.layout[0].appearance.tone).toBe("dark");
    await testInfo.attach("optimistic-editor", {
      body: await page.screenshot({
        path: "test-results/optimistic-options.png",
      }),
      contentType: "image/png",
    });
  } finally {
    release();
  }
});
test("failed native save retains optimistic text and offers explicit recovery", async ({
  page,
}) => {
  const doc = await createEditor(page);
  await page.route(`**/api/pages/${doc.id}?*`, async (route) => {
    if (route.request().method() === "PATCH")
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          errors: [{ message: "Synthetic unavailable save" }],
        }),
      });
    else await route.continue();
  });
  const inline = await selectHeading(page);
  await inline.fill("Keep my unsaved working copy");
  await expect(
    page.getByRole("alert").filter({ hasText: "Saving did not finish" }),
  ).toBeVisible();
  await expect(
    page.locator('main [data-ve-field="heading"]').first(),
  ).toHaveText("Keep my unsaved working copy");
  await expect(
    page.getByRole("button", { name: "Download working copy" }),
  ).toBeVisible();
  await expect(page.getByText("Draft saved", { exact: true })).toHaveCount(0);
  const saved = await (
    await page.request.get(`/api/pages/${doc.id}?draft=true&depth=0`)
  ).json();
  expect(saved.layout[0].heading).toBe("Immediate heading");
  await page.unroute(`**/api/pages/${doc.id}?*`);
  await page.getByRole("button", { name: "Retry saving", exact: true }).click();
  await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/pages/${doc.id}?draft=true&depth=0`)
          ).json()
        ).layout[0].heading,
    )
    .toBe("Keep my unsaved working copy");
  await page.screenshot({ path: "test-results/optimistic-recovered.png" });
});

test("multiple fields edited during a pending save survive and unchanged server normalization is accepted", async ({
  page,
}) => {
  const doc = await createEditor(page);
  let release!: () => void, started!: () => void;
  const held = new Promise<void>((r) => (release = r)),
    pending = new Promise<void>((r) => (started = r));
  let delayed = false;
  await page.route(`**/api/pages/${doc.id}?*`, async (route) => {
    if (route.request().method() === "PATCH" && !delayed) {
      delayed = true;
      started();
      await held;
    }
    await route.continue();
  });
  try {
    const inline = await selectHeading(page);
    await inline.fill("First submitted heading");
    await pending;
    await inline.fill("Newer heading while saving");
    await page
      .getByRole("button", { name: "Options for Heading", exact: true })
      .click();
    const settings = page.getByRole("complementary", { name: "Edit content" });
    await settings
      .getByRole("textbox", { name: "Caption", exact: true })
      .fill("Newer caption while saving");
    await page.getByRole("button", { name: "More tools", exact: true }).click();
    await page
      .getByRole("menuitem", { name: "Page details", exact: true })
      .click();
    const details = page.getByRole("complementary", { name: "Page details" });
    await details
      .getByRole("textbox", { name: /^Title/ })
      .fill("  Canonical normalized title  ");
    release();
    await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
    await expect(details.getByRole("textbox", { name: /^Title/ })).toHaveValue(
      "Canonical normalized title",
    );
    await page
      .getByRole("button", { name: "Close Page details panel", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Options for Heading", exact: true })
      .click();
    await expect(
      settings.getByRole("textbox", { name: "Caption", exact: true }),
    ).toHaveValue("Newer caption while saving");
    const saved = await (
      await page.request.get(`/api/pages/${doc.id}?draft=true&depth=0`)
    ).json();
    expect(saved.title).toBe("Canonical normalized title");
    expect(saved.layout[0].heading).toBe("Newer heading while saving");
    expect(saved.layout[0].caption).toBe("Newer caption while saving");
  } finally {
    release();
  }
});

for (const outcome of ["unavailable", "denied"] as const)
  test(`server preview ${outcome} preserves the working form after a saved draft`, async ({
    page,
  }) => {
    const doc = await createEditor(page);
    let saved = false,
      postSaveReads = 0,
      failed = false,
      writes = 0;
    page.on("response", (response) => {
      if (
        response.request().method() === "PATCH" &&
        new URL(response.url()).pathname === `/api/pages/${doc.id}` &&
        response.ok()
      ) {
        saved = true;
        writes++;
      }
    });
    await page.route("**/visual-editor?context=*", async (route) => {
      if (
        route.request().method() === "POST" &&
        saved &&
        ++postSaveReads === 2 &&
        !failed
      ) {
        failed = true;
        if (outcome === "unavailable") {
          await route.fulfill({
            status: 503,
            body: "Synthetic preview read failure",
          });
          return;
        }
        await page.request.post("/api/users/logout");
      }
      await route.continue();
    });
    const inline = await selectHeading(page);
    await inline.fill("Saved without replacing the native form");
    await inline.press("Tab");
    if (outcome === "unavailable") {
      await expect(
        page.getByText(
          "Your draft is saved. The server preview could not refresh.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        page.getByText("Draft saved", { exact: true }),
      ).toBeVisible();
      const before = writes;
      await page
        .getByRole("button", { name: "Refresh saved preview", exact: true })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Refresh saved preview",
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(page.locator("[data-server-revision]")).not.toHaveAttribute(
        "data-server-revision",
        String(doc._veRevision),
      );
      expect(writes).toBe(before);
    } else {
      await expect(
        page
          .getByRole("alert")
          .filter({ hasText: "Editing access expired or was revoked" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", {
          name: "Download working copy",
          exact: true,
        }),
      ).toBeVisible();
      const oldURL = page.url();
      const deniedActivation = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/api/visual-editor/activate" &&
          response.request().method() === "POST",
      );
      page.once("dialog", (dialog) => dialog.accept());
      await page
        .getByRole("button", { name: "Reopen editor", exact: true })
        .click();
      expect((await deniedActivation).status()).toBe(403);
      await expect(page.getByText(/Could not reopen the editor/)).toBeVisible();
      expect(page.url()).toBe(oldURL);
      await expect(
        page.getByRole("link", { name: "Sign in (new tab)", exact: true }),
      ).toHaveAttribute("target", "_blank");
    }
    await expect(
      page.locator('main [data-ve-field="heading"]').first(),
    ).toHaveText("Saved without replacing the native form");
    await expect(
      page.getByRole("navigation", { name: "Editing toolbar" }),
    ).toBeVisible();
    expect(failed).toBe(true);
  });

test("an empty native layout can add its first section and edit its empty heading in place", async ({
  page,
}) => {
  await createEditor(page);
  const response = await page.request.post("/api/pages", {
    data: {
      title: "Empty layout",
      slug: `empty-${Date.now()}`,
      _status: "draft",
      layout: [],
    },
  });
  expect(response.ok()).toBe(true);
  const doc = (await response.json()).doc;
  await page.goto(`/visual-editor/start?collection=pages&id=${doc.id}`);
  await page
    .getByRole("button", { name: "Start editing", exact: true })
    .click();
  await page.getByRole("button", { name: "Sections", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Add section", exact: true })
    .click();
  await page.getByRole("option", { name: "Hero", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Add a heading", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close Sections panel", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit content", exact: true }).click();
  await page
    .getByRole("heading", { name: "Add a heading", exact: true })
    .click();
  await page
    .locator('main [contenteditable="plaintext-only"]')
    .fill("First section, created inline");
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/pages/${doc.id}?draft=true&depth=0`)
          ).json()
        ).layout?.[0]?.heading,
    )
    .toBe("First section, created inline");
});

test("sections drag on list and page keeps native order, undo, policy and keyboard cancellation", async ({
  page,
}, testInfo) => {
  const doc = await createEditor(page);
  await page.getByRole("button", { name: "Sections", exact: true }).click();
  const panel = page.getByRole("complementary", {
    name: "Sections",
    exact: true,
  });
  const order = () =>
    page.locator("main section > h1,main section > h2").allTextContents();
  const before = await order();
  const rows = panel.locator("[data-ve-sortable]");
  const from = await rows
    .nth(2)
    .getByRole("button", { name: "Move Server data section", exact: true })
    .boundingBox();
  const target = await rows.nth(1).boundingBox();
  expect(from).toBeTruthy();
  expect(target).toBeTruthy();
  let writes = 0;
  page.on("request", (request) => {
    if (
      request.method() === "PATCH" &&
      new URL(request.url()).pathname === `/api/pages/${doc.id}`
    )
      writes++;
  });
  await page.mouse.move(from!.x + 20, from!.y + 20);
  await page.mouse.down();
  await page.mouse.move(from!.x + 20, from!.y + 10, { steps: 5 });
  // Observe longer than the demo autosave idle interval: dragging alone must not write.
  await page.waitForTimeout(1700);
  expect(writes).toBe(0);
  await page.mouse.move(target!.x + 80, target!.y + target!.height / 2, {
    steps: 12,
  });
  await expect(rows.nth(1)).toHaveAttribute("data-ve-drop-target", "true");
  await page.mouse.up();
  await expect.poll(order).toEqual([before[0], before[2], before[1]]);
  await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
  expect(
    (
      await (
        await page.request.get(`/api/pages/${doc.id}?draft=true&depth=0`)
      ).json()
    ).layout.map((b: any) => b.id),
  ).toEqual([doc.layout[0].id, doc.layout[2].id, doc.layout[1].id]);
  await page.getByRole("heading", { name: before[1], exact: true }).click();
  await page
    .locator('main [contenteditable="plaintext-only"]')
    .fill("Text changed after moving");
  before[1] = "Text changed after moving";
  await page.getByRole("button", { name: "Sections", exact: true }).click();
  await panel
    .getByRole("button", { name: "Undo section change", exact: true })
    .click();
  await expect.poll(order).toEqual(before);

  const pageHandle = await page
    .locator(`[data-ve-canvas-handle="${doc.layout[2].id}"]`)
    .getByRole("button", { name: "Move Server data section", exact: true })
    .boundingBox();
  const pageTarget = await page
    .locator(`main [data-ve-block="${doc.layout[1].id}"]:not([data-ve-field])`)
    .boundingBox();
  await page.mouse.move(pageHandle!.x + 20, pageHandle!.y + 20);
  await page.mouse.down();
  await page.mouse.move(pageHandle!.x + 20, pageHandle!.y + 10, { steps: 5 });
  await page.mouse.move(
    pageTarget!.x + 100,
    pageTarget!.y + pageTarget!.height / 2,
    { steps: 12 },
  );
  await expect(page.locator("[data-ve-drop-indicator]")).toBeVisible();
  await page.mouse.up();
  await expect.poll(order).toEqual([before[0], before[2], before[1]]);
  await page.getByRole("button", { name: "More tools", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Undo section change", exact: true })
    .click();
  await expect.poll(order).toEqual(before);
  // Keyboard reordering uses real page-bound rectangles, with no framework-specific canvas wrapper.
  const canvasText = page
    .locator(`[data-ve-canvas-handle="${doc.layout[1].id}"]`)
    .getByRole("button", { name: "Move Text section", exact: true });
  await canvasText.focus();
  await page.keyboard.press("Space");
  await expect(canvasText).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator(`[data-ve-canvas-handle="${doc.layout[1].id}"]`),
  ).toHaveAttribute("data-ve-drag-over", "true");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("[data-ve-drop-indicator]")).toBeVisible();
  await page.keyboard.press("Space");
  await expect.poll(order).toEqual([before[0], before[2], before[1]]);
  await page.getByRole("button", { name: "More tools", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Undo section change", exact: true })
    .click();
  await expect.poll(order).toEqual(before);
  const hero = panel.getByRole("button", {
    name: "Move Hero section",
    exact: true,
  });
  await expect(hero).toBeDisabled();
  await expect(
    panel.getByText("Hero · Fixed first", { exact: true }),
  ).toBeVisible();
  await expect.poll(order).toEqual(before);
  const text = panel.getByRole("button", {
    name: "Move Text section",
    exact: true,
  });
  await text.focus();
  await page.keyboard.press("Space");
  await expect(text).toHaveAttribute("aria-pressed", "true");
  await expect(rows.nth(1)).toHaveAttribute("data-ve-drag-over", "true");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect.poll(order).toEqual(before);
  await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
  await page
    .getByRole("combobox", { name: "Add section", exact: true })
    .click();
  await expect(
    page.getByRole("option", { name: "Text", exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-ve-select-popup]")).toHaveCSS(
    "opacity",
    "1",
  );
  await page.screenshot({
    path: "test-results/compact-toolbar-sections-select.png",
  });
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-ve-select-popup]")).toBeHidden();
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(
    page.getByRole("navigation", { name: "Editing toolbar" }),
  ).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "More tools", exact: true }),
  ).toBeInViewport();
  await expect(panel).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/compact-toolbar-mobile.png" });
  await testInfo.attach("reorder-persistence", {
    body: JSON.stringify({
      document: doc.id,
      pointerList: true,
      keyboardCanvas: true,
      cancel: true,
      firstBlockPolicy: true,
      noWritesDuringDrag: true,
    }),
    contentType: "application/json",
  });
});

test("context panels preserve keyboard focus and compact disclosure", async ({
  page,
}) => {
  await createEditor(page);
  const sections = page.getByRole("button", { name: "Sections", exact: true });
  await sections.focus();
  await sections.press("Enter");
  const panel = page.getByRole("complementary", {
    name: "Sections",
    exact: true,
  });
  await expect(
    panel.getByRole("button", { name: /1\. Immediate heading/ }),
  ).toBeFocused();
  await panel
    .getByRole("button", { name: "Close Sections panel", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(panel).toHaveCount(0);
  await expect(sections).toBeFocused();
  const more = page.getByRole("button", { name: "More tools", exact: true });
  await more.focus();
  await more.press("Enter");
  await expect(page.getByRole("menu", { name: "More tools" })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("menuitem", { name: "Check saved content", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(
    page.getByRole("menuitem", { name: "Page details", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  const details = page.getByRole("complementary", {
    name: "Page details",
    exact: true,
  });
  await expect(details.getByRole("textbox", { name: /^Title/ })).toBeFocused();
  await details
    .getByRole("button", { name: "Close Page details panel", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(more).toBeFocused();
  const minimize = page.getByRole("button", {
    name: "Minimize editor",
    exact: true,
  });
  await minimize.focus();
  await minimize.press("Enter");
  const launcher = page.getByRole("button", { name: "Edit page", exact: true });
  await expect(launcher).toBeFocused();
  await launcher.press("Enter");
  await expect(
    page.getByRole("button", { name: "Edit content", exact: true }),
  ).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    page.getByRole("navigation", { name: "Editing toolbar" }),
  ).toHaveCSS("transition-duration", "0s");
});

test("direct editing stays active across text, panels and section navigation", async ({
  page,
}, testInfo) => {
  const doc = await createEditor(page);
  // The normal task requires no mode button between fields.
  await page
    .getByRole("heading", { name: "Immediate heading", exact: true })
    .click();
  let inline = page.locator('main [contenteditable="plaintext-only"]');
  await expect(inline).toBeFocused();
  await inline.fill("A clearer page title");
  await page
    .getByRole("heading", { name: "Second editable section", exact: true })
    .click();
  inline = page.locator('main [contenteditable="plaintext-only"]');
  await expect(inline).toBeFocused();
  await inline.fill("A useful second section");
  await page.locator('main [data-ve-field="caption"]').click();
  await expect(inline).toBeFocused();
  await inline.fill("Write directly where the content lives.");
  await inline.press("Escape");
  await page.getByRole("button", { name: "More tools", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Search appearance", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Search appearance", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("heading", { name: "A clearer page title", exact: true })
    .click();
  await expect(page.getByRole("complementary")).toHaveCount(0);
  await expect(inline).toBeFocused();
  await page.getByRole("button", { name: "Sections", exact: true }).click();
  const panel = page.getByRole("complementary", {
    name: "Sections",
    exact: true,
  });
  await panel
    .getByRole("button", { name: /2\. A useful second section/ })
    .click();
  await expect(panel).toHaveCount(0);
  await expect(inline).toHaveText("A useful second section");
  await expect(inline).toBeFocused();
  await page.getByRole("button", { name: "Sections", exact: true }).click();
  await panel
    .getByRole("button", { name: "Settings for Text section", exact: true })
    .click();
  const settings = page.getByRole("complementary", {
    name: "Edit content",
    exact: true,
  });
  await expect(
    settings.getByRole("textbox", { name: "Heading", exact: true }),
  ).toHaveValue("A useful second section");
  await page
    .getByRole("button", { name: "Back to sections", exact: true })
    .click();
  await expect(panel).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Undo section change", exact: true }),
  ).toBeVisible();
  await panel
    .getByRole("combobox", { name: "Add section", exact: true })
    .click();
  await expect(
    page.getByRole("option", { name: "Hero", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("option", { name: "Text", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
  const saved = await (
    await page.request.get(`/api/pages/${doc.id}?draft=true&depth=0`)
  ).json();
  expect(saved.layout[0].heading).toBe("A clearer page title");
  expect(saved.layout[1].heading).toBe("A useful second section");
  expect(saved.layout[0].caption).toBe(
    "Write directly where the content lives.",
  );
  await page.screenshot({ path: "test-results/direct-editing-desktop.png" });
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(
    page
      .getByRole("navigation", { name: "Editing toolbar" })
      .getByText("Edit", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sections", exact: true }),
  ).toBeInViewport();
  const bounds = await page
    .getByRole("navigation", { name: "Editing toolbar" })
    .locator("button")
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const r = node.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
      }),
    );
  expect(bounds.every((r) => r.left >= 0 && r.right <= 320)).toBe(true);
  await page.screenshot({ path: "test-results/direct-editing-mobile.png" });
  await testInfo.attach("task-flow", {
    body: JSON.stringify({
      directClicksForThreeFields: 3,
      rearmClicks: 0,
      panelClosesOnPageSelection: true,
      rowSelectsContent: true,
      settingsSeparate: true,
      invalidAddOptionsHidden: true,
      allThreeFieldsPersisted: true,
      mobileLabelsVisible: true,
    }),
    contentType: "application/json",
  });
});

test("keyboard save keeps the caret and newer text, Escape closes settings without disabling editing", async ({
  page,
}) => {
  const doc = await createEditor(page);
  await page
    .getByRole("heading", { name: "Immediate heading", exact: true })
    .click();
  const inline = page.locator('main [contenteditable="plaintext-only"]');
  await inline.fill("Keyboard save");
  let release!: () => void, started!: () => void;
  const held = new Promise<void>((resolve) => {
      release = resolve;
    }),
    pending = new Promise<void>((resolve) => {
      started = resolve;
    });
  let delayed = false;
  await page.route(`**/api/pages/${doc.id}?*`, async (route) => {
    if (
      route.request().method() === "PATCH" &&
      !new URL(route.request().url()).searchParams.has("autosave") &&
      !delayed
    ) {
      delayed = true;
      started();
      await held;
    }
    await route.continue();
  });
  try {
    await inline.press("ControlOrMeta+s");
    await pending;
    await expect(inline).toBeFocused();
    await inline.press("End");
    await inline.pressSequentially(" and keep typing");
    release();
    await expect(inline).toBeFocused();
    await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
    await expect
      .poll(
        async () =>
          (
            await (
              await page.request.get(`/api/pages/${doc.id}?draft=true&depth=0`)
            ).json()
          ).layout[0].heading,
      )
      .toBe("Keyboard save and keep typing");
    await page
      .getByRole("button", { name: "Options for Heading", exact: true })
      .click();
    const panel = page.getByRole("complementary", {
      name: "Edit content",
      exact: true,
    });
    await panel
      .getByRole("textbox", { name: "Caption", exact: true })
      .press("Escape");
    await expect(panel).toHaveCount(0);
    await page
      .getByRole("heading", { name: "Second editable section", exact: true })
      .click();
    await expect(inline).toBeFocused();
  } finally {
    release();
  }
});

test("an expired editing session reopens the saved draft with fresh authorization", async ({
  page,
}) => {
  await page.clock.install();
  const doc = await createEditor(page);
  const oldContext = new URL(page.url()).searchParams.get("context");
  await page.clock.fastForward(16 * 60 * 1000);
  await expect(
    page.getByRole("button", { name: "Reopen editor", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download working copy", exact: true }),
  ).toBeVisible();
  // Server timestamps use real time; the synthetic clock only exercises the client expiry boundary.
  await page.clock.setSystemTime(Date.now());
  await page
    .getByRole("button", { name: "Reopen editor", exact: true })
    .click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("context"))
    .not.toBe(oldContext);
  await expect(
    page.getByRole("navigation", { name: "Editing toolbar" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reopen editor", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("heading", { name: "Immediate heading", exact: true })
    .click();
  await expect(
    page.locator('main [contenteditable="plaintext-only"]'),
  ).toBeFocused();
  const saved = await page.request.get(
    `/api/pages/${doc.id}?draft=true&depth=0`,
  );
  expect((await saved.json()).layout[0].heading).toBe("Immediate heading");
  await page.goto("/visual-editor?context=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
  await expect(
    page.getByRole("heading", { name: "Open the editor again", exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-ve-block]")).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.screenshot({
    path: "test-results/editor-link-recovery-mobile.png",
  });
  await page.getByRole("link", { name: "Open demo page", exact: true }).click();
  await page.getByRole("button", { name: "Edit page", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Editing toolbar" }),
  ).toBeVisible();
});

test("German 320px dock contains every visible action and minimizes through its tools menu", async ({
  page,
}) => {
  await createEditor(page);
  await page
    .context()
    .addCookies([{ name: "payload-lng", value: "de", url: page.url() }]);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.reload();
  const dock = page.getByRole("navigation", { name: "Editing toolbar" });
  await expect(
    page.getByRole("button", { name: "Inhalte bearbeiten", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Abschnitte", exact: true }),
  ).toBeVisible();
  const bounds = await dock.boundingBox();
  expect(bounds).toBeTruthy();
  for (const button of await dock.getByRole("button").all()) {
    if (!(await button.isVisible())) continue;
    const box = await button.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(bounds!.x + 1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(
      bounds!.x + bounds!.width - 1,
    );
  }
  await page
    .getByRole("button", { name: "Weitere Werkzeuge", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Editor minimieren", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Seite bearbeiten", exact: true }),
  ).toBeVisible();
});

test("native dark controls remain accessible without changing the website theme", async ({
  page,
}) => {
  await createEditor(page);
  const websiteTheme = await page.locator("html").getAttribute("data-theme");
  await page
    .context()
    .addCookies([{ name: "payload-theme", value: "dark", url: page.url() }]);
  await page.reload();
  await expect(page.locator('[data-ve-ui][data-theme="dark"]')).toHaveCount(1);
  await page
    .getByRole("heading", { name: "Immediate heading", exact: true })
    .click();
  await page.getByRole("button", { name: "More tools", exact: true }).click();
  await page.getByRole("menuitem", { name: "Appearance", exact: true }).click();
  const panel = page.getByRole("complementary", {
    name: "Appearance",
    exact: true,
  });
  await expect(
    panel.getByRole("combobox", { name: "Background" }),
  ).toBeVisible();
  expect(
    await panel.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    ),
  ).not.toBe("rgb(255, 255, 255)");
  expect(await page.locator("html").getAttribute("data-theme")).toBe(
    websiteTheme,
  );
  const audit = await new AxeBuilder({ page })
    .include("[data-ve-ui]")
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.screenshot({ path: "test-results/frontend-dark.png" });
});

test("repeated contextual disclosure releases its document listeners and observers", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const types = new Set([
      "pointermove",
      "pointerleave",
      "keydown",
      "scroll",
      "resize",
      "focus",
      "message",
      "submit",
    ]);
    const active = new Map<string, { type: string }>();
    const ids = new WeakMap<object, number>();
    let next = 0;
    const add = EventTarget.prototype.addEventListener,
      remove = EventTarget.prototype.removeEventListener;
    const key = (
      target: EventTarget,
      type: string,
      callback: any,
      options: any,
    ) => {
      if (
        (target !== document && target !== window) ||
        !callback ||
        !types.has(type)
      )
        return;
      if (!ids.has(callback)) ids.set(callback, ++next);
      return `${target === document ? "document" : "window"}:${type}:${ids.get(callback)}:${typeof options === "boolean" ? options : Boolean(options?.capture)}`;
    };
    EventTarget.prototype.addEventListener = function (
      type,
      callback,
      options,
    ) {
      const id = key(this, type, callback, options);
      if (id) active.set(id, { type });
      return add.call(this, type, callback, options);
    };
    EventTarget.prototype.removeEventListener = function (
      type,
      callback,
      options,
    ) {
      const id = key(this, type, callback, options);
      if (id) active.delete(id);
      return remove.call(this, type, callback, options);
    };
    const observed = new Set<Set<Element>>();
    const NativeResizeObserver = window.ResizeObserver;
    window.ResizeObserver = class extends NativeResizeObserver {
      targets = new Set<Element>();
      constructor(callback: ResizeObserverCallback) {
        super(callback);
        observed.add(this.targets);
      }
      observe(target: Element, options?: ResizeObserverOptions) {
        this.targets.add(target);
        super.observe(target, options);
      }
      unobserve(target: Element) {
        this.targets.delete(target);
        super.unobserve(target);
      }
      disconnect() {
        this.targets.clear();
        super.disconnect();
      }
    };
    (window as any).__editorLifecycle = () => ({
      listeners: active.size,
      resizeTargets: [...observed].reduce(
        (count, targets) => count + targets.size,
        0,
      ),
      pointerMove: [...active.values()].filter(
        (value) => value.type === "pointermove",
      ).length,
    });
  });
  await createEditor(page);
  const cycle = async () => {
    await page.getByRole("button", { name: "Sections", exact: true }).click();
    await page
      .getByRole("button", { name: "Close Sections panel", exact: true })
      .click();
  };
  await cycle();
  const before = await page.evaluate(() => (window as any).__editorLifecycle());
  expect(before.pointerMove).toBeGreaterThan(0);
  for (let index = 0; index < 6; index++) await cycle();
  await expect
    .poll(() => page.evaluate(() => (window as any).__editorLifecycle()))
    .toEqual(before);
});

test("large documents keep native inline input within the active interaction budget", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  await createEditor(page);
  const response = await page.request.post("/api/pages", {
    data: {
      title: "Large document",
      slug: `large-${Date.now()}`,
      _status: "draft",
      layout: [
        {
          blockType: "hero",
          heading: "Large document heading",
          privateNote: "Retain this",
        },
        ...Array.from({ length: 74 }, (_, index) => ({
          blockType: "text",
          heading: `Section ${index + 1}`,
        })),
      ],
    },
  });
  expect(response.ok()).toBe(true);
  const document = (await response.json()).doc;
  await page.goto(`/visual-editor/start?collection=pages&id=${document.id}`);
  await page
    .getByRole("button", { name: "Start editing", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Large document heading", exact: true })
    .click();
  const inline = page.locator('main [contenteditable="plaintext-only"]');
  await inline.evaluate((element) => {
    const samples: number[] = [];
    (window as any).__inlineFrames = samples;
    element.addEventListener("input", () => {
      const start = performance.now();
      requestAnimationFrame(() => samples.push(performance.now() - start));
    });
  });
  await inline.press("End");
  await inline.pressSequentially(" feels immediate");
  await expect
    .poll(() => page.evaluate(() => (window as any).__inlineFrames.length))
    .toBeGreaterThanOrEqual(15);
  const frames: number[] = await page.evaluate(
    () => (window as any).__inlineFrames,
  );
  const ordered = [...frames].sort((a, b) => a - b),
    p95 = ordered[Math.ceil(ordered.length * 0.95) - 1];
  expect(p95).toBeLessThan(100);
  await page.keyboard.press("ControlOrMeta+s");
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(
              `/api/pages/${document.id}?draft=true&depth=0`,
            )
          ).json()
        ).layout[0].heading,
    )
    .toBe("Large document heading feels immediate");
  await testInfo.attach("large-document-budget", {
    body: JSON.stringify({
      blocks: 75,
      samples: frames.length,
      inputFrameP95Ms: p95,
      budgetMs: 100,
    }),
    contentType: "application/json",
  });
});

test("native save errors reveal an unmounted field and retry the same form", async ({
  page,
}) => {
  const doc = await createEditor(page, "validatedPages");
  await page.getByRole("button", { name: "More tools", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Page details", exact: true })
    .click();
  const details = page.getByRole("complementary", {
    name: "Page details",
    exact: true,
  });
  await details.getByRole("textbox", { name: /^Title/ }).fill("Rejected title");
  await details
    .getByRole("button", { name: "Close Page details panel", exact: true })
    .click();
  await page.keyboard.press("ControlOrMeta+s");
  await page.getByRole("button", { name: "Edit Title", exact: true }).click();
  const correction = page.getByRole("complementary", {
    name: "Fix field",
    exact: true,
  });
  const title = correction.getByRole("textbox", { name: /^Title/ });
  await expect(title).toHaveValue("Rejected title");
  await expect(title).toBeFocused();
  await expect(
    correction.getByText("Use a different title.", { exact: true }).first(),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 760 });
  await page.screenshot({
    path: "test-results/native-validation-correction.png",
  });
  await title.fill("Corrected native title");
  await correction
    .getByRole("button", { name: "Retry saving", exact: true })
    .click();
  await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
  await expect(correction).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "More tools", exact: true }),
  ).toBeFocused();
  const saved = await page.request.get(
    `/api/validatedPages/${doc.id}?draft=true&depth=0`,
  );
  expect((await saved.json()).title).toBe("Corrected native title");
});
