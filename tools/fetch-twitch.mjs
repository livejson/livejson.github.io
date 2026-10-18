/* Erzeugt data.js für die Website: echte Twitch-Zahlen von LiveJson.
   Quellen: DecAPI (live), TwitchTracker (Stream-Liste), Twitch GQL (Clips, Profil).
   Aufruf:  node .freebuff/fetch-twitch.mjs                                     */

import { writeFileSync } from "node:fs";

const BROWSER = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
};
const LOGIN = "livejson";

/* ---------- 1. Stream-Liste (TwitchTracker) ----------------------------- */

const ttHtml = await (await fetch(`https://twitchtracker.com/${LOGIN}/streams`, {
  headers: { ...BROWSER, Referer: `https://twitchtracker.com/${LOGIN}` },
})).text();

const rows = [...ttHtml.matchAll(/<tr>\s*<td nowrap data-order="([^"]+)">[\s\S]*?<\/tr>/g)].map((m) => m[0]);
const streams = rows
  .map((row) => {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) =>
      m[1].replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim()
    );
    return {
      date: cells[0],
      minutes: Number(cells[1]) || 0,
      avg: Number(cells[2]) || 0,
      max: Number(cells[3]) || 0,
      follows: Number(cells[4]) || 0,
      title: cells[6] || "",
    };
  })
  .filter((s) => /^\d{4}-\d{2}-\d{2}/.test(s.date))
  .sort((a, b) => a.date.localeCompare(b.date));

const minutes = streams.reduce((sum, s) => sum + s.minutes, 0);
const avgViewers = streams.length
  ? Math.round(streams.reduce((sum, s) => sum + s.avg, 0) / streams.length)
  : 0;

/* ---------- 2. Clips + Profil (Twitch GQL) ------------------------------ */

const GQL = `{
  user(login: "${LOGIN}") {
    id displayName createdAt description
    followers { totalCount }
    clips(first: 24, criteria: { period: ALL_TIME }) {
      edges { node { slug title durationSeconds thumbnailURL viewCount createdAt game { name } } }
    }
  }
}`;

const gqlRes = await fetch("https://gql.twitch.tv/gql", {
  method: "POST",
  headers: { "Client-ID": "kimne78kx3ncx6brgo4mv6wki5h1ko", "Content-Type": "application/json" },
  body: JSON.stringify({ query: GQL }),
});
const gql = (await gqlRes.json())?.data?.user ?? {};
const clips = (gql.clips?.edges ?? [])
  .map((e) => e.node)
  .sort((a, b) => b.viewCount - a.viewCount)
  .map((c) => ({
    slug: c.slug,
    title: c.title,
    seconds: c.durationSeconds,
    views: c.viewCount,
    date: c.createdAt.slice(0, 10),
    game: c.game?.name ?? "",
    thumb: c.thumbnailURL,
  }));

/* ---------- 3. Momentane Zahlen (DecAPI) -------------------------------- */

const decapi = async (path) => {
  try {
    const res = await fetch(`https://decapi.me/twitch/${path}/${LOGIN}?t=${Date.now()}`);
    return (await res.text()).trim();
  } catch {
    return "";
  }
};

const [followersNow, liveNow, gameNow] = await Promise.all([
  decapi("followcount"),
  decapi("uptime"),
  decapi("game"),
]);

/* ---------- 4. Snapshot schreiben -------------------------------------- */

const data = {
  updated: new Date().toISOString().slice(0, 10),
  channel: {
    login: LOGIN,
    id: gql.id ?? "",
    name: gql.displayName ?? "LiveJson",
    createdAt: (gql.createdAt ?? "").slice(0, 10),
    followersAtBuild: Number(followersNow) || gql.followers?.totalCount || 0,
    liveAtBuild: Boolean(liveNow) && !/offline/i.test(liveNow),
    gameAtBuild: gameNow,
  },
  streams: streams.slice(-40).map((s) => ({
    date: s.date,
    minutes: s.minutes,
    avg: s.avg,
    max: s.max,
    title: s.title,
  })),
  stats: {
    streams: streams.length,
    minutes,
    hours: Math.round(minutes / 60),
    firstStream: (streams[0]?.date ?? "").slice(0, 10),
    lastStream: (streams.at(-1)?.date ?? "").slice(0, 10),
    avgViewers,
    peakViewers: streams.reduce((max, s) => Math.max(max, s.max), 0),
    followersGained: streams.reduce((sum, s) => sum + s.follows, 0),
  },
  clips,
};

writeFileSync("data.js", `/* Automatisch erzeugt von .freebuff/fetch-twitch.mjs am ${data.updated}.
   Echte Werte des Twitch-Kanals ${LOGIN}. Aktualisieren: node .freebuff/fetch-twitch.mjs */
window.LJ = ${JSON.stringify(data, null, 2)};
`);

console.log(`Streams: ${data.stats.streams} · ${data.stats.hours} h · erster ${data.stats.firstStream} · letzter ${data.stats.lastStream}`);
console.log(`Ø ${data.stats.avgViewers} / max ${data.stats.peakViewers} Zuschauer · Clips: ${clips.length} · Follower: ${data.channel.followersAtBuild} · live: ${data.channel.liveAtBuild}`);
