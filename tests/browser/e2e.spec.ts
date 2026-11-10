import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { test, expect, type Request, type Response } from "@playwright/test";
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
    await expect(
      page.getByRole("status", { name: "Draft saved", exact: true }),
    ).toBeVisible();
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
      page.getByRole("heading", { name: "Review changes", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Keep this value", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("dialog").getByText(replacement, { exact: false }).first(),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Publish reviewed draft", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Publish reviewed draft", exact: true }),
    ).toHaveCount(0);
    const check = await page.request.get(`/${collection}/demo`);
    expect(await check.text()).toContain(replacement);
    // Acknowledged publication ends authoring without a second explicit exit.
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
      slug: `composition-${Date.now()}`,
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
  const choose = editor.getByRole("button", { name: "Choose from existing" });
  for (let cycle = 0; cycle < 3; cycle++) {
    await choose.click();
    const drawer = page.locator("dialog[open]");
    await expect(drawer).toBeVisible();
    await expect(
      drawer.getByText(media.filename, { exact: true }),
    ).toBeVisible();
    if (cycle < 2) {
      await drawer
        .getByRole("button", { name: "Close", exact: true })
        .first()
        .click();
      await expect(drawer).toHaveCount(0);
    } else await drawer.getByText(media.filename, { exact: true }).click();
  }
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
  await expect(
    page.getByRole("status", { name: "Draft saved", exact: true }),
  ).toBeVisible();
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
      const production = process.env.VE_PRODUCTION === "1";
      let buildId: string | undefined;
      if (production) {
        const build = path.join(
          "apps/demo",
          process.env.VE_NEXT_DIST_DIR || ".next-prod",
        );
        buildId = (await readFile(path.join(build, "BUILD_ID"), "utf8")).trim();
        expect(buildId).toBeTruthy();
        // The marker must come from the server under test, even when an existing
        // server is supplied. Keep this probe outside the navigation samples.
        const marker = `static/${buildId}/_buildManifest.js`;
        const response = await page.request.get(`/_next/${marker}`);
        expect(response.ok(), "server should serve this build's manifest").toBe(
          true,
        );
        expect(await response.body()).toEqual(
          await readFile(path.join(build, marker)),
        );
      }
      const samples = [];
      for (let sample = 0; sample < 3; sample++) {
        const sources: Promise<{
          url: string;
          bytes: number;
          text: string;
          sha256: string;
        }>[] = [];
        const requests: string[] = [];
        const response = (res: Response) => {
          const type = res.request().resourceType();
          if (["script", "stylesheet"].includes(type))
            sources.push(
              res.body().then((body) => ({
                url: new URL(res.url()).pathname,
                bytes: body.byteLength,
                text: body.toString("utf8"),
                sha256: createHash("sha256").update(body).digest("hex"),
              })),
            );
        };
        const request = (req: Request) =>
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
        // Authorized inactive editors may load the small launcher/viewport bridge; native fields/preview/styles must stay unloaded.
        expect(
          resources.filter((r) =>
            /payload-visual-editor\/v1|data-ve-overlay|ve-workspace|data-ve-preview|data-ve-hover-outline|document-fields/.test(
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
          resources: resources.map(({ url, bytes, sha256 }) => ({
            url,
            bytes,
            sha256,
          })),
        });
      }
      await writeFile(
        `test-results/public-${role}.json`,
        JSON.stringify({ role, production, buildId, samples }, null, 2),
      );
      await testInfo.attach(`public-${role}.json`, {
        body: JSON.stringify(
          {
            role,
            production,
            buildId,
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

test("array leaves edit inline and an item opens only its own native fields", async ({
  page,
}) => {
  await login(page);
  const row = page
    .locator('main [data-ve-edit="panel"][data-ve-field^="items.@"]')
    .first();
  const leaf = row.locator('[data-ve-field$=".label"]');
  await leaf.click();
  await expect(leaf).toHaveAttribute("contenteditable", "plaintext-only");
  await expect(
    page.getByRole("complementary", { name: "Edit content" }),
  ).toHaveCount(0);
  await leaf.fill("Nested inline draft");
  await leaf.press("Tab");
  await expect(
    page.getByRole("status", { name: "Draft saved", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Options for Label", exact: true })
    .click();
  const panel = page.getByRole("complementary", { name: "Edit content" });
  // A terminal field owns its native input; settings must not remount the containing array.
  await expect(panel.locator(".array-field")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Close Label panel", exact: true })
    .click();
  // Click the row's own padding instead of its terminal paragraph.
  await row.click({ position: { x: 4, y: 3 } });
  await expect(
    panel.getByRole("textbox", { name: "Label", exact: true }),
  ).toBeVisible();
  await expect(panel.locator(".array-field")).toHaveCount(0);
  await expect(panel.getByRole("textbox")).toHaveCount(2);
  await panel
    .getByRole("textbox", { name: "Label", exact: true })
    .fill("Scoped row draft");
  await expect(
    page.getByRole("status", { name: "Draft saved", exact: true }),
  ).toBeVisible();
  await expect(leaf).toHaveText("Scoped row draft");
  await page.reload();
  await expect(
    page.locator('main [data-ve-field$=".label"]').first(),
  ).toHaveText("Scoped row draft");
});

test("native field ownership survives a suspended custom field with its media drawer open", async ({
  page,
}) => {
  await login(page);
  const response = await page.request.post("/api/pages", {
    data: {
      title: "Suspense ownership",
      slug: `owner-suspense-${Date.now()}`,
      unrelated: "Retain unmounted data",
      _status: "draft",
      layout: [
        {
          blockType: "hero",
          heading: "Suspense ownership proof",
          caption: "Native control continuity",
        },
      ],
    },
  });
  expect(response.ok()).toBeTruthy();
  const doc = (await response.json()).doc;
  await open(page, "pages", doc.id);
  const editor = await inspect(page, "Suspense ownership proof");
  const choose = editor.getByRole("button", {
    name: "Choose from existing",
    exact: true,
  });
  await choose.evaluate((element: HTMLElement) => {
    (window as any).__nativeUploadBeforeSuspend = element;
  });
  await choose.click();
  const drawer = page.locator("dialog[open]");
  await expect(
    drawer.getByText("studio.png", { exact: true }).first(),
  ).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Native suspension fixture did not respond")),
          3000,
        );
        window.addEventListener(
          "pve-test-native-resumed",
          () => {
            clearTimeout(timeout);
            resolve();
          },
          { once: true },
        );
        window.dispatchEvent(new Event("pve-test-native-suspend"));
      }),
  );
  await expect(
    drawer.getByText("studio.png", { exact: true }).first(),
  ).toBeVisible();
  expect(
    await choose.evaluate(
      (element: HTMLElement) =>
        element === (window as any).__nativeUploadBeforeSuspend,
    ),
  ).toBe(true);
  await drawer
    .getByRole("button", { name: "Close", exact: true })
    .last()
    .click();
  await expect(drawer).toHaveCount(0);
  await choose.click();
  await expect(
    drawer.getByText("studio.png", { exact: true }).first(),
  ).toBeVisible();
  const retained = await (
    await page.request.get(`/api/pages/${doc.id}?draft=true&depth=0`)
  ).json();
  expect(retained._veRevision).toBe(doc._veRevision);
  expect(retained.unrelated).toBe("Retain unmounted data");
});

test("native lazy field suspension cannot reset a dirty draft or its sole save owner", async ({
  page,
}) => {
  await login(page);
  const response = await page.request.post("/api/pages", {
    data: {
      title: "Dirty suspension proof",
      slug: `dirty-suspense-${Date.now()}`,
      layout: [
        {
          blockType: "hero",
          heading: "Before suspension",
          caption: "Keep this caption",
        },
      ],
      unrelated: "Retain other fields",
      _status: "draft",
    },
  });
  expect(response.ok()).toBeTruthy();
  const doc = (await response.json()).doc;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await open(page, "pages", doc.id);
  const editor = await inspect(page, "Before suspension");
  const heading = editor.getByRole("textbox", { name: "Caption", exact: true });
  await heading.fill("Dirty caption survives");
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(Error("Suspension fixture unavailable")),
          3000,
        );
        window.addEventListener(
          "pve-test-native-resumed",
          () => {
            clearTimeout(timeout);
            resolve();
          },
          { once: true },
        );
        window.dispatchEvent(new Event("pve-test-native-suspend"));
      }),
  );
  await expect(heading).toHaveValue("Dirty caption survives");
  await expect
    .poll(
      async () =>
        (
          await (
            await page.request.get(`/api/pages/${doc.id}?draft=true&depth=0`)
          ).json()
        ).layout[0].caption,
    )
    .toBe("Dirty caption survives");
  const saved = await (
    await page.request.get(`/api/pages/${doc.id}?draft=true&depth=0`)
  ).json();
  expect(saved.layout[0].heading).toBe("Before suspension");
  expect(saved.unrelated).toBe("Retain other fields");
  expect(saved._veRevision).toBe(doc._veRevision + 1);
  expect(errors).toEqual([]);
});
