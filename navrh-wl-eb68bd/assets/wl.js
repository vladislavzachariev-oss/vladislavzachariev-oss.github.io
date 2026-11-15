/* Whyte Lynx — bílý web (J 2026-10-16). Všechno je vidět i bez tohoto skriptu; skript jen přidává pohyb:
   oblouk prací, telefon s příběhem, ukázku na přání, náhled prací pod myší, čáru postupu, šířku ceny,
   nápis a padající dílky webu v patičce. S omezeným pohybem nic samo nejede. */
(function () {
  'use strict';
  window.WL = 1;
  var d = document, h = d.documentElement;

/* tmavý režim: tlačítko v hlavičce, volba se pamatuje v prohlížeči; bez volby bílý (Z 2026-10-21) */
(function () {
  var t = d.querySelector('.theme-t'); if (!t) return;
  var meta = d.querySelector('meta[name=theme-color]');
  function show() { var dark = h.dataset.theme === 'dark'; t.setAttribute('aria-pressed', dark ? 'true' : 'false'); if (meta) meta.content = dark ? '#121211' : '#ffffff'; }
  t.addEventListener('click', function () {
    var dark = h.dataset.theme !== 'dark';
    if (dark) h.dataset.theme = 'dark'; else delete h.dataset.theme;
    try { localStorage.setItem('wl-theme', dark ? 'dark' : 'light'); } catch (e) {}
    show(); d.dispatchEvent(new CustomEvent('wl-theme'));
  });
  show();
})();
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var ease = function (p) { p = clamp(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  var hasIO = 'IntersectionObserver' in window;
  function seen(el, fn, opt) {
    if (!el) return;
    if (!hasIO) { fn(true); return; }
    new IntersectionObserver(function (es) { fn(es[0].isIntersecting, es[0]); }, opt || {}).observe(el);
  }
  /* obrázky, které při prvním vykreslení nejsou vidět, dostanou src až po něm: Lighthouse jinak počítá jejich
     bajty do času nadpisu H1 (rozbor J 2. 11. 2026: 591 kB, LCP 4,8 s v simulaci, reálně 1,3 s) */
  var fillImgs = function (root) { $$('img[data-src]', root).forEach(function (im) { im.src = im.dataset.src; im.removeAttribute('data-src'); }); };
  var afterPaint = function (fn) { var go = function () { setTimeout(fn, 1500); }; if (d.readyState === 'complete') go(); else addEventListener('load', go); };

  /* ---------- plynulé posouvání a kotvy ---------- */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
  }
  function goTo(target, instant) {
    if (lenis) lenis.scrollTo(target, { immediate: !!instant, offset: target === 0 ? 0 : -76 });
    else if (target === 0) scrollTo({ top: 0, behavior: instant || reduce ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: instant || reduce ? 'auto' : 'smooth' });
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id === '#') return;
      var t = id === '#top' ? 0 : d.getElementById(id.slice(1));
      if (t === null) return;
      e.preventDefault();
      goTo(t);
      history.replaceState(null, '', id === '#top' ? location.pathname : id);
    });
  });

  /* ---------- hlavička a spodní lišta ---------- */
  var hdr = $('.hdr'), bar = $('#bar'), contact = $('#kontakt'), lastY = 0, ticking = false;
  var onScrollFns = [];
  function onScroll() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;
    if (hdr) {
      hdr.classList.toggle('scrolled', y > 10);
      if (y > 600 && y > lastY + 6) hdr.classList.add('hide');
      else if (y < lastY - 6 || y < 600) hdr.classList.remove('hide');
    }
    if (bar) {
      var cr = contact ? contact.getBoundingClientRect().top : Infinity;
      bar.classList.toggle('show', y > innerHeight * 0.7 && cr > innerHeight * 0.7);
    }
    if (Math.abs(y - lastY) > 6) lastY = y;
    onScrollFns.forEach(function (f) { f(); });
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);

  /* ---------- oči rysa ---------- */
  var eyes = $$('.hdr .eye');
  if (fine && !reduce) addEventListener('pointermove', function (e) {
    eyes.forEach(function (eye) {
      var r = eye.ownerSVGElement.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * 0.53);
      var len = Math.hypot(dx, dy) || 1, k = Math.min(1, len / 240);
      eye.style.transform = 'translate(' + (dx / len * 2.6 * k).toFixed(2) + 'px,' + (dy / len * 2 * k).toFixed(2) + 'px)';
    });
  }, { passive: true });
  if (!reduce) setInterval(function () {
    if (d.hidden) return;
    $$('.hdr .eyes').forEach(function (g) { if (g.animate) g.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.08)' }, { transform: 'scaleY(1)' }], { duration: 240, easing: 'ease-in-out' }); });
  }, 4200);

  /* ---------- oblouk prací: pomalu se točí, dá se táhnout ---------- */
  var arc = $('#arc');
  if (arc) (function () {
    var cards = $$('.arc-card', arc), n = cards.length, TAU = Math.PI * 2;
    var SLOTS = Math.max(n, 9);   // rozteč karet jako u devíti (40°), i když jich je méně: oblouk vypadá stejně, karty se vracejí zezadu, kde nejsou vidět
    var step = 1, R = 1, off = 0, vel = 0, target = null, drag = null, moved = 0, vis = true, last = 0;
    var AUTO = reduce ? 0 : 0.1;
    arc.classList.add('on');
    afterPaint(function () { fillImgs(arc); });
    seen(arc, function (v) { if (v) fillImgs(arc); }, { rootMargin: '300px 0px' });
    function measure() {
      var cw = cards[0].offsetWidth;
      step = cw * 1.07; R = SLOTS * step / TAU;
      arc.style.setProperty('--persp', (innerWidth < 700 ? 900 : 1500) + 'px');
    }
    function render() {
      for (var i = 0; i < n; i++) {
        var a = ((i - off) % n + n) % n; if (a > n / 2) a -= n;
        var th = a * TAU / SLOTS, ab = Math.abs(th);
        var o = ab < 1 ? 1 : clamp(1 - (ab - 1) / 0.32, 0, 1);
        var c = cards[i];
        c.style.transform = 'translate3d(' + (R * Math.sin(th)).toFixed(1) + 'px,0,' + (R * (1 - Math.cos(th)) * 0.9).toFixed(1) + 'px) rotateY(' + (-th).toFixed(4) + 'rad)';
        c.style.opacity = o.toFixed(3);
        c.style.visibility = o <= 0.01 ? 'hidden' : '';
        c.style.pointerEvents = o < 0.6 ? 'none' : '';
      }
    }
    function loop(t) {
      var dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
      if (!drag) {
        if (target !== null) { off += (target - off) * Math.min(1, dt * 7); if (Math.abs(target - off) < 0.002) target = null; }
        else { off += vel * dt + AUTO * dt * (1 - Math.min(1, Math.abs(vel))); vel *= Math.exp(-dt * 2.6); }
      }
      render();
      if (vis && !d.hidden) requestAnimationFrame(loop); else last = 0;
    }
    function kick() { if (!last) requestAnimationFrame(loop); }
    measure(); render();
    addEventListener('resize', function () { measure(); render(); });
    seen(arc, function (v) { vis = v; if (v) kick(); });
    d.addEventListener('visibilitychange', function () { if (!d.hidden && vis) kick(); });
    arc.addEventListener('pointerdown', function (e) {
      if (e.button) return;
      drag = { x: e.clientX, off: off, lx: e.clientX, lt: performance.now(), v: 0, id: e.pointerId };
      moved = 0; vel = 0; target = null;
    });
    arc.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      if (Math.abs(dx) > 4 && !arc.classList.contains('drag')) { arc.classList.add('drag'); try { arc.setPointerCapture(e.pointerId); } catch (er) {} }
      moved = Math.max(moved, Math.abs(dx));
      off = drag.off - dx / step;
      var now = performance.now(), dtt = (now - drag.lt) / 1000;
      if (dtt > 0) { drag.v = drag.v * 0.6 + (-(e.clientX - drag.lx) / step / dtt) * 0.4; drag.lx = e.clientX; drag.lt = now; }
      kick();
    });
    function up() { if (!drag) return; vel = clamp(drag.v, -5, 5); drag = null; arc.classList.remove('drag'); kick(); }
    arc.addEventListener('pointerup', up);
    arc.addEventListener('pointercancel', up);
    arc.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
    cards.forEach(function (c, i) {
      c.addEventListener('focus', function () {
        var k = Math.round((off - i) / n) * n + i; target = k; kick();
      });
    });
  })();

  /* ---------- telefon: najdou, prohlédnou, objednají (ukázka Plná náruč) ---------- */
  var phone = $('#phone');
  if (phone) (function () {
    var tabs = $$('#tabs button'), scr = $('.ph-screen', phone), tap = $('.tap', phone);
    var srch = $('.sc-search', phone), qT = $('.q-t', phone), chip = $('.chips .web', phone);
    var siteSc = $('.sc-site', phone), siteRoll = $('.sc-site .scroller', phone), lista = $('.sc-site .lista', phone);
    var formSc = $('.sc-form', phone), formRoll = $('.sc-form .scroller', phone), pg = $('.pg', phone), chipOn = $('.chip-on', phone);
    var fv = $$('.fv:not(.send)', phone), send = $('.fv.send', phone), toast = $('.toast', phone);
    var DUR = [5.4, 6.6, 9.4];
    var Q = 'květinářství liberec';
    var VALS = ['Babičce k osmdesátinám', 'Všechno nejlepší, babi! Máme Tě moc rádi.', '777 123 456'];
    var TW = [[2.6, 3.7], [3.9, 5.6], [5.8, 6.5]];
    var S = 0, t = 0, fired = {}, vis = false, last = 0, running = false;
    function typed(s, a, b, tt) { return s.slice(0, Math.round(s.length * clamp((tt - a) / (b - a), 0, 1))); }
    function tapAt(el, fx, fy) {
      var r = el.getBoundingClientRect(), sr = scr.getBoundingClientRect();
      tap.style.left = (r.left - sr.left + r.width * (fx == null ? 0.5 : fx)) + 'px';
      tap.style.top = (r.top - sr.top + r.height * (fy == null ? 0.5 : fy)) + 'px';
      tap.classList.remove('go'); void tap.offsetWidth; tap.classList.add('go');
    }
    function once(key, tt, at, fn) { if (tt >= at && !fired[key]) { fired[key] = 1; fn(); } }
    function render(tt, quiet) {
      var p, y;
      if (S === 0) {
        qT.textContent = typed(Q, 0.4, 2.0, tt);
        srch.classList.toggle('shown', tt >= 2.2);
        if (!quiet) once('t0', tt, 4.1, function () { tapAt(chip); });
      } else if (S === 1) {
        var maxY = Math.max(0, siteRoll.offsetHeight - siteSc.offsetHeight);
        y = maxY * ease((tt - 0.6) / 4.6);
        siteRoll.style.transform = 'translateY(' + (-y).toFixed(1) + 'px)';
        var lt = y > siteSc.offsetHeight * 0.55;
        lista.classList.toggle('on', lt); phone.classList.toggle('lt', lt);
        if (!quiet) once('t1', tt, 5.7, function () { tapAt(lista, 0.827, 0.5); });
      } else {
        var k = pg.offsetHeight / 1442.67, max = Math.max(0, pg.offsetHeight - formSc.offsetHeight);
        y = Math.min(max, 589 * k) * ease((tt - 0.9) / 0.8);
        formRoll.style.transform = 'translateY(' + (-y).toFixed(1) + 'px)';
        if (!quiet) once('t2a', tt, 1.95, function () { tapAt(chipOn, 0.567, 0.5); });
        chipOn.classList.toggle('on', tt >= 2.05);
        for (var i = 0; i < VALS.length; i++) {
          fv[i].textContent = typed(VALS[i], TW[i][0], TW[i][1], tt);
          fv[i].classList.toggle('act', !quiet && tt >= TW[i][0] - 0.2 && tt < TW[i][1] + 0.25);
        }
        send.classList.toggle('down', !quiet && tt >= 7.0 && tt < 7.25);
        toast.classList.toggle('on', tt >= 7.4);
        if (!quiet) once('t2', tt, 6.95, function () { tapAt(send); });
      }
      p = clamp(tt / DUR[S], 0, 1);
      tabs.forEach(function (b, i) { $('.tbar i', b).style.setProperty('--p', i === S ? p.toFixed(3) : i < S ? '1' : '0'); });
    }
    function show(s, tt) {
      if (s) fillImgs(phone);
      S = s; t = tt || 0; fired = {};
      phone.dataset.s = String(s);
      if (s !== 1) phone.classList.remove('lt');
      tabs.forEach(function (b, i) { b.setAttribute('aria-pressed', i === s ? 'true' : 'false'); });
      render(t, reduce);
    }
    function loop(ts) {
      var dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
      t += dt;
      if (t >= DUR[S]) show((S + 1) % 3, 0); else render(t);
      if (vis && !d.hidden) requestAnimationFrame(loop); else { running = false; last = 0; }
    }
    function start() { if (!running && !reduce) { running = true; requestAnimationFrame(loop); } }
    tabs.forEach(function (b, i) {
      b.addEventListener('click', function () { show(i, reduce ? DUR[i] - 0.01 : 0); start(); });
    });
    if (reduce) show(1, DUR[1] - 0.01);
    else show(0, 0);
    afterPaint(function () { fillImgs(phone); });
    seen(phone, function (v) { vis = v; if (v) start(); }, { threshold: 0.3 });
    d.addEventListener('visibilitychange', function () { if (!d.hidden && vis) start(); });
  })();

  /* ---------- seznam prací: barva značky + náhled pod myší ----------
     J 2026-10-17: náhled mizel při rolování a vrátil se až po přejetí na jiný řádek (Z: „někdy se zobrazí, někdy ne“).
     Teď se řádek pod myší hledá znovu po každém pohybu i rolování a obrázky se načtou dopředu. */
  var proof = $('.proof-shot');
  if (proof) { afterPaint(function () { fillImgs(proof); }); seen(proof, function (v) { if (v) fillImgs(proof); }, { rootMargin: '600px' }); }
  var wl = $('#wl'), fl = $('#wlFloat');
  if (wl) (function () {
    var rows = $$('a', wl), cur = null;
    function lite(a) { if (a === cur) return; if (cur) cur.classList.remove('lit'); cur = a; if (a) a.classList.add('lit'); }
    afterPaint(function () { fillImgs(wl); });
    seen(wl, function (v) { if (v) { fillImgs(wl); rows.forEach(function (a) { var i = new Image(); i.src = a.dataset.img; }); } }, { rootMargin: '600px' });
    if (!fine) {
      /* mobil: barvou se rozsvítí řádek uprostřed obrazovky */
      var mid = function () {
        var c = innerHeight * 0.5, best = null, bd = 1e9;
        rows.forEach(function (a) { var r = a.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - c); if (d < bd && r.bottom > 0 && r.top < innerHeight) { bd = d; best = a; } });
        lite(bd < innerHeight * 0.32 ? best : null);
      };
      onScrollFns.push(mid); mid();
      return;
    }
    var fimg = $('img', fl), mx = -1, my = -1, x = 0, y = 0, s = 0.85, on = false, run = false, pend = false;
    function loop() {
      if (reduce) { x = mx; y = my; s = on ? 1 : 0.85; }
      x += (mx - x) * 0.16; y += (my - y) * 0.16; s += ((on ? 1 : 0.85) - s) * 0.18;
      fl.style.transform = 'translate(' + (x + 28).toFixed(1) + 'px,' + (y - fl.offsetHeight / 2).toFixed(1) + 'px) scale(' + s.toFixed(3) + ')';
      if (on || Math.abs(s - 0.85) > 0.01) requestAnimationFrame(loop); else run = false;
    }
    function pick() {
      pend = false;
      var el = mx < 0 ? null : document.elementFromPoint(mx, my), a = el && el.closest ? el.closest('#wl a') : null;
      lite(a);
      if (a) {
        if (fimg.getAttribute('src') !== a.dataset.img) fimg.src = a.dataset.img;
        if (!on) { x = mx; y = my; }
        on = true; fl.classList.add('on');
        if (!run) { run = true; requestAnimationFrame(loop); }
      } else if (on) { on = false; fl.classList.remove('on'); }
    }
    function later() { if (!pend) { pend = true; requestAnimationFrame(pick); } }
    addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; if (on || wl.contains(e.target)) later(); }, { passive: true });
    addEventListener('scroll', function () { if (mx >= 0) later(); }, { passive: true });
    document.documentElement.addEventListener('pointerleave', function () { mx = my = -1; later(); });
  })();

  /* ---------- postup: čára se plní posouváním ---------- */
  var steps = $('#steps');
  if (steps) (function () {
    var line = $('.steps-line', steps), lis = $$('li', steps);
    function upd() {
      var r = steps.getBoundingClientRect(), vh = innerHeight;
      var p = reduce ? 1 : clamp((vh * 0.82 - r.top) / (r.height * 0.9 + vh * 0.25), 0, 1);
      line.style.setProperty('--p', p.toFixed(3));
      lis.forEach(function (li, i) { li.classList.toggle('lit', p >= i / lis.length + 0.02 || p >= 0.999); });
    }
    onScrollFns.push(upd); upd();
  })();

  /* ---------- cena: číslo se při posouvání roztahuje ---------- */
  var amount = $('#amount');
  if (amount) (function () {
    var maxW = 125, MINW = 62;
    function fitMax() {
      maxW = 125;
      amount.style.setProperty('--wd', maxW);
      while (maxW > MINW && amount.scrollWidth > amount.clientWidth + 1) { maxW -= 3; amount.style.setProperty('--wd', maxW); }
      upd();
    }
    function upd() {
      var r = amount.getBoundingClientRect(), vh = innerHeight;
      var p = reduce ? 1 : ease((vh - r.top) / (vh * 0.75));
      amount.style.setProperty('--wd', (MINW + (maxW - MINW) * p).toFixed(1));
    }
    onScrollFns.push(upd);
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(fitMax); else fitMax();
    addEventListener('resize', fitMax);
  })();

  /* ---------- patička: nápis Whyte Lynx a padající dílky webu ----------
     J 2026-10-17 podle hlavičky Plné náruče (Z: „udělej to stejně jako u naší kytky, tady se to nějak divně rozšiřuje“,
     „nedávej tam pneuservis, kadeřnictví… zkus originálně“). Nápis se kreslí na plátno, písmena jsou překážky ve tvaru
     písmen a při dopadu se zhoupnou (pružina), nerozšiřují se. Padají dílky, ze kterých se web skládá: tlačítka,
     špendlík mapy, kurzor, okno, přepínač, fotka, písmo, barvy a rys. Chytit, hodit, klepnutím přidat. */
  var play = $('#ftPlay'), word = $('#ftWord');
  if (play && word && hasIO) {
    var ftLoaded = false;
    seen(play, function (v) {
      if (!v || ftLoaded) return;
      ftLoaded = true;
      var go = function () {
        var f = d.fonts && d.fonts.load ? Promise.race([d.fonts.load('800 100px Archivo', 'Whyte Lynx'), new Promise(function (r) { setTimeout(r, 2500); })]) : Promise.resolve();
        f.then(footer, footer);
      };
      if (window.Matter) go();
      else { var sc = d.createElement('script'); sc.src = 'vendor/matter.min.js'; sc.onload = go; d.body.appendChild(sc); }
    }, { rootMargin: '600px 0px' });
  }

  function footer() {
    var M = window.Matter; if (!M || footer.done) return; footer.done = 1;
    var B = M.Bodies, Bd = M.Body, C = M.Composite, Sl = M.Sleeping;
    var eng = M.Engine.create({ enableSleeping: true, positionIterations: 8, velocityIterations: 6 }), W = eng.world;
    eng.gravity.y = 1.1;
    var cv = d.createElement('canvas'); cv.className = 'ft-cv'; cv.setAttribute('aria-hidden', 'true');
    play.appendChild(cv);
    var ctx = cv.getContext('2d');
    var cs = getComputedStyle(h), ink = cs.getPropertyValue('--ink').trim() || '#161616', amber = cs.getPropertyValue('--amber').trim() || '#d9902a';
    var paper = cs.getPropertyValue('--card').trim() || '#fff';
    d.addEventListener('wl-theme', function () { var c = getComputedStyle(h); ink = c.getPropertyValue('--ink').trim() || ink; paper = c.getPropertyValue('--card').trim() || paper; });
    var coarse = !fine;
    var st = { W: 0, H: 0, dpr: 1, F: 0, ls: 0, letters: [], statics: [], items: [], vis: false, hopT: 0, rained: false };
    /* barvy značek z našich ukázek: Odlesk, Plná náruč, Žahourek, Sedm smrků, Zrno a žár, modrá Plné náruče */
    var COLS = ['#5b3fd1', '#e8238f', '#f5c518', '#3d7a52', '#d0582a', '#1c31c9'];
    var WORDS = ['Zavolat', 'Objednat', 'Napsat', 'Rezervovat', 'Trasa', 'Ceník', 'Otevřeno', 'Galerie', 'Kontakt'];
    var FIRST = ['btn', 'pin', 'win', 'cur', 'btn', 'dot', 'tog', 'lynx', 'btn', 'img', 'dot', 'aa', 'btn', 'pin', 'dot', 'btn', 'win', 'tog', 'dot', 'btn', 'cur', 'img', 'dot', 'btn', 'aa', 'pin'];
    var MORE = ['btn', 'btn', 'btn', 'pin', 'cur', 'win', 'tog', 'dot', 'dot', 'img', 'aa', 'lynx'];
    /* kurzor: obrys šipky a jeho konvexní obal pro fyziku (jednotka = výška šipky) */
    var CUR = [[0, 0], [0, .86], [.22, .67], [.36, .98], [.49, .93], [.35, .62], [.63, .62]];
    var CURH = [[0, 0], [0, .86], [.36, .98], [.49, .93], [.63, .62]];
    /* rys z loga (viewBox 64) a jeho obal */
    var lynxSvg = $('.ft .brand svg') || $('.brand svg');
    var LX = { body: null, ear: null, eye: null };
    try {
      LX.body = new Path2D($('.body', lynxSvg).getAttribute('d'));
      LX.ear = new Path2D($('.ear', lynxSvg).getAttribute('d'));
      LX.eye = new Path2D($('.eye', lynxSvg).getAttribute('d'));
    } catch (er) { MORE = MORE.filter(function (k) { return k !== 'lynx'; }); FIRST = FIRST.filter(function (k) { return k !== 'lynx'; }); }
    var LXH = [[13.5, -1], [50.5, -1], [53, 26], [52, 56], [32, 58], [12, 56], [11, 26]];

    var rand = function (a, b) { return a + Math.random() * (b - a); };
    var anyOf = function (a) { return a[(Math.random() * a.length) | 0]; };
    function lum(hex) {
      var n = parseInt(hex.slice(1), 16), c = [n >> 16, n >> 8 & 255, n & 255].map(function (v) { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
      return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
    }
    var onCol = function (hex) { return lum(hex) > .4 ? '#161616' : '#fff'; };
    var setF = function (px, wg) { ctx.font = (wg || 800) + ' ' + px + 'px Archivo, "Arial Black", sans-serif'; };

    /* tvary písmen v rámečku glyfu (0..1); 'x' = obdélník od výšky malých písmen dolů */
    var SH = {
      W: [['poly', [[0, 0], [1, 0], [.79, 1], [.21, 1]]]],
      h: [['rect', 0, 0, .36, 1], ['x', 0, 1]],
      t: [['rect', .16, 0, .72, 1], ['x', 0, 1]],
      L: [['rect', 0, 0, .38, 1], ['rect', 0, .7, 1, 1]],
      y: [['poly', [[0, 0], [1, 0], [.64, .7], [.36, .7]]], ['rect', .06, .62, .62, 1]]
    };
    function layout() {
      var W0 = play.clientWidth, H0 = play.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
      st.W = W0; st.H = H0; st.dpr = dpr;
      cv.width = Math.round(W0 * dpr); cv.height = Math.round(H0 * dpr);
      var txt = word.textContent.trim(), n = txt.length;
      var cssF = parseFloat(getComputedStyle(word).fontSize) || 160, pad = Math.max(12, W0 * .025);
      setF(100);
      var w100 = ctx.measureText(txt).width - 5 * (n - 1);
      var F = Math.min(cssF, (W0 - pad * 2) / w100 * 100);
      st.F = F; st.ls = -.05 * F; setF(F);
      var tw = ctx.measureText(txt).width + st.ls * (n - 1), x0 = (W0 - tw) / 2;
      var base = H0 - ctx.measureText('y').actualBoundingBoxDescent - F * .05;
      var xTop = base - ctx.measureText('x').actualBoundingBoxAscent;
      st.letters = [];
      for (var i = 0; i < n; i++) {
        var ch = txt[i]; if (ch === ' ') continue;
        var x = x0 + ctx.measureText(txt.slice(0, i)).width + st.ls * i, m = ctx.measureText(ch);
        st.letters.push({ ch: ch, x: x, y: base, xTop: xTop, c: { l: x - m.actualBoundingBoxLeft, r: x + m.actualBoundingBoxRight, t: base - m.actualBoundingBoxAscent, b: base + m.actualBoundingBoxDescent }, off: 0, v: 0 });
      }
      buildStatics();
    }
    function rectBody(x0, y0, x1, y1, li) {
      var w = Math.max(2, x1 - x0), hh = Math.max(2, y1 - y0);
      var b = B.rectangle((x0 + x1) / 2, (y0 + y1) / 2, w, hh, { isStatic: true, friction: .5, restitution: .12, chamfer: { radius: Math.min(5, w / 4, hh / 4) } });
      b.plugin.li = li; return b;
    }
    function buildStatics() {
      if (st.statics.length) C.remove(W, st.statics);
      var W0 = st.W, H0 = st.H, T = 400;
      /* stěny sahají od −3H až pod podlahu (past 16. 10.: kratší stěna pustila dílky ven) */
      st.statics = [
        B.rectangle(W0 / 2, H0 + T / 2, W0 * 3, T, { isStatic: true, friction: .6 }),
        B.rectangle(-T / 2, -H0 / 2, T, H0 * 5, { isStatic: true }),
        B.rectangle(W0 + T / 2, -H0 / 2, T, H0 * 5, { isStatic: true })
      ];
      st.letters.forEach(function (L, li) {
        var c = L.c, w = c.r - c.l, hh = c.b - c.t;
        (SH[L.ch] || [['rect', 0, 0, 1, 1]]).forEach(function (p) {
          if (p[0] === 'rect') { st.statics.push(rectBody(c.l + p[1] * w, c.t + p[2] * hh, c.l + p[3] * w, c.t + p[4] * hh, li)); return; }
          if (p[0] === 'x') { st.statics.push(rectBody(c.l + p[1] * w, Math.max(c.t, L.xTop), c.l + p[2] * w, c.b, li)); return; }
          var vs = p[1].map(function (q) { return { x: c.l + q[0] * w, y: c.t + q[1] * hh }; });
          var ctr = M.Vertices.centre(vs);
          var b = B.fromVertices(ctr.x, ctr.y, [vs], { isStatic: true, friction: .5, restitution: .12 });
          b.plugin.li = li; st.statics.push(b);
        });
      });
      C.add(W, st.statics);
    }

    var unit = function () { return clamp(st.W * .03, 26, 44); };
    var maxItems = function () { return st.W < 700 ? 26 : 44; };
    var live = function () { return st.items.filter(function (b) { return !b.plugin.it.dying; }); };
    function make(kind, x, y, o) {
      o = o || {};
      var u = unit(), it = { k: kind, col: o.col || anyOf(COLS), born: performance.now(), pop: !!o.pop, dying: 0 }, b;
      var opt = { restitution: .3, friction: .35, frictionAir: .012, density: .0016, angle: rand(-.5, .5), sleepThreshold: 80 };
      var box = function (w, hh, r) { it.w = w; it.h = hh; return B.rectangle(x, y, w, hh, Object.assign({ chamfer: { radius: r } }, opt)); };
      if (kind === 'btn') {
        it.t = o.t || anyOf(WORDS); it.fs = u * 1.15 * .42; setF(it.fs, 700);
        it.ghost = Math.random() < .25;
        b = box(ctx.measureText(it.t).width + u * 1.25, u * 1.15, u * .575);
      } else if (kind === 'tog') b = box(u * 1.9, u, u / 2);
      else if (kind === 'win') b = box(u * 3.3, u * 2.3, 8);
      else if (kind === 'img') b = box(u * 1.9, u * 1.9, u * .26);
      else if (kind === 'aa') b = box(u * 1.6, u * 1.6, u * .22);
      else if (kind === 'dot') { it.r = u * rand(.48, .78); b = B.circle(x, y, it.r, opt); }
      else if (kind === 'pin') { it.r = u * .82; b = B.circle(x, y, it.r * .86, opt); }
      else {
        var s = kind === 'cur' ? u * 1.7 : u * 2.4, k = kind === 'cur' ? s : s / 64;
        var vs = (kind === 'cur' ? CURH : LXH).map(function (q) { return { x: q[0] * k, y: q[1] * k }; });
        var cc = M.Vertices.centre(vs);
        it.s = s; it.cx = cc.x; it.cy = cc.y;
        b = B.fromVertices(x, y, [vs], opt);
      }
      b.plugin.it = it;
      Bd.setVelocity(b, { x: o.vx || 0, y: o.vy || 0 });
      Bd.setAngularVelocity(b, rand(-.1, .1));
      C.add(W, b); st.items.push(b);
      var alive = live();
      while (alive.length > maxItems()) { alive.shift().plugin.it.dying = performance.now(); alive = live(); }
      return b;
    }

    function rr(x, y, w, hh, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, hh, r); else ctx.rect(x, y, w, hh); }
    function drawItem(b, sc) {
      var it = b.plugin.it, w = it.w, hh = it.h, col = it.col;
      ctx.save(); ctx.translate(b.position.x, b.position.y); ctx.rotate(b.angle); if (sc !== 1) ctx.scale(sc, sc);
      ctx.lineWidth = 2; ctx.strokeStyle = ink; ctx.lineJoin = 'round';
      if (it.k === 'btn') {
        rr(-w / 2, -hh / 2, w, hh, hh / 2);
        if (it.ghost) { ctx.fillStyle = paper; ctx.fill(); ctx.stroke(); ctx.fillStyle = ink; }
        else { ctx.fillStyle = col; ctx.fill(); ctx.fillStyle = onCol(col); }
        setF(it.fs, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(it.t, 0, hh * .04);
      } else if (it.k === 'tog') {
        rr(-w / 2, -hh / 2, w, hh, hh / 2); ctx.fillStyle = col; ctx.fill();
        ctx.beginPath(); ctx.arc(w / 2 - hh / 2, 0, hh * .36, 0, 6.2832); ctx.fillStyle = paper; ctx.fill();
      } else if (it.k === 'win') {
        rr(-w / 2, -hh / 2, w, hh, 8); ctx.fillStyle = paper; ctx.fill(); ctx.stroke();
        var top = -hh / 2, bar = hh * .2;
        ctx.beginPath(); ctx.moveTo(-w / 2, top + bar); ctx.lineTo(w / 2, top + bar); ctx.stroke();
        ['#e8238f', '#f5c518', '#3d7a52'].forEach(function (c, i) { ctx.beginPath(); ctx.arc(-w / 2 + bar * (.55 + i * .5), top + bar / 2, bar * .14, 0, 6.2832); ctx.fillStyle = c; ctx.fill(); });
        rr(-w / 2 + w * .08, top + hh * .32, w * .84, hh * .3, 4); ctx.fillStyle = col; ctx.fill();
        ctx.fillStyle = '#d9d7d2';
        rr(-w / 2 + w * .08, top + hh * .72, w * .6, hh * .07, 3); ctx.fill();
        rr(-w / 2 + w * .08, top + hh * .84, w * .38, hh * .07, 3); ctx.fill();
      } else if (it.k === 'img') {
        rr(-w / 2, -hh / 2, w, hh, w * .14); ctx.fillStyle = '#f1efe9'; ctx.fill();
        ctx.save(); ctx.clip();
        ctx.beginPath(); ctx.arc(w * .2, -hh * .18, w * .11, 0, 6.2832); ctx.fillStyle = col === '#f5c518' ? '#e8238f' : '#f5c518'; ctx.fill();
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(-w * .5, hh * .5); ctx.lineTo(-w * .12, -hh * .1); ctx.lineTo(w * .22, hh * .5); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-w * .02, hh * .5); ctx.lineTo(w * .24, hh * .12); ctx.lineTo(w * .5, hh * .5); ctx.globalAlpha = .7; ctx.fill(); ctx.globalAlpha = 1;
        ctx.restore();
      } else if (it.k === 'aa') {
        rr(-w / 2, -hh / 2, w, hh, w * .14); ctx.fillStyle = paper; ctx.fill(); ctx.stroke();
        setF(hh * .46, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = lum(col) > .4 ? ink : col; ctx.fillText('Aa', 0, hh * .04);
      } else if (it.k === 'dot') {
        ctx.beginPath(); ctx.arc(0, 0, it.r, 0, 6.2832); ctx.fillStyle = col; ctx.fill();
      } else if (it.k === 'pin') {
        var r = it.r;
        ctx.beginPath(); ctx.arc(0, -r * .2, r * .72, Math.PI * .8, Math.PI * .2); ctx.lineTo(0, r * .98); ctx.closePath();
        ctx.fillStyle = col; ctx.fill();
        ctx.beginPath(); ctx.arc(0, -r * .2, r * .27, 0, 6.2832); ctx.fillStyle = paper; ctx.fill();
      } else if (it.k === 'cur') {
        ctx.translate(-it.cx, -it.cy);
        ctx.beginPath(); CUR.forEach(function (q, i) { ctx[i ? 'lineTo' : 'moveTo'](q[0] * it.s, q[1] * it.s); }); ctx.closePath();
        ctx.fillStyle = ink; ctx.fill(); ctx.strokeStyle = paper; ctx.stroke();
      } else if (it.k === 'lynx') {
        ctx.translate(-it.cx, -it.cy); ctx.scale(it.s / 64, it.s / 64);
        ctx.fillStyle = ink; ctx.fill(LX.body);
        ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.stroke(LX.ear);
        ctx.fillStyle = amber; ctx.fill(LX.eye);
      }
      ctx.restore();
    }
    function scaleOf(it, now) {
      var k = 1;
      if (it.pop) { var t = Math.min(1, (now - it.born) / 420), c1 = 1.70158, c3 = c1 + 1; k = Math.max(.05, 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)); if (t >= 1) it.pop = false; }
      if (it.dying) k *= Math.max(0, 1 - (now - it.dying) / 450);
      return k;
    }
    function draw(now) {
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      ctx.clearRect(0, 0, st.W, st.H);
      setF(st.F); ctx.fillStyle = ink; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      st.letters.forEach(function (L) { ctx.fillText(L.ch, L.x, L.y + L.off); });
      st.items.forEach(function (b) { var k = scaleOf(b.plugin.it, now); if (k > .01) drawItem(b, k); });
    }

    /* dopad na písmeno — písmeno se zhoupne */
    M.Events.on(eng, 'collisionStart', function (e) {
      e.pairs.forEach(function (p) {
        var a = p.bodyA, b = p.bodyB;
        var li = 'li' in a.plugin ? a.plugin.li : 'li' in b.plugin ? b.plugin.li : null;
        var f = a.plugin.it ? a : b.plugin.it ? b : null;
        if (li == null || !f) return;
        var sp = Math.hypot(f.velocity.x, f.velocity.y);
        if (sp > 2.5) st.letters[li].v += Math.min(sp, 20) * .32;
      });
    });
    function spring() {
      st.letters.forEach(function (L) { L.off += L.v; L.v += -L.off * .22; L.v *= .78; if (Math.abs(L.off) < .01 && Math.abs(L.v) < .01) L.off = L.v = 0; });
    }
    function clean(now) {
      var dead = st.items.filter(function (b) { return b.plugin.it.dying && now - b.plugin.it.dying > 450; });
      if (!dead.length) return;
      C.remove(W, dead);
      st.items = st.items.filter(function (b) { return dead.indexOf(b) < 0; });
    }
    function rain(n) {
      FIRST.slice(0, n).forEach(function (k, i) {
        var x = rand(st.W * .06, st.W * .94), y = -rand(60, 260);
        var go = function () { make(k, x, y, k === 'btn' ? { t: WORDS[(i / 4 | 0) % WORDS.length] } : null); };
        if (reduce) go(); else setTimeout(go, 200 + i * 110);
      });
      if (reduce) for (var s = 0; s < 420; s++) M.Engine.update(eng, 1000 / 60);
    }

    var acc = 0, last = performance.now(), run = false;
    function loop() {
      var now = performance.now();
      acc += Math.min(50, now - last); last = now;
      var n = 0;
      while (acc >= 1000 / 60 && n < 3) { M.Engine.update(eng, 1000 / 60); acc -= 1000 / 60; n++; }
      if (n === 3) acc = 0;
      st.items.forEach(function (b) {
        var p = b.position;
        if (p.y > st.H + 300 || p.x < -300 || p.x > st.W + 300) { Bd.setPosition(b, { x: st.W / 2, y: -80 }); Bd.setVelocity(b, { x: 0, y: 0 }); }
      });
      spring(); clean(now); draw(now);
      if (st.vis && !d.hidden) requestAnimationFrame(loop); else run = false;
    }
    function kick() { if (!run) { run = true; last = performance.now(); requestAnimationFrame(loop); } }

    /* ruka: chytit, hodit, klepnutím přidat */
    var drag = null, down = null, ptr = { x: -1e4, y: -1e4, vx: 0, vy: 0, t: 0 };
    var local = function (e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    function hit(p) {
      var L = live(), hs = M.Query.point(L, p);
      if (hs.length) return hs[hs.length - 1];
      if (!coarse) return null;
      var best = null, bd = 18;
      L.forEach(function (b) { var dd = Math.hypot(b.position.x - p.x, b.position.y - p.y) - Math.max(b.bounds.max.x - b.bounds.min.x, b.bounds.max.y - b.bounds.min.y) / 2; if (dd < bd) { bd = dd; best = b; } });
      return best;
    }
    cv.addEventListener('touchstart', function (e) { var t = e.touches[0]; if (t && hit(local(t))) e.preventDefault(); }, { passive: false });
    cv.addEventListener('pointerdown', function (e) {
      var p = local(e); down = { x: p.x, y: p.y, t: performance.now() };
      var b = hit(p); if (!b) return;
      Sl.set(b, false);
      drag = M.Constraint.create({ pointA: { x: p.x, y: p.y }, bodyB: b, pointB: { x: p.x - b.position.x, y: p.y - b.position.y }, stiffness: .2, damping: .1, length: 0 });
      C.add(W, drag); play.classList.add('is-grab');
      try { cv.setPointerCapture(e.pointerId); } catch (er) {}
      kick();
    });
    cv.addEventListener('pointermove', function (e) {
      var p = local(e), now = performance.now(), dt = now - ptr.t;
      if (dt > 0 && dt < 120) { ptr.vx = (p.x - ptr.x) / dt * 16; ptr.vy = (p.y - ptr.y) / dt * 16; } else { ptr.vx = ptr.vy = 0; }
      ptr.x = p.x; ptr.y = p.y; ptr.t = now;
      if (drag) { drag.pointA.x = p.x; drag.pointA.y = p.y; return; }
      if (coarse) return;
      play.classList.toggle('is-over', !!hit(p));
      var sp = Math.hypot(ptr.vx, ptr.vy);
      if (sp < 5) return;
      live().forEach(function (b) {
        var dd = Math.hypot(b.position.x - p.x, b.position.y - p.y), R = unit() * 2.4;
        if (dd > R) return;
        var k = (1 - dd / R) * .14;
        Sl.set(b, false);
        Bd.setVelocity(b, { x: b.velocity.x + clamp(ptr.vx, -30, 30) * k, y: b.velocity.y + clamp(ptr.vy, -30, 30) * k - .6 });
        Bd.setAngularVelocity(b, b.angularVelocity + ptr.vx * .002);
      });
    });
    var release = function () { if (drag) { C.remove(W, drag); drag = null; play.classList.remove('is-grab'); } };
    cv.addEventListener('pointerup', function (e) {
      var p = local(e);
      var tap = !drag && down && Math.hypot(p.x - down.x, p.y - down.y) < 8 && performance.now() - down.t < 450;
      release(); down = null;
      if (!tap) return;
      var y = p.y, inL = M.Query.point(st.statics.slice(3), p)[0];
      if (inL) y = inL.bounds.min.y - unit();
      make(anyOf(MORE), p.x, y, { pop: true, vy: -rand(5, 10), vx: rand(-3, 3) });
      kick();
    });
    cv.addEventListener('pointercancel', function () { release(); down = null; });
    cv.addEventListener('pointerleave', function () { play.classList.remove('is-over'); });

    /* rychlé rolování — hromada povyskočí */
    var sy = scrollY, stt = performance.now();
    addEventListener('scroll', function () {
      var now = performance.now(), dy = scrollY - sy, dt = Math.max(8, now - stt); sy = scrollY; stt = now;
      if (reduce || !st.vis || now - st.hopT < 420) return;
      var v = Math.abs(dy) / dt * 16; if (v < 14) return;
      st.hopT = now;
      var k = clamp(v / 50, .3, 1);
      live().forEach(function (b) {
        if (b.position.y < st.H * .3) return;
        Sl.set(b, false);
        Bd.setVelocity(b, { x: b.velocity.x + rand(-1.6, 1.6) * k, y: b.velocity.y - rand(4, 9) * k });
        Bd.setAngularVelocity(b, b.angularVelocity + rand(-.12, .12) * k);
      });
      kick();
    }, { passive: true });

    layout();
    word.classList.add('is-drawn');
    draw(performance.now());
    seen(play, function (v, en) {
      st.vis = v;
      if (v && !st.rained && en && en.intersectionRatio > .25) { st.rained = true; rain(st.W < 700 ? 14 : 24); }
      if (v) kick();
    }, { threshold: [0, .3] });
    d.addEventListener('visibilitychange', function () { if (!d.hidden && st.vis) kick(); });
    var rw = innerWidth, rh = innerHeight, rT = null;
    addEventListener('resize', function () {
      clearTimeout(rT);
      rT = setTimeout(function () {
        if (innerWidth === rw && Math.abs(innerHeight - rh) < 90) return;
        rw = innerWidth; rh = innerHeight;
        layout();
        st.items.forEach(function (b) { Sl.set(b, false); Bd.setPosition(b, { x: clamp(b.position.x, 30, st.W - 30), y: Math.min(b.position.y, st.H * .3) }); });
        kick();
      }, 180);
    });
    window.__ft = { st: st, count: function () { return live().length; } };
  }

  /* ---------- Naše práce: filtry a listování náhledů ---------- */
  var grid = $('.p-grid');
  if (grid) {
    var btns = $$('.filters button'), cards = $$('.pw', grid), ft = null;
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.dataset.f;
        btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        clearTimeout(ft);
        var show = cards.filter(function (c) { return f === 'vse' || c.dataset.kind === f; });
        cards.forEach(function (c) { if (show.indexOf(c) < 0) c.classList.add('is-out'); });
        ft = setTimeout(function () {
          cards.forEach(function (c) {
            var on = show.indexOf(c) > -1;
            c.classList.toggle('is-gone', !on);
            if (on) c.classList.add('is-out');
          });
          requestAnimationFrame(function () { requestAnimationFrame(function () {
            show.forEach(function (c) { c.classList.remove('is-out'); });
          }); });
        }, reduce ? 0 : 340);
      });
    });

    var T = 1700;
    var load = function (img) { if (img && img.dataset.src) { img.src = img.dataset.src; img.removeAttribute('data-src'); } };
    var cyclers = $$('.pw-shot', grid).map(function (shot) {
      var fr = $('.frames', shot), imgs = $$('img', fr), bars = $$('.pw-bars i', shot), n = 0, timer = null;
      var showF = function (i) {
        imgs.forEach(function (im, j) { im.classList.toggle('on', j === i); });
        bars.forEach(function (b, j) { b.classList.remove('run'); b.classList.toggle('done', j < i); });
        if (bars[i]) { void bars[i].offsetWidth; bars[i].style.setProperty('--t', T + 'ms'); bars[i].classList.add('run'); }
      };
      return {
        shot: shot,
        start: function () {
          if (timer || imgs.length < 2) return;
          imgs.forEach(load);
          fr.classList.add('cycling'); n = 0; showF(0);
          timer = setInterval(function () { n = (n + 1) % imgs.length; showF(n); }, T);
        },
        stop: function () {
          clearInterval(timer); timer = null;
          fr.classList.remove('cycling');
          imgs.forEach(function (im) { im.classList.remove('on'); });
          bars.forEach(function (b) { b.classList.remove('run', 'done'); });
        }
      };
    });
    if (!reduce) {
      if (fine) cyclers.forEach(function (c) {
        c.shot.addEventListener('pointerenter', c.start);
        c.shot.addEventListener('pointerleave', c.stop);
        c.shot.addEventListener('focus', c.start);
        c.shot.addEventListener('blur', c.stop);
      });
      else if (hasIO) {
        var cio = new IntersectionObserver(function (es) {
          es.forEach(function (en) {
            var c = cyclers.filter(function (x) { return x.shot === en.target; })[0];
            if (en.intersectionRatio >= 0.6) c.start(); else c.stop();
          });
        }, { threshold: [0, 0.6] });
        cyclers.forEach(function (c) { cio.observe(c.shot); });
      }
    }
  }

  addEventListener('load', function () {
    onScroll();
    if (location.hash.length > 1) {
      var t = d.getElementById(location.hash.slice(1));
      if (t) setTimeout(function () { goTo(t, true); }, 60);
    }
  });
  onScroll();

  /* ---------- formulář ---------- */
  var form = $('#form'), msg = $('#form-msg');
  if (form && msg) {
    var FAIL = 'Zprávu se nepodařilo odeslat. Zavolejte nám prosím na 776 289 219 nebo napište na vladislav@whytelynx.cz.';
    var OK = 'Děkujeme, zpráva odešla. Brzy se Vám ozveme.';
    var showMsg = function (ok, text) { msg.className = 'form-msg ' + (ok ? 'ok' : 'err'); msg.textContent = text; };
    var q = location.search;
    if (q.indexOf('odeslano=1') > -1) showMsg(true, OK);
    if (q.indexOf('chyba=1') > -1) showMsg(false, FAIL);
    var c = $('#f-contact');
    var contactOk = function (v) {
      v = v.trim(); var dg = v.replace(/\D/g, '');
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || (/^\+?[\d\s\-\/().]+$/.test(v) && dg.length >= 9 && dg.length <= 15);
    };
    c.addEventListener('input', function () { c.setCustomValidity(''); });
    form.addEventListener('submit', function (e) {
      if (!contactOk(c.value)) {
        e.preventDefault(); c.setCustomValidity('Zadejte platný e-mail nebo telefonní číslo.'); c.reportValidity(); return;
      }
      if (!window.fetch || !window.FormData) return;
      e.preventDefault();
      var b = $('button', form), label = b.textContent; b.disabled = true; b.textContent = 'Odesílám…';
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (dt) {
          if (dt.ok) { form.reset(); showMsg(true, OK); }
          else showMsg(false, dt.error || FAIL);
        })
        .catch(function () { showMsg(false, FAIL); })
        .then(function () { b.disabled = false; b.textContent = label; });
    });
  }
})();
