// Stuha z prací (J 21. 10. 2026, Z: „postav tu věc z videa do našeho webu“ — reel DeuBoWaJvbr).
// v2 (Z: „stuha je hnusná a divná“): blíž videu — dlouhý pás z 27 malých karet těsně za sebou,
// klidná úhlopříčka s jemnou vlnou a mírným natočením, tenčí nadpis. Rolování posouvá karty po pásu;
// na konci se prvních 9 karet postupně odlepí do mřížky 3 × 3, zbytek pásu odjede za okraj. Klik na kartu = práce.
// Vrcholy karet se počítají na CPU (27 × 42 vrcholů), shader jen kreslí fotku se zaoblenými rohy.
import * as THREE from '../vendor/three.module.min.js';

const box = document.getElementById('stuha');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const probe = document.createElement('canvas');
const gl = probe.getContext('webgl2') || probe.getContext('webgl');
if (!box || reduce || !gl) { if (box) box.remove(); }
else start();

function start() {
  const cv = box.querySelector('canvas');
  const sec = box.closest('section');
  const works = [...document.querySelectorAll('#wl a')].map(a => ({
    href: a.getAttribute('href'),
    img: a.dataset.img
  }));
  const N = works.length;
  // 3 snímky z každé práce, prokládaně (sousední karty jsou vždy z jiné práce); prvních N = titulní snímky
  const cards = [];
  for (let k = 0; k < 3; k++) works.forEach(w => cards.push({ href: w.href, img: w.img.replace(/-0\.webp$/, `-${k}.webp`) }));
  const M = cards.length;
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  renderer.setClearColor(0xffffff, 0);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  cam.position.set(0, 0, 10);
  const tl = new THREE.TextureLoader();

  // --- karty ---------------------------------------------------------------
  const SEG = 20;
  const vsh = `varying vec2 vUv; varying float vShade;
    void main(){ vUv = uv; vec3 n = normalize(normalMatrix * normal);
      vShade = .86 + .14 * abs(n.z);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
  const fsh = `uniform sampler2D map; uniform float uAsp, uR, uO; varying vec2 vUv; varying float vShade;
    void main(){ vec2 p = (vUv - .5) * vec2(uAsp, 1.); vec2 q = abs(p) - vec2(uAsp * .5 - uR, .5 - uR);
      float d = length(max(q, 0.)) - uR; if (d > 0.) discard;
      vec2 tu = gl_FrontFacing ? vUv : vec2(1. - vUv.x, vUv.y);   // rub: fotka nezrcadlená
      vec3 c = texture2D(map, tu).rgb * vShade; if (!gl_FrontFacing) c *= .9;
      gl_FragColor = vec4(c, uO); }`;
  const meshes = cards.map((c, i) => {
    const g = new THREE.PlaneGeometry(1, 1, SEG, 1);
    const tex = tl.load(c.img);
    tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 4;
    const m = new THREE.ShaderMaterial({ vertexShader: vsh, fragmentShader: fsh, side: THREE.DoubleSide, transparent: true,
      uniforms: { map: { value: tex }, uAsp: { value: 1120 / 700 }, uR: { value: .05 }, uO: { value: 1 } } });
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false; mesh.userData.i = i;
    scene.add(mesh);
    return mesh;
  });

  // --- nadpis ----------------------------------------------------------------
  const tc = document.createElement('canvas');
  const tTex = new THREE.CanvasTexture(tc); tTex.colorSpace = THREE.SRGBColorSpace; tTex.anisotropy = 4;
  const tMat = new THREE.MeshBasicMaterial({ map: tTex, transparent: true, depthWrite: false, depthTest: false });
  const tMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), tMat);
  tMesh.renderOrder = 1; scene.add(tMesh);
  // Pořadí kreslení místo hloubky: karta je celá za nadpisem (0) nebo celá před ním (2) — rovina karty
  // nikdy neprotne písmeno (v2: pás „půlil“ m v „jsme“, Z 21. 10.).
  let tAsp = 2;
  function drawText(narrow) {
    const lines = ['Weby, které', 'jsme postavili'];
    const fs = 220, lh = fs * 1.05, padX = fs * .1;
    const ctx = tc.getContext('2d');
    const font = `500 ${fs}px Archivo, system-ui, sans-serif`;
    ctx.font = font;
    const ws = lines.map(l => ctx.measureText(l).width);
    const shift = narrow ? fs * .5 : fs * 1.4;           // druhý řádek odsazený jako ve videu
    const w = Math.ceil(Math.max(ws[0], ws[1] + shift) + padX * 2);
    const h = Math.ceil(lh * 2 + fs * .25);
    tc.width = w; tc.height = h;
    ctx.font = font; ctx.fillStyle = '#161616'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(lines[0], padX, lh - fs * .1);
    ctx.fillText(lines[1], padX + shift, lh * 2 - fs * .1);
    tAsp = w / h; tTex.needsUpdate = true;
  }

  // --- rozměry a dráha ------------------------------------------------------------
  let textFor = null, W = 10, H = 6, cw = 1.3, ch = .8, curve = null, cLen = 1, loop = 1, sp = 1, grid = [], narrow = false;
  function layout() {
    const w = box.clientWidth, h = box.querySelector('.stuha-pin').clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
    H = 2 * cam.position.z * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)); W = H * cam.aspect;
    const nw = cam.aspect < .9;
    if (nw !== textFor) { narrow = textFor = nw; drawText(narrow); }
    const tw = narrow ? W * .9 : Math.min(W * .62, H * .5 * tAsp);
    tMesh.scale.set(tw, tw / tAsp, 1);
    tMesh.position.set(0, H * (narrow ? .2 : .21), -.6);   // nadpis nahoře, pás pod ním — nikde se nekříží (Z 21. 10.: pás „půlil“ m)
    cw = narrow ? W * .34 : Math.min(W * .115, 1.5); ch = cw * 700 / 1120;
    sp = cw * 1.04;                                    // karty těsně za sebou
    // klidná úhlopříčka zleva zdola doprava nahoru pod nadpisem; vlevo blízko diváka, doprava se vzdaluje
    const P = narrow
      ? [[-1.7, -.17, .6], [-.8, -.11, 0], [0, -.07, -.8], [.8, -.03, -1.2], [1.7, .04, -.9]]
      : [[-1.25, -.4, 1.6], [-.6, -.26, .4], [0, -.17, -1], [.55, -.1, -1.4], [1.25, .12, -.8]];
    curve = new THREE.CatmullRomCurve3(P.map(p => new THREE.Vector3(p[0] * W * .5, p[1] * H, p[2])), false, 'centripetal');
    curve.arcLengthDivisions = 300; curve.updateArcLengths(); cLen = curve.getLength();
    loop = Math.max(M * sp, cLen + cw * 4);            // celá smyčka pásu; co je mimo dráhu, je mimo obraz
    // mřížka pro prvních N karet
    grid = [];
    const cols = 3, gw = narrow ? W * .92 : Math.min(W * .6, H * 1.2 * 1.6), gap = gw * .03;
    const gcw = (gw - (cols - 1) * gap) / cols, gch = gcw * 700 / 1120;
    for (let i = 0; i < N; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      grid.push({ x: (c - 1) * (gcw + gap), y: (1 - r) * (gch + gap), w: gcw, h: gch });
    }
  }

  // --- poloha vrcholu ----------------------------------------------------------
  const v3 = new THREE.Vector3(), T = new THREE.Vector3(), Nn = new THREE.Vector3(), B = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
  const seg = (p, a, b) => ease((p - a) / (b - a));
  function ribbon(s, v, flow, out) {           // s = vzdálenost po dráze, v = −.5….5 napříč pásem
    const over = s < 0 ? s : s > cLen ? s - cLen : 0;   // mimo dráhu rovně po tečně (mimo obraz)
    const u = Math.min(1, Math.max(0, s / cLen));
    curve.getPointAt(u, out); curve.getTangentAt(u, T); out.addScaledVector(T, over);
    Nn.copy(UP).addScaledVector(T, -UP.dot(T)).normalize(); B.crossVectors(T, Nn);
    const th = Math.sin(u * Math.PI * 1.3 + flow * .9) * .5;     // mírné natočení, pás zůstává čitelný
    out.addScaledVector(Nn, Math.cos(th) * v * ch).addScaledVector(B, Math.sin(th) * v * ch);
    return out;
  }

  let prog = 0, sm = 0, visible = false, mx = 0, my = 0, smx = 0, smy = 0, t0 = performance.now(), last = t0, drift = 0;
  // SA–S0: pás se dorovná, aby karty mřížky (0–8) stály uprostřed; od S0 už se nepřetáčí dokola —
  // v3 se karta během odlepování přetočila z konce pásu na začátek a „skočila“ (Z 21. 10., burger)
  const SA = .25, S0 = .56;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || !curve) return;
    const r = box.getBoundingClientRect(), pinH = box.querySelector('.stuha-pin').clientHeight;
    prog = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - pinH)));
    sm += (prog - sm) * .12; smx += (mx - smx) * .05; smy += (my - smy) * .05;
    const t = (now - t0) / 1000;
    const flow = sm * 2 + t * .05;
    if (sm < SA) drift += Math.min(.1, (now - last) / 1000) * cw * .12;   // v klidu karty pomalu plují
    last = now;
    const mod = (a, b) => ((a % b) + b) % b;
    const fix = mod(loop / 2 - mod(4 * sp + S0 * loop * .55 + drift, loop), loop);   // jen dopředu
    const shiftS = Math.min(sm, S0) * loop * .55 + drift + fix * seg(sm, SA, S0);
    const exitK = seg(sm, S0, .74);
    meshes.forEach((m, i) => {
      const pos = m.geometry.attributes.position, uv = m.geometry.attributes.uv;
      const gd = grid[i];
      // při skládání mřížky pás zrychlí a odjede po dráze za pravý okraj (nic nemizí);
      // karty mřížky se z něj odlepují postupně, jedna po druhé
      // karty před mřížkou odjedou dopředu, karty za ní dozadu — nikdy přes ni
      let rel = (i - 4) * sp; if (rel > loop / 2) rel -= loop;
      const exitS = gd ? 0 : Math.sign(rel) * exitK * loop;
      const base = mod(i * sp + shiftS, loop) - (loop - cLen) / 2 + exitS;
      const kGi = gd ? seg(sm, .6 + i * .015, .74 + i * .015) : 0;
      ribbon(base, 0, flow, v3);
      m.renderOrder = v3.z < tMesh.position.z && kGi < .5 ? 0 : 2;
      for (let k = 0; k < pos.count; k++) {
        const uu = uv.getX(k), vv = uv.getY(k) - .5;
        ribbon(base + (uu - .5) * cw, vv, flow, v3);
        let X = v3.x, Y = v3.y, Z = v3.z;
        if (gd) {
          X = THREE.MathUtils.lerp(X, gd.x + (uu - .5) * gd.w, kGi);
          Y = THREE.MathUtils.lerp(Y, gd.y + vv * gd.h, kGi);
          Z = THREE.MathUtils.lerp(Z, .4, kGi) + Math.sin(kGi * Math.PI) * .5;   // při odlepení se zvedne k divákovi
        }
        pos.setXYZ(k, X, Y, Z);
      }
      pos.needsUpdate = true; m.geometry.computeVertexNormals();
    });
    tMat.opacity = 1 - seg(sm, .56, .72);
    cam.position.x = smx * .3; cam.position.y = smy * .2; cam.lookAt(0, 0, 0);
    hint.style.opacity = String(1 - seg(sm, .02, .1));
    renderer.render(scene, cam);
  }

  // --- klik a kurzor ---------------------------------------------------------------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function hit(ev) {
    const r = cv.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const vis = meshes.filter(m => m.visible);
    vis.forEach(m => m.geometry.computeBoundingSphere());
    const h = ray.intersectObjects(vis, false)[0];
    return h ? cards[h.object.userData.i] : null;
  }
  cv.addEventListener('pointermove', ev => {
    const r = cv.getBoundingClientRect();
    mx = ((ev.clientX - r.left) / r.width) * 2 - 1; my = -((ev.clientY - r.top) / r.height) * 2 + 1;
    if (ev.pointerType === 'mouse') cv.style.cursor = hit(ev) ? 'pointer' : '';
  });
  cv.addEventListener('click', ev => { const c = hit(ev); if (c) location.href = c.href; });

  const hint = box.querySelector('.stuha-hint');
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '100px' }).observe(box);
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 120); });
  box.classList.add('on'); sec.classList.add('stuha-on');
  (document.fonts ? document.fonts.load('500 220px Archivo') : Promise.resolve()).catch(() => {}).then(() => {
    layout(); requestAnimationFrame(frame);
  });
}
