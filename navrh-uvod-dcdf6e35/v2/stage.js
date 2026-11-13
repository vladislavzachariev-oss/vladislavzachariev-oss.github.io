/* Úvod v2: okno s jízdou kolem auta (předem vyrenderované snímky) → při posunu přes celou obrazovku a dovnitř.
   Bez zastávek: snímek se dohání plynule (260 snímků, takže krok mezi nimi není vidět). V klidu se záběr sám pomalu houpe
   a na počítači jde za kurzorem. */
(function () {
  const st = document.getElementById('stage');
  if (!st) return;
  const pin = st.querySelector('.stage-pin'), copy = st.querySelector('.stage-copy'), view = st.querySelector('.stage-view');
  const cv = view.querySelector('canvas'), ctx = cv.getContext('2d', { alpha: false });
  const caps = [...view.querySelectorAll('.stage-cap')], tag = view.querySelector('.stage-tag'), hint = view.querySelector('.stage-hint');
  const hdr = document.querySelector('.hdr');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const N = +st.dataset.frames, VER = st.dataset.v ? '?v=' + st.dataset.v : '';   // v = verze snímků, po novém renderu zvednout (jinak prohlížeč míchá staré a nové)
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, c01 = v => clamp(v, 0, 1);
  const ease = t => t * t * (3 - 2 * t), lerp = (a, b, t) => a + (b - a) * t;
  const IDLE = Math.round(N * .09);                    // kolik snímků z začátku jízdy se houpe v klidu

  /* dvě sady snímků: na šířku a na výšku (telefon); car = kde v klidových snímcích leží auto (podíly obrazu) */
  const SETS = {
    a: { dir: st.dataset.dir, car: { cx: .595, cy: .53, w: .77, h: .47 } },
    p: { dir: st.dataset.dirP, car: { cx: .50, cy: .555, w: .95, h: .27 } }
  };
  let set = null, imgs = [], W = 0, H = 0, dpr = 1, pad = 16, top0 = 300, win0 = null, cur = 0, px = 0, pxS = 0, running = false, raf = 0;

  function pick() {
    const k = (SETS.p.dir && innerWidth / innerHeight < .8) ? 'p' : 'a';
    if (set === SETS[k]) return;
    set = SETS[k]; imgs = new Array(N);
    const order = [], seen = new Set(), add = i => { if (i >= 0 && i < N && !seen.has(i)) { seen.add(i); order.push(i); } };
    for (let i = 0; i <= IDLE; i += 2) add(i);
    for (const s of [16, 8, 4, 2, 1]) for (let i = 0; i < N; i += s) add(i);
    add(N - 1);
    let qi = 0, live = 0;
    const mine = set;
    (function pump() {
      while (live < 6 && qi < order.length && mine === set) {
        const i = order[qi++], im = new Image();
        live++; im.decoding = 'async';
        im.onload = () => { im.ok = im.naturalWidth > 0; live--; pump(); };
        im.onerror = () => {                           // výpadek spojení: jeden pokus navíc, do té doby kryje sousední snímek
          if (im.again) { live--; pump(); return; }
          im.again = 1; setTimeout(() => { if (mine === set) im.src = im.src.replace(/(\?.*)?$/, m => (m || '?') + '&r=1'); else { live--; } }, 1500);
        };
        im.src = `${mine.dir}/${String(i).padStart(4, '0')}.webp${VER}`;
        imgs[i] = im;
      }
    })();
  }
  function near(i) {                                   // nejbližší už načtený snímek
    for (let d = 0; d < N; d++) {
      const a = imgs[i - d], b = imgs[i + d];
      if (a && a.ok) return a;
      if (b && b.ok) return b;
    }
    return null;
  }
  function layout() {
    pick();
    W = pin.clientWidth; H = pin.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, W < 700 ? 2 : 1.5);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    pad = W < 700 ? 12 : Math.max(16, Math.round(W * .022));
    if (still) { win0 = { x: 0, y: 0, w: W, h: H }; return; }
    top0 = Math.min(copy.offsetTop + copy.offsetHeight + (W < 700 ? 18 : 26), H * .64);
    win0 = { x: pad, y: top0, w: W - 2 * pad, h: H - top0 - pad };
  }
  function put(im, e, alpha) {
    const iw = im.naturalWidth, ih = im.naturalHeight, c = set.car;
    const sRest = Math.min(win0.w / (iw * c.w * 1.06), win0.h / (ih * c.h * 1.14));
    const sFull = Math.max(W / iw, H / ih);
    const s = lerp(sRest, sFull, e);
    const x = lerp(win0.x + win0.w / 2 + (.5 - c.cx) * iw * sRest, W / 2, e), y = lerp(win0.y + win0.h / 2 + (.5 - c.cy) * ih * sRest, H / 2, e);
    ctx.globalAlpha = alpha;
    ctx.drawImage(im, (x - iw * s / 2) * dpr, (y - ih * s / 2) * dpr, iw * s * dpr, ih * s * dpr);
  }
  function tick(t) {
    raf = requestAnimationFrame(tick);
    const r = st.getBoundingClientRect(), total = st.offsetHeight - H;
    const p = still ? 0 : c01(-r.top / total), e = still ? 1 : ease(c01(p / .13));
    /* okno */
    const T = top0 * (1 - e), S = pad * (1 - e), R = 22 * (1 - e);
    if (!still) {
      view.style.setProperty('--t', T.toFixed(1) + 'px'); view.style.setProperty('--s', S.toFixed(1) + 'px');
      view.style.setProperty('--b', S.toFixed(1) + 'px'); view.style.setProperty('--r', R.toFixed(1) + 'px');
      const k = c01(p / .075);
      copy.style.opacity = (1 - k).toFixed(3); copy.style.transform = `translate3d(0,${(-46 * k).toFixed(1)}px,0)`;
      copy.style.visibility = k >= 1 ? 'hidden' : '';
      const o = (1 - c01(p / .05)).toFixed(3); tag.style.opacity = o; hint.style.opacity = o;
      if (hdr) hdr.classList.toggle('stage-on', e > .55 && r.bottom > 40);
    }
    /* snímek: v klidu houpání + kurzor, při posunu jízda */
    pxS += (px - pxS) * .06;
    const idle = still ? IDLE * .5 : IDLE * (.5 + .36 * Math.sin(t / 2400)) + pxS * IDLE * .25;
    const drive = (N - 1) * c01((p - .035) / .935), target = clamp(idle * (1 - c01(p / .14)) + drive, 0, N - 1);
    cur += (target - cur) * (Math.abs(target - cur) > 40 ? 1 : .11);
    const A = near(Math.round(cur));                   // bez prolínání: dva snímky přes sebe dělaly z auta ducha
    ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
    if (A) put(A, e, 1);
    /* popisky podle místa v jízdě */
    const q = cur / (N - 1);
    for (const c of caps) {
      const a = +c.dataset.a, b = +c.dataset.b;
      const o = still ? 0 : ease(c01((q - a) / .035)) * (1 - ease(c01((q - (b - .035)) / .035))) * e;
      c.style.opacity = o.toFixed(3); c.style.visibility = o > .01 ? 'visible' : 'hidden';
      c.style.transform = `translate3d(0,${((1 - o) * 16).toFixed(1)}px,0)`;
      c.style.pointerEvents = o > .6 ? 'auto' : 'none';
    }
    if (still) { cancelAnimationFrame(raf); running = false; if (!A) setTimeout(start, 300); }
  }
  function start() { if (!running) { running = true; raf = requestAnimationFrame(tick); } }
  function stop() { running = false; cancelAnimationFrame(raf); if (hdr) hdr.classList.remove('stage-on'); }

  layout();
  addEventListener('resize', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  view.addEventListener('pointermove', ev => { if (ev.pointerType === 'mouse') px = ev.clientX / W - .5; });
  view.addEventListener('pointerleave', () => { px = 0; });
  if ('IntersectionObserver' in window) new IntersectionObserver(en => { en[0].isIntersecting ? start() : stop(); }).observe(st);
  else start();
  window.__stage = { get cur() { return cur; }, get loaded() { return imgs.filter(i => i && i.ok).length; }, get missing() { const m = []; for (let i = 0; i < N; i++) if (!imgs[i] || !imgs[i].ok) m.push(i); return m; }, N };
})();
