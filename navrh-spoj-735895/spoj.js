// Whyte Lynx – návrh K3 (J 15. 11. 2026): slovo po slovu, věta s obrázky, kreslení Česka. 3D úvod je modul v index.html.
gsap.registerPlugin(ScrollTrigger);
const touch = matchMedia('(hover:none)').matches;
const setVh = () => document.documentElement.style.setProperty('--vh', innerHeight / 100 + 'px');
setVh(); addEventListener('resize', setVh);
let lenis = null;
if (!touch && window.Lenis && !/nolenis/.test(location.search)) {
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
}

/* hlavička: tmavé písmo na světlých plochách (jantarový a bílý krok slov, všechno od věty s obrázky dolů) */
let stepLight = false, afterLight = false;
const head = () => document.body.classList.toggle('lt', stepLight || afterLight);
ScrollTrigger.create({ trigger: '#veta', start: 'top 40px', end: 'max', onToggle: s => { afterLight = s.isActive; head(); } });

/* Slovo po slovu: jeden krok = půl obrazovky posunu, tvrdý střih jako u předlohy; nové slovo vyjede, úderné přebarví plochu */
(() => {
  const sec = document.querySelector('.sl'), pin = sec.querySelector('.pin');
  const steps = [...sec.querySelectorAll('.st')], num = sec.querySelector('.sl-n'), n = steps.length;
  const pad2 = k => String(k).padStart(2, '0');
  // velikost písma: největší, při které se nejdelší krok skupiny vejde do šířky a do 60 % výšky (slova se nedělí)
  const fit = () => {
    const groups = {};
    steps.forEach(s => (groups[s.dataset.g] = groups[s.dataset.g] || []).push(s));
    const cs = getComputedStyle(steps[0]);
    const W = pin.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const H = pin.clientHeight * 0.6;
    Object.values(groups).forEach(g => {
      const s = g[g.length - 1], p = s.querySelector('p');
      s.style.display = 'flex'; s.style.visibility = 'hidden';
      let lo = 16, hi = +s.dataset.max * innerHeight / 100;
      for (let i = 0; i < 14; i++) {
        const m = (lo + hi) / 2; p.style.fontSize = m + 'px';
        if (p.scrollWidth <= W + 0.5 && p.offsetHeight <= H) lo = m; else hi = m;
      }
      p.style.fontSize = Math.floor(lo) + 'px';
      // blok skupiny stojí na místě: horní hrana podle nejdelšího kroku, nová slova jen přibývají (na mobilu to jinak poskakovalo)
      const top = Math.max(0, (pin.clientHeight * 0.9 - p.offsetHeight) / 2);
      s.style.display = ''; s.style.visibility = '';
      g.forEach(x => { const q = x.querySelector('p'); q.style.fontSize = Math.floor(lo) + 'px'; q.style.marginTop = top + 'px'; });
    });
  };
  let cur = -1;
  const set = i => {
    if (i === cur) return;
    if (cur >= 0) steps[cur].classList.remove('on');
    steps[i].classList.add('on');
    if (steps[i].dataset.bg) pin.dataset.bg = steps[i].dataset.bg; else delete pin.dataset.bg;
    stepLight = !!steps[i].dataset.bg; head();
    num.textContent = pad2(i + 1) + ' / ' + pad2(n);
    cur = i;
  };
  fit(); set(0);
  document.fonts.ready.then(() => { fit(); ScrollTrigger.refresh(); });
  addEventListener('resize', fit);
  const HOLD = 0.8; // poslední krok drží o něco déle
  ScrollTrigger.create({ trigger: sec, pin, start: 'top top', end: () => '+=' + innerHeight * 0.5 * (n + HOLD),
    onUpdate: st => set(Math.min(n - 1, Math.floor(st.progress * (n + HOLD)))) });
})();

/* Věta s obrázky: slovo a obrázek se střídají spolu */
(() => {
  const items = [['zrno-a-zar', 'kavárnu'], ['zahourek', 'autoservis'], ['plna-naruc', 'květinářství'], ['black-horse', 'restauraci'], ['sedm-smrku', 'chatu'], ['letokruh', 'podlahářství'], ['burger-empire', 'burgrárnu']];
  const chip = document.querySelector('.p8 .chip:not(.still)'), rot = document.querySelector('.rot-in');
  const imgs = items.map(([f]) => { const i = document.createElement('i'); i.style.backgroundImage = `url(img/${f}-0.webp)`; chip.appendChild(i); return i; });
  const words = items.map(([, w]) => { const b = document.createElement('b'); b.textContent = w; rot.appendChild(b); return b; });
  let k = 0; imgs[0].classList.add('on'); words[0].classList.add('on');
  const outer = rot.parentNode, fitW = i => outer.style.width = words[i].getBoundingClientRect().width + 'px';
  document.fonts.ready.then(() => fitW(k)); addEventListener('resize', () => fitW(k));
  let vis = false; new IntersectionObserver(e => vis = e[0].isIntersecting).observe(document.querySelector('.p8'));
  setInterval(() => {
    if (!vis) return;
    const nx = (k + 1) % items.length;
    words[k].classList.replace('on', 'out'); const old = words[k]; setTimeout(() => old.classList.remove('out'), 500);
    words[nx].classList.add('on'); fitW(nx);
    imgs[nx].style.zIndex = 2; imgs[k].style.zIndex = 1; imgs[nx].classList.add('on'); const oi = imgs[k]; setTimeout(() => oi.classList.remove('on'), 750);
    k = nx;
  }, 1600);
})();

/* Kreslení Česka: obrys se nakreslí, vyplní a rozsvítí se Liberec (bez přiblížení a bez dalších měst) */
(() => {
  const cz = document.querySelector('.cz'), town = document.querySelector('.town');
  const mob = innerWidth <= 700;
  if (mob) { const t = town.querySelectorAll('text'); t[0].setAttribute('y', -8); t[1].setAttribute('y', 26); cz.style.strokeWidth = 2.4; }
  const lc = cz.getTotalLength();
  gsap.set(cz, { strokeDasharray: lc, strokeDashoffset: lc, fillOpacity: 0 });
  gsap.timeline({ scrollTrigger: { trigger: '.p5', pin: '.p5 .pin', start: 'top top', end: '+=' + innerHeight * 1.6, scrub: 0.6 } })
    .to(cz, { strokeDashoffset: 0, duration: 1, ease: 'none' })
    .to(cz, { fillOpacity: 1, duration: 0.4 }, 0.75)
    .to(town, { opacity: 1, duration: 0.25 }, 1.05)
    .to({}, { duration: 0.35 });
})();
