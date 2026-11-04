import { expect, type Page } from "@playwright/test";
/** Only synthetic records inside the caller's disposable demo database. Uses real native auth/create. */
export async function createShopEditor(
  page: Page,
  { emptyCards = false }: { emptyCards?: boolean } = {},
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
  if (emptyCards)
    layout.find((block: any) => block.blockType === "productGrid").cards =
      [];
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
