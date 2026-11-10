import { test, expect } from "@playwright/test";
import { createShopEditor, moveCaretToEnd } from "./testing/editor-fixtures";

test("rich-text formatting, safe paste and slow acknowledgements preserve structured native data", async ({
  page,
}) => {
  await page.goto("/shop");
  const pages = await (
    await page.request.get("/api/pages?limit=1&depth=0")
  ).json();
  const media = await (
    await page.request.get("/api/media?limit=1&depth=0")
  ).json();
  const text = (value: string) => ({
    type: "text",
    version: 1,
    text: value,
    format: 0,
    detail: 0,
    mode: "normal",
    style: "",
  });
  const internal = {
    type: "link",
    version: 3,
    id: "keep-internal-link",
    fields: {
      linkType: "internal",
      doc: { relationTo: "pages", value: pages.docs[0].id },
      newTab: true,
    },
    children: [text("Internal reference")],
  };
  const upload = {
    type: "upload",
    version: 3,
    relationTo: "media",
    value: media.docs[0].id,
    fields: {},
  };
  const richBody = {
    root: {
      type: "root",
      version: 1,
      format: "",
      indent: 0,
      direction: null,
      children: [
        {
          type: "paragraph",
          version: 1,
          format: "",
          indent: 0,
          direction: null,
          children: [text("Native rich text. "), internal],
        },
        upload,
      ],
    },
  };
  const { doc } = await createShopEditor(page, { richBody });
  const body = page.locator('[data-ve-field="body"]').first();
  await body.click();
  const rich = page.locator('[data-ve-inline-active][contenteditable="true"]');
  await expect(rich).toHaveAttribute("contenteditable", "true");
  await expect(rich.locator('[data-pve-opaque="upload"]')).toHaveAttribute(
    "contenteditable",
    "false",
  );
  const snapshot = async () =>
    await (
      await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
    ).json();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const header = await page.locator("[data-test-site-header]").elementHandle();
  const firstParagraph = rich.locator("p").first();
  // Use the browser selection API only to select existing text. The real toolbar
  // and Lexical transaction perform formatting; tests never write editor state.
  await firstParagraph.evaluate((el) => {
    const selection = getSelection()!;
    const range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await expect(firstParagraph.locator("strong, b").first()).toBeVisible();
  await rich.focus();
  await firstParagraph.evaluate((el) => {
    const selection = getSelection()!;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  });
  let release!: () => void, started!: () => void;
  const waiting = new Promise<void>((resolve) => {
    started = resolve;
  });
  let intercepted = false;
  await page.route(`**/api/shops/${doc.id}?*`, async (route) => {
    if (route.request().method() === "PATCH" && !intercepted) {
      intercepted = true;
      started();
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    }
    await route.continue();
  });
  try {
    await rich.pressSequentially(" First edit.");
    await expect(rich).toContainText("First edit.");
    await waiting;
    await rich.pressSequentially(" Newer edit.");
    await expect(rich).toContainText("Newer edit.");
    const selected = await rich.evaluate((el) => ({
      node: document.activeElement === el,
      text: el.textContent,
    }));
    release();
    await expect
      .poll(async () =>
        JSON.stringify(
          (await snapshot()).layout.find(
            (row: any) => row.blockType === "editorial",
          ).body,
        ),
      )
      .toContain("Newer edit.");
    await expect(rich).toBeFocused();
    expect(await rich.textContent()).toBe(selected.text);
  } finally {
    release?.();
    await page.unroute(`**/api/shops/${doc.id}?*`);
  }
  // Paste through Lexical's real ClipboardEvent handler. Dangerous hrefs must be
  // flattened to text while safe links and marks survive JSON persistence.
  await rich.evaluate((el) => {
    const data = new DataTransfer();
    data.setData(
      "text/html",
      '<p><strong>Safe pasted text</strong> <a href="javascript:alert(1)">unsafe link text</a> <a href="https://example.test/guide">safe external link</a></p>',
    );
    data.setData(
      "text/plain",
      "Safe pasted text unsafe link text safe external link",
    );
    el.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      }),
    );
  });
  await expect(rich).toContainText("Safe pasted text");
  await expect
    .poll(async () =>
      JSON.stringify(
        (await snapshot()).layout.find(
          (row: any) => row.blockType === "editorial",
        ).body,
      ),
    )
    .toContain("safe external link");
  await rich.focus();
  await rich
    .locator("p")
    .first()
    .evaluate((el) => {
      const text = document
        .createTreeWalker(el, NodeFilter.SHOW_TEXT)
        .nextNode()!;
      const selection = getSelection()!;
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, Math.min(6, text.textContent?.length || 0));
      selection.removeAllRanges();
      selection.addRange(range);
    });
  await page
    .getByRole("toolbar", { name: "Text formatting" })
    .getByRole("button", { name: "Edit link", exact: true })
    .click();
  await page
    .getByLabel("Link address", { exact: true })
    .fill("https://example.test/manual");
  await page.getByRole("button", { name: "Apply link", exact: true }).click();
  await expect
    .poll(async () =>
      JSON.stringify(
        (await snapshot()).layout.find(
          (row: any) => row.blockType === "editorial",
        ).body,
      ),
    )
    .toContain("https://example.test/manual");
  const saved = (await snapshot()).layout.find(
    (row: any) => row.blockType === "editorial",
  ).body;
  expect(JSON.stringify(saved)).not.toContain("javascript:");
  expect(JSON.stringify(saved)).toContain("https://example.test/guide");
  const flatten = (node: any): any[] => [
    node,
    ...(node.children || []).flatMap(flatten),
  ];
  const nodes = flatten(saved.root);
  expect(nodes.find((node) => node.id === internal.id)?.fields).toEqual(
    internal.fields,
  );
  expect(nodes.find((node) => node.type === "upload")).toMatchObject(upload);
  expect(
    nodes.some((node) => node.type === "text" && (node.format & 1) === 1),
  ).toBe(true);
  expect(
    await page
      .locator("[data-test-site-header]")
      .evaluate((el, original) => el === original, header),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Options for Body", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Close Body panel", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("rich-text composition defers native submission until the composed value is complete", async ({
  page,
}) => {
  const { doc } = await createShopEditor(page);
  await page.locator('[data-ve-field="body"]').first().click();
  const rich = page.locator('[data-ve-inline-active][contenteditable="true"]');
  const writes: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "PATCH" &&
      new URL(request.url()).pathname === `/api/shops/${doc.id}`
    )
      writes.push(request.postData() || "");
  });
  await rich.dispatchEvent("compositionstart", { data: "" });
  await rich.pressSequentially("日本語");
  await page.waitForTimeout(1900);
  expect(writes).toHaveLength(0);
  await rich.dispatchEvent("compositionend", { data: "日本語" });
  await expect
    .poll(async () =>
      JSON.stringify(
        (
          await (
            await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
          ).json()
        ).layout.find((row: any) => row.blockType === "editorial").body,
      ),
    )
    .toContain("日本語");
  await expect(rich).toBeFocused();
  expect(writes).toHaveLength(1);
});

