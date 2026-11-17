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
    var scope = sec.closest('[data-sand-scope]') || sec;   // the sand can listen to a larger area than the sand itself
    function at(e) { var r = sec.getBoundingClientRect(); ptr = { x: e.clientX - r.left, y: e.clientY - r.top }; kick(); }
    scope.addEventListener('pointermove', at);
    scope.addEventListener('pointerdown', at);
    ['pointerleave', 'pointerup', 'pointercancel'].forEach(function (n) { scope.addEventListener(n, function () { ptr = null; kick(); }); });
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

  /* ------------------------------------------ home banner: a floating lighthouse */
  function initHeroStage(wrap) {
    var obj = wrap.querySelector('.hero-obj'), beam = wrap.querySelector('.hero-beam'), img = wrap.querySelector('.photo--hero'), hero = wrap.querySelector('.hero');
    if (!obj || !beam || !img || !hero) return;
    var RATIO = 520 / 889, LAMP = { x: 0.50, y: 0.20 }, g = { on: false, Hl: 0, lw: 0, ox: 0, oy: 0, lx: 0, ly: 0, W: 0 };
    var mx = 0, my = 0, tx = 0, ty = 0, ang = 180, tAng = 180, ptr = null, visible = false, raf = 0, idle, t0 = performance.now();

    function rects(b) {
      var out = [];
      wrap.querySelectorAll('.hero .eyebrow, .hero .display, .hero .lead, .hero .actions .cta-circle, .hero .actions .text-link').forEach(function (el) {
        var rg = document.createRange(); rg.selectNodeContents(el);
        Array.prototype.forEach.call(el.classList.contains('cta-circle') ? [el.getBoundingClientRect()] : rg.getClientRects(), function (r) { if (r.width > 2) out.push({ l: r.left - b.left, t: r.top - b.top, r: r.right - b.left, b: r.bottom - b.top }); });
      });
      return out;
    }
    function offsetTopIn(el, root) { var y = 0; while (el && el !== root) { y += el.offsetTop; el = el.offsetParent; } return y; }
    function offsetLeftIn(el, root) { var x = 0; while (el && el !== root) { x += el.offsetLeft; el = el.offsetParent; } return x; }   // position without any slide-in movement
    function layout() {
      var b = wrap.getBoundingClientRect(), W = b.width, base = offsetTopIn(img, wrap), pr = offsetLeftIn(img, wrap) + img.offsetWidth, texts = rects(b), Hl, lw, cx, top, fit = 0;
      if (W < 980) { wrap.classList.add('is-off'); g.on = false; return; }
      // the biggest lighthouse that fits beside the words without touching any of them
      for (Hl = 400; Hl >= 250; Hl -= 6) {
        lw = Hl * RATIO; cx = pr - lw / 2 - Math.max(28, W * 0.02); top = base - Hl;
        var hit = texts.some(function (r) { return !(cx + lw / 2 + 24 < r.l || cx - lw / 2 - 40 > r.r || base + 4 < r.t || top - 18 > r.b); });
        if (!hit) { fit = Hl; break; }
      }
      if (!fit) { wrap.classList.add('is-off'); g.on = false; return; }
      Hl = fit; lw = Hl * RATIO; cx = pr - lw / 2 - Math.max(28, W * 0.02); top = base - Hl + 3;
      wrap.classList.remove('is-off');
      obj.style.width = Math.round(lw) + 'px'; obj.style.left = Math.round(cx - lw / 2) + 'px'; obj.style.top = Math.round(top) + 'px';
      g = { on: true, Hl: Hl, lw: lw, ox: cx - lw / 2, oy: top, lx: cx - lw / 2 + lw * LAMP.x, ly: top + Hl * LAMP.y, W: W };
      beam.style.left = g.lx + 'px'; beam.style.top = g.ly + 'px';
      wrap.classList.add('is-ready');
    }
    function frame(now) {
      if (g.on) {
        var t = now - t0, sy = window.scrollY || 0;
        mx += (tx - mx) * 0.075; my += (ty - my) * 0.075;
        var bob = Math.sin(t * 0.0013) * 3.5, lift = Math.min(40, sy * 0.05);
        obj.style.transform = 'translate3d(' + (mx * 14).toFixed(2) + 'px,' + (my * 6 + bob - lift).toFixed(2) + 'px,0) rotateY(' + (mx * 6).toFixed(2) + 'deg) rotateX(' + (-my * 3).toFixed(2) + 'deg)';
        if (ptr) { var a = Math.atan2(ptr.y - g.ly, ptr.x - g.lx) * 180 / Math.PI + 360; a = a % 360; a = a < 90 ? 180 : Math.max(120, Math.min(250, a)); tAng = a - 5; }
        else tAng = 175 + Math.sin(t / 2100) * 17;                    // a slow sweep when no one is pointing
        ang += (tAng - ang) * 0.06; beam.style.transform = 'translate3d(0,' + (-lift).toFixed(2) + 'px,0) rotate(' + ang.toFixed(2) + 'deg)';
      }
      raf = visible && !document.hidden ? requestAnimationFrame(frame) : 0;
    }
    var rt, redo = function () { clearTimeout(rt); rt = setTimeout(layout, 120); };
    layout(); setTimeout(layout, 1500); window.addEventListener('resize', redo); window.addEventListener('load', redo);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(redo);
    if (!img.complete) img.addEventListener('load', redo);
    var lh = obj.querySelector('img'); if (lh && !lh.complete) lh.addEventListener('load', redo);
    if (reduce) { beam.style.transform = 'rotate(177deg)'; return; }   // a still lighthouse for people who prefer no motion
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); }, { rootMargin: '60px' }).observe(wrap);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && visible && !raf) raf = requestAnimationFrame(frame); });
    function at(e) { var r = wrap.getBoundingClientRect(); ptr = { x: e.clientX - r.left, y: e.clientY - r.top }; tx = Math.max(-1, Math.min(1, (ptr.x / r.width) * 2 - 1)); ty = Math.max(-1, Math.min(1, (ptr.y / Math.max(1, r.height)) * 2 - 1)); clearTimeout(idle); idle = setTimeout(function () { ptr = null; tx = 0; ty = 0; }, 2800); }
    wrap.addEventListener('pointermove', at, { passive: true });
    wrap.addEventListener('pointerleave', function () { clearTimeout(idle); idle = setTimeout(function () { ptr = null; tx = 0; ty = 0; }, 700); });
  }

  function ready() {
    document.querySelectorAll('[data-hero-stage]').forEach(initHeroStage); document.querySelectorAll('[data-sand]').forEach(initSand); document.querySelectorAll('[data-beam-scene]').forEach(initBeam); }
  if ('IntersectionObserver' in window) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready(); }
})();
