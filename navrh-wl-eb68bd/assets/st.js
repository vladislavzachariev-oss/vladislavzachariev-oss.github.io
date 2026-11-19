/* Whyte Lynx — 3D úvod (J 2026-11-15). Skutečný notebook a telefon (Blendkit, Demycs, royalty free) ve světlém studiu.
   Po načtení se notebook sám otevře; posun stránky vede kameru: displej zblízka (Sedm smrků ráno → poledne → večer),
   další naše weby, pak se vedle postaví telefon s tlačítkem Zavolat, nakonec celek a cena.
   Jedna smyčka requestAnimationFrame běží jen, když se něco hýbe; čas dohání posun kriticky tlumenou pružinou. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const st = document.getElementById('st'), pin = st.querySelector('.st-pin'), canvas = st.querySelector('canvas');
const q = new URLSearchParams(location.search);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: (devicePixelRatio || 1) < 2, alpha: true, powerPreference: 'high-performance' }); }
catch (e) { st.classList.add('nogl'); throw e; }
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = +(q.get('ex') || 1.0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);

/* ---------- studio: bílá místnost se třemi softboxy → odrazy na hliníku a skle ---------- */
const scene = new THREE.Scene();
function studio() {
  const s = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 12), new THREE.MeshBasicMaterial({ color: 0x9a9894, side: THREE.BackSide }));
  room.position.y = 3; s.add(room);
  const box = (w, h, x, y, z, k, rx = 0, ry = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); s.add(m);
  };
  box(6, 3, 0, 6.5, 0, +(q.get('top') || 3.2), Math.PI / 2);          // strop
  box(2.2, 5, -5.5, 2.5, 1, +(q.get('side') || 2.4), 0, Math.PI / 2);  // levý softbox (hlavní)
  box(1.4, 5, 5.5, 2.5, -1, 1.1, 0, -Math.PI / 2);                     // pravý, slabší
  box(8, 0.5, 0, 1.6, -5.8, 1.6);                                       // pruh vzadu → linka na víku
  box(8, 0.6, 0, 1.2, 5.8, 1.3, 0, Math.PI);                            // pruh vpředu → linka na displeji
  return s;
}
const pm = new THREE.PMREMGenerator(renderer);
const ENV = pm.fromScene(studio(), 0.02).texture;
scene.environment = ENV;

/* kontaktní stín: měkký ovál pod notebookem a pod telefonem */
function shadowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.45, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); return t;
}
const SH = shadowTex();
function shadow(w, d, o) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: SH, transparent: true, opacity: o, depthWrite: false, color: 0x2a2620 }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.0005; m.renderOrder = -1; return m;
}

/* ---------- displeje: každý snímek našeho webu = vlastní textura nahraná předem do grafiky; prolínání = druhá vrstva
   displeje s průhledností. (Dřív kreslení do plátna: první drawImage každého obrázku ho dekódoval v hlavním vlákně
   → zástavy 70–570 ms při každém přechodu, měřeno 15. 11. při 4× pomalejším procesoru.) ---------- */
const TL = new THREE.TextureLoader();
const TX = {};
function tex(src, flip = true) {
  if (TX[src]) return TX[src];
  const t = TL.load(src, () => { dirty = true; tick(); });
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.flipY = flip;
  return (TX[src] = t);
}
const LAP = [ // [od t, obrázek] — prolínání 0,035 kolem hranice
  [0.00, 'img/prace/sedm-smrku-0.webp'], [0.14, 'img/prace/sedm-smrku-1.webp'], [0.22, 'img/prace/sedm-smrku-2.webp'],
  [0.33, 'img/prace/plna-naruc-0.webp'], [0.41, 'img/prace/zrno-a-zar-0.webp'], [0.49, 'img/prace/krater-0.webp'],
  [0.57, 'img/prace/black-horse-0.webp'], [0.66, 'img/prace/odlesk-0.webp'],
];
const PHO = [[0, 'img/prace/burger-empire-m.webp'], [0.86, 'img/prace/plna-naruc-m.webp']];
LAP.forEach(x => tex(x[1])); PHO.forEach(x => tex(x[1], false));   // UV telefonu jsou vzhůru nohama → bez flipY
/* S = { base: materiál displeje, over: překryvná vrstva } */
function paint(S, list, t, on) {
  if (!S) return;
  let i = 0; while (i + 1 < list.length && t >= list[i + 1][0] - 0.0175) i++;
  const next = list[i + 1], a = next ? smooth(next[0] - 0.0175, next[0] + 0.0175, t) : 0;
  const A = TX[list[i][1]], B = next && TX[next[1]];
  if (S.base.emissiveMap !== A) S.base.emissiveMap = A;
  S.base.emissiveIntensity = on;
  S.over.visible = a > 0.001 && !!B;
  if (S.over.visible) { if (S.over.material.map !== B) S.over.material.map = B; S.over.material.opacity = a * on; }
}
function overlay(mesh) {   // kopie displeje těsně před ním, průhledná
  const m = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ map: null, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.renderOrder = 2; m.visible = false; mesh.add(m); return m;
}

