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
