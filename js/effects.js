/* Tova Digital: interactive effects.
   1. Sand: thousands of grains that part around the pointer and slowly settle back.
   2. Lighthouse beam: sweeps on its own, and turns toward the pointer.
   Both pause when off screen, and both stay still for people who prefer reduced motion. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- sand */
  function initSand(sec) {
    var cv = sec.querySelector('canvas'); if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var tones = ['rgba(122,99,67,.40)', 'rgba(255,251,240,.95)', 'rgba(217,198,165,.95)', 'rgba(160,134,92,.32)'];
    var W = 0, H = 0, groups = [[], [], [], []], R = 96, ptr = null, raf = 0, visible = false, built = false;

    function build() {
      var r = sec.getBoundingClientRect(); W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.min(26000, Math.round(W * H / 32)), i, g;
      groups = [[], [], [], []];
      for (i = 0; i < n; i++) {
        var x = Math.random() * W, y = Math.random() * H, roll = Math.random();
        g = { hx: x, hy: y, x: x, y: y, vx: 0, vy: 0, s: roll < 0.05 ? 1.9 : roll < 0.45 ? 1.2 : 0.9 };
        groups[roll < 0.30 ? 0 : roll < 0.52 ? 1 : roll < 0.86 ? 2 : 3].push(g);
      }
      built = true; draw();
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var t = 0; t < 4; t++) { ctx.fillStyle = tones[t]; var a = groups[t]; for (var i = 0; i < a.length; i++) { var g = a[i]; ctx.fillRect(g.x, g.y, g.s, g.s); } }
    }
    function step() {
      var moving = 0, rr = R * R;
      for (var t = 0; t < 4; t++) {
        var a = groups[t];
        for (var i = 0; i < a.length; i++) {
          var g = a[i];
          if (ptr) {
            var dx = g.x - ptr.x, dy = g.y - ptr.y, d2 = dx * dx + dy * dy;
            if (d2 < rr) { var d = Math.sqrt(d2) || 1, f = 1 - d / R; f = f * f * 5.2; g.vx += dx / d * f; g.vy += dy / d * f; }
          }
          g.vx += (g.hx - g.x) * 0.011; g.vy += (g.hy - g.y) * 0.011;
          g.vx *= 0.88; g.vy *= 0.88; g.x += g.vx; g.y += g.vy;
          if (Math.abs(g.vx) + Math.abs(g.vy) > 0.03 || Math.abs(g.hx - g.x) + Math.abs(g.hy - g.y) > 0.4) moving++;
        }
      }
      return moving;
    }
    function loop() { var m = step(); draw(); raf = (visible && (ptr || m > 0)) ? requestAnimationFrame(loop) : 0; }
    function kick() { if (!raf && visible && built) raf = requestAnimationFrame(loop); }

    var io = new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible && !built) build(); if (visible) kick(); }, { rootMargin: '120px' });
    io.observe(sec);
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (visible) build(); else built = false; }, 200); });
    if (reduce) return; // a still beach for people who prefer no motion
    function at(e) { var r = sec.getBoundingClientRect(); ptr = { x: e.clientX - r.left, y: e.clientY - r.top }; kick(); }
    sec.addEventListener('pointermove', at);
    sec.addEventListener('pointerdown', at);
    ['pointerleave', 'pointerup', 'pointercancel'].forEach(function (n) { sec.addEventListener(n, function () { ptr = null; kick(); }); });
  }

  /* ------------------------------------------------------- lighthouse beam */
  function initBeam(sec) {
    var lamp = sec.querySelector('[data-beam-lamp]'), ray = sec.querySelector('.beam__ray'); if (!lamp || !ray) return;
    var ang = 6, target = 6, ptr = null, ox = 0, oy = 0, visible = false, raf = 0, t0 = performance.now(), idle;
    function origin() {
      var s = sec.getBoundingClientRect(), l = lamp.getBoundingClientRect();
      ox = l.left + l.width / 2 - s.left; oy = l.top + l.height / 2 - s.top; ray.style.left = ox + 'px'; ray.style.top = oy + 'px';
    }
    function frame(now) {
      origin();
      if (ptr) { var a = Math.atan2(ptr.y - oy, ptr.x - ox) * 180 / Math.PI; target = Math.max(-72, Math.min(72, a)); }
      else target = 8 + Math.sin((now - t0) / 1900) * 36;           // a slow, steady sweep when nobody is pointing
      ang += (target - ang) * 0.08; ray.style.transform = 'rotate(' + ang.toFixed(2) + 'deg)';
      raf = visible ? requestAnimationFrame(frame) : 0;
    }
    if (reduce) { // beam held still, pointing at the words: no sweep, no following
      origin(); ray.style.transform = 'rotate(6deg)';
      new IntersectionObserver(function () { origin(); }, { rootMargin: '80px' }).observe(sec); window.addEventListener('resize', origin); return;
    }
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); }, { rootMargin: '80px' }).observe(sec);
    function at(e) { var r = sec.getBoundingClientRect(); ptr = { x: e.clientX - r.left, y: e.clientY - r.top }; clearTimeout(idle); idle = setTimeout(function () { ptr = null; }, 2600); }
    sec.addEventListener('pointermove', at); sec.addEventListener('pointerdown', at);
    sec.addEventListener('pointerleave', function () { clearTimeout(idle); idle = setTimeout(function () { ptr = null; }, 900); });
    window.addEventListener('resize', origin);
  }

  /* ------------------------------------ home banner: gold dust blown around the main picture */
  function initHeroSand(wrap) {
    var cv = wrap.querySelector('canvas'); if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var tones = ['rgba(205,165,80,.62)', 'rgba(228,198,120,.55)', 'rgba(168,123,44,.50)'];
    var W = 0, H = 0, groups = [[], [], []], R = 92, ptr = null, raf = 0, visible = false, built = false, t0 = performance.now();
    function rel(r, b) { return { l: r.left - b.left, t: r.top - b.top, r: r.right - b.left, b: r.bottom - b.top }; }
    function textRects(b) {
      var out = [];
      wrap.querySelectorAll('.hero .eyebrow, .hero .display, .hero .lead, .hero .actions .btn, .hero .actions .text-link').forEach(function (el) {
        var rg = document.createRange(); rg.selectNodeContents(el);
        Array.prototype.forEach.call(el.classList.contains('btn') ? [el.getBoundingClientRect()] : rg.getClientRects(), function (r) { if (r.width > 2) out.push(rel(r, b)); });
      });
      return out;
    }
    function inside(x, y, rects, pad) { for (var i = 0; i < rects.length; i++) { var r = rects[i]; if (x > r.l - pad && x < r.r + pad && y > r.t - pad && y < r.b + pad) return true; } return false; }
    function build() {
      var b = wrap.getBoundingClientRect(); W = Math.max(1, Math.round(b.width)); H = Math.max(1, Math.round(b.height));
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      groups = [[], [], []];
      var texts = textRects(b), img = wrap.querySelector('.photo--hero'), I = img ? rel(img.getBoundingClientRect(), b) : null;
      if (I) {
        var n = Math.round(Math.min(3200, W * H / 480)), tries = 0, got = 0, pad = 110;
        while (got < n && tries++ < n * 12) {
          var x = I.l - pad + Math.random() * (I.r - I.l + 2 * pad), y = I.t - pad + Math.random() * (I.b - I.t + 2 * pad);
          if (x < 2 || y < 2 || x > W - 2 || y > H - 2) continue;
          var dx = Math.max(I.l - x, 0, x - I.r), dy = Math.max(I.t - y, 0, y - I.b), d = Math.hypot(dx, dy), inner = Math.min(x - I.l, I.r - x, y - I.t, I.b - y);
          if (d === 0 && inner > 34) continue;                       // not across the middle of the photo
          if (Math.random() > Math.exp(-d / 58) * (d === 0 ? 0.6 : 1)) continue;
          if (inside(x, y, texts, 12)) continue;
          var r = Math.random();
          groups[r < 0.5 ? 0 : r < 0.8 ? 1 : 2].push({ x: x, y: y, hx: x, hy: y, vx: 0, vy: 0, p: Math.random() * 6.283, amp: 3, s: Math.random() < 0.07 ? 2.2 : Math.random() < 0.45 ? 1.5 : 1.1 });
          got++;
        }
      }
      built = true; draw();
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var t = 0; t < 3; t++) { ctx.fillStyle = tones[t]; var a = groups[t]; for (var i = 0; i < a.length; i++) { var g = a[i]; ctx.fillRect(g.x, g.y, g.s, g.s); } }
    }
    function step(now) {
      var rr = R * R, tm = now - t0;
      for (var t = 0; t < 3; t++) {
        var a = groups[t];
        for (var i = 0; i < a.length; i++) {
          var g = a[i];
          if (ptr) { var dx = g.x - ptr.x, dy = g.y - ptr.y, d2 = dx * dx + dy * dy; if (d2 < rr) { var d = Math.sqrt(d2) || 1, f = 1 - d / R; f = f * f * 5.4; g.vx += dx / d * f; g.vy += dy / d * f; } }
          var tx = g.hx + Math.sin(tm * 0.0011 + g.p) * g.amp, ty = g.hy + Math.cos(tm * 0.0009 + g.p * 1.7) * g.amp;   // grains drift very slightly, like dust in light
          g.vx += (tx - g.x) * 0.011; g.vy += (ty - g.y) * 0.011; g.vx *= 0.88; g.vy *= 0.88; g.x += g.vx; g.y += g.vy;
        }
      }
    }
    function loop(now) { step(now); draw(); raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0; }
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible && !built) build(); if (visible && !raf && !reduce) raf = requestAnimationFrame(loop); }, { rootMargin: '100px' }).observe(wrap);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && visible && !raf && !reduce) raf = requestAnimationFrame(loop); });
    var rt, redo = function () { clearTimeout(rt); rt = setTimeout(function () { built = false; if (visible) build(); }, 220); };
    window.addEventListener('resize', redo); window.addEventListener('load', redo);
    var im = wrap.querySelector('.photo--hero'); if (im && !im.complete) im.addEventListener('load', redo);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(redo);
    if (reduce) return; // still sand for people who prefer no motion
    function at(e) { var r = wrap.getBoundingClientRect(); ptr = { x: e.clientX - r.left, y: e.clientY - r.top }; }
    wrap.addEventListener('pointermove', at); wrap.addEventListener('pointerdown', at);
    ['pointerleave', 'pointerup', 'pointercancel'].forEach(function (n) { wrap.addEventListener(n, function () { ptr = null; }); });
  }

  /* ------------------------------------------------ the whole page: a light layer of gold dust */
  function initPageSand() {
    if (reduce) return; // nothing at all for people who prefer no motion
    var cv = document.createElement('canvas'); cv.className = 'page-sand'; cv.setAttribute('aria-hidden', 'true'); document.body.appendChild(cv);
    var ctx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0, grains = [], R = 84, ptr = null, raf = 0, t0 = performance.now();
    var tones = ['rgba(205,165,80,.50)', 'rgba(228,198,120,.55)', 'rgba(168,123,44,.42)'];
    function build() {
      W = window.innerWidth; H = window.innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(2200, W * H / (W < 700 ? 1500 : 900))); grains = [];
      for (var i = 0; i < n; i++) { var x = Math.random() * W, y = Math.random() * H, r = Math.random(); grains.push({ x: x, y: y, bx: x, by: y, vx: 0, vy: 0, d: 0.06 + Math.random() * 0.3, p: Math.random() * 6.283, tone: r < 0.45 ? 0 : r < 0.8 ? 1 : 2, s: r > 0.96 ? 2 : r > 0.6 ? 1.4 : 1 }); }
    }
    function frame(now) {
      var tm = now - t0, sy = window.scrollY || 0, rr = R * R;
      ctx.clearRect(0, 0, W, H);
      for (var t = 0; t < 3; t++) {
        ctx.fillStyle = tones[t];
        for (var i = 0; i < grains.length; i++) {
          var g = grains[i]; if (g.tone !== t) continue;
          var hy = (((g.by - sy * g.d) % H) + H) % H, hx = g.bx + Math.sin(tm * 0.0008 + g.p) * 4;     // slides gently as you scroll: nearer grains move more
          if (Math.abs(hy - g.y) > H * 0.5) { g.y = hy; g.vy = 0; }                                        // wrapped round the screen: reappear at the other edge
          if (ptr) { var dx = g.x - ptr.x, dy = g.y - ptr.y, d2 = dx * dx + dy * dy; if (d2 < rr) { var d = Math.sqrt(d2) || 1, f = 1 - d / R; f = f * f * 4.2; g.vx += dx / d * f; g.vy += dy / d * f; } }
          g.vx += (hx - g.x) * 0.012; g.vy += (hy - g.y) * 0.012; g.vx *= 0.88; g.vy *= 0.88; g.x += g.vx; g.y += g.vy;
          ctx.fillRect(g.x, g.y, g.s, g.s);
        }
      }
      raf = document.hidden ? 0 : requestAnimationFrame(frame);
    }
    build(); raf = requestAnimationFrame(frame);
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 200); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden && !raf) raf = requestAnimationFrame(frame); });
    function at(e) { ptr = { x: e.clientX, y: e.clientY }; }
    window.addEventListener('pointermove', at, { passive: true }); window.addEventListener('pointerdown', at, { passive: true });
    document.addEventListener('pointerleave', function () { ptr = null; }); window.addEventListener('blur', function () { ptr = null; });
    ['pointerup', 'pointercancel'].forEach(function (n) { window.addEventListener(n, function (e) { if (e.pointerType === 'touch') ptr = null; }); });
  }

  function ready() { document.querySelectorAll('[data-sand]').forEach(initSand); document.querySelectorAll('[data-beam-scene]').forEach(initBeam); document.querySelectorAll('[data-hero-sand]').forEach(initHeroSand); initPageSand(); }
  if ('IntersectionObserver' in window) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready(); }
})();
