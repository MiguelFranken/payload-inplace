import { test, expect } from "@playwright/test";
import { createShopEditor } from "./testing/editor-fixtures";

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
  const rich = page.locator('[data-ve-inline-active][data-ve-field="body"]');
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
    .getByRole("button", { name: "More text options", exact: true })
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
  const rich = page.locator('[data-ve-inline-active][data-ve-field="body"]');
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
  await target.press("End");
  await target.pressSequentially("!");
  await expect
    .poll(async () => (await read()).layout[0].eyebrow)
    .toBe(`${eyebrow}!`);
  await target.press("Escape");
  const multiline = page.locator('[data-ve-field="description"]').first();
  await multiline.click();
  await expect(multiline).toHaveAttribute("contenteditable", "plaintext-only");
  await multiline.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const selection = getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
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
}) => {
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
  await page.screenshot({ path: "test-results/compact-reviewed-toolbar.png" });
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
  const rich = page.locator('[data-ve-inline-active][data-ve-field="body"]');
  await expect(rich).toHaveAttribute("contenteditable", "true");
  await rich.press("ControlOrMeta+End");
  await rich.press("Enter");
  await page.keyboard.insertText(
    "A new paragraph changes the actual rich-text surface height while the original React subtree remains mounted.",
  );
  await compare(rich);
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
