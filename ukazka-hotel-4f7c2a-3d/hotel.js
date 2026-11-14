/* Hotel Hladina — výběr patra a let dovnitř (verze 3D: všechny snímky z Blenderu, 14. 11. 2026).
   Úvod = video průletu nad jezerem, končí přiblížením věže; pak se kamera plynule oddálí na celou věž.
   Všechny snímky mají stejný souřadný prostor 2816×1536. Let = řetěz přiblížení:
   snímek B leží v obdélníku R snímku A; kamera se plynule přiblíží z A do R a B se mezitím rozsvítí. */
(() => {
  const W = 2816, H = 1536;
  const app = document.getElementById('app'), cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  const $ = id => document.getElementById(id);
  const big = Math.min(window.devicePixelRatio || 1, 2) * Math.max(innerWidth, innerHeight) > 1500;

  // hrany pater na snímku věže: desky balkonů promítnuté v Blenderu (hotel.py MEASURE, FD1 300), zdola nahoru; poslední = střecha odhadem
  const EDGES = [1032, 991, 951, 910, 869, 828, 788, 747, 706, 666, 625, 584, 544, 503, 462];
  const FLOORS = EDGES.length - 1, TX0 = 1102, TX1 = 1730, TCX = 1414;

  const FOCUS = { vez: [TCX, 760], bok: [1580, 760], obyvak: [1408, 768], koupelna: [1408, 768], loznice: [1408, 768] };
  const rect = (cx, cy, w, fx, fy) => { const sc = w / W; return { x: cx - fx * sc, y: cy - fy * sc, sc }; };
  // R: kde leží dítě v rodiči (fx,fy = bod dítěte, který sedí na cx,cy rodiče)
  const LINK = {
    bok: f => ({ from: 'vez', ...rect(TCX, floorY(f), 515, 1408, 768) }),        // detail fasády: kamera 48 m / 35 mm proti 300 m / 40 mm
    obyvak: () => ({ from: 'bok', ...rect(1580, 760, 560, 1408, 768) }),          // rozsvícené okno uprostřed detailu
    koupelna: () => ({ from: 'obyvak', ...rect(1460, 740, 600, 1408, 768) }),      // průchod ve dřevěné stěně (výklenek)
    loznice: () => ({ from: 'obyvak', ...rect(520, 880, 560, 1408, 768) }),        // za pohovkou vlevo
  };
  const DOORS = { dLoz: [520, 760], dKoup: [1460, 600] };

  const TYPES = [
    [4, 'Pokoj s výhledem na jezero', '32 m², postel 180 cm, koupelna se sprchou a balkon nad promenádou.'],
    [10, 'Apartmá s jednou ložnicí', '62 m², obývák s kuchyní, ložnice a koupelna s vanou u okna. Výhled na západ, na jezero a kopce.'],
    [13, 'Apartmá se dvěma ložnicemi', '96 m², dvě ložnice, dvě koupelny a rohový balkon nad celou hladinou.'],
    [14, 'Střešní apartmá', '140 m², terasa kolem dokola a výhled na všechny strany.'],
  ];
  const type = n => TYPES.find(t => n <= t[0]);
  const ROOMS = {
    obyvak: n => [`Patro ${n}, ${type(n)[1].toLowerCase()}`, 'Obývák se otevírá na balkon nad jezerem. Odtud vedou dveře do ložnice a do koupelny.'],
    koupelna: () => ['Koupelna', 'Mramor, volně stojící vana a umyvadlo z tmavého kamene.'],
    loznice: () => ['Ložnice', 'Postel 180 cm, dubová stěna a okno přes celou šířku pokoje.'],
  };

  function floorY(n) { return (EDGES[n - 1] + EDGES[n]) / 2; }
  function floorAt(y) { for (let n = 1; n <= FLOORS; n++) if (y <= EDGES[n - 1] && y > EDGES[n]) return n; return 0; }

  // ---- obrázky: předem rozbalené, ať se při letu nic nerozbaluje ----
  const IMG = {};
  const names = Object.keys(FOCUS);
  async function load(n) {
    const im = new Image(); im.src = n === 'vez' ? 'img/vez-2816.webp' : `img/${n}-${big ? 2400 : 1400}.webp`;   // věž vždy plná: konec průletu ji ukáže zblízka (14. 11.)
    await im.decode();
    IMG[n] = window.createImageBitmap ? await createImageBitmap(im) : im;
    if (n !== 'vez') SOFT[n] = await soft(im);
    else { const m = new Image(); m.src = 'img/vez-mask.png?v=8'; await m.decode(); MASK = m; }
  }
  let MASK = null;   // alfa věže (render ze stejné kamery): ztlumení a pruh patra jen přes věž, ne do oblohy
  const OFF = document.createElement('canvas'), ox = OFF.getContext('2d');
  // měkké okraje: dítě se při přiblížení vynoří bez ostrého obdélníku
  const SOFT = {};
  async function soft(im) {
    const w = im.naturalWidth, h = im.naturalHeight, c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    x.globalCompositeOperation = 'destination-in';
    const f = .16, gx = x.createLinearGradient(0, 0, w, 0), gy = x.createLinearGradient(0, 0, 0, h);
    gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(f, '#000'); gx.addColorStop(1 - f, '#000'); gx.addColorStop(1, 'rgba(0,0,0,0)');
    gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(f, '#000'); gy.addColorStop(1 - f, '#000'); gy.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gx; x.fillRect(0, 0, w, h); x.fillStyle = gy; x.fillRect(0, 0, w, h);
    return window.createImageBitmap ? await createImageBitmap(c) : c;
  }

  // ---- kamera ----
  let sw = 0, sh = 0, dpr = 1;
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    sw = app.clientWidth; sh = app.clientHeight;
    cv.width = Math.round(sw * dpr); cv.height = Math.round(sh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingQuality = 'high';
  }
  const s0 = () => Math.max(sw / W, sh / H);
  function home(n) { // výchozí záběr snímku: přes celou plochu, střed co nejblíž FOCUS
    const s = s0(), hx = sw / 2 / s, hy = sh / 2 / s, [fx, fy] = FOCUS[n];
    return [Math.min(Math.max(fx, hx), W - hx), Math.min(Math.max(fy, hy), H - hy)];
  }
  function draw(img, c, k, extra) { // c = střed kamery v souřadnicích snímku, k = přiblížení
    const s = s0() * k;
    const dx = sw / 2 - c[0] * s, dy = sh / 2 - c[1] * s;
    ctx.globalAlpha = 1;
    ctx.drawImage(img, dx, dy, W * s, H * s);
    if (extra) extra(dx, dy, s);
    return [dx, dy, s];
  }

  // ---- stav ----
  let introDone = false;
  let scene = 'vez', floor = 8, hover = 0, flying = false, view = null;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  function segFrame(child, t) { // t 0..1 jednoho přiblížení rodič → dítě
    const L = LINK[child](floor), A = IMG[L.from], B = IMG[child];
    const cA = home(L.from), cBh = home(child);
    const kEnd = 1 / L.sc, cEnd = [L.x + cBh[0] * L.sc, L.y + cBh[1] * L.sc];
    const k = Math.exp(Math.log(kEnd) * t), w = (1 / k - L.sc) / (1 - L.sc);
    const c = [cEnd[0] + (cA[0] - cEnd[0]) * w, cEnd[1] + (cA[1] - cEnd[1]) * w];
    const [dx, dy, s] = draw(A, c, k);
    const a = smooth(.3, .82, t), a2 = smooth(.8, 1, t), bx = dx + L.x * s, by = dy + L.y * s, bw = W * s * L.sc, bh = H * s * L.sc;
    if (a > 0) { ctx.globalAlpha = a; ctx.drawImage(SOFT[child] || B, bx, by, bw, bh); }
    if (a2 > 0) { ctx.globalAlpha = a2; ctx.drawImage(B, bx, by, bw, bh); }
    ctx.globalAlpha = 1;
  }

  function fly(path, dur, back) { // path = řada dětí (bok, obyvak); back = pozpátku
    flying = true; app.classList.add('flying'); hideUI();
    const logs = path.map(ch => Math.log(1 / LINK[ch](floor).sc)), tot = logs.reduce((a, b) => a + b, 0);
    const t0 = performance.now();
    return new Promise(res => {
      const perf = window.__flyPerf = { n: 0, max: 0, last: t0 };
      (function step(now) {
        perf.n++; perf.max = Math.max(perf.max, now - perf.last); perf.last = now;
        let p = Math.min(1, (now - t0) / dur), L = ease(back ? 1 - p : p) * tot, i = 0;
        while (i < path.length - 1 && L > logs[i]) { L -= logs[i]; i++; }
        segFrame(path[i], Math.min(1, L / logs[i]));
        if (p < 1) requestAnimationFrame(step); else { flying = false; app.classList.remove('flying'); res(); }
      })(t0);
    });
  }

  // ---- kreslení klidového stavu ----
  function render() {
    if (flying || !IMG[scene] || app.classList.contains('intro') && !introDone) return;
    view = draw(IMG[scene], home(scene), 1, scene === 'vez' ? towerOverlay : null);
    placeUI();
  }
  function towerOverlay(dx, dy, s) {
    const n = hover || floor, y0 = dy + EDGES[n] * s, y1 = dy + EDGES[n - 1] * s, x0 = dx + TX0 * s, x1 = dx + TX1 * s;
    // 14. 11.: věž je 3D a natočená → obdélníky by lezly do oblohy; každý průchod se ořízne maskou věže (MASK)
    const pass = (op, paint) => {
      if (!MASK) { ctx.save(); ctx.globalCompositeOperation = op; paint(ctx); ctx.restore(); return; }
      if (OFF.width !== cv.width || OFF.height !== cv.height) { OFF.width = cv.width; OFF.height = cv.height; }
      ox.setTransform(1, 0, 0, 1, 0, 0); ox.clearRect(0, 0, OFF.width, OFF.height); ox.setTransform(ctx.getTransform());
      ox.save(); paint(ox); ox.globalCompositeOperation = 'destination-in'; ox.drawImage(MASK, dx, dy, 2816 * s, 1536 * s); ox.restore();
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = op; ctx.drawImage(OFF, 0, 0); ctx.restore();
    };
    pass('source-over', c => {               // ostatní patra trochu ztlumit
      c.fillStyle = 'rgba(8,16,32,.22)';
      c.fillRect(x0, dy + EDGES[FLOORS] * s, x1 - x0, y0 - (dy + EDGES[FLOORS] * s));
      c.fillRect(x0, y1, x1 - x0, dy + EDGES[0] * s - y1);
    });
    pass('lighter', c => {                   // zvolené rozsvítit
      const g = c.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, 'rgba(255,160,70,.25)'); g.addColorStop(1, 'rgba(255,170,80,.7)');
      c.fillStyle = g; c.fillRect(x0, y0, x1 - x0, y1 - y0);
    });
    pass('source-over', c => {
      c.fillStyle = 'rgba(255,220,170,.95)'; c.fillRect(x0 - 6, y1 - 1, x1 - x0 + 12, 1.5); c.fillRect(x0 - 6, y0, x1 - x0 + 12, 1);
    });
  }
  function toScreen(x, y) { return view ? [view[0] + x * view[2], view[1] + y * view[2]] : [0, 0]; }

  // ---- texty a tlačítka ----
  function setFloor(n, fromRange) {
    floor = Math.min(FLOORS, Math.max(1, n));
    $('lvlN').textContent = floor; $('tagN').textContent = floor;
    const t = type(floor); $('lvlType').textContent = t[1]; $('lvlDesc').textContent = t[2];
    if (!fromRange) $('rng').value = floor;
    render();
  }
  function hideUI() { $('room').hidden = true; $('dLoz').hidden = $('dKoup').hidden = true; $('tag').hidden = true; }
  function placeUI() {
    const tag = $('tag');
    if (scene === 'vez') {
      const n = hover || floor, [x, y] = toScreen(TX1 + 40, floorY(n)), pr = $('panel').getBoundingClientRect();
      const left = pr.width && x + 90 > pr.left && y > pr.top - 20 && y < pr.bottom + 20; // panel by číslo zakryl → vlevo od věže
      const xl = toScreen(TX0 - 40, 0)[0];
      tag.hidden = false; tag.classList.toggle('left', left);
      tag.style.left = (left ? xl : x) + 'px'; tag.style.top = y + 'px'; $('tagN').textContent = n;
    } else tag.hidden = true;
    for (const id in DOORS) {
      const b = $(id), on = scene === 'obyvak' && !flying;
      if (!on) { b.hidden = true; continue; }
      const [x, y] = toScreen(...DOORS[id]);
      b.hidden = y < 60 || y > sh - 40; // dveře vedle záběru (úzký telefon) = štítek u kraje, ať se dá do pokoje dojít
      const m = (b.offsetWidth || 92) / 2 + 12;   // šířka až po odkrytí, schované tlačítko měří 0
      b.style.left = Math.min(Math.max(x, m), sw - m) + 'px'; b.style.top = y + 'px';
    }
  }
  function showRoom() {
    const r = ROOMS[scene] && ROOMS[scene](floor), box = $('room');
    if (!r) { box.hidden = true; return; }
    $('roomH').textContent = r[0]; $('roomP').textContent = r[1];
    box.hidden = false; box.style.animation = 'none'; box.offsetWidth; box.style.animation = '';
  }
  function setScene(n) {
    scene = n; app.dataset.scene = n;
    $('back').hidden = n === 'vez';
    $('backTxt').textContent = n === 'obyvak' ? 'Zpět na budovu' : 'Zpět do obýváku';
    render(); showRoom();
  }

  // ---- ovládání ----
  async function enter() {
    if (flying || scene !== 'vez') return;
    hover = 0; await fly(['bok', 'obyvak'], 3200); setScene('obyvak');
  }
  async function back() {
    if (flying) return;
    if (scene === 'obyvak') { await fly(['bok', 'obyvak'], 2400, true); setScene('vez'); }
    else if (scene === 'koupelna' || scene === 'loznice') { const n = scene; await fly([n], 1100, true); setScene('obyvak'); }
  }
  async function door(to) {
    if (flying || scene !== 'obyvak') return;
    await fly([to], 1300); setScene(to);
  }
  $('go').onclick = enter;
  $('back').onclick = back;
  $('brand').onclick = e => { e.preventDefault(); if (scene !== 'vez') back(); };
  $('dLoz').onclick = () => door('loznice');
  $('dKoup').onclick = () => door('koupelna');
  $('rng').oninput = e => setFloor(+e.target.value, true);

  function imgPoint(e) {
    if (!view) return [-1, -1];
    const r = cv.getBoundingClientRect();
    return [(e.clientX - r.left - view[0]) / view[2], (e.clientY - r.top - view[1]) / view[2]];
  }
  const onTower = (x, y) => x > TX0 - 30 && x < TX1 + 30 ? floorAt(y) : 0;
  cv.addEventListener('pointermove', e => {
    if (scene !== 'vez' || flying || e.pointerType !== 'mouse') return;
    const n = onTower(...imgPoint(e));
    if (n !== hover) { hover = n; cv.style.cursor = n ? 'pointer' : ''; if (n) setFloor(n); else render(); }
  });
  cv.addEventListener('pointerleave', () => { if (hover) { hover = 0; render(); } });
  cv.addEventListener('click', e => {
    if (scene !== 'vez' || flying) return;
    const n = onTower(...imgPoint(e));
    if (!n) return;
    setFloor(n);
    if (e.pointerType === 'mouse' || matchMedia('(hover:hover)').matches) enter(); // na dotyku jen vybrat, vstup tlačítkem
  });
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' && e.key !== 'Enter') return;
    if (scene === 'vez' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); setFloor(floor + (e.key === 'ArrowUp' ? 1 : -1)); }
    else if (scene === 'vez' && e.key === 'Enter') enter();
    else if (e.key === 'Escape') back();
  });
  let rz; addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { size(); render(); }); });

  // ---- start ----
  size();
  setFloor(8);
  // ---- úvod: video průletu (na šířku / na výšku), konec navazuje na snímek věže a kamera se oddálí ----
  // kotva = střed desek balkonů na posledním snímku videa (hotel.py MEASURE), span = výška od 1. do 14. desky v px
  // kotva = střed desek balkonů na posledním snímku videa (hotel.py MEASURE=285), span = výška od 1. do 14. desky v px.
  // 14. 11.: video končí couvnutím na stejnou kameru jako snímek věže (FLY_BACK) → přechod je čistý zoom, bez dvojité věže
  const V = { a: { src: 'video/prulet-a.mp4?v=8', w: 1920, h: 1080, span: 361, ax: 964, ay: 539.5 },
              p: { src: 'video/prulet-p.mp4?v=8', w: 720, h: 1560, span: 293, ax: 363, ay: 779.5 } };
  const VEZ = { span: EDGES[0] - EDGES[FLOORS - 1], ax: TCX, ay: (EDGES[0] + EDGES[FLOORS - 1]) / 2 };
  const vid = $('intro'), vk = sh > sw ? 'p' : 'a';
  function finishIntro() { flying = false; app.classList.remove('intro'); render(); }
  function outro() {
    if (introDone) return; introDone = true;
    $('veil').classList.add('off');
    if (!IMG.vez) { vid.classList.add('off'); app.classList.remove('intro'); return; }
    const v = V[vk], sv = Math.max(sw / v.w, sh / v.h);
    const sx = sw / 2 + (v.ax - v.w / 2) * sv, sy = sh / 2 + (v.ay - v.h / 2) * sv;   // kotva věže ve videu na obrazovce
    const kr = (v.span * sv) / (VEZ.span * s0());                                        // > 1: video ukazuje věž větší než stránka
    const atEnd = vid.ended || (vid.duration && vid.currentTime > vid.duration - 0.2);
    if (!atEnd) { vid.classList.add('off'); finishIntro(); return; }                   // přeskočeno ťuknutím: jen prolnout
    if (kr < 1) {
      // na výšku: snímek stránky je výřez → zvětšit samotné video (stejná kamera = čistý zoom) a pod ním prolnout stránku
      render(); hideUI();
      const c1 = home('vez'), tX = (VEZ.ax - c1[0]) * s0() + sw / 2, tY = (VEZ.ay - c1[1]) * s0() + sh / 2;
      const m = 1 / kr, t0 = performance.now(), D = 1700;
      vid.style.transformOrigin = '0 0'; vid.style.transition = 'opacity .6s ease';
      (function step(now) {
        const p = Math.min(1, (now - t0) / D), e = ease(p), s = Math.exp(Math.log(m) * e);
        const w = m === 1 ? e : (s - 1) / (m - 1);                                        // kotva jede v poměru k měřítku
        vid.style.transform = `translate(${(tX - sx * m) * w}px, ${(tY - sy * m) * w}px) scale(${s})`;
        if (p > .6) vid.classList.add('off');
        if (p < 1) requestAnimationFrame(step); else finishIntro();
      })(t0);
      return;
    }
    const k0 = Math.max(1.0001, kr), sk = s0() * k0;
    const c0 = [VEZ.ax - (sx - sw / 2) / sk, VEZ.ay - (sy - sh / 2) / sk], c1 = home('vez');
    flying = true; hideUI();
    const t0 = performance.now(), D = k0 < 1.15 ? 900 : 2200;
    (function step(now) {
      const p = Math.min(1, (now - t0) / D), e = ease(p), k = Math.exp(Math.log(k0) * (1 - e));
      const w = (1 / k - 1 / k0) / (1 - 1 / k0);
      draw(IMG.vez, [c0[0] + (c1[0] - c0[0]) * w, c0[1] + (c1[1] - c0[1]) * w], k);
      if (p === 0 || now - t0 < 20) { vid.classList.add('off'); }
      if (p < 1) requestAnimationFrame(step); else finishIntro();
    })(t0);
  }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (vid && !reduce) {
    app.classList.add('intro');
    vid.src = V[vk].src;
    vid.addEventListener('ended', outro);
    vid.addEventListener('click', outro);
    vid.addEventListener('playing', () => $('veil').classList.add('off'), { once: true });
    setTimeout(() => { if (vid.paused && !introDone) outro(); }, 6000);   // video se nespustilo (úsporný režim) → rovnou věž
  } else introDone = true;
  load('vez').then(() => {
    if (introDone) { vid && vid.classList.add('off'); app.classList.remove('intro'); render(); $('veil').classList.add('off'); }
    else vid.play().catch(() => outro());
    return Promise.all(names.filter(n => n !== 'vez').map(load));
  })
    .then(() => { app.dataset.ready = '1'; })
    .catch(err => { console.error(err); $('veil').classList.add('off'); });
  // tlačítko Vstoupit čeká, než jsou nahrané všechny snímky letu
  const go = $('go'); go.disabled = true; go.textContent = 'Načítám…';
  const poll = setInterval(() => { if (app.dataset.ready) { clearInterval(poll); go.disabled = false; go.textContent = 'Vstoupit'; } }, 150);
  window.__hotel = { get scene() { return scene; }, enter, back, door, setFloor };
})();
