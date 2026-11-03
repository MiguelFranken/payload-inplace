import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function login(page: any, role = "admin") {
  await page.goto("/visual-editor/start?collection=pages&slug=demo");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email", { exact: true }).fill(`${role}@example.test`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("synthetic-demo-password");
  await page
    .getByRole("button", { name: "Sign in and start editing", exact: true })
    .click();
  if (role === "reader")
    await expect(
      page.getByRole("alert").filter({ hasText: "Editing is unavailable" }),
    ).toContainText("Editing is unavailable");
  if (role !== "reader")
    await expect(
      page.getByRole("navigation", { name: "Editing toolbar" }),
    ).toBeVisible();
}
async function open(page: any, collection: string, id?: string | number) {
  await page.goto(
    `/visual-editor/start?collection=${collection}&${id ? `id=${id}` : "slug=demo"}`,
  );
  await page
    .getByRole("button", { name: "Start editing", exact: true })
    .click();
  await expect(
    page.getByRole("navigation", { name: "Editing toolbar" }),
  ).toBeVisible();
}
async function inspect(page: any, heading: string) {
  await page
    .getByRole("button", { name: "Select content", exact: true })
    .click();
  await page.getByRole("heading", { name: heading, exact: true }).click();
  await page
    .getByRole("button", { name: "Options for Heading", exact: true })
    .click();
  return page.getByRole("complementary", { name: "Edit content" });
}
for (const collection of ["pages", "offers"])
  test(`frontend inline editing, native draft and reviewed publication: ${collection}`, async ({
    page,
    browser,
  }) => {
    await login(page);
    if (collection !== "pages") await open(page, collection);
    await expect(page.locator("iframe")).toHaveCount(0);
    const heading = page.getByRole("heading", {
      name: "A public synthetic page",
      exact: true,
    });
    await heading.hover();
    await expect(page.locator("[data-ve-hover-outline]")).toBeHidden();
    await page
      .getByRole("button", { name: "Select content", exact: true })
      .click();
    await heading.hover();
    await expect(page.locator("[data-ve-hover-outline]")).toBeVisible();
    await page.screenshot({
      path: `test-results/${collection}-frontend-inspect.png`,
    });
    await heading.click();
    const inline = page.locator('main [contenteditable="plaintext-only"]');
    await expect(
      page.getByRole("complementary", { name: "Edit content" }),
    ).toHaveCount(0);
    const replacement = `Frontend draft ${collection}`;
    await expect(inline).toHaveCSS("outline-style", "none");
    await expect(page.locator("[data-ve-selection-outline]")).toBeVisible();
    await inline.fill(replacement);
    await inline.press("Tab");
    await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
    await expect(
      page
        .locator('[data-ve-field="heading"]')
        .filter({ hasText: replacement }),
    ).toBeVisible();
    const anon = await browser.newContext();
    const publicPage = await anon.newPage();
    await publicPage.goto(new URL(`/${collection}/demo`, page.url()).href);
    await expect(
      publicPage.getByRole("heading", {
        name: "A public synthetic page",
        exact: true,
      }),
    ).toBeVisible();
    await anon.close();
    await page
      .getByRole("button", { name: "Review changes", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Publish the complete draft" }),
    ).toBeVisible();
    await page.getByText("View complete saved draft", { exact: true }).click();
    await expect(
      page.getByText("Keep this value", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Publish reviewed draft", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Publish reviewed draft", exact: true }),
    ).toHaveCount(0);
    const check = await page.request.get(`/${collection}/demo`);
    expect(await check.text()).toContain(replacement);
    await page.getByRole("button", { name: "More tools", exact: true }).click();
    await page
      .getByRole("menuitem", { name: "Exit editing", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${collection}/demo$`));
    await expect(page.locator("[data-ve-ui]")).toHaveCount(0);
  });

test("frontend field selection preserves native media, rich text and structural history", async ({
  page,
}) => {
  await login(page);
  const image = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  );
  const upload = await page.request.post("/api/media", {
    multipart: {
      _payload: JSON.stringify({ alt: "Synthetic image" }),
      file: { name: "synthetic.png", mimeType: "image/png", buffer: image },
    },
  });
  expect(upload.ok()).toBeTruthy();
  const media = (await upload.json()).doc;
  const create = await page.request.post("/api/pages", {
    data: {
      title: "Frontend composition",
      slug: "composition",
      unrelated: "Keep unrelated",
      _status: "draft",
      layout: [
        {
          blockType: "hero",
          heading: "Composition hero",
          privateNote: "Keep private",
        },
        {
          blockType: "text",
          heading: "Editable body",
          items: [{ label: "Keep nested" }],
        },
      ],
    },
  });
  expect(create.ok()).toBeTruthy();
  const doc = (await create.json()).doc;
  await open(page, "pages", doc.id);
  const editor = await inspect(page, "Composition hero");
  await editor.getByRole("button", { name: "Choose from existing" }).click();
  await page.getByText(media.filename, { exact: true }).click();
  await expect(editor.getByText(media.filename, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close Heading panel" }).click();
  await page.getByRole("button", { name: "Sections" }).click();
  await page
    .getByRole("complementary", { name: "Sections" })
    .getByRole("button", { name: "Settings for Text section", exact: true })
    .click();
  const lexical = page.locator('[contenteditable="true"]').first();
  await lexical.fill("Native rich text on the website");
  await expect(
    page
      .locator("main")
      .getByText("Native rich text on the website", { exact: true }),
  ).toBeVisible();
  await editor.getByRole("button", { name: "Duplicate section" }).click();
  await page.getByRole("button", { name: "More tools", exact: true }).click();
  await page.getByRole("menuitem", { name: "Undo section change" }).click();
  await page.getByRole("button", { name: "More tools", exact: true }).click();
  await page.getByRole("menuitem", { name: "Redo section change" }).click();
  await expect(page.getByText("Draft saved", { exact: true })).toBeVisible();
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/pages/${doc.id}?draft=true&depth=0`)
          ).json()
        ).layout.length,
    )
    .toBe(3);
  const saved = await (
    await page.request.get(`/api/pages/${doc.id}?draft=true&depth=0`)
  ).json();
  expect(saved.unrelated).toBe("Keep unrelated");
  expect(saved.layout[0].privateNote).toBe("Keep private");
  expect(saved.layout[0].image).toBe(media.id);
  expect(JSON.stringify(saved.layout[1].body)).toContain(
    "Native rich text on the website",
  );
  expect(saved.layout[1].id).not.toBe(saved.layout[2].id);
  expect(saved.layout[1].items[0].id).not.toBe(saved.layout[2].items[0].id);
  await page.screenshot({ path: "test-results/frontend-native-fields.png" });
});

