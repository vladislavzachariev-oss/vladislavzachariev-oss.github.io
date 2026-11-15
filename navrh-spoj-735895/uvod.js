// Minimalistický 3D úvod (K3b, Z 15. 11. 2026 15:02: „něco víc minimalistického, ale 3D“).
// Jeden bílý telefon na světlém pozadí, na displeji se střídají naše weby. Posun: telefon se natočí čelem,
// kamera vjede do displeje, displej ztmavne a plynule přejde v tmavou část „slovo po slovu“.
import * as THREE from 'three';
import { RoomEnvironment } from './addons/RoomEnvironment.js';
import { RoundedBoxGeometry } from './addons/RoundedBoxGeometry.js';

const SITES = ['zahourek', 'plna-naruc', 'zrno-a-zar', 'sedm-smrku', 'black-horse', 'letokruh', 'burger-empire', 'odlesk'];
const stage = document.getElementById('uvod');
const pin = stage.querySelector('.s3d-pin');
const canvas = document.getElementById('gl');
const hero = document.getElementById('hero');
const veil = document.getElementById('veil');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#f1f0ec');
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
const TAN = Math.tan(THREE.MathUtils.degToRad(15));

// telefon: zaoblený bílý kvádr + displej (plátno se zaoblenými rohy a výřezem)
const W = 0.76, H = 1.58, D = 0.085, SW = W - 0.04, SH = H - 0.04;
const phone = new THREE.Group(); scene.add(phone);
const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 8, 0.115),
  new THREE.MeshPhysicalMaterial({ color: '#f7f6f3', roughness: 0.34, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.22 }));
phone.add(body);
const CW = 600, CH = Math.round(CW * SH / SW), BZ = 16, R = 70;
const sc = document.createElement('canvas'); sc.width = CW; sc.height = CH;
const g = sc.getContext('2d');
const tex = new THREE.CanvasTexture(sc);
tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
screen.position.z = D / 2 + 0.0015; phone.add(screen);

// měkký stín pod telefonem (rozmazaná skvrna, žádné stínové mapy)
const blob = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(40,36,30,.32)'); gr.addColorStop(.5, 'rgba(40,36,30,.12)'); gr.addColorStop(1, 'rgba(40,36,30,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; scene.add(m); return m;
})();

const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const imgs = [];
let shown = 0, next = 1, swap = 0, dark = 0, dirty = true;
function draw() {
  g.clearRect(0, 0, CW, CH);
  g.fillStyle = '#0c0c0e'; rr(0, 0, CW, CH, R); g.fill();
  g.save(); rr(BZ, BZ, CW - 2 * BZ, CH - 2 * BZ, R - BZ); g.clip();
  const iw = CW - 2 * BZ, ih = CH - 2 * BZ;
  const put = (im, dy) => { if (!im) return; const s = Math.max(iw / im.width, ih / im.height); g.drawImage(im, BZ + (iw - im.width * s) / 2, BZ + dy, im.width * s, im.height * s); };
  const e = swap * swap * (3 - 2 * swap);
  put(imgs[shown], -e * ih * 0.25);                 // starý web odjede nahoru, nový přijede zdola (jako posun prstem)
  if (swap > 0) put(imgs[next], (1 - e) * ih);
  if (dark > 0) { g.fillStyle = `rgba(8,9,13,${dark})`; g.fillRect(0, 0, CW, CH); }
  g.restore();
  g.fillStyle = '#0c0c0e'; rr(CW / 2 - 70, BZ + 14, 140, 38, 19); g.fill();   // výřez kamery
  tex.needsUpdate = true; dirty = false;
}

const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
let aspect = 1, portrait = false;

function progress() {
  const r = stage.getBoundingClientRect();
  const span = stage.offsetHeight - pin.offsetHeight;
  return Math.min(1, Math.max(0, -r.top / Math.max(1, span)));
}

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(w, h, false);
  aspect = w / innerHeight; portrait = aspect < 0.8;
  camera.aspect = w / h; camera.updateProjectionMatrix();
}

