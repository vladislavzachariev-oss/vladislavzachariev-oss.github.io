/* Pět nových nápadů pod úvod whytelynx.cz (J 2026-11-17). Bez knihoven.
   Každá scéna: dráha .mx-track, připnuté jeviště .mx-stage, průběh p 0–1 z polohy dráhy. */
(function () {
  'use strict';
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  var scenes = [];
  function scene(sec, len, render, resize) {
    sec.classList.add('mx-on');
    sec.style.setProperty('--len', RM ? '0svh' : len);
    var s = { sec: sec, track: $('.mx-track', sec), render: render, resize: resize, last: -1, dirty: true };
    scenes.push(s);
    if (resize) resize();
    return s;
  }
  var raf = 0;
  function tick() {
    raf = 0;
    var vh = innerHeight;
    scenes.forEach(function (s) {
      var r = s.track.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) { if (!s.dirty) return; }
      var tot = s.track.offsetHeight - vh;
      var p = RM ? 1 : clamp(-r.top / Math.max(tot, 1), 0, 1);
      if (!s.dirty && Math.abs(p - s.last) < 0.0002) return;
      s.last = p; s.dirty = false;
      s.render(p);
    });
  }
  function req() { if (!raf) raf = requestAnimationFrame(tick); }
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', function () { scenes.forEach(function (s) { if (s.resize) s.resize(); s.dirty = true; }); req(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { scenes.forEach(function (s) { if (s.resize) s.resize(); s.dirty = true; }); req(); });

  /* 1  Slovo po slovu */
  var m1 = $('.m1');
  if (m1) (function () {
    var ws = $$('.m1-w', m1), n = ws.length, bar = $('.m1-bar', m1), path = $('.m1-vas path', m1), cur = -2;
    path.setAttribute('pathLength', '1');
    scene(m1, (n * 48) + 'svh', function (p) {
      bar.style.setProperty('--p', p.toFixed(4));
      var i = Math.min(n, Math.floor(p * (n + 1) * 0.9999));
      if (i === cur) return; cur = i;
      ws.forEach(function (w, k) { w.classList.toggle('on', k === i); w.classList.toggle('past', k < i); });
      m1.classList.toggle('end', i >= n);
    });
  })();

  /* 2  Mapa okolí */
  var m2 = $('.m2');
  if (m2) (function () {
    var stage = $('.mx-stage', m2), svg = $('.m2-map', m2), g = $('.m2-g', m2), cz = $('.m2-cz', m2);
    var dots = $$('.m2-t', m2), qs = $$('.m2-q', m2), ns = $$('.m2-n', m2), txt = $('.m2-txt', m2), qbox = $('.m2-qs', m2);
    var L = cz.getTotalLength(), W, H, mob, s0, s1, a0, a1;
    var M0 = [500, 287.5], M1 = [442, 70];
    cz.style.strokeDasharray = L;
    function resize() {
      W = stage.clientWidth; H = stage.clientHeight; mob = W < 700;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      s0 = Math.min(W * 0.92 / 1000, (mob ? H * 0.42 : H * 0.62) / 575);
      var sr = stage.getBoundingClientRect(), tr = txt.getBoundingClientRect();
      var tb = tr.bottom - sr.top, tR = tr.right - sr.left;
      if (mob) {
        var qt = qbox.getBoundingClientRect().top - sr.top, top = tb + 16, bot = qt - 14;
        s1 = Math.min(W * 0.8 / 85, (bot - top) * 0.9 / 105);
        a1 = [W / 2, (top + bot) / 2 + 8 * s1];
        a0 = [W / 2, (top + bot) / 2];
      } else {
        var rw = W - tR;
        s1 = Math.min(rw * 0.5 / 85, H * 0.56 / 105);
        a1 = [tR + rw * 0.46, H * 0.6];  /* 0.52: bublina Semil se nevešla vpravo a překryla Turnov */
        a0 = [W * 0.56, H * 0.6];
      }
    }
    scene(m2, '240svh', function (p) {
      var d = seg(p, 0, 0.33), z = ease(seg(p, 0.34, 0.6));
      var s = s0 * Math.pow(s1 / s0, z);
      var mx = lerp(M0[0], M1[0], z), my = lerp(M0[1], M1[1], z), ax = lerp(a0[0], a1[0], z), ay = lerp(a0[1], a1[1], z);
      g.setAttribute('transform', 'translate(' + ax.toFixed(2) + ' ' + ay.toFixed(2) + ') scale(' + s.toFixed(5) + ') translate(' + (-mx).toFixed(3) + ' ' + (-my).toFixed(3) + ')');
      cz.style.strokeDashoffset = (L * (1 - d)).toFixed(2);
      cz.style.strokeWidth = ((mob ? 1.6 : 1.4) / s).toFixed(4);
      /* bez bílé výplně: plocha země vedle podkladu nadpisu dělala obdélníkový výřez (snímek 17. 11.) */
      dots.forEach(function (t, i) {
        var X = ax + (+t.getAttribute('data-x') - mx) * s, Y = ay + (+t.getAttribute('data-y') - my) * s;
        t.setAttribute('transform', 'translate(' + X.toFixed(1) + ' ' + Y.toFixed(1) + ')');
        var on = p >= 0.6 + i * 0.055;
        t.classList.toggle('on', on);
        var q = qs[i]; q.classList.toggle('on', on);
        if (mob) {
          q.style.transform = '';
          ns[i].classList.toggle('on', on);
          ns[i].style.transform = 'translate(' + (X + 11).toFixed(1) + 'px,' + (Y - 9).toFixed(1) + 'px)';
          return;
        }
        // bublina u města; když by vyjela z okna, otočí se na druhou stranu a drží se uvnitř (17. 11.: Semily za okrajem)
        var o = 16, dd = q.getAttribute('data-d'), qw = q.offsetWidth, qh = q.offsetHeight, x, y;
        if (dd === 'r' && X + o + qw > W - 12) dd = 'l';
        if (dd === 'r') { x = X + o; y = Y - qh / 2; }
        else if (dd === 'l') { x = X - o - qw; y = Y - qh / 2; }
        else if (dd === 'u') { x = X - qw / 2; y = Y - o - qh; }
        else if (dd === 'd') { x = X - qw / 2; y = Y + o; }
        else { x = X - o * .7 - qw; y = Y - o * .7 - qh; }
        x = clamp(x, 12, W - qw - 12); y = clamp(y, 70, H - qh - 12);
        q.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      });
    }, resize);
  })();

  /* 3  Účtenka */
  var m3 = $('.m3');
  if (m3) (function () {
    var stage = $('.mx-stage', m3), pr = $('.m3-pr', m3), paper = $('.m3-paper', m3), pp = -1;
    function resize() {
      pr.style.setProperty('--f', '15px');
      var h = pr.offsetHeight, top = pr.getBoundingClientRect().top - stage.getBoundingClientRect().top;
      var mob = innerWidth <= 860;
      var avail = mob ? stage.clientHeight - top - 84 - 12 : stage.clientHeight - 96 - 24;
      var f = clamp(15 * avail / h, 10.5, 15);
      pr.style.setProperty('--f', f.toFixed(2) + 'px');
      pr.style.setProperty('--rh', pr.offsetHeight + 'px');
    }
    scene(m3, '170svh', function (p) {
      var t = seg(p, 0.06, 0.82);
      // tiskárna posouvá papír po řádcích, ne plynule
      var q = Math.round(t * 46) / 46;
      if (q !== pp) { pp = q; paper.style.setProperty('--pp', q.toFixed(4)); }
      m3.classList.toggle('printing', t > 0 && t < 1);
    }, resize);
  })();

  /* 4  Máte zavřeno, web ne: obloha z 7 přechodů (prolínají se jen sousední), slunce zapadne a ráno vyjde, v noci hvězdy, měsíc a okna */
  var m4 = $('.m4');
  if (m4) (function () {
    var time = $('.m4-time', m4), notes = $$('.m4-n', m4), stage = $('.mx-stage', m4), lastT = '';
    var L = $$('.m4-l', m4), sun = $('.m4-sun', m4), sunO = $('.m4-sun b', m4), moon = $('.m4-moon', m4), st = $('.m4-stars', m4);
    var cn = $('.m4-city.n', m4), cw = $('.m4-city.w', m4), cw2 = $('.m4-city.w2', m4);
    var KEY = [[16, 0], [17.6, 1], [18.7, 2], [19.7, 3], [20.7, 4], [29.4, 4], [30.2, 5], [31, 6]];
    var W = 1, H = 1, CITY = 150, BAR = 0;
    function size() { W = stage.clientWidth; H = stage.clientHeight; CITY = parseFloat(getComputedStyle(stage).getPropertyValue('--city')) || $('.m4-city', m4).getBoundingClientRect().height || 150; BAR = narrow.matches ? 70 : 0; }
    function o(el, v) { v = Math.round(v * 1000) / 1000; if (el._o !== v) { el._o = v; el.style.opacity = v; } }
    function tr(el, x, y, s) { el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)' + (s ? ' scale(' + s.toFixed(3) + ')' : ''); }
    var narrow = matchMedia('(max-width:760px)');
    scene(m4, '320svh', function (p) {
      var h = 16 + seg(p, 0.02, 0.97) * 15, i, a, b, t;
      for (i = 1; i < KEY.length; i++) if (h <= KEY[i][0]) break;
      i = Math.min(i, KEY.length - 1);
      a = KEY[i - 1][1]; b = KEY[i][1]; t = seg(h, KEY[i - 1][0], KEY[i][0]);
      L.forEach(function (l, k) { o(l, k === a ? 1 : k === b && b !== a ? t : 0); });
      var nar = narrow.matches, hz = H - BAR - CITY * 0.55;
      /* slunce: odpoledne vpravo nahoře, v 19:25 za domy; ráno vyjde vlevo */
      var sx, sy, ts = seg(h, 16, 19.4), tr2 = seg(h, 29.9, 31);
      if (h < 25) { sx = W * lerp(nar ? 0.84 : 0.86, nar ? 0.62 : 0.7, ts); sy = lerp(H * (nar ? 0.06 : 0.17), hz + CITY * 0.7, ts * ts); }
      else { sx = W * lerp(nar ? 0.7 : 0.36, nar ? 0.84 : 0.44, tr2); sy = lerp(hz + CITY * 0.7, nar ? H * 0.06 : H - CITY - H * 0.13, 1 - Math.pow(1 - tr2, 2)); }
      tr(sun, sx, sy, lerp(1, 1.18, seg(h, 17.5, 19.2)) * (h < 25 ? 1 : lerp(1.18, 1, tr2)));
      o(sunO, h < 25 ? seg(h, 17.2, 18.8) : 1 - seg(h, 30.2, 31));
      /* měsíc a hvězdy */
      var tm = seg(h, 19.9, 29.6), mo = seg(h, 19.9, 20.8) * (1 - seg(h, 29.3, 30.1));
      tr(moon, W * lerp(nar ? 0.86 : 0.4, nar ? 0.8 : 0.48, tm), H * lerp(nar ? 0.08 : 0.62, nar ? 0.05 : 0.36, Math.sin(tm * Math.PI / 2)));
      o(moon, mo);
      o(st, seg(h, 19.6, 20.7) * (1 - seg(h, 29.4, 30.2)));
      /* město: večer ztmavne, okna se rozsvítí, k půlnoci část zhasne, ráno zase den */
      var night = seg(h, 18.9, 20.4) * (1 - seg(h, 29.8, 30.8));
      o(cn, night);
      o(cw, seg(h, 19.1, 20.1) * (1 - seg(h, 29.6, 30.4)));
      o(cw2, seg(h, 19.4, 20.4) * (1 - seg(h, 22.8, 23.8)));
      m4.classList.toggle('nt', h >= 18.15 && h < 30.55);
      var hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60);
      var txt = hh + ':' + (mm < 10 ? '0' : '') + mm;
      if (txt !== lastT) { time.textContent = txt; lastT = txt; }
      m4.classList.toggle('closed', h >= 17 && h < 31);
      m4.classList.toggle('morning', h >= 30.4);
      notes.forEach(function (n) { n.classList.toggle('on', h >= +n.getAttribute('data-t')); });
    }, size);
  })();

  /* 5  Jedna čára */
  var m5 = $('.m5');
  if (m5) (function () {
    var box = $('.m5-box', m5), svg = $('.m5-svg', m5), line = $('.m5-line', m5), pen = $('.m5-pen', m5);
    var words = $$('.m5-words text', m5), dts = $$('.m5-dt', m5), L = line.getTotalLength(), trig = [], k;
    line.style.strokeDasharray = L;
    // kdy pero poprvé dojde k ikoně (vzorkování dráhy)
    words.forEach(function (w) {
      var x = +w.getAttribute('data-x') - 70;
      for (k = 0; k <= 600; k++) if (line.getPointAtLength(L * k / 600).x >= x) break;
      trig.push(k / 600);
    });
    var bw = 0, sw = 0;
    function resize() { bw = box.clientWidth; sw = svg.getBoundingClientRect().width; }
    scene(m5, '220svh', function (p) {
      var d = seg(p, 0.04, 0.9);
      line.style.strokeDashoffset = (L * (1 - d)).toFixed(2);
      var pt = line.getPointAtLength(L * d);
      pen.setAttribute('cx', pt.x.toFixed(1)); pen.setAttribute('cy', pt.y.toFixed(1));
      pen.style.opacity = d > 0 && d < 1 ? 1 : 0;
      words.forEach(function (w, i) { w.classList.toggle('on', d >= trig[i]); });
      dts.forEach(function (t) { var i = +t.getAttribute('data-w'); t.classList.toggle('on', i < 3 ? d >= trig[i] + 0.1 : d >= 0.995); });
      if (sw > bw + 1) {
        var px = pt.x * sw / 1200, tx = clamp(bw * 0.62 - px, bw - sw, 0);
        svg.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,0,0)';
      } else svg.style.transform = '';
    }, resize);
  })();

  req();
})();
