// Zkušební nápady pro whytelynx.cz (J 15. 11. 2026). Jen transformace a clip-path, žádné kreslení do plátna.
gsap.registerPlugin(ScrollTrigger);
const touch = matchMedia('(hover:none)').matches;
const setVh = () => document.documentElement.style.setProperty('--vh', innerHeight / 100 + 'px');
setVh(); addEventListener('resize', setVh);
let lenis = null;
if (!touch && window.Lenis) {
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
}
const WORKS = [
  ['sedm-smrku', 'Sedm smrků', 'Ukázka · horská chata', '#e9e4da'],
  ['plna-naruc', 'Plná náruč', 'Ukázka · květinářství', '#f2b8c6'],
  ['zrno-a-zar', 'Zrno a žár', 'Ukázka · kavárna', '#d9902a'],
  ['krater', 'KRÁTER', 'Ukázka · energetický nápoj', '#9be15d'],
  ['black-horse', 'Black Horse', 'Návrh · restaurace, Liberec', '#c9b48a'],
  ['odlesk', 'Odlesk', 'Ukázka · sklo a světlo', '#8fd3ff'],
  ['letokruh', 'Letokruh', 'Ukázka · podlahy', '#c8a27a'],
  ['burger-empire', 'Burger Empire', 'Návrh · burgery, Praha', '#ff6a3d'],
  ['zahourek', 'Autoservis Žahourek', 'Web klienta · Česká Lípa', '#ffffff'],
];

/* P1 balíček: karty leží na sobě, posun odhazuje vrchní nahoru s rotací */
(() => {
  const deck = document.querySelector('.deck'), capB = document.querySelector('.p1-cap b'), capS = document.querySelector('.p1-cap span');
  const cards = WORKS.map(([f, n, t, c], i) => {
    const el = document.createElement('div'); el.className = 'card'; el.style.setProperty('--c', c); el.style.zIndex = WORKS.length - i;
    el.innerHTML = `<img class="d" src="img/${f}-0.webp" alt="${n}" decoding="async"><img class="m" src="img/${f}-m.webp" alt="" decoding="async">`;
    deck.appendChild(el);
    const r = (i % 2 ? 1 : -1) * (2 + (i * 7) % 5);
    gsap.set(el, { rotation: r, y: i * -6, scale: 1 - i * 0.025 });
    return el;
  });
  const n = cards.length;
  const setCap = k => { const w = WORKS[Math.min(n - 1, k)]; capB.textContent = w[1]; capS.textContent = w[2]; };
  setCap(0);
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.p1', pin: '.p1 .pin', start: 'top top', end: () => '+=' + innerHeight * (n * 0.55), scrub: 0.6,
    onUpdate: s => setCap(Math.floor(s.progress * (n - 1) + 0.3)) } });
  cards.forEach((el, i) => {
    if (i === n - 1) return;
    const dir = i % 2 ? 1 : -1;
    tl.to(el, { yPercent: -150, xPercent: dir * 28, rotation: dir * 18, ease: 'power2.in', duration: 1 }, i);
    cards.slice(i + 1).forEach((u, k) => tl.to(u, { y: k * -6, scale: 1 - k * 0.025, rotation: (k % 2 ? 1 : -1) * 2, duration: 1, ease: 'power1.out' }, i));
  });
})();

/* P2 uvolnění: záběr přes celou plochu se stáhne do levé půlky, vpravo vyjede text */
(() => {
  const mob = innerWidth <= 700;
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.p2', pin: '.p2 .pin', start: 'top top', end: '+=' + innerHeight * 2.2, scrub: 0.6 } });
  tl.fromTo('.p2-img', { clipPath: 'inset(0% 0% 0% 0% round 0px)' },
    { clipPath: mob ? 'inset(8% 4% 50% 4% round 18px)' : 'inset(10% 52% 10% 4% round 22px)', ease: 'power2.inOut', duration: 1 })
    .fromTo('.p2-img img', { scale: 1.15 }, { scale: 1, ease: 'none', duration: 1 }, 0)
    .fromTo('.p2-txt', { opacity: 0, x: mob ? 0 : 60, y: mob ? 40 : 0 }, { opacity: 1, x: 0, y: 0, duration: 0.5 }, 0.55)
    .to('.mk:not(.u) path', { strokeDashoffset: 0, duration: 0.35, ease: 'power1.inOut' }, 1.1)
    .to('.mk.u path', { strokeDashoffset: 0, duration: 0.25, stagger: 0.12, ease: 'power1.inOut' }, 1.45)
    .to({}, { duration: 0.2 });
})();

