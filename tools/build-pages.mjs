/* Erzeugt alle Seiten der Website aus einer gemeinsamen Hülle.
   Aufruf: node .freebuff/build-pages.mjs
   Die Zahlen und Clips kommen aus data.js (siehe .freebuff/fetch-twitch.mjs). */

import { writeFileSync, readFileSync } from "node:fs";

const win = {};
new Function("window", readFileSync("data.js", "utf8"))(win);
const LJ = win.LJ;
const { stats, clips, streams, channel } = LJ;

const V = "v7";
const SITE = "https://livejson.github.io/";
const TWITCH = "https://twitch.tv/" + channel.login;
const de = (d) => (d ? d.split("-").reverse().join(".") : "—");
const pad = (n) => String(n).padStart(2, "0");
const num = (n) => Number(n).toLocaleString("de-DE");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const len = (sec) => `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
const totalClipViews = clips.reduce((sum, c) => sum + c.views, 0);

const SOCIALS = [
  { key: "twitch", no: "01", icon: "TV", name: "Twitch", hint: "Livestreams, Clips & Chat", url: TWITCH + "/chat", handle: "twitch.tv/livejson", live: true },
  { key: "youtube", no: "02", icon: "YT", name: "YouTube", hint: "Videos & Highlights", url: "https://youtube.com/@livejson", handle: "youtube.com/@livejson" },
  { key: "tiktok", no: "03", icon: "TT", name: "TikTok", hint: "Kurze Clips & Memes", url: "https://tiktok.com/@livejson", handle: "tiktok.com/@livejson" },
  { key: "instagram", no: "04", icon: "IG", name: "Instagram", hint: "Behind the Scenes", url: "https://instagram.com/livejson", handle: "instagram.com/livejson" },
  { key: "x", no: "05", icon: "X", name: "X / Twitter", hint: "News & Updates", url: "https://x.com/livejson", handle: "x.com/livejson" },
  { key: "discord", no: "06", icon: "DC", name: "Discord", hint: "Die Community", url: "https://discord.gg/livejson", handle: "discord.gg/livejson" },
];

const PAGES = [
  { file: "index.html", nav: "Start", no: "00", title: "livejson · Streamer, Clips & Community", hint: "Alles auf einen Blick" },
  { file: "about.html", nav: "Über mich", no: "01", title: "Über mich", hint: "Wer ist Jason?" },
  { file: "clips.html", nav: "Clips", no: "02", title: "Clips", hint: `${clips.length} echte Highlights` },
  { file: "socials.html", nav: "Socials", no: "03", title: "Socials", hint: "Alle Kanäle an einem Ort" },
  { file: "streamplan.html", nav: "Streamplan", no: "04", title: "Streamplan", hint: "Wann ich live bin" },
  { file: "community.html", nav: "Community", no: "05", title: "Community", hint: "Discord & die Zahlen" },
];

/* ---------- Bausteine --------------------------------------------------- */

function clipCard(clip, index) {
  return `        <article class="clipcard reveal" data-delay="${(index % 3) * 60}">
          <button class="clipcard__btn" type="button" data-clip="${esc(clip.slug)}"
                  data-title="${esc(clip.title)}" data-game="${esc(clip.game)}"
                  data-date="${clip.date}" data-len="${len(clip.seconds)}" data-views="${clip.views}"
                  data-seconds="${clip.seconds}"
                  aria-label="Clip abspielen: ${esc(clip.title)}">
            <span class="clipcard__media">
              <img src="${esc(clip.thumb)}" alt="Vorschaubild zum Twitch-Clip „${esc(clip.title)}“"
                   width="1920" height="1080" loading="lazy" decoding="async" />
              <span class="clipcard__play" aria-hidden="true"></span>
              <span class="clipcard__len">${len(clip.seconds)}</span>
            </span>
            <span class="clipcard__body">
              <span class="clipcard__title">${esc(clip.title)}</span>
              <span class="clipcard__meta">${esc(clip.game)} · ${de(clip.date)} · ${clip.views} Aufrufe</span>
            </span>
          </button>
        </article>`;
}

const statCards = () => `        <div class="stat stat--live reveal" data-delay="0">
          <span class="stat__num" data-followers>${num(channel.followersAtBuild)}</span>
          <span class="stat__label">Twitch-Follower</span>
        </div>
        <div class="stat reveal" data-delay="70">
          <span class="stat__num" data-count="${stats.streams}">${num(stats.streams)}</span>
          <span class="stat__label">Livestreams</span>
        </div>
        <div class="stat reveal" data-delay="140">
          <span class="stat__num" data-count="${stats.hours}">${num(stats.hours)}<small>h</small></span>
          <span class="stat__label">gestreamt</span>
        </div>
        <div class="stat reveal" data-delay="210">
          <span class="stat__num" data-count="${stats.avgViewers}">${num(stats.avgViewers)}</span>
          <span class="stat__label">Ø Zuschauer</span>
        </div>`;

const logRows = () => streams
  .slice()
  .reverse()
  .slice(0, 12)
  .map((s) => {
    const h = Math.floor(s.minutes / 60);
    const m = s.minutes % 60;
    return `        <li class="logrow">
          <span class="logrow__date">${de(s.date.slice(0, 10))}</span>
          <span class="logrow__len">${h}h ${pad(m)}m</span>
          <span class="logrow__views">Ø ${s.avg} · Spitze ${s.max}</span>
          <span class="logrow__title">${esc(s.title || "Stream")}</span>
        </li>`;
  })
  .join("\n");

const socialCard = (s) => `        <a class="social tilt-soft reveal" href="${s.url}" target="_blank" rel="noopener" data-delay="0">
          <span class="social__index" aria-hidden="true">${s.no}</span>
          <span class="social__icon">${s.icon}</span>
          <span class="social__name">${s.name}</span>
          <span class="social__hint">${s.hint}</span>
          <span class="social__handle">${s.handle}</span>
          <span class="social__arrow">↗</span>
        </a>`;

const pageLink = (p) => `        <a class="pagelink reveal" href="${p.file}">
          <span class="pagelink__no">${p.no}</span>
          <span class="pagelink__title">${p.title}</span>
          <span class="pagelink__hint">${p.hint}</span>
          <span class="pagelink__arrow">Seite öffnen →</span>
        </a>`;

const weekGrid = () => {
  const plan = [
    { day: 1, name: "Mo", time: "20:00", label: "Gaming" },
    { day: 2, name: "Di", time: "—", label: "Frei" },
    { day: 3, name: "Mi", time: "20:00", label: "Just Chatting" },
    { day: 4, name: "Do", time: "20:00", label: "Gaming" },
    { day: 5, name: "Fr", time: "21:00", label: "Community-Night" },
    { day: 6, name: "Sa", time: "18:00", label: "Marathon" },
    { day: 0, name: "So", time: "—", label: "Pause" },
  ];
  return plan
    .map((d) => `        <div class="day reveal" data-day="${d.day}" data-delay="0"><span class="day__name">${d.name}</span><span class="day__time">${d.time}</span><span class="day__game">${d.label}</span></div>`)
    .join("\n");
};

/* ---------- Hülle ------------------------------------------------------- */

function shell({ file, body, title, desc }) {
  const current = file;
  const links = PAGES.filter((p) => p.file !== "index.html");

  const navLinks = links
    .map((p) => `      <a href="${p.file}" data-nav${p.file === current ? ' class="is-active" aria-current="page"' : ""}>${p.nav}</a>`)
    .join("\n");

  const railLinks = PAGES
    .map((p) => `    <a href="${p.file}" data-rail${p.file === current ? ' class="is-active" aria-current="page"' : ""}><i>${esc(p.nav)}</i><span>${p.no}</span></a>`)
    .join("\n");

  const menuLinks = PAGES
    .map((p) => `      <a href="${p.file}"${p.file === current ? ' class="is-active" aria-current="page"' : ""}><span>${p.no}</span> ${esc(p.nav)}${p.file === current ? " ·" : ""}</a>`)
    .join("\n");

  return `<!doctype html>