test("source text survives capitalize, NBSP, multiline and opaque renderer fallback without an unchanged write", async ({
  page,
}) => {
  const eyebrow = "small\u00a0Mixed case";
  const description = "First mixed Case\nSecond\u00a0line";
  const { doc } = await createShopEditor(page, {
    sourceText: { eyebrow, description },
  });
  const read = async () =>
    await (
      await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
    ).json();
  const target = page.locator('[data-ve-field="eyebrow"]').first();
  // This is a consumer presentation variant, not an editor-state mutation.
  await target.evaluate((el) => {
    (el as HTMLElement).style.textTransform = "capitalize";
  });
  await target.click();
  await expect(target).toHaveAttribute("contenteditable", "plaintext-only");
  await target.press("Tab");
  await page.waitForTimeout(1800);
  expect((await read())._veRevision).toBe(doc._veRevision);
  expect((await read()).layout[0].eyebrow).toBe(eyebrow);
  await target.click();
  await moveCaretToEnd(target);
  await target.pressSequentially("!");
  await expect
    .poll(async () => (await read()).layout[0].eyebrow)
    .toBe(`${eyebrow}!`);
  await target.press("Escape");
  const multiline = page.locator('[data-ve-field="description"]').first();
  await multiline.click();
  await expect(multiline).toHaveAttribute("contenteditable", "plaintext-only");
  await moveCaretToEnd(multiline);
  await multiline.press("Enter");
  await expect(multiline).toBeFocused();
  await expect(multiline).toHaveAttribute("contenteditable", "plaintext-only");
  await multiline.pressSequentially("Third line");
  await expect
    .poll(async () => (await read()).layout[0].description)
    .toBe(`${description}\nThird line`);
  await multiline.press("Escape");
  // A renderer that truncates a native text value is deliberately opaque to the
  // inline adapter; the native field retains the complete original source.
  const revision = (await read())._veRevision;
  await target.evaluate((el) => {
    el.textContent = "Truncated…";
  });
  await target.click();
  await expect(target).not.toHaveAttribute("contenteditable", "plaintext-only");
  await expect(
    page.getByRole("complementary", { name: "Edit content", exact: true }),
  ).toBeVisible();
  expect((await read())._veRevision).toBe(revision);
  expect((await read()).layout[0].eyebrow).toBe(`${eyebrow}!`);
});