/* ---------- modely ---------- */
const loader = new GLTFLoader(), draco = new DRACOLoader();
draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/gltf/');
loader.setDRACOLoader(draco);
const load = u => new Promise((ok, no) => loader.load(u, ok, undefined, no));
const bar = st.querySelector('.st-load');
let lid = null, lidOpen = 0, phone = null, phoneShadow = null;
const laptop = new THREE.Group(), phoneG = new THREE.Group();
scene.add(laptop, phoneG);

/* UV displeje → 0..1 (v modelu je výřez z atlasu) */
function fitUV(geo) {
  const uv = geo.attributes.uv; let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
  for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  for (let i = 0; i < uv.count; i++) uv.setXY(i, 1 - (uv.getX(i) - u0) / (u1 - u0), (uv.getY(i) - v0) / (v1 - v0));   // v modelu zrcadlově → otočit u
  uv.needsUpdate = true;
}
function screenMat(map) {
  return new THREE.MeshPhysicalMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 1, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 0.35 });
}
let LS = null, PSx = null;

async function build() {
  const [L, P] = await Promise.all([load('3d/laptop.glb'), load('3d/phone.glb')]);
  bar.style.setProperty('--load', 1);
  L.scene.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material;
    if (/screen/i.test(m.name)) { fitUV(o.geometry); o.material = screenMat(TX[LAP[0][1]]); LS = { base: o.material, over: overlay(o) }; LS.over.material.map = TX[LAP[1][1]]; }
    else { m.envMapIntensity = 1.15; m.roughness = 1; m.metalness = 1; }   // hodnoty nesou mapy kovovosti a drsnosti
  });
  lid = L.scene.getObjectByName('laptop14_screen001') || L.scene.getObjectByName('laptop14_screen.001');
  if (lid) { lid.userData.r0 = lid.rotation.x; }
  laptop.add(L.scene, shadow(0.46, 0.36, 0.55));

  P.scene.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material;
    if (/screen/i.test(m.name)) { o.material = screenMat(TX[PHO[0][1]]); PSx = { base: o.material, over: overlay(o) }; PSx.over.material.map = TX[PHO[1][1]]; }
    else if (/glass/i.test(m.name)) { m.transmission = 0; m.transparent = true; m.opacity = 0.12; m.roughness = 0.03; m.metalness = 0; m.depthWrite = false; m.envMapIntensity = 1.4; m.forceSinglePass = true; }   // bez transmission: ta kreslí scénu 2× (zástava 430 ms při objevení)
    else m.envMapIntensity = 1.2;
  });
  phone = new THREE.Group(); phone.add(P.scene); phone.rotation.x = Math.PI / 2;   // stojí, displej k nám
  phone.position.y = 0.0795;
  phoneG.add(phone);
  phoneShadow = shadow(0.16, 0.06, 0.5); phoneG.add(phoneShadow);
  phoneG.position.set(0.215, 0, 0.075); phoneG.rotation.y = -0.38;
  /* průhledné oboustranné materiály kreslit jedním průchodem (jinak přepočet programu v každém snímku — poučení z Porsche) */
  scene.traverse(o => { if (o.material) for (const m of [].concat(o.material)) if (m.transparent && m.side === THREE.DoubleSide) m.forceSinglePass = true; });
  /* textury do grafiky předem (jinak se nahrávají při prvním zobrazení = zástava za jízdy) */
  await Promise.all(Object.values(TX).map(t => t.image ? 0 : new Promise(ok => { const c = setInterval(() => { if (t.image) { clearInterval(c); ok(); } }, 50); })));
  for (const t of Object.values(TX)) renderer.initTexture(t);
  scene.traverse(o => { if (o.material) for (const m of [].concat(o.material)) for (const k in m) if (m[k] && m[k].isTexture) renderer.initTexture(m[k]); });
  LS.over.visible = PSx.over.visible = phone.visible = true;
  await renderer.compileAsync(scene, cam);
  LS.over.visible = PSx.over.visible = false;
}

