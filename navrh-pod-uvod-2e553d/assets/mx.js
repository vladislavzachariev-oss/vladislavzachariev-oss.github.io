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
        a1 = [tR + rw * 0.52, H * 0.6];
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
      cz.style.fillOpacity = seg(p, 0.22, 0.42).toFixed(3);
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
        var o = 16, dd = q.getAttribute('data-d'), tr;
        if (dd === 'r') tr = 'translate(' + (X + o) + 'px,' + Y + 'px) translate(0,-50%)';
        else if (dd === 'l') tr = 'translate(' + (X - o) + 'px,' + Y + 'px) translate(-100%,-50%)';
        else if (dd === 'u') tr = 'translate(' + X + 'px,' + (Y - o) + 'px) translate(-50%,-100%)';
        else if (dd === 'd') tr = 'translate(' + X + 'px,' + (Y + o) + 'px) translate(-50%,0)';
        else tr = 'translate(' + (X - o * .7) + 'px,' + (Y - o * .7) + 'px) translate(-100%,-100%)';
        q.style.transform = tr;
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

  /* 4  Máte zavřeno, web ne */
  var m4 = $('.m4');
  if (m4) (function () {
    var time = $('.m4-time', m4), notes = $$('.m4-n', m4), stage = $('.mx-stage', m4), lastT = '';
    var SKY = [[16, '#f5f4f1'], [17.4, '#f2e2c9'], [18.6, '#b98c84'], [19.6, '#33324a'], [20.6, '#12141b'], [29.4, '#12141b'], [30.3, '#3e4560'], [31, '#f5f4f1']];
    function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
    var K = SKY.map(function (s) { return [s[0], hex(s[1])]; });
    function sky(h) {
      for (var i = 1; i < K.length; i++) if (h <= K[i][0]) {
        var t = (h - K[i - 1][0]) / (K[i][0] - K[i - 1][0]), a = K[i - 1][1], b = K[i][1];
        return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
      }
      return K[K.length - 1][1];
    }
    scene(m4, '300svh', function (p) {
      var h = 16 + seg(p, 0.02, 0.97) * 15;
      var c = sky(h), lum = (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
      stage.style.setProperty('--sky', 'rgb(' + c.map(Math.round).join(',') + ')');
      stage.style.setProperty('--skyink', lum < 0.42 ? '#f5f4f1' : '#161616');
      var hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60);
      var txt = hh + ':' + (mm < 10 ? '0' : '') + mm;
      if (txt !== lastT) { time.textContent = txt; lastT = txt; }
      m4.classList.toggle('closed', h >= 17 && h < 31);
      m4.classList.toggle('morning', h >= 30.4);
      notes.forEach(function (n) { n.classList.toggle('on', h >= +n.getAttribute('data-t')); });
    });
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
