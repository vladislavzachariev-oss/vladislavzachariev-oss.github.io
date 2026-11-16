/* Pět nápadů místo karuselu prací (J 2026-11-16). Bez závislostí; pohyb jen transform/opacity. */
(function () {
  'use strict';
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seen(el, cb, opt) {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver(function (es) { es.forEach(function (e) { cb(e.isIntersecting, e); }); }, opt || {}).observe(el);
  }
  function fill(root) {
    $$('source[data-srcset]', root).forEach(function (s) { s.srcset = s.getAttribute('data-srcset'); s.removeAttribute('data-srcset'); });
    $$('img[data-src]', root).forEach(function (i) { i.src = i.getAttribute('data-src'); i.removeAttribute('data-src'); });
  }

  /* 1 Balíček */
  var k1 = $('.k1');
  if (k1) (function () {
    var track = $('.k1-track', k1), stage = $('.k1-stage', k1), cards = $$('.k1-card', k1), n = cards.length;
    var noB = $('.k1-no b', k1), rot = [-1.6, 2.2, -2.6, 1.4, -1.2, 2.8, -2];
    if (RM) { k1.classList.add('static'); return; }
    seen(k1, function (v) { if (v) fill(k1); }, { rootMargin: '600px 0px' });
    var vis = false, last = -1, raf = 0;
    function ease(t) { return 1 - Math.pow(1 - t, 3); }
    function draw() {
      raf = 0;
      var r = track.getBoundingClientRect(), total = track.offsetHeight - innerHeight;
      var p = clamp(-r.top / Math.max(total, 1), 0, 1) * (n - 1);
      if (Math.abs(p - last) < 0.0005) return; last = p;
      var H = stage.offsetHeight;
      for (var i = 0; i < n; i++) {
        var t = i === 0 ? 1 : clamp(p - (i - 1), 0, 1), e = ease(t);
        var under = clamp(p - i, 0, 3);                 // kolik karet už leží na ní
        var y = (1 - e) * H * 0.9 - under * 16;
        var a = rot[i % rot.length] * e + (1 - e) * (i % 2 ? 9 : -9);
        var s = 1 - under * 0.045;
        var c = cards[i];
        c.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0) rotate(' + a.toFixed(2) + 'deg) scale(' + s.toFixed(4) + ')';
        c.style.opacity = under > 2.6 ? clamp(3 - under, 0, 1) * 2.5 : 1;
        c.style.zIndex = i + 1;
        c.style.pointerEvents = t > 0.6 && p - i < 0.5 ? 'auto' : 'none';
        c.tabIndex = t > 0.6 && p - i < 0.5 ? 0 : -1;
      }
      if (noB) noB.textContent = String(Math.min(n, Math.round(p) + 1)).padStart(2, '0');
    }
    function req() { if (vis && !raf) raf = requestAnimationFrame(draw); }
    seen(track, function (v) { vis = v; if (v) { last = -1; req(); } });
    addEventListener('scroll', req, { passive: true });
    addEventListener('resize', function () { last = -1; req(); });
    draw();
  })();

  /* 2 Stěna: jen rozjet obrázky, až je stěna blízko; mimo obraz animaci zastavit */
  var k2 = $('.k2');
  if (k2) (function () {
    var wall = $('.k2-wall', k2);
    seen(k2, function (v) { if (v) fill(k2); }, { rootMargin: '600px 0px' });
    seen(wall, function (v) { wall.style.setProperty('--ps', v ? 'running' : 'paused'); $$('.k2-run', wall).forEach(function (r) { r.style.animationPlayState = v ? '' : 'paused'; }); });
  })();

  /* 3 Barva podle webu */
  var k3 = $('.k3');
  if (k3) (function () {
    var its = $$('.k3-it', k3), top = $('.k3-top', k3);
    seen(k3, function (v) { if (v) fill(k3); }, { rootMargin: '700px 0px' });
    function set(bg, ink, mute) { k3.style.setProperty('--k3bg', bg); k3.style.setProperty('--k3ink', ink); k3.style.setProperty('--k3mute', mute); }
    var cur = null;
    function pick() {
      var mid = innerHeight * 0.5, hit = null;
      its.forEach(function (it) { var r = it.getBoundingClientRect(); if (r.top < mid && r.bottom > mid) hit = it; });
      if (hit === cur) return; cur = hit;
      if (hit) set(hit.dataset.bg, hit.dataset.ink, hit.dataset.mute); else set('', '', '');
      if (!hit) { k3.style.removeProperty('--k3bg'); k3.style.removeProperty('--k3ink'); k3.style.removeProperty('--k3mute'); }
    }
    its.forEach(function (it) { seen(it, function (v) { if (v) it.classList.add('in'); }, { rootMargin: '0px 0px -12% 0px' }); });
    var raf = 0;
    addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(function () { raf = 0; pick(); }); }, { passive: true });
    pick();
  })();

  /* 4 Notebook */
  var k4 = $('.k4');
  if (k4) (function () {
    var sites = $$('.k4-site', k4), phs = $$('.k4-ph img', k4), tabs = $$('.k4-tabs button', k4), cap = $('.k4-cap', k4);
    var HOLD = 1500, SLIDE = 1050, si = 0, fi = 0, timer = 0, vis = false, t0 = 0, dur = 0, bar = null, raf = 0;
    function frames(s) { return $$('img', s).length; }
    function siteDur(s) { return frames(s) * HOLD + (frames(s) - 1) * SLIDE; }
    function showSite(i) {
      si = i; fi = 0;
      sites.forEach(function (s, k) { s.classList.toggle('on', k === i); if (k === i || k === (i + 1) % sites.length) fill(s); });
      phs.forEach(function (p, k) { p.classList.toggle('on', k === i); if (k === i || k === (i + 1) % phs.length) fill(p.parentNode); });
      $('.k4-page', sites[i]).style.transform = 'translate3d(0,0,0)';
      tabs.forEach(function (b, k) { b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); $('.tb i', b).style.transform = 'scaleX(' + (k < i ? 1 : 0) + ')'; });
      var d = sites[i].dataset;
      cap.innerHTML = '<b>' + d.name + '</b><span>' + d.what + '</span><a href="' + d.href + '"' + (d.ext ? ' target="_blank" rel="noopener"' : '') + '>Otevřít web</a>';
      bar = $('.tb i', tabs[i]); t0 = performance.now(); dur = siteDur(sites[i]);
    }
    function step() {
      clearTimeout(timer);
      if (!vis || RM) return;
      var n = frames(sites[si]);
      if (fi < n - 1) {
        timer = setTimeout(function () {
          fi++; $('.k4-page', sites[si]).style.transform = 'translate3d(0,' + (-100 * fi / frames(sites[si])).toFixed(3) + '%,0)';
          timer = setTimeout(step, SLIDE);
        }, HOLD);
      } else timer = setTimeout(function () { showSite((si + 1) % sites.length); step(); }, HOLD);
    }
    function tick(now) { raf = 0; if (!vis || RM || !bar) return; bar.style.transform = 'scaleX(' + clamp((now - t0) / dur, 0, 1).toFixed(4) + ')'; raf = requestAnimationFrame(tick); }
    tabs.forEach(function (b, k) { b.addEventListener('click', function () { showSite(k); step(); if (!raf) raf = requestAnimationFrame(tick); }); });
    seen(k4, function (v) { if (v) fill(sites[0]); }, { rootMargin: '600px 0px' });
    seen($('.k4-dev', k4), function (v) {
      vis = v;
      if (v) { t0 = performance.now() - 0; showSite(si); step(); if (!raf) raf = requestAnimationFrame(tick); }
      else clearTimeout(timer);
    }, { threshold: 0.35 });
    showSite(0);
  })();

  /* 5 Věta s obrázky */
  var k5 = $('.k5');
  if (k5) (function () {
    var ws = $$('.k5-w', k5), shots = $$('.k5-st a', k5), cap = $('.k5 .kx-cap'), T = 3600, i = 0, timer = 0, vis = false, hold = 0;
    k5.style.setProperty('--t', T + 'ms');
    function go(k, auto) {
      i = k;
      ws.forEach(function (w, j) { w.classList.toggle('on', j === k); w.classList.remove('run'); w.setAttribute('aria-pressed', j === k ? 'true' : 'false'); });
      void ws[k].offsetWidth;
      if (auto && !RM) ws[k].classList.add('run');
      shots.forEach(function (a, j) { a.classList.toggle('on', j === k); a.tabIndex = j === k ? 0 : -1; if (j === k || j === (k + 1) % shots.length) fill(a); });
      var d = shots[k].dataset;
      cap.innerHTML = '<b>' + d.name + '</b><span>' + d.what + '</span><a href="' + shots[k].getAttribute('href') + '"' + (d.ext ? ' target="_blank" rel="noopener"' : '') + '>Otevřít web</a>';
    }
    function loop() { clearTimeout(timer); if (!vis || RM) return; timer = setTimeout(function () { go((i + 1) % ws.length, true); loop(); }, T); }
    ws.forEach(function (w, k) {
      function pickIt() { clearTimeout(timer); clearTimeout(hold); go(k, false); hold = setTimeout(function () { go(k, true); loop(); }, 6000); }
      w.addEventListener('click', pickIt);
      w.addEventListener('mouseenter', function () { if (matchMedia('(hover:hover)').matches) pickIt(); });
    });
    seen(k5, function (v) { if (v) fill(k5); }, { rootMargin: '600px 0px' });
    seen($('.k5-st', k5), function (v) { vis = v; if (v) { go(i, true); loop(); } else clearTimeout(timer); }, { threshold: 0.3 });
    go(0, false);
  })();
})();
