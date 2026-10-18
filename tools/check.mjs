/* Kleiner Selbsttest vor dem Deploy: Links, Assets, Daten, Syntax. */

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const PAGES = ["index.html", "about.html", "clips.html", "socials.html", "streamplan.html", "community.html"];
const problems = [];

for (const page of PAGES) {
  const html = readFileSync(page, "utf8");
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);

  for (const ref of refs) {
    if (/^(https?:|mailto:|#|data:)/.test(ref)) continue;
    const path = ref.split("?")[0].split("#")[0];
    if (!path) continue;
    if (!existsSync(path)) problems.push(`${page}: fehlt ${path}`);
  }

  // offene Container zählen – grober, aber wirksamer Sanity-Check
  const opens = (html.match(/<div\b/g) || []).length;
  const closes = (html.match(/<\/div>/g) || []).length;
  if (opens !== closes) problems.push(`${page}: <div> ${opens} / </div> ${closes}`);

  if (!/<title>[^<]+<\/title>/.test(html)) problems.push(`${page}: kein <title>`);
  if (!/data-live-pill/.test(html)) problems.push(`${page}: keine Live-Pille`);
  if (!/id="player"/.test(html)) problems.push(`${page}: kein Clip-Player`);
}

// JS-Syntax
for (const file of ["main.js", "data.js"]) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (error) {
    problems.push(`${file}: Syntaxfehler (${String(error.stderr).slice(0, 200)})`);
  }
}

// data.js auswerten
const win = {};
new Function("window", readFileSync("data.js", "utf8"))(win);
const LJ = win.LJ;
if (!LJ || !LJ.stats || !Array.isArray(LJ.clips) || !Array.isArray(LJ.streams)) problems.push("data.js: unvollständig");
else {
  console.log(`Daten: ${LJ.stats.streams} Streams · ${LJ.stats.hours} h · ${LJ.clips.length} Clips · ${LJ.channel.followersAtBuild} Follower`);
}

console.log(problems.length ? `\n✗ ${problems.length} Problem(e):\n- ${problems.join("\n- ")}` : "\n✓ Alle Seiten, Links und Assets in Ordnung");
process.exitCode = problems.length ? 1 : 0;
