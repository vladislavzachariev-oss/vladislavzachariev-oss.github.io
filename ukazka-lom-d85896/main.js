// Lom · foukané sklo (J 2026-11-23). Hero: živá skleněná váza láme obří slova za sebou.
import * as THREE from './vendor/three.module.min.js';

const reduce = false; // Z 19. 11.: animace nevázat na „omezit animace“
const lenis = window.Lenis ? new window.Lenis({ lerp: .085, smoothWheel: true }) : null;
const sy = () => (lenis ? lenis.scroll : window.scrollY);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

const hero = document.querySelector('.hero');
const canvas = document.getElementById('gl');
const cap = document.querySelector('.hero-cap');
const TI = new URLSearchParams(location.search).has('ti') ? +new URLSearchParams(location.search).get('ti') : -1;
const INK = '#141414';

/* ---------- váza: profil otočený kolem osy (vnější stěna nahoru, okraj, vnitřní dolů) ---------- */
function vaseGeometry() {
  const outer = new THREE.SplineCurve([
    new THREE.Vector2(.46, 0), new THREE.Vector2(.78, .34), new THREE.Vector2(.98, .95), new THREE.Vector2(.9, 1.55),
    new THREE.Vector2(.56, 2.25), new THREE.Vector2(.4, 2.78), new THREE.Vector2(.44, 3.08), new THREE.Vector2(.56, 3.3)
  ]).getPoints(90);
  const W = .055; // tloušťka stěny
  const inner = outer.filter(p => p.y > .34).map(p => new THREE.Vector2(Math.max(.02, p.x - W), p.y)).reverse();
  const pts = [new THREE.Vector2(0, 0)];
  // dno: zaoblení paty
  for (let i = 0; i <= 6; i++) { const a = i / 6; pts.push(new THREE.Vector2(lerp(0, outer[0].x - .05, a), -.04 * Math.sin(a * Math.PI))); }
  pts.push(...outer);
  // zaoblený okraj
  const top = outer[outer.length - 1];
  for (let i = 1; i < 8; i++) { const a = i / 8 * Math.PI; pts.push(new THREE.Vector2(top.x - W / 2 + Math.cos(a) * W / 2, top.y + Math.sin(a) * W / 2)); }
  pts.push(...inner);
  pts.push(new THREE.Vector2(0, .34)); // silné dno
  const g = new THREE.LatheGeometry(pts, 160);
  g.translate(0, -1.62, 0);
  g.computeVertexNormals();
  // jantarové dno (přejímané sklo), nahoře čiré
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), t = 1 - smooth(-1.6, -.35, y);
    col[i * 3] = lerp(1, 1, t); col[i * 3 + 1] = lerp(1, .66, t); col[i * 3 + 2] = lerp(1, .38, t);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/* ---------- pás slov na plátně ---------- */
const WORDS = ['LOM', 'PÍSEK', 'ŽÁR', 'DECH', 'SKLO'];
function wordStrip() {
  const fs = 520, gap = fs * 1.1, pad = 40;
  const c = document.createElement('canvas'), x = c.getContext('2d');
  const setF = () => { x.font = `200 ${fs}px Archivo`; x.fontStretch = 'expanded'; x.letterSpacing = '0px'; };
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
  const lomFrac = (ws[0].actualBoundingBoxLeft + ws[0].actualBoundingBoxRight) / tot;   // šířka LOM vůči celému pásu
  return { c, centers, lomFrac, capFrac: (asc + desc) / (asc + desc + pad * 2) };
}

/* ---------- pozadí: teplé světlo, které jde za kurzorem ---------- */
const BG_FS = `
uniform vec2 uL; uniform float uA; uniform vec2 uC; uniform float uT; uniform float uHz;
varying vec2 vUv;
void main(){
  vec2 p = vUv; p.x *= uA;
  vec2 l = uL; l.x *= uA;
  float d = distance(p, l);
  vec3 base = vec3(.925,.92,.905);
  vec3 col = mix(vec3(.972,.965,.948), base, smoothstep(.0,.75,d));
  col = mix(col, vec3(.86,.855,.84), smoothstep(.55,1.35,distance(vUv, vec2(.5,.48))*1.4));
  // stůl: měkký horizont, sklo ho láme a obrací
  float tbl = smoothstep(uHz + .004, uHz - .004, vUv.y);
  col = mix(col, col * vec3(.955,.948,.935) - .012 * (uHz - vUv.y), tbl);
  // měkká jantarová kaustika pod sklem
  vec2 c = uC; c.x *= uA;
  vec2 q = (p - c) * vec2(1.0, 3.2);
  float k = exp(-dot(q,q)*22.0);
  col += vec3(.075,.045,.012) * k;
  gl_FragColor = vec4(col,1.0);
}`;
const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

