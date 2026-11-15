// Minimalistický 3D úvod v2 (K3c, Z 15. 11. 2026: „něco minimalistického a mega krásného, nemusí tam být naše weby“).
// Bílá stránka, velký nadpis a nad ním se vznáší jedna skleněná čočka (lupa, která „hledá“). Láme písmo pod sebou,
// okraje mají jemnou duhu, pod ní stín se světelnou skvrnou. Posun: čočka dojede na „Vás“, zvětší se přes celou
// obrazovku a stránka přejde do tmavé části „Když někdo hledá…“.
// Nadpis se kreslí do plátna podle polohy slov ve skutečném <h1> (to zůstává v HTML, jen průhledné: čtečky, hledání, výběr).
import * as THREE from 'three';
import { RoomEnvironment } from './addons/RoomEnvironment.js';

const stage = document.getElementById('uvod');
const pin = stage.querySelector('.s3d-pin');
const canvas = document.getElementById('gl');
const hero = document.getElementById('hero');
const h1 = hero.querySelector('h1');
const veil = document.getElementById('veil');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
const BG = '#f1f0ec', INK = '#141414';

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;
const FOV = 30, TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2)), CZ = 10;
const camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 100);
camera.position.set(0, 0, CZ);

// papír s nadpisem (neprůhledný, aby ho sklo lámalo)
const tc = document.createElement('canvas'), tx = tc.getContext('2d');
const ttex = new THREE.CanvasTexture(tc);
ttex.colorSpace = THREE.SRGBColorSpace; ttex.minFilter = THREE.LinearFilter; ttex.generateMipmaps = false;
const paper = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ttex, toneMapped: false }));
scene.add(paper);

// stín čočky se světelnou skvrnou uprostřed (sklo světlo soustředí)
const radial = stops => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([o, col]) => g.addColorStop(o, col)); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
  map: radial([[0, 'rgba(30,26,20,.02)'], [0.45, 'rgba(30,26,20,.09)'], [0.7, 'rgba(30,26,20,.26)'], [0.85, 'rgba(30,26,20,.11)'], [1, 'rgba(30,26,20,0)']]),
  transparent: true, depthWrite: false, toneMapped: false }));
const caustic = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
  map: radial([[0, 'rgba(255,248,230,.95)'], [0.25, 'rgba(255,244,220,.45)'], [0.6, 'rgba(255,240,210,.08)'], [1, 'rgba(255,240,210,0)']]),
  transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
shadow.position.z = 0.002; caustic.position.z = 0.004;
scene.add(shadow, caustic);

// čočka: zploštělá koule (dvojvypuklá), čiré sklo s rozkladem světla na okraji
const lens = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 64), new THREE.MeshPhysicalMaterial({
  color: '#ffffff', metalness: 0, roughness: 0.03, transmission: 1, thickness: 1.1, ior: 1.52, dispersion: 2.4,
  specularIntensity: 1, envMapIntensity: 0.9, clearcoat: 1, clearcoatRoughness: 0.04, attenuationColor: '#eef6f4', attenuationDistance: 6 }));
scene.add(lens);

let W = 1, H = 1, K = 1, words = [], vasRect = null, portrait = false, ink = null;
const LZ = 1.2;                                   // výška čočky nad papírem (svět)
const toW = (px, py, z = 0) => [((px - W / 2) * K) * (CZ - z) / CZ, ((H / 2 - py) * K) * (CZ - z) / CZ];

function layoutText() {
  const dpr = Math.min(devicePixelRatio, 2);
  tc.width = Math.round(W * dpr); tc.height = Math.round(H * dpr);
  tx.setTransform(dpr, 0, 0, dpr, 0, 0);
  tx.fillStyle = BG; tx.fillRect(0, 0, W, H);
  const cs = getComputedStyle(h1), base = pin.getBoundingClientRect();
  tx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  tx.fontStretch = 'condensed';
  if ('letterSpacing' in tx) tx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
  tx.fillStyle = INK; tx.textBaseline = 'alphabetic';
  words = []; vasRect = null;
  const walk = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
  for (let n; (n = walk.nextNode());) {
    const re = /[^\s ]+/g; let m;
    while ((m = re.exec(n.data))) {
      const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
      const b = r.getClientRects()[0]; if (!b) continue;
      const met = tx.measureText(m[0]);
      const x = b.left - base.left, y = b.top - base.top + met.fontBoundingBoxAscent;
      tx.fillText(m[0], x, y);
      const w = { t: m[0], x, y: b.top - base.top, w: b.width, h: b.height };
      words.push(w); if (m[0] === 'Vás') vasRect = w;
    }
  }
  ink = null;
  if (vasRect) {
    const x0 = Math.floor(vasRect.x * dpr), y0 = Math.floor(vasRect.y * dpr), w = Math.ceil(vasRect.w * dpr), h = Math.ceil(vasRect.h * dpr);
    const d = tx.getImageData(x0, y0, w, h).data, D = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) D[i] = d[i * 4] < 90 ? 1e6 : 0;          // inkoust = tmavý pixel
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!D[i]) continue;   // vzdálenost od kraje tahu (2 průchody)
      D[i] = Math.min(D[i], x ? D[i - 1] + 1 : 1, y ? D[i - w] + 1 : 1); }
    let best = -1, bi = 0;
    for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (!D[i]) continue;
      D[i] = Math.min(D[i], x < w - 1 ? D[i + 1] + 1 : 1, y < h - 1 ? D[i + w] + 1 : 1); if (D[i] > best) { best = D[i]; bi = i; } }
    if (best > 0) ink = { x: (x0 + bi % w) / dpr, y: (y0 + Math.floor(bi / w)) / dpr, r: best / dpr };
  }
  ttex.needsUpdate = true;
  hero.classList.add('gl');                      // skutečný nadpis zprůhlednit, až je nakreslený
}

