/*
 * The hero portrait, re-drawn live as a few thousand anisotropic 2D Gaussians (WebGL2).
 *
 * 1. The white backdrop is removed with a flood fill from the image border.
 * 2. The photo is split by a quadtree that only refines where there is detail
 *    (the same intuition as densification in 3DGS). Every node becomes one Gaussian,
 *    stretched along the local edge direction from the structure tensor.
 * 3. Levels fade in coarse-to-fine, like watching a fit converge.
 *
 * The pointer pushes splats aside, a click sends a ripple, and the hero verbs
 * ("perceive / reconstruct / act") switch modes. Without WebGL2 the plain photo is shown.
 */
(() => {
  "use strict";

  const fig = document.querySelector("[data-portrait]");
  if (!fig) return;

  const stage = fig.querySelector("[data-stage]");
  const img = fig.querySelector(".portrait__img");
  const glCanvas = fig.querySelector(".portrait__gl");
  const photoCanvas = fig.querySelector(".portrait__photo");
  const hud = fig.querySelector("[data-hud]");
  const confEl = fig.querySelector("[data-conf]");
  const segBtns = Array.from(fig.querySelectorAll(".seg [data-mode]"));
  const replayBtn = fig.querySelector("[data-replay]");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const AW = 240;        // analysis width in px
  const ROOT = 32;       // quadtree root cell
  const MAX_DEPTH = 4;   // 32 → 16 → 8 → 4 → 2 px
  const P_END = MAX_DEPTH + 1.3;
  const FIT_MS = 3200;
  const ITERS = 30000;
  const fmt = (n) => Math.round(n).toLocaleString("en-US");

  let mode = "gaussians"; // what the segmented control says
  let tempMode = null;    // preview while hovering a verb

  function fallback() {
    fig.classList.add("no-gl");
    fig.dataset.mode = "photo";
    if (hud) hud.textContent = "fig. 1 — me";
  }

  const gl = glCanvas.getContext("webgl2", {
    alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false,
  });
  if (!gl) { fallback(); return; }

  const imageReady = (img.complete && img.naturalWidth > 0)
    ? Promise.resolve()
    : new Promise((res, rej) => {
        img.addEventListener("load", res, { once: true });
        img.addEventListener("error", rej, { once: true });
      });

  imageReady
    .then(() => (img.decode ? img.decode().catch(() => {}) : null))
    .then(start)
    .catch((err) => { console.warn("[portrait]", err); fallback(); });

  /* ───────────────────────── image analysis ───────────────────────── */

  function readPixels(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h).data; // throws if the canvas is tainted (file://)
  }

  function filter3x3(a, W, H, op) {
    const o = new Float32Array(a.length);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let acc = op === "min" ? 1 : 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= H) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= W) continue;
            const v = a[yy * W + xx];
            if (op === "min") { if (v < acc) acc = v; } else { acc += v; n++; }
          }
        }
        o[y * W + x] = op === "min" ? acc : acc / n;
      }
    }
    return o;
  }

  // Background = near-white pixels connected to the image border.
  function computeMatte(d, W, H) {
    const N = W * H;
    const bg = new Uint8Array(N);
    const stack = [];
    const isWhite = (i) => {
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      const lo = Math.min(r, g, b);
      return lo > 232 && Math.max(r, g, b) - lo < 22;
    };
    const seed = (i) => { if (!bg[i] && isWhite(i)) { bg[i] = 1; stack.push(i); } };
    for (let x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }
    while (stack.length) {
      const i = stack.pop();
      const x = i % W;
      if (x > 0) seed(i - 1);
      if (x < W - 1) seed(i + 1);
      if (i >= W) seed(i - W);
      if (i < N - W) seed(i + W);
    }
    let a = new Float32Array(N);
    for (let i = 0; i < N; i++) a[i] = bg[i] ? 0 : 1;
    a = filter3x3(a, W, H, "min"); // erode: drop the light fringe around the hair
    a = filter3x3(a, W, H, "avg");
    a = filter3x3(a, W, H, "avg");
    return a;
  }

  function halve(a, W, H) {
    const w = W >> 1, h = H >> 1;
    const o = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = 2 * y * W + 2 * x;
        o[y * w + x] = (a[i] + a[i + 1] + a[i + W] + a[i + W + 1]) * 0.25;
      }
    }
    return o;
  }

  function mulberry(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function buildSplats(d, alpha, W, H) {
    const N = W * H;
    const L = new Float32Array(N);
    for (let i = 0; i < N; i++) L[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    const gx = new Float32Array(N);
    const gy = new Float32Array(N);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        gx[i] = (L[i + 1] - L[i - 1]) * 0.5;
        gy[i] = (L[i + W] - L[i - W]) * 0.5;
      }
    }

    const rand = mulberry(20231130);
    const out = [];

    const visit = (x0, y0, size, depth) => {
      const x1 = Math.min(x0 + size, W);
      const y1 = Math.min(y0 + size, H);
      if (x1 <= x0 || y1 <= y0) return;

      let n = 0, sa = 0, cxS = 0, cyS = 0, wc = 0, sr = 0, sg = 0, sb = 0, sl = 0, sl2 = 0, jxx = 0, jxy = 0, jyy = 0;
      let wk = 0, kr = 0, kg = 0, kb = 0; // colors from well-inside pixels only (no white fringe)
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = y * W + x;
          const a = alpha[i];
          n++;
          sa += a;
          cxS += a * (x + 0.5);
          cyS += a * (y + 0.5);
          if (a < 0.45) continue;
          if (a > 0.85) {
            wk += a;
            kr += a * d[i * 4];
            kg += a * d[i * 4 + 1];
            kb += a * d[i * 4 + 2];
          }
          wc += a;
          sr += a * d[i * 4];
          sg += a * d[i * 4 + 1];
          sb += a * d[i * 4 + 2];
          sl += a * L[i];
          sl2 += a * L[i] * L[i];
          jxx += a * gx[i] * gx[i];
          jxy += a * gx[i] * gy[i];
          jyy += a * gy[i] * gy[i];
        }
      }
      const cov = sa / n;
      if (cov < 0.03 || wc < 0.45) return;

      const mean = sl / wc;
      const std = Math.sqrt(Math.max(0, sl2 / wc - mean * mean));
      const split = depth < MAX_DEPTH && (std > 7 || cov < 0.94);

      // orientation: along the edge (perpendicular to the dominant gradient)
      let th = rand() * Math.PI;
      let coh = 0;
      const tr = jxx + jyy;
      if (tr > 1e-6) {
        coh = Math.sqrt((jxx - jyy) * (jxx - jyy) + 4 * jxy * jxy) / tr;
        if (coh > 0.12) th = 0.5 * Math.atan2(2 * jxy, jxx - jyy) + Math.PI / 2;
      }
      const cell = Math.max(x1 - x0, y1 - y0);
      const k = Math.min(coh, 0.85) * (split ? 0.55 : 1);
      const base = cell * (split ? 0.46 : 0.58) * (0.62 + 0.38 * cov);
      // edge cells: darken toward the inner color so the outline doesn't glow
      const [cr, cg, cb] = wk > 0.5 ? [kr / wk, kg / wk, kb / wk] : [sr / wc * 0.9, sg / wc * 0.9, sb / wc * 0.9];
      const jitter = split ? 0 : 0.22 * cell;

      // Coarse nodes on the silhouette would smear a halo around the head; only leaves draw the outline.
      if (!split || cov >= 0.995) {
        out.push({
          x: cxS / sa + (rand() - 0.5) * jitter,
          y: cyS / sa + (rand() - 0.5) * jitter,
          sx: base * (1 + 0.75 * k) * (1 + 0.2 * rand()),
          sy: base * (1 - 0.45 * k) * (1 - 0.12 * rand()),
          r: cr / 255,
          g: cg / 255,
          b: cb / 255,
          a: Math.min(1, cov * 1.08) * (split ? 0.9 : 0.97),
          th,
          level: depth,
          rnd: rand(),
          leaf: split ? 0 : 1,
        });
      }

      if (split) {
        const s = size / 2;
        visit(x0, y0, s, depth + 1);
        visit(x0 + s, y0, s, depth + 1);
        visit(x0, y0 + s, s, depth + 1);
        visit(x0 + s, y0 + s, s, depth + 1);
      }
    };

    for (let y = 0; y < H; y += ROOT) for (let x = 0; x < W; x += ROOT) visit(x, y, ROOT, 0);
    // coarse first; within a level, big before small so detail lands on top
    out.sort((p, q) => p.level - q.level || q.sx * q.sy - p.sx * p.sy);
    return out;
  }

  /* ───────────────────────── WebGL ───────────────────────── */

  const VS = `#version 300 es
    precision highp float;
    layout(location = 0) in vec2 a_corner;
    layout(location = 1) in vec4 a_geom;   // center.xy, sigma.xy   (analysis px)
    layout(location = 2) in vec4 a_color;  // rgb, opacity
    layout(location = 3) in vec4 a_meta;   // angle, level, rand, isLeaf
    uniform vec2 u_view;      // canvas size, device px
    uniform vec2 u_scale;     // analysis px -> device px
    uniform float u_progress; // 0 .. levels
    uniform float u_points;   // 0 = splats, 1 = point cloud
    uniform vec3 u_mouse;     // xy, strength
    uniform vec4 u_ripple;    // xy, age (s), amplitude
    uniform float u_time;
    uniform float u_breath;
    out vec2 v_uv;
    out vec4 v_color;

    void main() {
      float angle = a_meta.x, level = a_meta.y, rnd = a_meta.z, leaf = a_meta.w;

      float t = clamp((u_progress - level - rnd * 0.55) / 0.6, 0.0, 1.0);
      float grow = t * t * (3.0 - 2.0 * t);

      vec2 c = a_geom.xy;
      c += u_breath * (0.22 + 0.3 * leaf) * vec2(sin(u_time * 1.3 + rnd * 61.0), cos(u_time * 1.1 + rnd * 37.0));

      vec2 d = c - u_mouse.xy;
      float f = exp(-dot(d, d) / 560.0) * u_mouse.z;
      c += d / (length(d) + 1e-3) * f * 7.0;

      vec2 rv = a_geom.xy - u_ripple.xy;
      float rd = length(rv);
      float wave = u_ripple.w * exp(-pow((rd - u_ripple.z * 135.0) / 13.0, 2.0));
      c += rv / (rd + 1e-3) * wave * 5.0;

      // level of detail: a coarse node shrinks to a faint underpainting once its children have arrived
      float handoff = (1.0 - leaf) * smoothstep(level + 1.4, level + 2.3, u_progress);
      float lod = 1.0 - 0.5 * handoff;

      vec2 s = a_geom.zw * grow * (1.0 - 0.25 * handoff);
      float dotR = clamp(0.4 * max(a_geom.z, a_geom.w), 0.55, 2.1) * mix(0.8, 1.1, rnd) * grow;
      s = mix(s, vec2(dotR), u_points);
      s *= (1.0 - 0.5 * f) * (1.0 + 0.5 * wave);

      vec2 off = a_corner * s * 3.0;
      float cs = cos(angle), sn = sin(angle);
      off = vec2(cs * off.x - sn * off.y, sn * off.x + cs * off.y);

      vec2 p = (c + off) * u_scale / u_view * 2.0 - 1.0;
      gl_Position = vec4(p.x, -p.y, 0.0, 1.0);

      v_uv = a_corner * 3.0;
      v_color = vec4(a_color.rgb, a_color.a * grow * lod * mix(1.0, leaf, u_points));
    }`;

  const FS = `#version 300 es
    precision highp float;
    in vec2 v_uv;
    in vec4 v_color;
    uniform float u_points;
    out vec4 o;
    void main() {
      float r2 = dot(v_uv, v_uv);
      float gauss = exp(-0.5 * r2);
      float disc = 1.0 - smoothstep(0.8, 1.0, sqrt(r2));
      float a = v_color.a * mix(gauss, disc, u_points);
      if (a < 0.003) discard;
      o = vec4(v_color.rgb * a, a);
    }`;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || "shader");
    return sh;
  }

  function createRenderer(splats) {
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "link");

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const data = new Float32Array(splats.length * 12);
    splats.forEach((s, i) => data.set([s.x, s.y, s.sx, s.sy, s.r, s.g, s.b, s.a, s.th, s.level, s.rnd, s.leaf], i * 12));
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    for (let k = 0; k < 3; k++) {
      gl.enableVertexAttribArray(1 + k);
      gl.vertexAttribPointer(1 + k, 4, gl.FLOAT, false, 48, k * 16);
      gl.vertexAttribDivisor(1 + k, 1);
    }
    gl.bindVertexArray(null);

    const U = {};
    ["u_view", "u_scale", "u_progress", "u_points", "u_mouse", "u_ripple", "u_time", "u_breath"]
      .forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

    return { prog, vao, U, count: splats.length };
  }

  /* ───────────────────────── main ───────────────────────── */

  function start() {
    const AH = Math.round((AW * img.naturalHeight) / img.naturalWidth);
    const MW = AW * 2;
    const MH = AH * 2;

    const big = readPixels(MW, MH);
    const matte = computeMatte(big, MW, MH);
    const small = readPixels(AW, AH);
    const splats = buildSplats(small, halve(matte, MW, MH), AW, AH);
    const R = createRenderer(splats);
    const U = R.U;

    // when each splat becomes visible during the fit — for the live counter
    const thresholds = Float32Array.from(splats, (s) => s.level + s.rnd * 0.55 + 0.15).sort();
    const visibleAt = (p) => {
      let lo = 0, hi = thresholds.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (thresholds[m] < p) lo = m + 1; else hi = m; }
      return lo;
    };

    // matted photo for "photo" mode
    const mask = document.createElement("canvas");
    mask.width = MW;
    mask.height = MH;
    const mctx = mask.getContext("2d");
    const md = mctx.createImageData(MW, MH);
    for (let i = 0; i < MW * MH; i++) md.data[i * 4 + 3] = Math.round(matte[i] * 255);
    mctx.putImageData(md, 0, 0);

    function paintPhoto(w, h) {
      if (photoCanvas.width === w && photoCanvas.height === h && photoCanvas.dataset.ok) return;
      photoCanvas.width = w;
      photoCanvas.height = h;
      const c = photoCanvas.getContext("2d");
      c.imageSmoothingQuality = "high";
      c.drawImage(img, 0, 0, w, h);
      c.globalCompositeOperation = "destination-in";
      c.drawImage(mask, 0, 0, w, h);
      c.globalCompositeOperation = "source-over";
      photoCanvas.dataset.ok = "1";
    }

    function resize() {
      const r = stage.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(r.width * dpr));
      const h = Math.max(1, Math.round(r.height * dpr));
      if (glCanvas.width !== w || glCanvas.height !== h) {
        glCanvas.width = w;
        glCanvas.height = h;
      }
      paintPhoto(w, h);
      kick();
    }

    /* state */
    const t0 = performance.now();
    let progress = reduce ? P_END : 0;
    let fitting = !reduce;
    let fitStart = null; // set on the first frame actually drawn, so a background tab doesn't skip the fit
    let pts = 0;
    let ptsTarget = 0;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0, s: 0, ts: 0 };
    const ripple = { x: 0, y: 0, at: -1e9 };
    let onScreen = true;
    let running = false;
    let last = t0;
    let fitAnnounced = false;

    const easeInOut = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);

    function setHud(text) { if (hud && hud.textContent !== text) hud.textContent = text; }

    function finishFit() {
      fig.classList.add("is-fit");
      setHud(`fig. 1 — me, in ${fmt(R.count)} Gaussians`);
      if (!fitAnnounced) {
        fitAnnounced = true;
        document.dispatchEvent(new CustomEvent("portrait:fit", { detail: { count: R.count } }));
      }
      if (confEl && !reduce) {
        const c0 = performance.now();
        const tick = (now) => {
          const k = Math.min(1, (now - c0) / 700);
          confEl.textContent = (0.99 * (1 - Math.pow(1 - k, 3))).toFixed(2);
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }

    function draw(now) {
      const time = (now - t0) / 1000;
      const age = (now - ripple.at) / 1000;
      const amp = Math.max(0, 1 - age / 2.2);

      gl.viewport(0, 0, glCanvas.width, glCanvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(R.prog);
      gl.bindVertexArray(R.vao);
      gl.uniform2f(U.u_view, glCanvas.width, glCanvas.height);
      gl.uniform2f(U.u_scale, glCanvas.width / AW, glCanvas.height / AH);
      gl.uniform1f(U.u_progress, progress);
      gl.uniform1f(U.u_points, pts);
      gl.uniform3f(U.u_mouse, mouse.x, mouse.y, mouse.s);
      gl.uniform4f(U.u_ripple, ripple.x, ripple.y, age, amp);
      gl.uniform1f(U.u_time, time);
      gl.uniform1f(U.u_breath, reduce ? 0 : 1);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, R.count);
      gl.bindVertexArray(null);
      return amp > 0;
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (fitting) {
        if (fitStart === null) fitStart = now;
        const t = Math.max(0, Math.min(1, (now - fitStart) / FIT_MS));
        progress = P_END * easeInOut(t);
        setHud(`iter ${fmt(Math.round((t * ITERS) / 10) * 10)} · ${fmt(visibleAt(progress))} Gaussians`);
        if (t >= 1) { fitting = false; finishFit(); }
      }

      pts += (ptsTarget - pts) * (1 - Math.exp(-dt * 7));
      if (Math.abs(ptsTarget - pts) < 0.001) pts = ptsTarget;
      const follow = 1 - Math.exp(-dt * 14);
      mouse.x += (mouse.tx - mouse.x) * follow;
      mouse.y += (mouse.ty - mouse.y) * follow;
      mouse.s += (mouse.ts - mouse.s) * (1 - Math.exp(-dt * 6));

      const rippling = draw(now);
      const busy = fitting || pts !== ptsTarget || mouse.s > 0.002 || rippling || !reduce;
      if (busy && onScreen && !document.hidden && fig.dataset.mode !== "photo") {
        requestAnimationFrame(frame);
      } else {
        running = false;
      }
    }

    function kick() {
      if (running) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    }

    function applyMode() {
      const m = tempMode || mode;
      fig.dataset.mode = m;
      ptsTarget = m === "points" ? 1 : 0;
      if (reduce) pts = ptsTarget;
      segBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
      if (m !== "photo") kick();
    }

    function refit() {
      fig.classList.remove("is-fit");
      if (reduce) { finishFit(); kick(); return; }
      fitting = true;
      fitStart = null;
      progress = 0;
      kick();
    }

    function rippleAt(x, y) {
      if (reduce) return;
      ripple.x = x;
      ripple.y = y;
      ripple.at = performance.now();
      kick();
    }

    const toAnalysis = (e) => {
      const r = stage.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * AW, ((e.clientY - r.top) / r.height) * AH];
    };

    /* events */
    stage.addEventListener("pointermove", (e) => {
      if (reduce) return;
      const [x, y] = toAnalysis(e);
      if (mouse.s < 0.01) { mouse.x = x; mouse.y = y; }
      mouse.tx = x;
      mouse.ty = y;
      mouse.ts = 1;
      kick();
    });
    stage.addEventListener("pointerleave", () => { mouse.ts = 0; kick(); });
    stage.addEventListener("click", (e) => { const [x, y] = toAnalysis(e); rippleAt(x, y); });

    segBtns.forEach((b) => b.addEventListener("click", () => { mode = b.dataset.mode; applyMode(); }));
    replayBtn?.addEventListener("click", () => {
      if (mode === "photo") { mode = "gaussians"; applyMode(); }
      refit();
    });

    // hero verbs: perceive → point cloud, reconstruct → re-fit, act → ripple
    document.querySelectorAll("[data-verb]").forEach((el) => {
      const verb = el.dataset.verb;
      const on = () => {
        el.classList.add("is-on");
        if (verb === "points") tempMode = "points";
        else if (mode === "photo" || tempMode) tempMode = "gaussians";
        applyMode();
        if (verb === "refit" && !fitting) refit();
        if (verb === "ripple") rippleAt(AW * 0.5, AH * 0.4);
      };
      const off = () => {
        el.classList.remove("is-on");
        if (tempMode) { tempMode = null; applyMode(); }
      };
      el.addEventListener("pointerenter", on);
      el.addEventListener("pointerleave", off);
      el.addEventListener("focus", on);
      el.addEventListener("blur", off);
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) kick(); }).observe(stage);
    }
    document.addEventListener("visibilitychange", () => { if (!document.hidden) kick(); });
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
    else addEventListener("resize", resize);

    glCanvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); fallback(); });

    fig.classList.add("is-ready");
    resize();
    applyMode();
    if (reduce) finishFit();
  }
})();
