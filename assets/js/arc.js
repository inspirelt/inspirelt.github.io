/*
 * The three small canvases in "Research":
 *   lidar  — a spinning LiDAR, ray-cast against a few objects (with their shadows and 3D boxes)
 *   splats — anchors that each spawn a handful of 3D Gaussians, Scaffold-GS style
 *   arm    — a 2-link arm that shows its predicted path before it moves; click to set the goal
 * Each canvas only animates while it is on screen.
 */
(() => {
  "use strict";

  const canvases = Array.from(document.querySelectorAll("canvas[data-viz]"));
  if (!canvases.length) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI * 2;

  /* ---------- colors from CSS tokens ---------- */

  function isDark() {
    const t = document.documentElement.dataset.theme;
    return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function hexToRgb(hex) {
    let h = hex.replace("#", "").trim();
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return Number.isNaN(n) ? [128, 128, 128] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    return {
      ink: v("--ink"), ink3: v("--ink-3"), line: v("--line-2"), card: v("--card"),
      perc: v("--perc"), recon: v("--recon"), emb: v("--emb"), mono: v("--mono") || "monospace", dark: isDark(),
    };
  }
  let C = readColors();
  const rgba = (hex, a) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };
  const mix = (a, b, t) => { const x = hexToRgb(a), y = hexToRgb(b); return x.map((v, i) => Math.round(v + (y[i] - v) * t)); };

  function mulberry(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const approach = (cur, target, dt, rate) => cur + (target - cur) * (1 - Math.exp(-dt * rate));

  /* ═════════════════════════ LiDAR ═════════════════════════ */

  function lidarScene() {
    const H = 1.0; // sensor height
    const objs = [
      { box: true, cx: 2.9, cz: 1.2, hw: 0.85, hd: 1.9, h: 1.3, rot: 0.35 },
      { box: true, cx: -3.3, cz: -1.0, hw: 0.9, hd: 2.0, h: 1.4, rot: -0.15 },
      { box: false, cx: -1.2, cz: 3.4, r: 0.3, h: 1.75 },
      { box: false, cx: 1.6, cz: -3.1, r: 0.16, h: 2.8 },
    ];
    const MAXR = 6.6;

    const slab = (o, dx, dz) => {
      const c = Math.cos(o.rot), s = Math.sin(o.rot);
      const ox = -o.cx, oz = -o.cz;
      const P = [ox * c + oz * s, -ox * s + oz * c];
      const D = [dx * c + dz * s, -dx * s + dz * c];
      const half = [o.hw, o.hd];
      let tmin = -Infinity, tmax = Infinity;
      for (let k = 0; k < 2; k++) {
        if (Math.abs(D[k]) < 1e-9) { if (Math.abs(P[k]) > half[k]) return [1, 0]; continue; }
        let t1 = (-half[k] - P[k]) / D[k], t2 = (half[k] - P[k]) / D[k];
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
      }
      return [tmin, tmax];
    };
    const circ = (o, dx, dz) => {
      const b = dx * o.cx + dz * o.cz;
      const disc = b * b - (o.cx * o.cx + o.cz * o.cz - o.r * o.r);
      if (disc < 0) return [1, 0];
      const q = Math.sqrt(disc);
      return [b - q, b + q];
    };

    const pts = [];
    const AZ = 320;
    for (let a = 0; a < AZ; a++) {
      const az = (a / AZ) * TAU;
      const dx = Math.cos(az), dz = Math.sin(az);
      for (let e = 0; e < 16; e++) {
        const te = Math.tan(((-25 + e * 1.9) * Math.PI) / 180);
        let best = te < 0 ? -H / te : Infinity;
        let y = 0, onObj = false;
        for (const o of objs) {
          const [tin, tout] = o.box ? slab(o, dx, dz) : circ(o, dx, dz);
          if (!(tin < tout) || tout <= 0) continue;
          const t1 = Math.max(tin, 0);
          const y1 = H + te * t1;
          if (y1 >= 0 && y1 <= o.h) {
            if (t1 < best) { best = t1; y = y1; onObj = true; }
          } else if (y1 > o.h && te < 0) {
            const tt = (o.h - H) / te; // ray comes down onto the roof
            if (tt >= t1 && tt <= tout && tt < best) { best = tt; y = o.h; onObj = true; }
          }
        }
        if (best > MAXR) continue;
        pts.push({ x: dx * best, y: onObj ? y : 0, z: dz * best, az, obj: onObj });
      }
    }

    // 3D boxes around the objects (what a detector would output)
    const boxes = objs.map((o) => {
      const hw = o.box ? o.hw : o.r, hd = o.box ? o.hd : o.r, rot = o.box ? o.rot : 0;
      const c = Math.cos(rot), s = Math.sin(rot);
      const corners = [];
      for (const yy of [0, o.h]) {
        for (const [u, v] of [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]]) {
          corners.push([o.cx + u * c - v * s, yy, o.cz + u * s + v * c]);
        }
      }
      return corners;
    });
    const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];

    let off = 0;

    return {
      draw(v, t, dt) {
        const { ctx, w, h } = v;
        off = approach(off, v.hover ? (v.px - 0.5) * 2.4 : 0, dt, 4);
        const yaw = t * 0.16 + off;
        const pitch = 0.62;
        const dist = 15;
        const focal = Math.min(w * 0.82, h * 1.55);
        const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
        const cx = w / 2, cy = h * 0.54;
        const proj = (x, y, z) => {
          const yy = y - 0.5;
          const x1 = x * cyw - z * syw;
          const z1 = x * syw + z * cyw;
          const y2 = yy * cp + z1 * sp;
          const z2 = -yy * sp + z1 * cp + dist;
          const f = focal / z2;
          return [cx + x1 * f, cy - y2 * f, z2];
        };
        const sweep = (t * 2.1) % TAU;

        ctx.clearRect(0, 0, w, h);

        // sweep line
        const s0 = proj(0, 0, 0);
        const s1 = proj(Math.cos(sweep) * MAXR, 0, Math.sin(sweep) * MAXR);
        const grad = ctx.createLinearGradient(s0[0], s0[1], s1[0], s1[1]);
        grad.addColorStop(0, rgba(C.perc, 0.55));
        grad.addColorStop(1, rgba(C.perc, 0));
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(s0[0], s0[1]);
        ctx.lineTo(s1[0], s1[1]);
        ctx.stroke();

        // points
        ctx.fillStyle = C.perc;
        for (const p of pts) {
          const [x, y, z] = proj(p.x, p.y, p.z);
          if (x < -4 || x > w + 4 || y < -4 || y > h + 4) continue;
          const lag = (sweep - p.az + TAU) % TAU;
          const glow = Math.exp(-lag * 1.15);
          const depth = Math.min(1.2, 15 / z);
          const size = (p.obj ? 1.6 : 1.2) * depth + glow * 0.9;
          ctx.globalAlpha = Math.min(1, (p.obj ? 0.7 : 0.42) * depth + glow * 0.6);
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
        }
        ctx.globalAlpha = 1;

        // detector boxes
        ctx.strokeStyle = v.hover ? rgba(C.perc, 0.95) : rgba(C.ink, 0.3);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const b of boxes) {
          const P = b.map((c) => proj(c[0], c[1], c[2]));
          for (const [i, j] of EDGES) { ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[j][0], P[j][1]); }
        }
        ctx.stroke();

        // the sensor
        const top = proj(0, H, 0);
        ctx.strokeStyle = rgba(C.ink, 0.5);
        ctx.beginPath();
        ctx.moveTo(s0[0], s0[1]);
        ctx.lineTo(top[0], top[1]);
        ctx.stroke();
        ctx.fillStyle = C.ink;
        ctx.beginPath();
        ctx.arc(top[0], top[1], 3, 0, TAU);
        ctx.fill();
      },
    };
  }

  /* ═════════════════════════ Gaussians ═════════════════════════ */

  function splatScene() {
    const rand = mulberry(7);
    const anchors = [];
    const R = 1.05, r = 0.46;
    for (let i = 0; i < 24; i++) {
      for (let j = 0; j < 8; j++) {
        const u = ((i + rand() * 0.4) / 24) * TAU;
        const q = ((j + rand() * 0.4) / 8) * TAU;
        anchors.push({ x: (R + r * Math.cos(q)) * Math.cos(u), y: r * Math.sin(q), z: (R + r * Math.cos(q)) * Math.sin(u), u });
      }
    }
    const gs = [];
    anchors.forEach((a, ai) => {
      for (let k = 0; k < 4; k++) {
        gs.push({
          a: ai,
          ox: (rand() - 0.5) * 0.17, oy: (rand() - 0.5) * 0.17, oz: (rand() - 0.5) * 0.17,
          s: 0.026 + rand() * 0.04, asp: 0.3 + rand() * 0.5, rot: rand() * Math.PI,
          hue: (a.u / TAU + rand() * 0.1) % 1,
        });
      }
    });

    // pre-rendered Gaussian sprites along a palette loop
    const N_SPR = 24;
    let sprites = null;
    let spritesDark = null;
    function makeSprites() {
      const stops = [C.recon, "#c04fd0", "#ee5a84", C.emb, "#f2a93b", "#c04fd0", C.recon];
      sprites = [];
      for (let i = 0; i < N_SPR; i++) {
        const t = (i / N_SPR) * (stops.length - 1);
        const k = Math.floor(t);
        const rgb = mix(stops[k], stops[k + 1], t - k).join(",");
        const c = document.createElement("canvas");
        c.width = c.height = 64;
        const g = c.getContext("2d");
        const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        for (let s = 0; s <= 10; s++) {
          const x = s / 10;
          grd.addColorStop(x, `rgba(${rgb},${Math.exp(-4.5 * x * x).toFixed(3)})`);
        }
        g.fillStyle = grd;
        g.fillRect(0, 0, 64, 64);
        sprites.push(c);
      }
      spritesDark = C.dark;
    }

    let hoverAmt = 0, off = 0;
    const order = gs.map((_, i) => i);
    const depth = new Float32Array(gs.length);
    const sx = new Float32Array(gs.length), sy = new Float32Array(gs.length), sc = new Float32Array(gs.length);
    const ax = new Float32Array(anchors.length), ay = new Float32Array(anchors.length), az = new Float32Array(anchors.length);

    return {
      themechange() { sprites = null; },
      draw(v, t, dt) {
        if (!sprites || spritesDark !== C.dark) makeSprites();
        const { ctx, w, h, dpr } = v;
        hoverAmt = approach(hoverAmt, v.hover ? 1 : 0, dt, 5);
        off = approach(off, v.hover ? (v.px - 0.5) * 1.6 : 0, dt, 3);
        const yaw = t * 0.32 + off;
        const pitch = 0.78 + 0.16 * Math.sin(t * 0.4);
        const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
        const dist = 4.3, focal = Math.min(w, h * 1.6) * 0.95;
        const cx = w / 2, cy = h / 2;
        const spread = 1 + hoverAmt * 0.9;

        const project = (x, y, z, i, X, Y, Z) => {
          const x1 = x * cyw - z * syw;
          const z1 = x * syw + z * cyw;
          const y2 = y * cp + z1 * sp;
          const z2 = -y * sp + z1 * cp + dist;
          X[i] = cx + (x1 * focal) / z2;
          Y[i] = cy - (y2 * focal) / z2;
          Z[i] = z2;
        };

        anchors.forEach((a, i) => project(a.x, a.y, a.z, i, ax, ay, az));
        gs.forEach((g, i) => {
          const a = anchors[g.a];
          project(a.x + g.ox * spread, a.y + g.oy * spread, a.z + g.oz * spread, i, sx, sy, depth);
          sc[i] = (g.s * focal) / depth[i];
        });
        order.sort((i, j) => depth[j] - depth[i]);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        // anchor → Gaussian offsets, visible on hover
        if (hoverAmt > 0.02) {
          ctx.strokeStyle = rgba(C.ink, 0.22 * hoverAmt);
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          gs.forEach((g, i) => { ctx.moveTo(ax[g.a], ay[g.a]); ctx.lineTo(sx[i], sy[i]); });
          ctx.stroke();
        }

        ctx.globalCompositeOperation = C.dark ? "screen" : "source-over";
        for (const i of order) {
          const g = gs[i];
          const a = Math.max(0.15, Math.min(1, (6.2 - depth[i]) / 3.2));
          const spr = sprites[Math.floor(g.hue * N_SPR) % N_SPR];
          const major = (sc[i] * 3) / 32;
          const minor = major * g.asp;
          const th = g.rot + yaw * 0.6;
          const c = Math.cos(th), s = Math.sin(th);
          ctx.globalAlpha = a * 0.95;
          ctx.setTransform(dpr * major * c, dpr * major * s, -dpr * minor * s, dpr * minor * c, dpr * sx[i], dpr * sy[i]);
          ctx.drawImage(spr, -32, -32);
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;

        // anchors
        if (hoverAmt > 0.02) {
          ctx.fillStyle = rgba(C.ink, 0.85 * hoverAmt);
          anchors.forEach((_, i) => ctx.fillRect(ax[i] - 1.6, ay[i] - 1.6, 3.2, 3.2));
        }
      },
    };
  }

  /* ═════════════════════════ Arm ═════════════════════════ */

  function armScene() {
    const SEG = [
      { k: "joint", d: 1.0, a: "home", b: "aboveObj" },
      { k: "cart", d: 0.55, a: "aboveObj", b: "graspObj" },
      { k: "grip", d: 0.3, a: "graspObj", g: [0, 1] },
      { k: "cart", d: 0.5, a: "graspObj", b: "aboveObj" },
      { k: "joint", d: 1.3, a: "aboveObj", b: "aboveGoal" },
      { k: "cart", d: 0.55, a: "aboveGoal", b: "placeGoal" },
      { k: "grip", d: 0.3, a: "placeGoal", g: [1, 0] },
      { k: "cart", d: 0.45, a: "placeGoal", b: "aboveGoal" },
      { k: "joint", d: 0.95, a: "aboveGoal", b: "home" },
      { k: "wait", d: 0.5, a: "home" },
    ];
    const TOTAL = SEG.reduce((s, x) => s + x.d, 0);
    const rand = mulberry(3);

    const st = { obj: 0.27, goal: 0.73, pending: null, clock: 0, pulses: [] };
    let G = null; // geometry for the current size

    function geometry(w, h) {
      const table = h * 0.84;
      const s = Math.max(10, Math.min(18, h * 0.075));
      const fl = s * 0.95;
      const sxp = w / 2, syp = table - h * 0.1;
      const l1 = h * 0.36, l2 = h * 0.33;
      const minDx = Math.max(0.13 * w, 30);
      const maxDx = Math.min(0.4 * w, 0.6 * h);
      return { w, h, table, s, fl, sx: sxp, sy: syp, l1, l2, minDx, maxDx, hoverY: table - s - fl - h * 0.14, graspY: table - 0.25 * s - fl, homeX: w * 0.53, homeY: table - h * 0.66 };
    }

    // keep x (fraction of width) reachable and clear of the pedestal
    function clampX(fx) {
      const dx = fx * G.w - G.sx;
      const side = dx < 0 ? -1 : 1;
      const mag = Math.max(G.minDx, Math.min(G.maxDx, Math.abs(dx)));
      return (G.sx + side * mag) / G.w;
    }

    function ik(px, py) {
      const dx = px - G.sx, dy = py - G.sy;
      const d = Math.max(Math.abs(G.l1 - G.l2) + 1e-3, Math.min(G.l1 + G.l2 - 1e-3, Math.hypot(dx, dy)));
      const c2 = Math.max(-1, Math.min(1, (d * d - G.l1 * G.l1 - G.l2 * G.l2) / (2 * G.l1 * G.l2)));
      const base = Math.atan2(dy, dx);
      let best = null;
      for (const sgn of [1, -1]) {
        const q2 = sgn * Math.acos(c2);
        let q1 = base - Math.atan2(G.l2 * Math.sin(q2), G.l1 + G.l2 * Math.cos(q2));
        if (q1 > Math.PI / 2) q1 -= TAU; // keep elbow-up angles continuous
        const ey = G.sy + G.l1 * Math.sin(q1);
        if (!best || ey < best.ey) best = { q1, q2, ey };
      }
      return [best.q1, best.q2];
    }
    function fk(q1, q2) {
      const ex = G.sx + G.l1 * Math.cos(q1);
      const ey = G.sy + G.l1 * Math.sin(q1);
      return { ex, ey, x: ex + G.l2 * Math.cos(q1 + q2), y: ey + G.l2 * Math.sin(q1 + q2) };
    }
    function point(name) {
      const ox = st.obj * G.w, gx = st.goal * G.w;
      switch (name) {
        case "home": return [G.homeX, G.homeY];
        case "aboveObj": return [ox, G.hoverY];
        case "graspObj": return [ox, G.graspY];
        case "aboveGoal": return [gx, G.hoverY];
        default: return [gx, G.graspY]; // placeGoal
      }
    }
    function poseAt(time) {
      let t = Math.max(0, Math.min(TOTAL - 1e-6, time));
      let i = 0;
      while (t > SEG[i].d) { t -= SEG[i].d; i++; }
      const seg = SEG[i];
      const u = t / seg.d;
      const e = ease(u);
      let q, grip = i < 2 || i > 6 ? 0 : 1;
      if (seg.k === "joint") {
        const qa = ik(...point(seg.a)), qb = ik(...point(seg.b));
        q = [qa[0] + (qb[0] - qa[0]) * e, qa[1] + (qb[1] - qa[1]) * e];
      } else if (seg.k === "cart") {
        const pa = point(seg.a), pb = point(seg.b);
        q = ik(pa[0] + (pb[0] - pa[0]) * e, pa[1] + (pb[1] - pa[1]) * e);
      } else {
        q = ik(...point(seg.a));
        if (seg.k === "grip") grip = seg.g[0] + (seg.g[1] - seg.g[0]) * e;
      }
      const holding = (i === 2 && u > 0.6) || (i >= 3 && i <= 5) || (i === 6 && u < 0.5);
      return { q, grip, i, holding };
    }

    function nextGoal() {
      if (st.pending != null) { const g = st.pending; st.pending = null; return g; }
      for (let k = 0; k < 20; k++) {
        const g = clampX(0.12 + rand() * 0.76);
        if (Math.abs(g - st.obj) * G.w > G.s * 3) return g;
      }
      return clampX(1 - st.obj);
    }

    return {
      click(v, fx, fy) {
        if (!G) return;
        const g = clampX(fx);
        st.pulses.push({ x: fx * G.w, y: fy * G.h, t: 0 });
        if (Math.abs(g - st.obj) * G.w < G.s * 1.5) return; // that's where it already is
        const seg = poseAt(st.clock).i;
        if (seg <= 3) st.goal = g; else st.pending = g;
      },
      draw(v, t, dt) {
        const { ctx, w, h } = v;
        if (!G || G.w !== w || G.h !== h) {
          G = geometry(w, h);
          st.obj = clampX(st.obj);
          st.goal = clampX(st.goal);
        }
        st.clock += dt;
        if (st.clock >= TOTAL) {
          st.clock -= TOTAL;
          st.obj = st.goal;
          st.goal = nextGoal();
        }
        const now = poseAt(st.clock);
        const P = fk(now.q[0], now.q[1]);

        ctx.clearRect(0, 0, w, h);

        // table
        ctx.strokeStyle = C.line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w * 0.05, G.table + 0.5);
        ctx.lineTo(w * 0.95, G.table + 0.5);
        ctx.stroke();
        ctx.strokeStyle = rgba(C.ink3, 0.35);
        ctx.beginPath();
        for (let x = w * 0.06; x < w * 0.95; x += 9) { ctx.moveTo(x, G.table + 3); ctx.lineTo(x - 5, G.table + 9); }
        ctx.stroke();

        // goal (and a queued goal)
        const goalBox = (fx, alpha) => {
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = rgba(C.emb, alpha);
          ctx.lineWidth = 1.2;
          ctx.strokeRect(fx * w - G.s / 2, G.table - G.s, G.s, G.s);
          ctx.restore();
        };
        const placed = now.i >= 7 || (now.i === 6 && !now.holding);
        if (!placed) {
          goalBox(st.goal, 0.85);
          ctx.fillStyle = rgba(C.emb, 0.85);
          ctx.font = `500 10px ${C.mono}`;
          ctx.textAlign = "center";
          ctx.fillText("goal", st.goal * w, G.table - G.s - 6);
        }
        if (st.pending != null) goalBox(st.pending, 0.35);

        // click pulses
        st.pulses = st.pulses.filter((p) => (p.t += dt) < 0.6);
        for (const p of st.pulses) {
          ctx.strokeStyle = rgba(C.emb, 0.6 * (1 - p.t / 0.6));
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4 + p.t * 40, 0, TAU);
          ctx.stroke();
        }

        // predicted future end-effector path — the "world model" part
        for (let k = 1; k <= 16; k++) {
          const f = poseAt(st.clock + k * 0.075);
          const q = fk(f.q[0], f.q[1]);
          ctx.fillStyle = rgba(C.emb, 0.85 * (1 - k / 17));
          ctx.beginPath();
          ctx.arc(q.x, q.y, 2.3 - k * 0.08, 0, TAU);
          ctx.fill();
        }

        // ghost of the arm 0.6 s ahead
        const gh = poseAt(st.clock + 0.6);
        const GP = fk(gh.q[0], gh.q[1]);
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = rgba(C.ink3, 0.45);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(G.sx, G.sy);
        ctx.lineTo(GP.ex, GP.ey);
        ctx.lineTo(GP.x, GP.y);
        ctx.stroke();
        ctx.restore();

        // object
        const ox = now.holding ? P.x : (placed ? st.goal : st.obj) * w;
        const oy = now.holding ? P.y + 0.7 * G.s : G.table - G.s / 2;
        ctx.save();
        ctx.shadowColor = rgba(C.emb, 0.55);
        ctx.shadowBlur = 14;
        ctx.fillStyle = C.emb;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(ox - G.s / 2, oy - G.s / 2, G.s, G.s, 3);
        else ctx.rect(ox - G.s / 2, oy - G.s / 2, G.s, G.s);
        ctx.fill();
        ctx.restore();

        // pedestal
        ctx.fillStyle = rgba(C.ink3, 0.55);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(G.sx - 13, G.sy, 26, G.table - G.sy, [6, 6, 0, 0]);
        else ctx.rect(G.sx - 13, G.sy, 26, G.table - G.sy);
        ctx.fill();

        // links
        ctx.lineCap = "round";
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = Math.max(6, h * 0.04);
        ctx.beginPath();
        ctx.moveTo(G.sx, G.sy);
        ctx.lineTo(P.ex, P.ey);
        ctx.stroke();
        ctx.lineWidth = Math.max(5, h * 0.032);
        ctx.beginPath();
        ctx.moveTo(P.ex, P.ey);
        ctx.lineTo(P.x, P.y);
        ctx.stroke();

        // gripper (always pointing down)
        const open = G.s * 0.95, closed = G.s * 0.5 + 1.5;
        const half = open + (closed - open) * now.grip;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(P.x - half - 1, P.y);
        ctx.lineTo(P.x + half + 1, P.y);
        ctx.moveTo(P.x - half, P.y);
        ctx.lineTo(P.x - half, P.y + G.fl);
        ctx.moveTo(P.x + half, P.y);
        ctx.lineTo(P.x + half, P.y + G.fl);
        ctx.stroke();

        // joints
        ctx.fillStyle = C.card;
        ctx.lineWidth = 2;
        for (const [x, y, r] of [[G.sx, G.sy, 6], [P.ex, P.ey, 5.5], [P.x, P.y, 4]]) {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, TAU);
          ctx.fill();
          ctx.stroke();
        }
      },
    };
  }

  /* ═════════════════════════ harness ═════════════════════════ */

  const views = canvases.map((canvas) => {
    const kind = canvas.dataset.viz;
    const v = { canvas, ctx: canvas.getContext("2d"), w: 0, h: 0, dpr: 1, visible: false, hover: false, px: 0.5, py: 0.5 };
    v.scene = kind === "lidar" ? lidarScene() : kind === "splats" ? splatScene() : armScene();

    const card = canvas.closest(".arc__card") || canvas;
    card.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      v.px = (e.clientX - r.left) / r.width;
      v.py = (e.clientY - r.top) / r.height;
      v.hover = true;
      kick();
    });
    card.addEventListener("pointerleave", () => { v.hover = false; kick(); });
    if (v.scene.click) {
      canvas.addEventListener("click", (e) => {
        const r = canvas.getBoundingClientRect();
        v.scene.click(v, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
        kick();
      });
    }
    return v;
  });

  function size(v) {
    const r = v.canvas.getBoundingClientRect();
    v.dpr = Math.min(window.devicePixelRatio || 1, 2);
    v.w = r.width;
    v.h = r.height;
    v.canvas.width = Math.max(1, Math.round(r.width * v.dpr));
    v.canvas.height = Math.max(1, Math.round(r.height * v.dpr));
  }

  function render(v, t, dt) {
    if (!v.w || !v.h) return;
    v.ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    v.scene.draw(v, t, dt);
  }

  let running = false;
  let last = 0;
  let T = 3; // start a little into the motion

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    T += dt;
    let any = false;
    for (const v of views) {
      if (!v.visible) continue;
      any = true;
      render(v, T, dt);
    }
    if (any && !document.hidden) requestAnimationFrame(loop);
    else running = false;
  }

  function kick() {
    if (reduce) { views.forEach((v) => v.visible && render(v, T, 0)); return; }
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(loop);
  }

  const ro = "ResizeObserver" in window ? new ResizeObserver((entries) => {
    for (const e of entries) { const v = views.find((x) => x.canvas === e.target); if (v) size(v); }
    kick();
  }) : null;

  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    for (const e of entries) { const v = views.find((x) => x.canvas === e.target); if (v) v.visible = e.isIntersecting; }
    kick();
  }, { rootMargin: "60px" }) : null;

  views.forEach((v) => {
    size(v);
    if (ro) ro.observe(v.canvas);
    if (io) io.observe(v.canvas); else v.visible = true;
  });
  if (!ro) addEventListener("resize", () => { views.forEach(size); kick(); });

  const onTheme = () => { C = readColors(); views.forEach((v) => v.scene.themechange?.()); kick(); };
  document.addEventListener("themechange", onTheme);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) kick(); });
  kick();
})();