function resize() {
  W = canvas.clientWidth; H = canvas.clientHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.75 : 2));
  renderer.setSize(W, H, false);
  camera.aspect = W / H; camera.updateProjectionMatrix();
  K = 2 * CZ * TAN / H;
  paper.scale.set(W * K, H * K, 1);
  portrait = W / innerHeight < 0.8;
  layoutText();
}

const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

function progress() {
  const r = stage.getBoundingClientRect();
  return Math.min(1, Math.max(0, -r.top / Math.max(1, stage.offsetHeight - pin.offsetHeight)));
}

let cur = 0, last = performance.now(), clock = 0, px = 0.5, py = 0.5, tpx = -1, tpy = -1;
if (fine) addEventListener('pointermove', e => { tpx = e.clientX; tpy = e.clientY; });

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
  const want = reduce ? 0 : progress();
  cur += (want - cur) * (1 - Math.exp(-dt * 7)); if (Math.abs(want - cur) < 1e-4) cur = want;
  const p = cur;
  const vh = innerHeight, minS = Math.min(W, vh);
  // klidová poloha: nad nadpisem, pomalu krouží; na počítači jde za myší
  const hb = words.length ? words.reduce((a, w) => ({ l: Math.min(a.l, w.x), t: Math.min(a.t, w.y), r: Math.max(a.r, w.x + w.w), b: Math.max(a.b, w.y + w.h) }), { l: 1e9, t: 1e9, r: -1e9, b: -1e9 }) : { l: W * .1, t: vh * .4, r: W * .6, b: vh * .7 };
  let ix = mix(hb.l, hb.r, portrait ? 0.62 : 0.56) + Math.sin(clock * 0.31) * minS * 0.06;
  let iy = mix(hb.t, hb.b, portrait ? 0.34 : 0.42) + Math.sin(clock * 0.47 + 1) * minS * 0.035;
  if (tpx >= 0) { ix = mix(ix, Math.min(Math.max(tpx, hb.l), hb.r), 0.75); iy = mix(iy, Math.min(Math.max(tpy, hb.t), hb.b), 0.75); }   // za myší, ale jen nad nadpisem
  px += (ix - px) * (1 - Math.exp(-dt * (tpx >= 0 ? 3.2 : 2))); py += (iy - py) * (1 - Math.exp(-dt * (tpx >= 0 ? 3.2 : 2)));
  if (clock < 0.1) { px = ix; py = iy; }
  // posun: 0–0,32 čočka dojede na „Vás“ a zvětší ho; 0,34–0,92 kamera proletí kolem čočky do černého tahu písmene,
  // inkoust zaplní obrazovku a z tmy vyjede další část
  const go = easeInOut(smooth(0.04, 0.32, p)), dive = smooth(0.34, 0.92, p), away = easeInOut(smooth(0.34, 0.6, p));
  const vx = vasRect ? vasRect.x + vasRect.w / 2 : W / 2, vy = vasRect ? vasRect.y + vasRect.h * 0.52 : vh / 2;
  const r0 = minS * (portrait ? 0.2 : 0.17) * (1 + 0.04 * Math.sin(clock * 0.9));
  const rVas = vasRect ? Math.max(r0, vasRect.w * 0.78) : r0;
  const rpx = mix(r0, rVas, go);
  const cx = mix(px, vx, go) + away * rpx * 3.2, cy = mix(py, vy, go) - away * rpx * 1.4;   // čočka uhne doprava nahoru
  const [lx, ly] = toW(cx, cy, LZ);
  const R = rpx * K * (CZ - LZ) / CZ;
  lens.position.set(lx, ly, LZ);
  lens.scale.set(R, R, R * 0.36);
  lens.rotation.set(0.18 * Math.sin(clock * 0.37) * (1 - go), 0.22 * Math.sin(clock * 0.29 + 2) * (1 - go) + away * 0.5, 0);
  // stín dopadá dolů vpravo (světlo zleva shora), skvrna světla uvnitř stínu
  const [sx, sy] = toW(cx + rpx * 0.16, cy + rpx * 0.22, 0);
  shadow.position.x = sx; shadow.position.y = sy; shadow.scale.setScalar(rpx * K * 2.35);
  caustic.position.x = sx + rpx * K * 0.06; caustic.position.y = sy - rpx * K * 0.04; caustic.scale.setScalar(rpx * K * 0.95);
  // kamera: exponenciální přiblížení k bodu v inkoustu, bod se zároveň stáhne do středu
  const e = dive * dive * (3 - 2 * dive);
  const T = ink ? toW(ink.x, ink.y, 0) : toW(vx, vy, 0);
  const strokePx = ink ? ink.r * 2 : 20, zEnd = CZ * Math.min(0.5, strokePx / (Math.hypot(W, vh) * 1.3));
  const zc = CZ * Math.pow(zEnd / CZ, e), c = easeInOut(Math.min(1, e * 1.5));
  camera.position.set(T[0] * c, T[1] * c, zc);
  lens.visible = zc > LZ + 0.15;
  shadow.material.opacity = caustic.material.opacity = 1 - away;

  hero.style.setProperty('--fade', String(1 - smooth(0.02, 0.16, p)));
  veil.style.opacity = String(smooth(0.86, 0.97, p));
  window.wlHeadHero && window.wlHeadHero(p < 0.78);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

addEventListener('resize', () => { clearTimeout(resize.t); resize.t = setTimeout(resize, 120); });
(document.fonts ? document.fonts.load(`800 100px Archivo`, 'Vás zákazníci').then(() => document.fonts.ready) : Promise.resolve())
  .then(() => { resize(); requestAnimationFrame(frame); });