test("frontend hover motion, narrow layout and native controls are accessible", async ({
  page,
}, testInfo) => {
  await login(page);
  const currentHeading = await page.locator("main h1").innerText();
  const editor = await inspect(page, currentHeading);
  await expect(
    page.getByRole("button", { name: "Choose from existing" }),
  ).toBeVisible();
  let audit = await new AxeBuilder({ page })
    .include("[data-ve-ui]")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  await testInfo.attach("frontend-axe-desktop", {
    body: JSON.stringify(audit.violations, null, 2),
    contentType: "application/json",
  });
  expect(audit.violations).toEqual([]);
  await page.screenshot({ path: "test-results/frontend-desktop.png" });
  await page.getByRole("button", { name: "More tools", exact: true }).click();
  await page.getByRole("menuitem", { name: "Appearance", exact: true }).click();
  const appearance = page.getByRole("complementary", {
    name: "Appearance",
    exact: true,
  });
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "More tools" }),
  ).toBeInViewport();
  await expect(editor).toHaveCount(0);
  const scrollBefore = await page.evaluate(() => scrollY);
  await appearance.getByRole("combobox", { name: "Background" }).focus();
  await expect(
    appearance.getByRole("combobox", { name: "Background" }),
  ).toBeInViewport();
  expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
  await page.screenshot({ path: "test-results/frontend-mobile.png" });
  audit = await new AxeBuilder({ page })
    .include("[data-ve-ui]")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  await testInfo.attach("frontend-axe-mobile", {
    body: JSON.stringify(audit.violations, null, 2),
    contentType: "application/json",
  });
  expect(audit.violations).toEqual([]);
  await page
    .getByRole("button", { name: "Close Appearance panel", exact: true })
    .click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const selectContent = page.getByRole("button", {
    name: "Select content",
    exact: true,
  });
  if ((await selectContent.getAttribute("aria-pressed")) !== "true")
    await selectContent.click();

  await page.locator('main [data-ve-field="heading"]').first().hover();
  await expect(page.locator("[data-ve-hover-outline]")).toHaveCSS(
    "transition-duration",
    "0s",
  );
});

