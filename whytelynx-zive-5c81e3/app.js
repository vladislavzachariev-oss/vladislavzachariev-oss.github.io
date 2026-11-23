/* Whyte Lynx · váš web naživo (J 2026-11-23) */
(function () {
  'use strict';
  var T = {
    bistro: { label: 'Bistro', def: 'Bistro Na Rohu', q: 'bistro liberec', bg: '#f6f1e7', ink: '#2a1f14', acc: '#b4532a',
      tag: 'Bistro · Liberec', hl: 'Poctivá česká kuchyně, každý den čerstvě.', sub: 'Polední menu od 11:00. Večer stůl pro celou partu.',
      cta: 'Rezervovat stůl', open: 'Dnes otevřeno 11–22', links: ['Menu', 'Rezervace', 'Kde jsme'],
      items: [['Svíčková na smetaně', '189 Kč'], ['Kulajda s vejcem', '89 Kč'], ['Buchtičky se šodó', '109 Kč']],
      notif: 'Rezervace: stůl pro 4, zítra 19:00' },
    kavarna: { label: 'Kavárna', def: 'Kavárna Pod Lípou', q: 'kavárna liberec', bg: '#f3ede4', ink: '#1f1a15', acc: '#8a5a2b',
      tag: 'Kavárna · Liberec', hl: 'Káva, u které se rádi zdržíte.', sub: 'Vlastní pražení, domácí koláče a místo u okna.',
      cta: 'Kudy k nám', open: 'Dnes otevřeno 7–19', links: ['Nabídka', 'Káva domů', 'Kde jsme'],
      items: [['Espresso', '55 Kč'], ['Flat white', '79 Kč'], ['Domácí koláč', '69 Kč']],
      notif: 'Objednávka: 2× zrnková káva, vyzvednu v 15:00' },
    autoservis: { label: 'Autoservis', def: 'Autoservis Na Kopci', q: 'autoservis liberec', bg: '#eef1f4', ink: '#0e1620', acc: '#e2461f',
      tag: 'Autoservis · Liberec', hl: 'Servis bez čekání. Termín si vyberete online.', sub: 'Opravy, pneu a diagnostika všech značek. Auto vám vrátíme ten den.',
      cta: 'Objednat servis', open: 'Dnes otevřeno 7–17', links: ['Služby', 'Ceník', 'Objednávka'],
      items: [['Výměna oleje', 'od 990 Kč'], ['Přezutí', '600 Kč'], ['Diagnostika', '450 Kč']],
      notif: 'Objednávka servisu: přezutí, čtvrtek 8:00' },
    kvetiny: { label: 'Květiny', def: 'Květiny Zvonek', q: 'květinářství liberec', bg: '#f7f2f1', ink: '#2b1d22', acc: '#c2456a',
      tag: 'Květinářství · Liberec', hl: 'Kytice uvážeme do hodiny.', sub: 'Na rande, k narozeninám i na svatbu. Po Liberci ji doneseme.',
      cta: 'Objednat kytici', open: 'Dnes otevřeno 8–18', links: ['Kytice', 'Svatby', 'Rozvoz'],
      items: [['Kytice tulipánů', '590 Kč'], ['Svatební kytice', '2 400 Kč'], ['Rozvoz po Liberci', '99 Kč']],
      notif: 'Objednávka: kytice tulipánů, dnes v 16:00' },
    podlahy: { label: 'Podlahy', def: 'Podlahy Dřevák', q: 'podlahář liberec', bg: '#f2efe9', ink: '#1f1a14', acc: '#7a5a2e',
      tag: 'Podlahy · Liberec', hl: 'Podlahy, které vydrží generace.', sub: 'Dřevo, vinyl i renovace. Přijedeme, změříme a nacenime zdarma.',
      cta: 'Nezávazná poptávka', open: 'Po–Pá 7–16', links: ['Podlahy', 'Realizace', 'Poptávka'],
      items: [['Dubová prkna', 'od 1 290 Kč/m²'], ['Pokládka', 'od 390 Kč/m²'], ['Renovace', 'od 290 Kč/m²']],
      notif: 'Poptávka: dubová podlaha, 42 m²' },
    chata: { label: 'Chata', def: 'Chata Na Hřebeni', q: 'chata jizerské hory', bg: '#eef2ee', ink: '#14201a', acc: '#2f6b4a',
      tag: 'Chata · Jizerské hory', hl: 'Chata nad lesem. Sauna, klid, výhled.', sub: 'Pro osm lidí, s krbem a saunou. Volné termíny vidíte hned.',
      cta: 'Ověřit termín', open: 'Volno od pátku', links: ['Chata', 'Ceník', 'Termíny'],
      items: [['Celá chata', 'od 3 900 Kč/noc'], ['Sauna', 'v ceně'], ['Hostů', 'až 8']],
      notif: 'Poptávka termínu: 12.–14. 12., 6 osob' }
  };
  T.podlahy.sub = 'Dřevo, vinyl i renovace. Přijedeme, změříme a naceníme zdarma.';
  var ORDER = ['bistro', 'kavarna', 'autoservis', 'kvetiny', 'podlahy', 'chata'];

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement, story = $('#story'), dev = $('#device'), input = $('#name'), caret = $('.caret');
  var desk = $('.layer.desk'), mob = $('.layer.mob'), mm = $('.mm'), srch = $('.layer.srch'), call = $('.layer.call');
  var bar = $('.device .bar'), screen = $('.device .screen'), steps = $$('.step'), nav = $('.nav');
  var rows = $$('.res .r.sk'), me = $('.res .r.me');

  var trade = 'bistro', typed = '', userName = '', auto = true;

  /* ---------- obsah podle oboru a jména ---------- */
  function txt(sel, v) { $$(sel, dev).forEach(function (e) { e.textContent = v; }); }

  var decoded = {};
  function predecode(t) {
    if (decoded[t]) return decoded[t];
    decoded[t] = Promise.all([t, t + '2'].map(function (f) { var i = new Image(); i.src = 'img/t/' + f + '.webp'; return i.decode ? i.decode().catch(function () {}) : Promise.resolve(); }));
    return decoded[t];
  }
  var want = 'bistro';
  function setTrade(t, anim) {
    want = t; $$('.chips button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-t') === t ? 'true' : 'false'); });
    if (!anim) return applyTrade(t, false);
    predecode(t).then(function () { if (want === t) applyTrade(t, true); });
  }
  function applyTrade(t, anim) {
    trade = t; var d = T[t];
    $$('.ms', dev).forEach(function (m) { m.setAttribute('data-t', t); m.style.setProperty('--bg', d.bg); m.style.setProperty('--ink2', d.ink); m.style.setProperty('--acc', d.acc); });
    dev.style.setProperty('--acc', d.acc);
    txt('.tag', d.tag); txt('.hl', d.hl); txt('.sub', d.sub); txt('.ctx', d.cta); txt('.open', d.open);
    txt('.l1', d.links[0]); txt('.l2', d.links[1]); txt('.l3', d.links[2]); txt('.notif', d.notif);
    d.items.forEach(function (it, i) { txt('.i' + i + 'n', it[0]); txt('.i' + i + 'p', it[1]); });
    $$('.q').forEach(function (e) { e.textContent = d.q; });
    var ph = $$('.p1, .p2', dev), sw = anim ? $$('.sw', dev) : [];
    if (anim) { ph.forEach(function (e) { e.classList.remove('ph-swap'); }); sw.forEach(function (e) { e.classList.remove('swap'); }); }
    $$('.p1', dev).forEach(function (e) { e.src = 'img/t/' + t + '.webp'; });
    $$('.p2', dev).forEach(function (e) { e.src = 'img/t/' + t + '2.webp'; });
    if (anim) { void dev.offsetWidth; ph.forEach(function (e) { e.classList.add('ph-swap'); }); sw.forEach(function (e) { e.classList.add('swap'); }); }
    $$('.chips button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-t') === t ? 'true' : 'false'); });
    setName();
  }

  function slugify(s) {
    s = (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    return s.slice(0, 22) || 'vasefirma';
  }
  function setName() {
    var n = (auto ? typed : userName).trim();
    var shown = n || 'Vaše firma';
    txt('.nm', shown); txt('.slug', slugify(n));
    txt('.ini', (n || T[trade].def).charAt(0).toUpperCase());
    var live = userName.trim();
    $$('.nm-live').forEach(function (e) { e.textContent = live || 'vaši firmu'; });
    var body = 'Dobrý den,\n\nmám zájem o návrh webu zdarma.\n' + (live ? 'Firma: ' + live + '\n' : 'Firma: \n') + 'Obor: ' + T[trade].label + '\n\nDěkuji';
    $('#mail').href = 'mailto:vladislav@whytelynx.cz?subject=' + encodeURIComponent('Návrh webu zdarma' + (live ? ': ' + live : '')) + '&body=' + encodeURIComponent(body);
    placeCaret();
  }

  /* kurzor za textem, dokud pole nemá fokus */
  var cv = document.createElement('canvas').getContext('2d');
  function placeCaret() {
    var cs = getComputedStyle(input);
    cv.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    try { cv.letterSpacing = cs.letterSpacing; } catch (e) {}
    var w = input.value ? cv.measureText(input.value).width : 0;
    caret.style.left = Math.min(w + 3, input.clientWidth - 4) + 'px';
  }

  /* ---------- samo psaní, dokud návštěvník nezačne ---------- */
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var prog = 0, progT = 0;
  /* píše jen, když stránka stojí: při posunu nesmí nic přerušit plynulost */
  var lastMove = 0;
  function still() { return !raf && performance.now() - lastMove > 450; }
  function idle() { return new Promise(function (r) { (function chk() { if (!auto) return; if (progT < .35 && !document.hidden && still()) r(); else setTimeout(chk, 150); })(); }); }
  async function autoLoop() {
    await wait(650);
    var i = 0;
    while (auto) {
      var d = T[ORDER[i]];
      if (ORDER[i] !== trade) { await idle(); setTrade(ORDER[i], true); }
      for (var k = 1; k <= d.def.length && auto; k++) { await idle(); typed = d.def.slice(0, k); input.value = typed; setName(); await wait(55 + Math.random() * 60); }
      await wait(2600); if (!auto) return; await idle();
      for (k = d.def.length - 1; k >= 0 && auto; k--) { await idle(); typed = d.def.slice(0, k); input.value = typed; setName(); await wait(22); }
      if (!auto) return;
      i = (i + 1) % ORDER.length;
      await wait(250);
    }
  }
  function stopAuto() {
    if (!auto) return;
    auto = false; typed = '';
  }
  input.addEventListener('focus', function () {
    if (auto) { stopAuto(); input.value = userName; setName(); }
  });
  input.addEventListener('input', function () { stopAuto(); userName = input.value; setName(); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') input.blur(); });
  $$('.chips button').forEach(function (b) {
    b.addEventListener('click', function () {
      if (auto) { stopAuto(); userName = ''; input.value = ''; }
      var t = b.getAttribute('data-t'); if (t !== trade) setTrade(t, true);
    });
  });

  /* ---------- rozvržení ---------- */
  var W, H, L = {}, mobileL;
  var stageEl = $('.stage');
  function rectOf(el) { var r = el.getBoundingClientRect(), o = stageEl.getBoundingClientRect().top; return { top: r.top - o, bottom: r.bottom - o, h: r.height }; }
  function layout() {
    W = root.clientWidth; H = window.innerHeight;
    root.style.setProperty('--vh', H + 'px');
    var navH = nav.offsetHeight; root.style.setProperty('--navh', (navH + 6) + 'px');
    mobileL = W / H <= 1;
    var bH = mobileL ? 28 : 36, B, P;
    if (!mobileL) {
      var copyR = $('.copy').getBoundingClientRect().right;
      var ax = copyR + Math.max(32, W * .04), aw = W - ax - Math.max(24, W * .035);
      var ay = navH + 20, ah = H - ay - 28;
      var bw = Math.min(aw, (ah - bH) / .625, 980), bh = bw * .625 + bH;
      B = { x: ax + (aw - bw) / 2, y: ay + (ah - bh) / 2, w: bw, h: bh };
      var ph = Math.min(ah, 780), pw = ph * .49;
      P = { x: ax + (aw - pw) / 2, y: ay + (ah - ph) / 2, w: pw, h: ph };
    } else {
      var s0 = rectOf(steps[0]), sMax = Math.max(rectOf(steps[1]).bottom, rectOf(steps[2]).bottom, rectOf(steps[3]).bottom);
      var bot = H - 18;
      var t0 = s0.bottom + 20, aw0 = W - 32, ah0 = bot - t0;
      var bw0 = Math.min(aw0 * (W < 600 ? 1.12 : 1), (ah0 - bH) / .625), bh0 = bw0 * .625 + bH;
      B = { x: W < 600 ? 16 : (W - bw0) / 2, y: t0 + Math.max(0, (ah0 - bh0) * .38), w: bw0, h: bh0 };
      var t1 = sMax + 22, ah1 = bot - t1, ph1 = ah1, pw1 = ph1 * .49;
      if (pw1 > W - 80) { pw1 = W - 80; ph1 = pw1 / .49; }
      P = { x: (W - pw1) / 2, y: t1 + (ah1 - ph1) / 2, w: pw1, h: ph1 };
    }
    L = { B: B, P: P, bH: bH, top: story.offsetTop, len: story.offsetHeight - H };
    placeCaret(); frame(true);
  }

  /* ---------- posun ---------- */
  var cl = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var lastStep = -1, raf = 0, last = 0, lastLH = '';

  function target() { return cl((window.scrollY - L.top) / H, 0, 3.3); }

  function frame(force) {
    var p = prog, B = L.B, P = L.P;
    var t = ease(cl((p - .1) / .75, 0, 1));
    var w = lerp(B.w, P.w, t), h = lerp(B.h, P.h, t), x = lerp(B.x, P.x, t), y = lerp(B.y, P.y, t);
    var bh = lerp(L.bH, 0, cl(t * 1.4, 0, 1)), bz = lerp(0, P.w * .035, t);
    var rad = lerp(mobileL ? 10 : 14, P.w * .15, t), srad = lerp(0, P.w * .12, t);
    dev.style.width = w + 'px'; dev.style.height = h + 'px';
    dev.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    dev.style.borderRadius = rad + 'px';
    bar.style.height = bh + 'px'; bar.style.opacity = cl(1 - t * 1.8, 0, 1);
    var top = bh + bz;
    screen.style.left = screen.style.right = screen.style.bottom = bz + 'px';
    screen.style.top = top + 'px';
    var sb = lerp(rad, srad, t);
    screen.style.borderRadius = srad + 'px ' + srad + 'px ' + (t < .02 ? rad : sb) + 'px ' + (t < .02 ? rad : sb) + 'px';
    var sw = w - 2 * bz;
    var sd = sw / 1024, sm = sw / 390;
    var s = cl((t - .22) / .36, 0, 1);
    desk.style.transform = 'scale(' + sd + ')'; desk.style.opacity = 1 - s; desk.style.visibility = s >= 1 ? 'hidden' : 'visible';
    mob.style.visibility = s <= 0 ? 'hidden' : 'visible';
    var lh = Math.round((h - top - bz) / sm) + 'px';
    if (lh !== lastLH) { mob.style.height = srch.style.height = call.style.height = lh; lastLH = lh; }
    mob.style.transform = 'scale(' + sm + ')'; mob.style.opacity = s;
    mm.style.transform = 'translateY(' + (-ease(cl((p - .95) / .5, 0, 1)) * 230) + 'px)';

    /* hledání */
    var u = cl((p - 1.1) / .8, 0, 1), a = ease(cl(u / .35, 0, 1));
    srch.style.visibility = a > 0 ? 'visible' : 'hidden';
    srch.style.opacity = a; srch.style.transform = 'scale(' + sm + ') translateX(' + ((1 - a) * 60) + 'px)';
    var yy = 4 * (1 - ease(cl((u - .38) / .55, 0, 1))), RH = 122, extra = (me.offsetHeight || 176) - 112;
    me.style.transform = 'translateY(' + (yy * RH) + 'px)';
    rows.forEach(function (r, i) {
      var sh = cl(i + 1 - yy, 0, 1);
      r.style.transform = 'translateY(' + ((i + sh) * RH + sh * extra) + 'px)';
    });

    /* hovor */
    var c = cl((p - 2.1) / .55, 0, 1), ce = ease(c);
    call.style.visibility = ce > 0 ? 'visible' : 'hidden';
    call.style.opacity = ce; call.style.transform = 'scale(' + sm + ') translateY(' + ((1 - ce) * 40) + 'px)';
    call.classList.toggle('n', c > .7);

    var st = p < .55 ? 0 : p < 1.55 ? 1 : p < 2.55 ? 2 : 3;
    if (st !== lastStep) { steps.forEach(function (e, i) { e.classList.toggle('on', i === st); }); lastStep = st; }
    nav.classList.toggle('light', window.scrollY > L.top + story.offsetHeight - nav.offsetHeight);
    nav.classList.toggle('solid', window.scrollY > L.top + story.offsetHeight - H);
  }

  function tick(now) {
    var dt = last ? Math.min(64, now - last) : 16.7; last = now;
    progT = target();
    var k = 1 - Math.pow(.84, dt / 16.7);
    prog += (progT - prog) * k;
    if (Math.abs(progT - prog) < .0008) prog = progT;
    frame();
    if (prog !== progT) raf = requestAnimationFrame(tick); else { raf = 0; last = 0; }
  }
  function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } }
  window.addEventListener('scroll', function () { lastMove = performance.now(); kick(); }, { passive: true });
  var lw = 0;
  window.addEventListener('resize', function () {
    if (document.activeElement === input && root.clientWidth === lw) return;
    lw = root.clientWidth; layout(); progT = prog = target(); frame();
  });

  /* ---------- start ---------- */
  setTrade('bistro', false);
  lw = root.clientWidth; layout(); prog = progT = target(); frame();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layout(); });
  window.addEventListener('load', function () {
    var k = 0; (function next() { if (k < ORDER.length) predecode(ORDER[k++]).then(function () { setTimeout(next, 120); }); })();
  });
  if (/[?&]static/.test(location.search)) { auto = false; typed = userName = T.bistro.def; input.value = typed; setName(); }
  else autoLoop();
  window.__wl = { setTrade: setTrade, prog: function () { return prog; } };
})();
