import fs from "node:fs";
const target = "packages/payload-inplace";
for (const file of ["README.md", "LICENSE", "NOTICE"])
  fs.copyFileSync(file, `${target}/${file}`);
fs.mkdirSync(`${target}/assets`, { recursive: true });
fs.copyFileSync("assets/icon.png", `${target}/assets/icon.png`);
