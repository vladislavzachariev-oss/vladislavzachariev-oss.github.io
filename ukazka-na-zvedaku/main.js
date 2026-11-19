/* Na Zvedáku — ukázka, minimalistická verze 17. 11. 2026 (Vladislav Zachariev, Whyte Lynx) */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const RM = matchMedia('(min-width:100000px)').matches;

  /* plynulý posun */
  let lenis = null;
  if (!RM && window.Lenis) {
    lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href'); if (id.length < 2) return;
      const el = $(id); if (!el) return; e.preventDefault(); lenis.scrollTo(el, { offset: -70 });
    }));
  }

  /* lišta: po odjetí z úvodu podklad */
  const nav = $('#nav');
  const navUp = () => nav.classList.toggle('is-solid', scrollY > 24);

  /* fotka v úvodu se při posunu jemně přiblíží k plné velikosti */
  const pic = $('.hero__pic'), img = pic && $('img', pic);
  function heroZoom() {
    if (!img || RM) return;
    const r = pic.getBoundingClientRect(), vh = innerHeight;
    const t = Math.min(Math.max((vh - r.top) / (vh + r.height), 0), 1);
    img.style.setProperty('--z', (1.08 - t * 0.08).toFixed(4));
  }
  let tick = false;
  function onScroll() { if (tick) return; tick = true; requestAnimationFrame(() => { tick = false; navUp(); heroZoom(); }); }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  navUp(); heroZoom();

  /* služby: rozbalit jeden řádek */
  $$('.svc__it').forEach(it => {
    const b = $('.svc__row', it);
    b.addEventListener('click', () => {
      const open = !it.classList.contains('is-open');
      $$('.svc__it.is-open').forEach(o => { o.classList.remove('is-open'); $('.svc__row', o).setAttribute('aria-expanded', 'false'); });
      if (open) { it.classList.add('is-open'); b.setAttribute('aria-expanded', 'true'); }
      if (lenis) setTimeout(() => lenis.resize(), 480);
    });
  });

  /* čas v Praze */
  function now() {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Prague', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const g = t => p.find(x => x.type === t).value;
    return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday')), m: (+g('hour') % 24) * 60 + +g('minute') };
  }
  const H = d => (d >= 1 && d <= 5 ? [420, 1020] : d === 6 ? [480, 720] : null);
  const fmt = x => Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0');
  const names = ['v neděli', 'v pondělí', 'v úterý', 've středu', 've čtvrtek', 'v pátek', 'v sobotu'];

  /* otevřeno teď? */
  (function status() {
    const { day, m } = now(), h = H(day);
    let txt, open = false;
    if (h && m >= h[0] && m < h[1]) { txt = 'Teď máme otevřeno, do ' + fmt(h[1]); open = true; }
    else if (h && m < h[0]) txt = 'Teď zavřeno, otevíráme dnes v ' + fmt(h[0]);
    else for (let i = 1; i <= 7; i++) { const d = (day + i) % 7, hh = H(d); if (hh) { txt = 'Teď zavřeno, otevíráme ' + (i === 1 ? 'zítra' : names[d]) + ' v ' + fmt(hh[0]); break; } }
    $$('[data-status]').forEach(el => { $('span', el).textContent = txt; el.classList.toggle('is-open', open); });
    $$('[data-hours] [data-d]').forEach(r => r.classList.toggle('is-today', r.dataset.d.split(',').includes(String(day))));
  })();

  /* objednávka: nejbližších pět pracovních dnů */
  (function days() {
    const row = $('[data-days]'); if (!row) return;
    const short = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'];
    const d = new Date(); const out = [];
    for (let i = 1; out.length < 5 && i < 14; i++) {
      const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
      if (x.getDay() === 0 || x.getDay() === 6) continue;
      x.off = i; out.push(x);
    }
    out.forEach((x, k) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'day'; b.setAttribute('aria-pressed', k === 0 ? 'true' : 'false');
      b.innerHTML = '<b>' + (x.off === 1 ? 'zítra' : short[x.getDay()]) + '</b><small>' + x.getDate() + '. ' + (x.getMonth() + 1) + '.</small>';
      b.addEventListener('click', () => { $$('.day', row).forEach(o => o.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); });
      row.appendChild(b);
    });
  })();

  const form = $('.book__form');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    const done = $('.book__done', form); done.hidden = false;
  });

  /* objevení */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
    $$('.reveal').forEach((el, i) => { el.style.transitionDelay = (el.parentNode.children.length > 1 ? Array.prototype.indexOf.call(el.parentNode.children, el) % 4 * 70 : 0) + 'ms'; io.observe(el); });
  } else $$('.reveal').forEach(el => el.classList.add('in'));
})();