<html lang="de" class="no-js">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <meta name="theme-color" content="#05030a" />
  <meta name="color-scheme" content="dark" />

  <link rel="canonical" href="${SITE}${file === "index.html" ? "" : file}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="livejson" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:url" content="${SITE}${file === "index.html" ? "" : file}" />
  <meta property="og:image" content="${SITE}assets/og.jpg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="de_DE" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  <meta name="twitter:image" content="${SITE}assets/og.jpg" />

  <link rel="icon" href="assets/favicon-32.png" sizes="32x32" type="image/png" />
  <link rel="icon" href="assets/favicon-64.png" sizes="64x64" type="image/png" />
  <link rel="apple-touch-icon" href="assets/favicon-180.png" />
  <link rel="shortcut icon" href="favicon.ico" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />

  <!-- ?v= steigt bei jeder Änderung mit, damit der Browser nichts Altes aus dem Cache zeigt -->
  <link rel="stylesheet" href="styles.css?v=${V}" />
  <link rel="stylesheet" href="pages.css?v=${V}" />

  <!-- Sicherheitsnetz: Inhalte werden auch sichtbar, wenn main.js gar nicht lädt -->
  <script>
    document.documentElement.className = "js";
    setTimeout(function () {
      var loader = document.getElementById("loader");
      if (loader) loader.classList.add("is-done");
    }, 4000);
    setTimeout(function () {
      document.documentElement.classList.add("reveal-fallback");
    }, 3500);
  </script>
