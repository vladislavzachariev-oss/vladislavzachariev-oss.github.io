// Whyte Lynx · nový web (J 2026-11-23). Úvod: živý telefon ve WebGL, při posunu se otáčí a ukazuje naše ukázky;
// za ním projíždějí obří slova oborů, na konci zamčený displej s rezervacemi („Máte zavřeno. Web ne.“).
import * as THREE from './vendor/three.module.min.js';

const lenis = window.Lenis ? new window.Lenis({ lerp: .085, smoothWheel: true }) : null;
window.__lenis = lenis;
const sy = () => (lenis ? lenis.scroll : window.scrollY);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const Q = new URLSearchParams(location.search);
const TI = Q.has('ti') ? +Q.get('ti') : -1;      // ?ti=X zastaví příchod (kontrola snímkem)
const NW = Q.has('nw');                           // ?nw = bez slov a bez přepnutí na fotku (výroba záložní fotky)

const hero = document.querySelector('.hero');
const canvas = document.getElementById('gl');
const copy = document.querySelector('.hero-copy');
const endBox = document.querySelector('.hero-end');
const demo = document.querySelector('.h-demo'), demoT = document.querySelector('.h-demo-t');
const scrollHint = document.querySelector('.h-scroll');
const INK = '#161616';

const SCREENS = [
  { src: 'img/s-kopr.webp', name: 'Bistro Kopr · restaurace', tint: [.97, .74, .28] },
  { src: 'img/s-poupe.webp', name: 'Květinářství Poupě', tint: [.2, .3, .78] },
  { src: 'img/s-smrky.webp', name: 'Sedm smrků · chata na horách', tint: [.36, .42, .38] },
  { src: 'img/s-zrno.webp', name: 'Zrno a žár · pražírna kávy', tint: [.86, .62, .42] },
  { src: null, name: '', tint: [.85, .56, .17] }   // zamčený displej se zprávami, kreslí se tady
];
const WORDS = ['BISTRO', 'KVĚTINY', 'CHATA', 'KÁVA'];

/* ---------- tvar telefonu ---------- */
function rrShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
// skutečný iPhone 17 Pro: 71,9 × 150 × 8,75 mm → 1 : 2,086 : 0,122
const PW = 1, PH = 2.086, PD = .122, BEV = .03, PR = .16;
const W0 = PW - 2 * BEV, H0 = PH - 2 * BEV, R0 = PR - BEV, D0 = PD - 2 * BEV;

/* ---------- pás slov ---------- */
function wordStrip() {
  const fs = 420, gap = fs * 1.2, pad = 40;
  const c = document.createElement('canvas'), x = c.getContext('2d');
  const setF = () => { x.font = `200 ${fs}px Archivo`; x.fontStretch = 'expanded'; };
  setF();
  const ws = WORDS.map(w => x.measureText(w));
  const asc = Math.max(...ws.map(m => m.actualBoundingBoxAscent)), desc = Math.max(...ws.map(m => m.actualBoundingBoxDescent));
  let tot = pad, pos = [];
  ws.forEach((m, i) => { pos.push(tot + m.actualBoundingBoxLeft); tot += m.actualBoundingBoxLeft + m.actualBoundingBoxRight + (i < ws.length - 1 ? gap : 0); });
  tot += pad;
  const scale = Math.min(1, 16000 / tot);
  c.width = Math.ceil(tot * scale); c.height = Math.ceil((asc + desc + pad * 2) * scale);
  x.scale(scale, scale); setF();
  x.fillStyle = INK;
  WORDS.forEach((w, i) => x.fillText(w, pos[i], pad + asc));
  const centers = ws.map((m, i) => (pos[i] - m.actualBoundingBoxLeft + (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) / 2) / tot);
  const maxFrac = Math.max(...ws.map(m => (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) / tot));
  return { c, centers, maxFrac, capFrac: (asc + desc) / (asc + desc + pad * 2) };
}

const LYNX = new Path2D('M12 56C7.5 44 7.6 34 11 26L13.5 6 25 19.5c4.6-1.6 9.4-1.6 14 0L50.5 6 53 26c3.4 8 3.5 18-1 30l-8.5-5.5L32 58l-11.5-7.5z');
const LYNX_EYE = new Path2D('M19 34c3-3 7.5-3 10 0-2.8 2.4-7.2 2.4-10 0zM35 34c2.5-3 7-3 10 0-2.8 2.4-7.2 2.4-10 0z');

