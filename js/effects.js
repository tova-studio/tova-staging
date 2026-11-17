/* Tova Digital: interactive effects.
   1. Sand (the sand-coloured banner only): thousands of grains that part around the pointer and slowly settle back.
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

  function ready() { document.querySelectorAll('[data-sand]').forEach(initSand); document.querySelectorAll('[data-beam-scene]').forEach(initBeam); }
  if ('IntersectionObserver' in window) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready(); }
})();
