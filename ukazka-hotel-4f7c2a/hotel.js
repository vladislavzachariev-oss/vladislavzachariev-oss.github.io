/* Hotel Hladina — výběr patra a let dovnitř.
   Všechny snímky mají stejný souřadný prostor 2816×1536. Let = řetěz přiblížení:
   snímek B leží v obdélníku R snímku A; kamera se plynule přiblíží z A do R a B se mezitím rozsvítí. */
(() => {
  const W = 2816, H = 1536;
  const app = document.getElementById('app'), cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  const $ = id => document.getElementById(id);
  const big = Math.min(window.devicePixelRatio || 1, 2) * Math.max(innerWidth, innerHeight) > 1500;

  // hrany pater na snímku věže (změřeno na vez_02.png, 14. 11. 2026), zdola nahoru; patro n = mezi EDGES[n-1] a EDGES[n]
  const EDGES = [1186, 1152, 1105, 1057, 1013, 967, 922, 876, 828, 779, 733, 694, 650, 609, 566, 520, 476, 435, 392, 350, 306, 261, 215];
  const FLOORS = EDGES.length - 1, TX0 = 1236, TX1 = 1592, TCX = 1413;

  const FOCUS = { vez: [TCX, 660], bok: [1210, 780], balkon: [1700, 760], obyvak: [1160, 768], koupelna: [1420, 820], loznice: [1300, 800] };
  const rect = (cx, cy, w, fx, fy) => { const sc = w / W; return { x: cx - fx * sc, y: cy - fy * sc, sc }; };
  // R: kde leží dítě v rodiči (fx,fy = bod dítěte, který sedí na cx,cy rodiče)
  const LINK = {
    bok: f => ({ from: 'vez', ...rect(TCX, floorY(f), 470, 1210, 780) }),
    balkon: () => ({ from: 'bok', ...rect(1210, 780, 1149, 1815, 743) }),
    obyvak: () => ({ from: 'balkon', ...rect(1815, 700, 1200, 1408, 768) }),
    koupelna: () => ({ from: 'obyvak', ...rect(1424, 787, 600, 1408, 768) }),
    loznice: () => ({ from: 'obyvak', ...rect(902, 752, 520, 1408, 768) }),
  };
  const DOORS = { dLoz: [902, 432], dKoup: [1424, 452] };

  const TYPES = [
    [6, 'Pokoj s výhledem na jezero', '32 m², postel 180 cm, koupelna se sprchou a balkon nad promenádou.'],
    [15, 'Apartmá s jednou ložnicí', '62 m², obývák s kuchyní, ložnice a koupelna s vanou u okna. Výhled na západ, na jezero a kopce.'],
    [21, 'Apartmá se dvěma ložnicemi', '96 m², dvě ložnice, dvě koupelny a rohový balkon nad celou hladinou.'],
    [22, 'Střešní apartmá', '140 m², terasa kolem dokola a výhled na všechny strany.'],
  ];
  const type = n => TYPES.find(t => n <= t[0]);
  const ROOMS = {
    obyvak: n => [`Patro ${n}, ${type(n)[1].toLowerCase()}`, 'Obývák se otevírá na balkon nad jezerem. Odtud vedou dveře do ložnice a do koupelny.'],
    koupelna: () => ['Koupelna', 'Travertin, vana u okna a výhled na jezero i z vany.'],
    loznice: () => ['Ložnice', 'Postel 180 cm, dubová stěna a okno přes celou šířku pokoje.'],
  };

  function floorY(n) { return (EDGES[n - 1] + EDGES[n]) / 2; }
  function floorAt(y) { for (let n = 1; n <= FLOORS; n++) if (y <= EDGES[n - 1] && y > EDGES[n]) return n; return 0; }

  // ---- obrázky: předem rozbalené, ať se při letu nic nerozbaluje ----
  const IMG = {};
  const names = Object.keys(FOCUS);
  async function load(n) {
    const im = new Image(); im.src = `img/${n === 'vez' ? 'vez' : n}-${big ? 2400 : 1400}.webp`;
    await im.decode();
    IMG[n] = window.createImageBitmap ? await createImageBitmap(im) : im;
    if (n !== 'vez') SOFT[n] = await soft(im);
  }
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
  let scene = 'vez', floor = 14, hover = 0, flying = false, view = null;
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

  function fly(path, dur, back) { // path = řada dětí (bok, balkon, obyvak); back = pozpátku
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
    if (flying || !IMG[scene]) return;
    view = draw(IMG[scene], home(scene), 1, scene === 'vez' ? towerOverlay : null);
    placeUI();
  }
  function towerOverlay(dx, dy, s) {
    const n = hover || floor, y0 = dy + EDGES[n] * s, y1 = dy + EDGES[n - 1] * s, x0 = dx + TX0 * s, x1 = dx + TX1 * s;
    ctx.save();
    ctx.fillStyle = 'rgba(8,16,32,.22)'; // ostatní patra trochu ztlumit, zvolené rozsvítit
    ctx.fillRect(x0, dy + EDGES[FLOORS] * s, x1 - x0, y0 - (dy + EDGES[FLOORS] * s));
    ctx.fillRect(x0, y1, x1 - x0, dy + EDGES[0] * s - y1);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, 'rgba(255,160,70,.25)'); g.addColorStop(1, 'rgba(255,170,80,.7)');
    ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(255,220,170,.95)'; ctx.fillRect(x0 - 6, y1 - 1, x1 - x0 + 12, 1.5); ctx.fillRect(x0 - 6, y0, x1 - x0 + 12, 1);
    ctx.restore();
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
      const n = hover || floor, [x, y] = toScreen(TX1 + 40, floorY(n));
      tag.hidden = false; tag.style.left = x + 'px'; tag.style.top = y + 'px'; $('tagN').textContent = n;
    } else tag.hidden = true;
    for (const id in DOORS) {
      const b = $(id), on = scene === 'obyvak' && !flying;
      if (!on) { b.hidden = true; continue; }
      const [x, y] = toScreen(...DOORS[id]), m = b.offsetWidth / 2 + 10 || 56;
      b.hidden = x < -20 || x > sw + 20 || y < 60 || y > sh - 40; // dveře mimo záběr = bez štítku
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
    hover = 0; await fly(['bok', 'balkon', 'obyvak'], 3600); setScene('obyvak');
  }
  async function back() {
    if (flying) return;
    if (scene === 'obyvak') { await fly(['bok', 'balkon', 'obyvak'], 2600, true); setScene('vez'); }
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
  setFloor(14);
  load('vez').then(() => { render(); $('veil').classList.add('off'); return Promise.all(names.filter(n => n !== 'vez').map(load)); })
    .then(() => { app.dataset.ready = '1'; })
    .catch(err => { console.error(err); $('veil').classList.add('off'); });
  // tlačítko Vstoupit čeká, než jsou nahrané všechny snímky letu
  const go = $('go'); go.disabled = true; go.textContent = 'Načítám…';
  const poll = setInterval(() => { if (app.dataset.ready) { clearInterval(poll); go.disabled = false; go.textContent = 'Vstoupit'; } }, 150);
  window.__hotel = { get scene() { return scene; }, enter, back, door, setFloor };
})();
