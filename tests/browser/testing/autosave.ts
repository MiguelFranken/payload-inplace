import type { Page } from "@playwright/test";
import { setTimeout as delay } from "node:timers/promises";

/** Use browser time for debounce checks and optionally delay native save acknowledgements. */
export async function observeAutosave(page: Page, documentPath: string) {
  await page.clock.install();
  const matches = (url: URL) => url.pathname === documentPath;
  const latency = Number(process.env.VE_TEST_SAVE_DELAY_MS || 0);
  if (latency > 0) {
    await page.route(matches, async (route) => {
      if (route.request().method() !== "PATCH") return route.fallback();
      const response = await route.fetch();
      await delay(latency);
      await route.fulfill({ response });
    });
  }
  return {
    // The demo page and commerce schemas both configure 1500ms of native idle time.
    advanceIdleWindow: () => page.clock.runFor(1600),
    response: () =>
      page.waitForResponse(
        (response) =>
          response.request().method() === "PATCH" &&
          matches(new URL(response.url())),
      ),
  };
}
