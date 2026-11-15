// Úvod v3 „Slepotisk ve světle“ (M1, Z 15. 11. 2026 21:05: „vymysli něco lepšího než čočku, ještě nějaký jiný nápad“).
// Nadpis je vytlačený do papíru bez barvy, čitelný jen světlem a stínem. Posunem přejde přes papír den: světlo obejde
// nadpis, stíny se otočí a prodlouží, zezlátne, přijde soumrak. Ve tmě nadpis projede jedna lampa a zastaví se na „Vás“
// (lidé Vás najdou). Z tmy pak vyjede tmavá část „Když někdo hledá…“. Na počítači světlo jde za myší jako lampa v ruce.
// Bez knihoven: jeden shader přes celou plochu. Výška písma = vzdálenost od kraje tahu (vypočtená jednou při načtení),
// stíny = krokování výškovou mapou ke světlu. Skutečný <h1> zůstává v HTML (průhledný): čtečky, hledání, výběr.
// Předchozí úvod (skleněná čočka) je v uvod-cocka.js, telefon s weby v uvod-telefon.js.

const stage = document.getElementById('uvod');
const pin = stage.querySelector('.s3d-pin');
const canvas = document.getElementById('gl');
const hero = document.getElementById('hero');
const h1 = hero.querySelector('h1');
const veil = document.getElementById('veil');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
if (!gl) throw new Error('bez WebGL2 zůstane obyčejný nadpis');

const VS = `#version 300 es
in vec2 a; out vec2 v;
void main(){ v = vec2(a.x*.5+.5, .5-a.y*.5); gl_Position = vec4(a, 0., 1.); }`;
const FS = `#version 300 es
precision highp float;
in vec2 v; out vec4 o;
uniform sampler2D uH, uN;
uniform vec2 uRes, uHo, uHs;          // velikost plochy (CSS px); výšková mapa: počátek a velikost (CSS px)
uniform float uHp, uCap;              // výška tisku (px), nejdelší stín (px)
uniform vec3 uSunDir, uSunCol, uAmb, uAlb, uSpotPos, uSpotCol;
uniform vec2 uSpotR, uSpotC;         // kužel lampy: vnitřní a vnější poloměr, střed na papíře
uniform float uSeed;
float hgt(vec2 p){ vec2 t = (p - uHo) / uHs; if (any(lessThan(t, vec2(0.))) || any(greaterThan(t, vec2(1.)))) return 0.;
  vec4 c = texture(uH, t); return (c.r + c.g / 255.) * uHp; }
float pap(vec2 p){ return texture(uN, p / 210.).r + .5 * texture(uN, p / 67. + .37).r; }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }
float shade(vec2 p, float z, vec2 d, float tn, float len, float j){
  float s = 1.;
  for (int i = 0; i < 22; i++){
    float t = len * (float(i) + j) / 22.;
    float zs = hgt(p + d * t), rz = z + t * tn;
    s = min(s, smoothstep(-.3 - t * .09, .3 + t * .09, rz - zs));
  }
  return s;
}
void main(){
  vec2 p = v * uRes;
  float z = hgt(p), e = .7;
  float hx = (hgt(p + vec2(e, 0.)) - hgt(p - vec2(e, 0.))) / (2. * e);
  float hy = (hgt(p + vec2(0., e)) - hgt(p - vec2(0., e))) / (2. * e);
  float nx = pap(p + vec2(1., 0.)) - pap(p - vec2(1., 0.)), ny = pap(p + vec2(0., 1.)) - pap(p - vec2(0., 1.));
  vec3 N = normalize(vec3(-hx - nx * .025, -hy - ny * .025, 1.));
  float j = hash(p);
  vec3 col = uAmb;
  // slunce (vzdálené světlo)
  if (dot(uSunCol, uSunCol) > 1e-5) {
    float lxy = length(uSunDir.xy), tn = uSunDir.z / max(lxy, 1e-3);
    float sh = lxy > 1e-3 ? shade(p, z, uSunDir.xy / lxy, tn, min(uCap, uHp * 1.05 / max(tn, 1e-3)), j) : 1.;
    col += uSunCol * max(dot(N, uSunDir), 0.) * sh;
  }
  // lampa (bodové světlo s kuželem)
  if (dot(uSpotCol, uSpotCol) > 1e-5) {
    vec3 Lv = uSpotPos - vec3(p, z);
    float r = length(p - uSpotC);
    float cone = (1. - smoothstep(uSpotR.x, uSpotR.y, r)) + .055 * (1. - smoothstep(uSpotR.x, uSpotR.y * 2.1, r));   // kužel + slabý rozptyl kolem
    if (cone > 0.) {
      vec3 L = normalize(Lv); float lxy = length(Lv.xy), tn = Lv.z / max(lxy, 1e-3);
      float sh = lxy > 1. ? shade(p, z, Lv.xy / lxy, tn, min(min(uCap, lxy), uHp * 1.05 / max(tn, 1e-3)), j) : 1.;
      col += uSpotCol * cone * max(dot(N, L), 0.) * sh;
    }
  }
  col *= uAlb * (1. + (pap(p) - .75) * .018);
  col = col / (1. + max(col - .92, 0.) * 1.6);                  // měkké přesvětlení hran, ne čistá bílá
  vec3 s = pow(max(col, 0.), vec3(1. / 2.2));
  o = vec4(s + (j - .5) / 255., 1.);
}`;

