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
    const er = endSec ? endSec.getBoundingClientRect() : null;
    nav.classList.toggle('is-dark', !!er && er.top < 64 && er.bottom > 64);
  }

  /* ---------- photos further down drift a little with the page ---------- */
  const drifts = $$('.drift'), endSec = $('#objednat');
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

  /* ---------- tie your own bouquet: occasion → colours → size, the photo follows ----------
     Every bouquet is photographed the same way (same paper, backdrop, light), so switching changes only
     the flowers. The size is the same photo seen closer: the files carry extra backdrop (mirrored margins), so S shows
     all of it and the bouquet small, L zooms in to the original framing; no edge is ever revealed. */
  (function build() {
    const root = $('#nabidka'); if (!root) return;
    const P = {
      pudrova:  { n: 'Pudrová',  alt: 'růže a karafiáty v barvě pudru s eukalyptem', edge: '#c1b9b1', p: [690, 1090, 1690] },
      slunecna: { n: 'Slunečná', alt: 'žluté tulipány, ranunkulky a bílé růžičky',   edge: '#bbb4ad', p: [590, 950, 1490] },
      zahradni: { n: 'Zahradní', alt: 'bílé eustomy, heřmánek a hodně zeleně',       edge: '#c0b9b1', p: [640, 990, 1590] },
      hluboka:  { n: 'Hluboká',  alt: 'bordó růže a tmavé ranunkulky',               edge: '#bdb5ad', p: [790, 1290, 1990] },
      ticha:    { n: 'Tichá',    alt: 'bílé růže, lilie a eukalyptus',               edge: '#c2bbb3', p: [690, 1090, 1690] }
    };
    const SIZES = ['S', 'M', 'L'], STEMS = { S: 9, M: 15, L: 25 }, SCALE = { S: 1, M: 1.12, L: 1.24 };
    const OCC = {
      narozeniny: { t: 'k narozeninám',     m: 'Všechno nejlepší k narozeninám!' },
      rande:      { t: 'na rande',          m: 'Těším se na večer.' },
      vyroci:     { t: 'k výročí',          m: 'Další rok s tebou. Děkuju.' },
      dik:        { t: 'jako poděkování',   m: 'Moc děkuju za všechno.' },
      rozlouceni: { t: 'na rozloučenou',    m: 'Upřímnou soustrast. Myslíme na vás.' }
    };
    const S = { occ: 'rande', pal: 'pudrova', size: 'M', when: 'zítra', how: 'vyzvednu' };
    const kc = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const price = () => P[S.pal].p[SIZES.indexOf(S.size)];

    const photo = $('#photo'), psize = $('#psize'), imgs = $$('.photo__img', photo), tag = $('#ptag');
    const set = (list, attr, val) => $$('button', list).forEach(b => b.setAttribute('aria-pressed', String(b.dataset[attr] === val)));
    const src = (k, w) => 'img/k/' + k + '-' + w + '.webp';
    let token = 0;
    function showPhoto() {
      const k = S.pal, on = imgs.find(i => i.classList.contains('is-on')), next = imgs.find(i => i !== on);
      if (on && on.dataset.k === k) return;
      const my = ++token;
      next.srcset = src(k, 640) + ' 640w, ' + src(k, 1100) + ' 1100w';
      next.sizes = on.sizes; next.src = src(k, 1100); next.dataset.k = k;
      next.alt = 'Kytice ' + P[k].n + ': ' + P[k].alt + ', v krémovém papíru';
      const swap = () => { if (my !== token) return; next.classList.add('is-on'); on.classList.remove('is-on'); on.alt = ''; };
      (next.decode ? next.decode() : Promise.resolve()).then(swap, swap);
    }
    imgs[0].dataset.k = 'pudrova';
    function update() {
      set($('#occ'), 'occ', S.occ); set($('#pal'), 'pal', S.pal); set($('#size'), 'size', S.size);
      showPhoto();
      psize.style.setProperty('--s', SCALE[S.size]);
      tag.innerHTML = '<b>' + P[S.pal].n + '</b> <span>' + S.size + ' · ' + STEMS[S.size] + ' stonků</span>';
      $('#price').textContent = kc(price());
      $('#slip').innerHTML = '<b>' + P[S.pal].n + ' · ' + S.size + '</b> ' + STEMS[S.size] + ' stonků · od ' + kc(price()) + ' Kč · <a href="#nabidka">změnit</a>';
      card();
    }
    $('#occ').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.occ = b.dataset.occ; S.pal = b.dataset.pal; update(); });
    $('#pal').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.pal = b.dataset.pal; update(); });
    $('#size').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.size = b.dataset.size; update(); });
    $$('.also__item[data-also="smutek"]').forEach(a => a.addEventListener('click', () => { S.occ = 'rozlouceni'; S.pal = 'ticha'; update(); }));
    $('#slip').addEventListener('click', e => { const a = e.target.closest('a'); if (!a) return; e.preventDefault(); go($('#nabidka').getBoundingClientRect().top + scrollY - 40); });

    /* the other colours load once the section is near, so the first switch is instant */
    const pre = new IntersectionObserver(es => { if (!es.some(e => e.isIntersecting)) return; pre.disconnect();
      const w = innerWidth * Math.min(2, devicePixelRatio || 1) * (innerWidth > 860 ? .46 : .5) > 700 ? 1100 : 640;
      Object.keys(P).forEach(k => { const i = new Image(); i.src = src(k, w); });
    }, { rootMargin: '600px 0px' });
    pre.observe(root);

    /* ---------- the card: what you type is written on it ---------- */
    const note = $('#note'), msgEl = $('#noteMsg'), sigEl = $('#noteSig');
    const msg = $('#msg'), sig = $('#sig'), left = $('#left'), date = $('#date'), addr = $('#addr');
    const plural = n => n === 1 ? 'znak' : n >= 2 && n <= 4 ? 'znaky' : 'znaků';
    let fitQ = 0;
    function fit() {
      cancelAnimationFrame(fitQ);
      fitQ = requestAnimationFrame(() => {
        const cs = getComputedStyle(note), room = note.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        let ns = Math.min(52, note.clientWidth * .092);
        note.style.setProperty('--ns', ns + 'px');
        while (ns > 17 && msgEl.offsetHeight + sigEl.offsetHeight + ns * .5 > room) { ns -= 1.5; note.style.setProperty('--ns', ns + 'px'); }
      });
    }
    function card() {
      const m = msg.value.trim(), s = sig.value.trim();
      msg.placeholder = OCC[S.occ].m;
      msgEl.textContent = m || OCC[S.occ].m; msgEl.classList.toggle('is-ph', !m);
      sigEl.textContent = '— ' + (s || 'M.'); sigEl.classList.toggle('is-ph', !s);
      const n = 160 - msg.value.length; left.textContent = n + ' ' + plural(n);
      fit(); links();
    }
    const grow = () => { msg.style.height = 'auto'; msg.style.height = msg.scrollHeight + 2 + 'px'; };
    msg.addEventListener('input', () => { grow(); card(); }); sig.addEventListener('input', card);
    $('#when').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.when = b.dataset.when; set($('#when'), 'when', S.when);
      date.hidden = S.when !== 'jindy'; if (!date.hidden && !date.min) { const t = new Date(); t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); date.min = t.toISOString().slice(0, 10); } links(); });
    $('#how').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.how = b.dataset.how; set($('#how'), 'how', S.how); addr.hidden = S.how !== 'dovézt'; links(); });
    date.addEventListener('input', links); addr.addEventListener('input', links);

    function order() {
      const p = P[S.pal], m = msg.value.trim() || OCC[S.occ].m, s = sig.value.trim();
      const kdy = S.when === 'jindy' ? (date.value ? date.value.split('-').reverse().map(Number).join('. ') : 'datum doplním') : S.when;
      const jak = S.how === 'dovézt' ? 'Dovézt na: ' + (addr.value.trim() || 'adresu doplním') + ' (+120 Kč)' : 'Vyzvednu v Květné 9.';
      return 'Dobrý den, objednávám kytici ' + p.n + ', velikost ' + S.size + ' (' + STEMS[S.size] + ' stonků), od ' + kc(price()) + ' Kč, ' + OCC[S.occ].t + '.\n'
        + 'Kdy: ' + kdy + '.\n' + jak + '\n'
        + 'Vzkaz na kartičku: „' + m + '“' + (s ? ' — ' + s : '');
    }
    function links() {
      const t = order();
      $('#sms').href = 'sms:+420123456789?&body=' + encodeURIComponent(t);
      $('#mail').href = 'mailto:kytice@poupe.example?subject=' + encodeURIComponent('Objednávka kytice ' + P[S.pal].n + ' ' + S.size) + '&body=' + encodeURIComponent(t);
    }
    addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    update();
    window.__build = { S, order, update };
  })();

  /* ---------- reveal ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach(el => io.observe(el));
})();