/* ---------- zamčený displej: hodiny a zprávy z webu ---------- */
function lockScreen(n) {
  const c = document.createElement('canvas'); c.width = 780; c.height = 1688;
  const x = c.getContext('2d');
  // tapeta: noc, teplé světlo okna zespodu (jantar z očí rysa)
  let g = x.createLinearGradient(0, 0, 0, 1688);
  g.addColorStop(0, '#15161b'); g.addColorStop(.55, '#1d1b1c'); g.addColorStop(1, '#2a1d12');
  x.fillStyle = g; x.fillRect(0, 0, 780, 1688);
  g = x.createRadialGradient(390, 1800, 80, 390, 1800, 1300);
  g.addColorStop(0, 'rgba(217,144,42,.75)'); g.addColorStop(.45, 'rgba(217,144,42,.22)'); g.addColorStop(1, 'rgba(217,144,42,0)');
  x.fillStyle = g; x.fillRect(0, 0, 780, 1688);
  g = x.createRadialGradient(140, 120, 10, 140, 120, 700);
  g.addColorStop(0, 'rgba(120,130,160,.22)'); g.addColorStop(1, 'rgba(120,130,160,0)');
  x.fillStyle = g; x.fillRect(0, 0, 780, 1688);
  x.fillStyle = '#fff'; x.textAlign = 'center';
  x.font = '500 30px Archivo'; x.fillText('Pátek 20. listopadu', 390, 250);
  x.font = '200 196px Archivo'; x.fontStretch = 'expanded'; x.fillText('21:57', 390, 438); x.fontStretch = 'normal';
  const notes = [
    ['REZERVACE', 'Bistro Kopr', 'teď', 'Stůl pro 4 v pátek v 19:00', 'Přijde Jana s rodinou, chtějí místo u okna.'],
    ['OBJEDNÁVKA', 'Květinářství Poupě', 'před 12 min', 'Kytice z poupat, 690 Kč', 'Vyzvednutí v sobotu v 9:00.'],
    ['POPTÁVKA', 'Sedm smrků', 'před 40 min', 'Chata na 3 noci od 27. 12.', 'Čtyři dospělí a pes.']
  ];
  x.textAlign = 'left';
  const rr = (X, Y, w, h, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); };
  for (let i = 0; i < n; i++) {
    const [k, who, when, t1, t2] = notes[i], Y = 1030 + i * 196;
    rr(36, Y, 708, 178, 44); x.fillStyle = 'rgba(250,247,242,.86)'; x.fill();
    rr(64, Y + 30, 64, 64, 16); x.fillStyle = '#161616'; x.fill();
    x.save(); x.translate(96 - 22, Y + 62 - 22); x.scale(44 / 64, 44 / 64); x.fillStyle = '#efece6'; x.fill(LYNX); x.fillStyle = '#d9902a'; x.fill(LYNX_EYE); x.restore();
    x.font = '500 22px Archivo'; x.fillStyle = 'rgba(22,22,22,.55)'; x.fillText(k + ' · ' + who.toUpperCase(), 150, Y + 52);
    x.textAlign = 'right'; x.fillText(when, 712, Y + 52); x.textAlign = 'left';
    x.font = '600 31px Archivo'; x.fillStyle = '#161616'; x.fillText(t1, 150, Y + 98);
    x.font = '400 26px Archivo'; x.fillStyle = 'rgba(22,22,22,.72)'; x.fillText(t2, 150, Y + 140);
  }
  rr(260, 1640, 260, 10, 5); x.fillStyle = 'rgba(255,255,255,.9)'; x.fill();
  return c;
}

/* ---------- zadní strana: matné sklo s rysem ---------- */
function backTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 1068;
  const x = c.getContext('2d');
  x.fillStyle = '#232221'; x.fillRect(0, 0, 512, 1068);
  const p = new Path2D('M12 56C7.5 44 7.6 34 11 26L13.5 6 25 19.5c4.6-1.6 9.4-1.6 14 0L50.5 6 53 26c3.4 8 3.5 18-1 30l-8.5-5.5L32 58l-11.5-7.5z');
  const e = new Path2D('M19 34c3-3 7.5-3 10 0-2.8 2.4-7.2 2.4-10 0zM35 34c2.5-3 7-3 10 0-2.8 2.4-7.2 2.4-10 0z');
  x.save(); x.translate(256 - 64, 534 - 64); x.scale(2, 2);
  x.fillStyle = '#2f2e2c'; x.fill(p); x.fillStyle = '#d9902a'; x.fill(e); x.restore();
  return c;
}

