import { test, expect, type CDPSession } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

test("production active feature transfer and interaction budgets include native peers", async ({
  page,
  context,
  browser,
}) => {
  test.skip(
    process.env.VE_PRODUCTION !== "1",
    "Transfer/compile evidence requires the production Turbopack artifact",
  );
  expect(
    (
      await page.request.post("/api/users/login", {
        data: {
          email: "admin@example.test",
          password: "synthetic-demo-password",
        },
      })
    ).ok(),
  ).toBe(true);
  const source = (
    await (
      await page.request.get(
        "/api/shops?where[slug][equals]=home&draft=true&depth=0",
      )
    ).json()
  ).docs[0];
  // Prepare only this run's disposable synthetic native draft, leaving publication unchanged.
  const layout = source.layout.map((row: Record<string, unknown>) =>
    row.blockType === "editorial"
      ? {
          ...row,
          body: {
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
                      text: "Performance fixture.",
                      format: 0,
                      style: "",
                      detail: 0,
                      mode: "normal",
                    },
                  ],
                },
              ],
            },
          },
        }
      : row,
  );
  expect(
    (
      await page.request.patch(`/api/shops/${source.id}?draft=true&depth=0`, {
        data: { layout, _status: "draft", _veRevision: source._veRevision },
      })
    ).ok(),
  ).toBe(true);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Performance.enable");
  await page.goto("/shop");
  const edit = page.getByRole("button", { name: "Edit page", exact: true });
  await expect(edit).toBeVisible();
  const url = page.url();
  await page.evaluate(() => {
    (window as any).__perfHeader = document.querySelector(
      "[data-test-site-header]",
    );
    (window as any).__perfLongTasks = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        (window as any).__perfLongTasks.push({
          start: entry.startTime,
          duration: entry.duration,
        });
    }).observe({ type: "longtask", buffered: false });
  });
  await cdp.send("Tracing.start", {
    categories: "v8,devtools.timeline,disabled-by-default-v8.compile",
    transferMode: "ReturnAsStream",
  });
  const phases: Record<string, any> = {};
  async function metrics(session: CDPSession) {
    return Object.fromEntries(
      (await session.send("Performance.getMetrics")).metrics.map(
        (metric: any) => [metric.name, metric.value],
      ),
    );
  }
  async function measure(name: string, action: () => Promise<void>) {
    const before = await metrics(cdp);
    const start = await page.evaluate(() => {
      performance.clearResourceTimings();
      return performance.now();
    });
    await action();
    const after = await metrics(cdp);
    phases[name] = await page.evaluate(
      ({ start, before, after }) => {
        const resources = performance
          .getEntriesByType("resource")
          .filter((entry) => entry.startTime >= start)
          .map((entry) => {
            const resource = entry as PerformanceResourceTiming;
            return {
              path: new URL(resource.name).pathname,
              encoded: resource.encodedBodySize,
              decoded: resource.decodedBodySize,
              transfer: resource.transferSize,
              type: resource.initiatorType,
            };
          });
        const chunks = resources.filter(
          (resource) =>
            resource.path.startsWith("/_next/static/") &&
            /\.(js|css)$/.test(resource.path),
        );
        const tasks = (window as any).__perfLongTasks.filter(
          (task: any) => task.start >= start,
        );
        return {
          elapsed: performance.now() - start,
          requests: resources.length,
          chunkRequests: chunks.length,
          decoded: chunks.reduce((sum, item) => sum + item.decoded, 0),
          encoded: chunks.reduce((sum, item) => sum + item.encoded, 0),
          transfer: chunks.reduce((sum, item) => sum + item.transfer, 0),
          scriptMs: 1000 * (after.ScriptDuration - before.ScriptDuration),
          taskMs: 1000 * (after.TaskDuration - before.TaskDuration),
          longTasks: tasks,
          resources,
        };
      },
      { start, before, after },
    );
  }
  const toolbar = page.getByRole("navigation", { name: "Editing toolbar" });
  await measure("activation", async () => {
    await edit.click();
    await expect(toolbar).toBeVisible();
  });
  expect(page.url()).toBe(url);
  expect(
    await page.evaluate(
      () =>
        (window as any).__perfHeader ===
        document.querySelector("[data-test-site-header]"),
    ),
  ).toBe(true);
  await measure("nativePanel", async () => {
    await page.getByRole("button", { name: "Sections", exact: true }).click();
    await page
      .getByRole("button", {
        name: "Settings for Product collection section",
        exact: true,
      })
      .click();
    await expect(
      page
        .getByRole("complementary", { name: "Edit content", exact: true })
        .getByRole("textbox", { name: "Collection Label", exact: true }),
    ).toBeVisible();
  });
  await page
    .getByRole("button", { name: "Back to sections", exact: true })
    .click();
  await measure("catalogue", async () => {
    await page
      .getByRole("combobox", { name: "Add section", exact: true })
      .click();
    await expect(
      page.getByRole("combobox", { name: "Search sections", exact: true }),
    ).toBeVisible();
  });
  await page
    .getByRole("combobox", { name: "Search sections", exact: true })
    .press("Escape");
  await page
    .getByRole("button", { name: "Close Sections panel", exact: true })
    .click();
  await measure("review", async () => {
    await page
      .getByRole("button", { name: "Review changes", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Changed fields", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: "Loading comparison" }),
    ).toHaveCount(0);
  });
  await page.getByRole("button", { name: "Close review", exact: true }).click();
  await measure("versions", async () => {
    await page.getByRole("button", { name: "More tools", exact: true }).click();
    await page
      .getByRole("menuitem", { name: "Saved versions", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Saved versions", exact: true }),
    ).toBeVisible();
  });
  await page
    .getByRole("button", { name: "Close Saved versions panel", exact: true })
    .click();
  const select = page.getByRole("button", {
    name: "Select content",
    exact: true,
  });
  if ((await select.getAttribute("aria-pressed")) !== "true")
    await select.click();
  await measure("media", async () => {
    await page
      .locator("main > [data-ve-block]")
      .first()
      .locator('[data-ve-field="image"]')
      .click();
    await expect(
      page.getByLabel("Search media", { exact: true }),
    ).toBeVisible();
  });
  await page.getByRole("button", { name: /Close .* panel/ }).click();
  await measure("richtext", async () => {
    await page.locator('[data-ve-field="body"]').first().click();
    await expect(
      page.getByRole("toolbar", { name: "Text formatting", exact: true }),
    ).toBeVisible();
  });
  const rich = page.locator('[data-ve-inline-active][contenteditable="true"]');
  await measure("typing", async () => {
    await rich.pressSequentially(" snappy");
    await expect(rich).toContainText("snappy");
  });
  await measure("save", async () => {
    await expect(
      page.getByRole("status", { name: "Draft saved", exact: true }),
    ).toBeVisible();
  });
  await rich.press("Escape");
  await measure("panelReopen", async () => {
    await page.getByRole("button", { name: "Sections", exact: true }).click();
    await page
      .getByRole("button", {
        name: "Settings for Product collection section",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("textbox", { name: "Collection Label", exact: true }),
    ).toBeVisible();
  });
  const completed = new Promise<{ stream?: string }>((resolve) =>
    cdp.once("Tracing.tracingComplete", resolve),
  );
  await cdp.send("Tracing.end");
  const { stream } = await completed;
  if (!stream) throw Error("Chromium did not return a trace stream");
  let trace = "";
  while (true) {
    const chunk = await cdp.send("IO.read", { handle: stream });
    trace += chunk.data;
    if (chunk.eof) break;
  }
  await cdp.send("IO.close", { handle: stream });
  const parsed = JSON.parse(trace).traceEvents.filter(
    (event: any) =>
      event.ph === "X" &&
      /^(V8\.|v8\.|BackgroundCompileTask)/.test(event.name) &&
      /parse|compile/i.test(event.name) &&
      event.dur > 0,
  );
  const compile = {
    events: parsed.length,
    aggregateMs: parsed.reduce(
      (sum: number, event: any) => sum + event.dur / 1000,
      0,
    ),
    names: [...new Set(parsed.map((event: any) => event.name))],
  };
  expect(compile.events).toBeGreaterThan(0);
  for (const name of ["catalogue", "review", "versions", "media", "richtext"])
    expect(
      phases[name].chunkRequests,
      `${name} is really fetched on demand`,
    ).toBeGreaterThan(0);
  const file = "docs/validation/performance/browser-budgets.json";
  const distDir = process.env.VE_NEXT_DIST_DIR || ".next-prod";
  const report = {
    commit: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    sourceDirty:
      execFileSync("git", ["status", "--porcelain"], {
        encoding: "utf8",
      }).trim().length > 0,
    buildId: fs
      .readFileSync(path.join("apps/demo", distDir, "BUILD_ID"), "utf8")
      .trim(),
    node: process.version,
    browser: browser.version(),
    method:
      "Production Chromium, same-page activation, fresh cache-disabled context, localhost. Actual ResourceTiming JS/CSS encoded/decoded/transfer bytes include all native peers. CDP ScriptDuration is execution, separate from traced parse/compile aggregate (nested events may overlap). Action latency includes Playwright readiness checks. Not a network/device simulation or universal user benchmark.",
    phases,
    compile,
  };
  if (process.env.VE_RECORD_PERF === "1")
    fs.writeFileSync(
      file,
      JSON.stringify(
        {
          method: report.method,
          baseline: report,
          limits: Object.fromEntries(
            Object.entries(phases).map(([name, value]) => [
              name,
              {
                decoded: Math.ceil(value.decoded * 1.3 + 4096),
                chunkRequests: Math.ceil(value.chunkRequests * 1.3 + 2),
                elapsed: Math.max(
                  name === "activation" ? 8000 : 5000,
                  Math.ceil(value.elapsed * 3),
                ),
                scriptMs: Math.max(1000, Math.ceil(value.scriptMs * 3)),
              },
            ]),
          ),
        },
        null,
        2,
      ) + "\n",
    );
  const limits = JSON.parse(fs.readFileSync(file, "utf8")).limits;
  const verify = (values: typeof phases) => {
    for (const [name, phase] of Object.entries(values))
      for (const key of ["decoded", "chunkRequests", "elapsed", "scriptMs"])
        expect(phase[key], `${name} ${key}`).toBeLessThanOrEqual(
          limits[name][key],
        );
  };
  verify(phases);
  expect(() =>
    verify({
      ...phases,
      richtext: { ...phases.richtext, decoded: limits.richtext.decoded + 1 },
    }),
  ).toThrow();
  fs.mkdirSync("test-results", { recursive: true });
  fs.writeFileSync(
    "test-results/active-editor-performance.json",
    JSON.stringify(
      {
        ...report,
        artifactSHA256: createHash("sha256").update(trace).digest("hex"),
        budgetNegativeControl: true,
      },
      null,
      2,
    ) + "\n",
  );
  await cdp.detach();
});
