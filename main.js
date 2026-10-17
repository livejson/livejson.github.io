/* ==========================================================================
   LiveJSON – Animationen & Interaktionen
   --------------------------------------------------------------------------
   Hier kannst du schnell die Basics anpassen:
   ========================================================================== */
const CONFIG = {
  isLive: false,                       // true = Live-Badge zeigt "LIVE JETZT"
  liveText: "LIVE JETZT – komm vorbei!",
  offlineText: "Gerade offline – bis bald!",
  typedWords: ["Gaming-Streams", "Chill-Sessions", "Community-Abende", "Marathon-Nights"],
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/* ---------- 1. Intro-Loader ---------- */
function initLoader() {
  const loader = $("#loader");
  if (!loader) return;
  const start = () => {
    loader.classList.add("is-loading");
    setTimeout(() => {
      loader.classList.add("is-done");
      document.body.classList.add("is-ready");
    }, prefersReducedMotion ? 0 : 1500);
  };
  requestAnimationFrame(start);
}

/* ---------- 2. Partikel-Hintergrund (Canvas) ---------- */
function initParticles() {
  const canvas = $("#particles");
  if (!canvas || prefersReducedMotion) return;
  const ctx = canvas.getContext("2d");
  const colors = ["168, 85, 247", "244, 114, 182", "34, 211, 238"];
  let w, h, dots = [];
  const mouse = { x: -9999, y: -9999 };
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = clamp(Math.round((w * h) / 16000), 35, 110);
    dots = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.6,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);
    for (const d of dots) {
      // sanfte Abstoßung vom Mauszeiger
      const dx = d.x - mouse.x;
      const dy = d.y - mouse.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 140) {
        const force = (140 - dist) / 140;
        d.vx += (dx / dist) * force * 0.06;
        d.vy += (dy / dist) * force * 0.06;
      }
      d.vx *= 0.99;
      d.vy *= 0.99;
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < 0) d.x = w;
      if (d.x > w) d.x = 0;
      if (d.y < 0) d.y = h;
      if (d.y > h) d.y = 0;

      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${d.c}, 0.9)`;
      ctx.fill();
    }
    // Verbindungslinien zwischen nahen Punkten
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const a = dots[i], b = dots[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 120) {
          ctx.strokeStyle = `rgba(168, 85, 247, ${(1 - dist / 120) * 0.22})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(frame);
  }

  resize();
  frame();
  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  window.addEventListener("pointerleave", () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });
}

/* ---------- 3. Live-Status ---------- */
function initLiveStatus() {
  const text = $("#liveText");
  const dot = $("#liveDot");
  const badge = dot?.closest(".status-badge");
  if (!text || !dot) return;
  if (CONFIG.isLive) {
    text.textContent = CONFIG.liveText;
    dot.classList.add("is-live");
    badge?.classList.add("is-live");
  } else {
    text.textContent = CONFIG.offlineText;
  }
}

/* ---------- 4. Typewriter ---------- */
function initTyped() {
  const el = $("#typed");
  if (!el || !CONFIG.typedWords.length) return;
  if (prefersReducedMotion) {
    el.textContent = CONFIG.typedWords[0];
    return;
  }
  let wordIndex = 0;
  let charIndex = 0;
  let deleting = false;

  function tick() {
    const word = CONFIG.typedWords[wordIndex];
    if (!deleting) {
      charIndex++;
      el.textContent = word.slice(0, charIndex);
      if (charIndex === word.length) {
        deleting = true;
        return setTimeout(tick, 1800);
      }
      return setTimeout(tick, 110);
    }
    charIndex--;
    el.textContent = word.slice(0, charIndex);
    if (charIndex === 0) {
      deleting = false;
      wordIndex = (wordIndex + 1) % CONFIG.typedWords.length;
      return setTimeout(tick, 400);
    }
    setTimeout(tick, 60);
  }
  setTimeout(tick, 1800);
}

