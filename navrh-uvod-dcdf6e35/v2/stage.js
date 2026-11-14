/* Úvod v2: okno s jízdou kolem auta (předem vyrenderované snímky) → při posunu přes celou obrazovku a dovnitř.
   Přepis 14. 11. 2026 po stížnosti Z („hrozně trhané“, „ujede dolejšek“), změřeno při 4× zpomaleném procesoru:
   - snímky se stahují jako data a dekódují předem mimo hlavní vlákno (createImageBitmap) jen v okně kolem polohy,
     kreslí se jen hotové; dřív drawImage(Image) dekódoval velký WebP při kreslení a zasekl stránku na 50–200 ms,
   - okno se kreslí do plátna (dřív animovaný clip-path přes celou obrazovku = překreslení celé vrstvy každý snímek),
   - kreslí se jen při změně snímku nebo rozvržení, žádné houpání v klidu ani pohyb za kurzorem,
   - výška: plocha je vysoká jako největší okno + přesah (stage.css), obraz se rozvrhuje do malého okna (svh),
     takže při schování lišty prohlížeče se nic nepřepočítává a dole nevznikne pruh,
   - záběr se nikdy nenatahuje tak, aby popisek nahoře ležel na autě: na tabletu jde záběr na celou šířku ke spodnímu okraji
     (nahoře zůstane černá), na širokém okně nejvýš o 12 % přes výšku a zbytek boků jsou černé pruhy s přechodem. */
