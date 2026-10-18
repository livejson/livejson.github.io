import { readFileSync, writeFileSync } from "node:fs";

for (const file of [".freebuff/build-pages.mjs", "tools/build-pages.mjs"]) {
  const src = readFileSync(file, "utf8");
  const next = src.replace(/const V = "v\d+";/, 'const V = "v7";');
  writeFileSync(file, next);
  console.log(file, next === src ? "unverändert" : "→ v7");
}