</head>
<body>
  <a class="skip-link" href="#main">Zum Inhalt springen</a>

  <div class="loader" id="loader" role="status" aria-live="polite">
    <div class="loader__inner">
      <div class="loader__mark">LJ</div>
      <div class="loader__bar"><span></span></div>
      <p class="loader__text">lade livejson…</p>
    </div>
  </div>

  <div class="aurora" aria-hidden="true"><span></span><span></span><span></span></div>
  <div class="bg-grid" aria-hidden="true"></div>
  <canvas id="particles" class="particles" aria-hidden="true"></canvas>
  <div class="vignette" aria-hidden="true"></div>
  <div class="cursor" id="cursor" aria-hidden="true">
    <span class="cursor__dot"></span>
    <span class="cursor__ring"></span>
  </div>
  <div class="scroll-progress" id="scrollProgress" aria-hidden="true"></div>

  <header class="nav" id="nav">
    <a href="index.html" class="nav__logo" aria-label="Startseite">
      <span class="nav__logo-mark">LJ</span>
      <span class="nav__logo-text">live<b>json</b></span>
    </a>

    <nav class="nav__links" aria-label="Hauptnavigation">
${navLinks}
      <span class="nav__indicator" aria-hidden="true"></span>
    </nav>

    <div class="nav__actions">
      <button class="kbd-btn" id="paletteOpen" type="button" aria-label="Befehlspalette öffnen">
        <span class="kbd-btn__icon" aria-hidden="true">⌘</span><span class="kbd-btn__label">Springen</span><kbd>K</kbd>
      </button>
      <a class="livepill is-offline" data-live-pill href="${TWITCH}" target="_blank" rel="noopener">
        <span class="livepill__dot" aria-hidden="true"></span>
        <span data-live-pill-text>Offline</span>
      </a>
      <a class="btn btn--small btn--primary" href="${TWITCH}" target="_blank" rel="noopener" data-twitch-link data-magnetic>
        <span class="btn__dot"></span> Live schauen
      </a>
      <button class="burger" id="navToggle" type="button" aria-expanded="false" aria-controls="navPanel" aria-label="Menü öffnen">
        <span></span><span></span>
      </button>
    </div>
  </header>

  <div class="menu" id="navPanel" hidden>
    <nav class="menu__inner" aria-label="Mobile Navigation">
${menuLinks}
    </nav>
    <p class="menu__foot">© <span data-year></span> · livejson</p>
  </div>

  <nav class="rail" id="rail" aria-label="Seitennavigation">
${railLinks}
  </nav>

  <main id="main">
${body}
  </main>

  <footer class="footer">
    <div class="footer__big" aria-hidden="true">livejson</div>
    <p>© <span data-year></span> Jason · aka livejson · Made with ♥ für die Community</p>
    <p class="footer__hint">Zahlen und Clips kommen direkt von Twitch · Stand <span data-snapshot>${de(LJ.updated)}</span></p>
    <a href="#top" class="footer__top">Nach oben ↑</a>
  </footer>

  <!-- Clip-Player -->
  <div class="player" id="player" hidden>
    <div class="player__scrim" data-player-close></div>
    <div class="player__box" role="dialog" aria-modal="true" aria-label="Twitch-Clip">
      <button class="player__close" type="button" data-player-close aria-label="Player schließen">×</button>
      <div class="player__frame" id="playerFrame"></div>
      <div class="player__foot">
        <h3 id="playerTitle">Clip</h3>
        <a class="btn btn--ghost btn--small" id="playerExternal" href="${TWITCH}" target="_blank" rel="noopener">Auf Twitch öffnen ↗</a>
        <p id="playerMeta"></p>
      </div>
    </div>
  </div>

  <!-- Befehlspalette -->
  <div class="palette" id="palette" hidden>
    <div class="palette__scrim" data-palette-close></div>
    <div class="palette__box" role="dialog" aria-modal="true" aria-labelledby="paletteTitle">
      <div class="palette__head">
        <span id="paletteTitle">Springen &amp; suchen</span>
        <kbd>ESC</kbd>
      </div>
      <input
        class="palette__input"
        id="paletteInput"
        type="text"
        role="combobox"
        aria-expanded="true"
        aria-controls="paletteList"
        aria-autocomplete="list"
        placeholder="Wohin willst du?"
        autocomplete="off"
        spellcheck="false"
      />
      <ul class="palette__list" id="paletteList" role="listbox" aria-label="Ergebnisse"></ul>
      <p class="palette__hint"><span>↑ ↓</span> wählen <span>↵</span> öffnen</p>
    </div>
  </div>

  <div class="toast" id="toast" role="status" aria-live="polite"></div>

  <script src="data.js?v=${V}" defer></script>
  <script src="main.js?v=${V}" defer></script>
