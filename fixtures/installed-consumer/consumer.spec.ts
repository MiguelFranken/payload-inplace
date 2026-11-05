import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
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
    await expect(
      panel.getByText("Consumer native summary", { exact: true }),
    ).toBeVisible();
    await expect(panel.getByText("Release At", { exact: true })).toHaveCount(0);
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
    const readStory = async (draft = true) => {
      const response = await page.request.get(
        `/api/stories/${doc.id}?draft=${draft}&depth=0`,
        { headers: { Origin: process.env.CONSUMER_ORIGIN! } },
      );
      expect(response.ok()).toBe(true);
      return response.json();
    };
    expect(doc.unrelated).toBe("Keep unrelated data");
    expect(doc.article.sections[0].headline).toBe("Packed app draft");
    expect(doc.article.sections[0].tone).toBe("quiet");
    expect(doc.article.sections).toHaveLength(2);
    await page.getByRole("button", { name: /^Close .+ panel$/ }).click();
    const select = page.getByRole("button", {
      name: "Select content",
      exact: true,
    });
    if ((await select.getAttribute("aria-pressed")) !== "true")
      await select.click();
    await page.locator('[data-ve-field="readingTime"]').click();
    await page
      .getByRole("button", { name: "Increase 12", exact: true })
      .click();
    await expect
      .poll(async () => (await readStory()).article.sections[0].readingTime)
      .toBe(13);
    await page
      .getByRole("button", { name: "Native options", exact: true })
      .click();
    await expect(
      page.getByRole("spinbutton", { name: "Reading Time", exact: true }),
    ).toHaveValue("13");
    await page.getByRole("button", { name: /^Close .+ panel$/ }).click();
    await page.locator('[data-ve-field="releaseAt"]').click();
    await page.getByLabel("Schedule", { exact: true }).fill("2027-01-15T10:30");
    await expect
      .poll(async () => (await readStory()).article.sections[0].releaseAt)
      .toBe("2027-01-15T10:30:00.000Z");
    await page
      .getByRole("button", { name: "Native schedule options", exact: true })
      .click();
    await expect(panel.getByLabel("Release At", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /^Close .+ panel$/ }).click();
    // Native validation is independently enforced on the very same strategy field.
    const invalid = await page.request.post("/api/stories?draft=true", {
      headers: { Origin: process.env.CONSUMER_ORIGIN! },
      data: {
        name: "Invalid native strategy",
        slug: `invalid-${Date.now()}`,
        _status: "draft",
        article: {
          sections: [
            { blockType: "callout", headline: "Invalid", readingTime: 0 },
          ],
        },
      },
    });
    expect(invalid.status()).toBe(400);
    expect(JSON.stringify(await invalid.json())).toMatch(
      /readingTime|Reading Time/i,
    );
    expect((await readStory()).article.sections[0].readingTime).toBe(13);
    // The same structured native value can hand from Payload controls to the lazy
    // inline runtime in an independently installed archive, then publish normally.
    await page.locator('[data-ve-field="body"]').first().click();
    const inlineRich = page.locator(
      '[data-ve-inline-active][contenteditable="true"]',
    );
    await expect(
      page.getByRole("toolbar", { name: "Text formatting", exact: true }),
    ).toBeVisible();
    await inlineRich.pressSequentially(" Packed inline rich text");
    await expect
      .poll(async () =>
        JSON.stringify((await readStory()).article.sections[0].body),
      )
      .toContain("Packed inline rich text");
    await expect(inlineRich).toBeFocused();
    await inlineRich.press("Escape");

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
    await expect(publicPage.locator("main")).toContainText(
      "Packed inline rich text",
    );
    const published = await readStory(false);
    expect(published.article.sections[0].readingTime).toBe(13);
    expect(JSON.stringify(published.article.sections[0].body)).toContain(
      "Packed inline rich text",
    );
    await expect(
      page.getByRole("navigation", { name: "Editing toolbar" }),
    ).toBeHidden();
    await page.getByRole("button", { name: "Edit page", exact: true }).click();
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
    ).toHaveCSS("background-color", "rgb(228, 230, 234)");
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
    const catalogueRevision = (await readStory())._veRevision;
    await page
      .getByRole("combobox", { name: "Add section", exact: true })
      .click();
    const sectionSearch = page.getByRole("combobox", {
      name: "Search sections",
      exact: true,
    });
    await sectionSearch.fill("quoted");
    const quote = page.getByRole("option", { name: "Quotation", exact: true });
    await expect(quote).toBeVisible();
    await quote.hover();
    await expect(
      page.getByRole("heading", { name: "Preview only", exact: true }),
    ).toBeVisible();
    await page.waitForTimeout(1800);
    expect((await readStory())._veRevision).toBe(catalogueRevision);
    await sectionSearch.press("Escape");
    await expect(
      page.getByRole("heading", { name: "Preview only", exact: true }),
    ).toHaveCount(0);
    expect((await readStory())._veRevision).toBe(catalogueRevision);
  } finally {
    await anonymous.close().catch(() => {});
  }
});

