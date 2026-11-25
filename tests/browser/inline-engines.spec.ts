import { expect, test } from "@playwright/test";
import { createShopEditor, moveCaretToEnd } from "./testing/editor-fixtures";

test("inline text saves after composition, keeps selection and exits by keyboard", async ({
  page,
}) => {
  const initial = "Inline engine fixture";
  const { doc } = await createShopEditor(page, {
    sourceText: { eyebrow: initial, description: "Synthetic content." },
  });
  const field = page.locator('main [data-ve-field="eyebrow"]').first();
  const documentPath = `/api/shops/${doc.id}`;
  let saves = 0;
  const isSave = (method: string, url: string) =>
    method === "PATCH" && new URL(url).pathname === documentPath;
  page.on("request", (request) => {
    if (isSave(request.method(), request.url())) saves++;
  });
  const saved = () =>
    page.waitForResponse((response) =>
      isSave(response.request().method(), response.url()),
    );
  await field.click();
  await expect(field).toHaveAttribute("contenteditable", "plaintext-only");
  await moveCaretToEnd(field);
  const typed = saved();
  await field.pressSequentially(" ok");
  expect((await typed).ok()).toBe(true);
  await expect(field).toHaveText(`${initial} ok`);
  await expect(
    page.getByRole("status", { name: "Draft saved", exact: true }),
  ).toBeVisible();

  await moveCaretToEnd(field);
  await page.clock.install();
  await field.dispatchEvent("compositionstart", { data: "" });
  await field.evaluate((element) => {
    const selection = getSelection()!;
    const range = selection.getRangeAt(0);
    const text = document.createTextNode(" 日本語");
    range.insertNode(text);
    range.setStartAfter(text);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    element.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertCompositionText",
        data: " 日本語",
        isComposing: true,
      }),
    );
  });
  await expect(field).toHaveText(`${initial} ok 日本語`);
  // The demo config uses a 1500ms autosave interval.
  await page.clock.runFor(1600);
  expect(saves).toBe(1);

  const composed = saved();
  await field.dispatchEvent("compositionend", { data: " 日本語" });
  await field.press("Shift+ArrowLeft");
  const selection = () =>
    field.evaluate((element) => {
      const range = getSelection();
      return {
        text: range?.toString(),
        insideField: Boolean(
          range?.anchorNode && element.contains(range.anchorNode),
        ),
      };
    });
  const expectedSelection = { text: "語", insideField: true };
  await expect.poll(selection).toEqual(expectedSelection);
  await page.clock.runFor(1600);
  expect((await composed).ok()).toBe(true);
  await expect(
    page.getByRole("status", { name: "Draft saved", exact: true }),
  ).toBeVisible();
  await expect(field).toBeFocused();
  await expect.poll(selection).toEqual(expectedSelection);

  await page.keyboard.press("Escape");
  await expect(field).not.toBeFocused();
  const stored = await page.request.get(`${documentPath}?draft=true&depth=0`);
  expect(stored.ok()).toBe(true);
  expect((await stored.json()).layout[0].eyebrow).toBe(`${initial} ok 日本語`);
  expect(saves).toBe(2);
});