for (const role of ["anonymous", "reader", "admin"])
  test(`inactive public resources and sampled timing: ${role}`, async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      if (role !== "anonymous") {
        const auth = await page.request.post("/api/users/login", {
          data: {
            email: `${role}@example.test`,
            password: "synthetic-demo-password",
          },
        });
        expect(auth.ok()).toBe(true);
      }
      const samples: any[] = [];
      for (let sample = 0; sample < 3; sample++) {
        const sources: Promise<{ url: string; bytes: number; text: string }>[] =
          [];
        const requests: string[] = [];
        const response = (res: any) => {
          const type = res.request().resourceType();
          if (["script", "stylesheet"].includes(type))
            sources.push(
              res.text().then((text: string) => ({
                url: new URL(res.url()).pathname,
                bytes: Buffer.byteLength(text),
                text,
              })),
            );
        };
        const request = (req: any) =>
          requests.push(new URL(req.url()).pathname);
        page.on("response", response);
        page.on("request", request);
        await page.goto(`/pages/demo${sample === 1 ? "?visualEditor=1" : ""}`);
        await expect(page.locator("main section").first()).toBeVisible();
        await expect(page.locator("[data-ve-block]")).toHaveCount(0);
        await expect(page.locator("[data-ve-launcher]")).toHaveCount(
          role === "admin" && process.env.VE_DISABLED !== "1" ? 1 : 0,
        );
        // A bounded idle observation is a measurement, not an application readiness heuristic.
        const start = await page.evaluate(() => performance.now());
        await page.waitForFunction(
          (start) => performance.now() - start >= 1500,
          start,
        );
        page.off("response", response);
        page.off("request", request);
        const resources = await Promise.all(sources);
        expect(
          resources.filter((r) =>
            /payload-visual-editor\/v1|data-ve-overlay|ve-workspace|data-ve-ui|data-ve-hover-outline/.test(
              r.text,
            ),
          ),
        ).toEqual([]);
        if (role !== "admin" || process.env.VE_DISABLED === "1")
          expect(resources.some((r) => /data-ve-launcher/.test(r.text))).toBe(
            false,
          );
        expect(
          requests.filter((url) =>
            /visual-editor|\/api\/users\/me|live-preview/.test(url),
          ),
        ).toEqual([]);
        const navigation = await page.evaluate(() => {
          const n = performance.getEntriesByType(
            "navigation",
          )[0] as PerformanceNavigationTiming;
          return {
            ttfb: n.responseStart - n.requestStart,
            dom: n.domContentLoadedEventEnd - n.startTime,
          };
        });
        samples.push({
          ...navigation,
          requests: requests.length,
          decodedResourceBytes: resources.reduce((sum, r) => sum + r.bytes, 0),
          resources: resources.map(({ url, bytes }) => ({ url, bytes })),
        });
      }
      await testInfo.attach(`public-${role}.json`, {
        body: JSON.stringify(
          {
            role,
            disabled: process.env.VE_DISABLED === "1",
            node: process.version,
            samples,
          },
          null,
          2,
        ),
        contentType: "application/json",
      });
      if (role === "admin" && process.env.VE_DISABLED !== "1") {
        await page.setViewportSize({ width: 320, height: 740 });
        const launcherAudit = await new AxeBuilder({ page })
          .include("[data-ve-launcher]")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(launcherAudit.violations).toEqual([]);
        await page.screenshot({ path: "test-results/launcher-mobile.png" });
        await page
          .getByRole("button", { name: "Edit page", exact: true })
          .click();
        await expect(
          page.getByRole("navigation", { name: "Editing toolbar" }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Select content", exact: true }),
        ).toHaveAttribute("aria-pressed", "false");
      }
    } finally {
      await context.close();
    }
  });

test("direct denied preview exposes neither draft output nor bridge execution", async ({
  page,
}) => {
  const sources: Promise<string>[] = [];
  page.on("response", (res) => {
    if (res.request().resourceType() === "script") sources.push(res.text());
  });
  const response = await page.goto(
    "/visual-editor/preview?context=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  );
  expect(response?.status()).toBe(404);
  await expect(page.locator("[data-ve-block]")).toHaveCount(0);
  expect(
    (await Promise.all(sources)).some((text) =>
      /payload-visual-editor\/v1|data-ve-overlay/.test(text),
    ),
  ).toBe(false);
  expect(response?.headers()["cache-control"]).toContain("no-store");
});

/** Hover assistance is an explicit preference and must yield to native field editing. */
test("hover outlines are optional and pause while native settings are open", async ({
  page,
}) => {
  await login(page);
  const heading = page.locator('main [data-ve-field="heading"]').first();
  const second = page.locator('main [data-ve-field="heading"]').nth(1);
  const outline = page.locator("[data-ve-hover-outline]");
  await heading.hover();
  await expect(outline).toBeHidden();
  const enable = page.getByRole("button", {
    name: "Select content",
    exact: true,
  });
  await expect(enable).toHaveAttribute("aria-pressed", "false");
  await enable.click();
  await expect(enable).toHaveAttribute("aria-pressed", "true");
  await heading.hover();
  await expect(outline).toBeVisible();
  await expect(
    page.locator("[data-ve-hover-outline],[data-ve-selection-outline]"),
  ).toHaveCount(1);
  await second.hover();
  await expect
    .poll(async () =>
      Math.abs(
        (await outline.boundingBox())!.y - (await second.boundingBox())!.y,
      ),
    )
    .toBeLessThan(1);
  await expect(
    page.locator("[data-ve-hover-outline],[data-ve-selection-outline]"),
  ).toHaveCount(1);
  await heading.click();
  await page
    .getByRole("button", { name: "Options for Heading", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Edit content" }),
  ).toBeVisible();
  await second.hover();
  await expect(outline).toBeHidden();
  await page
    .getByRole("complementary", { name: "Edit content" })
    .getByRole("button", { name: /^Close .+ panel$/ })
    .click();
  await second.hover();
  await expect(outline).toBeVisible();
  await enable.click();
  await expect(enable).toHaveAttribute("aria-pressed", "false");
  await page.locator('main [data-ve-field="heading"]').first().hover();
  await expect(outline).toBeHidden();
});