function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
const prog = gl.createProgram();
gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
gl.bindAttribLocation(prog, 0, 'a'); gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
gl.useProgram(prog);
const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
const U = {}; for (const n of ['uH', 'uN', 'uRes', 'uHo', 'uHs', 'uHp', 'uCap', 'uSunDir', 'uSunCol', 'uAmb', 'uAlb', 'uSpotPos', 'uSpotCol', 'uSpotR', 'uSpotC', 'uSeed']) U[n] = gl.getUniformLocation(prog, n);

function tex(unit, wrap) {
  const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap); return t;
}
const tH = tex(0, gl.CLAMP_TO_EDGE), tN = tex(1, gl.REPEAT);
gl.uniform1i(U.uH, 0); gl.uniform1i(U.uN, 1);

// vlákna papíru: náhodný šum, třikrát rozmazaný, dokola navazující (256×256)
{
  const S = 256; let a = new Float32Array(S * S).map(() => Math.random());
  for (let k = 0; k < 3; k++) { const b = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { let s = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += a[((y + dy + S) % S) * S + (x + dx + S) % S];
      b[y * S + x] = s / 9; } a = b; }
  let lo = 1, hi = 0; for (const q of a) { lo = Math.min(lo, q); hi = Math.max(hi, q); }
  const px = new Uint8Array(S * S * 4); for (let i = 0; i < S * S; i++) px[i * 4] = Math.round((a[i] - lo) / (hi - lo) * 255);
  gl.activeTexture(gl.TEXTURE1); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, S, S, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
}

const lin = h => [1, 3, 5].map(i => Math.pow(parseInt(h.slice(i, i + 2), 16) / 255, 2.2));
const ALB = lin('#f3f1ec');
let W = 1, H = 1, dpr = 1, words = [], vas = null, hb = null, hp = 4, lastWH = '';

