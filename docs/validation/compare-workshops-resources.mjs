import assert from "node:assert/strict";
import fs from "node:fs";

const identities = ["anonymous", "staff inactive"];
const routes = ["/", "/about-us", "/workshops/wax-silver-workshop"];
const sorted = (values) => [...values].sort(([a], [b]) => a.localeCompare(b));

/** Compare a complete public browsing session, retaining per-route differences caused by normal Next prefetch scheduling. */
export function comparePublicResources(input) {
  const result = [];
  for (const identity of identities) {
    const modes = ["enabled", "disabled"].map((mode) => {
      const reports = input[mode].filter(
        (report) => report.identity === identity,
      );
      assert.equal(reports.length, 1, `One ${identity} report required`);
      const cases = reports[0].cases;
      assert.deepEqual(cases.map((c) => c.route).sort(), [...routes].sort());
      const union = new Map();
      for (const visit of cases) {
        assert.deepEqual(
          visit.editorRequests,
          [],
          "No editor requests on any public route",
        );
        assert.ok(
          visit.resources.some((a) => a.bytes > 0),
          "Empty resources cannot prove isolation",
        );
        for (const asset of visit.resources) {
          assert.ok(Number.isFinite(asset.bytes) && asset.bytes >= 0);
          if (union.has(asset.path))
            assert.equal(union.get(asset.path), asset.bytes);
          union.set(asset.path, asset.bytes);
        }
      }
      return { cases, assets: sorted(union) };
    });
    assert.deepEqual(
      modes[0].assets,
      modes[1].assets,
      "Enabled/disabled public asset path or decoded-byte difference",
    );
    result.push({
      identity,
      assetUnionEqual: true,
      assets: modes[0].assets.length,
      decodedBytes: modes[0].assets.reduce((sum, [, bytes]) => sum + bytes, 0),
      editorRequests: 0,
      routes: routes.map((route) => {
        const visits = modes.map((m) => m.cases.find((c) => c.route === route));
        return {
          route,
          resourceSetsEqual:
            JSON.stringify(visits[0].resources) ===
            JSON.stringify(visits[1].resources),
          decodedBytesEnabled: visits[0].decodedBytes,
          decodedBytesDisabled: visits[1].decodedBytes,
          timingEnabled: visits[0].timing,
          timingDisabled: visits[1].timing,
        };
      }),
    });
  }
  return result;
}

// Positive/negative controls ensure normalization permits only movement between
// already visited public routes, never an added asset, changed bytes or editor work.
const sample = () =>
  Object.fromEntries(
    ["enabled", "disabled"].map((mode) => [
      mode,
      identities.map((identity) => ({
        identity,
        cases: routes.map((route) => ({
          route,
          editorRequests: [],
          decodedBytes: 10,
          resources: [{ path: "/public.js", bytes: 10 }],
        })),
      })),
    ]),
  );
const pass = sample();
for (const mode of ["enabled", "disabled"])
  pass[mode].forEach((r) =>
    r.cases[2].resources.push({ path: "/workshop.js", bytes: 20 }),
  );
pass.enabled[0].cases[0].resources.push({ path: "/workshop.js", bytes: 20 });
comparePublicResources(pass);
for (const mutate of [
  (x) =>
    x.enabled[0].cases[0].resources.push({
      path: "/extra-editor.js",
      bytes: 1,
    }),
  (x) =>
    x.enabled[0].cases.forEach((c) => {
      c.resources[0].bytes = 11;
    }),
  (x) => x.enabled[0].cases[0].editorRequests.push("/visual-editor/status"),
  (x) => x.enabled[0].cases.pop(),
  (x) => x.enabled.pop(),
  (x) =>
    x.enabled[0].cases.forEach((c) => {
      c.resources.forEach((a) => {
        a.bytes = 0;
      });
    }),
]) {
  const input = sample();
  mutate(input);
  assert.throws(() => comparePublicResources(input));
}
const input = JSON.parse(
  fs.readFileSync(
    new URL("./2026-11-03-workshops-public-input.json", import.meta.url),
    "utf8",
  ),
);
console.log(
  JSON.stringify(
    {
      appSHA: input.appSHA,
      scope: input.scope,
      controlsPassed: true,
      comparisons: comparePublicResources(input),
    },
    null,
    2,
  ),
);
