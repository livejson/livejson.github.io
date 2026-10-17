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
    isLive: false,
    liveText: "LIVE JETZT – komm vorbei!",
    offlineText: "Gerade offline – bis bald!",
    typedWords: ["Gaming-Streams", "Chill-Sessions", "Community-Abende", "Marathon-Nights"],
    weekdays: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
    weekdaysShort: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
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

  /* ---------- 3. Live-Status -------------------------------------------- */

  function initLiveStatus() {
    const text = $("#liveText");
    const dot = $("#liveDot");
    if (!text || !dot) return;

    const badge = dot.closest(".badge");
    const hudStatus = $("#hudStatus");
    const hudMeta = $("#hudStatusMeta");

    if (CONFIG.isLive) {
      text.textContent = CONFIG.liveText;
      dot.classList.add("is-live");
      badge?.classList.add("is-live");
      if (hudStatus) hudStatus.textContent = "LIVE";
      if (hudMeta) hudMeta.textContent = "Jetzt zuschauen";
    } else {
      text.textContent = CONFIG.offlineText;
      if (hudStatus) hudStatus.textContent = "Offline";
      if (hudMeta) hudMeta.textContent = "Ich melde mich";
    }
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
      const hot = e.target.closest("a, button, .card, .social, .day, .clip");
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

    // Streamplan aus dem DOM lesen – eine Quelle für Anzeige und Countdown.
    const plan = $$(".day")
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
    const clips = $$(".clip", reel);

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

    const goto = (href) => {
      close();
      const el = $(href);
      if (el) el.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
      else location.hash = href;
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

    const items = [
      { label: "Über mich", icon: "01", hint: "Wer ist Jason?", action: () => goto("#about") },
      { label: "Highlights", icon: "02", hint: "Beste Momente", action: () => goto("#highlights") },
      { label: "Socials", icon: "03", hint: "Twitch, Discord & Co.", action: () => goto("#socials") },
      { label: "Story", icon: "04", hint: "Der Weg bis hierher", action: () => goto("#story") },
      { label: "Streamplan", icon: "05", hint: "Wann bin ich live?", action: () => goto("#schedule") },
      { label: "Community", icon: "06", hint: "Discord & Regeln", action: () => goto("#community") },
      { label: "Setup", icon: "07", hint: "Hardware & Gear", action: () => goto("#setup") },
      { label: "Nach oben", icon: "↑", hint: "Zum Anfang", action: () => goto("#top") },
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
        return `${item.label} ${item.hint}`.toLowerCase().includes(q);
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
        icon.textContent = item.icon;

        const label = document.createElement("span");
        label.textContent = item.label;

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
    run("today", initToday);
    run("countdown", initCountdown);
    run("reel", initReel);
    run("palette", initPalette);
    run("easterEgg", initEasterEgg);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
