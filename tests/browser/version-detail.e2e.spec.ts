import { expect, test, type Page } from "@playwright/test";

async function compareOldestOnPageTwo(
  page: Page,
  { current, historical }: { current: string; historical: string },
) {
  await page.getByRole("button", { name: "More tools" }).click();
  await page.getByRole("menuitem", { name: "Saved versions" }).click();
  const older = page.getByRole("button", { name: "Older versions" });
  const newer = page.getByRole("button", { name: "Newer versions" });
  const versions = page.getByRole("button", { name: /^Compare version / });
  await expect(versions).toHaveCount(20);
  await expect(older).toBeEnabled();
  await older.press("Enter");
  await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
  await expect(newer).toBeEnabled();
  const oldest = versions.last();
  const name = (await oldest.getAttribute("aria-label"))!;
  await oldest.press("Enter");
  const headingChange = page.locator('[data-ve-diff-path$=".heading"]');
  await expect(headingChange).toContainText(current);
  await expect(headingChange).toContainText(historical);
  await expect(oldest).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Page 2", { exact: true })).toBeVisible();

  await expect(newer).toBeEnabled();
  await newer.press("Enter");
  await expect(page.getByText("Page 1", { exact: true })).toBeVisible();
  await expect(headingChange).toHaveCount(0);
  await expect(older).toBeEnabled();
  await older.press("Enter");
  await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
  await expect(newer).toBeEnabled();
  await expect(oldest).toHaveAttribute("aria-label", name);

  await page.route("**/api/visual-editor/versions**", async (route) => {
    const data = route.request().postDataJSON();
    if (!data.versionID) return route.continue();
    await route.continue({
      postData: { ...data, versionID: "2147483647" },
    });
  });
  await oldest.press("Enter");
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "This version is no longer available" }),
  ).toBeVisible();
  await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
}

for (const target of ["collection", "global"] as const) {
  test(`opens the oldest ${target} version from timeline page two`, async ({
    page,
  }) => {
    test.skip(
      process.env.VE_DATABASE !== "postgres",
      "Requires versioned global and revision-guarded fixtures",
    );
    test.slow();
    if (target === "global") {
      await page.setViewportSize({ width: 320, height: 840 });
      await page.emulateMedia({ reducedMotion: "reduce" });
    }
    const login = await page.request.post("/api/users/login", {
      data: {
        email: "admin@example.test",
        password: "synthetic-demo-password",
      },
    });
    expect(login.ok()).toBeTruthy();
    const initial = await page.request.post("/api/pages", {
      data: {
        title: "Version detail",
        slug: `scope-versions-${target}-${Date.now()}`,
        layout: [{ blockType: "hero", heading: "Collection version 1" }],
        _status: "draft",
      },
    });
    expect(initial.ok()).toBeTruthy();
    let document = (await initial.json()).doc;
    const id = document.id;
    const globalURL = "/api/globals/siteHeader?draft=true&depth=0";
    const originalGlobal =
      target === "global"
        ? await (await page.request.get(globalURL)).json()
        : undefined;
    const prefix =
      target === "global" ? "Shared header version" : "Collection version";
    let historical = `${prefix} 1`;
    try {
      if (target === "global") {
        let header = originalGlobal;
        for (let version = 1; version <= 21; version++) {
          const saved = await page.request.post(globalURL, {
            data: {
              layout: [
                { ...header.layout[0], heading: `${prefix} ${version}` },
              ],
              _veRevision: header._veRevision,
            },
          });
          expect(saved.ok(), await saved.text()).toBeTruthy();
          header = (await saved.json()).result;
        }
        const list = await page.request.get(
          "/api/globals/siteHeader/versions?page=2&limit=20&sort=-updatedAt&depth=0",
        );
        expect(list.ok()).toBeTruthy();
        historical = (await list.json()).docs.at(-1).version.layout[0].heading;
      } else {
        for (let version = 2; version <= 21; version++) {
          const saved = await page.request.patch(
            `/api/pages/${id}?draft=true&depth=0`,
            {
              data: {
                layout: [
                  { ...document.layout[0], heading: `${prefix} ${version}` },
                ],
                _veRevision: document._veRevision,
              },
            },
          );
          expect(saved.ok(), await saved.text()).toBeTruthy();
          document = (await saved.json()).doc;
        }
      }
      await page.goto(`/visual-editor/start?collection=pages&id=${id}`);
      await page
        .getByRole("button", { name: "Start editing", exact: true })
        .click();
      if (target === "global") {
        await page.getByRole("button", { name: "More tools" }).click();
        await page.getByRole("menuitem", { name: "Shared header" }).click();
        await expect(
          page.locator("[data-ve-ui][data-ve-document-scope]"),
        ).toHaveAttribute("data-ve-document-scope", "g:siteHeader");
      }
      await compareOldestOnPageTwo(page, {
        current: `${prefix} 21`,
        historical,
      });
    } finally {
      if (originalGlobal) {
        const latest = await (await page.request.get(globalURL)).json();
        const restored = await page.request.post(globalURL, {
          data: {
            layout: originalGlobal.layout,
            _veRevision: latest._veRevision,
          },
        });
        expect(restored.ok(), await restored.text()).toBeTruthy();
      }
    }
  });
}
