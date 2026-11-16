/* Dílna Kruh — ukázka (Vladislav Zachariev, Whyte Lynx).
   Hero: a lump of clay turns on a potter's wheel. Its outline is a row of radii; dragging sideways on the clay pushes
   the wall in or out at that height, the three buttons throw a beaker, a bowl or a vase, and a glaze runs down from
   the rim. Height, width and volume under it are computed from the same outline. */
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- smooth wheel, anchors, reveal, nav ---------- */
let lenis = null;
if (window.Lenis && !reduced) {
  lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
  const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const id = a.getAttribute('href'), el = id === '#top' ? document.body : $(id);
  if (!el) return;
  e.preventDefault();
  const y = id === '#top' ? 0 : el.getBoundingClientRect().top + scrollY - 70;
  lenis ? lenis.scrollTo(y, { duration: 1.2 }) : scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
}));
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
$$('.reveal').forEach(el => io.observe(el));
const nav = $('#nav'), hero = $('#hero');
addEventListener('scroll', () => nav.classList.toggle('is-solid', scrollY > hero.offsetHeight - 70), { passive: true });

/* ---------- next Saturdays ---------- */
(function dates() {
  const ul = $('#dates'); if (!ul) return;
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Prague' }));
  const fmt = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'long' });
  d.setDate(d.getDate() + 1);
  while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
  for (let i = 0; i < 3; i++) { const li = document.createElement('li'); li.textContent = fmt.format(d); ul.appendChild(li); d.setDate(d.getDate() + 7); }
})();

/* ---------- the clay ---------- */
const K = 14;                       // radii along the height
const WALL = .075, FLOOR = .11, FOOT = .1, CM = 8;   // 1 unit = 8 cm
const cr = (a, t) => {              // Catmull-Rom through evenly spaced values
  const n = a.length - 1, x = clamp(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(x)), f = x - i;
  const p0 = a[Math.max(0, i - 1)], p1 = a[i], p2 = a[i + 1], p3 = a[Math.min(n, i + 2)];
  return .5 * (2 * p1 + (p2 - p0) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (3 * p1 - p0 - 3 * p2 + p3) * f * f * f);
};
const shape = (H, knots) => ({ H, r: Array.from({ length: K }, (_, i) => cr(knots, i / (K - 1))) });
const SHAPES = {
  poharek: shape(1.6, [.56, .63, .67, .69, .70, .70, .70, .715]),
  miska: shape(1.02, [.40, .68, .88, 1.02, 1.12, 1.19, 1.24, 1.28]),
  vaza: shape(2.45, [.46, .67, .85, .89, .78, .54, .385, .47]),
};
const NAMES = { poharek: 'Pohárek', miska: 'Miska', vaza: 'Váza' };
const GLAZES = [
  { c: '#9a9288', ro: .56, sp: 0 }, { c: '#e2dccf', ro: .2, sp: 0 }, { c: '#74886a', ro: .16, sp: 0 },
  { c: '#587698', ro: .18, sp: 0 }, { c: '#c4aa7a', ro: .3, sp: 1 }, { c: '#a55334', ro: .42, sp: 0 },
];
const cur = { H: 1.2, r: new Array(K).fill(.62) };                 // what is drawn
const tgt = { H: SHAPES.vaza.H, r: SHAPES.vaza.r.slice() };          // where it is heading
let named = 'vaza', auto = !reduced, nextAuto = 0;

const canvas = $('#gl'), read = $('#read');
const pills = $$('.pill'), dots = $$('.dot');
function setShape(k, byUser) {
  tgt.H = SHAPES[k].H; tgt.r = SHAPES[k].r.slice(); named = k;
  if (byUser) auto = false;
  pills.forEach(b => b.classList.toggle('is-on', b.dataset.shape === k));
  readout();
}
function readout() {
  const n = 60; let vol = 0, rmax = 0;
  for (let i = 0; i < n; i++) {
    const t = (i + .5) / n, y = t * tgt.H, r = cr(tgt.r, t); rmax = Math.max(rmax, r);
    if (y > FLOOR) vol += Math.PI * Math.pow(Math.max(0, r - WALL), 2) * tgt.H / n;
  }
  const l = vol * CM * CM * CM / 1000;
  read.innerHTML = '<b>' + (named ? NAMES[named] : 'Váš tvar') + '</b> · výška ' + Math.round(tgt.H * CM) + ' cm · průměr ' + Math.round(rmax * 2 * CM) + ' cm · ' +
    (l < 1 ? l.toFixed(2) : l.toFixed(1)).replace('.', ',') + ' l';
}

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
catch (e) { hero.classList.add('no-gl'); }

if (renderer) start();

