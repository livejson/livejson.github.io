import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";

mkdirSync("tools", { recursive: true });

const file = ".freebuff/build-pages.mjs";
let src = readFileSync(file, "utf8");
const before = src;

src = src.replaceAll('${p.no}</span> ${p.title}', "${p.no}</span> ${esc(p.nav)}");
src = src.replaceAll("<i>${p.title}</i>", "<i>${esc(p.nav)}</i>");
src = src.replace(/\n\s*<div class="keypoint" hidden><\/div>/g, "");

if (src === before) {
  console.log("keine Änderung – Muster nicht gefunden");
} else {
  writeFileSync(file, src);
  console.log("Generator gepatcht");
}

copyFileSync(file, "tools/build-pages.mjs");
copyFileSync(".freebuff/fetch-twitch.mjs", "tools/fetch-twitch.mjs");
console.log("tools/ aktualisiert");