test("touch-emulated canvas insertion and ordering use one native structural command each", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    hasTouch: true,
    viewport: { width: 1024, height: 900 },
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    const { doc } = await createShopEditor(page);
    const read = async () =>
      await (
        await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
      ).json();
    const hero = page.locator("main > [data-ve-block]").first();
    await hero.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 200));
    const add = page.getByRole("combobox", {
      name: "Add section",
      exact: true,
    });
    await expect(add).toBeVisible();
    const header = await page
      .locator("[data-test-site-header]")
      .elementHandle();
    await add.tap();
    await page.getByRole("option", { name: "Studio story", exact: true }).tap();
    await expect
      .poll(async () => (await read()).layout.length)
      .toBe(doc.layout.length + 1);
    await page
      .getByRole("button", { name: "Close Studio story panel", exact: true })
      .tap();
    await page.getByRole("button", { name: "Sections", exact: true }).tap();
    const panel = page.getByRole("complementary", {
      name: "Sections",
      exact: true,
    });
    const handle = panel
      .getByRole("button", { name: "Move Studio story section", exact: true })
      .first();
    const rows = panel.locator("[data-ve-sortable]");
    const a = await handle.boundingBox();
    const b = await rows.nth(2).boundingBox();
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    const before = (await read()).layout.map((row: any) => row.id);
    const cdp = await context.newCDPSession(page);
    const start = { x: a!.x + a!.width / 2, y: a!.y + a!.height / 2 };
    const end = { x: b!.x + b!.width / 2, y: b!.y + b!.height / 2 };
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...start, id: 1 }],
    });
    for (let step = 1; step <= 12; step++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: start.x + ((end.x - start.x) * step) / 12,
            y: start.y + ((end.y - start.y) * step) / 12,
            id: 1,
          },
        ],
      });
      await page.waitForTimeout(20);
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.detach();
    const after = [before[0], before[2], before[1], ...before.slice(3)];
    await expect
      .poll(async () => (await read()).layout.map((row: any) => row.id))
      .toEqual(after);
    await panel
      .getByRole("button", { name: "Undo section change", exact: true })
      .tap();
    await expect
      .poll(async () => (await read()).layout.map((row: any) => row.id))
      .toEqual(before);
    expect(
      await page
        .locator("[data-test-site-header]")
        .evaluate((el, original) => el === original, header),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await context.close();
  }
});