</body>
</html>
`;
}

/* ---------- Seiteninhalte ---------------------------------------------- */

const liveStrip = `      <div class="live-strip reveal">
        <span class="live-strip__item"><span class="livepill__dot" data-live-dot aria-hidden="true"></span> <b data-hud-status>Offline</b></span>
        <span class="live-strip__item">Kategorie <b data-category>Grade offline</b></span>
        <span class="live-strip__item">Follower <b data-followers>${num(channel.followersAtBuild)}</b></span>
        <span class="live-strip__item">Zuletzt live <b>${de(stats.lastStream)}</b></span>
      </div>`;

const pages = {};

/* ---------- Startseite --------------------------------------------------- */

pages["index.html"] = `
    <section class="hero" id="top">
      <div class="hero__glow hero__glow--a" aria-hidden="true"></div>
      <div class="hero__glow hero__glow--b" aria-hidden="true"></div>
      <div class="hero__grid" aria-hidden="true"></div>
      <div class="hero__halo" aria-hidden="true"></div>
      <div class="hero__spot" id="heroSpot" aria-hidden="true"></div>

      <div class="hero__stage" id="heroStage">
        <div class="hero__content">
          <div class="badge reveal" data-delay="0">
            <span class="badge__dot" id="liveDot" data-live-dot></span>
            <span data-live-text>Gerade offline – bis bald!</span>
          </div>

          <h1 class="hero__title">
            <span class="hero__title-line" data-split>livejson</span>
          </h1>

          <p class="hero__tagline reveal" data-delay="220">
            Streamer <b>·</b> Creator <b>·</b> <span class="serif">Chaos mit Ansage</span>
          </p>

          <p class="hero__sub reveal" data-delay="280">
            Hi, ich bin <strong>Jason</strong> – überall bekannt als <strong class="accent">livejson</strong>.
          </p>
          <p class="hero__typed reveal" data-delay="340">
            <span class="hero__typed-prefix">Heute mit mir:</span>
            <span class="hero__typed-text hero__typed-text--static" data-category>Grade offline</span>
          </p>

          <div class="hero__actions reveal" data-delay="420">
            <a class="btn btn--primary" href="${TWITCH}" target="_blank" rel="noopener" data-twitch-link data-magnetic>
              <span data-hero-cta-label>Zum Twitch-Kanal</span>
              <span class="btn__arrow">→</span>
            </a>
            <a class="btn btn--ghost" href="community.html" data-magnetic>
              <span>Community beitreten</span>
            </a>
          </div>

          <div class="hud reveal" data-delay="520">
            <div class="hud__cell hud__cell--count">
              <span class="hud__label" data-countdown-label>Nächster Stream</span>
              <span class="hud__value" id="countdown">--:--:--</span>
              <span class="hud__meta" id="countdownMeta">Streamplan öffnen</span>
            </div>
            <div class="hud__cell">
              <span class="hud__label">Status</span>
              <span class="hud__value hud__value--sm" data-hud-status>Offline</span>
              <span class="hud__meta" data-hud-status-meta>letzter Stream ${de(stats.lastStream)}</span>
            </div>
            <div class="hud__cell">
              <span class="hud__label">Twitch-Follower</span>
              <span class="hud__value hud__value--sm" data-followers>${num(channel.followersAtBuild)}</span>
              <span class="hud__meta">live von Twitch</span>
            </div>
          </div>
        </div>
      </div>

      <a href="#marquee" class="scroll-hint" aria-label="Weiter scrollen">
        <span class="scroll-hint__mouse"><span></span></span>
        <span class="scroll-hint__label">scroll</span>
      </a>
    </section>

    <div class="marquee-stack" id="marquee">
      <div class="marquee">
        <div class="marquee__track">
          <span>LIVE</span><i>✦</i><span>GTA RP</span><i>✦</i><span>COMMUNITY</span><i>✦</i><span>MARATHONS</span><i>✦</i><span>LIVEJSON</span><i>✦</i>
          <span>LIVE</span><i>✦</i><span>GTA RP</span><i>✦</i><span>COMMUNITY</span><i>✦</i><span>MARATHONS</span><i>✦</i><span>LIVEJSON</span><i>✦</i>
        </div>
      </div>
      <div class="marquee marquee--reverse" aria-hidden="true">
        <div class="marquee__track">
          <span>${num(stats.streams)} STREAMS</span><i>·</i><span>${num(stats.hours)} STUNDEN</span><i>·</i><span>${num(channel.followersAtBuild)} FOLLOWER</span><i>·</i><span>SEIT ${de(stats.firstStream)}</span><i>·</i>
          <span>${num(stats.streams)} STREAMS</span><i>·</i><span>${num(stats.hours)} STUNDEN</span><i>·</i><span>${num(channel.followersAtBuild)} FOLLOWER</span><i>·</i><span>SEIT ${de(stats.firstStream)}</span><i>·</i>
        </div>
      </div>
    </div>

    <section class="section" id="about">
      <div class="section__head reveal">
        <span class="eyebrow"><i>01</i> Über mich</span>
        <h2>Wer steckt hinter <span class="serif accent">livejson</span>?</h2>
      </div>

      <div class="about">
        <article class="card tilt reveal" data-delay="80">
          <div class="avatar">
            <span class="avatar__ring" aria-hidden="true"></span>
            <span class="avatar__core">
              <img class="avatar__img" src="assets/jason.jpg" alt="Jason – alias livejson" width="512" height="512" loading="lazy" decoding="async" />
            </span>
            <span class="avatar__badge" aria-hidden="true">LIVE</span>
          </div>
          <h3>Jason</h3>
          <p class="muted">aka livejson · Streamer · Creator</p>
          <div class="chips">
            <span class="chip">GTA RP</span>
            <span class="chip">Just Chatting</span>
            <span class="chip">Community</span>
          </div>
        </article>

        <div class="about__text reveal" data-delay="180">
          <p>
            Ich streame, weil ich Bock habe, mit Leuten zu zocken und zu quatschen.
            Aus einem kleinen Kanal ist eine echte Community geworden – mit Inside-Jokes,
            Marathon-Nächten und einem Discord, in dem es nie still wird.
          </p>
          <p>
            Diese Seite zeigt dir alles, was zählt: wann ich live gehe, meine besten Clips,
            wohin du mir folgen kannst und was wir zusammen schon aufgebaut haben.
          </p>
          <ul class="about__facts">
            <li><span>Erster Stream</span> ${de(stats.firstStream)}</li>
            <li><span>Auf Twitch seit</span> ${de(channel.createdAt)}</li>
            <li><span>Zuletzt live</span> ${de(stats.lastStream)}</li>
          </ul>
        </div>
      </div>

      <div class="stats">
