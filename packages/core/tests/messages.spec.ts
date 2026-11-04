import { expect, it } from "vitest";
import { createMessages } from "../src/messages.js";
const catalogue = {
  select: "Select content",
  count: { one: "{count} change", other: "{count} changes" },
  close: "Close {name}",
} as const;
it("formats typed parameters and plural categories independently of document locale", () => {
  const english = createMessages(catalogue);
  expect(english.t("count", { count: 1 })).toBe("1 change");
  expect(english.t("count", { count: 2 })).toBe("2 changes");
  const german = createMessages(catalogue, {
    locale: "de-DE",
    overrides: {
      select: "Inhalte auswählen",
      count: { one: "{count} Änderung", other: "{count} Änderungen" },
    },
  });
  expect(german.t("select")).toBe("Inhalte auswählen");
  expect(german.t("count", { count: 2 })).toBe("2 Änderungen");
  expect(
    german.date("2026-11-04T12:00:00Z", {
      dateStyle: "short",
      timeZone: "UTC",
    }),
  ).toBe("04.11.26");
});
it("retains placeholder contracts, escapes no HTML because output is text, and supports RTL overrides", () => {
  const text = createMessages(catalogue, {
    locale: "ar",
    overrides: { close: "إغلاق {name}" },
  });
  expect(text.direction).toBe("rtl");
  expect(text.t("close", { name: "<img>" })).toBe("إغلاق <img>");
  expect(
    createMessages(catalogue, { overrides: { close: "Wrong {secret}" } }).t(
      "close",
      { name: "panel" },
    ),
  ).toBe("Close panel");
  expect(createMessages(catalogue, { locale: "not_a_locale" }).locale).toBe(
    "en",
  );
  // @ts-expect-error Unknown message keys cannot become consumer overrides.
  expect(() => text.t("missing")).toThrow("Unknown");
  // @ts-expect-error Parameterized messages require their complete values.
  expect(() => text.t("close")).toThrow("Missing");
  // @ts-expect-error UI translation does not accept arbitrary document values.
  expect(() => text.t("close", { name: { private: true } })).toThrow("Missing");
  // @ts-expect-error A plural choice needs a numeric count.
  expect(() => text.t("count", { count: "two" })).toThrow("finite count");
  expect(
    createMessages(catalogue, { overrides: { count: null as never } }).t(
      "count",
      { count: 2 },
    ),
  ).toBe("2 changes");
});
