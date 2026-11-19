/* Pět nápadů místo telefonu pod karuselem (zkušební verze, J 16. 11. 2026). */
(function () {
  'use strict';
  var d = document;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var reduce = matchMedia('(min-width:100000px)').matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var ease = function (p) { p = clamp(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  function seen(el, fn, th) {
    if (!('IntersectionObserver' in window)) { fn(true); return; }
    new IntersectionObserver(function (es) { fn(es[0].isIntersecting); }, { threshold: th || 0.25 }).observe(el);
  }
  function typed(s, a, b, t) { return s.slice(0, Math.round(s.length * clamp((t - a) / (b - a), 0, 1))); }
  function tapAt(tap, scr, el, fx, fy) {
    var r = el.getBoundingClientRect(), sr = scr.getBoundingClientRect();
    tap.style.left = (r.left - sr.left + r.width * (fx == null ? 0.5 : fx)) + 'px';
    tap.style.top = (r.top - sr.top + r.height * (fy == null ? 0.5 : fy)) + 'px';
    tap.classList.remove('go'); void tap.offsetWidth; tap.classList.add('go');
  }
  function inView(el) { var r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }

  /* ---------- 1) Vaše firma v Googlu ---------- */
  var p1 = $('#p1');
  if (p1) (function () {
    var scr = $('.ph-screen', p1), tap = $('.tap', p1);
    var srch = $('.p1-search', p1), qT = $('.q-t', p1), web = $('.chips .web', p1);
    var cB = $('.card b', p1), cS = $('.card span', p1);
    var site = $('.p1-site', p1), roll = $('.p1-site .scroller', p1);
    var sNm = $('.s1-nm', p1), sMono = $('.s1-mono', p1), sH = $('.s1-h', p1), sEye = $('.s1-eye', p1), sMap = $('.s1-map span', p1);
    var form = $('#n1-form'), inN = $('#n1-name'), inC = $('#n1-city'), again = $('.n1-again');
    var data = { n: 'Vaše firma', c: 'Liberec' }, user = false;
    var t = 0, S = -1, fired = {}, vis = false, last = 0, running = false, END = 10.6;
    function mono(n) {
      var w = n.split(/\s+/).filter(function (x) { return x.length > 1; });
      return ((w[0] || n)[0] + (w[1] ? w[1][0] : '')).toUpperCase();
    }
    function fill() {
      var n = data.n, c = data.c;
      cB.textContent = n; cS.textContent = c + ' · Otevřeno do 17:00';
      sNm.textContent = n; sMono.textContent = mono(n); sH.textContent = n;
      sH.style.setProperty('--fs', n.length <= 10 ? 32 : n.length <= 16 ? 27 : n.length <= 24 ? 23 : 19);
      sEye.textContent = c + ' a okolí'; sMap.textContent = c;
    }
    function q() { return (data.n + ' ' + data.c).toLowerCase(); }
    function scene(s) { if (s !== S) { S = s; p1.dataset.s = String(s); } }
    function render(tt) {
      if (tt < 3.9) {
        scene(0);
        roll.style.transform = '';
        qT.textContent = typed(q(), 0.4, 2.0, tt);
        srch.classList.toggle('shown', tt >= 2.2);
        if (tt >= 3.35 && !fired.a) { fired.a = 1; tapAt(tap, scr, web); }
      } else {
        scene(1);
        var maxY = Math.max(0, roll.offsetHeight - site.offsetHeight);
        roll.style.transform = 'translateY(' + (-maxY * ease((tt - 4.8) / 4.2)).toFixed(1) + 'px)';
      }
    }
    function restart(u) { user = u; t = 0; fired = {}; render(0); again.classList.toggle('on', false); start(); }
    function loop(ts) {
      var dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
      t += dt;
      if (t >= END) {
        if (user) { render(END); again.classList.add('on'); running = false; last = 0; return; }
        t = 0; fired = {};
      }
      render(t);
      if (vis && !d.hidden) requestAnimationFrame(loop); else { running = false; last = 0; }
    }
    function start() { if (reduce) { render(END); return; } if (!running && vis) { running = true; requestAnimationFrame(loop); } }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      data.n = (inN.value.trim() || 'Vaše firma').slice(0, 40);
      data.c = (inC.value.trim() || 'Liberec').slice(0, 30);
      fill(); restart(true);
      if (innerWidth <= 860 && !inView(p1)) p1.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    });
    $('.n1-replay').addEventListener('click', function () { restart(true); });
    fill(); render(reduce ? END : 0);
    seen(p1, function (v) { vis = v; if (v) start(); }, 0.3);
    d.addEventListener('visibilitychange', function () { if (!d.hidden && vis) start(); });
  })();

  /* ---------- 2) Web se staví před očima ---------- */
  var n2 = $('.n2');
  if (n2) (function () {
    var track = $('.n2-track', n2), steps = $$('.n2-steps li', n2), dots = $$('.n2-dots i', n2);
    var capB = $('.n2-cap b', n2), capS = $('.n2-cap span', n2);
    var TXT = steps.map(function (li) { return [$('b', li).textContent, $('span', li).textContent]; });
    var cur = -1;
    function set(s) {
      if (s === cur) return; cur = s;
      n2.dataset.step = String(s);
      steps.forEach(function (li, i) { li.classList.toggle('on', i === s - 1); li.classList.toggle('done', i < s - 1); });
      dots.forEach(function (o, i) { o.classList.toggle('on', i < s); });
      var k = Math.max(0, s - 1); capB.textContent = s ? (s + '/5 ' + TXT[k][0]) : 'Prázdná stránka'; capS.textContent = s ? TXT[k][1] : 'Posouvejte dolů a web se postaví.';
    }
    if (reduce) { n2.classList.add('static'); set(5); return; }
    var ticking = false;
    function upd() {
      ticking = false;
      var r = track.getBoundingClientRect(), span = track.offsetHeight - innerHeight;
      var p = clamp(-r.top / Math.max(1, span), 0, 1);
      set(Math.min(5, Math.floor(p * 6.2)));
    }
    addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    addEventListener('resize', upd);
    upd();
  })();

  /* ---------- 3) Před a po ---------- */
  var cmp = $('.cmp');
  if (cmp) (function () {
    var knob = $('.knob', cmp), pos = 50, drag = null, touched = false;
    function set(v) { pos = clamp(v, 2, 98); cmp.style.setProperty('--pos', pos.toFixed(2) + '%'); knob.setAttribute('aria-valuenow', Math.round(pos)); }
    function fromX(x) { var r = cmp.getBoundingClientRect(); return (x - r.left) / r.width * 100; }
    cmp.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      touched = true; drag = { id: e.pointerId, x: e.clientX, y: e.clientY, on: e.pointerType === 'mouse' || e.target === knob };
      if (drag.on) { cmp.classList.add('drag'); cmp.setPointerCapture(e.pointerId); set(fromX(e.clientX)); }
    });
    cmp.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.on) {   /* dotyk mimo knoflík: vodorovný tah = posuvník, svislý = stránka se posouvá dál */
        var dx = Math.abs(e.clientX - drag.x), dy = Math.abs(e.clientY - drag.y);
        if (dx > 8 && dx > dy) { drag.on = true; cmp.classList.add('drag'); try { cmp.setPointerCapture(e.pointerId); } catch (_) {} }
        else if (dy > 8) { drag = null; return; }
        else return;
      }
      set(fromX(e.clientX));
    });
    function up(e) { if (drag && drag.on === false && e.type === 'pointerup') set(fromX(e.clientX)); drag = null; cmp.classList.remove('drag'); }
    cmp.addEventListener('pointerup', up);
    cmp.addEventListener('pointercancel', up);
    knob.addEventListener('keydown', function (e) {
      var k = e.key, st = e.shiftKey ? 20 : 5;
      if (k === 'ArrowLeft' || k === 'ArrowDown') set(pos - st);
      else if (k === 'ArrowRight' || k === 'ArrowUp') set(pos + st);
      else if (k === 'Home') set(2); else if (k === 'End') set(98); else return;
      touched = true; e.preventDefault();
    });
    set(50);
    if (reduce) return;
    var done = false;
    seen(cmp, function (v) {   /* jednou ukázat, že se dá táhnout: 50 → 78 → 24 → 50 */
      if (!v || done || touched) return; done = true;
      var t0 = performance.now(), K = [[0, 50], [0.9, 78], [2.0, 24], [2.8, 50]];
      (function step(now) {
        if (touched) return;
        var t = (now - t0) / 1000, i = 0;
        while (i < K.length - 2 && t > K[i + 1][0]) i++;
        var a = K[i], b = K[i + 1], p = ease((t - a[0]) / (b[0] - a[0]));
        set(a[1] + (b[1] - a[1]) * p);
        if (t < K[K.length - 1][0]) requestAnimationFrame(step);
      })(t0);
    }, 0.6);
  })();

  /* ---------- 4) Obor na jedno ťuknutí ---------- */
  var n4 = $('.n4');
  if (n4) (function () {
    var btns = $$('.n4-chips button', n4), shots = $$('.n4-shot', n4);
    var nm = $('.n4-info b', n4), ds = $('.n4-info p', n4), go = $('.n4-go', n4), want = $('.n4-want', n4);
    var cur = 0, auto = !reduce, vis = false, timer = 0, loaded = false;
    function load() { if (loaded) return; loaded = true; shots.forEach(function (im) { if (im.dataset.src) { im.src = im.dataset.src; im.removeAttribute('data-src'); } }); }
    function show(i, first) {
      var b = btns[i];
      btns.forEach(function (x, j) { x.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
      n4.style.setProperty('--tint', b.dataset.tint); n4.style.setProperty('--acc', b.dataset.acc);
      nm.textContent = b.dataset.name; ds.textContent = b.dataset.desc;
      go.href = b.dataset.href; want.textContent = 'Chci web pro ' + b.dataset.pro;
      if (first) { shots[i].classList.add('pre', 'on'); void shots[i].offsetWidth; shots[i].classList.remove('pre'); cur = i; return; }
      if (i === cur) return;
      var old = shots[cur], nw = shots[i];
      shots.forEach(function (s) { if (s !== old && s !== nw) { s.classList.add('pre'); s.classList.remove('on', 'out'); } });
      nw.classList.add('pre'); nw.classList.remove('on', 'out'); void nw.offsetWidth; nw.classList.remove('pre');
      old.classList.remove('on'); old.classList.add('out'); nw.classList.add('on');
      cur = i;
    }
    btns.forEach(function (b, i) { b.addEventListener('click', function () { auto = false; clearTimeout(timer); load(); show(i); }); });
    function tick() { clearTimeout(timer); if (!auto || !vis) return; timer = setTimeout(function () { if (auto && vis && !d.hidden) show((cur + 1) % btns.length); tick(); }, 3200); }
    show(0, true);
    seen(n4, function (v) { vis = v; if (v) { load(); tick(); } else clearTimeout(timer); }, 0.35);
  })();

  /* ---------- 5) Telefon do ruky ---------- */
  var p5 = $('#p5');
  if (p5) (function () {
    var scr = $('.ph-screen', p5), tap = $('.tap', p5), ring = $('.ring', p5), bub = $('.bub', p5);
    var srch = $('.sc-search', p5), qT = $('.q-t', p5), web = $('.chips .web', p5);
    var site = $('.sc-site', p5), rollEl = $('.sc-site .roll', p5), lista = $('.sc-site .lista', p5), lhit = $('.lista-hit', p5);
    var form = $('.sc-form', p5), fRoll = $('.sc-form .scroller', p5), pg = $('.pg', p5), chip = $('.chip-on', p5), chipHit = $('.chip-hit', p5);
    var fv = $$('.fv:not(.send)', p5), send = $('.fv.send', p5), toast = $('.toast', p5);
    var stepB = $$('.n5-steps button'), hint = $('.n5-hint'), again = $('.n5-again');
    var Q = 'květinářství liberec';
    var VALS = ['Babičce k osmdesátinám', 'Všechno nejlepší, babi! Máme Tě moc rádi.', '777 123 456'];
    var HINT = ['Ťukněte na „Web“ u první firmy', 'Posuňte web prstem a ťukněte na „Objednat“', 'Ťukněte na pole, pak na „Odeslat“'];
    var S = -1, typedQ = false, filled = [0, 0, 0], sent = false, anim = null;
    function ringAt(el, fx, fy, label, above) {
      if (!el) { ring.classList.remove('on'); bub.classList.remove('on'); return; }
      var r = el.getBoundingClientRect(), sr = scr.getBoundingClientRect();
      var x = r.left - sr.left + r.width * (fx == null ? 0.5 : fx), y = r.top - sr.top + r.height * (fy == null ? 0.5 : fy);
      ring.style.left = x + 'px'; ring.style.top = y + 'px'; ring.classList.add('on');
      bub.textContent = label || 'Ťukněte';
      bub.style.left = clamp(x, sr.width * 0.28, sr.width * 0.72) + 'px';
      bub.style.top = (above ? y - sr.width * 0.2 : y + sr.width * 0.1) + 'px';
      bub.classList.add('on');
    }
    function run(fn, dur, done) {   /* krátká animace přes requestAnimationFrame */
      if (anim) cancelAnimationFrame(anim.id);
      var t0 = performance.now();
      anim = { id: requestAnimationFrame(function f(now) {
        var p = clamp((now - t0) / (dur * 1000), 0, 1); fn(p);
        if (p < 1) anim.id = requestAnimationFrame(f); else { anim = null; if (done) done(); }
      }) };
    }
    function formY() { var k = pg.offsetHeight / 1442.67, max = Math.max(0, pg.offsetHeight - form.offsetHeight); return Math.min(max, 589 * k); }
    function show(s) {
      S = s; p5.dataset.s = String(s);
      stepB.forEach(function (b, i) { if (i === s) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); b.classList.toggle('done', i < s); });
      hint.textContent = HINT[s]; again.classList.remove('on');
      p5.classList.toggle('lt', false);
      ringAt(null);
      if (s === 0) {
        srch.classList.remove('shown'); qT.textContent = '';
        if (reduce) { qT.textContent = Q; srch.classList.add('shown'); ringAt(web, 0.5, 0.5, 'Ťukněte', false); return; }
        run(function (p) { qT.textContent = typed(Q, 0, 1, p); }, 1.4, function () {
          setTimeout(function () { srch.classList.add('shown'); setTimeout(function () { if (S === 0) ringAt(web, 0.5, 0.5, 'Ťukněte', false); }, 650); }, 200);
        });
      } else if (s === 1) {
        rollEl.scrollTop = 0; lista.classList.remove('on');
        setTimeout(function () { if (S === 1 && !lista.classList.contains('on')) ringAt(site, 0.5, 0.62, 'Posuňte prstem nahoru', true); }, 700);
      } else {
        fRoll.style.transform = 'translateY(' + (-formY()).toFixed(1) + 'px)';
        filled = [0, 0, 0]; sent = false; chip.classList.remove('on'); toast.classList.remove('on');
        fv.forEach(function (f) { f.textContent = ''; f.classList.remove('act'); });
        setTimeout(function () { if (S === 2) ringAt(fv[0], 0.5, 0.5, 'Ťukněte na pole', true); }, 500);
      }
    }
    function nextHint() {
      if (S !== 2 || sent) return;
      for (var i = 0; i < fv.length; i++) if (!filled[i]) { ringAt(fv[i], 0.5, 0.5, 'Ťukněte na pole', true); return; }
      ringAt(send, 0.5, 0.5, 'Odeslat', true);
    }
    function fillField(i, then) {
      if (filled[i]) { if (then) then(); return; }
      filled[i] = 1; fv[i].classList.add('act'); ringAt(null);
      var v = VALS[i];
      run(function (p) { fv[i].textContent = typed(v, 0, 1, p); }, reduce ? 0.01 : Math.min(1.4, 0.35 + v.length * 0.025), function () {
        fv[i].classList.remove('act'); if (then) then(); else nextHint();
      });
    }
    web.addEventListener('click', function () { if (S !== 0) return; tapAt(tap, scr, web); setTimeout(function () { show(1); }, 260); });
    rollEl.addEventListener('scroll', function () {
      if (S !== 1) return;
      var lt = rollEl.scrollTop > site.offsetHeight * 0.4;
      if (lt && !lista.classList.contains('on')) { lista.classList.add('on'); p5.classList.add('lt'); setTimeout(function () { if (S === 1) ringAt(lista, 0.827, 0.5, 'Objednat', false); }, 250); }
      if (!lt && rollEl.scrollTop < 4 && lista.classList.contains('on')) { lista.classList.remove('on'); p5.classList.remove('lt'); ringAt(null); }
      if (lt) return;
      ringAt(null);
    }, { passive: true });
    lhit.addEventListener('click', function (e) {
      if (S !== 1) return;
      var r = lhit.getBoundingClientRect();
      if ((e.clientX - r.left) / r.width < 0.62) { ringAt(lista, 0.827, 0.5, 'Objednat je tady', false); return; }
      tapAt(tap, scr, lista, 0.827, 0.5); setTimeout(function () { show(2); }, 260);
    });
    chipHit.addEventListener('click', function () { if (S === 2 && !sent) { tapAt(tap, scr, chip, 0.567, 0.5); chip.classList.toggle('on'); } });
    fv.forEach(function (f, i) { f.addEventListener('click', function () { if (S === 2 && !sent) { tapAt(tap, scr, f); fillField(i); } }); });
    send.addEventListener('click', function () {
      if (S !== 2 || sent) return;
      tapAt(tap, scr, send); ringAt(null);
      (function chain(i) {
        if (i < fv.length) { fillField(i, function () { chain(i + 1); }); return; }
        sent = true; send.classList.add('down');
        setTimeout(function () { send.classList.remove('down'); toast.classList.add('on'); hint.textContent = 'Hotovo. Takhle vám přijde objednávka do e-mailu.'; again.classList.add('on'); }, 260);
      })(0);
    });
    stepB.forEach(function (b, i) { b.addEventListener('click', function () { show(i); }); });
    again.addEventListener('click', function () { show(0); });
    var started = false;
    seen(p5, function (v) {
      if (!v) return;
      $$('img[data-src]', p5).forEach(function (im) { im.src = im.dataset.src; im.removeAttribute('data-src'); });
      if (!started) { started = true; show(0); }
    }, 0.4);
    addEventListener('resize', function () { if (S === 2) fRoll.style.transform = 'translateY(' + (-formY()).toFixed(1) + 'px)'; });
  })();
})();
