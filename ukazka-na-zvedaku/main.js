/* Na Zvedáku — ukázka (Vladislav Zachariev, Whyte Lynx).
   Hero: one evenly lit photo of the workshop + its depth map. The shader treats the depth map as a relief:
   at night the hall is almost black and an inspection lamp (pointer / finger, or a slow wander when nobody
   touches) lights it — diffuse + gloss from the relief normals, cast shadows marched through the depth map.
   Scrolling switches the hall lights on (a short tube flicker, then steady) and the page turns light. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- smooth wheel ---------- */
  let lenis = null;
  if (window.Lenis && !reduced) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'), el = id === '#top' ? document.body : $(id);
    if (!el) return;
    e.preventDefault();
    const y = id === '#top' ? 0 : el.getBoundingClientRect().top + scrollY - 40;
    lenis ? lenis.scrollTo(y, { duration: 1.4 }) : scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }));

  /* ---------- hero state ---------- */
  const hero = $('#hero'), pin = $('.pin'), cv = $('#gl'), nav = $('#nav');
  const lines = $$('.line', hero);
  const SETS = {
    l: { src: 'img/hala.webp', d: 'img/hala-r.png', a: 2752 / 1536, focus: [.47, .44], wander: [.47, .37, .27, .14],
         td: .31, band: [.02, .305], post: 0, k: 1, text: [['POSVÍTÍME SI NA TO.'], ['OTEVÍRÁME V SEDM.']] },
    p: { src: 'img/hala-p.webp', d: 'img/hala-p-r.png', a: 1536 / 2752, focus: [.49, .47], wander: [.47, .45, .27, .13],
         td: .165, band: [.215, .408], post: .232, k: 1.65, text: [['POSVÍTÍME', 'SI NA TO.'], ['OTEVÍRÁME', 'V SEDM.']] },
  };
  const pickSet = () => (innerWidth / innerHeight < 0.8 ? 'p' : 'l');
  let setKey = null, S = null;
  let W = 1, H = 1, heroP = 0, lit = false, amb = 0;
  const lamp = { x: .3, y: .5, tx: .3, ty: .5, h: .2, seen: -1e9, down: false };
  const par = { x: 0, y: 0, tx: 0, ty: 0 };
  let dgrid = null;                                     // small copy of the depth map for the lamp height
  const tw = [1, 0];                                    // how much of headline 1 / 2 shows

  function coverBox(zoom) {                             // crop of the photo that fills the canvas
    const sa = W / H; let sx, sy;
    if (sa > S.a) { sx = 1; sy = S.a / sa; } else { sx = sa / S.a; sy = 1; }
    sx /= zoom; sy /= zoom;
    return { cx: clamp(S.focus[0], sx / 2, 1 - sx / 2), cy: clamp(S.focus[1], sy / 2, 1 - sy / 2), sx, sy };
  }
  const zoomNow = () => 1.06 + 0.1 * heroP;
  function depthAt(u, v) {
    if (!dgrid) return .4;
    const x = clamp(u, 0, 1) * (dgrid.w - 1), y = clamp(v, 0, 1) * (dgrid.h - 1);
    const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(dgrid.w - 1, x0 + 1), y1 = Math.min(dgrid.h - 1, y0 + 1);
    const fx = x - x0, fy = y - y0, g = (i, j) => dgrid.d[j * dgrid.w + i];
    return mix(mix(g(x0, y0), g(x1, y0), fx), mix(g(x0, y1), g(x1, y1), fx), fy);
  }

  function heroProgress() {
    const range = hero.offsetHeight - innerHeight;
    heroP = clamp((scrollY - hero.offsetTop) / range, 0, 1);
    /* the headline swaps with a margin, so a finger resting near the switch does not flip it back and forth */
    const want = lit ? heroP > 0.31 : heroP > 0.37;
    if (want !== lit) {
      lit = want;
      hero.classList.toggle('is-lit', lit);
    }
    const second = lit;
    lines[0].classList.toggle('is-on', !second);
    lines[1].classList.toggle('is-on', second);
    const past = scrollY > hero.offsetTop + range + innerHeight * 0.55;
    nav.classList.toggle('is-solid', past);
    nav.classList.toggle('is-lit', lit && !past);
  }
  /* hall lights follow the finger: the further down, the brighter, smoothed over ~0.1 s.
     (16. 11. 2026: a switch at 36 % with two flashes of the tubes blinked every time a swipe crossed it, 20 jumps in one swipe) */
  function ambTarget() {
    const k = clamp((heroP - .2) / .3, 0, 1);
    return k * k * (3 - 2 * k);
  }

  /* ---------- pointer ---------- */
  function pointerTo(e) {
    const r = cv.getBoundingClientRect();
    const sx = (e.clientX - r.left) / r.width, sy = (e.clientY - r.top) / r.height;
    const b = coverBox(zoomNow());
    lamp.tx = b.cx + (sx - .5) * b.sx; lamp.ty = b.cy + (sy - .5) * b.sy;
    lamp.seen = performance.now();
    par.tx = (sx - .5); par.ty = (sy - .5);
  }
  addEventListener('pointermove', e => { if (visible) pointerTo(e); }, { passive: true });
  addEventListener('pointerdown', e => { if (visible) pointerTo(e); }, { passive: true });

  /* ---------- WebGL ---------- */
  const VS = 'attribute vec2 a;varying vec2 vUv;void main(){vUv=a*.5+.5;gl_Position=vec4(a,0.,1.);}';
  const FS = `precision highp float;
varying vec2 vUv;
uniform sampler2D uT,uD,uX;
uniform vec2 uC,uS,uL,uPar,uTw;
uniform float uA,uLH,uAmb,uTD,uK;
const float HS=.36;
float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
float hsh(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
void main(){
  vec2 s=vec2(vUv.x,1.-vUv.y);
  vec2 u=uC+(s-.5)*uS;
  u+=uPar*(texture2D(uD,u).r-.3);
  vec3 r=texture2D(uD,u).rgb;                       /* r = depth, g/b = slope of the relief */
  vec3 c=texture2D(uT,u).rgb;c*=c;
  /* headline stands in the hall at depth uTD: whatever is nearer hides it */
  float m=dot(texture2D(uX,s).rg,uTw)*(1.-smoothstep(uTD-.03,uTD+.03,r.r));
  vec2 g=(r.gb-.502)*6.;
  float edge=smoothstep(1.3,2.7,length(g));         /* a depth jump is an edge, not a slope */
  g*=1.-edge;
  vec3 n=normalize(vec3(-g*(1.-m),1.));
  float h=mix(r.r,uTD,m)*HS;
  /* lamp */
  vec3 L=vec3((uL-u)*vec2(uA,1.)*uK,uLH-h);         /* uK: the upright photo is narrow, the pool of light shrinks with it */
  float d2=dot(L,L);vec3 l=L*inversesqrt(d2);
  float dif=clamp(dot(n,l)*.8+.2,0.,1.);
  float att=.05/(d2+.022)*exp(-d2*6.5);
  float j=.2+hsh(gl_FragCoord.xy+3.)*.6,occ=0.;
  for(int i=0;i<20;i++){
    float t=(float(i)+j)/20.;t=t*t*.93+.02;
    occ=max(occ,texture2D(uD,mix(u,uL,t)).r*HS-mix(h,uLH,t)-.016);
  }
  float sh=1.-smoothstep(0.,.07,occ)*.94;
  vec3 hv=normalize(l+vec3(0.,0.,1.));
  float sp=pow(max(dot(n,hv),0.),42.)*(1.-m);
  vec3 lc=vec3(1.,.83,.62);
  float I=dif*2.4*att*sh;                           /* how much lamp light lands here */
  vec3 lampL=(c*lc*dif*2.4+lc*sp*(.1+c.g*.9)*.5)*att*sh;
  lampL*=1.-edge*.86*(1.-m);                        /* the seam between near and far stays dark, never a bright rim */
  lampL=lampL/(1.+lampL*.4);
  float lum=dot(c,vec3(.3,.6,.1));
  vec3 night=c*vec3(.0095,.0145,.029)*(1.+7.*smoothstep(.5,1.,lum));
  float vg=smoothstep(1.15,.25,length((s-.5)*vec2(1.,1.15)));
  night*=mix(.5,1.,vg);
  float gd=length((u-uL)*vec2(uA,1.));
  vec3 bulb=lc*(exp(-gd*gd*14000.)*1.6+exp(-gd*gd*520.)*.11+exp(-gd*gd*40.)*.018);
  /* the headline reads in the dark (pale paint) and turns to ink where the lamp lands and when the hall is lit */
  vec3 tx=mix((vec3(.25,.27,.32)+lc*I*.55)*mix(.72,1.,vg),vec3(.006,.007,.008),smoothstep(.42,.52,I));
  vec3 dark=mix(night+lampL,tx,m*.96)+bulb;
  vec3 day=mix(c,vec3(.010,.012,.014),m*.96)+lampL*.05*(1.-m);
  vec3 col=mix(dark,day,uAmb);
  col*=1.-smoothstep(.52,.9,s.y)*mix(.25,.62,uAmb);  /* darker foreground under the small text */
  gl_FragColor=vec4(sqrt(max(col,0.))+(hsh(gl_FragCoord.xy)-.5)/255.,1.);
}`;
  let gl = null, U = {}, tex = [null, null], ready = false, visible = true, quality = 1;
  function initGL() {
    try { gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' }); } catch (_) { gl = null; }
    if (!gl) return false;
    const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    let pr;
    try {
      pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    } catch (err) { console.warn('shader', err); gl = null; return false; }
    gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uT', 'uD', 'uX', 'uC', 'uS', 'uL', 'uPar', 'uTw', 'uA', 'uLH', 'uAmb', 'uTD', 'uK'].forEach(k => U[k] = gl.getUniformLocation(pr, k));
    gl.uniform1i(U.uT, 0); gl.uniform1i(U.uD, 1); gl.uniform1i(U.uX, 2);
    return true;
  }
  function upload(unit, img) {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    return t;
  }
  const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = no; i.src = src; });
  async function loadSet(key) {
    const s = SETS[key];
    const [photo, depth] = await Promise.all([loadImg(s.src), loadImg(s.d)]);
    if (key !== pickSet()) return;                      // turned meanwhile
    const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    let src = photo;
    if (photo.naturalWidth > max || photo.naturalHeight > max) {     // very old phones
      const k = max / Math.max(photo.naturalWidth, photo.naturalHeight), c = document.createElement('canvas');
      c.width = Math.floor(photo.naturalWidth * k); c.height = Math.floor(photo.naturalHeight * k);
      c.getContext('2d').drawImage(photo, 0, 0, c.width, c.height); src = c;
    }
    const old = tex;
    tex = [upload(0, src), upload(1, depth)];
    old.forEach(t => t && gl.deleteTexture(t));
    const gw = 96, gh = Math.max(8, Math.round(96 / s.a)), c2 = document.createElement('canvas');
    c2.width = gw; c2.height = gh;
    const g2 = c2.getContext('2d', { willReadFrequently: true }); g2.drawImage(depth, 0, 0, gw, gh);
    const px = g2.getImageData(0, 0, gw, gh).data, d = new Float32Array(gw * gh);
    for (let i = 0; i < d.length; i++) d[i] = px[i * 4] / 255;
    dgrid = { w: gw, h: gh, d };
    setKey = key; S = s;
    lamp.x = lamp.tx = s.wander[0] - s.wander[2]; lamp.y = lamp.ty = s.wander[1];
    resize(); ready = true;
    hero.classList.add('is-gl');
  }
  /* headline as a texture: line 1 in the red channel, line 2 in the green one; laid out on the canvas of the pin */
  const tc = document.createElement('canvas'); let ttex = null, tkey = '', fontOk = 0;
  function drawText() {
    if (!gl || !S) return;
    const key = setKey + '|' + Math.round(W) + '|' + Math.round(H) + '|' + fontOk;
    if (key === tkey) return; tkey = key;
    const k = Math.min(2048 / W, Math.min(devicePixelRatio || 1, 2));
    tc.width = Math.round(W * k); tc.height = Math.round(H * k);
    const g = tc.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, tc.width, tc.height);
    g.globalCompositeOperation = 'lighter'; g.textBaseline = 'alphabetic';
    const b = coverBox(1.06), yOf = v => (v - (b.cy - b.sy / 2)) / b.sy * H;
    const pad = Math.min(72, Math.max(20, W * .046));
    const top = Math.max(yOf(S.band[0]), W < 700 ? 78 : 92), base = yOf(S.band[1]);
    /* portrait: start right of the lift post, wherever the crop of the photo puts it (post = its right edge in the photo) */
    const left = S.post ? Math.max(pad, (S.post - (b.cx - b.sx / 2)) / b.sx * W + W * .014) : pad;
    const fam = '600 100px "Barlow Condensed","Arial Narrow",sans-serif', LH = .9;
    S.text.forEach((rows, ch) => {
      g.font = fam;
      const wide = Math.max(...rows.map(t => g.measureText(t).width)) / 100;      // in em
      const em = Math.max(30, Math.min((W - left - pad * .7) / wide, (base - top) / (.92 + (rows.length - 1) * LH)));
      g.font = fam.replace('100px', (em * k).toFixed(1) + 'px');
      g.fillStyle = ch ? '#0f0' : '#f00';
      rows.forEach((t, i) => g.fillText(t, (left - em * .03) * k, (base - (rows.length - 1 - i) * LH * em) * k));
    });
    if (!ttex) {
      ttex = gl.createTexture(); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, ttex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, ttex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tc);
  }
  if (document.fonts && document.fonts.load) {
    document.fonts.load('600 80px "Barlow Condensed"', 'POSVÍTÍME').then(() => { fontOk = 1; drawText(); }, () => {});
  }
  function resize() {
    const r = pin.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    if (!gl) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.5) * quality;
    const w = Math.round(W * dpr), h = Math.round(H * dpr);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
    drawText();
  }

  let last = performance.now(), slow = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(64, now - last); last = now;
    if (!ready || !visible) return;
    if (dt > 30) { if (++slow > 40 && quality > .55) { quality -= .2; slow = 0; resize(); } } else if (slow > 0) slow--;
    amb += (ambTarget() - amb) * (1 - Math.exp(-dt / 110));
    /* lamp: follows the pointer for a few seconds after it moved, otherwise wanders round the car */
    const idle = now - lamp.seen > 3800;
    if (idle && !reduced) {
      const t = now / 1000, w = S.wander;
      lamp.tx = w[0] + Math.sin(t * .31) * w[2] + Math.sin(t * .83 + 1.3) * w[2] * .16;
      lamp.ty = w[1] + Math.sin(t * .47 + .6) * w[3] + Math.cos(t * .21) * w[3] * .5;
      par.tx = Math.sin(t * .23) * .22; par.ty = Math.cos(t * .19) * .12;
    }
    const k = 1 - Math.exp(-dt / (idle ? 420 : 95));
    lamp.x += (lamp.tx - lamp.x) * k; lamp.y += (lamp.ty - lamp.y) * k;
    const hTarget = Math.max(depthAt(lamp.x, lamp.y), S.td) * .36 + .1;   // never behind the headline
    lamp.h += (hTarget - lamp.h) * (1 - Math.exp(-dt / 160));
    const kp = 1 - Math.exp(-dt / 260);
    par.x += (par.tx - par.x) * kp; par.y += (par.ty - par.y) * kp;

    const b = coverBox(zoomNow());
    gl.uniform2f(U.uC, b.cx, b.cy); gl.uniform2f(U.uS, b.sx, b.sy);
    gl.uniform2f(U.uL, lamp.x, lamp.y); gl.uniform1f(U.uLH, lamp.h);
    gl.uniform2f(U.uPar, -par.x * .022 * b.sx, -par.y * .016 * b.sy);
    const kt = 1 - Math.exp(-dt / 140);
    tw[0] += ((lit ? 0 : 1) - tw[0]) * kt; tw[1] += ((lit ? 1 : 0) - tw[1]) * kt;
    gl.uniform2f(U.uTw, tw[0], tw[1]); gl.uniform1f(U.uTD, S.td); gl.uniform1f(U.uK, S.k);
    gl.uniform1f(U.uA, S.a); gl.uniform1f(U.uAmb, amb);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  if (initGL()) {
    loadSet(pickSet()).catch(err => console.warn('hero', err));
    requestAnimationFrame(frame);
    new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '10% 0px' }).observe(hero);
    let rz = 0;
    addEventListener('resize', () => {
      clearTimeout(rz);
      rz = setTimeout(() => { if (pickSet() !== setKey) loadSet(pickSet()).catch(() => {}); else resize(); heroProgress(); }, 120);
    });
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); ready = false; hero.classList.remove('is-gl'); });
  }
  addEventListener('scroll', heroProgress, { passive: true });
  heroProgress();
  window.__hero = { lamp, get amb() { return amb; }, set(x, y) { lamp.tx = x; lamp.ty = y; lamp.seen = performance.now() + 6e5; } };

  /* ---------- services: prohlídka haly s lampou (J 16. 11. 2026, Q9) ----------
     Posun stránky vede kameru po fotce haly: přehled → brzdy → STK → pneu → motor → klima → diagnostika.
     Kamera se nikdy nezastaví (lineární složka v ease), lampa kolem místa ztmaví zbytek haly. */
  (function tour() {
    const sec = $('#sluzby'); if (!sec) return;
    const pinEl = $('.tour__pin', sec), img = $('.tour__img', sec), dark = $('.tour__dark', sec), ring = $('.tour__ring', sec), cards = $$('.tour__card', sec), ticks = $$('.tour__ticks i', sec);
    const portrait = matchMedia('(max-aspect-ratio: 4/5)'), narrow = matchMedia('(max-width:760px)');
    const N = cards.length;
    let spots = [], iw = 0, ih = 0, W = 0, VH = 0, PH = 0, ready = false, cur = -9, ticking = false;
    const parse = s => s.split(',').map(Number);
    function readSpots() {
      const k = portrait.matches ? 'p' : 'l';
      spots = cards.map(c => { const a = parse(c.dataset[k]); return { u: a[0], v: a[1], z: a[2] }; });
    }
    function measure() {
      W = innerWidth; VH = innerHeight; PH = pinEl.offsetHeight;
      iw = img.naturalWidth; ih = img.naturalHeight;
      if (!iw) return;
      img.style.width = iw + 'px'; img.style.height = ih + 'px';
      sec.style.setProperty('--vh', VH + 'px');
      const small = narrow.matches || portrait.matches;
      const tab = small && W >= 600;   // tablet na výšku: menší kužel, místo níž (J 16. 11.)
      const fx = small ? W * .5 : W * .64, fy = small ? VH * (tab ? .4 : .34) : VH * .5;
      const lr = Math.min(W, VH) * (tab ? .58 : small ? .78 : .62);
      sec.style.setProperty('--fx', fx + 'px'); sec.style.setProperty('--fy', fy + 'px'); sec.style.setProperty('--lr', lr + 'px');
      measure.fx = fx; measure.fy = fy; measure.lr = lr;
      readSpots(); cur = -9; draw();
    }
    const ease = t => t * .45 + (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) * .55;
    function cam(p) {           /* p: -1 přehled, 0..N-1 místa */
      const s0 = Math.max(W / iw, PH / ih);
      const A = i => i < 0 ? { u: .5, v: .5, z: 1, all: true } : spots[i];
      const i0 = Math.floor(p), t = ease(p - i0), a = A(Math.max(-1, i0)), b = A(Math.min(N - 1, i0 + 1));
      const z = Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * t);
      const s = s0 * z;
      // přehled = střed fotky ve středu plochy; místa = bod pod lampou
      const fxA = a.all ? W / 2 : measure.fx, fyA = a.all ? PH / 2 : measure.fy;
      const fxB = b.all ? W / 2 : measure.fx, fyB = b.all ? PH / 2 : measure.fy;
      const fx = fxA + (fxB - fxA) * t, fy = fyA + (fyB - fyA) * t;
      const u = a.u + (b.u - a.u) * t, v = a.v + (b.v - a.v) * t;
      let tx = fx - u * iw * s, ty = fy - v * ih * s;
      tx = Math.min(0, Math.max(W - iw * s, tx)); ty = Math.min(0, Math.max(PH - ih * s, ty));
      img.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) scale(' + s.toFixed(4) + ')';
      // lampa jde za skutečnou polohou místa (u kraje fotky ho kamera nedostane doprostřed)
      const lx = u * iw * s + tx, ly = v * ih * s + ty, lr = measure.lr;
      dark.style.transform = 'translate3d(' + (lx - lr / 2).toFixed(1) + 'px,' + (ly - lr / 2).toFixed(1) + 'px,0)';
      ring.style.transform = 'translate3d(' + lx.toFixed(1) + 'px,' + ly.toFixed(1) + 'px,0)';
    }
    function draw() {
      if (!ready) return;
      const r = sec.getBoundingClientRect(), range = sec.offsetHeight - PH;
      const q = clamp(-r.top / Math.max(1, range), 0, 1);          // 0..1 přes celý oddíl
      // první 1,4 dílu přehled + nájezd na první místo, pak N-1 přejezdů, na konci chvíli stát u posledního
      const p = clamp(q * (N + .6) - 1.4, -1, N - 1);
      cam(p);
      const dk = clamp((p + .75) / .6, 0, 1);                       // tma kolem lampy
      sec.style.setProperty('--dk', (dk * .97).toFixed(3));
      sec.style.setProperty('--hd', clamp(1 - (p + .9) / .45, 0, 1).toFixed(3));
      sec.style.setProperty('--rg', clamp((p + .3) / .3, 0, 1).toFixed(3));
      cards.forEach((c, i) => {
        const d = p - i, o = clamp(1 - Math.abs(d) * 2.4, 0, 1);
        c.style.opacity = o.toFixed(3);
        c.style.visibility = o > 0.01 ? 'visible' : 'hidden';
        c.style.setProperty('--o', (-d * 40).toFixed(1));
      });
      const on = Math.round(clamp(p, 0, N - 1));
      if (on !== cur) { cur = on; ticks.forEach((t, i) => t.classList.toggle('on', i <= on && p > -.5)); }
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; draw(); }); } }
    function start() {
      if (ready) return;
      sec.classList.add('is-on'); ready = true; measure();
      addEventListener('scroll', onScroll, { passive: true });
      if (lenis) lenis.on('scroll', onScroll);
      let lastW = innerWidth;
      addEventListener('resize', () => { if (innerWidth !== lastW || !narrow.matches) { lastW = innerWidth; measure(); } else { sec.style.setProperty('--vh', innerHeight + 'px'); VH = innerHeight; draw(); } });
      portrait.addEventListener && portrait.addEventListener('change', () => { img.addEventListener('load', measure, { once: true }); });
    }
    // fotku načíst včas (oddíl je pod úvodem), pak teprve připnout
    img.loading = 'eager';
    if (img.complete && img.naturalWidth) start(); else img.addEventListener('load', start, { once: true });
  })();

  /* ---------- steps: the line fills as the block passes ---------- */
  const track = $('#stepsTrack'), stepEls = $$('li', track);
  function stepsProgress() {
    const r = track.getBoundingClientRect();
    const p = clamp((innerHeight * .78 - r.top) / (r.height + innerHeight * .28), 0, 1);
    track.style.setProperty('--p', p.toFixed(4));
    stepEls.forEach((li, i) => li.classList.toggle('is-on', p >= i / stepEls.length + .02));
  }
  addEventListener('scroll', stepsProgress, { passive: true });
  stepsProgress();

  /* ---------- open now? ---------- */
  (function status() {
    const el = $('#status'); if (!el) return;
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Prague', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const get = t => parts.find(p => p.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    const m = (+get('hour') % 24) * 60 + +get('minute');
    const H = d => (d >= 1 && d <= 5 ? [420, 1020] : d === 6 ? [480, 720] : null);
    const fmt = x => Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0');
    const names = ['v neděli', 'v pondělí', 'v úterý', 've středu', 've čtvrtek', 'v pátek', 'v sobotu'];
    const h = H(day);
    if (h && m >= h[0] && m < h[1]) { el.textContent = 'Teď máme otevřeno, do ' + fmt(h[1]) + '.'; el.classList.add('is-open'); return; }
    if (h && m < h[0]) { el.textContent = 'Teď je zavřeno, otevíráme dnes v ' + fmt(h[0]) + '.'; return; }
    for (let i = 1; i <= 7; i++) { const d = (day + i) % 7, hh = H(d); if (hh) { el.textContent = 'Teď je zavřeno, otevíráme ' + (i === 1 ? 'zítra' : names[d]) + ' v ' + fmt(hh[0]) + '.'; return; } }
  })();

  /* ---------- reveal ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach(el => io.observe(el));
})();
