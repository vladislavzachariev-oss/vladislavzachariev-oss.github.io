// Úvod D „Písek“ (N2, 15. 11. 2026): nadpis se zleva rozpadá na zrnka, vítr je odnese přes stránku
// a zrnka se pak slétnou do obřího „Vás“ přes celou obrazovku. Stav pohybu je čistá funkce posunu (p).
import { canvas, h1, smooth, words, textMask, fit, loop, head } from './uvod-lib.js';

const VS = `#version 300 es
in vec2 aS; in vec2 aE; in vec2 aR;
uniform vec2 uRes; uniform float uP, uT, uDpr;
out float vA;
const float PI = 3.14159265;
void main(){
  float W = uRes.x;
  float d0 = .06 + .22*aS.x/W;                          // čelo větru jde zleva doprava
  float t1 = clamp((uP - d0 - aR.x*.035)/.3, 0., 1.);
  float g = clamp((uP - .4 - aR.y*.13 - aE.x/W*.05)/.24, 0., 1.);
  float t2 = g < .5 ? 4.*g*g*g : 1. - pow(-2.*g + 2., 3.)/2.;
  vec2 sw = vec2(sin(aS.y*.012 + aR.x*6.283 + t1*4.2), cos(aS.x*.009 + aR.y*6.283 + t1*3.1));
  vec2 pb = aS + vec2(W*(.25 + .65*aR.x)*t1*t1, -uRes.y*.16*t1*(.4 + aR.y)) + sw*W*.025*t1;
  pb.y += sin(pb.x*.0042 + aS.y*.018 + aR.x*.8)*W*.045*t1;          // vlnité proudy jako písek nad dunou
  vec2 dir = aE - pb; vec2 nrm = vec2(-dir.y, dir.x);
  vec2 pos = mix(pb, aE, t2) + nrm*sin(PI*t2)*(aR.y - .5)*.35;
  float fly = t1*(1. - t2);
  pos += vec2(sin(uT*1.3 + aR.x*40.), cos(uT*1.1 + aR.y*40.))*3.*fly;
  float land = smoothstep(.75, 1., t2);
  vA = step(d0 - .012, uP)*mix(mix(.9, .5, fly), .95, land);
  gl_PointSize = mix(mix(1.55, 1.1, fly), 2.5, land)*uDpr;
  gl_Position = vec4(pos.x/uRes.x*2. - 1., 1. - pos.y/uRes.y*2., 0., 1.);
}`;
const FS = `#version 300 es
precision mediump float;
in float vA; out vec4 o;
void main(){ vec2 q = gl_PointCoord - .5; float a = vA*smoothstep(.5, .3, length(q)); o = vec4(vec3(.08)*a, a); }`;

let gl, prog, U = {}, vao, N = 0, S = null, h1L = 0;
try {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: true });
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  ['aS', 'aE', 'aR'].forEach((n, i) => gl.bindAttribLocation(prog, i, n)); gl.linkProgram(prog); gl.useProgram(prog);
  for (const n of ['uRes', 'uP', 'uT', 'uDpr']) U[n] = gl.getUniformLocation(prog, n);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
} catch (e) { console.warn(e); gl = null; }

// náhodné body uvnitř masky (bílá = písmo)
function inkPoints(c) {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, out = [];
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4] > 110) out.push(x, y);
  return out;
}
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function layout() {
  const f = fit(); if (!f || !gl) return;
  const { W, H, dpr } = f, ws = words(); seed = 7;
  gl.viewport(0, 0, canvas.width, canvas.height);
  const sp = inkPoints(textMask(W, H, 1, ws));
  // obří „Vás“ uprostřed: šířka ~80 % (mobil 90 %), výška nejvýš ~50 % obrazovky
  const big = textMask(W, H, 1, ws, x => {
    const fs0 = 100; x.font = ws.font.replace(/[\d.]+px/, fs0 + 'px');
    const m = x.measureText('Vás'), wr = (W < 700 ? .9 : .78) * W / m.width;
    const hh = (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) * wr, k = Math.min(wr, wr * (H * .5) / hh);
    x.font = ws.font.replace(/[\d.]+px/, fs0 * k + 'px');
    const m2 = x.measureText('Vás'), asc = m2.actualBoundingBoxAscent, des = m2.actualBoundingBoxDescent;
    x.fillText('Vás', (W - m2.width) / 2, H * .5 - (asc + des) / 2 + asc - H * .02);
  });
  const ep = inkPoints(big);
  const cap = W < 700 ? 70000 : 150000, n0 = sp.length / 2;
  N = Math.min(cap, n0); const keep = N / n0;
  const A = new Float32Array(N * 6); let j = 0;
  for (let i = 0; i < n0 && j < N; i++) {
    if (keep < 1 && rnd() > keep) continue;
    const e = (Math.floor(rnd() * (ep.length / 2))) * 2;
    A.set([sp[i * 2] + rnd(), sp[i * 2 + 1] + rnd(), ep[e] + rnd(), ep[e + 1] + rnd(), rnd(), rnd()], j * 6); j++;
  }
  N = j;
  if (!vao) { vao = gl.createVertexArray(); gl.bindVertexArray(vao); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    [[0, 0], [1, 8], [2, 16]].forEach(([l, o]) => { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 24, o); }); }
  gl.bufferData(gl.ARRAY_BUFFER, A.subarray(0, N * 6), gl.STATIC_DRAW);
  S = { W, H, dpr };
  h1L = h1.getBoundingClientRect().left;
}

loop((p, dt, clock) => {
  if (!gl || !S) return;
  gl.clearColor(.945, .941, .925, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform2f(U.uRes, S.W, S.H); gl.uniform1f(U.uP, p); gl.uniform1f(U.uT, clock); gl.uniform1f(U.uDpr, S.dpr);
  gl.drawArrays(gl.POINTS, 0, N);
  // ostrý nadpis mizí přesně tam, kde ho převzala zrnka
  const front = (p - 0.06 + 0.012) / 0.22 * S.W - h1L;
  const mk = p < 0.045 ? 'none' : `linear-gradient(90deg, transparent ${front.toFixed(1)}px, #000 ${(front + 1).toFixed(1)}px)`;
  h1.style.maskImage = h1.style.webkitMaskImage = mk;
  head(true);
  window.__state = () => ({ p: +p.toFixed(3), N, W: S.W, H: S.H });
}, layout);
