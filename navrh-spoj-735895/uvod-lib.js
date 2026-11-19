// Společný základ úvodů B–E (N2, Z 15. 11. 2026 21:4x: „hodně nápadů na první stránku, co nejvíc wow a zároveň
// minimalistické, ne přeplácané, a zároveň grandiózní“). Úvod se volí adresou ?u=a…e, zbytek stránky je stejný.
// Tady: prvky stránky, poloha slov skutečného <h1>, maska písma do plátna, celoplošný shader, smyčka s posunem.

export const stage = document.getElementById('uvod');
export const pin = stage.querySelector('.s3d-pin');
export const canvas = document.getElementById('gl');
export const hero = document.getElementById('hero');
export const h1 = hero.querySelector('h1');
export const veil = document.getElementById('veil');
export const reduce = matchMedia('(min-width:100000px)').matches;
export const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

export const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const mix = (a, b, t) => a + (b - a) * t;
export const mix3 = (a, b, t) => a.map((q, i) => q + (b[i] - q) * t);
export const lin = h => [1, 3, 5].map(i => Math.pow(parseInt(h.slice(i, i + 2), 16) / 255, 2.2));

export function progress() {
  const r = stage.getBoundingClientRect();
  return Math.min(1, Math.max(0, -r.top / Math.max(1, stage.offsetHeight - pin.offsetHeight)));
}

// slova nadpisu s polohou v pin (CSS px) + písmo
export function words() {
  const cs = getComputedStyle(h1), base = pin.getBoundingClientRect(), out = [];
  const walk = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
  for (let n; (n = walk.nextNode());) {
    const re = /[^\s ]+/g; let m;
    while ((m = re.exec(n.data))) {
      const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
      const b = r.getClientRects()[0]; if (!b) continue;
      out.push({ t: m[0], x: b.left - base.left, y: b.top - base.top, w: b.width, h: b.height });
    }
  }
  const font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const ls = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
  const box = out.reduce((a, w) => ({ l: Math.min(a.l, w.x), t: Math.min(a.t, w.y), r: Math.max(a.r, w.x + w.w), b: Math.max(a.b, w.y + w.h) }), { l: 1e9, t: 1e9, r: -1e9, b: -1e9 });
  return { list: out, font, ls, fs: parseFloat(cs.fontSize), box, vas: out.find(w => w.t === 'Vás') || out[0] };
}

// maska písma: bílé písmo na černé, celé plátno W×H v měřítku k
export function textMask(W, H, k, ws, draw) {
  const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k);
  const x = c.getContext('2d', { willReadFrequently: true });
  x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
  x.setTransform(k, 0, 0, k, 0, 0);
  x.font = ws.font; x.fontStretch = 'condensed'; if ('letterSpacing' in x) x.letterSpacing = ws.ls;
  x.fillStyle = '#fff'; x.textBaseline = 'alphabetic';
  if (draw) draw(x); else for (const w of ws.list) x.fillText(w.t, w.x, w.y + x.measureText(w.t).fontBoundingBoxAscent);
  return c;
}

// celoplošný shader (WebGL2): vrátí { gl, U (uniformy), tex(unit, source|null, wrap), draw() }
export function fullscreen(fs, names) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  if (!gl) throw new Error('bez WebGL2 zůstane obyčejný nadpis');
  const vs = `#version 300 es
in vec2 a; out vec2 v;
void main(){ v = vec2(a.x*.5+.5, .5-a.y*.5); gl_Position = vec4(a, 0., 1.); }`;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  gl.useProgram(p);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const U = {}; for (const n of names) U[n] = gl.getUniformLocation(p, n);
  const texs = {};
  const tex = (unit, src, wrap) => {
    let t = texs[unit];
    if (!t) { t = texs[unit] = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      const w = wrap ? gl.REPEAT : gl.CLAMP_TO_EDGE;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, w); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, w); }
    gl.activeTexture(gl.TEXTURE0 + unit);
    if (src) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    return t;
  };
  return { gl, U, tex, draw: () => gl.drawArrays(gl.TRIANGLES, 0, 3) };
}

// velikost plátna; vrátí true, když se opravdu změnila (lišta prohlížeče na mobilu výšku nemění)
let lastKey = '';
export const refit = () => { lastKey = ''; };
export function fit(scaleMobile = 1.75, scaleDesk = 2) {
  const W = canvas.clientWidth, H = canvas.clientHeight, key = `${W}x${H}x${devicePixelRatio}`;
  if (key === lastKey) return null; lastKey = key;
  const dpr = Math.min(devicePixelRatio, innerWidth < 700 ? scaleMobile : scaleDesk);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  return { W, H, dpr };
}

// smyčka: fn(p, dt, clock, mouse) každý snímek; p = vyhlazený posun 0..1 (window.__P = pevný bod pro snímky)
export function loop(fn, onResize) {
  let cur = 0, last = performance.now(), clock = 0;
  const m = { x: 0, y: 0, tx: 0, ty: 0, px: -1, py: -1, on: false };
  if (fine) addEventListener('pointermove', e => { m.tx = e.clientX / innerWidth * 2 - 1; m.ty = e.clientY / innerHeight * 2 - 1; m.px = e.clientX; m.py = e.clientY; m.on = true; });
  const go = () => { onResize(); requestAnimationFrame(frame); };
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
    const want = reduce ? 0 : (window.__P ?? progress());
    cur += (want - cur) * (1 - Math.exp(-dt * 6)); if (Math.abs(want - cur) < 1e-4) cur = want;
    m.x += (m.tx - m.x) * (1 - Math.exp(-dt * 3)); m.y += (m.ty - m.y) * (1 - Math.exp(-dt * 3));
    fn(cur, dt, clock, m);
    hero.style.setProperty('--fade', String(1 - smooth(0.02, 0.16, cur)));
    veil.style.opacity = String(smooth(0.86, 0.97, cur));
    requestAnimationFrame(frame);
  }
  addEventListener('resize', () => { clearTimeout(go.t); clearTimeout(go.u); go.t = setTimeout(onResize, 120); go.u = setTimeout(() => { lastKey = ''; onResize(); }, 700); });
  (document.fonts ? document.fonts.load('800 100px Archivo', 'Vás zákazníci').then(() => document.fonts.ready) : Promise.resolve()).then(go);
}
export const head = light => window.wlHeadHero && window.wlHeadHero(light);
