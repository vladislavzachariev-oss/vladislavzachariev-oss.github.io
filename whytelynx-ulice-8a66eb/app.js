/* Whyte Lynx · ulice, ve které se rozsvěcují výlohy (J 2026-11-23) */
(function () {
  'use strict';
  var IW = 2752, IH = 1536;
  // cedule a výlohy v pixelech fotky ulice
  var SHOPS = [
    { t: 'bistro', sign: [262, 690, 388, 140], focus: [225, 650, 480, 560],
      name: 'Bistro Na Rohu', bg: '#f6f1e7', ink: '#2a1f14', acc: '#b4532a', mf: 'var(--serif)',
      tag: 'Bistro · Liberec', hl: 'Poctivá česká kuchyně, každý den čerstvě.', open: 'Dnes otevřeno 11–22',
      cta: 'Rezervovat stůl', items: [['Svíčková na smetaně', '189 Kč'], ['Kulajda s vejcem', '89 Kč'], ['Buchtičky se šodó', '109 Kč']] },
    { t: 'kavarna', sign: [810, 760, 349, 115], focus: [780, 720, 410, 500],
      name: 'Kavárna Pod Lípou', bg: '#f3ede4', ink: '#1f1a15', acc: '#8a5a2b', mf: 'var(--serif)',
      tag: 'Kavárna · Liberec', hl: 'Káva, u které se rádi zdržíte.', open: 'Dnes otevřeno 7–19',
      cta: 'Kudy k nám', items: [['Espresso', '55 Kč'], ['Flat white', '79 Kč'], ['Domácí koláč', '69 Kč']] },
    { t: 'kvetiny', sign: [1276, 828, 222, 82], focus: [1150, 800, 420, 440],
      name: 'Květiny Zvonek', bg: '#f7f2f1', ink: '#2b1d22', acc: '#c2456a', mf: 'var(--serif)',
      tag: 'Květinářství · Liberec', hl: 'Kytice uvážeme do hodiny.', open: 'Dnes otevřeno 8–18',
      cta: 'Objednat kytici', items: [['Kytice tulipánů', '590 Kč'], ['Svatební kytice', '2 400 Kč'], ['Rozvoz po Liberci', '99 Kč']] },
    { t: 'autoservis', sign: [1620, 886, 206, 64], focus: [1570, 860, 320, 330],
      name: 'Autoservis Na Kopci', bg: '#eef1f4', ink: '#0e1620', acc: '#e2461f', mf: 'var(--f)',
      tag: 'Autoservis · Liberec', hl: 'Servis bez čekání. Termín si vyberete online.', open: 'Dnes otevřeno 7–17',
      cta: 'Objednat servis', items: [['Výměna oleje', 'od 990 Kč'], ['Přezutí', '600 Kč'], ['Diagnostika', '450 Kč']] }
  ];
  var N = 5; // 0 úvod, 1–4 výlohy, 5 konec

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var story = $('#story'), stage = $('#stage'), cam = $('#cam'), phone = $('#phone'), glass = $('#glass'), nav = $('.nav');
  var cards = $$('.card'), dots = $$('.dots i');
  var signs = SHOPS.map(function () { var c = document.createElement('canvas'); c.className = 'sign'; $('#signs').appendChild(c); return c; });
  var FONT = ['italic 600 {}px Fraunces', 'italic 500 {}px Fraunces', 'italic 600 {}px Fraunces', '750 {}px "Bricolage Grotesque"'];
  var LABEL = SHOPS.map(function (d, i) { return i === 3 ? d.name.toUpperCase() : d.name; });

  // mini weby v telefonu
  var layers = SHOPS.map(function (d) {
    var L = document.createElement('div');
    L.className = 'layer ms'; L.setAttribute('data-t', d.t);
    L.style.cssText = '--bg:' + d.bg + ';--ink2:' + d.ink + ';--acc:' + d.acc + ';--mf:' + d.mf;
    L.innerHTML = '<div class="page"><div class="sbar"><b>19:42</b><span><i></i><i></i><i></i><em></em></span></div><div class="mnav"><b class="ms-name">' + d.name + '</b><span class="burger"><i></i><i></i></span></div>' +
      '<div class="mm-ph"><img src="img/t/' + d.t + '.webp?i=2" alt="" decoding="async"></div>' +
      '<div class="mm-txt"><p class="ms-tag">' + d.tag + '</p><p class="ms-h">' + d.hl + '</p>' +
      '<p class="ms-open"><i></i><span>' + d.open + '</span></p><p class="ms-b1">' + d.cta + '</p><p class="ms-b2">Zavolat</p></div>' +
      '<div class="ms-items">' + d.items.map(function (it) { return '<p><span>' + it[0] + '</span><b>' + it[1] + '</b></p>'; }).join('') + '</div></div>';
    glass.appendChild(L);
    return L;
  });
  var pages = layers.map(function (L) { return $('.page', L); });

  var W, H, cover, K = [], PH = {}, scrollMax = [], navh = 64, portrait;

  function camFor(rect, box, sMax) {
    var s = Math.min(box.w / rect[2], box.h / rect[3]);
    s = Math.max(cover, Math.min(sMax, s));
    return { s: s, cx: rect[0] + rect[2] / 2, cy: rect[1] + rect[3] / 2, bx: box.x + box.w / 2, by: box.y + box.h / 2 };
  }

  // cedule se kreslí jednou v největším zvětšení (sRef); za běhu jen transform = ostré a levné
  var sRef = 1, pad = [];
  function drawSigns() {
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    sRef = 0; K.forEach(function (c) { sRef = Math.max(sRef, c.s); });
    SHOPS.forEach(function (d, i) {
      var c = signs[i], g = d.sign, w = g[2] * sRef, h = g[3] * sRef, m = h * .9;
      pad[i] = m;
      c.width = Math.ceil((w + 2 * m) * dpr); c.height = Math.ceil((h + 2 * m) * dpr);
      c.style.width = (w + 2 * m) + 'px'; c.style.height = (h + 2 * m) + 'px';
      var x = c.getContext('2d');
      x.setTransform(dpr, 0, 0, dpr, m * dpr, m * dpr);
      // teplé světlo na desce
      var gr = x.createRadialGradient(w / 2, -h * .2, 0, w / 2, -h * .2, w * .62);
      gr.addColorStop(0, 'rgba(255,214,150,.34)'); gr.addColorStop(.6, 'rgba(255,170,80,.12)'); gr.addColorStop(1, 'rgba(255,170,80,0)');
      x.fillStyle = gr; x.fillRect(-w * .02, -h * .06, w * 1.04, h * 1.12);
      x.font = FONT[i].replace('{}', 100);
      var tw = x.measureText(LABEL[i]).width || 1;
      var fs = Math.min(h * .52, w * .86 * 100 / tw);
      x.font = FONT[i].replace('{}', fs.toFixed(2));
      x.textAlign = 'center'; x.textBaseline = 'middle';
      var ty = h * .54;
      [['rgba(255,140,40,.35)', 1.4], ['rgba(255,160,60,.55)', .6], ['rgba(255,196,110,.9)', .22], ['rgba(255,243,214,.9)', .06]].forEach(function (sh) {
        x.shadowColor = sh[0]; x.shadowBlur = fs * sh[1] * dpr; x.fillStyle = '#ffe2a6'; x.fillText(LABEL[i], w / 2, ty);
      });
      x.shadowBlur = 0; x.fillStyle = '#fff0cc'; x.fillText(LABEL[i], w / 2, ty);
    });
  }

  function layout() {
    W = stage.clientWidth; H = stage.clientHeight;
    navh = nav.offsetHeight || 64;
    stage.style.setProperty('--navh', navh + 'px');
    portrait = W / H < 1;
    cover = Math.max(W / IW, H / IH);
    var full = { x: 0, y: 0, w: W, h: H };
    if (!portrait) {
      var box = { x: W * .03, y: navh + H * .03, w: W * .5, h: H * .58 };
      K = [camFor([0, 0, IW, IH], full, 9)];
      SHOPS.forEach(function (d) { K.push(camFor(d.focus, box, 1.15)); });
      K.push(camFor([0, 0, IW, IH], full, 9));
      var pw = Math.max(220, Math.min(W * .2, (H - navh - 60) / 2.07, 330));
      PH = { w: pw, h: pw * 2.07, x: W * .74 - pw / 2, y: navh + (H - navh - pw * 2.07) / 2 };
    } else {
      // na výšku: text nahoře, pod ním svítící cedule, telefon vyjíždí zespodu
      var ch = 0; cards.forEach(function (c) { if (c.classList.contains('at-bot')) ch = Math.max(ch, c.offsetHeight); });
      // cedule jsou v dolní polovině fotky: zvětšení volit tak, aby pod textem zbylo místo i pro nejnižší (autoservis)
      var cb = navh + 18 + ch + 16;
      var ms = Math.max(cover, Math.min(.82, (H - cb) / (IH - 918 + 70))), top = cb + 70 * ms - 50 * ms;
      K = [camFor([1690, 0, 720, IH], full, 9)];
      SHOPS.forEach(function (d) {
        var g = d.sign;
        K.push({ s: ms, cx: g[0] + g[2] / 2, cy: g[1] + g[3] / 2, bx: W / 2, by: top + 100 * ms / 2 });
      });
      K.push(camFor([1520, 0, 720, IH], full, 9));
      var pw2 = Math.min(W * .68, 300, (H - top - 100 * ms - 30) / 1.25);
      PH = { w: pw2, h: pw2 * 2.07, x: (W - pw2) / 2, y: cb + 140 * ms + 24 };
    }
    phone.style.width = PH.w + 'px'; phone.style.height = PH.h + 'px';
    phone.style.borderRadius = (PH.w * .15) + 'px';
    phone.style.setProperty('--pw', PH.w + 'px');
    var gw = PH.w - 20, gh = PH.h - 20, sc = gw / 390;
    glass.style.borderRadius = (PH.w * .12) + 'px';
    layers.forEach(function (L, i) {
      L.style.transform = 'scale(' + sc + ')';
      scrollMax[i] = Math.max(0, pages[i].scrollHeight - gh / sc);
    });
    drawSigns();
    frame();
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sm(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function ease(t) { t = clamp((t - .18) / .64, 0, 1); return t * t * (3 - 2 * t); }

  var active = -1, mode = '', lit = [];
  function frame() {
    raf = 0;
    var r = story.getBoundingClientRect();
    var range = story.offsetHeight - H;
    var p = clamp(-r.top / range, 0, 1) * N;
    // kamera: drží u výlohy, mezi výlohami jede
    var k = Math.min(N - 1, Math.floor(p)), f = ease(p - k);
    var A = K[k], B = K[k + 1];
    var s = Math.exp(Math.log(A.s) + (Math.log(B.s) - Math.log(A.s)) * f);
    var cx = A.cx + (B.cx - A.cx) * f, cy = A.cy + (B.cy - A.cy) * f;
    var bx = A.bx + (B.bx - A.bx) * f, by = A.by + (B.by - A.by) * f;
    var ox = clamp(bx - cx * s, W - IW * s, 0), oy = clamp(by - cy * s, H - IH * s, 0);
    cam.style.transform = 'translate3d(' + ox.toFixed(2) + 'px,' + oy.toFixed(2) + 'px,0) scale(' + s.toFixed(5) + ')';

    // cedule v souřadnicích obrazovky
    SHOPS.forEach(function (d, i) {
      var el = signs[i], g = d.sign, q = s / sRef;
      var x = g[0] * s + ox - pad[i] * q, y = g[1] * s + oy - pad[i] * q;
      el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scale(' + q.toFixed(4) + ')';
      var on = p >= i + 1 - .3;
      if (on !== lit[i]) { lit[i] = on; el.classList.toggle('lit', on); }
    });

    // telefon
    var e = sm((p - .5) / .45) * sm((4.5 - p) / .45);
    phone.style.opacity = e.toFixed(3);
    phone.style.transform = 'translate3d(' + PH.x.toFixed(1) + 'px,' + (PH.y + (1 - e) * 70).toFixed(1) + 'px,0)';
    var li = clamp(Math.round(p), 1, 4) - 1;
    layers.forEach(function (L, i) { var on = i === li; if (L._on !== on) { L._on = on; L.classList.toggle('on', on); } });
    var loc = portrait ? 0 : clamp((p - (li + 1)) / .42, 0, 1);
    pages[li].style.transform = 'translate3d(0,' + (-loc * scrollMax[li]).toFixed(1) + 'px,0)';

    // texty
    var a = clamp(Math.round(p), 0, N);
    if (a !== active) {
      active = a;
      cards.forEach(function (c) { c.classList.toggle('on', +c.getAttribute('data-k') === a); });
      dots.forEach(function (dd) { dd.classList.toggle('on', +dd.getAttribute('data-k') === a); });
      var m = a >= 1 && a <= 4 ? 'bot' : 'top';
      if (m !== mode) { mode = m; stage.setAttribute('data-mode', m); }
    }
    navState();
  }

  var light = [$('#prace'), $('#otazky')], lastNav = '';
  function navState() {
    var y = navh / 2, st = '';
    if (story.getBoundingClientRect().bottom > navh) st = '';
    else {
      st = 'solid';
      light.forEach(function (el) { var b = el.getBoundingClientRect(); if (b.top <= y && b.bottom > y) st = 'light'; });
    }
    if (st !== lastNav) { lastNav = st; nav.classList.toggle('solid', st === 'solid'); nav.classList.toggle('light', st === 'light'); }
  }

  var raf = 0;
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  window.addEventListener('scroll', kick, { passive: true });

  var lw = 0, lh = 0;
  function setVh(force) {
    var w = innerWidth, h = innerHeight;
    if (force || w !== lw || Math.abs(h - lh) > 120) {
      lw = w; lh = h;
      document.documentElement.style.setProperty('--vh', h + 'px');
      layout();
    }
  }
  window.addEventListener('resize', function () { setVh(false); });
  setVh(true);
  if (document.fonts && document.fonts.load) Promise.all(['italic 600 40px Fraunces', 'italic 500 40px Fraunces', '750 40px "Bricolage Grotesque"'].map(function (f) { return document.fonts.load(f, 'Bistro Na Rohu'); })).then(function () { layout(); }, function () {});
  window.addEventListener('load', function () { layout(); });
  window.__wl = { frame: frame, layout: layout };
})();
