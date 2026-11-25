import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

const sectionCount = 72;

async function openLongPage(page: Page) {
  const login = await page.request.post("/api/users/login", {
    data: {
      email: "admin@example.test",
      password: "synthetic-demo-password",
    },
  });
  expect(login.ok()).toBe(true);
  const response = await page.request.post("/api/pages", {
    data: {
      title: "Long-page geometry fixture",
      slug: `geometry-${randomUUID()}`,
      _status: "draft",
      layout: Array.from({ length: sectionCount }, (_, index) => ({
        blockType: "text",
        heading: `Synthetic section ${index + 1}`,
        caption:
          "Text of a predictable length to show wrapping on a narrow screen.",
        items: [
          { label: "First item" },
          { label: "Second item" },
          { label: "Third item" },
        ],
      })),
    },
  });
  expect(response.ok()).toBe(true);
  const { doc } = await response.json();
  await page.goto(`/visual-editor/start?collection=pages&id=${doc.id}`);
  await page
    .getByRole("button", { name: "Start editing", exact: true })
    .click();
  await page.getByRole("button", { name: "Sections", exact: true }).click();
  await expect(page.locator("[data-ve-canvas-handle]")).toHaveCount(
    sectionCount,
  );
  await expect(page.locator("[data-ve-canvas-handle]").first()).toBeVisible();
}

test("measure active canvas geometry while scrolling a long page", async ({
  page,
  browser,
}, testInfo) => {
  await openLongPage(page);

  const handles = await page
    .locator("[data-ve-canvas-handle]")
    .elementHandles();
  const samples = await page.evaluate(async (overlays) => {
    const fields = [...document.querySelectorAll("[data-ve-field]")];
    const blocks = new Map(
      [
        ...document.querySelectorAll<HTMLElement>(
          "main section[data-ve-block]",
        ),
      ].map((node) => [node.dataset.veBlock, node]),
    );
    const nextFrame = () =>
      new Promise<number>((resolve) => requestAnimationFrame(resolve));
    const rangeRects = Range.prototype.getClientRects;
    const elementRects = Element.prototype.getClientRects;
    const selectAll = Document.prototype.querySelectorAll;
    let rangeReads = 0;
    let elementReads = 0;
    let boundFieldPasses = 0;
    Document.prototype.querySelectorAll = function (selector: string) {
      if (selector === "[data-ve-field]") boundFieldPasses++;
      return selectAll.call(this, selector);
    };
    Range.prototype.getClientRects = function () {
      rangeReads++;
      return rangeRects.call(this);
    };
    Element.prototype.getClientRects = function () {
      elementReads++;
      return elementRects.call(this);
    };

    const rows = [];
    try {
      await nextFrame();
      await nextFrame();
      const maxScroll = document.documentElement.scrollHeight - innerHeight;
      for (let step = 1; step <= 30; step++) {
        rangeReads = elementReads = boundFieldPasses = 0;
        const start = performance.now();
        window.scrollTo({
          top: Math.round((maxScroll * step) / 31),
          behavior: "instant",
        });
        const firstFrame = await nextFrame();
        const secondFrame = await nextFrame();
        const reads = { rangeReads, elementReads, boundFieldPasses };
        let visible = 0;
        let misplaced = 0;
        for (const overlay of overlays) {
          if (!(overlay instanceof HTMLElement)) continue;
          const block = blocks.get(
            overlay.getAttribute("data-ve-canvas-handle") || undefined,
          );
          const bar = overlay.querySelector<HTMLElement>(
            "[data-obscured=false]",
          );
          if (!block || !bar) continue;
          const grip = bar.getBoundingClientRect();
          if (grip.bottom <= 0 || grip.top >= innerHeight) continue;
          visible++;
          const anchor = overlay.getBoundingClientRect();
          if (
            Math.abs(anchor.top - block.getBoundingClientRect().top - 8) > 1 ||
            grip.left < 0 ||
            grip.right > innerWidth
          )
            misplaced++;
        }
        rows.push({
          step,
          scrollY,
          ...reads,
          visible,
          misplaced,
          nextFrameMs: firstFrame - start,
          frameIntervalMs: secondFrame - firstFrame,
        });
      }
    } finally {
      Range.prototype.getClientRects = rangeRects;
      Element.prototype.getClientRects = elementRects;
      Document.prototype.querySelectorAll = selectAll;
    }
    return { fields: fields.length, sections: overlays.length, rows };
  }, handles);

  const percentile = (values: number[], quantile: number) =>
    [...values].sort((a, b) => a - b)[Math.ceil(values.length * quantile) - 1];
  const report = {
    viewport: page.viewportSize(),
    browser: browser.version(),
    production: process.env.VE_PRODUCTION === "1",
    fields: samples.fields,
    sections: samples.sections,
    steps: samples.rows.length,
    totalFieldPasses: samples.rows.reduce(
      (sum, row) => sum + row.boundFieldPasses,
      0,
    ),
    rangeReadsP50: percentile(
      samples.rows.map((row) => row.rangeReads),
      0.5,
    ),
    elementReadsP50: percentile(
      samples.rows.map((row) => row.elementReads),
      0.5,
    ),
    nextFrameP95Ms: percentile(
      samples.rows.map((row) => row.nextFrameMs),
      0.95,
    ),
    frameIntervalP50Ms: percentile(
      samples.rows.map((row) => row.frameIntervalMs),
      0.5,
    ),
    frameIntervalP95Ms: percentile(
      samples.rows.map((row) => row.frameIntervalMs),
      0.95,
    ),
    visibleGripChecks: samples.rows.reduce((sum, row) => sum + row.visible, 0),
    samples: samples.rows,
  };
  await testInfo.attach("overlay-geometry.json", {
    body: JSON.stringify(report, null, 2),
    contentType: "application/json",
  });
  console.log(JSON.stringify({ ...report, samples: undefined }));
  expect(report.sections).toBe(sectionCount);
  expect(report.fields).toBeGreaterThan(sectionCount * 4);
  expect(report.totalFieldPasses).toBeGreaterThan(0);
  expect(report.visibleGripChecks).toBeGreaterThan(0);
  expect(samples.rows.filter((row) => row.misplaced)).toEqual([]);
});