/* ---------- pozadí: teplé světlo za kurzorem, stín telefonu, nádech barvy ukázky ---------- */
const BG_FS = `
uniform vec2 uL; uniform float uA; uniform vec2 uC; uniform vec2 uS; uniform vec3 uTint; uniform float uTk;
varying vec2 vUv;
void main(){
  vec2 p = vUv; p.x *= uA;
  vec2 l = uL; l.x *= uA;
  vec3 base = vec3(.937,.929,.91);
  vec3 col = mix(vec3(.975,.968,.952), base, smoothstep(.0,.8,distance(p, l)));
  col = mix(col, vec3(.89,.882,.862), smoothstep(.6,1.4,distance(vUv, vec2(.5,.5))*1.4));
  col = mix(col, uTint, uTk * (1. - smoothstep(.0, .9, distance(vUv, vec2(.5,.45)))));
  vec2 c = uC; c.x *= uA;
  vec2 q = (p - c) / uS;
  col *= 1. - .16 * exp(-dot(q,q) * 1.6);
  gl_FragColor = vec4(col,1.0);
}`;
const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

/* ---------- displej: zaoblené sklo, výřez, odlesk ---------- */
const SCR_FS = `
uniform sampler2D tA; uniform vec2 uSz; uniform float uR; uniform float uIn; uniform float uGl; uniform float uDim;
varying vec2 vUv;
float sdRR(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q,0.)) + min(max(q.x,q.y),0.) - r; }
void main(){
  vec2 p = (vUv - .5) * uSz;
  float dO = sdRR(p, uSz * .5, uR);
  if (dO > 0.) discard;
  vec2 si = uSz * .5 - uIn;
  float dI = sdRR(p, si, uR - uIn);
  vec2 su = p / (si * 2.) + .5;
  // horní lišta jako u iOS: web začíná pod ní, lišta má barvu horního okraje webu
  const float SB = .058;
  vec2 tu = vec2(su.x, min(su.y / (1. - SB), .997));
  vec3 scr = texture2D(tA, tu).rgb * uDim;
  float dIs = sdRR(p - vec2(0., si.y - .062), vec2(.132, .036), .036);
  scr = mix(vec3(.0), scr, smoothstep(-.002, .002, dIs));
  vec3 col = mix(scr, vec3(.008), smoothstep(-.0015, .0015, dI));
  float b = (p.x * .82 + p.y * .5) - uGl;
  col += vec3(1.) * (exp(-b*b*7.) * .055 + exp(-b*b*90.) * .03);
  gl_FragColor = vec4(col, 1.);
  #include <colorspace_fragment>
}`;

