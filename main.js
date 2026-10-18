/* ==========================================================================
   LiveJSON — Interaktionen
   --------------------------------------------------------------------------
   Regeln für diese Datei:
   1. Jedes Modul prüft selbst, ob seine Elemente existieren.
   2. Ein Fehler in einem Modul darf die anderen nicht mitreißen.
   3. Ohne JavaScript bleibt die Seite vollständig lesbar (siehe .no-js im CSS).
   4. Teure Loops (Canvas, Cursor) pausieren im Hintergrund-Tab.
   ========================================================================== */

(() => {
  "use strict";

  const CONFIG = {
    typedWords: ["Gaming-Streams", "Chill-Sessions", "Community-Abende", "Marathon-Nights"],

    // Streamplan – dieselben Zeiten wie auf der Streamplan-Seite.
    // Eine Quelle für Anzeige und Countdown: ändere sie hier, wenn sich deine Zeiten ändern.
    plan: [
      { day: 1, time: "20:00", label: "Gaming" },
      { day: 3, time: "20:00", label: "Just Chatting" },
      { day: 4, time: "20:00", label: "Gaming" },
      { day: 5, time: "21:00", label: "Community-Night" },
      { day: 6, time: "18:00", label: "Marathon" },
    ],
    weekdays: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
    weekdaysShort: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
  };

  /* ---------- Twitch ------------------------------------------------------
     Echte Daten statt Platzhalter. Zwei Quellen:
     · data.js  – Zahlen und Clips, die der Build einmal ausgelesen hat.
     · DecAPI   – Live-Status, Kategorie, Titel und Follower, direkt von Twitch.
     Fällt die API aus, bleibt der zuletzt bekannte Stand stehen.            */

  const LJ = window.LJ || {};
  const CHANNEL = {
    login: (LJ.channel && LJ.channel.login) || "livejson",
    name: (LJ.channel && LJ.channel.name) || "LiveJson",
    createdAt: (LJ.channel && LJ.channel.createdAt) || "2020-01-31",
  };
  const TWITCH = {
    page: `https://twitch.tv/${CHANNEL.login}`,
    api: "https://decapi.me/twitch",
    ttl: 45000,
    interval: 60000,
  };

  const de = (date) => (date ? date.split("-").reverse().join(".") : "—");

  const state = {
    live: Boolean(LJ.channel && LJ.channel.liveAtBuild),
    uptime: "",
    game: "",
    title: "",
    viewers: null,
    followers: Number((LJ.channel && LJ.channel.followersAtBuild) || 0),
    loaded: false,
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const pad = (n) => String(n).padStart(2, "0");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  /** Führt ein Modul aus, ohne dass ein Fehler die restlichen Module stoppt. */
  function run(name, fn) {
    try {
      fn();
    } catch (error) {
      console.warn(`[LiveJSON] Modul "${name}" konnte nicht starten:`, error);
    }
  }

  /* ---------- Toast ------------------------------------------------------ */

  let toastTimer = 0;
  function toast(message) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-on"), 2600);
  }

  /* ---------- 1. Loader ------------------------------------------------- */

  function initLoader() {
    const loader = $("#loader");
    if (!loader) return;

    loader.classList.add("is-loading");
    const hide = () => loader.classList.add("is-done");

    // Nach dem Laden sofort weg – spätestens nach 2,5 s, egal was passiert.
    window.addEventListener("load", () => setTimeout(hide, reduceMotion.matches ? 0 : 450), { once: true });
    setTimeout(hide, 2500);
  }

  /* ---------- 2. Partikel-Hintergrund ----------------------------------- */

  function initParticles() {
    const canvas = $("#particles");
    if (!canvas || reduceMotion.matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const palette = ["168, 85, 247", "217, 70, 239", "196, 181, 253"];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -9999, y: -9999 };
    let width = 0;
    let height = 0;
    let dots = [];
    let frame = 0;
    let last = 0;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = clamp(Math.round((width * height) / 26000), 18, 62);
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.6 + 0.5,
        c: palette[Math.floor(Math.random() * palette.length)],
      }));
    }

    function draw(now) {
      // Auf ~30 fps begrenzen: reicht optisch und schont den Akku.
      if (now - last < 32) {
        frame = requestAnimationFrame(draw);
        return;
      }
      last = now;

      ctx.clearRect(0, 0, width, height);

      for (const d of dots) {
        const dx = d.x - mouse.x;
        const dy = d.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 130 && dist > 0.5) {
          const force = (130 - dist) / 130;
          d.vx += (dx / dist) * force * 0.05;
          d.vy += (dy / dist) * force * 0.05;
        }
        d.vx *= 0.985;
        d.vy *= 0.985;
        d.x += d.vx;
        d.y += d.vy;

        if (d.x < 0) d.x = width;
        if (d.x > width) d.x = 0;
        if (d.y < 0) d.y = height;
        if (d.y > height) d.y = 0;

        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${d.c}, 0.85)`;
        ctx.fill();
      }

      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const a = dots[i];
          const b = dots[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 110) {
            ctx.strokeStyle = `rgba(168, 85, 247, ${(1 - dist / 110) * 0.2})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      frame = requestAnimationFrame(draw);
    }

    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    function start() {
      if (!frame) frame = requestAnimationFrame(draw);
    }

    resize();
    start();

    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    });
    window.addEventListener("pointermove", (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }, { passive: true });
    window.addEventListener("pointerleave", () => {
      mouse.x = -9999;
      mouse.y = -9999;
    });

    // Im Hintergrund-Tab nichts rechnen.
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  }

  /* ---------- 3. Live-Status (echte Twitch-Daten) ------------------------ */

  /** Holt einen Wert von DecAPI – mit kurzem Cache, damit wir Twitch nicht fluten.
      Schlägt das Netz fehl, gewinnt der letzte bekannte Wert statt einer Lücke. */
  async function twitchCall(path) {
    const key = `lj:${path}`;
    let cached = null;

    try {
      cached = JSON.parse(sessionStorage.getItem(key) || "null");
      if (cached && Date.now() - cached.at < TWITCH.ttl) return cached.value;
    } catch { /* Speicher voll oder gesperrt – dann eben direkt fragen */ }

    try {
      const res = await fetch(`${TWITCH.api}/${path}/${CHANNEL.login}?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`DecAPI ${res.status} bei ${path}`);
      const value = (await res.text()).trim();
      try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), value })); } catch { /* egal */ }
      return value;
    } catch (error) {
      if (cached && cached.value) return cached.value;
      throw error;
    }
  }

  function setText(sel, value, root = document) {
    if (value === undefined || value === null || value === "") return;
    $$(sel, root).forEach((el) => { el.textContent = value; });
  }

  /** Schreibt den kompletten Live-Zustand in alle Elemente, die daran hängen. */
  function paintLive() {
    const live = state.live;

    document.documentElement.classList.toggle("is-live", live);

    $$("[data-live-pill]").forEach((el) => {
      el.classList.toggle("is-live", live);
      el.classList.toggle("is-offline", !live);
      const label = el.querySelector("[data-live-pill-text]");
      if (label) label.textContent = live ? "Jetzt live" : "Offline";
      el.setAttribute("title", live ? `Live: ${state.title || state.game || "Stream läuft"}` : `Gerade offline · letzter Stream ${de(LJ.stats && LJ.stats.lastStream)}`);
    });

    $$(".badge").forEach((badge) => badge.classList.toggle("is-live", live));
    $$("#liveDot, [data-live-dot]").forEach((dot) => dot.classList.toggle("is-live", live));

    setText("[data-live-text]", live
      ? (state.title ? `LIVE · ${state.title}` : "LIVE JETZT – komm vorbei!")
      : "Gerade offline – bis bald!");

    setText("[data-countdown-label]", live ? "Läuft seit" : "Nächster Stream");
    setText("[data-hud-status]", live ? "LIVE" : "Offline");
    setText("[data-hud-status-meta]", live
      ? (state.uptime ? `läuft seit ${state.uptime}` : "Jetzt zuschauen")
      : `letzter Stream ${de(LJ.stats && LJ.stats.lastStream)}`);

    // „Heute mit mir:“ → echte Kategorie, und wenn nichts läuft: „Grade offline“
    setText("[data-category]", live && (state.game || state.title) ? (state.game || state.title) : "Grade offline");
    setText("[data-live-title]", live ? (state.title || "Stream läuft") : "Kein Stream gerade");
    setText("[data-uptime]", live ? (state.uptime || "live") : "offline");
    setText("[data-viewers]", state.viewers !== null ? String(state.viewers) : "—");

    $$("[data-twitch-link]").forEach((el) => {
      el.setAttribute("href", TWITCH.page);
      if (live) el.setAttribute("data-live-cta", "true");
      else el.removeAttribute("data-live-cta");
    });

    const cta = $("[data-hero-cta-label]");
    if (cta) cta.textContent = live ? "Jetzt live zuschauen" : "Zum Twitch-Kanal";

    paintFollowers();
  }

  /** Zählt eine Zahl sichtbar von ihrem aktuellen Wert auf den neuen hoch. */
  function animateNumber(el, to) {
    const current = Number(String(el.textContent).replace(/[^\d]/g, "")) || 0;
    if (current === to || reduceMotion.matches) {
      el.textContent = to.toLocaleString("de-DE");
      return;
    }

    const start = performance.now();
    const duration = 900;

    function step(now) {
      const p = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(current + (to - current) * eased).toLocaleString("de-DE");
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function paintFollowers() {
    const followers = Number(state.followers) || 0;

    $$("[data-followers]").forEach((el) => {
      if (el.dataset.value === String(followers)) return;
      const first = el.dataset.value === undefined;
      el.dataset.value = String(followers);
      if (first) {
        el.textContent = followers.toLocaleString("de-DE");
        return;
      }
      animateNumber(el, followers);
    });

    const step = followers < 1000 ? 50 : 100;
    const goal = Math.max(step, Math.ceil((followers + 1) / step) * step);
    const from = goal - step;
    const percent = clamp(((followers - from) / step) * 100, 1, 100);

    $$("[data-follower-fill]").forEach((el) => { el.style.width = `${percent}%`; });
    setText("[data-follower-goal]", goal.toLocaleString("de-DE"));
    setText("[data-follower-rest]", String(goal - followers));
    setText("[data-follower-percent]", `${Math.round(percent)} %`);
  }

  function initLiveStatus() {
    // Erst der Stand aus dem Build – die Seite steht also nie leer da.
    paintLive();

    let timer = 0;
    let warned = false;

    /** Fragt einen Wert an – mit einer zweiten Chance und etwas Abstand. */
    const read = async (path, fallback = "") => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          return await twitchCall(path);
        } catch {
          if (attempt === 0) await new Promise((done) => setTimeout(done, 500));
        }
      }
      return fallback;
    };

    const sync = async () => {
      // Nacheinander statt fünf parallel: DecAPI mag keine Bursts.
      const uptime = await read("uptime");
      if (!uptime) {
        if (!warned) {
          warned = true;
          console.warn("[LiveJSON] Live-Status gerade nicht abrufbar – der letzte Stand bleibt stehen.");
        }
        return;
      }

      state.live = !/\boffline\b/i.test(uptime);
      state.uptime = state.live
        ? uptime.replace(/^.*?live for\s*/i, "").replace(/\s*$/g, "")
        : "";

      if (state.live) {
        state.game = await read("game");
        state.title = await read("title");
        const viewers = await read("viewercount");
        const nv = Number(String(viewers).replace(/\D/g, ""));
        state.viewers = Number.isFinite(nv) && nv > 0 ? nv : null;
      } else {
        state.game = "";
        state.title = "";
        state.viewers = null;
      }

      const followers = await read("followcount");
      if (/^\d+$/.test(followers)) state.followers = Number(followers);

      state.loaded = true;
      paintLive();
    };

    const start = () => { clearInterval(timer); timer = setInterval(sync, TWITCH.interval); };

    sync();
    start();

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        clearInterval(timer);
        timer = 0;
      } else {
        sync();
        start();
      }
    });
  }

  /* ---------- 3b. Zahlen aus dem Build-Snapshot -------------------------- */

  function initStats() {
    const stats = LJ.stats || {};
    setText("[data-stat-streams]", stats.streams ? stats.streams.toLocaleString("de-DE") : "—");
    setText("[data-stat-hours]", stats.hours ? stats.hours.toLocaleString("de-DE") : "—");
    setText("[data-stat-avg]", stats.avgViewers ? String(stats.avgViewers) : "—");
    setText("[data-stat-peak]", stats.peakViewers ? String(stats.peakViewers) : "—");
    setText("[data-stat-first]", de(stats.firstStream));
    setText("[data-stat-last]", de(stats.lastStream));
    setText("[data-stat-since]", de(CHANNEL.createdAt));
    setText("[data-snapshot]", de(LJ.updated));

    const years = stats.firstStream ? new Date().getFullYear() - Number(stats.firstStream.slice(0, 4)) : 0;
    setText("[data-stat-years]", years > 0 ? String(years) : "1");
  }

  /* ---------- 3c. Stream-Log (letzte echten Streams) --------------------- */

  function initStreamLog() {
    const host = $("[data-stream-log]");
    if (!host || !Array.isArray(LJ.streams) || !LJ.streams.length) return;

    const rows = LJ.streams.slice().reverse().slice(0, 12);
    const frag = document.createDocumentFragment();

    rows.forEach((s) => {
      const hours = Math.floor(s.minutes / 60);
      const minutes = s.minutes % 60;
      const li = document.createElement("li");
      li.className = "logrow";
      li.innerHTML = `
        <span class="logrow__date">${de(s.date.slice(0, 10))}</span>
        <span class="logrow__len">${hours}h ${pad(minutes)}m</span>
        <span class="logrow__views">Ø ${s.avg} · max ${s.max}</span>
        <span class="logrow__title"></span>`;
      li.querySelector(".logrow__title").textContent = s.title || "Stream";
      frag.appendChild(li);
    });

    host.textContent = "";
    host.appendChild(frag);
  }

  /* ---------- 4. Typewriter --------------------------------------------- */

  function initTyped() {
    const el = $("#typed");
    if (!el || !CONFIG.typedWords.length) return;

    if (reduceMotion.matches) {
      el.textContent = CONFIG.typedWords[0];
      return;
    }

    let wordIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timer = 0;

    function tick() {
      const word = CONFIG.typedWords[wordIndex];
      if (!deleting) {
        charIndex += 1;
        el.textContent = word.slice(0, charIndex);
        if (charIndex >= word.length) {
          deleting = true;
          timer = setTimeout(tick, 1900);
          return;
        }
        timer = setTimeout(tick, 95);
        return;
      }
      charIndex -= 1;
      el.textContent = word.slice(0, charIndex);
      if (charIndex <= 0) {
        deleting = false;
        wordIndex = (wordIndex + 1) % CONFIG.typedWords.length;
        timer = setTimeout(tick, 350);
        return;
      }
      timer = setTimeout(tick, 45);
    }

    timer = setTimeout(tick, 1500);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clearTimeout(timer);
    });
  }

  /* ---------- 5. Reveal beim Scrollen ----------------------------------- */

  function initReveal() {
    const items = $$(".reveal");
    if (!items.length) return;

    const reveal = (el) => {
      const delay = Number(el.dataset.delay || 0);
      el.style.transitionDelay = `${delay}ms`;
      el.classList.add("is-visible");
      setTimeout(() => { el.style.transitionDelay = ""; }, delay + 900);
      el.querySelectorAll("[data-count]").forEach(countUp);
      el.querySelectorAll("[data-width]").forEach((bar) => {
        bar.style.width = `${bar.dataset.width}%`;
      });
      if (el.matches("[data-width]")) el.style.width = `${el.dataset.width}%`;
    };

    const showAll = () => {
      items.forEach((el) => el.classList.add("is-visible"));
      $$("[data-count]").forEach(countUp);
      $$("[data-width]").forEach((bar) => { bar.style.width = `${bar.dataset.width}%`; });
    };

    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      showAll();
      return;
    }

    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        reveal(entry.target);
        io.unobserve(entry.target);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

    items.forEach((el) => io.observe(el));

    // Balken, die nicht in einem .reveal stecken
    const barIO = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.querySelectorAll("[data-width]").forEach((bar) => {
          bar.style.width = `${bar.dataset.width}%`;
        });
        barIO.unobserve(entry.target);
      }
    }, { threshold: 0.25 });
    $$(".community").forEach((el) => barIO.observe(el));

    // Sicherheitsnetz: alles, was nach 4 s noch unsichtbar ist, einblenden.
    setTimeout(() => {
      items.forEach((el) => {
        if (el.classList.contains("is-visible")) return;
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight) reveal(el);
      });
    }, 4000);
  }

  /* ---------- 6. Zähler ------------------------------------------------- */

  const counted = new WeakSet();

  function countUp(el) {
    if (counted.has(el)) return;
    counted.add(el);

    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) {
      el.textContent = el.dataset.count;
      return;
    }
    if (reduceMotion.matches) {
      el.textContent = target.toLocaleString("de-DE");
      return;
    }

    const duration = 1800;
    const start = performance.now();
    const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    function step(now) {
      const p = clamp((now - start) / duration, 0, 1);
      el.textContent = Math.round(target * easeOutExpo(p)).toLocaleString("de-DE");
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- 7. 3D-Tilt ------------------------------------------------ */

  function initTilt() {
    if (reduceMotion.matches || !finePointer.matches) return;

    $$(".tilt, .tilt-soft").forEach((card) => {
      const max = card.classList.contains("tilt") ? 7 : 3;
      let raf = 0;

      card.addEventListener("pointermove", (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width;
          const py = (e.clientY - rect.top) / rect.height;
          card.style.transform =
            `perspective(900px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg)`;
          card.style.setProperty("--mx", `${px * 100}%`);
          card.style.setProperty("--my", `${py * 100}%`);
          raf = 0;
        });
      }, { passive: true });

      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });
  }

  /* ---------- 8. Magnetische Buttons ------------------------------------ */

  function initMagnetic() {
    if (reduceMotion.matches || !finePointer.matches) return;

    $$("[data-magnetic]").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - (rect.left + rect.width / 2);
        const y = e.clientY - (rect.top + rect.height / 2);
        btn.style.transform = `translate(${x * 0.18}px, ${y * 0.28}px)`;
      }, { passive: true });

      btn.addEventListener("pointerleave", () => {
        btn.style.transform = "";
      });
    });
  }

  /* ---------- 9. Cursor ------------------------------------------------- */

  function initCursor() {
    const cursor = $("#cursor");
    if (!cursor || !finePointer.matches || reduceMotion.matches) return;

    const dot = $(".cursor__dot", cursor);
    const ring = $(".cursor__ring", cursor);
    if (!dot || !ring) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let started = false;
    let frame = 0;

    function loop() {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      frame = requestAnimationFrame(loop);
    }

    window.addEventListener("pointermove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      document.body.classList.add("has-cursor");
      if (!started) {
        started = true;
        frame = requestAnimationFrame(loop);
      }
    }, { passive: true });

    // Cursor reagiert auf klickbare Elemente
    document.addEventListener("pointerover", (e) => {
      const hot = e.target.closest("a, button, .card, .social, .day, .clip, .clipcard, [data-clip]");
      document.body.classList.toggle("cursor-hot", Boolean(hot));
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else if (started && !frame) {
        frame = requestAnimationFrame(loop);
      }
    });
  }

  /* ---------- 10. Spotlight + Parallax im Hero --------------------------- */

  function initHeroEffects() {
    const hero = $(".hero");
    const spot = $("#heroSpot");
    const stage = $("#heroStage");
    if (!hero || !finePointer.matches || reduceMotion.matches) return;

    hero.addEventListener("pointermove", (e) => {
      const rect = hero.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;

      if (spot) {
        spot.style.setProperty("--mx", `${px * 100}%`);
        spot.style.setProperty("--my", `${py * 100}%`);
      }
      if (stage) {
        stage.style.setProperty("--px", (px - 0.5).toFixed(3));
        stage.style.setProperty("--py", (py - 0.5).toFixed(3));
      }
    }, { passive: true });

    hero.addEventListener("pointerleave", () => {
      if (stage) {
        stage.style.setProperty("--px", "0");
        stage.style.setProperty("--py", "0");
      }
    });
  }

  /* ---------- 11. Titel in Zeichen zerlegen ----------------------------- */

  function initTitle() {
    const el = $("[data-split]");
    if (!el || reduceMotion.matches) return;

    const text = el.textContent.trim();
    const title = el.closest(".hero__title");
    if (!text) return;

    title?.setAttribute("aria-label", text);
    el.setAttribute("aria-hidden", "true");
    el.textContent = "";

    Array.from(text).forEach((char, i) => {
      const span = document.createElement("span");
      span.className = "ch";
      span.textContent = char;
      span.style.setProperty("--i", i);
      el.appendChild(span);
    });
  }

  /* ---------- 12. Navigation, Rail & Section-Spy ------------------------- */

  function initNav() {
    const nav = $("#nav");
    if (!nav) return;

    const links = $$("[data-nav]");
    const railLinks = $$("[data-rail]");
    const indicator = $(".nav__indicator");

    const sections = [...links, ...railLinks]
      .map((link) => {
        const id = link.getAttribute("href");
        const section = id && id.startsWith("#") ? $(id) : null;
        return section ? { link, section } : null;
      })
      .filter(Boolean);

    function moveIndicator(link) {
      if (!indicator || !link) return;
      indicator.style.left = `${link.offsetLeft}px`;
      indicator.style.width = `${link.offsetWidth}px`;
      indicator.classList.add("is-on");
    }

    function setActive(sectionId) {
      links.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === sectionId));
      railLinks.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === sectionId));
      const active = links.find((l) => l.getAttribute("href") === sectionId);
      if (active) moveIndicator(active);
      else indicator?.classList.remove("is-on");
    }

    if (sections.length && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        setActive(`#${visible.target.id}`);
      }, { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.6] });

      const unique = new Set(sections.map((s) => s.section));
      unique.forEach((section) => io.observe(section));
    }

    const sync = () => {
      const active = links.find((l) => l.classList.contains("is-active"));
      if (active) moveIndicator(active);
      else indicator?.classList.remove("is-on");
    };
    window.addEventListener("resize", sync);
    sync();
  }

  /* ---------- 13. Mobile Menü ------------------------------------------- */

  function initMenu() {
    const toggle = $("#navToggle");
    const panel = $("#navPanel");
    if (!toggle || !panel) return;

    let closeTimer = 0;

    const open = () => {
      clearTimeout(closeTimer);
      panel.hidden = false;
      requestAnimationFrame(() => panel.classList.add("is-open"));
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Menü schließen");
      document.body.classList.add("menu-open");
    };

    const close = () => {
      panel.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Menü öffnen");
      document.body.classList.remove("menu-open");
      closeTimer = setTimeout(() => { panel.hidden = true; }, 350);
    };

    const isOpen = () => toggle.getAttribute("aria-expanded") === "true";

    toggle.addEventListener("click", () => (isOpen() ? close() : open()));
    panel.addEventListener("click", (e) => {
      if (e.target.closest("a")) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen()) {
        close();
        toggle.focus();
      }
    });
    // Beim Wechsel auf Desktop das Menü schließen und Scrollen freigeben
    window.matchMedia("(min-width: 901px)").addEventListener("change", (e) => {
      if (e.matches && isOpen()) close();
    });
  }

  /* ---------- 14. Scroll: Fortschritt, Nav-Zustand, Timeline ------------- */

  function initScroll() {
    const bar = $("#scrollProgress");
    const nav = $("#nav");
    const timeline = $("#timeline");
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
      nav?.classList.toggle("is-scrolled", y > 30);

      if (timeline) {
        const rect = timeline.getBoundingClientRect();
        const start = window.innerHeight * 0.9;
        const total = rect.height + start - window.innerHeight * 0.2;
        const progress = clamp((start - rect.top) / total, 0, 1);
        timeline.style.setProperty("--progress", progress.toFixed(3));
      }

      ticking = false;
    };

    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });

    window.addEventListener("resize", update, { passive: true });
    update();
  }

  /* ---------- 15. Heute im Streamplan ----------------------------------- */

  function initToday() {
    const today = new Date().getDay();
    $$(`.day[data-day="${today}"]`).forEach((el) => el.classList.add("is-today"));
  }

  /* ---------- 16. Jahr --------------------------------------------------- */

  function initYear() {
    const year = String(new Date().getFullYear());
    $$("[data-year], #year").forEach((el) => { el.textContent = year; });
  }

  /* ---------- 17. Countdown zum nächsten Stream -------------------------- */

  function initCountdown() {
    const value = $("#countdown");
    const meta = $("#countdownMeta");
    if (!value) return;

    // Erst im DOM nachsehen (Streamplan-Seite), sonst den zentralen Plan nehmen.
    const fromDom = $$(".day")
      .map((el) => {
        const timeEl = $(".day__time", el);
        const gameEl = $(".day__game", el);
        const raw = timeEl ? timeEl.textContent.trim() : "";
        const match = /^(\d{1,2}):(\d{2})$/.exec(raw);
        if (!match) return null;
        return {
          day: Number(el.dataset.day),
          hours: Number(match[1]),
          minutes: Number(match[2]),
          game: gameEl ? gameEl.textContent.trim() : "",
        };
      })
      .filter(Boolean);

    const plan = fromDom.length
      ? fromDom
      : CONFIG.plan.map((slot) => {
          const [hours, minutes] = slot.time.split(":").map(Number);
          return { day: slot.day, hours, minutes, game: slot.label };
        });

    if (!plan.length) return;

    let target = null;
    let timer = 0;

    function nextDate() {
      const now = new Date();
      let best = null;
      for (let offset = 0; offset <= 7; offset++) {
        const probe = new Date(now.getTime());
        probe.setDate(now.getDate() + offset);
        const slot = plan.find((p) => p.day === probe.getDay());
        if (!slot) continue;
        const candidate = new Date(now.getTime());
        candidate.setDate(now.getDate() + offset);
        candidate.setHours(slot.hours, slot.minutes, 0, 0);
        if (candidate.getTime() <= now.getTime()) continue;
        if (!best || candidate < best.date) best = { date: candidate, slot };
      }
      return best;
    }

    function describe(entry) {
      if (!meta) return;
      const d = entry.date;
      meta.textContent = `${CONFIG.weekdays[d.getDay()]} · ${pad(d.getHours())}:${pad(d.getMinutes())}${entry.slot.game ? ` · ${entry.slot.game}` : ""}`;
    }

    function render() {
      // Läuft gerade ein Stream? Dann ist der Countdown die Sendezeit.
      if (state.live) {
        value.textContent = state.uptime || "LIVE";
        if (meta) meta.textContent = "läuft jetzt · " + (state.game || state.title || "Stream");
        return;
      }

      if (!target) {
        const next = nextDate();
        if (!next) {
          value.textContent = "--:--:--";
          return;
        }
        target = { date: next.date, slot: next.slot };
        describe(target);
      }

      const diff = target.date.getTime() - Date.now();
      if (diff <= 0) {
        target = null;
        render();
        return;
      }

      const total = Math.floor(diff / 1000);
      const days = Math.floor(total / 86400);
      const h = Math.floor((total % 86400) / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      value.textContent = days > 0
        ? `${days}T ${pad(h)}:${pad(m)}:${pad(s)}`
        : `${pad(h)}:${pad(m)}:${pad(s)}`;
    }

    render();
    timer = setInterval(render, 1000);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        clearInterval(timer);
        timer = 0;
      } else if (!timer) {
        render();
        timer = setInterval(render, 1000);
      }
    });
  }

  /* ---------- 18. Highlight-Reel: Drag + Pfeile -------------------------- */

  function initReel() {
    const reel = $("#reel");
    if (!reel) return;

    const section = reel.closest("section");
    const prev = section ? $("[data-reel-prev]", section) : null;
    const next = section ? $("[data-reel-next]", section) : null;
    const clips = $$(".clip, .clipcard", reel);

    const step = () => {
      const first = clips[0];
      if (!first) return reel.clientWidth * 0.8;
      const gap = parseFloat(getComputedStyle(reel).columnGap || "16") || 16;
      return first.getBoundingClientRect().width + gap;
    };

    const updateButtons = () => {
      const max = reel.scrollWidth - reel.clientWidth - 2;
      if (prev) prev.disabled = reel.scrollLeft <= 2;
      if (next) next.disabled = reel.scrollLeft >= max;
    };

    prev?.addEventListener("click", () => reel.scrollBy({ left: -step(), behavior: reduceMotion.matches ? "auto" : "smooth" }));
    next?.addEventListener("click", () => reel.scrollBy({ left: step(), behavior: reduceMotion.matches ? "auto" : "smooth" }));

    reel.addEventListener("scroll", updateButtons, { passive: true });
    window.addEventListener("resize", updateButtons, { passive: true });
    updateButtons();

    // Ziehen mit der Maus (Touch scrollt nativ)
    let down = false;
    let moved = false;
    let startX = 0;
    let startScroll = 0;

    reel.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      down = true;
      moved = false;
      startX = e.clientX;
      startScroll = reel.scrollLeft;
    });

    reel.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 6) {
        moved = true;
        reel.classList.add("is-dragging");
        reel.setPointerCapture?.(e.pointerId);
      }
      if (moved) reel.scrollLeft = startScroll - dx;
    }, { passive: true });

    const end = () => {
      if (!down) return;
      down = false;
      if (moved) {
        reel.classList.remove("is-dragging");
        updateButtons();
      }
      moved = false;
    };

    reel.addEventListener("pointerup", end);
    reel.addEventListener("pointercancel", end);
    reel.addEventListener("pointerleave", end);

    // Pfeiltasten, wenn das Reel den Fokus hat
    reel.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        reel.scrollBy({ left: step(), behavior: "smooth" });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        reel.scrollBy({ left: -step(), behavior: "smooth" });
      }
    });
  }

  /* ---------- 18c. Clips sortieren --------------------------------------- */

  function initClipFilter() {
    const bar = $("[data-clip-filter]");
    const grid = $("[data-clip-grid]");
    if (!bar || !grid) return;

    const cards = $$(".clipcard", grid);
    if (!cards.length) return;

    const buttons = $$(".filterbar__btn", bar);

    const apply = (mode) => {
      const sorted = cards.slice().sort((a, b) => {
        const aBtn = $("[data-clip]", a);
        const bBtn = $("[data-clip]", b);
        if (!aBtn || !bBtn) return 0;
        if (mode === "new") return (bBtn.dataset.date || "").localeCompare(aBtn.dataset.date || "");
        if (mode === "short") return Number(aBtn.dataset.seconds) - Number(bBtn.dataset.seconds);
        return Number(bBtn.dataset.views) - Number(aBtn.dataset.views);
      });

      const frag = document.createDocumentFragment();
      sorted.forEach((card) => frag.appendChild(card));
      grid.appendChild(frag);
    };

    const target = $("[data-clip-count]");

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => {
          b.classList.toggle("is-on", b === btn);
          b.setAttribute("aria-pressed", String(b === btn));
        });
        apply(btn.dataset.sort);
        if (target) target.textContent = String(cards.length);
      });
    });
  }

  /* ---------- 18b. Clip-Player (echte Twitch-Clips) ---------------------- */

  function initClipPlayer() {
    const root = $("#player");
    const frame = $("#playerFrame");
    if (!root || !frame) return;

    const titleEl = $("#playerTitle");
    const metaEl = $("#playerMeta");
    const external = $("#playerExternal");
    let lastFocus = null;

    const close = () => {
      if (root.hidden) return;
      root.hidden = true;
      frame.textContent = ""; // beendet die Wiedergabe wirklich
      document.body.classList.remove("player-open");
      lastFocus?.focus?.();
    };

    const open = (trigger) => {
      const slug = trigger.dataset.clip;
      if (!slug) return;

      lastFocus = trigger;
      const parent = location.hostname || "localhost";
      const url = `https://clips.twitch.tv/embed?clip=${encodeURIComponent(slug)}&parent=${encodeURIComponent(parent)}&autoplay=true`;

      const iframe = document.createElement("iframe");
      iframe.src = url;
      iframe.title = trigger.dataset.title || "Twitch-Clip";
      iframe.setAttribute("allow", "autoplay; fullscreen; encrypted-media");
      iframe.setAttribute("scrolling", "no");
      iframe.setAttribute("frameborder", "0");
      frame.textContent = "";
      frame.appendChild(iframe);

      if (titleEl) titleEl.textContent = trigger.dataset.title || "Twitch-Clip";
      if (metaEl) metaEl.textContent = [trigger.dataset.game, trigger.dataset.len, trigger.dataset.views ? `${trigger.dataset.views} Aufrufe` : ""]
        .filter(Boolean).join(" · ");
      if (external) external.href = `https://clips.twitch.tv/${slug}`;

      root.hidden = false;
      document.body.classList.add("player-open");
      $(".player__close", root)?.focus?.();
    };

    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("[data-clip]");
      if (trigger) {
        e.preventDefault();
        open(trigger);
        return;
      }
      if (e.target.closest("[data-player-close]")) close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  /* ---------- 19. Party-Modus -------------------------------------------- */

  function party() {
    const layer = document.createElement("div");
    layer.className = "confetti";
    layer.setAttribute("aria-hidden", "true");

    const colors = ["#a855f7", "#e879f9", "#c4b5fd", "#7c3aed", "#f0abfc"];
    const count = reduceMotion.matches ? 0 : 70;
    const frag = document.createDocumentFragment();

    for (let i = 0; i < count; i++) {
      const piece = document.createElement("span");
      piece.style.setProperty("--x", `${Math.random() * 100}%`);
      piece.style.setProperty("--s", `${5 + Math.random() * 7}px`);
      piece.style.setProperty("--c", colors[i % colors.length]);
      piece.style.setProperty("--t", `${2 + Math.random() * 1.8}s`);
      piece.style.setProperty("--d", `${Math.random() * 0.5}s`);
      piece.style.setProperty("--dx", `${(Math.random() - 0.5) * 220}px`);
      piece.style.setProperty("--rot", `${(Math.random() - 0.5) * 1200}deg`);
      frag.appendChild(piece);
    }

    layer.appendChild(frag);
    document.body.appendChild(layer);
    document.body.classList.add("party");
    toast("Party-Modus an – viel Spaß! 🎉");

    setTimeout(() => {
      layer.remove();
      document.body.classList.remove("party");
    }, 4200);
  }

  function initEasterEgg() {
    let lastKey = "";
    let lastTime = 0;

    document.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target;
      if (target instanceof HTMLElement) {
        if (target.isContentEditable) return;
        if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      }
      if (e.key.toLowerCase() !== "l" && e.key.toLowerCase() !== "j") return;

      const now = performance.now();
      if (now - lastTime > 900) {
        lastKey = "";
      }
      lastTime = now;
      lastKey += e.key.toLowerCase();

      if (lastKey.endsWith("lj")) {
        lastKey = "";
        party();
      }
    });
  }

  /* ---------- 20. Befehlspalette ----------------------------------------- */

  function initPalette() {
    const root = $("#palette");
    const input = $("#paletteInput");
    const list = $("#paletteList");
    const openBtn = $("#paletteOpen");
    if (!root || !input || !list) return;

    let lastFocus = null;
    let rows = [];
    let activeIndex = 0;
    let isOpen = false;

    const close = () => {
      if (!isOpen) return;
      isOpen = false;
      root.hidden = true;
      document.body.classList.remove("palette-open");
      lastFocus?.focus?.();
    };

    const copyLink = async () => {
      const url = location.href;
      try {
        await navigator.clipboard.writeText(url);
        toast("Link kopiert – teilen erlaubt.");
      } catch {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); toast("Link kopiert – teilen erlaubt."); }
        catch { toast("Kopieren nicht möglich – bitte aus der Adresszeile."); }
        ta.remove();
      }
      close();
    };

    /** Seite öffnen – oder, wenn das Ziel schon offen ist, sanft nach oben scrollen. */
    const visit = (href) => {
      const [file, hash] = href.split("#");
      const here = location.pathname.split("/").pop() || "index.html";
      const same = !file || file === here || (here === "" && file === "index.html");

      if (same && hash) {
        close();
        $(`#${hash}`)?.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
        return;
      }
      if (same && !hash) {
        close();
        window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
        return;
      }
      location.href = href;
    };

    const items = [
      { label: "Start", icon: "00", hint: "Zur Startseite", action: () => visit("index.html") },
      { label: "Über mich", icon: "01", hint: "Wer ist Jason?", action: () => visit("about.html") },
      { label: "Socials", icon: "02", hint: "Twitch, YouTube & Co.", action: () => visit("socials.html") },
      { label: "Clips", icon: "03", hint: "Echte Highlights", action: () => visit("clips.html") },
      { label: "Streamplan", icon: "04", hint: "Wann bin ich live?", action: () => visit("streamplan.html") },
      { label: "Community", icon: "05", hint: "Discord & die Zahlen", action: () => visit("community.html") },
      { label: () => `Follower: ${state.followers.toLocaleString("de-DE")}`, icon: "♡", hint: "Live von Twitch", action: () => visit("community.html") },
      { label: "Twitch öffnen", icon: "↗", hint: "twitch.tv/livejson", action: () => window.open(TWITCH.page, "_blank", "noopener") },
      { label: "Link kopieren", icon: "⧉", hint: "Seite teilen", action: copyLink },
      { label: "Party-Modus", icon: "✦", hint: "Konfetti, einmalig", action: () => { close(); party(); } },
    ];

    function updateActive() {
      rows.forEach((row, i) => {
        const on = i === activeIndex;
        row.el.classList.toggle("is-active", on);
        row.el.setAttribute("aria-selected", String(on));
      });
      const current = rows[activeIndex];
      if (current) {
        input.setAttribute("aria-activedescendant", current.el.id);
        current.el.scrollIntoView({ block: "nearest" });
      } else {
        input.removeAttribute("aria-activedescendant");
      }
    }

    function setActive(index) {
      if (!rows.length) return;
      activeIndex = (index + rows.length) % rows.length;
      updateActive();
    }

    function filter(query) {
      const q = query.trim().toLowerCase();
      list.textContent = "";
      rows = [];

      const shown = items.filter((item) => {
        if (!q) return true;
        const label = typeof item.label === "function" ? item.label() : item.label;
        return `${label} ${item.hint}`.toLowerCase().includes(q);
      });

      if (!shown.length) {
        const empty = document.createElement("li");
        empty.className = "palette__empty";
        empty.textContent = "Nichts gefunden – probier's mit „Stream“ oder „Discord“.";
        list.appendChild(empty);
        input.removeAttribute("aria-activedescendant");
        return;
      }

      shown.forEach((item) => {
        const index = items.indexOf(item);
        const li = document.createElement("li");
        li.className = "palette__item";
        li.id = `pal-opt-${index}`;
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", "false");

        const icon = document.createElement("span");
        icon.className = "palette__item--icon";
        icon.textContent = typeof item.icon === "function" ? item.icon() : item.icon;

        const label = document.createElement("span");
        label.textContent = typeof item.label === "function" ? item.label() : item.label;

        const hint = document.createElement("span");
        hint.className = "palette__item-hint";
        hint.textContent = item.hint;

        li.append(icon, label, hint);
        li.addEventListener("pointerdown", (e) => e.preventDefault());
        li.addEventListener("click", () => item.action());
        li.addEventListener("pointerenter", () => {
          activeIndex = rows.findIndex((row) => row.el === li);
          updateActive();
        });

        list.appendChild(li);
        rows.push({ el: li, item });
      });

      activeIndex = 0;
      updateActive();
    }

    function open() {
      if (isOpen) return;
      isOpen = true;
      lastFocus = document.activeElement;
      root.hidden = false;
      document.body.classList.add("palette-open");
      input.value = "";
      filter("");
      requestAnimationFrame(() => input.focus());
    }

    input.addEventListener("input", () => filter(input.value));

    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive(activeIndex + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive(activeIndex - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        setActive(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setActive(rows.length - 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        rows[activeIndex]?.item.action();
      } else if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "Tab") {
        e.preventDefault();
        input.focus();
      }
    });

    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
    root.addEventListener("click", (e) => {
      if (e.target.closest("[data-palette-close]")) close();
    });

    openBtn?.addEventListener("click", open);

    document.addEventListener("keydown", (e) => {
      const isK = e.key.toLowerCase() === "k";
      if (isK && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        isOpen ? close() : open();
        return;
      }
      if (e.key === "Escape" && isOpen) {
        close();
        return;
      }
      // "/" als schneller Weg – aber nicht in Eingabefeldern
      if (e.key === "/" && !isOpen) {
        const t = e.target;
        if (t instanceof HTMLElement && (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable)) return;
        e.preventDefault();
        open();
      }
    });
  }

  /* ---------- Start ------------------------------------------------------ */

  function boot() {
    run("loader", initLoader);
    run("year", initYear);
    run("particles", initParticles);
    run("liveStatus", initLiveStatus);
    run("typed", initTyped);
    run("title", initTitle);
    run("reveal", initReveal);
    run("nav", initNav);
    run("menu", initMenu);
    run("magnetic", initMagnetic);
    run("tilt", initTilt);
    run("cursor", initCursor);
    run("heroEffects", initHeroEffects);
    run("scroll", initScroll);
    run("stats", initStats);
    run("streamLog", initStreamLog);
    run("today", initToday);
    run("countdown", initCountdown);
    run("reel", initReel);
    run("clipFilter", initClipFilter);
    run("clipPlayer", initClipPlayer);
    run("palette", initPalette);
    run("easterEgg", initEasterEgg);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
