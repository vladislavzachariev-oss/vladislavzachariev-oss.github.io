/* Lupa (Z 16. 11. 2026: „nejvíc se mi líbila lupa a písek“). Jedna skleněná lupa nad celou stránkou.
   Uvnitř lupy je kopie stránky ve zvětšení, takže písmo zůstane ostré (kreslí se znovu, nezvětšuje se obrázek).
   ?u=1 „hledá“: lupa zastaví na klíčovém slově každé části, slovo dostane barevné zvýraznění a část jeho barvu.
   ?u=2 „barví“: stránka je černobílá, v lupě je barevná; na počítači jde za myší, jinak hledá slova jako ?u=1. */
(function () {
  var MODE = window.__U === '2' ? 'color' : 'find';
  var main = document.querySelector('main'), root = document.documentElement;
  var fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PAL = ['#ff7a1a', '#e8238f', '#2f6fde', '#2f9d5b', '#7a4fd6', '#e0452b', '#0fa3a3', '#c99312', '#ff7a1a'];
  var KW = [['.hero h1', 'Vás'], ['#sluzby h2', 'Žahourek'], ['#ukazka h2', 'svůj web'], ['#prace h2', 'postavili'], ['#postup h2', 'uvidíte'],
            ['#cena h2', 'Jedna cena'], ['#my h2', 'Liberce'], ['#otazky h2', 'ptají'], ['#kontakt h2', 'Váš web']];

  var css = '.lp{position:fixed;left:0;top:0;z-index:58;width:var(--D);height:var(--D);border-radius:50%;pointer-events:none;will-change:transform;opacity:0;transition:opacity .8s}' +
    '.lp.on{opacity:1}' +
    '.lp-in{position:absolute;inset:0;border-radius:50%;overflow:hidden;background:var(--bg,#fff);transform:translateZ(0)}' +
    '.lp-clone{position:absolute;left:0;top:0;transform-origin:0 0;margin:0;pointer-events:none}' +
    '.lp-clone *{animation-play-state:paused!important}' +
    '.lp-sh{position:absolute;inset:0;border-radius:50%;pointer-events:none;' +
      'background:radial-gradient(circle at 34% 28%,rgba(255,255,255,.55) 0 6%,rgba(255,255,255,0) 22%),radial-gradient(circle at 50% 50%,rgba(0,0,0,0) 62%,rgba(20,20,30,.10) 84%,rgba(20,20,30,.28) 100%)}' +
    '.lp-rim{position:absolute;inset:-3px;border-radius:50%;pointer-events:none;padding:4px;' +
      'background:conic-gradient(from 200deg,rgba(255,255,255,.95),rgba(255,120,120,.55),rgba(255,230,120,.5),rgba(120,255,190,.5),rgba(110,170,255,.6),rgba(210,130,255,.55),rgba(255,255,255,.95));' +
      '-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;filter:blur(.4px)}' +
    '.lp-ring{position:absolute;inset:-1px;border-radius:50%;box-shadow:0 0 0 1px rgba(20,20,20,.18),inset 0 0 0 1px rgba(255,255,255,.7),inset 0 0 18px rgba(255,255,255,.35)}' +
    '.lp-shadow{position:fixed;left:0;top:0;z-index:57;width:var(--D);height:var(--D);border-radius:50%;pointer-events:none;will-change:transform;opacity:0;transition:opacity .8s;' +
      'background:radial-gradient(circle at 50% 50%,rgba(255,250,235,.0) 0 40%,rgba(30,25,20,.10) 62%,rgba(30,25,20,.0) 74%);filter:blur(6px)}' +
    '.lp-shadow.on{opacity:1}' +
    '.kw{background:linear-gradient(var(--hc),var(--hc)) 0 86%/0% 34% no-repeat;transition:background-size .9s cubic-bezier(.2,.8,.2,1);border-radius:2px;-webkit-box-decoration-break:clone;box-decoration-break:clone}' +
    '.kw.found{background-size:100% 34%}' +
    'html[data-u="2"] .kw{background:none}' +
    '@media (prefers-reduced-motion:reduce){.lp,.lp-shadow{display:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // klíčová slova obalit do <span class="kw">
  function wrap(el, word) {
    if (!el) return null;
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) {
      var i = n.data.indexOf(word); if (i < 0) continue;
      var r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + word.length);
      var s = document.createElement('span'); s.className = 'kw'; r.surroundContents(s); return s;
    }
    return null;
  }
  var kws = [];
  KW.forEach(function (k, i) {
    var el = document.querySelector(k[0]), s = wrap(el, k[1]);
    if (s) { s.style.setProperty('--hc', PAL[i] + '55'); kws.push({ el: s, sec: s.closest('section'), c: PAL[i], i: i, t: 0 }); }
  });

  // lupa
  var lens = document.createElement('div'); lens.className = 'lp'; lens.setAttribute('aria-hidden', 'true');
  lens.innerHTML = '<div class="lp-in"><div class="lp-clone"></div></div><i class="lp-sh"></i><i class="lp-rim"></i><i class="lp-ring"></i>';
  var shadow = document.createElement('div'); shadow.className = 'lp-shadow'; shadow.setAttribute('aria-hidden', 'true');
  document.body.appendChild(shadow); document.body.appendChild(lens);
  var holder = lens.querySelector('.lp-in'), clone = null, ckw = [];
  var S = MODE === 'color' ? 1.3 : 1.55, D = 200, R = 100, Dbase = 200, Dcur = 0;

  function makeClone() {
    var c = main.cloneNode(true);
    c.removeAttribute('id');
    [].forEach.call(c.querySelectorAll('[id]'), function (e) { e.removeAttribute('id'); });
    [].forEach.call(c.querySelectorAll('img[data-src]'), function (im) { im.src = im.dataset.src; im.removeAttribute('data-src'); });
    [].forEach.call(c.querySelectorAll('img[loading]'), function (im) { im.removeAttribute('loading'); });
    [].forEach.call(c.querySelectorAll('.wl-float,script,iframe,video'), function (e) { e.remove(); });
    [].forEach.call(c.querySelectorAll('.is-out'), function (e) { e.classList.remove('is-out'); });
    [].forEach.call(c.querySelectorAll('a,button,input,textarea,select'), function (e) { e.setAttribute('tabindex', '-1'); });
    c.className = 'lp-clone' + (MODE === 'color' ? ' lp-color' : '');
    c.setAttribute('aria-hidden', 'true'); c.setAttribute('inert', '');
    c.style.width = main.offsetWidth + 'px';
    if (clone) clone.replaceWith(c); else holder.querySelector('.lp-clone').replaceWith(c);
    clone = c; ckw = [].slice.call(c.querySelectorAll('.kw'));
    kws.forEach(function (k, i) { if (ckw[i]) ckw[i].classList.toggle('found', k.el.classList.contains('found')); });
  }
  function size() {
    var m = Math.min(innerWidth, innerHeight);
    D = Math.round(Math.max(140, Math.min(MODE === 'color' ? 300 : 260, m * (innerWidth < 700 ? .42 : .26))));
    Dbase = D; setD(D);
    if (clone) clone.style.width = main.offsetWidth + 'px';
  }

  // poloha lupy se drží v souřadnicích dokumentu: posun stránky ji tak nezpožďuje
  var dx = 0, dy = 0, started = false, last = performance.now(), clock = 0;
  var mx = -1, my = -1, mt = -1e9;
  if (fine) addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; mt = performance.now(); }, { passive: true });

  function setD(d) { if (Math.abs(d - Dcur) < .5) return; Dcur = d; D = d; R = d / 2; lens.style.setProperty('--D', d.toFixed(1) + 'px'); shadow.style.setProperty('--D', (d * 1.25).toFixed(1) + 'px'); }
  function center(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }
  function pick() {          // klíčové slovo nejblíž výšce 45 % okna, které je celé vidět
    var vh = innerHeight, best = null, bd = 1e9;
    for (var i = 0; i < kws.length; i++) {
      var c = center(kws[i].el), d = Math.abs(c.y - vh * .45);
      if (c.y < -vh * .2 || c.y > vh * 1.2) continue;
      if (d < bd) { bd = d; best = { k: kws[i], c: c }; }
    }
    return best;
  }

  var cur = null;
  function frame(now) {
    var dt = Math.min(.05, (now - last) / 1000); last = now; clock += dt;
    var sx = scrollX, sy = scrollY, vw = innerWidth, vh = innerHeight;
    var tx, ty, b = null, follow = MODE === 'color' && mx >= 0 && now - mt < 2500;
    if (follow) { tx = mx + sx; ty = my + sy; }
    else {
      b = pick();
      if (b) {
        var wob = b.k.i === 0 ? 1 : .35;             // nad úvodním nadpisem jemně krouží, jinde skoro stojí
        tx = b.c.x + sx + Math.sin(clock * .7) * R * .10 * wob;
        ty = b.c.y + sy + Math.sin(clock * .9 + 1) * R * .06 * wob;
      } else { tx = vw * .5 + sx; ty = vh * .45 + sy; }
    }
    var want = b && !follow ? Math.min(vw * .92, Math.max(Dbase, b.c.w * S * 1.18)) : Dbase;   // lupa se zvětší, aby se slovo vešlo celé
    setD(started ? D + (want - D) * (1 - Math.exp(-dt * 5)) : want);
    if (!started) { dx = tx; dy = ty; started = true; }
    var k = 1 - Math.exp(-dt * (follow ? 9 : 4.2));
    dx += (tx - dx) * k; dy += (ty - dy) * k;
    var cx = dx - sx, cy = dy - sy;
    lens.style.transform = 'translate3d(' + (cx - R).toFixed(1) + 'px,' + (cy - R).toFixed(1) + 'px,0)';
    shadow.style.transform = 'translate3d(' + (cx - R * 1.25 + R * .16).toFixed(1) + 'px,' + (cy - R * 1.25 + R * .24).toFixed(1) + 'px,0)';
    if (clone) {
      var mr = main.getBoundingClientRect();
      var ox = R - S * (cx - mr.left), oy = R - S * (cy - mr.top);
      clone.style.transform = 'translate(' + ox.toFixed(1) + 'px,' + oy.toFixed(1) + 'px) scale(' + S + ')';
    }
    // nalezeno: lupa stojí nad slovem → zvýraznění a barva části
    if (b && MODE === 'find') {
      var near = Math.hypot(b.c.x - cx, b.c.y - cy) < Math.max(10, R * .14);
      b.k.t = near ? b.k.t + dt : 0;
      if (b.k.t > .35 && !b.k.el.classList.contains('found')) {
        b.k.el.classList.add('found'); if (ckw[b.k.i]) ckw[b.k.i].classList.add('found');
        if (b.k.sec) b.k.sec.style.setProperty('--amber', b.k.c);
      }
      if (cur !== b.k) { cur = b.k; lens.querySelector('.lp-ring').style.boxShadow = '0 0 0 1.5px ' + b.k.c + '88,inset 0 0 0 1px rgba(255,255,255,.7),inset 0 0 18px rgba(255,255,255,.35)'; }
    }
    requestAnimationFrame(frame);
  }

  function start() {
    size(); makeClone();
    lens.classList.add('on'); shadow.classList.add('on');
    requestAnimationFrame(frame);
    var t; addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { size(); makeClone(); }, 200); });
    setTimeout(makeClone, 2200);                       // po dočtení obrázků a písma ještě jednou
  }
  if (reduce) return;
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () { requestAnimationFrame(start); });
})();