let cur = 0, last = performance.now(), mx = 0, my = 0, tmx = 0, tmy = 0, clock = 0;
if (fine) addEventListener('pointermove', e => { tmx = e.clientX / innerWidth - 0.5; tmy = e.clientY / innerHeight - 0.5; });

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
  const want = reduce ? 0 : progress();
  cur += (want - cur) * (1 - Math.exp(-dt * 8)); if (Math.abs(want - cur) < 1e-4) cur = want;
  mx += (tmx - mx) * (1 - Math.exp(-dt * 4)); my += (tmy - my) * (1 - Math.exp(-dt * 4));
  const p = cur;
  const turn = easeInOut(smooth(0.06, 0.5, p));        // natočení čelem a do středu
  const dive = smooth(0.48, 0.96, p);                   // kamera vjede do displeje
  const live = 1 - turn;                                // klidový pohyb a náklon za myší jen na začátku

  // výchozí poloha: počítač telefon vpravo od nadpisu, telefon na výšku nahoře nad nadpisem
  const z0 = portrait ? 1.58 / (0.42 * 2 * TAN) : 1.58 / (0.74 * 2 * TAN);
  const halfW = z0 * TAN * aspect;
  const sx = portrait ? 0 : Math.min(halfW * 0.5, halfW - 0.75);
  const sy = portrait ? z0 * TAN * 0.4 : 0.02;
  const s0 = portrait ? 0.9 : 1;
  phone.position.set(mix(sx, 0, turn), mix(sy, 0, turn) + live * 0.035 * Math.sin(clock * 0.9), 0);
  phone.rotation.set(mix(0.12, 0, turn) + live * (my * 0.18), mix(-0.62, 0, turn) + live * (0.05 * Math.sin(clock * 0.5) + mx * 0.3), mix(0.07, 0, turn));
  phone.scale.setScalar(mix(s0, 1, turn));
  blob.position.set(phone.position.x, -H / 2 - 0.2, -0.05);
  blob.scale.set(1.25, 0.5, 1); blob.material.opacity = (1 - dive) * (0.75 + 0.25 * Math.sin(clock * 0.9));

  // kamera: ze vzdálenosti z0 až těsně před displej (displej pokryje celé okno)
  const zEnd = D / 2 + Math.min(SW / (2 * TAN * camera.aspect), SH / (2 * TAN)) * 0.9;
  const zMid = 1.58 / (0.8 * 2 * TAN);
  camera.position.set(0, 0, dive > 0 ? mix(mix(z0, zMid, turn), zEnd, easeInOut(dive)) : mix(z0, zMid, turn));
  camera.lookAt(0, 0, 0);
  const vw = canvas.width, vh = canvas.height;
  const dy = Math.max(0, vh - Math.round(innerHeight * renderer.getPixelRatio())) / 2;   // rezerva pod oknem: střed obrazu do viditelné části
  if (dy > 0.5) camera.setViewOffset(vw, vh, 0, dy, vw, vh); else if (camera.view && camera.view.enabled) camera.clearViewOffset();

  // displej: weby se střídají po 2,4 s, při vjezdu ztmavne
  const per = 2.4, ph = (clock % per) / per, k = Math.floor(clock / per) % SITES.length;
  const sw = smooth(0.78, 1, ph);
  if (k !== shown && sw === 0) { shown = k; dirty = true; }
  if (sw !== swap) { swap = sw; next = (shown + 1) % SITES.length; dirty = true; }
  const dk = smooth(0.6, 0.86, p);
  if (dk !== dark) { dark = dk; dirty = true; }
  if (dirty) draw();

  hero.style.opacity = String(1 - smooth(0.02, 0.14, p));
  hero.style.transform = `translateY(${-40 * smooth(0.02, 0.14, p)}px)`;
  veil.style.opacity = String(smooth(0.86, 0.98, p));
  window.wlHeadHero && window.wlHeadHero(p < 0.8);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

addEventListener('resize', resize);
resize();
const load = s => new Promise(r => { const i = new Image(); i.decoding = 'async'; i.onload = () => r(i); i.onerror = () => r(null); i.src = s; });
Promise.all(SITES.map(s => load(`img/${s}-m.webp`))).then(a => { a.forEach((im, i) => imgs[i] = im); dirty = true; });
draw();
requestAnimationFrame(frame);