// výšková mapa nadpisu: písmo bíle na černou, pak vzdálenost od kraje tahu → zaoblená hrana (slepotisk)
function layoutText() {
  const cs = getComputedStyle(h1), base = pin.getBoundingClientRect(), fs = parseFloat(cs.fontSize);
  words = []; vas = null;
  const walk = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
  for (let n; (n = walk.nextNode());) {
    const re = /[^\s ]+/g; let m;
    while ((m = re.exec(n.data))) {
      const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
      const b = r.getClientRects()[0]; if (!b) continue;
      const w = { t: m[0], x: b.left - base.left, y: b.top - base.top, w: b.width, h: b.height };
      words.push(w); if (m[0] === 'Vás') vas = w;
    }
  }
  if (!words.length) return;
  hb = words.reduce((a, w) => ({ l: Math.min(a.l, w.x), t: Math.min(a.t, w.y), r: Math.max(a.r, w.x + w.w), b: Math.max(a.b, w.y + w.h) }), { l: 1e9, t: 1e9, r: -1e9, b: -1e9 });
  const pad = fs * 0.3, ox = Math.max(0, hb.l - pad), oy = Math.max(0, hb.t - pad);
  const ow = Math.min(W, hb.r + pad) - ox, oh = Math.min(H, hb.b + pad) - oy;
  const k = Math.min(Math.max(2, devicePixelRatio), 3, 4096 / Math.max(ow, oh));
  const tw = Math.round(ow * k), th = Math.round(oh * k);
  const c = document.createElement('canvas'); c.width = tw; c.height = th;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.setTransform(k, 0, 0, k, -ox * k, -oy * k);
  x.fillStyle = '#000'; x.fillRect(ox, oy, ow, oh);
  x.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; x.fontStretch = 'condensed';
  if ('letterSpacing' in x) x.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
  x.fillStyle = '#fff'; x.textBaseline = 'alphabetic';
  for (const w of words) x.fillText(w.t, w.x, w.y + x.measureText(w.t).fontBoundingBoxAscent);
  const d = x.getImageData(0, 0, tw, th).data, N = tw * th, D = new Float32Array(N), R2 = Math.SQRT2;
  for (let i = 0; i < N; i++) D[i] = d[i * 4] >= 128 ? 1e6 : 0;
  for (let y = 0; y < th; y++) for (let xx = 0; xx < tw; xx++) { const i = y * tw + xx; if (!D[i]) continue;
    let m = D[i]; if (xx) m = Math.min(m, D[i - 1] + 1); else m = Math.min(m, 1);
    if (y) { m = Math.min(m, D[i - tw] + 1); if (xx) m = Math.min(m, D[i - tw - 1] + R2); if (xx < tw - 1) m = Math.min(m, D[i - tw + 1] + R2); } else m = Math.min(m, 1);
    D[i] = m; }
  for (let y = th - 1; y >= 0; y--) for (let xx = tw - 1; xx >= 0; xx--) { const i = y * tw + xx; if (!D[i]) continue;
    let m = D[i]; if (xx < tw - 1) m = Math.min(m, D[i + 1] + 1);
    if (y < th - 1) { m = Math.min(m, D[i + tw] + 1); if (xx < tw - 1) m = Math.min(m, D[i + tw + 1] + R2); if (xx) m = Math.min(m, D[i + tw - 1] + R2); }
    D[i] = m; }
  const bevel = Math.max(2, fs * 0.055) * k;              // šířka zaoblení hrany (v pixelech mapy)
  hp = Math.max(1.8, fs * 0.032);                         // výška tisku (CSS px)
  const out = new Uint8Array(N * 4);
  for (let i = 0; i < N; i++) {
    const cov = d[i * 4] / 255, dist = D[i] ? D[i] - 0.5 + (cov - 0.5) : cov * 0.5;   // podpixelový kraj z vyhlazení písma
    const t = Math.min(1, Math.max(0, dist / bevel)), h = 1 - (1 - t) * (1 - t);
    const v = h * 255, hi = Math.floor(v); out[i * 4] = hi; out[i * 4 + 1] = Math.round((v - hi) * 255);
  }
  gl.activeTexture(gl.TEXTURE0); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, tw, th, 0, gl.RGBA, gl.UNSIGNED_BYTE, out);
  gl.uniform2f(U.uHo, ox, oy); gl.uniform2f(U.uHs, ow, oh); gl.uniform1f(U.uHp, hp); gl.uniform1f(U.uCap, hp * 22);
  hero.classList.add('gl');                              // skutečný nadpis zprůhlednit, až je vytlačený
}

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight, key = `${w}x${h}x${devicePixelRatio}`;
  if (key === lastWH) return; lastWH = key;              // lišta prohlížeče na mobilu výšku plátna nemění (lvh)
  W = w; H = h;
  dpr = Math.min(devicePixelRatio, innerWidth < 700 ? 1.75 : 2);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.uniform2f(U.uRes, W, H);
  layoutText();
}

const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => a.map((q, i) => q + (b[i] - q) * t);

function progress() {
  const r = stage.getBoundingClientRect();
  return Math.min(1, Math.max(0, -r.top / Math.max(1, stage.offsetHeight - pin.offsetHeight)));
}

let cur = 0, last = performance.now(), clock = 0, mx = 0, my = 0, tmx = 0, tmy = 0;
if (fine) addEventListener('pointermove', e => { tmx = e.clientX / innerWidth * 2 - 1; tmy = e.clientY / innerHeight * 2 - 1; });

