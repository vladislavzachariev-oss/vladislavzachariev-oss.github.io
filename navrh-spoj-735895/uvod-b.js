// Úvod B „Hladina“ (N2, 15. 11. 2026): nadpis stojí na klidné vodní hladině. Posunem slunce zapadá za „Vás“,
// obloha jde do zlata a soumraku, hladina zrcadlí nebe i písmo a pod sluncem se třpytí cesta. Pak závoj do tmy.
import { canvas, hero, smooth, mix, mix3, easeInOut, words, textMask, fullscreen, fit, loop, head } from './uvod-lib.js';

const FS = `#version 300 es
precision highp float;
in vec2 v; out vec4 o;
uniform vec2 uRes; uniform float uHy, uT, uDpr, uRefl, uSunI;
uniform vec3 uTop, uHor, uSun, uSunC, uInk;   // uSun = x, y, poloměr (CSS px)
uniform sampler2D uMask;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
vec3 sky(vec2 q){
  float y = clamp(q.y/uHy, 0., 1.);
  vec3 c = mix(uTop, uHor, pow(y, 2.2));
  float d = length(q - uSun.xy), R = uSun.z;
  c += uSunC*(exp(-max(0., d-R)/(R*.5))*.16 + exp(-max(0., d-R)/(R*4.))*.16)*uSunI;
  c += uSunC*.5*exp(-abs(q.y - uHy)/(uRes.y*.035))*exp(-abs(q.x - uSun.x)/(uRes.x*.35))*uSunI;   // záře nad obzorem
  float disc = 1. - smoothstep(R - 1.2/uDpr, R + 1.2/uDpr, d);
  return mix(c, uSunC*1.25, disc*step(q.y, uHy));
}
vec3 scene(vec2 q){ return mix(sky(q), uInk, texture(uMask, q/uRes).r); }
void main(){
  vec2 px = v*uRes;
  vec3 col;
  if (px.y <= uHy) col = scene(px);
  else {
    float dd = px.y - uHy, depth = dd/max(1., uRes.y - uHy);
    float s = .06 + depth;                                    // vlny se u obzoru zhušťují
    vec2 wq = vec2(px.x/(140.*s), dd/(10.*s) - uT*.35);
    float n1 = vn(wq) - .5, n2 = vn(wq*2.13 + 4.1) - .5;
    vec2 off = vec2(n1*26., (n1 + n2)*10.)*s*uRefl;
    vec2 rq = vec2(px.x + off.x, uHy - dd + off.y);
    rq.y = min(rq.y, uHy - .5);
    float fres = mix(.78, .3, smoothstep(0., .8, depth));
    vec3 deep = uTop*.35 + uHor*.05;
    col = mix(scene(px), mix(deep, scene(rq), fres), uRefl);
    // třpyt: drobné jiskry ve sloupci pod sluncem
    float g = pow(vn(vec2(px.x*.16/s, dd*.7/s + uT*1.7)), 24.)*16.;
    float lane = exp(-abs(px.x - uSun.x)/(uSun.z*(1.2 + depth*5.)));
    col += uSunC*g*lane*uSunI*uRefl*(1. - smoothstep(.0, .9, depth))*1.4;
    col *= 1. - .04*smoothstep(0., 1., depth)*uRefl;
  }
  col *= 1. + (h21(px*1.37) - .5)*.03;
  o = vec4(pow(clamp(col, 0., 1.), vec3(1./2.2)), 1.);
}`;

let G, S = null;
try { G = fullscreen(FS, ['uRes', 'uHy', 'uT', 'uDpr', 'uRefl', 'uSunI', 'uTop', 'uHor', 'uSun', 'uSunC', 'uInk', 'uMask']); }
catch (e) { console.warn(e); }

function layout() {
  const f = fit(); if (!f || !G) return;
  const { W, H, dpr } = f, ws = words();
  G.tex(0, textMask(W, H, dpr, ws)); G.gl.uniform1i(G.U.uMask, 0);
  G.gl.viewport(0, 0, canvas.width, canvas.height);
  // obzor = účaří posledního řádku nadpisu
  const last = ws.list.reduce((a, w) => w.y > a.y ? w : a, ws.list[0]);
  const hy = last.y + last.h * 0.86;
  const v = ws.vas;
  S = { W, H, dpr, hy, sx: v.x + v.w * 0.5, R: Math.min(W, H) * (W < 700 ? 0.09 : 0.075), top: ws.box.t };
  hero.classList.add('gl');
}

// obloha v čase: [p, nahoře, u obzoru, barva slunce]
const K = [
  [0.00, [.879, .871, .84], [.90, .885, .85], [1., .95, .86]],
  [0.30, [.70, .70, .72], [1., .80, .55], [1., .86, .62]],
  [0.50, [.30, .25, .32], [1., .52, .22], [1., .58, .25]],
  [0.64, [.05, .04, .07], [.85, .24, .08], [1., .36, .12]],
  [0.80, [.006, .007, .014], [.2, .07, .05], [1., .3, .1]],
];
function at(p) {
  let i = 0; while (i < K.length - 2 && p > K[i + 1][0]) i++;
  const a = K[i], b = K[i + 1], t = easeInOut(Math.min(1, Math.max(0, (p - a[0]) / (b[0] - a[0]))));
  return [mix3(a[1], b[1], t), mix3(a[2], b[2], t), mix3(a[3], b[3], t)];
}

loop((p, dt, clock, ms) => {
  if (!G || !S) return;
  const { gl, U } = G, [top, hor, sc] = at(p);
  // slunce: vysoko a bledé → klesá k obzoru za „Vás“ → zapadne pod hladinu kolem p 0,7
  const k = easeInOut(smooth(0.02, 0.7, p));
  const y0 = Math.min(S.H * 0.2, S.top - S.R * 2.2), y1 = S.hy + S.R * 1.1;
  const sx = mix(S.W * (S.W < 700 ? 0.7 : 0.78), S.sx, easeInOut(smooth(0.02, 0.5, p))) + ms.x * S.R * 0.15;
  const sy = mix(Math.max(S.R * 1.6, y0), y1, k);
  const R = S.R * mix(1, 1.18, k);
  const refl = smooth(0.03, 0.17, p);
  const sunI = mix(0.6, 1.25, smooth(0.1, 0.5, p)) * (1 - smooth(0.66, 0.82, p) * 0.85);
  gl.uniform2f(U.uRes, S.W, S.H); gl.uniform1f(U.uHy, S.hy); gl.uniform1f(U.uT, clock); gl.uniform1f(U.uDpr, S.dpr);
  gl.uniform1f(U.uRefl, refl); gl.uniform1f(U.uSunI, sunI);
  gl.uniform3f(U.uTop, ...top); gl.uniform3f(U.uHor, ...hor); gl.uniform3f(U.uSun, sx, sy, R); gl.uniform3fv(U.uSunC, sc);
  gl.uniform3f(U.uInk, .0055, .0055, .0065);
  G.draw();
  head(top[0] + top[1] > 0.6);
  window.__state = () => ({ p: +p.toFixed(3), hy: Math.round(S.hy), sy: Math.round(sy) });
}, layout);
