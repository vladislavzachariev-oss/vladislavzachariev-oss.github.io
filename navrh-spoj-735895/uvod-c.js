// Úvod C „Zatmění“ (N2, 15. 11. 2026): světlá stránka se sluncem; posunem přejede měsíc, světlo zvolna mizí,
// diamantový prsten, úplné zatmění s korónou a hvězdami, nadpis se v temnu rozsvítí. Pak závoj do tmavé části.
import { canvas, hero, reduce, smooth, mix, easeInOut, words, textMask, fullscreen, fit, loop, head } from './uvod-lib.js';

const FS = `#version 300 es
precision highp float;
in vec2 v; out vec4 o;
uniform vec2 uRes; uniform vec3 uSun; uniform vec2 uMoon; uniform float uL, uRing, uCor, uTxt, uT, uDpr;
uniform vec4 uVas; uniform sampler2D uMask;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
void main(){
  vec2 px = v*uRes; float R = uSun.z;
  vec2 ds = px - uSun.xy; float d = length(ds);
  float dm = length(px - uMoon);
  vec3 paper = vec3(.879,.871,.84), night = vec3(.0032,.0036,.0058);
  vec3 cool = mix(vec3(.80,.86,1.), vec3(1.), smoothstep(.35,1.,uL));
  vec3 bg = mix(night, paper*cool, uL);
  // slunce: kotouč s okrajovým ztmavením + teplá záře do papíru
  float aa = 1.2/uDpr;
  float disc = 1.-smoothstep(R-aa, R+aa, d);
  float limb = sqrt(max(0., 1.-min(1., d/R)*min(1., d/R)));
  vec3 sunC = vec3(1.,.94,.82)*1.18*(.72+.28*limb);
  float glow = exp(-max(0., d-R)/(R*.55))*.32 + exp(-max(0., d-R)/(R*2.6))*.10;
  float moonIn = 1.-smoothstep(R*1.004-aa, R*1.004+aa, dm);
  vec3 col = bg + vec3(1.,.9,.72)*glow*uL*uL;
  // měsíc: ve dne vidět jen tam, kde zakrývá slunce; v úplném zatmění černý
  vec3 moonC = col*mix(.04, 1., smoothstep(0., .6, uL))*mix(1., .8, disc);
  col = mix(mix(col, sunC, disc), moonC, moonIn);
  // koróna: paprsky podle úhlu, slábne se vzdáleností
  float r = max(d/R, 1.);
  vec2 dir = ds/max(d, 1e-3); float lr = log(r);
  float st = vn(dir*4.2*(1.+.12*lr) + vec2(7.3, 2.1) + uT*.004)*.62 + vn(dir*11.*(1.+.2*lr) + vec2(1.7, 9.4))*.38;
  st = pow(st, 2.2)*2.6;
  float cor = (pow(1./r, 3.4)*(.35+1.1*st) + exp(-(r-1.)*30.)*1.3)*(1.-moonIn);
  // protuberance: drobné růžové jazyky u okraje
  float pr = smoothstep(.74, .92, vn(dir*7.+vec2(3.,5.)))*exp(-(r-1.)*55.)*(1.-moonIn);
  col += uCor*(vec3(.92,.95,1.)*cor*.75 + vec3(1.,.25,.35)*pr*1.4);
  // hvězdy
  vec2 g = floor(px/38.); vec2 fp = fract(px/38.) - (vec2(h21(g), h21(g+7.))*.7+.15);
  float sh = step(.86, h21(g+3.1));
  float star = sh*exp(-dot(fp,fp)*38.*38./(1.6*1.6/(uDpr*uDpr)+1.))*(.55+.45*sin(uT*1.7+h21(g)*40.));
  col += vec3(.85,.9,1.)*star*uCor*.75*(1.-moonIn);
  // diamantový prsten: poslední paprsek slunce na okraji měsíce
  vec2 ringP = uSun.xy + normalize(uSun.xy - uMoon + vec2(1e-4))*R;
  vec2 rd = px - ringP; float rl = length(rd);
  float core = exp(-rl*rl/(R*R*.006));
  float bloom = exp(-rl/(R*.22))*.9 + exp(-rl/(R*.9))*.3;
  float rays = exp(-abs(rd.y)/(1.+R*.008))*exp(-abs(rd.x)/(R*.9)) + exp(-abs(rd.x)/(1.+R*.008))*exp(-abs(rd.y)/(R*.6))*.5;
  col += uRing*vec3(1.,.97,.9)*(core*4. + bloom*mix(1., .3, moonIn) + rays*.7);
  // papír
  col *= 1. + (h21(px*1.37) - .5)*.035*uL;
  // nadpis z masky: inkoust ve dne, světlo v temnu; „Vás“ o kus jasnější
  float m = texture(uMask, v).r;
  float vas = step(uVas.x, px.x)*step(px.x, uVas.z)*step(uVas.y, px.y)*step(px.y, uVas.w);
  vec3 ink = vec3(.0070), lit = mix(vec3(.62,.6,.57), vec3(1.,.96,.88), vas);
  col = mix(col, mix(ink, lit, uTxt), m);
  o = vec4(pow(clamp(col, 0., 1.), vec3(1./2.2)), 1.);
}`;