const D2R = Math.PI / 180;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
  const want = reduce ? 0 : (window.__P ?? progress());   // __P = pevný bod časové osy pro snímky
  cur += (want - cur) * (1 - Math.exp(-dt * 6)); if (Math.abs(want - cur) < 1e-4) cur = want;
  const p = cur;
  mx += (tmx - mx) * (1 - Math.exp(-dt * 3)); my += (tmy - my) * (1 - Math.exp(-dt * 3));
  // den: světlo zleva shora obejde nadpis doprava a klesá k obzoru; v klidu se lehce houpe, na počítači jde za myší
  const day = easeInOut(smooth(0.03, 0.6, p));
  const calm = 1 - smooth(0.03, 0.2, p);
  const az = mix(-138, -18, day) * D2R + (Math.sin(clock * 0.23) * 0.1 + mx * 0.55) * calm;
  const el = (mix(24, 4, Math.pow(day, 0.7)) + (-my * 6 + Math.sin(clock * 0.31 + 1) * 1.2) * calm) * D2R;
  const sunDir = [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)];
  // jas papíru drží odpoledne skoro bílý a zlátne; tma přijde až se západem (dřív mdlá šedá plocha)
  const gold = smooth(0.08, 0.42, p), dusk = smooth(0.44, 0.6, p);
  const F = mix(1, 0.95, gold) * (1 - dusk) + 0.004 * dusk;
  const amb = mix3(mix3([0.42, 0.42, 0.43], [0.36, 0.33, 0.3], gold), [0.0032, 0.0036, 0.0055], dusk);   // noc ≈ #0b0c10 jako další část
  const hue = mix3(mix3([1.0, 0.98, 0.94], [1.16, 0.9, 0.62], gold), [1.42, 0.56, 0.28], smooth(0.42, 0.58, p));
  const sunI = Math.min(5, Math.max(0, F - (amb[0] + amb[1] + amb[2]) / 3) / Math.max(Math.sin(el), 0.06));
  const sunCol = hue.map(q => q * sunI);
  // lampa: ve tmě projede nadpis od prvního slova a zastaví se na „Vás“
  const lit = smooth(0.48, 0.62, p), seek = easeInOut(smooth(0.5, 0.76, p));
  let spot = [0, 0, 1], R0 = 1, R1 = 2;
  if (hb) {
    const f = words[0], tgt = vas || words[Math.floor(words.length / 2)];
    const sx = mix(f.x + f.w * 0.4, tgt.x + tgt.w / 2, seek) + Math.sin(seek * Math.PI * 2.2) * tgt.w * 0.35 * (1 - seek);
    const sy = mix(f.y + f.h * 0.5, tgt.y + tgt.h * 0.52, seek) + Math.sin(seek * Math.PI) * tgt.h * 0.25;
    const lh = Math.min(W, innerHeight) * 0.42;
    spot = [sx - lh * 0.45, sy - lh * 0.6, lh, sx, sy];  // lampa svítí zleva shora, ať je vidět tvar písmen
    R0 = tgt.w * mix(0.6, 0.5, seek); R1 = tgt.w * mix(1.5, 1.3, seek);
  }
  const spotCol = [1.5, 1.32, 1.08].map(q => q * lit);

  gl.uniform3fv(U.uSunDir, sunDir); gl.uniform3fv(U.uSunCol, sunCol); gl.uniform3fv(U.uAmb, amb); gl.uniform3fv(U.uAlb, ALB);
  gl.uniform3f(U.uSpotPos, spot[0], spot[1], spot[2]); gl.uniform3fv(U.uSpotCol, spotCol); gl.uniform2f(U.uSpotR, R0, R1);
  gl.uniform2f(U.uSpotC, spot[3] || 0, spot[4] || 0);
  gl.uniform1f(U.uSeed, (clock * 7.31) % 10);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  hero.style.setProperty('--fade', String(1 - smooth(0.02, 0.16, p)));
  veil.style.opacity = String(smooth(0.86, 0.97, p));
  window.wlHeadHero && window.wlHeadHero(p < 0.42);
  requestAnimationFrame(frame);
}

addEventListener('resize', () => { clearTimeout(resize.t); resize.t = setTimeout(resize, 120); });
(document.fonts ? document.fonts.load(`800 100px Archivo`, 'Vás zákazníci').then(() => document.fonts.ready) : Promise.resolve())
  .then(() => { resize(); requestAnimationFrame(frame); });