test("media selection persists through its panel and compact review survives save metadata updates", async ({
  page,
}, testInfo) => {
  const { doc } = await createShopEditor(page);
  const dock = page.getByRole("navigation", { name: "Editing toolbar" });
  const before = (await dock.boundingBox())!;
  expect(before.height).toBeLessThanOrEqual(48);
  expect(before.width).toBeLessThan(280);
  const image = page.locator('#studio-story [data-ve-field="image"]').first();
  await image.scrollIntoViewIfNeeded();
  await image.click();
  const panel = page.getByRole("complementary", {
    name: "Edit content",
    exact: true,
  });
  await expect(
    panel.getByRole("textbox", { name: "Search media" }),
  ).toBeVisible();
  const nativeMedia = panel.getByRole("button", {
    name: "Open native media editor",
    exact: true,
  });
  const hasSurface = async (control: typeof nativeMedia) => {
    const fill = await control.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    expect(fill).not.toBe("rgba(0, 0, 0, 0)");
    expect(fill).not.toBe("transparent");
    expect(fill).not.toBe("rgb(255, 255, 255)");
    return fill;
  };
  await hasSurface(nativeMedia);
  await panel
    .getByRole("button", { name: "Back to sections", exact: true })
    .click();
  const sectionsPanel = page.getByRole("complementary", {
    name: "Sections",
    exact: true,
  });
  const addSection = sectionsPanel.getByRole("combobox", {
    name: "Add section",
    exact: true,
  });
  await page.mouse.move(0, 0);
  const restingFill = await hasSurface(addSection);
  await addSection.hover();
  await expect
    .poll(() =>
      addSection.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    )
    .not.toBe(restingFill);
  await addSection.click();
  const catalogueSearch = page.getByRole("combobox", {
    name: "Search sections",
  });
  await expect(catalogueSearch).toBeVisible();
  await catalogueSearch.press("Escape");
  await page.screenshot({
    path: testInfo.outputPath("panel-action-surfaces.png"),
  });
  await sectionsPanel
    .getByRole("button", { name: "Close Sections panel", exact: true })
    .click();
  await image.click();
  await expect(nativeMedia).toBeVisible();
  const outline = page.locator("[data-ve-selection-outline]");
  await expect(outline).toBeVisible();
  await panel.getByRole("textbox", { name: "Search media" }).fill("studio");
  await expect(outline).toBeVisible();
  const bounds = (await image.boundingBox())!;
  const selected = (await outline.boundingBox())!;
  expect(Math.abs(bounds.x - selected.x)).toBeLessThan(2);
  expect(Math.abs(bounds.width - selected.width)).toBeLessThan(2);
  await panel
    .getByRole("button", { name: "Close Image panel", exact: true })
    .click();
  await expect(outline).toHaveCount(0);
  const heading = page
    .locator('#studio-story [data-ve-field="heading"]')
    .first();
  await heading.click();
  await expect(heading).toHaveAttribute("contenteditable", "plaintext-only");
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().includes(`/api/shops/${doc.id}`),
  );
  await heading.fill("An edited studio story");
  expect((await saved).ok()).toBeTruthy();
  const review = dock.getByRole("button", {
    name: "Review changes",
    exact: true,
  });
  await expect(review).toBeEnabled();
  expect((await dock.boundingBox())!.height).toBe(before.height);
  expect((await dock.boundingBox())!.width).toBe(before.width);
  expect(await dock.locator("[data-ve-save-status]").count()).toBe(0);
  await expect(page.locator("[data-ve-save-feedback]")).toHaveAttribute(
    "data-phase",
    "hidden",
  );
  for (let pass = 0; pass < 2; pass++) {
    await review.click();
    const dialog = page.getByRole("dialog", { name: "Document changes" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("An edited studio story");
    if (pass === 0)
      await dialog
        .getByRole("button", { name: "Keep editing", exact: true })
        .click();
    else
      await dialog
        .getByRole("button", { name: "Publish reviewed draft", exact: true })
        .click();
    await expect(dialog).toHaveCount(0);
    if (pass === 0) await expect(review).toBeEnabled();
    else await expect(page.locator("[data-ve-ui]")).toHaveCount(0);
  }
  const persisted = await (
    await page.request.get(`/api/shops/${doc.id}?depth=0`)
  ).json();
  expect(persisted._status).toBe("published");
  expect(
    persisted.layout.find(
      (block: { blockType: string }) => block.blockType === "editorial",
    ).heading,
  ).toBe("An edited studio story");
  await page.screenshot({
    path: testInfo.outputPath("compact-reviewed-toolbar.png"),
  });
});

test("selection geometry grows and shrinks with wrapping text and the live rich-text surface", async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 900 });
  await createShopEditor(page);
  const heading = page.locator('[data-ve-field="promo.heading"]').first();
  await heading.scrollIntoViewIfNeeded();
  await heading.click();
  await expect(heading).toHaveAttribute("contenteditable", "plaintext-only");
  const outline = page.locator("[data-ve-selection-outline]");
  const compare = async (target: typeof heading) => {
    await expect
      .poll(async () => {
        const a = (await target.boundingBox())!,
          b = (await outline.boundingBox())!;
        return Math.max(
          Math.abs(a.x - b.x),
          Math.abs(a.y - b.y),
          Math.abs(a.width - b.width),
          Math.abs(a.height - b.height),
        );
      })
      .toBeLessThan(2);
  };
  const original = (await heading.boundingBox())!.height;
  await heading.fill(
    "Space for the things that matter. More room for thoughtful choices and carefully made objects that become part of everyday life.",
  );
  await expect
    .poll(async () => (await heading.boundingBox())!.height)
    .toBeGreaterThan(original);
  await compare(heading);
  await heading.fill("Less.");
  await compare(heading);
  // Host transforms move the box without resizing it or emitting a scroll event.
  await heading.evaluate((element) => {
    element.style.transform = "translateY(-28px)";
  });
  await compare(heading);
  await heading.evaluate((element) => {
    element.style.transform = "";
  });
  await compare(heading);
  const body = page.locator('#studio-story [data-ve-field="body"]').first();
  await body.scrollIntoViewIfNeeded();
  await body.click();
  const rich = page.locator('[data-ve-inline-active][contenteditable="true"]');
  await expect(rich).toHaveAttribute("contenteditable", "true");
  await rich.press("ControlOrMeta+End");
  await rich.press("Enter");
  await page.keyboard.insertText(
    "A new paragraph changes the actual rich-text surface height while the original React subtree remains mounted.",
  );
  // The bound presentation wrapper owns the outline. Its nested editable can
  // exclude paragraph margins or occupy a narrower grid column.
  const liveBody = page
    .locator('#studio-story [data-ve-field="body"]')
    .filter({ visible: true });
  await compare(liveBody);
  await page.screenshot({
    path: "test-results/responsive-selection-geometry.png",
  });
});

