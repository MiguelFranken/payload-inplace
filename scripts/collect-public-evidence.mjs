import fs from "node:fs";

const report = JSON.parse(fs.readFileSync("test-results/results.json", "utf8"));

const measurements = [];

function visit(suite) {
  for (const spec of suite.specs || [])
    for (const test of spec.tests || [])
      for (const result of test.results || []) {
        if (result.status !== "passed") continue;
        for (const attachment of result.attachments || [])
          if (/^public-(anonymous|reader|admin)\.json$/.test(attachment.name)) {
            const data = JSON.parse(
              attachment.body
                ? Buffer.from(attachment.body, "base64").toString("utf8")
                : fs.readFileSync(attachment.path, "utf8"),
            );
            measurements.push(data);
          }
      }
  for (const child of suite.suites || []) visit(child);
}

visit(report);

if (
  measurements.length !== 3 ||
  measurements.some((m) => m.samples.length !== 3)
)
  throw Error("Require three passed identity cases with three samples each");

const disabled = measurements.every((m) => m.disabled);

fs.writeFileSync(
  `test-results/public-${disabled ? "baseline" : "installed"}.json`,
  JSON.stringify(
    {
      scope:
        "local synthetic demo; decoded JS/CSS bytes, not transfer-compressed bytes; bounded idle observation",
      measurements,
    },
    null,
    2,
  ),
);

console.log(
  `Collected ${disabled ? "disabled baseline" : "installed"} evidence for three identities; no raw activation/cookie data`,
);
