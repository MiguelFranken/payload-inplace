import { expect, it } from "vitest";
import { nativeDraftAction } from "../src/adapters/native-request.js";
it("scopes manual and automatic native submissions to the selected content locale", () => {
  for (const autosave of [false, true]) {
    const url = new URL(
      nativeDraftAction(
        "https://demo.example/api/",
        { collection: "pages", id: "a/b" },
        "de-DE",
        autosave,
      ),
    );
    expect(url.pathname).toBe("/api/pages/a%2Fb");
    expect(url.searchParams.get("locale")).toBe("de-DE");
    expect(url.searchParams.get("fallback-locale")).toBe("null");
    expect(url.searchParams.get("draft")).toBe("true");
    expect(url.searchParams.has("autosave")).toBe(autosave);
  }
});

it('omits locale for collections without localization', () => { expect(nativeDraftAction('/api',{collection:'pages',id:'1'},undefined)).not.toContain('locale=undefined'); });