/* ---------- kamera: klíče (t, azimut°, výška°, vzdálenost, cíl x y z, posun obrazu x) ---------- */
const cam = new THREE.PerspectiveCamera(26, 1, 0.01, 20);
const K = [
  { t: 0.00, az: 34, el: 21, d: 1.02, tx: -0.015, ty: 0.085, tz: 0.0, sx: -0.42, sy: 0.03, py: 0.42, m: 1, ptx: 0, pm: 1 },
  { t: 0.16, az: 14, el: 10, d: 0.78, tx: 0.0, ty: 0.112, tz: -0.04, sx: -0.36, sy: -0.03, py: 0.15, m: 1.45, ptx: 0, pm: 1 },
  { t: 0.30, az: 4, el: 6, d: 0.62, tx: 0.0, ty: 0.118, tz: -0.06, sx: -0.36, sy: -0.07, py: 0.20, m: 1.55, ptx: 0, pm: 1 },
  { t: 0.62, az: -3, el: 6, d: 0.6, tx: 0.0, ty: 0.118, tz: -0.06, sx: -0.36, sy: -0.07, py: 0.20, m: 1.55, ptx: 0, pm: 1 },
  { t: 0.80, az: -26, el: 9, d: 0.66, tx: 0.12, ty: 0.095, tz: 0.02, sx: -0.5, sy: -0.02, py: 0.10, m: 1.6, ptx: 0.08, pm: 0.62 },
  { t: 1.00, az: 24, el: 24, d: 1.08, tx: 0.05, ty: 0.07, tz: 0.0, sx: -0.38, sy: 0.04, py: 0.22, m: 1.08, ptx: 0, pm: 1 },
];
function pose(t) {
  let i = 0; while (i + 2 < K.length && t > K[i + 1].t) i++;
  const a = K[i], b = K[i + 1], k = smooth(a.t, b.t, t), r = {};
  for (const n of ['az', 'el', 'd', 'tx', 'ty', 'tz', 'sx', 'sy', 'py', 'm', 'ptx', 'pm']) r[n] = lerp(a[n], b[n], k);
  return r;
}

let Wc = 0, Hc = 0, dpr = 1, portrait = false, dirty = true;
let dprK = 1, slowN = 0, fastN = 0;
function perf(ms) {
  if (ms > 21) { slowN++; fastN = 0; } else if (ms < 13) { fastN++; slowN = 0; } else slowN = Math.max(0, slowN - 1);
  if (slowN > 20 && dprK > 0.6) { dprK -= 0.15; slowN = 0; dirty = true; }
  else if (fastN > 120 && dprK < 1) { dprK = Math.min(1, dprK + 0.1); fastN = 0; dirty = true; }
}
function size() {
  const w = pin.clientWidth, h = pin.clientHeight;
  const d = Math.max(0.75, Math.min(devicePixelRatio || 1, 2) * dprK);
  if (w === Wc && h === Hc && d === dpr) return false;
  Wc = w; Hc = h; dpr = d; portrait = w / h < 0.9;
  renderer.setPixelRatio(d); renderer.setSize(w, h, false);
  return true;
}

let intro = q.has('intro') ? +q.get('intro') : q.has('t') ? 1 : 0, introT0 = 0;   // ?intro=0.4 = zastavený mezistav pro kontrolu
function frame(t) {
  const p = pose(t), asp = Wc / Hc;
  /* na výšku: notebook se musí vejít na šířku → kamera dál, obraz níž (nahoře je text) */
  const ref = 1.6, tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  const fit = Math.max(1, (Math.atan(tanV * ref) / Math.atan(tanV * asp)) * 0.9);
  if (portrait) p.tx += p.ptx;
  const d = p.d * (portrait ? fit * p.pm : p.m * Math.max(1, 2.1 / asp));   // na šířku vedle textu → dál; úzké okno ještě dál
  const az = THREE.MathUtils.degToRad(p.az), el = THREE.MathUtils.degToRad(p.el);
  cam.aspect = asp;
  cam.position.set(p.tx + Math.sin(az) * Math.cos(el) * d, p.ty + Math.sin(el) * d, p.tz + Math.cos(az) * Math.cos(el) * d);
  cam.lookAt(p.tx, p.ty, p.tz);
  cam.updateProjectionMatrix();
  const sx = portrait ? 0 : p.sx, sy = portrait ? p.py : p.sy;
  cam.projectionMatrix.elements[8] = sx; cam.projectionMatrix.elements[9] = sy;
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();

  /* víko: po načtení se otevře (intro), pak zůstane otevřené */
  const ie = intro >= 1 ? 1 : 1 - Math.pow(1 - intro, 3);
  if (lid) lid.rotation.x = lid.userData.r0 + THREE.MathUtils.degToRad(lerp(94, 0, ie));
  const on = smooth(0.55, 1, intro);
  paint(LS, LAP, t, on);
  /* telefon: vyjede zespodu a postaví se vedle */
  const ph = smooth(0.64, 0.78, t);
  phone.position.y = lerp(-0.12, 0.0795, ph); phone.visible = ph > 0.001;
  phoneShadow.material.opacity = 0.5 * ph;
  phoneG.rotation.y = lerp(-0.9, -0.38, ph);
  paint(PSx, PHO, t, 1);
  renderer.render(scene, cam);
}