/* P3 čísla: jedno číslo na obrazovku, odpočítá se, kruh kolem se dotáčí */
(() => {
  const nums = [...document.querySelectorAll('.num')];
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.p3', pin: '.p3 .pin', start: 'top top', end: '+=' + innerHeight * 2.4, scrub: 0.5 } });
  nums.forEach((el, i) => {
    const b = el.querySelector('b'), to = +b.dataset.to, o = { v: i ? 100 : 0 };
    tl.fromTo(el, { opacity: 0, y: 60, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5 }, i * 1.2)
      .to(o, { v: to, duration: 0.6, ease: 'power2.out', onUpdate: () => b.textContent = Math.round(o.v).toLocaleString('cs-CZ') }, i * 1.2)
      .to(el, { opacity: i === nums.length - 1 ? 1 : 0, y: i === nums.length - 1 ? 0 : -60, filter: i === nums.length - 1 ? 'blur(0px)' : 'blur(10px)', duration: 0.4 }, i * 1.2 + 0.8);
  });
  tl.to('.ring .arc', { strokeDashoffset: 0, ease: 'none', duration: tl.duration() }, 0).to('.ring', { rotation: 120, ease: 'none', duration: tl.duration() }, 0);
})();

/* P4 karta: malá karta s promítáním prací se roztáhne přes celou obrazovku */
(() => {
  const box = document.querySelector('.reel-in');
  const imgs = WORKS.map(([f]) => { const im = new Image(); im.src = `img/${f}-${innerWidth <= 700 ? 'm' : '0'}.webp`; im.decoding = 'async'; box.appendChild(im); return im; });
  let k = 0; imgs[0].classList.add('on');
  setInterval(() => { imgs[k].classList.remove('on'); k = (k + 1) % imgs.length; imgs[k].classList.add('on'); }, 1400);
  const mob = innerWidth <= 700;
  gsap.timeline({ scrollTrigger: { trigger: '.p4', pin: '.p4 .pin', start: 'top top', end: '+=' + innerHeight * 1.4, scrub: 0.6 } })
    .to('.reel', { width: '100vw', height: () => innerHeight, aspectRatio: 'auto', top: '50%', borderRadius: 0, ease: 'power2.inOut', duration: 1 })
    .to('.p4-head', { opacity: 0, y: -40, duration: 0.4 }, 0)
    .to('.reel-l', { scale: mob ? 1.1 : 1.4, duration: 1 }, 0);
})();

