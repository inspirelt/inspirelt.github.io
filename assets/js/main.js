/* Page behaviour: reveal-on-scroll, theme, nav, email copy, publication list. */
(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scrollBehavior = reduceMotion ? "auto" : "smooth";

  /* ---------- reveal on scroll ---------- */

  const revealEls = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- theme ---------- */

  const mqDark = matchMedia("(prefers-color-scheme: dark)");
  const currentTheme = () => root.dataset.theme || (mqDark.matches ? "dark" : "light");
  const announceTheme = () => document.dispatchEvent(new CustomEvent("themechange", { detail: currentTheme() }));

  function setTheme(t) {
    root.dataset.theme = t;
    try { localStorage.setItem("theme", t); } catch (e) { /* private mode */ }
    announceTheme();
  }

  const themeBtn = $("[data-theme-toggle]");
  themeBtn?.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    if (!document.startViewTransition || reduceMotion) { setTheme(next); return; }
    // Circular reveal from the toggle button.
    const r = themeBtn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(() => setTheme(next));
    vt.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 700, easing: "cubic-bezier(.2,.7,.2,1)", pseudoElement: "::view-transition-new(root)" }
      );
    }).catch(() => {});
  });
  mqDark.addEventListener?.("change", () => { if (!root.dataset.theme) announceTheme(); });

  /* ---------- nav ---------- */

  const nav = $("[data-nav]");
  const onScroll = () => nav?.classList.toggle("is-scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const navLinks = $$(".nav__links a");
  if ("IntersectionObserver" in window) {
    const so = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id));
      }
    }, { rootMargin: "-45% 0px -50% 0px" });
    navLinks.map((a) => $(a.getAttribute("href"))).filter(Boolean).forEach((s) => so.observe(s));
  }

  /* ---------- toast + email ---------- */

  const toastEl = $("[data-toast]");
  let toastTimer = 0;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 2400);
  }

  // The address is assembled here so it never appears verbatim in the HTML.
  $$("[data-email]").forEach((btn) => {
    const addr = `${btn.dataset.u}@${btn.dataset.d}`;
    const label = $("[data-email-text]", btn);
    if (label) label.textContent = addr;
    btn.title = addr;
    btn.setAttribute("aria-label", `Copy email address ${addr}`);
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(addr);
        toast(`Copied ${addr}`);
      } catch (e) {
        location.href = `mailto:${addr}`;
      }
    });
  });

  /* ---------- contact glow follows the pointer ---------- */

  const contact = $(".contact__inner");
  contact?.addEventListener("pointermove", (e) => {
    const r = contact.getBoundingClientRect();
    contact.style.setProperty("--mx", `${e.clientX - r.left}px`);
    contact.style.setProperty("--my", `${e.clientY - r.top}px`);
  });

  /* ---------- footer ---------- */

  const yearEl = $("[data-year]");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  document.addEventListener("portrait:fit", (e) => {
    $$("[data-gcount]").forEach((el) => { el.textContent = e.detail.count.toLocaleString("en-US"); });
  });

  /* ---------- publications ---------- */

  const S = window.SITE;
  const pubsEl = $("[data-pubs]");
  const filtersEl = $("[data-filters]");
  if (!S || !pubsEl || !filtersEl) return;

  const TOPIC_VAR = { embodied: "--emb", recon: "--recon", perception: "--perc" };
  const FILTERS = [
    { key: "selected", label: "Selected", test: (p) => !!p.selected },
    { key: "all", label: "All", test: () => true },
    ...Object.keys(S.topics).map((k) => ({ key: k, label: S.topics[k].label, dot: k, test: (p) => p.tags.includes(k) })),
  ];
  const LINK_LABELS = [["project", "Project"], ["paper", "Paper"], ["arxiv", "arXiv"], ["code", "Code"]];

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Small deterministic PRNG so every paper keeps the same glyph across visits.
  function hash(str) {
    let h = 2166136261;
    for (const ch of str) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const f1 = (n) => n.toFixed(1);

  // A tiny generative thumbnail per paper, in the visual language of its thread:
  // scan rings of points (perception), soft splats (reconstruction), splats + a planned path (world models).
  function glyph(p) {
    const r = rng(hash(p.id));
    const gid = `g-${p.id}`;
    const kind = p.tags[0];
    let body = "";

    if (kind === "perception") {
      const cx = 36 + (r() - 0.5) * 6;
      const cy = 44 + (r() - 0.5) * 6;
      const gap = -Math.PI * (0.25 + r() * 0.5); // direction of the object, upper half
      const od = 13 + r() * 6;
      for (let ring = 0; ring < 6; ring++) {
        const rad = 8 + ring * 6.2;
        const n = 12 + ring * 5;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2;
          const dg = Math.abs(((a - gap + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          if (rad > od && dg < 0.32) continue; // the LiDAR shadow behind the object
          const x = cx + Math.cos(a) * rad;
          const y = cy + Math.sin(a) * rad * 0.45 - ring * 1.2;
          const o = 0.25 + 0.75 * (1 - ring / 6);
          body += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${(0.8 + r() * 0.5).toFixed(2)}" fill="currentColor" opacity="${o.toFixed(2)}"/>`;
        }
      }
      // the object casting that shadow
      const ox = cx + Math.cos(gap) * od;
      const oy = cy + Math.sin(gap) * od * 0.45;
      for (let k = 0; k < 16; k++) {
        const x = ox + (r() - 0.5) * 8;
        const y = oy - r() * 13;
        body += `<circle cx="${f1(x)}" cy="${f1(y)}" r="1.1" fill="currentColor" opacity="0.9"/>`;
      }
    } else if (kind === "recon") {
      const n = 7 + Math.floor(r() * 4);
      for (let k = 0; k < n; k++) {
        const x = 16 + r() * 40;
        const y = 16 + r() * 40;
        const rx = 7 + r() * 13;
        const ry = 3 + r() * 6;
        const a = Math.floor(r() * 180);
        body += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rx)}" ry="${f1(ry)}" transform="rotate(${a} ${f1(x)} ${f1(y)})" fill="url(#${gid})" opacity="${(0.45 + r() * 0.55).toFixed(2)}"/>`;
      }
      // a few anchors
      for (let k = 0; k < 3; k++) {
        const x = 18 + r() * 36;
        const y = 18 + r() * 36;
        body += `<rect x="${f1(x - 1.6)}" y="${f1(y - 1.6)}" width="3.2" height="3.2" rx=".6" fill="currentColor" opacity=".9"/>`;
      }
    } else {
      // splats along a planned trajectory
      const x0 = 12 + r() * 8;
      const y0 = 54 - r() * 8;
      const x1 = 52 + r() * 8;
      const y1 = 18 + r() * 10;
      const mx = 20 + r() * 30;
      const my = 6 + r() * 14;
      for (let k = 0; k < 4; k++) {
        const x = 14 + r() * 44;
        const y = 22 + r() * 34;
        const rx = 6 + r() * 9;
        const ry = 3 + r() * 5;
        const a = Math.floor(r() * 180);
        body += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rx)}" ry="${f1(ry)}" transform="rotate(${a} ${f1(x)} ${f1(y)})" fill="url(#${gid})" opacity="${(0.3 + r() * 0.4).toFixed(2)}"/>`;
      }
      for (let k = 0; k <= 12; k++) {
        const t = k / 12;
        const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x1;
        const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * my + t * t * y1;
        body += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${(1.6 - t * 0.6).toFixed(2)}" fill="currentColor" opacity="${(1 - t * 0.75).toFixed(2)}"/>`;
      }
      body += `<circle cx="${f1(x1)}" cy="${f1(y1)}" r="4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 2"/>`;
    }

    return `<svg viewBox="0 0 72 72" aria-hidden="true" style="color: var(--c)"><defs><radialGradient id="${gid}"><stop offset="0" stop-color="currentColor" stop-opacity=".95"/><stop offset=".5" stop-color="currentColor" stop-opacity=".42"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs>${body}</svg>`;
  }

  function titleHTML(t) {
    const k = t.indexOf(":");
    return k > 0 && k <= 32 ? `<b>${esc(t.slice(0, k))}</b>${esc(t.slice(k))}` : esc(t);
  }

  function nameHTML(raw) {
    const m = raw.match(/^(.*?)([*†]*)$/);
    const name = m[1].trim();
    const marks = m[2] ? `<sup>${m[2]}</sup>` : "";
    return name === S.me ? `<span class="me">${esc(name)}</span>${marks}` : `${esc(name)}${marks}`;
  }

  function authorsHTML(p, full = false) {
    const names = p.authors.split(",").map((s) => s.trim()).filter(Boolean);
    if (full || names.length <= 16) return names.map(nameHTML).join(", ");
    const me = names.findIndex((n) => n.replace(/[*†]/g, "").trim() === S.me);
    const keep = new Set([0, 1, 2, 3, 4, me, names.length - 2, names.length - 1].filter((i) => i >= 0));
    const out = [];
    let prev = -1;
    for (let i = 0; i < names.length; i++) {
      if (!keep.has(i)) continue;
      if (i - prev > 1) out.push("…");
      out.push(nameHTML(names[i]));
      prev = i;
    }
    const hidden = names.length - keep.size;
    return `${out.join(", ")} <button class="pub__expand" type="button" data-expand="${esc(p.id)}">+${hidden} more</button>`;
  }

  function pubHTML(p, i, animate) {
    const topic = p.tags[0];
    const href = p.links.project || p.links.arxiv || p.links.paper || p.links.code || "#";
    const links = LINK_LABELS.filter(([k]) => p.links[k])
      .map(([k, label]) => `<a href="${esc(p.links[k])}" target="_blank" rel="noopener">${label}</a>`).join("");
    const isPub = !/^arxiv/i.test(p.venue);
    return `
      <li class="pub${animate ? " is-enter" : ""}" id="pub-${esc(p.id)}" style="--c: var(${TOPIC_VAR[topic]}); --i: ${i}">
        <div class="pub__glyph">${glyph(p)}</div>
        <div class="pub__body">
          <h4 class="pub__title"><a href="${esc(href)}" target="_blank" rel="noopener">${titleHTML(p.title)}</a></h4>
          <p class="pub__authors">${authorsHTML(p)}</p>
          ${p.tldr ? `<p class="pub__tldr">${esc(p.tldr)}</p>` : ""}
          <div class="pub__foot">
            <span class="venue${isPub ? " is-pub" : ""}">${esc(p.venue)}</span>
            ${p.award ? `<span class="award">★ ${esc(p.award)}</span>` : ""}
            <span class="pub__links">${links}</span>
          </div>
        </div>
      </li>`;
  }

  let active = "selected";

  filtersEl.innerHTML = FILTERS.map((f) => {
    const dot = f.dot ? `<span class="chip__dot" style="--c: var(${TOPIC_VAR[f.dot]})"></span>` : "";
    const n = S.pubs.filter(f.test).length;
    return `<button class="chip" type="button" data-key="${f.key}" aria-pressed="false">${dot}${esc(f.label)}<span class="chip__n">${n}</span></button>`;
  }).join("");

  function render(key, { animate = true } = {}) {
    const f = FILTERS.find((x) => x.key === key) || FILTERS[0];
    active = f.key;
    $$(".chip", filtersEl).forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.key === active)));
    const list = S.pubs.filter(f.test);
    const years = [...new Set(list.map((p) => p.year))].sort((a, b) => b - a);
    let i = 0;
    pubsEl.innerHTML = years.map((y) => `
      <div class="pubs__group">
        <h3 class="pubs__year">${y}</h3>
        <ul class="pubs__list">${list.filter((p) => p.year === y).map((p) => pubHTML(p, i++, animate && !reduceMotion)).join("")}</ul>
      </div>`).join("") || `<p class="pubs__empty">Nothing here yet.</p>`;
  }

  function jumpTo(id) {
    const p = S.pubs.find((x) => x.id === id);
    if (!p) return;
    const f = FILTERS.find((x) => x.key === active);
    if (!f.test(p)) render("all", { animate: false });
    const el = document.getElementById("pub-" + id);
    if (!el) return;
    el.scrollIntoView({ behavior: scrollBehavior, block: "center" });
    el.classList.remove("is-enter", "is-flash");
    void el.offsetWidth; // restart the animation
    el.classList.add("is-flash");
    history.replaceState(null, "", "#pub-" + id);
  }

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;

    const jump = t.closest("[data-jump]");
    if (jump) { e.preventDefault(); jumpTo(jump.dataset.jump); return; }

    const fj = t.closest("[data-filter-jump]");
    if (fj) {
      render(fj.dataset.filterJump);
      $("#publications").scrollIntoView({ behavior: scrollBehavior, block: "start" });
      return;
    }

    const chip = t.closest(".chip[data-key]");
    if (chip) { if (chip.dataset.key !== active) render(chip.dataset.key); return; }

    const ex = t.closest("[data-expand]");
    if (ex) {
      const p = S.pubs.find((x) => x.id === ex.dataset.expand);
      const para = ex.closest(".pub__authors");
      if (p && para) para.innerHTML = authorsHTML(p, true);
    }
  });

  render("selected", { animate: false });

  const m = location.hash.match(/^#pub-(.+)$/);
  if (m) setTimeout(() => jumpTo(decodeURIComponent(m[1])), 300);
})();
