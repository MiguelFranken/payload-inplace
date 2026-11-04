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
      name: "Add section after",
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
