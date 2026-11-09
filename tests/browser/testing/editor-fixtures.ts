import { expect, type Locator, type Page } from "@playwright/test";

/** Only synthetic records inside the caller's disposable demo database. Uses real native auth/create. */
export async function createShopEditor(
  page: Page,
  {
    emptyCards = false,
    richBody,
    sourceText,
  }: {
    emptyCards?: boolean;
    richBody?: unknown;
    sourceText?: { eyebrow: string; description: string };
  } = {},
) {
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
  const clone = (value: unknown): any =>
    Array.isArray(value)
      ? value.map(clone)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value)
              .filter(([key]) => key !== "id")
              .map(([key, item]) => [key, clone(item)]),
          )
        : value;
  const layout = clone(source.layout);
  if (sourceText) Object.assign(layout[0], sourceText);
  const story = layout.find(
    (block: { blockType: string }) => block.blockType === "editorial",
  );
  if (richBody !== undefined) story.body = richBody;
  story.body ??= {
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
          children: [
            {
              type: "text",
              version: 1,
              text: "Made with care. Built to last.",
              format: 0,
              style: "",
              detail: 0,
              mode: "normal",
            },
          ],
        },
      ],
    },
  };
  if (emptyCards)
    layout.find((block: any) => block.blockType === "productGrid").cards = [];
  const created = await page.request.post("/api/shops", {
    data: {
      title: "Roadmap acceptance",
      slug: `roadmap-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      layout,
      _status: "draft",
    },
  });
  expect(created.ok()).toBeTruthy();
  const doc = (await created.json()).doc;
  await page.goto(`/visual-editor/start?collection=shops&id=${doc.id}`);
  await page
    .getByRole("button", { name: "Start editing", exact: true })
    .click();
  await expect(
    page.getByRole("navigation", { name: "Editing toolbar" }),
  ).toBeVisible();
  return { doc, source };
}

/** Put the caret at the end of the editable field across OS keymaps and line wraps. */
export async function moveCaretToEnd(target: Locator) {
  await target.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const selection = getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
}