${statCards()}
      </div>
    </section>

    <section class="section section--wide" id="highlights">
      <div class="section__head section__head--row reveal">
        <div>
          <span class="eyebrow"><i>02</i> Clips</span>
          <h2>Die besten <span class="serif accent">Momente</span></h2>
        </div>
        <div class="rail-nav">
          <button class="rail-nav__btn" type="button" data-reel-prev aria-label="Vorherige Clips">←</button>
          <button class="rail-nav__btn" type="button" data-reel-next aria-label="Nächste Clips">→</button>
        </div>
      </div>

      <div class="reel clips-strip" id="reel" tabindex="0" role="region" aria-label="Clip-Reel, horizontal scrollbar">
${clips.slice(0, 6).map(clipCard).join("\n")}
      </div>
      <p class="reel__hint">Ziehen, scrollen oder Pfeiltasten · klick einen Clip zum Abspielen</p>
      <p class="reel__hint"><a class="footer__top" href="clips.html">Alle ${clips.length} Clips ansehen →</a></p>
    </section>

    <section class="section" id="pages">
      <div class="section__head reveal">
        <span class="eyebrow"><i>03</i> Alles auf einen Blick</span>
        <h2>Jede Sache hat <span class="serif accent">ihre Seite</span></h2>
      </div>
      <div class="pagelinks">
${PAGES.filter((p) => p.file !== "index.html").map(pageLink).join("\n")}
      </div>
      <div class="note reveal"><span>Alle Zahlen auf dieser Seite kommen direkt von Twitch und werden im Browser aktuell gehalten – Follower, Kategorie und Live-Status ohne Neuladen. Stand <b data-snapshot>${de(LJ.updated)}</b>.</span></div>
    </section>`;

/* ---------- Über mich ---------------------------------------------------- */

pages["about.html"] = `
    <section class="page-hero">
      <div class="hero__glow hero__glow--a" aria-hidden="true"></div>
      <nav class="page-hero__crumbs" aria-label="Brotkrumen">
        <a href="index.html">Start</a> <span>/</span> Über mich
      </nav>
      <span class="eyebrow"><i>01</i> Über mich</span>
      <h1>Wer steckt hinter <span class="serif accent">livejson</span>?</h1>
      <p class="page-hero__lead">
        Jason, Baujahr GTA-RP, Motorrad- und Auto-Nerd, leidenschaftlicher Gamer.
        Seit ${de(channel.createdAt)} auf Twitch, seit ${de(stats.firstStream)} regelmäßig live –
        und seitdem mit einer Community unterwegs, die zusammenhält.
      </p>
      <div class="page-hero__stats">
        <span class="pill pill--live">Follower <b data-followers>${num(channel.followersAtBuild)}</b></span>
        <span class="pill">Streams <b>${num(stats.streams)}</b></span>
        <span class="pill">Stunden <b>${num(stats.hours)}</b></span>
        <span class="pill">Ø Zuschauer <b>${num(stats.avgViewers)}</b></span>
      </div>
    </section>

    <section class="section">
