import { test, expect } from "@playwright/test";
for (const role of ["anonymous", "reader", "author"])
  test(`installed public isolation: ${role}`, async ({ page }, testInfo) => {
    if (role !== "anonymous")
      expect(
        (
          await page.request.post("/api/users/login", {
            data: {
              email: `${role}@consumer.test`,
              password: "synthetic-consumer-password",
            },
          })
        ).ok(),
      ).toBe(true);
    const scripts: Promise<string>[] = [];
    page.on("response", (res) => {
      if (res.request().resourceType() === "script") scripts.push(res.text());
    });
    await page.goto("/stories/packed-proof");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await page.waitForFunction(
      (start) => performance.now() - start >= 1500,
      await page.evaluate(() => performance.now()),
    );
    await testInfo.attach("public-resources", {
      body: JSON.stringify({
        role,
        resources: await page.evaluate(() =>
          performance
            .getEntriesByType("resource")
            .filter((r: any) => ["script", "link"].includes(r.initiatorType))
            .map((r: any) => ({
              path: new URL(r.name).pathname,
              bytes: r.decodedBodySize,
            }))
            .sort((a: any, b: any) => a.path.localeCompare(b.path)),
        ),
      }),
      contentType: "application/json",
    });
    await expect(page.locator("[data-ve-block]")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Edit page", exact: true }),
    ).toHaveCount(
      role === "author" && process.env.CONSUMER_DISABLED !== "1" ? 1 : 0,
    );
    expect(
      (await Promise.all(scripts)).some((source) =>
        /data-ve-overlay|ve-workspace|data-ve-ui/.test(source),
      ),
    ).toBe(false);
  });
test("installed nested-root native fields, optimistic draft and reviewed publish", async ({
  page,
  browser,
}) => {
  test.skip(
    process.env.CONSUMER_DISABLED === "1",
    "Disabled baseline does not mount authoring",
  );
  expect(
    (
      await page.request.post("/api/users/login", {
        data: {
          email: "author@consumer.test",
          password: "synthetic-consumer-password",
        },
      })
    ).ok(),
  ).toBe(true);
  const anonymous = await browser.newContext();
  const publicPage = await anonymous.newPage();
  try {
    await publicPage.goto("/stories/packed-proof");
    await expect(
      publicPage.getByRole("heading", {
        name: "A separately installed story",
        exact: true,
      }),
    ).toBeVisible();
    await page.goto("/stories/packed-proof");
    await page.getByRole("button", { name: "Edit page", exact: true }).click();
    await expect(
      page.getByRole("navigation", { name: "Editing toolbar" }),
    ).toBeVisible();
    const protectedResponse = await page.request.get(page.url(), {
      headers: { Origin: process.env.CONSUMER_ORIGIN! },
    });
    expect(protectedResponse.status()).toBe(200);
    expect(protectedResponse.headers()["cache-control"]).toContain("no-store");
    await page
      .getByRole("heading", {
        name: "A separately installed story",
        exact: true,
      })
      .click();
    const inline = page.locator('main [contenteditable="plaintext-only"]');
    await expect(inline).toBeFocused();
    await inline.fill("Packed app draft");
    await inline.press("Tab");
    await page
      .getByRole("button", { name: "Options for Headline", exact: true })
      .click();
    const panel = page.getByRole("complementary", {
      name: "Edit content",
      exact: true,
    });
    await panel.getByLabel("Tone", { exact: true }).click();
    await page.getByText("Quiet", { exact: true }).last().click();
    await expect(panel.getByText("Image", { exact: true })).toBeVisible();
    const rich = panel.locator('[data-lexical-editor="true"]');
    await expect(rich).toBeVisible();
    await rich.fill("Native rich text in the installed app");
    await rich.press("Tab");
    await expect(
      page.getByRole("status", { name: "Draft saved", exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByText("Native rich text in the installed app", { exact: true })
        .first(),
    ).toBeVisible();
    await publicPage.reload();
    await expect(
      publicPage.getByRole("heading", {
        name: "A separately installed story",
        exact: true,
      }),
    ).toBeVisible();
    const documents = await (
      await page.request.get("/api/stories?draft=true&depth=0", {
        headers: { Origin: process.env.CONSUMER_ORIGIN! },
      })
    ).json();
    const doc = documents.docs[0];
    expect(doc.unrelated).toBe("Keep unrelated data");
    expect(doc.article.sections[0].headline).toBe("Packed app draft");
    expect(doc.article.sections[0].tone).toBe("quiet");
    expect(doc.article.sections).toHaveLength(2);
    await page.getByRole("button", { name: /^Close .+ panel$/ }).click();
    await page
      .getByRole("button", { name: "Select content", exact: true })
      .click();
    await page.locator('[data-ve-field="readingTime"]').click();
    await page
      .getByRole("button", { name: "Increase 12", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (
            await (
              await page.request.get(
                `/api/stories/${doc.id}?draft=true&depth=0`,
              )
            ).json()
          ).article.sections[0].readingTime,
      )
      .toBe(13);
    await page
      .getByRole("button", { name: "Native options", exact: true })
      .click();
    await expect(
      page.getByRole("spinbutton", { name: "Reading Time", exact: true }),
    ).toHaveValue("13");
    await page.getByRole("button", { name: /^Close .+ panel$/ }).click();

    await page
      .getByRole("button", { name: "Review changes", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Publish reviewed draft", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Publish reviewed draft", exact: true }),
    ).toHaveCount(0);
    await publicPage.reload();
    await expect(
      publicPage.getByRole("heading", {
        name: "Packed app draft",
        exact: true,
      }),
    ).toBeVisible();
    await page.setViewportSize({ width: 320, height: 740 });
    await page.getByRole("button", { name: "Sections", exact: true }).click();
    await expect(
      page.getByRole("complementary", { name: "Sections", exact: true }),
    ).toBeInViewport();
    await expect(
      page.getByRole("button", { name: "Sections", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: "Sections", exact: true }),
    ).toHaveCSS("background-color", "rgb(237, 240, 255)");
    await expect(
      page.getByRole("button", { name: /1\. Packed app draft/ }),
    ).toBeVisible();
    const grip = await page
      .locator(`[data-ve-canvas-handle="${doc.article.sections[0].id}"]`)
      .getByRole("button", { name: "Move Callout section", exact: true })
      .boundingBox();
    const heading = await page
      .locator(
        `main [data-ve-block="${doc.article.sections[0].id}"][data-ve-field="headline"]`,
      )
      .boundingBox();
    expect(grip).not.toBeNull();
    expect(heading).not.toBeNull();
    expect(
      grip!.x < heading!.x + heading!.width &&
        grip!.x + grip!.width > heading!.x &&
        grip!.y < heading!.y + heading!.height &&
        grip!.y + grip!.height > heading!.y,
    ).toBe(false);
    await page.screenshot({ path: "test-results/installed-mobile.png" });
  } finally {
    await anonymous.close().catch(() => {});
  }
});
