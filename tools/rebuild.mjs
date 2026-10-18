/* Bringt den Generator auf denselben Stand wie die Seiten und prüft,
   dass ein erneuter Build exakt dieselben Dateien erzeugt.               */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";

const PAGES = ["index.html", "about.html", "clips.html", "socials.html", "streamplan.html", "community.html"];
const hash = () => PAGES.map((f) => createHash("sha1").update(readFileSync(f)).digest("hex")).join("\n");

const GEN = ".freebuff/build-pages.mjs";
let src = readFileSync(GEN, "utf8");
const before = src;

const patches = [
  ["${p.no}</span> ${p.title}", "${p.no}</span> ${esc(p.nav)}"],
  ["<i>${p.title}</i>", "<i>${esc(p.nav)}</i>"],
  ['\n      <div class="keypoint" hidden></div>', ""],
  ['<span class="hud__label">Nächster Stream</span>', '<span class="hud__label" data-countdown-label>Nächster Stream</span>'],
];

for (const [from, to] of patches) {
  if (!src.includes(from)) console.log(`· Muster nicht gefunden: ${from.slice(0, 42)}`);
  src = src.split(from).join(to);
}

if (src !== before) {
  writeFileSync(GEN, src);
  console.log("✓ Generator gepatcht");
}

copyFileSync(GEN, "tools/build-pages.mjs");
copyFileSync(".freebuff/fetch-twitch.mjs", "tools/fetch-twitch.mjs");

const beforeHash = hash();
execFileSync(process.execPath, [GEN], { stdio: "inherit" });
const afterHash = hash();

console.log(beforeHash === afterHash ? "✓ Rebuild erzeugt identische Seiten" : "⚠ Rebuild hat Seiten verändert – bitte prüfen");