${liveStrip}
      <div class="facts">
        <div class="fact reveal"><span>Erster Stream</span><b>${de(stats.firstStream)}</b></div>
        <div class="fact reveal"><span>Zuletzt live</span><b>${de(stats.lastStream)}</b></div>
        <div class="fact reveal"><span>Auf Twitch seit</span><b>${de(channel.createdAt)}</b></div>
        <div class="fact reveal"><span>Beste Zuschauerzahl</span><b>${num(stats.peakViewers)}</b></div>
        <div class="fact reveal"><span>Streams insgesamt</span><b>${num(stats.streams)}</b></div>
        <div class="fact reveal"><span>Gestreamte Zeit</span><b>${num(stats.hours)} Stunden</b></div>
      </div>
    </section>

    <section class="section">
      <div class="section__head reveal">
        <span class="eyebrow"><i>02</i> Meine Story</span>
        <h2>Der Weg bis <span class="serif accent">hierher</span></h2>
      </div>

      <ol class="timeline" id="timeline">
        <li class="timeline__item reveal" data-delay="0">
          <span class="timeline__year">${de(channel.createdAt).slice(-4)}</span>
          <h3>Der Kanal entsteht</h3>
          <p>Account angelegt, Name gesetzt: livejson. Noch ohne Plan, aber mit Bock auf Games.</p>
        </li>
        <li class="timeline__item reveal" data-delay="100">
          <span class="timeline__year">${de(stats.firstStream).slice(-4)}</span>
          <h3>Der erste Stream</h3>
          <p>Am ${de(stats.firstStream)} ging es los – FivePD und GTA-RP. Wenige Zuschauer, aber die richtigen.</p>
        </li>
        <li class="timeline__item reveal" data-delay="200">
          <span class="timeline__year">Wachstum</span>
          <h3>Community statt Zuschauer</h3>
          <p>Aus Zuschauern wurden Stammgäste, aus Stammgästen Freunde. ${num(stats.followersGained)} Follower sind bei den Streams dazugekommen.</p>
        </li>
        <li class="timeline__item reveal" data-delay="300">
          <span class="timeline__year">${de(stats.lastStream).slice(-4)}</span>
          <h3>Marathon-Sommer</h3>
          <p>Tag für Tag live, über 12 Stunden am Stück, ${num(stats.peakViewers)} Leute gleichzeitig im Kanal.</p>
        </li>
        <li class="timeline__item reveal" data-delay="400">
          <span class="timeline__year">Jetzt</span>
          <h3>Nächster Stream kommt</h3>
          <p>Zwischen den Streams passiert hier alles: Clips, Socials, Community. Schau im Streamplan, wann es weitergeht.</p>
        </li>
      </ol>
    </section>

    <section class="section">
      <div class="section__head reveal">
        <span class="eyebrow"><i>03</i> Setup</span>
        <h2>Womit <span class="serif accent">zocke</span> ich?</h2>
        <p class="muted">Hardware, Tastatur und Maus – schreib mir im Chat, wenn du Details brauchst.</p>
      </div>
      <div class="setup">
        <div class="setup__item reveal"><span>PC</span><b>Gaming-Rig</b></div>
        <div class="setup__item reveal"><span>MIC</span><b>Mikrofon</b></div>
        <div class="setup__item reveal"><span>CAM</span><b>Webcam</b></div>
        <div class="setup__item reveal"><span>KB</span><b>Tastatur &amp; Maus</b></div>
      </div>
      <div class="note reveal"><span>Diese vier Kacheln sind Platzhalter – nenn mir deine echten Teile, dann trage ich sie ein.</span></div>
    </section>

    <section class="section">
      <div class="stats">
${statCards()}
      </div>
    </section>`;

/* ---------- Socials ------------------------------------------------------ */

pages["socials.html"] = `
    <section class="page-hero">
      <div class="hero__glow hero__glow--a" aria-hidden="true"></div>
      <nav class="page-hero__crumbs" aria-label="Brotkrumen">
        <a href="index.html">Start</a> <span>/</span> Socials
      </nav>
      <span class="eyebrow"><i>03</i> Socials</span>
      <h1>Folg mir <span class="serif accent">überall</span></h1>
      <p class="page-hero__lead">
        Überall derselbe Name: <b>livejson</b>. Twitch ist mein Zuhause, alles andere ist der
        Rest meiner Persönlichkeit – Clips, Bilder und Kurzvideos.
      </p>
    </section>

    <section class="section">
${liveStrip}
      <div class="socials">
