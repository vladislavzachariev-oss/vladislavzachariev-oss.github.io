/* Bistro Kopr — ukázka (Vladislav Zachariev, Whyte Lynx).
   Hero: six plates photographed from above sit on the rim of a big invisible turntable. Scrolling turns it:
   the next plate swings in along the arc (from below on a wide window, from the side on a phone), turning on
   its own axis, the name changes letter by letter and the colour of the whole field follows the dish. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
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

  /* ---------- hero ---------- */
  const hero = $('#hero'), pin = $('.pin', hero), stage = $('#stage'), nav = $('#nav');
  const plates = $$('.plate', hero), imgs = plates.map(p => p.querySelector('img'));
  const dishes = $$('.dish', hero), N = dishes.length;
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const cols = dishes.map(d => hex(d.dataset.c));
  const STEP = 34 * Math.PI / 180;

  /* names: one span per letter, so they can slide in one after another */
  dishes.forEach(d => {
    const h = d.querySelector('.dish__name'), t = h.textContent;
    h.setAttribute('aria-label', t); h.textContent = '';
    [...t].forEach((ch, i) => { const s = document.createElement('span'); s.textContent = ch; s.style.setProperty('--i', i); s.setAttribute('aria-hidden', 'true'); h.appendChild(s); });
  });
  /* index of dishes: words on a wide window, dots on a phone */
  const idx = $('#idx');
  const idxBtns = dishes.map((d, i) => {
    const b = document.createElement('button'); b.type = 'button';
    b.textContent = d.querySelector('.dish__name').getAttribute('aria-label');
    b.addEventListener('click', () => go(hero.offsetTop + range() * i / (N - 1)));
    idx.appendChild(b); return b;
  });

  let G = null;                                           // geometry of the turntable for the current window
  const range = () => hero.offsetHeight - pin.offsetHeight;   // the pin is taller than the window (reserve for a phone's bars)
  function measure() {
    const vw = stage.clientWidth, vh = stage.clientHeight, pad = Math.min(72, Math.max(20, vw * .046));
    const tall = vw / vh < .8;
    let D, fx, fy, col;
    if (tall) {
      const top = 62;
      D = Math.min(vw * .86, vh * .46);
      fx = vw / 2; fy = top + D / 2 + Math.max(0, (vh * .56 - top - D) * .5);
      col = vw - 2 * pad;
      hero.style.setProperty('--ch', Math.max(210, vh - (fy + D / 2) - 14) + 'px');
    } else {
      D = Math.min(vh * .68, vw * .43);
      fx = vw * .685; fy = vh * .53;
      col = fx - D / 2 - pad - Math.max(18, vw * .02);
    }
    /* the longest name fits the column */
    const probe = dishes[N - 1].querySelector('.dish__name');
    hero.style.setProperty('--name', '100px');
    let widest = 0;
    dishes.forEach(d => { widest = Math.max(widest, d.querySelector('.dish__name').scrollWidth); });
    const name = Math.min(col / (widest / 100) * .985, tall ? vh * .1 : vh * .3, 240);
    hero.style.setProperty('--name', name.toFixed(1) + 'px');
    hero.style.setProperty('--col', col + 'px');
    hero.style.setProperty('--d', D.toFixed(1) + 'px');
    if (!tall) hero.style.setProperty('--dh', (name * 1.3 + 150) + 'px');
    G = { D, fx, fy, R: D * 1.8, tall, probe };
  }

  let active = -1, lastY = -1, lastP = -1;
  function setActive(i) {
    if (i === active) return;
    dishes.forEach((d, k) => { d.classList.toggle('was-on', k === active); d.classList.toggle('is-on', k === i); });
    idxBtns.forEach((b, k) => b.classList.toggle('is-on', k === i));
    active = i;
  }
  /* between two dishes the plate lingers a little at rest and hurries in the middle; it never stops with the scroll */
  const ease = t => t * .45 + (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) * .55;
  function render() {
    if (!G) return;
    const p = clamp((scrollY - hero.offsetTop) / range(), 0, 1);
    if (p === lastP) return; lastP = p;
    const f = p * (N - 1), i0 = Math.min(N - 2, Math.floor(f)), fr = f - i0, fe = i0 + ease(fr);
    for (let i = 0; i < N; i++) {
      const o = i - fe, near = Math.abs(o) < 1.75;
      plates[i].classList.toggle('is-near', near);
      if (!near) continue;
      const a = o * STEP * (o < 0 && !G.tall ? 1.36 : 1);     // a plate that has left clears the menu bar
      const x = G.tall ? G.fx + G.R * Math.sin(a) : G.fx + G.R * (1 - Math.cos(a));
      const y = G.tall ? G.fy + G.R * (1 - Math.cos(a)) : G.fy + G.R * Math.sin(a);
      plates[i].style.transform = 'translate3d(' + (x - G.D / 2).toFixed(1) + 'px,' + (y - G.D / 2).toFixed(1) + 'px,0)';
      imgs[i].style.transform = 'rotate(' + (o * 82).toFixed(2) + 'deg)';
    }
    const k = fr * fr * (3 - 2 * fr), a = cols[i0], b = cols[i0 + 1];
    hero.style.setProperty('--bg', 'rgb(' + [0, 1, 2].map(c => Math.round(a[c] + (b[c] - a[c]) * k)).join(',') + ')');
    setActive(Math.round(fe));
  }
  function tick() {
    requestAnimationFrame(tick);
    const y = scrollY;
    if (y === lastY) return; lastY = y;
    render();
    nav.classList.toggle('is-solid', y > hero.offsetTop + hero.offsetHeight - 64);
    spin();
  }

  /* ---------- plates further down turn with the page ---------- */
  const spins = $$('.spin');
  function spin() {
    spins.forEach(el => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) return;
      el.style.transform = 'rotate(' + ((innerHeight - r.top) * parseFloat(el.dataset.k)).toFixed(2) + 'deg)';
    });
  }

  let lw = 0;
  function onResize() {
    const w = innerWidth;
    if (w === lw && G && G.tall) return;                   // a phone only hides its address bar: nothing to re-measure
    lw = w; measure(); lastP = -1; render();
  }
  addEventListener('resize', onResize);
  measure();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); lastP = -1; render(); });
  setActive(0); render();
  requestAnimationFrame(tick);

  /* ---------- lunch menu: which day ---------- */
  (function menuDate() {
    const el = $('#menuDate'); if (!el) return;
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Prague' }));
    const d = new Date(now); let lead = 'Dnes, ';
    if (d.getDay() === 6) { d.setDate(d.getDate() + 2); lead = 'V pondělí, '; }
    else if (d.getDay() === 0) { d.setDate(d.getDate() + 1); lead = 'Zítra, '; }
    el.textContent = lead + new Intl.DateTimeFormat('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
  })();

  /* ---------- open now? ---------- */
  (function status() {
    const el = $('#status'); if (!el) return;
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Prague', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const get = t => parts.find(p => p.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    const m = (+get('hour') % 24) * 60 + +get('minute');
    const H = d => (d >= 1 && d <= 5 ? [660, 1320] : d === 6 ? [720, 1320] : [720, 960]);
    const fmt = x => Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0');
    const h = H(day);
    if (m >= h[0] && m < h[1]) { el.textContent = 'Teď máme otevřeno, do ' + fmt(h[1]) + '.'; el.classList.add('is-open'); return; }
    if (m < h[0]) { el.textContent = 'Teď je zavřeno, otevíráme dnes v ' + fmt(h[0]) + '.'; return; }
    el.textContent = 'Teď je zavřeno, otevíráme zítra v ' + fmt(H((day + 1) % 7)[0]) + '.';
  })();

  /* ---------- reveal ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach(el => io.observe(el));
})();