let TOP = 0, G, S = null, vasR = [0, 0, 0, 0];
try { G = fullscreen(FS, ['uRes', 'uSun', 'uMoon', 'uL', 'uRing', 'uCor', 'uTxt', 'uT', 'uDpr', 'uVas', 'uMask']); }
catch (e) { console.warn(e); }

// plocha překryvu dvou stejných kruhů / plocha kruhu
const cover = (d, R) => { if (d >= 2 * R) return 0; const q = d / (2 * R); return (2 / Math.PI) * (Math.acos(q) - q * Math.sqrt(1 - q * q)); };

function layout() {
  const f = fit(); if (!f || !G) return;
  const { W, H, dpr } = f, ws = words(), port = W / H < 0.8;
  const m = textMask(W, H, dpr, ws);
  const { gl } = G; gl.viewport(0, 0, canvas.width, canvas.height);
  G.tex(0, m); gl.uniform1i(G.U.uMask, 0);
  const R = port ? Math.min(W * 0.25, H * 0.13) : Math.min(W, H) * 0.155;
  const top = ws.box.t; TOP = top;                         // slunce nad nadpisem, nikdy do něj
  const cy = port ? Math.max(R * 1.9, Math.min(H * 0.24, top - R * 1.5)) : Math.max(R * 1.6, Math.min(H * 0.3, top - R * 0.9));
  S = { W, H, dpr, R, cx: port ? W * 0.62 : W * 0.7, cy };
  const v = ws.vas; vasR = [v.x - 2, v.y, v.x + v.w + 2, v.y + v.h];
  hero.classList.add('gl');
}

loop((p, dt, clock, ms) => {
  if (!G || !S) return;
  const { gl, U } = G, { R } = S;
  const sx = S.cx + ms.x * R * 0.12, sy = S.cy + ms.y * R * 0.08;
  // měsíc přijíždí zleva zdola, zpomaluje do úplného zatmění kolem p 0,56
  const t = 1 - Math.pow(1 - smooth(0.04, 0.56, p), 2.2);
  const off = (1 - t) * 2.35 * R, ang = 2.55;
  const mx = sx + Math.cos(ang) * off, my = sy + Math.sin(ang) * off;
  const f = cover(Math.hypot(mx - sx, my - sy), R * 1.004);
  const L = Math.max(0, 1 - Math.pow(f, 5.5)) * 0.985 + 0.015 * (1 - f);
  const ring = smooth(0.955, 0.993, f) * (1 - smooth(0.9975, 1, f));
  const cor = smooth(0.985, 1, f);
  const txt = smooth(0.5, 0.18, L);
  gl.uniform2f(U.uRes, S.W, S.H); gl.uniform1f(U.uDpr, S.dpr);
  gl.uniform3f(U.uSun, sx, sy, R); gl.uniform2f(U.uMoon, mx, my);
  gl.uniform1f(U.uL, L); gl.uniform1f(U.uRing, ring); gl.uniform1f(U.uCor, cor);
  gl.uniform1f(U.uTxt, txt); gl.uniform1f(U.uT, clock);
  gl.uniform4f(U.uVas, ...vasR);
  G.draw();
  head(L > 0.42);
  window.__state = () => ({ p: +p.toFixed(3), f: +f.toFixed(4), L: +L.toFixed(3), ring: +ring.toFixed(2), cor: +cor.toFixed(2), W: S.W, H: S.H, R: Math.round(S.R), cy: Math.round(S.cy), top: Math.round(TOP), ih: innerHeight });
}, layout);