async function init() {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { return fallback(); }
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(26, 1, .1, 100);
  cam.position.set(0, 0, 13);

  // prostředí pro odlesky kovu: tmavá místnost se světlými pruhy (softboxy)
  const pm = new THREE.PMREMGenerator(renderer);
  const es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.SphereGeometry(30, 24, 12), new THREE.MeshBasicMaterial({ color: 0x24221f, side: THREE.BackSide })));
  const panel = (w, h, x, y, z, col, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
  panel(3, 18, -12, 2, 7, '#ffffff', 5); panel(2.2, 16, 13, 1, 5, '#fff3e2', 3.6); panel(18, 3, 0, 14, 3, '#ffffff', 2.6);
  panel(22, 9, 0, -2, -16, '#efe9e0', 1.2); panel(1.4, 14, 5, 0, 14, '#ffffff', 3);
  const env = pm.fromScene(es, .02).texture;
  scene.environment = env;

  const bgU = { uL: { value: new THREE.Vector2(.3, .7) }, uA: { value: 1 }, uC: { value: new THREE.Vector2(.7, .45) }, uS: { value: new THREE.Vector2(.1, .3) }, uTint: { value: new THREE.Vector3(...SCREENS[0].tint) }, uTk: { value: 0 } };
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ uniforms: bgU, vertexShader: VS, fragmentShader: BG_FS, depthWrite: false }));
  bg.position.z = -9; scene.add(bg);

  await document.fonts.load('200 100px Archivo').catch(() => {});
  await document.fonts.load('600 30px Archivo').catch(() => {});
  const strip = wordStrip();
  const wtex = new THREE.CanvasTexture(strip.c);
  wtex.colorSpace = THREE.SRGBColorSpace; wtex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const words = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: wtex, transparent: true, toneMapped: false, depthWrite: false }));
  words.position.z = -3; scene.add(words);
  const stripA = strip.c.width / strip.c.height;

  /* textury displeje */
  const loader = new THREE.TextureLoader();
  const prep = t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; };
  const texs = [];
  texs[0] = prep(await loader.loadAsync(SCREENS[0].src).catch(() => new THREE.Texture()));
  for (let i = 1; i < 4; i++) { texs[i] = null; loader.load(SCREENS[i].src, t => { texs[i] = prep(t); }); }
  let lockN = -1;
  const lockTex = prep(new THREE.CanvasTexture(lockScreen(0)));
  texs[4] = lockTex;
  function setLock(n) {
    if (n === lockN) return; lockN = n;
    lockTex.image = lockScreen(n); lockTex.needsUpdate = true;
  }

  /* telefon */
  const metal = new THREE.MeshPhysicalMaterial({ color: 0x3a3836, metalness: 1, roughness: .3, envMapIntensity: 1.25, clearcoat: .4, clearcoatRoughness: .2 });
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(rrShape(W0, H0, R0), { depth: D0, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 8, curveSegments: 28 }), metal);
  body.geometry.translate(0, 0, -D0 / 2);
  const scrU = { tA: { value: texs[0] }, uSz: { value: new THREE.Vector2(W0, H0) }, uR: { value: R0 }, uIn: { value: .034 }, uGl: { value: 0 }, uDim: { value: 1 } };
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(W0, H0), new THREE.ShaderMaterial({ uniforms: scrU, vertexShader: VS, fragmentShader: SCR_FS }));
  screen.position.z = D0 / 2 + BEV + .0015;
  const btex = new THREE.CanvasTexture(backTexture()); btex.colorSpace = THREE.SRGBColorSpace;
  const backMat = new THREE.MeshPhysicalMaterial({ map: btex, roughness: .55, metalness: 0, clearcoat: .6, clearcoatRoughness: .5, envMapIntensity: .9 });
  const back = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(W0 - .002, H0 - .002, R0), 12), backMat);
  { const uv = back.geometry.attributes.uv, ps = back.geometry.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, ps.getX(i) / W0 + .5, ps.getY(i) / H0 + .5); }
  back.rotation.y = Math.PI; back.position.z = -(D0 / 2 + BEV + .0015);
  // fotoaparát: ostrůvek a tři čočky
  const cam3 = new THREE.Group();
  const isl = new THREE.Mesh(new THREE.ExtrudeGeometry(rrShape(.4, .4, .1), { depth: .012, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 4, curveSegments: 16 }), new THREE.MeshPhysicalMaterial({ color: 0x2a2928, metalness: .2, roughness: .25, clearcoat: 1, envMapIntensity: 1 }));
  cam3.add(isl);
  const lensG = new THREE.CylinderGeometry(.068, .068, .03, 40);
  const ringM = new THREE.MeshPhysicalMaterial({ color: 0x55524e, metalness: 1, roughness: .25 });
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x050608, metalness: 0, roughness: .05, clearcoat: 1, envMapIntensity: 1.6 });
  [[-.085, .085], [-.085, -.085], [.09, 0]].forEach(([lx, ly]) => {
    const r = new THREE.Mesh(lensG, ringM); r.rotation.x = Math.PI / 2; r.position.set(lx, ly, .03); cam3.add(r);
    const g = new THREE.Mesh(new THREE.CircleGeometry(.05, 40), glassM); g.position.set(lx, ly, .0455); cam3.add(g);
  });
  cam3.rotation.y = Math.PI;
  cam3.position.set(W0 / 2 - .26, H0 / 2 - .26, -(D0 / 2 + BEV));
  // tlačítka na boku
  const btnG = new THREE.BoxGeometry(.03, 1, .05);
  const addBtn = (x, y, h) => { const b = new THREE.Mesh(btnG, metal); b.scale.y = h; b.position.set(x, y, 0); return b; };
  const phone = new THREE.Group();
  phone.add(body, screen, back, cam3, addBtn(PW / 2 + .004, .3, .3), addBtn(-PW / 2 - .004, .42, .16), addBtn(-PW / 2 - .004, .18, .16));
  const pivot = new THREE.Group(); pivot.add(phone); scene.add(pivot);
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(-4, 5, 6); scene.add(sun);

  let W = 1, H = 1, mobile = false, visH = 1, visW = 1, wordH = 1, quality = 1;
  function layout() {
    W = innerWidth; H = innerHeight; mobile = (W < 760 && H >= W) || (W < 1100 && H * 20 > W * 23);  // telefon na výšku i tablet na výšku
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2, Math.max(1, Math.sqrt(2.4e6 / (W * H)))) * quality);
    renderer.setSize(W, H, false);
    cam.aspect = W / H; cam.updateProjectionMatrix();
    const dW = cam.position.z - words.position.z;
    visH = 2 * dW * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)); visW = visH * cam.aspect;
    wordH = Math.min(.44 * visH / strip.capFrac, (mobile ? .9 : .94) * visW / (stripA * strip.maxFrac));
    words.scale.set(wordH * stripA, wordH, 1);
    const dB = cam.position.z - bg.position.z, bh = 2 * dB * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * 1.08;
    bg.scale.set(bh * cam.aspect, bh, 1); bgU.uA.value = cam.aspect;
  }
  layout();
  addEventListener('resize', layout);
  // výška viditelné plochy v rovině telefonu (z = 0)
  const visAt0 = () => 2 * cam.position.z * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));

  const ptr = { x: .5, y: .5, tx: .5, ty: .5 };
  addEventListener('pointermove', e => { ptr.tx = e.clientX / W; ptr.ty = 1 - e.clientY / H; }, { passive: true });

  let visible = true, dead = false;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(hero);

  const tint = new THREE.Vector3(...SCREENS[0].tint);
  let shown = false, lastK = -1, endOn = false;
  const t0 = performance.now(); let frames = 0, slow = 0, last = t0;
  function tick(now) {
    requestAnimationFrame(tick);
    lenis && lenis.raf(now);
    if (!visible || dead) return;
    const dt = now - last; last = now;
    if (frames < 120 && !NW) { frames++; if (frames > 20 && dt > 34) slow++; if (frames === 120 && slow > 50) { if (quality > .7) { quality = .66; layout(); frames = 0; slow = 0; } else { dead = true; return fallback(renderer); } } }
    const t = (now - t0) / 1000;
    const p = clamp(sy() / Math.max(1, hero.offsetHeight - H), 0, 1);
    ptr.x += (ptr.tx - ptr.x) * .05; ptr.y += (ptr.ty - ptr.y) * .05;
    bgU.uL.value.set(ptr.x, ptr.y);
    sun.position.set((ptr.x - .5) * 14, (ptr.y - .5) * 10 + 4, 7);

    const V = visAt0(), VW = V * cam.aspect;
    const inn = 1 - Math.pow(1 - clamp((TI >= 0 ? TI : t) / 1.8, 0, 1), 3);
    const a = smooth(0, .13, p);                 // z úvodního textu doprostřed
    const end = smooth(.8, .97, p);              // konec: zprávy na zamčeném displeji
    const s = smooth(.1, .93, p) * 4, i = Math.min(3, Math.floor(s)), fr = s - i;
    const spin = smooth(.28, .72, fr);
    const k = Math.min(4, i + (spin > .5 ? 1 : 0));

    // velikost a místo telefonu: úvod (vpravo / dole), střed, konec (vpravo / nahoře)
    const hS = mobile ? [V * .62, V * .56, V * .42] : [V * .74, V * .7, V * .68];
    const xs = mobile ? [0, 0, 0] : [VW * .2, 0, VW * .2];
    const ys = mobile ? [-V * .45, -V * .06, V * .15] : [-V * .01, -V * .02, 0];
    const mix3 = arr => lerp(lerp(arr[0], arr[1], a), arr[2], end);
    pivot.scale.setScalar(mix3(hS) / PH);
    pivot.position.set(mix3(xs), mix3(ys) + Math.sin(t * .8) * V * .006 - (1 - inn) * V * .5, 0);
    const turn = (i + spin) * Math.PI * 2;
    const rest = lerp(lerp(mobile ? -.12 : -.42, 0, a), mobile ? 0 : -.36, end);
    const tiltX = (mobile ? 0 : (ptr.y - .5) * -.22) + Math.sin(t * .5) * .03 + lerp(mobile ? .18 : .06, 0, a);
    const tiltY = (mobile ? Math.sin(t * .35) * .08 : (ptr.x - .5) * .34);
    pivot.rotation.set(tiltX, turn + rest + tiltY - (1 - inn) * 1.6, lerp(mobile ? .06 : .04, 0, a) + Math.sin(fr * Math.PI) * .08 * (spin > 0 && spin < 1 ? 1 : 0));

    // displej
    if (k !== lastK && texs[k]) { scrU.tA.value = texs[k]; lastK = k; }
    if (k === 4) setLock(Math.round(clamp((end - .35) / .55, 0, 1) * 3));
    scrU.uGl.value = Math.sin(pivot.rotation.y) * 1.6 + (ptr.x - .5) * .7 + .2;
    scrU.uDim.value = lerp(.97, 1, a);

    // pozadí: stín pod telefonem a lehký nádech barvy ukázky
    const sx = .5 + pivot.position.x / (VW * 1.08 * (cam.position.z - bg.position.z) / cam.position.z) + .012;
    const syy = .5 + pivot.position.y / (V * 1.08 * (cam.position.z - bg.position.z) / cam.position.z) - .025;
    bgU.uC.value.set(sx, syy);
    const ph = pivot.scale.x * PH / (V * 1.08 * (cam.position.z - bg.position.z) / cam.position.z);
    bgU.uS.value.set(ph * (.24 * Math.abs(Math.cos(pivot.rotation.y)) + .05) * cam.aspect / cam.aspect, ph * .5);
    const tk = SCREENS[k].tint; tint.x += (tk[0] - tint.x) * .04; tint.y += (tk[1] - tint.y) * .04; tint.z += (tk[2] - tint.z) * .04;
    bgU.uTint.value.copy(tint); bgU.uTk.value = .07 * a;

    // slova projíždějí za telefonem
    const cs = strip.centers, wf = clamp(s, 0, 3), wi = Math.min(2, Math.floor(wf)), wr = wf - wi;
    const ease = wr < .5 ? 4 * wr * wr * wr : 1 - Math.pow(-2 * wr + 2, 3) / 2;
    const c = lerp(cs[wi], cs[wi + 1], ease);
    words.position.x = (.5 - c) * wordH * stripA + (1 - a) * wordH * 1.2;
    words.position.y = mobile ? visH * .3 : 0;
    words.material.opacity = (NW ? 0 : 1) * smooth(.02, .12, p) * (1 - smooth(0, .5, end));
    words.visible = words.material.opacity > .005;

    // texty v DOM
    const co = 1 - smooth(0, .07, p);
    copy.style.opacity = co; copy.style.visibility = co < .01 ? 'hidden' : 'visible';
    copy.style.transform = (mobile ? '' : 'translateY(-46%) ') + `translateY(${-a * 60}px)`;
    if (scrollHint) scrollHint.style.opacity = co;
    const dOp = smooth(.09, .13, p) * (1 - smooth(.76, .82, p)) * (1 - Math.sin(spin * Math.PI));
    demo.style.opacity = dOp;
    if (k < 4 && demoT.textContent !== SCREENS[k].name) demoT.textContent = SCREENS[k].name;
    const eo = smooth(.55, 1, end);
    endBox.style.opacity = eo; endBox.style.visibility = eo < .01 ? 'hidden' : 'visible';
    endBox.style.transform = (mobile ? '' : 'translateY(-50%) ') + `translateY(${(1 - eo) * 24}px)`;
    if (eo > .5 !== endOn) { endOn = eo > .5; endBox.style.pointerEvents = endOn ? 'auto' : 'none'; }

    renderer.render(scene, cam);
    if (!shown) { shown = true; canvas.classList.add('in'); document.documentElement.classList.add('hero-in'); }
  }
  requestAnimationFrame(tick);
}

function fallback(r) {
  if (r) r.dispose();
  canvas.hidden = true;
  const im = document.querySelector('.hero-fallback');
  if ((innerWidth < 760 && innerHeight >= innerWidth) || (innerWidth < 1100 && innerHeight * 20 > innerWidth * 23)) im.src = 'img/hero-fallback-m.webp';
  im.hidden = false;
  // bez WebGL: úvodní text zůstane, konec úvodu se ukáže při posunu
  const tick = () => {
    const p = clamp(sy() / Math.max(1, hero.offsetHeight - innerHeight), 0, 1);
    const co = 1 - smooth(.3, .45, p), eo = smooth(.55, .7, p);
    copy.style.opacity = co; copy.style.visibility = co < .01 ? 'hidden' : 'visible';
    endBox.style.opacity = eo; endBox.style.visibility = eo < .01 ? 'hidden' : 'visible'; endBox.style.pointerEvents = eo > .5 ? 'auto' : 'none';
    if (!r) lenis && lenis.raf(performance.now());   // jinak lenis pohání smyčka z init()
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  document.documentElement.classList.add('hero-in');
}

if (Q.has('fb')) fallback(); else init();