/* ---------- 5. Reveal beim Scrollen ---------- */
function initReveal() {
  const items = $$(".reveal");
  const reveal = (el) => {
    const delay = Number(el.dataset.delay || 0);
    el.style.transitionDelay = `${delay}ms`;
    el.classList.add("is-visible");
    // Verzögerung nach dem Einblenden entfernen, damit Hover-Effekte sofort reagieren
    setTimeout(() => { el.style.transitionDelay = ""; }, delay + 1000);
    el.querySelectorAll("[data-count]").forEach(countUp);
    el.querySelectorAll("[data-width]").forEach((bar) => {
      bar.style.width = bar.dataset.width + "%";
    });
    if (el.matches("[data-width]")) el.style.width = el.dataset.width + "%";
  };

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    items.forEach(reveal);
    $$("[data-count]").forEach(countUp);
    $$("[data-width]").forEach((b) => (b.style.width = b.dataset.width + "%"));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        reveal(entry.target);
        io.unobserve(entry.target);
      }
    }
  }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });

  items.forEach((el) => io.observe(el));

  // Balken außerhalb von .reveal (z. B. im Community-Block)
  const barIO = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll("[data-width]").forEach((b) => (b.style.width = b.dataset.width + "%"));
        barIO.unobserve(entry.target);
      }
    }
  }, { threshold: 0.3 });
  $$(".community").forEach((el) => barIO.observe(el));
}

/* ---------- 6. Zähler-Animation ---------- */
const counted = new WeakSet();
function countUp(el) {
  if (counted.has(el)) return;
  counted.add(el);
  const target = Number(el.dataset.count);
  if (prefersReducedMotion) {
    el.textContent = target.toLocaleString("de-DE");
    return;
  }
  const duration = 2200;
  const startTime = performance.now();
  const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
  function step(now) {
    const p = clamp((now - startTime) / duration, 0, 1);
    el.textContent = Math.round(target * easeOutExpo(p)).toLocaleString("de-DE");
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ---------- 7. 3D-Tilt für Karten ---------- */
function initTilt() {
  if (prefersReducedMotion || !finePointer) return;
  $$(".tilt").forEach((card) => {
    const max = 8;
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.transform = `perspective(900px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg) translateZ(0)`;
      card.style.setProperty("--mx", `${px * 100}%`);
      card.style.setProperty("--my", `${py * 100}%`);
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
}

/* ---------- 8. Magnet-Buttons ---------- */
function initMagnetic() {
  if (prefersReducedMotion || !finePointer) return;
  $$("[data-magnetic]").forEach((btn) => {
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
    });
    btn.addEventListener("pointerleave", () => {
      btn.style.transform = "";
    });
  });
}

/* ---------- 9. Cursor-Glow (folgt der Maus sanft) ---------- */
function initCursorGlow() {
  const glow = $("#cursorGlow");
  if (!glow || prefersReducedMotion || !finePointer) {
    if (glow) glow.style.display = "none";
    return;
  }
  const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const pos = { ...target };
  window.addEventListener("pointermove", (e) => {
    target.x = e.clientX;
    target.y = e.clientY;
  });
  (function loop() {
    pos.x += (target.x - pos.x) * 0.12;
    pos.y += (target.y - pos.y) * 0.12;
    glow.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    requestAnimationFrame(loop);
  })();
}

/* ---------- 10. Scroll: Fortschritt, Navigation, Parallax ---------- */
function initScroll() {
  const bar = $("#scrollProgress");
  const nav = $("#nav");
  const heroContent = $(".hero__content");
  const blobA = $(".hero__blob--a");
  const blobB = $(".hero__blob--b");
  let ticking = false;

  const update = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav?.classList.toggle("is-scrolled", y > 40);
    if (!prefersReducedMotion && y < window.innerHeight) {
      if (heroContent) heroContent.style.transform = `translateY(${y * 0.25}px)`;
      if (heroContent) heroContent.style.opacity = String(1 - y / (window.innerHeight * 0.9));
      if (blobA) blobA.style.marginTop = `${y * -0.15}px`;
      if (blobB) blobB.style.marginTop = `${y * 0.1}px`;
    }
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
  update();
}

/* ---------- 11. Heute im Streamplan hervorheben ---------- */
function initToday() {
  const today = new Date().getDay();
  $$(`.day[data-day="${today}"]`).forEach((el) => el.classList.add("is-today"));
}

/* ---------- Start ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  initLoader();
  initParticles();
  initLiveStatus();
  initTyped();
  initReveal();
  initTilt();
  initMagnetic();
  initCursorGlow();
  initScroll();
  initToday();
});