(function () {
  const st = document.getElementById('stage');
  if (!st) return;
  const pin = st.querySelector('.stage-pin'), copy = st.querySelector('.stage-copy'), view = st.querySelector('.stage-view');
  const cv = view.querySelector('canvas'), ctx = cv.getContext('2d');
  const caps = [...view.querySelectorAll('.stage-cap')], tag = view.querySelector('.stage-tag'), hint = view.querySelector('.stage-hint');
  const hdr = document.querySelector('.hdr');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const N = +st.dataset.frames, VER = st.dataset.v ? '?v=' + st.dataset.v : '';
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, c01 = v => clamp(v, 0, 1);
  const ease = t => t * t * (3 - 2 * t), lerp = (a, b, t) => a + (b - a) * t;
  const REST = Math.round(N * .045);                   // klidový snímek (auto zepředu z boku)
  const BEHIND = 4, DEC = 3;                         // okno předem dekódovaných snímků: vzadu 4, vpředu podle rychlosti (12–30)
  let AHEAD = 12, KEEP = 22, STRIDE = 1, vel = 0;   // STRIDE: při rychlé jízdě se dopředu dekóduje každý n-tý snímek (rovnoměrné kroky místo nahodilých skoků)

  const SETS = {
    a: { k: 'a', dir: st.dataset.dir, car: { cx: .595, cy: .53, w: .77, h: .47 } },
    p: { k: 'p', dir: st.dataset.dirP, car: { cx: .50, cy: .555, w: .95, h: .27 } }
  };
  let set = null, blobs = [], bms = new Map(), busy = new Set(), decoding = 0, dirn = 1;
  let W = 0, H = 0, Hc = 0, dpr = 1, pad = 16, top0 = 300, win0 = null, cur = REST, shown = -1, shownF = -1, slow = true, lastE = -1, dirty = true;
  let running = false, raf = 0, lastT = 0;

  /* --vh = skutečná výška okna; CSS bere větší z ní a z 100lvh (stage.css) */
  let vh = 0;
  function setVh() { const h = Math.round(innerHeight); if (h !== vh) { vh = h; st.style.setProperty('--vh', h + 'px'); } }
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);

  function decode(blob) {
    if (window.createImageBitmap) return createImageBitmap(blob);
    return new Promise((ok, no) => {
      const im = new Image(), u = URL.createObjectURL(blob);
      im.onload = () => { (im.decode ? im.decode() : Promise.resolve()).then(() => { im.close = () => URL.revokeObjectURL(u); ok(im); }, no); };
      im.onerror = no; im.src = u;
    });
  }
  function pick() {
    const want = (SETS.p.dir && innerWidth / innerHeight < .8) ? SETS.p : SETS.a;
    if (set === want) return;
    set = want; blobs = new Array(N);
    bms.forEach(b => b.close && b.close()); bms = new Map(); busy = new Set(); shown = -1; dirty = true;
    const order = [], seen = new Set(), add = i => { if (i >= 0 && i < N && !seen.has(i)) { seen.add(i); order.push(i); } };
    for (let i = REST - 4; i <= REST + 14; i++) add(i);
    for (const s of [16, 8, 4, 2, 1]) for (let i = 0; i < N; i += s) add(i);
    add(N - 1);
    let qi = 0, live = 0;
    const mine = set;
    (function pump() {
      while (live < 6 && qi < order.length && mine === set) {
        const i = order[qi++], url = `${mine.dir}/${String(i).padStart(4, '0')}.webp${VER}`;
        live++;
        const get = again => fetch(url, again ? { cache: 'reload' } : undefined).then(r => { if (!r.ok) throw 0; return r.blob(); });
        get(0).catch(() => new Promise(r => setTimeout(r, 1500)).then(() => get(1)))
          .then(b => { if (mine === set) { blobs[i] = b; feed(); } }, () => {})
          .then(() => { live--; pump(); });
      }
    })();
  }
  /* dekódovat snímky kolem polohy, ve směru jízdy víc; vzdálené zavřít (paměť tabletu) */
  function feed() {
    const c = Math.round(cur), A = Math.min(AHEAD * STRIDE, 90), lo = dirn > 0 ? BEHIND : A, hi = dirn > 0 ? A : BEHIND;
    for (let d = 0; d <= Math.max(AHEAD, BEHIND) && decoding < DEC; d++) {
      for (const i of d ? [c + d * STRIDE * dirn, c - d * dirn] : [c]) {
        if (i < 0 || i >= N || i < c - lo || i > c + hi || bms.has(i) || busy.has(i) || !blobs[i] || decoding >= DEC) continue;
        busy.add(i); decoding++;
        const mine = set;
        decode(blobs[i]).then(bm => {
          if (mine !== set) { bm.close && bm.close(); return; }
          bms.set(i, bm);
          if (Math.abs(i - Math.round(cur)) <= Math.abs(shown - Math.round(cur)) || shown < 0) dirty = true;
        }, () => {}).then(() => { busy.delete(i); decoding--; feed(); });
      }
    }
    if (bms.size > KEEP) {
      const far = [...bms.keys()].sort((a, b) => Math.abs(b - c) - Math.abs(a - c));
      for (const i of far) { if (bms.size <= KEEP) break; if (i < c - lo - 2 || i > c + hi + 2) { const b = bms.get(i); b.close && b.close(); bms.delete(i); } }
    }
  }
  function nearest(i) {
    if (bms.has(i)) return i;
    for (let d = 1; d < N; d++) { if (bms.has(i - d)) return i - d; if (bms.has(i + d)) return i + d; }
    return -1;
  }

  function layout() {
    setVh(); pick();
    if (still) { W = view.clientWidth; H = Hc = view.clientHeight; }
    else { W = pin.clientWidth; Hc = pin.clientHeight; H = Math.min(probe.offsetHeight || innerHeight, Hc); }
    dpr = Math.min(window.devicePixelRatio || 1, W < 700 ? 2 : 1.5);
    const cw = Math.round(W * dpr), ch = Math.round(Hc * dpr);
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    pad = W < 700 ? 12 : Math.max(16, Math.round(W * .022));
    top0 = still ? 0 : Math.min(copy.offsetTop + copy.offsetHeight + (W < 700 ? 18 : 26), H * .64);
    win0 = still ? { x: 0, y: 0, w: W, h: H } : { x: pad, y: top0, w: W - 2 * pad, h: H - top0 - pad };
    view.style.setProperty('--s', pad + 'px'); view.style.setProperty('--b', pad + 'px');
    dirty = true;
  }
  /* kam položit celý snímek, když okno zabírá celou obrazovku (H = malé okno prohlížeče) */
  function fit(iw, ih) {
    let s, y;
    if (set.k === 'p') { s = Math.max(W / iw, H / ih); y = (H - ih * s) / 2; }
    else if (W / H >= iw / ih) { s = Math.min(W / iw, H * 1.12 / ih); y = -(ih * s - H) * .3; }
    else { s = Math.min(H / ih, W * 1.06 / iw); y = H - ih * s; }
    return { s, x: (W - iw * s) / 2, y };
  }
  function fadeEdges(x, y, w, h, R) {                 // přechod do černé tam, kam snímek nedosáhne
    const F = Math.min(w, h) * .14;
    const g = (x0, y0, x1, y1, rx, ry, rw, rh) => {
      const gr = ctx.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, '#000'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.fillRect(rx, ry, rw, rh);
    };
    if (x > R.x + .5) g(x, 0, x + F, 0, x, y, F, h);
    if (x + w < R.x + R.w - .5) g(x + w, 0, x + w - F, 0, x + w - F, y, F, h);
    if (y > R.y + .5) g(0, y, 0, y + F, x, y, w, F);
    if (y + h < R.y + R.h - .5) g(0, y + h, 0, y + h - F, x, y + h - F, w, F);
  }
  function frameAt() {                                // co ukázat: při pomalém pohybu prolnout dva sousední snímky podle přesné polohy
    const i0 = Math.floor(cur), a = cur - i0;        // (14. 11., Z u Porsche: „zasekaný dojezd“ — celé snímky se držely až 0,4 s a pak skočily)
    if (!still && slow && a > .002 && i0 + 1 < N && bms.has(i0) && bms.has(i0 + 1)) return [i0, i0 + 1, a, cur];
    const k = nearest(Math.round(cur)); return [k, -1, 0, k];
  }
  function draw(e) {
    const [k, k2, fa, f] = frameAt();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const R = still ? { x: 0, y: 0, w: W, h: Hc } : { x: lerp(win0.x, 0, e), y: lerp(win0.y, 0, e), w: lerp(win0.w, W, e), h: lerp(win0.h, Hc, e) };
    const rad = still ? 0 : 22 * (1 - e);
    ctx.save(); ctx.beginPath();
    if (rad > .5 && ctx.roundRect) ctx.roundRect(R.x, R.y, R.w, R.h, rad); else ctx.rect(R.x, R.y, R.w, R.h);
    ctx.clip(); ctx.fillStyle = '#000'; ctx.fillRect(R.x, R.y, R.w, R.h);
    if (k >= 0) {
      const im = bms.get(k), iw = im.width, ih = im.height, c = set.car, f = fit(iw, ih);
      const sR = Math.min(win0.w / (iw * c.w * 1.06), win0.h / (ih * c.h * 1.14));
      const s = still ? f.s : lerp(sR, f.s, e);
      const cx = still ? f.x + iw * f.s / 2 : lerp(win0.x + win0.w / 2 + (.5 - c.cx) * iw * sR, f.x + iw * f.s / 2, e);
      const cy = still ? f.y + ih * f.s / 2 : lerp(win0.y + win0.h / 2 + (.5 - c.cy) * ih * sR, f.y + ih * f.s / 2, e);
      const x = cx - iw * s / 2, y = cy - ih * s / 2;
      ctx.drawImage(im, x, y, iw * s, ih * s);
      if (k2 >= 0) { ctx.globalAlpha = fa; ctx.drawImage(bms.get(k2), x, y, iw * s, ih * s); ctx.globalAlpha = 1; }
      fadeEdges(x, y, iw * s, ih * s, R);
    }
    ctx.restore();
    shown = k; shownF = f;
  }

  const css = new WeakMap();
  function put(el, prop, v) { let m = css.get(el); if (!m) css.set(el, m = {}); if (m[prop] !== v) { m[prop] = v; el.style[prop] = v; } }
  let hdrOn = null;
  function tick(t) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(.1, (t - (lastT || t)) / 1000); lastT = t;
    const r = st.getBoundingClientRect(), total = Math.max(1, st.offsetHeight - Hc);
    const p = still ? 0 : c01(-r.top / total), e = still ? 1 : ease(c01(p / .13));
    if (!still) {
      const k = c01(p / .075);
      put(copy, 'opacity', (1 - k).toFixed(3)); put(copy, 'transform', `translate3d(0,${(-46 * k).toFixed(1)}px,0)`);
      put(copy, 'visibility', k >= 1 ? 'hidden' : '');
      const o = (1 - c01(p / .05)).toFixed(2); put(tag, 'opacity', o); put(hint, 'opacity', o);
      const on = e > .55 && r.bottom > 40;
      if (hdr && on !== hdrOn) { hdrOn = on; hdr.classList.toggle('stage-on', on); }
    }
    const drive = (N - 1) * c01((p - .035) / .935), target = clamp(REST * (1 - c01(p / .14)) + drive, 0, N - 1);
    const gap = target - cur;
    AHEAD = Math.round(clamp(12 + Math.abs(gap) * .6, 12, 30)); KEEP = AHEAD + BEHIND + 6;
    const was = cur;
    if (Math.abs(gap) > 150) cur = target; else if (Math.abs(gap) > .02) cur += gap * (1 - Math.exp(-dt * 7.5)); else cur = target;
    slow = Math.abs(cur - was) < 1.2;                                      // v rychlém pohybu se snímek mění každé obnovení, prolínání netřeba
    if (dt > 0) vel += (Math.abs(cur - was) / dt - vel) * .25;            // snímků za sekundu
    STRIDE = Math.round(clamp(vel / 40, 1, 6));                          // ~40 dekódování/s stihne i pomalý tablet (změřeno 14. 11.)
    if (Math.abs(gap) > .3) dirn = gap > 0 ? 1 : -1;
    const want = Math.round(cur);
    if (want !== shown || bms.has(want) && shown !== want) feed();
    const eq = Math.round(e * 1000);
    if (dirty || eq !== lastE || Math.abs(frameAt()[3] - shownF) > .004) { draw(e); dirty = false; lastE = eq; }
    const q = cur / (N - 1);
    for (const c of caps) {
      const a = +c.dataset.a, b = +c.dataset.b;
      const o = still ? 0 : ease(c01((q - a) / .035)) * (1 - ease(c01((q - (b - .035)) / .035))) * e;
      const os = o.toFixed(2);
      put(c, 'opacity', os); put(c, 'visibility', o > .01 ? 'visible' : 'hidden');
      put(c, 'transform', `translate3d(0,${((1 - o) * 16).toFixed(0)}px,0)`);
      put(c, 'pointerEvents', o > .6 ? 'auto' : 'none');
    }
    if (still && shown >= 0) { cancelAnimationFrame(raf); running = false; }
  }
  function start() { if (!running) { running = true; lastT = 0; raf = requestAnimationFrame(tick); } }
  function stop() { running = false; cancelAnimationFrame(raf); if (hdr) { hdr.classList.remove('stage-on'); hdrOn = false; } }

  layout();
  addEventListener('resize', layout);
  if (window.visualViewport) visualViewport.addEventListener('resize', setVh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  if (still) { const k = setInterval(() => { if (shown >= 0) clearInterval(k); else { dirty = true; start(); } }, 300); }
  if ('IntersectionObserver' in window) new IntersectionObserver(en => { en[0].isIntersecting ? start() : stop(); }).observe(st);
  else start();
  window.__stage = {
    get cur() { return cur; }, get shown() { return shown; }, get shownF() { return shownF; }, get loaded() { return blobs.filter(Boolean).length; },
    get decoded() { return bms.size; }, get missing() { const m = []; for (let i = 0; i < N; i++) if (!blobs[i]) m.push(i); return m; }, N
  };
})();