async function init() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { return fallback(); }
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(28, 1, .1, 100);
  cam.position.set(0, 0, 13);

  // prostředí pro odlesky: šedá místnost se světlými pruhy (tmavé hrany skla na světlém pozadí)
  const pm = new THREE.PMREMGenerator(renderer);
  const es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.SphereGeometry(30, 24, 12), new THREE.MeshBasicMaterial({ color: 0x1c1b19, side: THREE.BackSide })));
  const panel = (w, h, x, y, z, col, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
  panel(3, 16, -12, 2, 6, '#ffffff', 4.5); panel(2.2, 14, 13, 1, 4, '#fff6ea', 3.2); panel(16, 3, 0, 14, 2, '#ffffff', 2.4);
  panel(20, 8, 0, -2, -16, '#e9e6e0', 1.1); panel(1.2, 12, 6, 0, 13, '#ffffff', 2.8);
  const env = pm.fromScene(es, .02).texture;

  const bgU = { uL: { value: new THREE.Vector2(.3, .7) }, uA: { value: 1 }, uC: { value: new THREE.Vector2(.5, .2) }, uT: { value: 0 }, uHz: { value: .36 } };
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ uniforms: bgU, vertexShader: VS, fragmentShader: BG_FS, depthWrite: false }));
  bg.position.z = -9; scene.add(bg);

  await document.fonts.load('200 100px Archivo').catch(() => {});
  const strip = wordStrip();
  const tex = new THREE.CanvasTexture(strip.c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const wordMat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: .5, alphaToCoverage: true, toneMapped: false }); // neprůhledné, jinak ho sklo neláme
  const words = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), wordMat);
  words.position.z = -3; scene.add(words);
  // hladká kopie navrch (průhledné objekty sklo neláme, neprůhledné mají zubaté hrany)
  const wordsAA = new THREE.Mesh(words.geometry, new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false }));
  wordsAA.position.z = .001; words.add(wordsAA);
  const stripA = strip.c.width / strip.c.height;

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, vertexColors: true, metalness: 0, roughness: .02, transmission: 1, thickness: .25, ior: 1.52, dispersion: 1.6, side: THREE.DoubleSide,
    attenuationColor: new THREE.Color('#e3ebe5'), attenuationDistance: 4.6,
    clearcoat: 0, specularIntensity: 1, envMap: env, envMapIntensity: 1.1
  });
  const vase = new THREE.Mesh(vaseGeometry(), glass);
  // tmavé hrany jako u produktové fotky skla (černé karty vedle): násobí obraz podle úhlu pohledu
  const rim = new THREE.Mesh(vase.geometry, new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; uniform float uK; void main(){ float f = 1. - abs(dot(normalize(vN), normalize(vV))); f = pow(f, 2.3); vec3 c = mix(vec3(1.), vec3(.22,.21,.2), clamp(f*uK,0.,1.)); gl_FragColor = vec4(c,1.); }`,
    uniforms: { uK: { value: 2.4 } }, transparent: true, premultipliedAlpha: true, blending: THREE.MultiplyBlending, depthWrite: false, side: THREE.DoubleSide
  }));
  rim.renderOrder = 2;
  const pivot = new THREE.Group(); pivot.add(vase); pivot.add(rim); scene.add(pivot);
  const sun = new THREE.DirectionalLight(0xffffff, 2.4); sun.position.set(-4, 5, 6); scene.add(sun);

  // rozměry podle okna
  let W = 1, H = 1, mobile = false, visH = 1, visW = 1, wordH = 1;
  function layout() {
    W = innerWidth; H = innerHeight; mobile = W < 760;
    // strop ~1,6 Mpx (ale ne pod 1×): sklo se kreslí dvakrát (průchod světla), velké tablety by jinak cukaly
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75, Math.max(1, Math.sqrt(1.6e6 / (W * H)))) * quality);
    renderer.setSize(W, H, false);
    cam.aspect = W / H; cam.updateProjectionMatrix();
    const dW = cam.position.z - words.position.z;
    visH = 2 * dW * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)); visW = visH * cam.aspect;
    // výška písmen 52 % obrazovky, ale LOM se vždy vejde na šířku (telefon, tablet na výšku)
    wordH = Math.min(.52 * visH / strip.capFrac, (mobile ? .9 : .86) * visW / (stripA * strip.lomFrac));
    words.scale.set(wordH * stripA, wordH, 1);
    const dB = cam.position.z - bg.position.z, bh = 2 * dB * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * 1.08;
    bg.scale.set(bh * cam.aspect, bh, 1); bgU.uA.value = cam.aspect;
    const s = mobile ? Math.min(.78, visW / 5.2) : clamp(visH / 7.4, .7, 1.05);
    pivot.scale.setScalar(s);
  }
  let quality = 1;
  layout();
  addEventListener('resize', layout);

  // kurzor / prst = světlo
  const ptr = { x: .32, y: .72, tx: .32, ty: .72 };
  addEventListener('pointermove', e => { ptr.tx = e.clientX / W; ptr.ty = 1 - e.clientY / H; }, { passive: true });

  let visible = true, dead = false;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(hero);

  let shown = false;
  const t0 = performance.now(); let frames = 0, slow = 0, last = t0;
  function tick(now) {
    requestAnimationFrame(tick);
    lenis && lenis.raf(now);
    if (!visible || dead) return;
    const dt = now - last; last = now;
    // měření: pomalé zařízení → nižší rozlišení, pak záložní fotka
    if (frames < 120) { frames++; if (frames > 20 && dt > 34) slow++; if (frames === 120 && slow > 50) { if (quality > .7) { quality = .66; layout(); frames = 0; slow = 0; } else { dead = true; return fallback(renderer); } } }
    const t = (now - t0) / 1000;
    const p = clamp(sy() / (hero.offsetHeight - H), 0, 1);

    ptr.x += (ptr.tx - ptr.x) * .05; ptr.y += (ptr.ty - ptr.y) * .05;
    bgU.uL.value.set(ptr.x, ptr.y); bgU.uT.value = t;
    sun.position.set((ptr.x - .5) * 14, (ptr.y - .5) * 10 + 3, 6);

    // slova projíždějí za vázou: LOM uprostřed na začátku, SKLO na konci
    const cs = strip.centers, n = cs.length - 1;
    const f = smooth(0, .86, p) * n, i = Math.min(n - 1, Math.floor(f)), fr = f - i;
    const ease = fr < .5 ? 4 * fr * fr * fr : 1 - Math.pow(-2 * fr + 2, 3) / 2;   // u slova se zpomalí
    const c = lerp(cs[i], cs[i + 1], ease);
    // příchod po načtení: váza vystoupá a dotočí se, slova dojedou
    const inn = 1 - Math.pow(1 - clamp((TI >= 0 ? TI : t) / 1.9, 0, 1), 3);   // ?ti=0.5 zastaví příchod (kontrola snímkem)
    words.position.x = (.5 - c) * wordH * stripA - (1 - inn) * wordH * .5;
    words.position.y = mobile ? visH * .06 : 0;

    // váza: pomalu se točí, při jízdě slov se nakloní, na konci odjede doprava a uvolní místo nadpisu
    const end = smooth(.84, 1, p);
    const lean = Math.sin(f * Math.PI) * .12;
    pivot.rotation.set(Math.sin(t * .4) * .04 + (ptr.y - .5) * .06, t * .22 + p * Math.PI * 2.2 - (1 - inn) * 1.4, -lean + (ptr.x - .5) * -.06);
    pivot.position.x = mobile ? 0 : lerp(0, visW * .2, end);
    pivot.position.y = Math.sin(t * .8) * .04 + (mobile ? lerp(visH * .04, visH * .17, end) : 0) - (1 - inn) * .9;
    // kaustika pod vázou, posunutá od světla
    const vx = .5 + pivot.position.x / (visW * 1.08 * (cam.position.z - bg.position.z) / (cam.position.z - words.position.z));
    bgU.uC.value.set(vx + (.5 - ptr.x) * .12, .2 + (mobile ? .06 : 0));
    // na konci slova zmizí (neprůhledná hned, vyhlazená kopie plynule), až pak přijde nadpis
    wordMat.visible = end < .02; wordsAA.material.opacity = 1 - smooth(0, .55, end);
    words.visible = end < .98; words.position.z = -3 - end * 2.5;
    cap.style.opacity = smooth(.3, 1, end); cap.style.transform = mobile ? `translateY(${(1 - end) * 20}px)` : `translateY(calc(-50% + ${(1 - end) * 20}px))`;

    renderer.render(scene, cam);
    if (!shown) { shown = true; canvas.classList.add('in'); document.documentElement.classList.add('hero-in'); }
  }
  requestAnimationFrame(tick);
}

function fallback(r) {
  if (r) { r.setAnimationLoop(null); r.dispose(); }
  canvas.hidden = true;
  const im = document.querySelector('.hero-fallback'); im.hidden = false;
  cap.style.opacity = 1;
  document.documentElement.classList.add('hero-in');
}

init();