${SOCIALS.map(socialCard).join("\n")}
      </div>
      <div class="note reveal"><span>Der Discord-Link zeigt auf <b>discord.gg/livejson</b>. Falls dein Invite anders lautet, sag mir den Code – ich tausche ihn in einer Minute.</span></div>
    </section>

    <section class="section">
      <div class="section__head reveal">
        <span class="eyebrow"><i>02</i> Kanäle in Zahlen</span>
        <h2>Was auf Twitch <span class="serif accent">passiert</span></h2>
      </div>
      <div class="facts">
        <div class="fact reveal"><span>Follower (live)</span><b data-followers>${num(channel.followersAtBuild)}</b></div>
        <div class="fact reveal"><span>Streams</span><b>${num(stats.streams)}</b></div>
        <div class="fact reveal"><span>Stunden</span><b>${num(stats.hours)}</b></div>
        <div class="fact reveal"><span>Clips</span><b>${num(clips.length)}</b></div>
        <div class="fact reveal"><span>Ø Zuschauer</span><b>${num(stats.avgViewers)}</b></div>
        <div class="fact reveal"><span>Spitze</span><b>${num(stats.peakViewers)}</b></div>
      </div>
      <p class="reel__hint">Alle Werte direkt von Twitch · Stand <span data-snapshot>${de(LJ.updated)}</span></p>
    </section>`;

/* ---------- Clips -------------------------------------------------------- */

pages["clips.html"] = `
    <section class="page-hero">
      <div class="hero__glow hero__glow--a" aria-hidden="true"></div>
      <nav class="page-hero__crumbs" aria-label="Brotkrumen">
        <a href="index.html">Start</a> <span>/</span> Clips
      </nav>
      <span class="eyebrow"><i>02</i> Clips</span>
      <h1>Alles, was <span class="serif accent">hängen geblieben</span> ist</h1>
      <p class="page-hero__lead">
        ${clips.length} Clips direkt von meinem Twitch-Kanal – Fail, Glück und Chaos aus GTA-RP.
        Klick auf einen Clip, er läuft sofort hier auf der Seite.
      </p>
      <div class="page-hero__stats">
        <span class="pill">Clips <b>${num(clips.length)}</b></span>
        <span class="pill">Aufrufe <b>${num(totalClipViews)}</b></span>
        <span class="pill">Top-Clip <b>${num(clips[0]?.views ?? 0)}</b></span>
      </div>
    </section>

    <section class="section section--wide">
      <div class="filterbar reveal" data-clip-filter aria-label="Clips sortieren">
        <button class="filterbar__btn is-on" type="button" data-sort="views">Beliebteste</button>
        <button class="filterbar__btn" type="button" data-sort="new">Neueste</button>
        <button class="filterbar__btn" type="button" data-sort="short">Kürzeste</button>
      </div>

      <div class="clips-grid" data-clip-grid>
${clips.map(clipCard).join("\n")}
      </div>

      <div class="note reveal"><span>Die Clips werden live von Twitch geladen. Ist der Player blockiert (Werbeblocker, Netzwerk), öffnet dich der Button im Player direkt auf Twitch.</span></div>
    </section>`;

/* ---------- Streamplan --------------------------------------------------- */

pages["streamplan.html"] = `
    <section class="page-hero">
      <div class="hero__glow hero__glow--a" aria-hidden="true"></div>
      <nav class="page-hero__crumbs" aria-label="Brotkrumen">
        <a href="index.html">Start</a> <span>/</span> Streamplan
      </nav>
      <span class="eyebrow"><i>04</i> Streamplan</span>
      <h1>Wann ich <span class="serif accent">live</span> gehe</h1>
      <p class="page-hero__lead">
        Der Countdown zählt auf den nächsten Termin runter. Läuft gerade ein Stream,
        zeigt er stattdessen, wie lange ich schon auf Sendung bin.
      </p>
    </section>

    <section class="section">
      <div class="milestone reveal">
        <div class="milestone__head">
          <div>
            <span class="milestone__label">Nächster Stream in</span>
            <div class="milestone__num" id="countdown">--:--:--</div>
          </div>
          <div class="milestone__goal" id="countdownMeta">Streamplan wird geladen…</div>
        </div>
        <div class="milestone__meta">
          <span>Status <b data-hud-status>Offline</b></span>
          <span>Kategorie <b data-category>Grade offline</b></span>
          <span>Läuft seit <b data-uptime>offline</b></span>
        </div>
      </div>

      <div class="section__head reveal" style="margin-top: 3rem">
        <span class="eyebrow"><i>01</i> Woche</span>
        <h2>Meine <span class="serif accent">Zeiten</span></h2>
      </div>
      <div class="schedule">
${weekGrid()}
      </div>
      <div class="note reveal"><span>Diese Zeiten sind noch Platzhalter. Sag mir deine echten Wochentage und Uhrzeiten, dann trage ich sie ein – Countdown und Kalender rechnen automatisch mit.</span></div>
    </section>

    <section class="section">
      <div class="section__head reveal">
        <span class="eyebrow"><i>02</i> Stream-Log</span>
        <h2>Die letzten <span class="serif accent">Streams</span></h2>
        <p class="muted">Echte Aufzeichnung von Twitch – Datum, Länge und Zuschauerzahlen.</p>
      </div>
      <ol class="loglist reveal" data-stream-log>
${logRows()}
      </ol>
      <p class="reel__hint">Stand <span data-snapshot>${de(LJ.updated)}</span> · Quelle: Twitch-Statistik</p>
    </section>

    <section class="section">
      <div class="stats">