/* P5 mapa: obrys republiky se nakreslí, pohled se přiblíží na sever, čára propojí města */
(() => {
  const g = document.querySelector('.map-g'), cz = document.querySelector('.cz'), route = document.querySelector('.route');
  const towns = [...document.querySelectorAll('.town')];
  const lc = cz.getTotalLength(), lr = route.getTotalLength();
  gsap.set(cz, { strokeDasharray: lc, strokeDashoffset: lc, fillOpacity: 0 });
  gsap.set(route, { strokeDasharray: lr, strokeDashoffset: lr });
  const cam = { s: 1, x: 500, y: 287.5 };
  const mob = innerWidth <= 700;
  const put = () => { g.setAttribute('transform', `translate(500 287.5) scale(${cam.s}) translate(${-cam.x} ${-cam.y})`); cz.style.strokeWidth = (mob ? 1.6 : 1) / cam.s; route.style.strokeWidth = (mob ? 3.2 : 2) / cam.s; };
  put();
  if (mob) towns[1].querySelectorAll('text').forEach((tx, i) => { tx.setAttribute('x', 5); tx.setAttribute('y', i ? 16 : 10); tx.setAttribute('text-anchor', 'start'); });
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.p5', pin: '.p5 .pin', start: 'top top', end: '+=' + innerHeight * 2.4, scrub: 0.6 } });
  tl.to(cz, { strokeDashoffset: 0, duration: 1, ease: 'none' })
    .to(cz, { fillOpacity: 1, duration: 0.4 }, 0.7)
    .to(cam, { s: mob ? 3.4 : 2.3, x: mob ? 395 : 320, y: 150, duration: 1.2, ease: 'power2.inOut', onUpdate: put }, 1.1)
    .to(towns[0], { opacity: 1, duration: 0.2 }, 1.9)
    .to(route, { strokeDashoffset: lr * 0.42, duration: 0.6, ease: 'none' }, 2.1)
    .to(towns[1], { opacity: 1, duration: 0.2 }, 2.6)
    .to(route, { strokeDashoffset: 0, duration: 0.8, ease: 'none' }, 2.8)
    .to(towns[2], { opacity: 1, duration: 0.2 }, 3.5)
    .to({}, { duration: 0.4 });
})();

/* P6 běžící patička: dva pásy jedou proti sobě, scroll je zrychlí a otočí směr */
(() => {
  const rows = [...document.querySelectorAll('.mq-row')].map((el, i) => ({ el, x: 0, dir: i ? 1 : -1, w: 0 }));
  const measure = () => rows.forEach(r => r.w = r.el.scrollWidth / 2);
  measure(); addEventListener('resize', measure);
  let boost = 0, sign = 1, last = scrollY;
  const io = { on: false };
  new IntersectionObserver(e => io.on = e[0].isIntersecting).observe(document.querySelector('.p6'));
  gsap.ticker.add((t, dt) => {
    const y = scrollY, v = y - last; last = y;
    if (v) sign = v > 0 ? 1 : -1;
    boost += (Math.min(Math.abs(v), 60) - boost) * 0.1;
    if (!io.on) return;
    rows.forEach(r => {
      r.x += r.dir * sign * (0.6 + boost * 0.25) * dt / 16.7;
      if (r.x < -r.w) r.x += r.w; if (r.x > 0) r.x -= r.w;
      r.el.style.transform = `translate3d(${r.x}px,0,0)`;
    });
  });
})();

/* P8 věta s obrázky: slovo a obrázek se střídají spolu, nové vyjede zdola */
(() => {
  const items = [['zrno-a-zar', 'kavárnu'], ['zahourek', 'autoservis'], ['plna-naruc', 'květinářství'], ['black-horse', 'restauraci'], ['sedm-smrku', 'chatu'], ['letokruh', 'podlahářství'], ['burger-empire', 'burgrárnu']];
  const chip = document.querySelector('.p8 .chip:not(.still)'), rot = document.querySelector('.rot-in');
  const imgs = items.map(([f]) => { const i = document.createElement('i'); i.style.backgroundImage = `url(img/${f}-0.webp)`; chip.appendChild(i); return i; });
  const words = items.map(([, w]) => { const b = document.createElement('b'); b.textContent = w; rot.appendChild(b); return b; });
  let k = 0; imgs[0].classList.add('on'); words[0].classList.add('on');
  const outer = rot.parentNode, fit = i => outer.style.width = words[i].getBoundingClientRect().width + 'px';
  document.fonts.ready.then(() => fit(k)); addEventListener('resize', () => fit(k));
  let vis = false; new IntersectionObserver(e => vis = e[0].isIntersecting).observe(document.querySelector('.p8'));
  setInterval(() => {
    if (!vis) return;
    const n = (k + 1) % items.length;
    words[k].classList.replace('on', 'out'); const old = words[k]; setTimeout(() => old.classList.remove('out'), 750);
    words[n].classList.add('on'); fit(n);
    imgs[n].style.zIndex = 2; imgs[k].style.zIndex = 1; imgs[n].classList.add('on'); const oi = imgs[k]; setTimeout(() => oi.classList.remove('on'), 750);
    k = n;
  }, 1600);
})();
