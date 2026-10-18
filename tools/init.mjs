import { mkdirSync, copyFileSync, readdirSync } from "node:fs";

mkdirSync("tools", { recursive: true });
for (const file of ["build-pages.mjs", "fetch-twitch.mjs"]) {
  copyFileSync(`.freebuff/${file}`, `tools/${file}`);
}
console.log(readdirSync("tools").join(", "));