/* ---------- posun → čas ---------- */
const caps = [...st.querySelectorAll('[data-in]')].map(el => ({ el, a: +el.dataset.in, b: +el.dataset.out }));
const heroEl = st.querySelector('.st-hero');
function timeAt() {
  const r = st.getBoundingClientRect(), run = st.offsetHeight - pin.clientHeight;
  return clamp(-r.top / Math.max(1, run));
}
function captions(t) {
  for (const c of caps) {
    const o = Math.min(smooth(c.a, c.a + 0.035, t), 1 - smooth(c.b - 0.035, c.b, t));
    const v = o.toFixed(3);
    if (c.el.dataset.o !== v) { c.el.dataset.o = v; c.el.style.opacity = v; c.el.style.transform = `translate3d(0,${((1 - o) * (t < c.a + 0.035 ? 18 : -18)).toFixed(1)}px,0)`; c.el.style.visibility = o > 0.005 ? 'visible' : 'hidden'; }
  }
  const h = 1 - smooth(0.02, 0.1, t), hv = h.toFixed(3);
  if (heroEl.dataset.o !== hv) { heroEl.dataset.o = hv; heroEl.style.opacity = hv; heroEl.style.transform = `translate3d(0,${((1 - h) * -40).toFixed(1)}px,0)`; heroEl.style.visibility = h > 0.005 ? 'visible' : 'hidden'; }
}

const fix = q.has('t') ? +q.get('t') : null;
let t = fix ?? timeAt(), v = 0, last = 0, raf = 0, drawn = -1, ready = false;
function tick() { if (!raf) raf = requestAnimationFrame(step); }
function step(now) {
  raf = 0; let moving = false;
  const want = fix ?? timeAt();
  const dt = Math.min(64, last ? now - last : 16.7); last = now;
  const OM = 10, N = 1000;
  let F = t * N, W = want * N;
  if (Math.abs(want - t) > 0.25) { F = W; v = 0; }
  else for (let left = dt / 1000; left > 1e-6; left -= 0.008) { const h = Math.min(0.008, left); v += (OM * OM * (W - F) - 2 * OM * v) * h; F += v * h; }
  if (Math.abs(W - F) < 0.004 && Math.abs(v) < 0.05) { F = W; v = 0; }
  t = F / N; if (v || t !== want) moving = true;
  if (ready && intro < 1 && !q.has('intro')) { if (!introT0) introT0 = now; intro = clamp((now - introT0) / 1700); moving = true; dirty = true; }
  if (moving && dt < 64 && last) perf(dt);
  const r = st.getBoundingClientRect(), vis = r.bottom > -50 && r.top < innerHeight + 50;
  if (ready && vis) {
    if (size()) dirty = true;
    if (dirty || Math.abs(t - drawn) > 1e-6) { frame(t); drawn = t; dirty = false; }
  }
  captions(t);
  if (moving) tick(); else last = 0;
}
addEventListener('scroll', tick, { passive: true });
addEventListener('resize', () => { dirty = true; tick(); });

window.__P = { stages: [{ n: 1000, el: st, get shownF() { return drawn * 999; }, get shown() { return drawn * 999; } }], tick, frame, renderer, scene, get t() { return t; } };

build().then(() => {
  ready = true; st.classList.add('ready');
  if (matchMedia('(min-width:100000px)').matches) intro = 1;
  dirty = true; tick();
}).catch(e => { console.error(e); st.classList.add('nogl'); });
tick();