${statCards()}
      </div>
    </section>`;

/* ---------- Community ---------------------------------------------------- */

pages["community.html"] = `
    <section class="page-hero">
      <div class="hero__glow hero__glow--a" aria-hidden="true"></div>
      <nav class="page-hero__crumbs" aria-label="Brotkrumen">
        <a href="index.html">Start</a> <span>/</span> Community
      </nav>
      <span class="eyebrow"><i>05</i> Community</span>
      <h1>Du gehörst <span class="serif accent">dazu</span></h1>
      <p class="page-hero__lead">
        Ohne euch wäre das hier nur ein Typ, der alleine Games zockt. Der Discord ist unser
        Wohnzimmer – dort gibt es Stream-Pings, Events und Leute, die genauso ticken wie du.
      </p>
    </section>

    <section class="section">
      <div class="milestone reveal">
        <div class="milestone__head">
          <div>
            <span class="milestone__label">Twitch-Follower · live</span>
            <div class="milestone__num" data-followers>${num(channel.followersAtBuild)}</div>
          </div>
          <div class="milestone__goal">Ziel: <b data-follower-goal>900</b> Follower</div>
        </div>
        <div class="milestone__bar"><span class="milestone__fill" data-follower-fill></span></div>
        <div class="milestone__meta">
          <span>Fortschritt <b data-follower-percent>—</b></span>
          <span>Es fehlen noch <b data-follower-rest>—</b></span>
          <span>Stand <b data-snapshot>${de(LJ.updated)}</b></span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section__head reveal">
        <span class="eyebrow"><i>02</i> Mitmachen</span>
        <h2>So bist du <span class="serif accent">dabei</span></h2>
      </div>

      <div class="community">
        <div class="card community__card reveal" data-delay="0">
          <h3>Discord</h3>
          <p>Stream-Benachrichtigungen, Fragen, Memes, Events – und die Leute aus dem Chat, direkt neben dir.</p>
          <a class="btn btn--primary" href="https://discord.gg/livejson" target="_blank" rel="noopener" data-magnetic><span>Jetzt beitreten</span><span class="btn__arrow">→</span></a>
        </div>

        <div class="card community__card reveal" data-delay="100">
          <h3>Regeln für alle</h3>
          <ul class="rules">
            <li><span>01</span> Respekt vor jedem – immer.</li>
            <li><span>02</span> Kein Hate, kein Spam, kein Doxxing.</li>
            <li><span>03</span> Gute Stimmung ist Pflicht.</li>
            <li><span>04</span> Spaß haben – das ist der Plan.</li>
          </ul>
        </div>

        <div class="card community__card community__card--wide reveal" data-delay="200">
          <h3>Was wir zusammen gebaut haben</h3>
          <p class="muted">Echte Zahlen aus dem Kanal.</p>
          <div class="facts">
            <div class="fact"><span>Streams</span><b>${num(stats.streams)}</b></div>
            <div class="fact"><span>Stunden live</span><b>${num(stats.hours)}</b></div>
            <div class="fact"><span>Ø Zuschauer</span><b>${num(stats.avgViewers)}</b></div>
            <div class="fact"><span>Spitze</span><b>${num(stats.peakViewers)}</b></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
${liveStrip}
      <div class="pagelinks">
${PAGES.filter((p) => p.file === "clips.html" || p.file === "socials.html" || p.file === "streamplan.html").map(pageLink).join("\n")}
      </div>
    </section>`;

/* ---------- Schreiben ---------------------------------------------------- */

const meta = {
  "index.html": { title: "livejson · Streamer, Clips & Community", desc: `Jason aka livejson – ${stats.streams} Streams, ${stats.hours} Stunden, ${channel.followersAtBuild} Follower. Clips, Streamplan, Socials und Community an einem Ort.` },
  "about.html": { title: "Über mich · livejson", desc: `Wer ist livejson? Jason, Streamer aus Leidenschaft: erster Stream ${de(stats.firstStream)}, ${stats.streams} Streams, ${stats.hours} Stunden Content.` },
  "socials.html": { title: "Socials · livejson", desc: "Alle Kanäle von livejson: Twitch, YouTube, TikTok, Instagram, X und Discord – plus aktuelle Zahlen direkt von Twitch." },
  "clips.html": { title: `Clips · livejson (${clips.length})`, desc: `${clips.length} echte Twitch-Clips von livejson: GTA-RP, Fails und die besten Momente – direkt auf der Seite abspielbar.` },
  "streamplan.html": { title: "Streamplan · livejson", desc: "Wann ist livejson live? Countdown, Wochenplan und das echte Stream-Log der letzten Streams." },
  "community.html": { title: "Community · livejson", desc: "Discord, Regeln und die echten Community-Zahlen von livejson – Follower live von Twitch." },
};

for (const [file, body] of Object.entries(pages)) {
  const info = meta[file];
  writeFileSync(file, shell({ file, body, title: info.title, desc: info.desc }));
  console.log(`✓ ${file}`);
}

console.log(`\n${clips.length} Clips · ${stats.streams} Streams · ${stats.hours} h · ${channel.followersAtBuild} Follower eingebaut`);
