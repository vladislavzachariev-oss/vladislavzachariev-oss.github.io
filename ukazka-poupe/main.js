/* Květinářství Poupě — ukázka (Vladislav Zachariev, Whyte Lynx).
   Hero: a real time-lapse of a daffodil (92 frames, cut out of a black background) is drawn on a canvas.
   Its frame follows the scroll position exactly; between two frames the neighbours are blended by the
   exact position, so a finger that moves slowly sees the flower open smoothly, never jump.
   Everything in the hero is a function of the position. Nothing switches on with a timed animation,
   so a finger moving back and forth cannot make anything blink (lesson of 16. 11. 2026). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = t => t * t * (3 - 2 * t);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- smooth wheel ---------- */
  let lenis = null;
  if (window.Lenis && !reduced) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const go = y => (lenis ? lenis.scrollTo(y, { duration: 1.2 }) : scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' }));
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'), el = id === '#top' ? document.body : $(id);
    if (!el) return;
    e.preventDefault();
    go(id === '#top' ? 0 : el.getBoundingClientRect().top + scrollY - 40);
  }));

  /* ---------- frames ---------- */
  const N = 92;
  const hero = $('#hero'), pin = $('.pin', hero), stage = $('#stage'), cv = $('#bloom'), cx = cv.getContext('2d');
  const nav = $('#nav'), hint = $('#hint'), steps = $$('#steps li');
  const dir = Math.min(innerWidth, innerHeight) * Math.min(2, devicePixelRatio || 1) > 900 ? 'l' : 's';
  const frames = new Array(N).fill(null);
  let lastDrawn = '';
  /* fetched as data and decoded by createImageBitmap off the main thread: an <img> decoded on first draw
     cost the throttled tablet 16 s of blocked main thread while the frames streamed in (measured 16. 11. 2026) */
  const PX = dir === 'l' ? 1200 : 760;
  function load(i) {
    const url = 'img/' + dir + '/' + String(i).padStart(3, '0') + '.webp';
    const done = b => { frames[i] = b; if (Math.abs(i - curF) < 2) { lastDrawn = ''; draw(); } };
    if (!window.createImageBitmap || !window.fetch) return new Promise(res => { const im = new Image(); im.onload = () => { done(im); res(); }; im.onerror = res; im.src = url; });
    return fetch(url).then(r => r.blob()).then(b => createImageBitmap(b)).then(done, () => {});
  }
  /* first every 8th frame (the flower opens coarsely at once), then the gaps, a few at a time */
  (async () => {
    const order = [];
    for (let s of [8, 4, 2, 1]) for (let i = 0; i < N; i += s) if (!order.includes(i)) order.push(i);
    if (!order.includes(N - 1)) order.splice(1, 0, N - 1);
    for (let k = 0; k < order.length; k += 6) await Promise.all(order.slice(k, k + 6).map(load));
  })();
  /* nearest frame already loaded at or below / above i */
  const below = i => { for (let k = i; k >= 0; k--) if (frames[k]) return k; return -1; };
  const above = i => { for (let k = i; k < N; k++) if (frames[k]) return k; return -1; };

  /* ---------- geometry ---------- */
  let G = null;
  const range = () => hero.offsetHeight - pin.offsetHeight;
  function measure() {
    const vw = stage.clientWidth, vh = stage.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
    const tall = vw / vh < .8, low = vh < 520 && !tall;
    hero.classList.toggle('is-tall', tall);
    hero.classList.toggle('is-low', low);
    let S, fx, fy;
    if (tall) {
      const text = $('.copy', hero).offsetHeight;
      S = Math.min(vw * 1.02, (vh - text - 40) * 1.06);
      fx = vw / 2; fy = 64 + (vh - text - 64) / 2;
    } else {
      S = Math.min(vh * (low ? 1 : .84), vw * .55);
      fx = vw * (low ? .7 : .68); fy = vh * (low ? .55 : .545);
      hero.style.setProperty('--col', Math.max(260, fx - S * .42 - clamp(vw * .046, 20, 72) - 24) + 'px');
    }
    /* the headline fits its column */
    const h = $('.copy__h', hero), col = tall ? vw - 2 * Math.max(20, vw * .046) : parseFloat(hero.style.getPropertyValue('--col'));
    hero.style.setProperty('--hs', '100px');
    const w100 = Math.max(...[...h.childNodes].map(n => { const r = document.createRange(); r.selectNodeContents(n); return r.getBoundingClientRect().width; }));
    const hs = Math.min(col / (w100 / 100) * .96, tall ? vh * .085 : vh * (low ? .17 : .16), 150);
    hero.style.setProperty('--hs', hs.toFixed(1) + 'px');
    if (tall) {                                         /* the text height changed with the headline: place the flower again */
      const text = $('.copy', hero).offsetHeight;
      S = Math.min(vw * 1.02, (vh - text - 40) * 1.06);
      fy = 64 + (vh - text - 64) / 2;
    }
    cv.width = cv.height = PX;
    cv.style.width = cv.style.height = S + 'px';
    cv.style.left = (fx - S / 2) + 'px'; cv.style.top = (fy - S / 2) + 'px';
    pin.style.setProperty('--gx', (fx / vw * 100).toFixed(1) + '%');
    G = { S, fx, fy, dpr, vw, vh };
    lastDrawn = ''; lastZ = -1;
  }

  /* ---------- draw ---------- */
  let curF = 0, lastZ = -1;
  function draw() {
    if (!G) return;
    const f = curF, i0 = Math.floor(f), t = f - i0, i1 = Math.min(N - 1, i0 + 1);
    let a = below(i0), b = above(i1);
    if (a < 0 && b < 0) return;
    if (a < 0) a = b; if (b < 0) b = a;
    /* weight by the exact position between the two frames we have (they are neighbours once all are loaded) */
    /* sharpened: the blend happens in the middle of each step, so a page at rest mostly shows one whole frame, not two ghosts */
    const w = b === a ? 0 : smooth(clamp(((f - a) / (b - a) - .5) * 1.8 + .5, 0, 1));
    /* the bud is small in the footage: it starts a little closer and the camera eases back while it opens */
    const z = 1.32 - .32 * smooth(clamp(f / 40, 0, 1));
    const key = a + ':' + b + ':' + w.toFixed(3);
    if (key !== lastDrawn) {
      lastDrawn = key;
      cx.clearRect(0, 0, PX, PX);
      /* 'lighter' on an empty canvas adds the two premultiplied frames: an exact blend, no see-through dip in the middle */
      cx.globalCompositeOperation = 'lighter';
      cx.globalAlpha = 1 - w; cx.drawImage(frames[a], 0, 0, PX, PX);
      if (w > 0) { cx.globalAlpha = w; cx.drawImage(frames[b], 0, 0, PX, PX); }
      cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
    }
    if (z !== lastZ) { lastZ = z; cv.style.transform = 'scale(' + z.toFixed(4) + ')'; }
  }

  let lastY = -1, lastP = -1;
  function render() {
    const p = clamp((scrollY - hero.offsetTop) / range(), 0, 1);
    if (p === lastP) return; lastP = p;
    /* the first and last few percent hold still, so the page starts on the bud and ends on the full flower */
    const q = clamp((p - .03) / .88, 0, 1);
    curF = q * (N - 1);
    draw();
    /* three short lines, each one fully readable around its part of the bloom, blended by position */
    /* one line at a time: each fades out fully before the next fades in (two half-visible lines read as a smudge) */
    const c = [.12, .5, .88], last = c.length - 1;
    steps.forEach((li, k) => {
      let d = (q - c[k]) / .19;               /* .19 = half the gap: one line is gone exactly where the next starts */
      if ((k === 0 && d < 0) || (k === last && d > 0)) d = 0;
      const o = smooth(clamp(1.7 - Math.abs(d) * 1.7, 0, 1));
      li.style.opacity = o.toFixed(3);
      li.style.transform = 'translate3d(0,' + (clamp(d, -1, 1) * -10).toFixed(1) + 'px,0)';
    });
    hint.style.opacity = (.8 * (1 - smooth(clamp(p / .06, 0, 1)))).toFixed(3);
  }
  function tick() {
    requestAnimationFrame(tick);
    const y = scrollY;
    if (y === lastY) return; lastY = y;
    render();
    nav.classList.toggle('is-solid', y > hero.offsetTop + hero.offsetHeight - pin.offsetHeight + innerHeight - 64);
    drift();
  }

  /* ---------- photos further down drift a little with the page ---------- */
  const drifts = $$('.drift');
  function drift() {
    drifts.forEach(el => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) return;
      const k = parseFloat(el.dataset.k || '-.07');
      el.style.transform = 'translate3d(0,' + ((r.top + r.height / 2 - innerHeight / 2) * k).toFixed(1) + 'px,0)';
    });
  }

  let lw = 0, lh = 0;
  function onResize() {
    const w = innerWidth, h = innerHeight;
    /* a phone only hides its address bar: the stage is 100svh, nothing to re-measure */
    if (w === lw && Math.abs(h - lh) < 160 && G) return;
    lw = w; lh = h; measure(); lastP = -1; render();
  }
  addEventListener('resize', onResize);
  lw = innerWidth; lh = innerHeight;
  measure();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); lastP = -1; render(); });
  render();
  requestAnimationFrame(tick);
  window.__poupe = { get f() { return curF; }, frames };

  /* ---------- open now? ---------- */
  (function status() {
    const el = $('#status'); if (!el) return;
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Prague', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const get = t => parts.find(x => x.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    const m = (+get('hour') % 24) * 60 + +get('minute');
    const H = d => (d >= 1 && d <= 5 ? [480, 1080] : d === 6 ? [480, 720] : null);
    const fmt = x => Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0');
    const h = H(day);
    if (h && m >= h[0] && m < h[1]) { el.textContent = 'Teď máme otevřeno, do ' + fmt(h[1]) + '.'; el.classList.add('is-open'); return; }
    if (h && m < h[0]) { el.textContent = 'Teď je zavřeno, otevíráme dnes v ' + fmt(h[0]) + '.'; return; }
    let d = (day + 1) % 7, n = 1; while (!H(d)) { d = (d + 1) % 7; n++; }
    el.textContent = 'Teď je zavřeno, otevíráme ' + (n === 1 ? 'zítra' : 'v pondělí') + ' v ' + fmt(H(d)[0]) + '.';
  })();

  /* ---------- reveal ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach(el => io.observe(el));
})();