function start() {
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; pm.dispose();
  const camera = new THREE.PerspectiveCamera(26, 1, .1, 80);

  const key = new THREE.DirectionalLight(0xfff3e2, 1.75); key.position.set(-4.2, 6.5, 4.6);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -2.6, right: 2.6, top: 3.4, bottom: -1.2, near: 1, far: 20 });
  key.shadow.bias = -.0006; key.shadow.normalBias = .025; key.shadow.radius = 5;
  scene.add(key, new THREE.HemisphereLight(0xffffff, 0xcfc6b8, .32));

  /* textures drawn once: throwing rings, the wheel head, the soft shadow on the floor */
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const tex = (size, draw, srgb) => {
    const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4; return t;
  };
  const rings = (base, dark, light, amp) => (g, s) => {
    g.fillStyle = base; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 150; i++) {
      const y = rnd() * s, h = .7 + rnd() * 2.4, a = (.25 + rnd() * .75) * amp; g.fillStyle = rnd() < .5 ? dark : light;
      for (let x = 0; x < s; x += 32) { g.globalAlpha = a * (.72 + rnd() * .28); g.fillRect(x, y, 32, h); }
    }
    g.globalAlpha = 1;
  };
  const clayMap = tex(512, rings('#f4f4f4', '#9a9a9a', '#ffffff', .2), true);
  const clayBump = tex(512, rings('#808080', '#404040', '#c0c0c0', .5), false);
  [clayMap, clayBump].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 2.4); });
  const headMap = tex(1024, (g, s) => {
    const c = s / 2; g.fillStyle = '#a9a7a2'; g.fillRect(0, 0, s, s);
    for (let r = 4; r < c; r += 1.5 + rnd() * 3.5) {
      g.beginPath(); g.arc(c, c, r, 0, 7); g.lineWidth = .6 + rnd() * 1.6;
      g.strokeStyle = rnd() < .55 ? 'rgba(70,68,64,' + (.04 + rnd() * .13) + ')' : 'rgba(255,255,255,' + (.05 + rnd() * .15) + ')'; g.stroke();
    }
    const slip = g.createRadialGradient(c, c, c * .2, c, c, c * .62);
    slip.addColorStop(0, 'rgba(150,143,133,.95)'); slip.addColorStop(.72, 'rgba(158,151,141,.6)'); slip.addColorStop(1, 'rgba(160,153,143,0)');
    g.fillStyle = slip; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 46; i++) {            // smears of slip: they are what shows the head is turning
      const r = c * (.3 + rnd() * .66), a0 = rnd() * 6.283, len = .25 + rnd() * 1.5;
      g.beginPath(); g.arc(c, c, r, a0, a0 + len); g.lineWidth = 3 + rnd() * 20; g.lineCap = 'round';
      g.strokeStyle = 'rgba(' + (rnd() < .7 ? '146,139,129,' : '226,222,214,') + (.07 + rnd() * .2) + ')'; g.stroke();
    }
  }, true);
  const floorMap = tex(256, (g, s) => {
    const c = s / 2, gr = g.createRadialGradient(c, c, 0, c, c, c);
    gr.addColorStop(0, 'rgba(40,32,24,.42)'); gr.addColorStop(.4, 'rgba(40,32,24,.2)'); gr.addColorStop(.75, 'rgba(40,32,24,.04)'); gr.addColorStop(1, 'rgba(40,32,24,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  }, true);

  /* clay material: standard lighting, plus the glaze that runs down and the damp line under the finger */
  const U = {
    uColA: { value: new THREE.Color(GLAZES[0].c) }, uColB: { value: new THREE.Color(GLAZES[0].c) },
    uRoA: { value: GLAZES[0].ro }, uRoB: { value: GLAZES[0].ro }, uSpA: { value: 0 }, uSpB: { value: 0 },
    uClay: { value: new THREE.Color(GLAZES[0].c) }, uG: { value: 1 }, uH: { value: 1 }, uHov: { value: 0 }, uHovA: { value: 0 },
  };
  const clay = new THREE.MeshStandardMaterial({ color: 0xffffff, map: clayMap, bumpMap: clayBump, bumpScale: .55, roughness: .5, metalness: 0, envMapIntensity: .5 });
  clay.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;varying float vIn;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj=position;vIn=step(dot(normalize(position.xz+1e-5),normal.xz),-.25);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uColA,uColB,uClay;uniform float uRoA,uRoB,uSpA,uSpB,uG,uH,uHov,uHovA;varying vec3 vObj;varying float vIn;
        float hsh(vec2 p){p=fract(p*vec2(.1031,.1030));p+=dot(p,p.yx+33.33);return fract((p.x+p.y)*p.x);}
        float glazeAt(float ang){
          float e=uG*uG*(3.-2.*uG);
          float drip=pow(.5+.5*sin(ang*5.+1.7),4.)*.75+pow(.5+.5*sin(ang*9.+.4),6.)*.45+pow(.5+.5*sin(ang*17.+2.),5.)*.2;   // rounded tongues that hang down
          float line=mix(uH+.3,${FOOT.toFixed(2)},e)+.06*sin(e*3.14159)-drip*mix(.0,.3,sin(e*3.14159));
          return mix(smoothstep(-.012,.012,vObj.y-line),smoothstep(0.,.3,uG),vIn);
        }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float ang=atan(vObj.z,vObj.x);float gz=glazeAt(ang);
        vec3 tint=mix(uColA,uColB,gz);
        float raw=(1.-vIn)*(1.-smoothstep(-.01,.01,vObj.y-${FOOT.toFixed(2)}-.012*sin(ang*3.+1.)));   // the foot is never glazed
        tint=mix(tint,uClay,raw);
        float sp=step(.988,hsh(floor(vec2(ang*46.,vObj.y*64.))+7.))*mix(uSpA,uSpB,gz);
        tint*=1.-sp*.5;
        tint*=1.-uHovA*.17*(1.-vIn)*smoothstep(.075,0.,abs(vObj.y-uHov));
        diffuseColor.rgb*=tint;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=mix(mix(uRoA,uRoB,gz)+sp*.3,.56,raw);');
  };

  const spin = new THREE.Group(); scene.add(spin);
  const pot = new THREE.Mesh(new THREE.BufferGeometry(), clay); pot.castShadow = pot.receiveShadow = true; spin.add(pot);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, .1, 96), new THREE.MeshStandardMaterial({ map: headMap, metalness: .6, roughness: .5, envMapIntensity: .62 }));
  head.position.y = -.05; head.receiveShadow = true; spin.add(head);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.42, .56, .5, 48), new THREE.MeshStandardMaterial({ color: 0x2c2a27, roughness: .62, metalness: .3 }));
  stem.position.y = -.35; scene.add(stem);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: floorMap, transparent: true, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(.25, -.6, .1); scene.add(floor);

  function rebuild() {
    const R = t => cr(cur.r, t), H = cur.H, N = 46, p = [];
    p.push(new THREE.Vector2(0, 0), new THREE.Vector2(Math.max(.05, R(0) - .05), 0));
    for (let j = 0; j <= N; j++) p.push(new THREE.Vector2(R(j / N), j ? j / N * H : .04));
    const rt = R(1);
    for (const a of [.25, .5, .75]) p.push(new THREE.Vector2(rt - WALL / 2 + Math.cos(a * Math.PI) * WALL / 2, H + Math.sin(a * Math.PI) * WALL / 2));
    let tl = 1;
    for (let j = N; j >= 0; j--) { const y = j / N * H; if (y < FLOOR + .06) break; tl = j / N; p.push(new THREE.Vector2(Math.max(.03, R(tl) - WALL), y)); }
    const rf = Math.max(.03, R(tl) - WALL);
    p.push(new THREE.Vector2(Math.max(.02, rf - .05), FLOOR), new THREE.Vector2(0, FLOOR));
    pot.geometry.dispose(); pot.geometry = new THREE.LatheGeometry(p, 88);
    U.uH.value = H;
  }

  /* framing: the wheel sits at a fixed place of the hero, the two words stand to its sides */
  let W = 1, Hh = 1, ppu = 100;
  const v3 = new THREE.Vector3();
  const toScreen = (x, y, z) => { v3.set(x, y, z).project(camera); return [(v3.x * .5 + .5) * W, (-v3.y * .5 + .5) * Hh]; };
  function resize() {
    W = hero.clientWidth; Hh = hero.clientHeight;
    const wide = W / Hh > 1.05;
    ppu = wide ? Math.min(Hh * .56 / 2.6, W * .4 / 3.1) : Math.min(W * .84 / 3.1, Hh * .36 / 2.6);
    const fy = wide ? .715 : .66, tan = Math.tan(13 * Math.PI / 180), el = 11.5 * Math.PI / 180;
    const d = Hh / (2 * tan * ppu), ly = (fy - .5) * Hh / ppu;
    camera.aspect = W / Hh; camera.position.set(0, ly + d * Math.sin(el), d * Math.cos(el)); camera.lookAt(0, ly, 0); camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(W, Hh, false);
    hero.style.setProperty('--half', (1.42 * ppu).toFixed(0) + 'px');
  }
  let lw = 0;
  addEventListener('resize', () => { if (innerWidth === lw && Math.abs(hero.clientHeight - Hh) < 2) return; lw = innerWidth; resize(); });

  /* hand on the clay */
  let drag = null, hovA = 0;
  function pick(e) {
    const b = canvas.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
    const [cx, yb] = toScreen(0, 0, 0), yt = toScreen(0, cur.H, 0)[1];
    const t = (y - yb) / (yt - yb);
    if (t < -.06 || t > 1.1) return null;
    const tc = clamp(t, 0, 1), rp = Math.abs(toScreen(cr(cur.r, tc), tc * cur.H, 0)[0] - cx);
    if (Math.abs(x - cx) > rp + 30) return null;
    return { t: tc, side: x >= cx ? 1 : -1, x, y };
  }
  function push(t, dr) {
    for (let i = 0; i < K; i++) {
      const w = Math.exp(-Math.pow((i / (K - 1) - t) / .17, 2));
      tgt.r[i] = clamp(tgt.r[i] + dr * w, .17, 1.32);
    }
    if (named) { named = ''; pills.forEach(b => b.classList.remove('is-on')); }
    readout();
  }
  canvas.addEventListener('pointerdown', e => {
    const h = pick(e); if (!h) return;
    auto = false;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: h.t, side: h.side, rim: e.pointerType === 'mouse' && h.t > .9 };
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', e => {
    if (drag && e.pointerId === drag.id) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      if (e.pointerType === 'mouse') { const h = pick(e); if (h && !drag.rim) drag.t = h.t; }
      if (drag.rim && Math.abs(dy) > Math.abs(dx)) { tgt.H = clamp(tgt.H - dy / ppu, .7, 2.75); if (named) { named = ''; pills.forEach(b => b.classList.remove('is-on')); } readout(); }
      else push(drag.t, dx * drag.side / ppu);
      U.uHov.value = drag.t * cur.H;
      return;
    }
    if (e.pointerType !== 'mouse') return;
    const h = pick(e);
    canvas.style.cursor = h ? 'grab' : '';
    if (h) U.uHov.value = h.t * cur.H;
    hovA = h ? 1 : 0;
  });
  const drop = e => { if (drag && e.pointerId === drag.id) { drag = null; canvas.style.cursor = ''; if (e.pointerType !== 'mouse') hovA = 0; } };
  canvas.addEventListener('pointerup', drop); canvas.addEventListener('pointercancel', drop);
  canvas.addEventListener('pointerleave', () => { if (!drag) hovA = 0; });

  pills.forEach(b => b.addEventListener('click', () => setShape(b.dataset.shape, true)));
  dots.forEach(b => b.addEventListener('click', () => {
    const g = GLAZES[+b.dataset.glaze];
    U.uColA.value.copy(U.uColB.value); U.uRoA.value = U.uRoB.value; U.uSpA.value = U.uSpB.value;
    U.uColB.value.set(g.c); U.uRoB.value = g.ro; U.uSpB.value = g.sp; U.uG.value = reduced ? 1 : 0;
    dots.forEach(x => x.classList.toggle('is-on', x === b));
  }));

  /* run only while the hero is on screen */
  let seen = true, last = 0, first = true;
  new IntersectionObserver(es => { seen = es[0].isIntersecting; }, { rootMargin: '80px' }).observe(hero);
  const ORDER = ['vaza', 'miska', 'poharek'];
  let oi = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!seen || document.hidden) return;
    if (auto && now > nextAuto) { if (nextAuto) { oi = (oi + 1) % ORDER.length; setShape(ORDER[oi]); } nextAuto = now + 5200; }
    const a = 1 - Math.exp(-dt * (drag ? 22 : 3.6)); let ch = 0;
    for (let i = 0; i < K; i++) { const d = tgt.r[i] - cur.r[i]; cur.r[i] += d * a; ch += Math.abs(d); }
    const dH = tgt.H - cur.H; cur.H += dH * a; ch += Math.abs(dH);
    if (ch > 3e-4 || first) { rebuild(); first = false; }
    if (U.uG.value < 1) U.uG.value = Math.min(1, U.uG.value + dt / 2.6);
    U.uHovA.value += ((drag ? 1 : hovA * .55) - U.uHovA.value) * (1 - Math.exp(-dt * 9));
    if (!reduced) spin.rotation.y -= dt * 1.7;
    renderer.render(scene, camera);
  }
  resize(); setShape('vaza'); rebuild();
  if (reduced) { cur.H = tgt.H; cur.r = tgt.r.slice(); rebuild(); }
  requestAnimationFrame(frame);
  window.__kruh = { setShape: k => setShape(k, true), glaze: i => dots[i].click(), push, done: () => { cur.H = tgt.H; cur.r = tgt.r.slice(); U.uG.value = 1; rebuild(); } };
}
