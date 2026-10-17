/* ==========================================================================
   LiveJSON — Interaktionen
   --------------------------------------------------------------------------
   Regeln für diese Datei:
   1. Jedes Modul prüft selbst, ob seine Elemente existieren.
   2. Ein Fehler in einem Modul darf die anderen nicht mitreißen.
   3. Ohne JavaScript bleibt die Seite vollständig lesbar (siehe .no-js im CSS).
   ========================================================================== */

(() => {
  "use strict";

  const CONFIG = {
    isLive: false,
    liveText: "LIVE JETZT – komm vorbei!",
    offlineText: "Gerade offline – bis bald!",
    typedWords: ["Gaming-Streams", "Chill-Sessions", "Community-Abende", "Marathon-Nights"],
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
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

      const count = clamp(Math.round((width * height) / 24000), 20, 70);
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
    if (CONFIG.isLive) {
      text.textContent = CONFIG.liveText;
      dot.classList.add("is-live");
      badge?.classList.add("is-live");
    } else {
      text.textContent = CONFIG.offlineText;
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

    timer = setTimeout(tick, 1600);
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

    window.addEventListener("pointermove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      document.body.classList.add("has-cursor");
    }, { passive: true });

    (function loop() {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      requestAnimationFrame(loop);
    })();

    // Cursor reagiert auf klickbare Elemente
    document.addEventListener("pointerover", (e) => {
      const hot = e.target.closest("a, button, .card, .social, .day");
      document.body.classList.toggle("cursor-hot", Boolean(hot));
    });
  }

  /* ---------- 10. Spotlight im Hero ------------------------------------- */

  function initHeroSpot() {
    const hero = $(".hero");
    const spot = $("#heroSpot");
    if (!hero || !spot || !finePointer.matches || reduceMotion.matches) return;

    hero.addEventListener("pointermove", (e) => {
      const rect = hero.getBoundingClientRect();
      spot.style.setProperty("--mx", `${((e.clientX - rect.left) / rect.width) * 100}%`);
      spot.style.setProperty("--my", `${((e.clientY - rect.top) / rect.height) * 100}%`);
    }, { passive: true });
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

  /* ---------- 12. Navigation -------------------------------------------- */

  function initNav() {
    const nav = $("#nav");
    if (!nav) return;

    const links = $$("[data-nav]");
    const indicator = $(".nav__indicator");
    const sections = links
      .map((link) => {
        const id = link.getAttribute("href");
        const section = id ? $(id) : null;
        return section ? { link, section } : null;
      })
      .filter(Boolean);

    function moveIndicator(link) {
      if (!indicator || !link) return;
      indicator.style.left = `${link.offsetLeft}px`;
      indicator.style.width = `${link.offsetWidth}px`;
      indicator.classList.add("is-on");
    }

    function setActive(link) {
      links.forEach((l) => l.classList.toggle("is-active", l === link));
      moveIndicator(link);
    }

    if (sections.length && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const match = sections.find((s) => s.section === visible.target);
        if (match) setActive(match.link);
      }, { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.6] });
      sections.forEach((s) => io.observe(s.section));
    }

    // Beim Laden und bei Resize die Markierung nachziehen.
    // Solange keine Section aktiv ist, bleibt der Balken unsichtbar.
    const sync = () => {
      const active = links.find((l) => l.classList.contains("is-active"));
      if (active) {
        moveIndicator(active);
      } else if (indicator) {
        indicator.classList.remove("is-on");
      }
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

  /* ---------- Start ------------------------------------------------------ */

  document.addEventListener("DOMContentLoaded", () => {
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
    run("heroSpot", initHeroSpot);
    run("scroll", initScroll);
    run("today", initToday);
  });
})();