test("installed media adapter uploads, retries and replaces image/video references without editing shared metadata", async ({
  page,
  browser,
}) => {
  test.skip(
    process.env.CONSUMER_DISABLED === "1",
    "Disabled baseline does not mount authoring",
  );
  const origin = process.env.CONSUMER_ORIGIN!;
  const headers = { Origin: origin };
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
  const sharp = (await import("sharp")).default;
  const image = await sharp({
    create: { width: 32, height: 32, channels: 3, background: "#abc6a9" },
  })
    .png()
    .toBuffer();
  const original = await page.request.post("/api/assets", {
    headers,
    multipart: {
      _payload: JSON.stringify({ alt: "Keep shared metadata" }),
      file: { name: "native-image.png", mimeType: "image/png", buffer: image },
    },
  });
  expect(original.ok()).toBe(true);
  const asset = (await original.json()).doc;
  // A tiny synthetic black clip generated once with ffmpeg; tests prove native
  // upload/reference handling, rather than asserting browser playback support.
  const video = await page.request.post("/api/assets", {
    headers,
    multipart: {
      _payload: JSON.stringify({ alt: "Native video reference" }),
      file: {
        name: "native-video.mp4",
        mimeType: "video/mp4",
        buffer: await fs.readFile(
          new URL("./assets/synthetic-video.mp4", import.meta.url),
        ),
      },
    },
  });
  expect(video.ok()).toBe(true);
  const videoAsset = (await video.json()).doc;
  expect(videoAsset.mimeType).toBe("video/mp4");
  const slug = `media-proof-${Date.now()}`;
  const created = await page.request.post("/api/stories?draft=true", {
    headers,
    data: {
      name: "Media proof",
      slug,
      _status: "draft",
      article: {
        sections: [
          {
            blockType: "callout",
            headline: "Media reference proof",
            summary: "Native references",
            image: asset.id,
            readingTime: 12,
          },
        ],
      },
    },
  });
  expect(created.ok()).toBe(true);
  const doc = (await created.json()).doc;
  const read = async () => {
    const res = await page.request.get(
      `/api/stories/${doc.id}?draft=true&depth=0`,
      { headers },
    );
    expect(res.ok()).toBe(true);
    return res.json();
  };
  const activation = await page.request.post("/api/visual-editor/activate", {
    headers,
    data: { collection: "stories", id: doc.id, root: "article.sections" },
  });
  expect(activation.ok()).toBe(true);
  const { context: activated } = await activation.json();
  await page.goto(`/compose?context=${encodeURIComponent(activated.nonce)}`);
  await expect(
    page.getByRole("navigation", { name: "Editing toolbar" }),
  ).toBeVisible();
  await page.locator('[data-ve-field="image"]').click();
  const mediaPanel = page.getByRole("complementary", {
    name: "Edit content",
    exact: true,
  });
  const search = mediaPanel.getByLabel("Search media", { exact: true });
  await expect(search).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Keep shared metadata", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /native-image.png/ }),
  ).toHaveAttribute("aria-pressed", "true");
  const before = (await read())._veRevision;
  // A real native upload is intercepted once to exercise the public custom adapter's failure contract.
  let attempts = 0;
  await page.route("**/api/assets", async (route) => {
    if (route.request().method() === "POST" && ++attempts === 1)
      await route.fulfill({
        status: 503,
        json: { errors: [{ message: "Synthetic transient upload failure" }] },
      });
    else await route.continue();
  });
  await page.getByLabel("Upload media", { exact: true }).setInputFiles({
    name: "retry-image.png",
    mimeType: "image/png",
    buffer: image,
  });
  await expect(mediaPanel.getByRole("alert")).toContainText("Upload failed");
  expect((await read())._veRevision).toBe(before);
  await page.getByRole("button", { name: "Retry upload", exact: true }).click();
  await expect
    .poll(async () => (await read()).article.sections[0].image)
    .not.toBe(asset.id);
  expect(attempts).toBe(2);
  const uploaded = (await read()).article.sections[0].image;
  await search.fill("native-video");
  await page.getByRole("button", { name: /native-video.mp4/ }).click();
  await expect
    .poll(async () => (await read()).article.sections[0].image)
    .toBe(videoAsset.id);
  expect(videoAsset.id).not.toBe(uploaded);
  await expect(page.locator("main")).toContainText(
    "Video reference: native-video.mp4",
  );
  // A denied list never clears the currently selected document reference.
  await page.route("**/api/assets?*", (route) =>
    route.fulfill({
      status: 403,
      json: { errors: [{ message: "Synthetic denied search" }] },
    }),
  );
  await search.fill("denied");
  await expect(mediaPanel.getByRole("alert")).toContainText(
    "Media could not be loaded",
  );
  expect((await read()).article.sections[0].image).toBe(videoAsset.id);
  await page.unroute("**/api/assets?*");
  await page.getByRole("button", { name: "Retry search", exact: true }).click();
  await expect(
    page.getByText("No media found.", { exact: true }),
  ).toBeVisible();
  await search.fill("missing");
  await expect(
    page.getByText("No media found.", { exact: true }),
  ).toBeVisible();
  await search.fill("native-image");
  const originalButton = page.getByRole("button", { name: /native-image.png/ });
  await expect(originalButton).toBeVisible();
  await expect(originalButton.locator("img")).toBeVisible();
  await page.screenshot({ path: "test-results/installed-media.png" });
  await page
    .getByRole("button", { name: "Open native media editor", exact: true })
    .click();
  await expect(search).toHaveCount(0);
  await expect(
    page
      .getByRole("complementary", { name: "Edit content", exact: true })
      .getByRole("link", { name: "native-video.mp4", exact: true }),
  ).toBeVisible();
  const unchanged = await page.request.get(`/api/assets/${asset.id}`, {
    headers,
  });
  expect((await unchanged.json()).alt).toBe("Keep shared metadata");
  const reader = await browser.newContext();
  try {
    const denied = await reader.newPage();
    expect(
      (
        await denied.request.post(`${origin}/api/users/login`, {
          data: {
            email: "reader@consumer.test",
            password: "synthetic-consumer-password",
          },
        })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await denied.request.post(`${origin}/api/assets`, {
          headers,
          multipart: {
            file: { name: "denied.png", mimeType: "image/png", buffer: image },
          },
        })
      ).status(),
    ).toBe(403);
    await denied.goto(`${origin}/stories/${slug}`);
    await expect(
      denied.getByRole("button", { name: "Edit page", exact: true }),
    ).toHaveCount(0);
  } finally {
    await reader.close();
  }
});
