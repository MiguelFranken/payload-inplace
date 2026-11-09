import fs from "node:fs";

const root = new URL("../../../", import.meta.url);

for (const file of ["README.md", "LICENSE", "NOTICE"])
  fs.copyFileSync(new URL(file, root), file);

fs.mkdirSync("assets", { recursive: true });

fs.copyFileSync(new URL("assets/icon.png", root), "assets/icon.png");