test("reviewed publication exits in place only after acknowledgement and can start a fresh session", async ({
  page,
}) => {
  const rejectedLeaseRequests: number[] = [];
  page.on("response", (response) => {
    if (
      new URL(response.url()).pathname === "/api/visual-editor/lock" &&
      response.status() >= 400
    )
      rejectedLeaseRequests.push(response.status());
  });
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
  const originalShop = (
    await (
      await page.request.get("/api/shops?where[slug][equals]=home&depth=0")
    ).json()
  ).docs[0];
  try {
    await page.reload();
    await page.evaluate(() => {
      (window as any).__publishedWebsite = {
        document,
        header: document.querySelector("header"),
        footer: document.querySelector("footer"),
      };
    });
    const url = page.url();
    await page.getByRole("button", { name: "Edit page", exact: true }).click();
    await expect(
      page.getByRole("navigation", { name: "Editing toolbar" }),
    ).toBeVisible();
    const heading = page.locator('[data-ve-field="heading"]').first();
    await heading.click();
    await expect(heading).toHaveAttribute("contenteditable", "plaintext-only");
    await heading.fill("A published home, ready to browse.");
    await expect(
      page.getByRole("status", { name: "Draft saved", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Review changes", exact: true })
      .click();
    let reject = true;
    await page.route("**/api/shops/*", async (route) => {
      if (
        reject &&
        route.request().method() === "PATCH" &&
        route.request().postData()?.includes('"_status":"published"')
      ) {
        reject = false;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            errors: [{ message: "Synthetic publication unavailable" }],
          }),
        });
      } else await route.continue();
    });
    const review = page.getByRole("dialog", { name: "Document changes" });
    await review
      .getByRole("button", { name: "Publish reviewed draft", exact: true })
      .click();
    await expect(review).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Editing toolbar" }),
    ).toBeVisible();
    await expect(review.getByRole("alert")).toBeVisible();
    // A failed native submission uses the existing recovery queue. Re-save the
    // retained draft, then obtain a fresh signed review before publication.
    await review
      .getByRole("button", { name: "Keep editing", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Retry saving", exact: true })
      .click();
    await expect(
      page.getByRole("status", { name: "Draft saved", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Review changes", exact: true })
      .click();
    await review
      .getByRole("button", { name: "Publish reviewed draft", exact: true })
      .click();
    await expect(page.locator("[data-ve-ui]")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "A published home, ready to browse.",
    );
    await expect(
      page.getByRole("button", { name: "Edit page", exact: true }),
    ).toBeVisible();
    expect(page.url()).toBe(url);
    expect(
      await page.evaluate(() => {
        const original = (window as any).__publishedWebsite;
        return (
          original?.document === document &&
          original.header === document.querySelector("header") &&
          original.footer === document.querySelector("footer")
        );
      }),
    ).toBe(true);
    await page.getByRole("button", { name: "Edit page", exact: true }).click();
    await expect(
      page.getByRole("navigation", { name: "Editing toolbar" }),
    ).toBeVisible();
    await expect(page.locator('[data-ve-field="heading"]').first()).toHaveText(
      "A published home, ready to browse.",
    );
    expect(rejectedLeaseRequests).toEqual([]);
  } finally {
    // This scenario exercises the real /shop transition. Restore its shared
    // synthetic seed through the same draft/review/publication contract so the
    // following anonymous storefront checks remain independent of test order.
    const current = await (
      await page.request.get(`/api/shops/${originalShop.id}?draft=true&depth=0`)
    ).json();
    const restored = await page.request.patch(
      `/api/shops/${originalShop.id}?draft=true&depth=0`,
      {
        data: { _veRevision: current._veRevision, layout: originalShop.layout },
      },
    );
    expect(restored.ok()).toBeTruthy();
    const draft = (await restored.json()).doc;
    const review = await page.request.post("/api/visual-editor/review", {
      headers: { Origin: new URL(page.url()).origin },
      data: {
        target: { collection: "shops", id: originalShop.id, root: "layout" },
        candidate: draft,
      },
    });
    expect(review.ok()).toBeTruthy();
    const published = await page.request.patch(
      `/api/shops/${originalShop.id}?depth=0`,
      {
        data: {
          ...draft,
          _status: "published",
          _veReviewToken: (await review.json()).token,
        },
      },
    );
    expect(published.ok()).toBeTruthy();
  }
});

test("compact rich-text toolbar follows selection and reflects existing formatting", async ({
  page,
}) => {
  const paragraph = (text: string, format = 0) => ({
    type: "paragraph",
    version: 1,
    format: "",
    indent: 0,
    direction: null,
    children: [
      {
        type: "text",
        version: 1,
        text,
        format,
        detail: 0,
        mode: "normal",
        style: "",
      },
    ],
  });
  await createShopEditor(page, {
    richBody: {
      root: {
        type: "root",
        version: 1,
        format: "",
        indent: 0,
        direction: null,
        children: [
          paragraph("Plain opening"),
          ...Array.from({ length: 6 }, (_, index) =>
            paragraph(`Paragraph ${index + 1}`),
          ),
          paragraph("Already bold", 1),
        ],
      },
    },
  });
  await page.locator('[data-ve-field="body"]').first().click();
  const rich = page.locator('[data-ve-inline-active][contenteditable="true"]');
  const toolbar = page.getByRole("toolbar", { name: "Text formatting" });
  const bold = toolbar.getByRole("button", { name: "Bold", exact: true });
  const last = rich.locator("p").last();
  const select = async (paragraph: typeof last) => {
    await paragraph.scrollIntoViewIfNeeded();
    await paragraph.evaluate((node) => {
      const selection = getSelection()!,
        range = document.createRange();
      range.selectNodeContents(node);
      selection.removeAllRanges();
      selection.addRange(range);
    });
  };
  await select(last);
  await expect(bold).toHaveAttribute("aria-pressed", "true");
  expect((await bold.boundingBox())!.width).toBe(28);
  const activeColor = await bold.evaluate(
    (node) => getComputedStyle(node).backgroundColor,
  );
  await expect
    .poll(async () => {
      const rect = await last.evaluate((node) => {
        const range = document.createRange();
        range.selectNodeContents(node);
        return range.getBoundingClientRect().top;
      });
      const box = (await toolbar.boundingBox())!;
      return Math.abs(box.y + box.height + 8 - rect);
    })
    .toBeLessThan(2);
  await bold.click();
  await expect(bold).toHaveAttribute("aria-pressed", "false");
  await expect(last.locator("strong, b")).toHaveCount(0);
  await bold.click();
  await expect(bold).toHaveAttribute("aria-pressed", "true");
  await select(rich.locator("p").first());
  await expect(bold).toHaveAttribute("aria-pressed", "false");
  expect(
    await bold.evaluate((node) => getComputedStyle(node).backgroundColor),
  ).not.toBe(activeColor);
  await expect
    .poll(async () => {
      const firstTop = await rich
        .locator("p")
        .first()
        .evaluate((node) => {
          const range = document.createRange();
          range.selectNodeContents(node);
          return range.getBoundingClientRect().top;
        });
      const box = (await toolbar.boundingBox())!;
      const caption = (await page
        .locator("[data-ve-selection-caption]")
        .boundingBox())!;
      // The first paragraph shares the caption's corner. Keep both controls usable.
      const overlapsCaption =
        box.x < caption.x + caption.width &&
        box.x + box.width > caption.x &&
        box.y < caption.y + caption.height &&
        box.y + box.height > caption.y;
      if (overlapsCaption) return Infinity;
      return Math.min(
        Math.abs(box.y + box.height + 8 - firstTop),
        Math.abs(box.y + box.height + 8 - caption.y),
      );
    })
    .toBeLessThan(2);
  await page.setViewportSize({ width: 320, height: 760 });
  await select(last);
  await expect(bold).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(async () => {
      const box = (await toolbar.boundingBox())!;
      return box.x >= 7 && box.x + box.width <= 313;
    })
    .toBe(true);
  await page.screenshot({
    path: "test-results/rich-toolbar-selection-320.png",
  });
});

test("joined selection controls clear optional terminals and remove array rows through the native form", async ({
  page,
}) => {
  const { doc } = await createShopEditor(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const hero = page.locator('[data-ve-field="description"]').first();
  await hero.click();
  const outline = page.locator("[data-ve-selection-outline]");
  const caption = outline.locator("[data-ve-selection-caption]");
  await expect(
    caption.getByRole("button", {
      name: "Options for Description",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    caption.getByRole("button", { name: "Clear Description", exact: true }),
  ).toBeVisible();
  const bounds = await outline.boundingBox();
  const label = await caption.boundingBox();
  expect(Math.abs(label!.x - bounds!.x)).toBeLessThanOrEqual(1);
  expect(
    await outline.evaluate((el) => getComputedStyle(el).borderTopLeftRadius),
  ).toBe("0px");
  await page.screenshot({ path: "test-results/joined-selection-desktop.png" });
  await page.setViewportSize({ width: 320, height: 760 });
  await hero.scrollIntoViewIfNeeded();
  await expect(caption).toBeVisible();
  const mobile = await caption.boundingBox();
  expect(mobile!.x).toBeGreaterThanOrEqual(0);
  expect(mobile!.x + mobile!.width).toBeLessThanOrEqual(320);
  await page.screenshot({ path: "test-results/joined-selection-mobile.png" });
  page.once("dialog", (dialog) => dialog.dismiss());
  await caption
    .getByRole("button", { name: "Clear Description", exact: true })
    .click();
  await expect(hero).not.toHaveText("");
  page.once("dialog", (dialog) => dialog.accept());
  await caption
    .getByRole("button", { name: "Clear Description", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
          ).json()
        ).layout[0].description,
    )
    .toBe("");
  const heading = page.locator('[data-ve-field="heading"]').first();
  await heading.click();
  await expect(
    outline.getByRole("button", { name: "Clear Heading", exact: true }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 900 });
  // An explicit row binding selects the item, while its child bindings stay terminal.
  const card = page.locator('article[data-ve-field^="cards.@"]').first();
  const imageHeight = (await card
    .locator("[data-ve-field]")
    .first()
    .boundingBox())!.height;
  await card.click({ position: { x: 8, y: imageHeight + 8 } });
  await expect(
    outline.getByRole("button", { name: "Remove Cards", exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await outline
    .getByRole("button", { name: "Remove Cards", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
          ).json()
        ).layout.find((item: any) => item.blockType === "productGrid").cards
          .length,
    )
    .toBe(0);
  await page.getByRole("button", { name: "Sections", exact: true }).click();
  await page
    .getByRole("button", { name: "Undo section change", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/shops/${doc.id}?draft=true&depth=0`)
          ).json()
        ).layout.find((item: any) => item.blockType === "productGrid").cards
          .length,
    )
    .toBe(1);
  expect(errors).toEqual([]);
});

test("inline rich text retains renderer typography, grid placement and responsive wrapping", async ({
  page,
}) => {
  const text = (value: string, format = 0) => ({
    type: "text",
    version: 1,
    text: value,
    format,
    detail: 0,
    mode: "normal",
    style: "",
  });
  const block = (type: string, children: any[], extra = {}) => ({
    type,
    version: 1,
    format: "",
    indent: 0,
    direction: null,
    children,
    ...extra,
  });
  const richBody = {
    root: block("root", [
      block("heading", [text("Studio news")], { tag: "h4" }),
      block("paragraph", [
        text("A carefully styled paragraph with "),
        text("strong emphasis", 1),
        text(" and "),
        text("italic text", 2),
        text(". Long enough to wrap at small viewports."),
      ]),
      block("paragraph", [
        text("Second paragraph with a "),
        block("link", [text("studio link")], {
          version: 3,
          fields: {
            linkType: "custom",
            url: "https://example.test/studio",
            newTab: false,
          },
        }),
      ]),
      block(
        "list",
        [
          block("listitem", [text("First item")], { value: 1 }),
          block("listitem", [text("Second item")], { value: 2 }),
        ],
        { tag: "ul", listType: "bullet", start: 1 },
      ),
      block("quote", [text("Keep the original presentation.")]),
    ]),
  };
  await createShopEditor(page, { richBody });
  // A synthetic consumer stylesheet reproduces the wrapper-sensitive prose/grid
  // contract from real storefronts without making the plugin know their classes.
  await page.addStyleTag({
    content: `
    [data-ve-field="body"] { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); }
    .payload-richtext { grid-column:2 / span 2; font-size:18px; line-height:1.75; letter-spacing:.15px; }
    .payload-richtext p { margin:0 0 18px; }
    .payload-richtext h4 { font-size:23px; line-height:1.2; margin:0 0 20px; }
    .payload-richtext strong { font-weight:600; }
    .payload-richtext a { color:rgb(65,50,40); text-decoration:underline; }
    @media(max-width:500px) { [data-ve-field="body"] { display:block; } .payload-richtext { font-size:16px; line-height:1.6; } }
  `,
  });
  const metrics = async (selector: string) =>
    page.locator(selector).evaluate((root) => {
      const bounds = root.getBoundingClientRect();
      return [...root.querySelectorAll("h4,p,li,blockquote,strong,em,a")].map(
        (node) => {
          const s = getComputedStyle(node),
            r = node.getBoundingClientRect();
          return {
            tag: node.tagName,
            font: s.fontFamily,
            size: s.fontSize,
            line: s.lineHeight,
            weight: s.fontWeight,
            letter: s.letterSpacing,
            color: s.color,
            margin: s.margin,
            width: r.width,
            height: r.height,
            x: r.left - bounds.left,
            y: r.top - bounds.top,
          };
        },
      );
    });
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const original = page
      .locator('[data-ve-field="body"]')
      .filter({ visible: true });
    await original.scrollIntoViewIfNeeded();
    const before = await metrics('[data-ve-field="body"]');
    await original.click();
    await expect(
      page.locator("[data-ve-inline-active][contenteditable=true]"),
    ).toBeVisible();
    const after = await metrics("[data-ve-inline-active]");
    // Relative x includes the preserved grid column. Compare against the twin's
    // outer binding, while the editable itself remains its inner prose wrapper.
    const outerAfter = await metrics(
      '[data-ve-field="body"]:not(.pvi\\:hidden\\!)',
    );
    expect(after.length).toBe(before.length);
    const presentation = (items: typeof before) =>
      items.map((item) => {
        if (["STRONG", "EM", "A"].includes(item.tag)) {
          return Object.fromEntries(
            Object.entries(item).filter(
              ([key]) => !["width", "height", "x", "y"].includes(key),
            ),
          );
        }
        return item;
      });
    // Inline fragment boxes include editable trailing whitespace; all visible
    // block positions, wrapping and inline computed typography must stay equal.
    expect(presentation(outerAfter)).toEqual(presentation(before));
    await page.screenshot({
      path: `test-results/rich-presentation-${width}.png`,
    });
    await page.keyboard.press("Escape");
  }
});

test("canvas insertion keeps its resting border and row actions form a compact neutral group", async ({
  page,
}) => {
  await createShopEditor(page);
  const section = page.locator("main section[data-ve-block]").nth(1);
  await section.scrollIntoViewIfNeeded();
  await section.hover({ position: { x: 10, y: 4 } });
  // A tall section can align its top at y=0. Bring the actual gap into view;
  // insertion controls intentionally remain hidden at clipped viewport edges.
  await section.evaluate((element) => {
    window.scrollBy(0, element.getBoundingClientRect().top - 96);
  });
  const add = page
    .locator("[data-ve-insert-boundary]")
    .getByRole("combobox", { name: "Add section", exact: true });
  await expect(add).toBeVisible();
  await page.mouse.move(0, 0);
  const resting = await add.evaluate((button) => {
    const s = getComputedStyle(button);
    return {
      border: s.borderTopWidth,
      color: s.borderTopColor,
      foreground: s.color,
      radius: s.borderTopLeftRadius,
    };
  });
  expect(resting.border).toBe("1px");
  expect(resting.color).not.toBe("rgba(0, 0, 0, 0)");
  expect(resting.color).not.toBe("transparent");
  expect(await page.locator("[data-ve-insert-boundary] > span").count()).toBe(
    0,
  );
  await page.screenshot({ path: "test-results/canvas-insertion-resting.png" });
  await add.hover();
  expect(await add.evaluate((button) => getComputedStyle(button).color)).toBe(
    resting.foreground,
  );
  await add.click();
  await expect(
    page.getByRole("combobox", { name: "Search sections", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Search sections", exact: true })
    .press("Escape");
  await page
    .getByRole("navigation", { name: "Editing toolbar" })
    .getByRole("button", { name: "Sections", exact: true })
    .click();
  const panel = page.getByRole("complementary", {
    name: "Sections",
    exact: true,
  });
  const group = panel
    .locator("[data-ve-sortable]")
    .first()
    .getByRole("group", { name: "Section settings", exact: true });
  const buttons = group.getByRole("button");
  expect(await buttons.count()).toBe(2);
  const first = (await buttons.nth(0).boundingBox())!,
    second = (await buttons.nth(1).boundingBox())!;
  expect(first.width).toBe(32);
  expect(second.x - first.x).toBe(32);
  await page.screenshot({ path: "test-results/section-row-actions.png" });
});

test("native settings retain the selected inline value and focus its owner", async ({
  page,
}) => {
  const { doc } = await createShopEditor(page);
  const cases = [
    { field: "description", value: doc.layout[0].description, rich: false },
    { field: "body", value: "Made with care. Built to last.", rich: true },
  ];
  for (const item of cases) {
    const terminal = page
      .locator(`[data-ve-field="${item.field}"]`)
      .filter({ visible: true })
      .first();
    await terminal.click();
    await expect(page.locator("[data-ve-inline-active]")).toBeVisible();
    await page
      .locator("[data-ve-selection-caption]")
      .getByRole("button", { name: /^Options for / })
      .click();
    const panel = page.getByRole("complementary").filter({ visible: true });
    const owner = item.rich
      ? panel.locator('[data-field-path$=".body"] [contenteditable="true"]')
      : panel.getByRole("textbox", { name: "Description", exact: true });
    await expect(owner).toBeFocused();
    if (item.rich) await expect(owner).toHaveText(item.value);
    else await expect(owner).toHaveValue(item.value);
    await panel.getByRole("button", { name: /^Close .* panel$/ }).click();
  }
});

test("before-section hover preview keeps the catalogue anchor stable", async ({
  page,
}) => {
  const { doc } = await createShopEditor(page);
  const story = doc.layout.find((row: any) => row.blockType === "editorial");
  const block = page.locator(`[data-ve-block="${story.id}"]`);
  const heading = block.getByRole("heading").first();
  await heading.scrollIntoViewIfNeeded();
  await heading.hover();
  const add = page
    .locator('[data-ve-insert-boundary="before"]')
    .getByRole("combobox", { name: "Add section", exact: true });
  await add.click();
  const search = page.getByRole("combobox", { name: "Search sections" });
  await search.fill("storytelling");
  const anchor = await add.boundingBox();
  await page.getByRole("option", { name: "Studio story", exact: true }).hover();
  await expect(
    page.getByRole("heading", { name: "A story worth sharing.", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => Math.abs((await add.boundingBox())!.y - anchor!.y))
    .toBeLessThan(1);
  await page.setViewportSize({ width: 320, height: 760 });
  await expect
    .poll(async () => {
      const bounds = (await add.boundingBox())!;
      return bounds.x >= 0 && bounds.x + bounds.width <= 320;
    })
    .toBe(true);
  await search.press("Escape");
  await expect(
    page.getByRole("heading", { name: "A story worth sharing.", exact: true }),
  ).toHaveCount(0);
});
