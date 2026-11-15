// Úvod E „Město z písmen“ (N2, 15. 11. 2026): shora je to obyčejný nadpis. Posunem písmena vyrostou v černé
// věže (kamera přitom couvá a zužuje záběr, takže nadpis drží místo), pak se kamera skloní a letí nízko
// nad městem k nejvyšší věži „Vás“. Výškové pole z masky písma, paprsek krok po kroku, stíny ke slunci.
import { canvas, hero, smooth, mix, easeInOut, words, textMask, fullscreen, fit, refit, loop, head } from './uvod-lib.js';

const FS = `#version 300 es
precision highp float;
in vec2 v; out vec4 o;
uniform vec2 uRes; uniform vec3 uC, uF, uR, uU; uniform float uTan, uAsp, uHg, uHv, uFog, uDpr;
uniform vec4 uBox; uniform vec3 uSunD; uniform sampler2D uMask;
const vec3 PAPER = vec3(.879,.871,.84), INK = vec3(.0062);
vec2 M(vec2 xz){ return texture(uMask, xz/uRes).rg; }
float hgt(vec2 xz){ vec2 m = M(xz); return max(smoothstep(.35,.65,m.r)*uHg, smoothstep(.35,.65,m.g)*uHv); }
bool box(vec3 ro, vec3 rd, float hm, out float t0, out float t1){
  vec3 lo = vec3(uBox.x, 0., uBox.y), hi = vec3(uBox.z, hm, uBox.w);
  vec3 ir = 1./rd, a = (lo-ro)*ir, b = (hi-ro)*ir, mn = min(a,b), mx = max(a,b);
  t0 = max(max(mn.x, mn.y), max(mn.z, 0.)); t1 = min(min(mx.x, mx.y), mx.z); return t1 > t0;
}
float shadow(vec3 p){
  float hm = max(uHg, uHv); if (hm < .5) return 1.;
  float t0, t1; if (!box(p + uSunD*.6, uSunD, hm, t0, t1)) return 1.;
  float s = 1., dt = (t1 - t0)/28.;
  for (int i = 0; i < 28; i++){ vec3 q = p + uSunD*(.6 + t0 + dt*(float(i)+.5)); float h = hgt(q.xz);
    if (h > .3 && q.y < h) { s = 0.; break; } }
  return s;
}
void main(){
  vec2 nd = vec2(v.x*2.-1., 1.-v.y*2.);
  vec3 rd = normalize(uF + nd.x*uTan*uAsp*uR + nd.y*uTan*uU), ro = uC;
  float hm = max(uHg, uHv), tg = rd.y < 0. ? -ro.y/rd.y : 1e9;
  vec3 col; float tHit = tg, tIn = tg; int kind = 0;   // 0 země, 1 věž
  float t0, t1;
  if (hm > .5 && box(ro, rd, hm, t0, t1)){
    t1 = min(t1, tg + 1.);
    float dt = (t1 - t0)/200., tp = t0;
    for (int i = 0; i < 200; i++){
      float t = t0 + dt*float(i+1); vec3 p = ro + rd*t;
      float hh = hgt(p.xz);
      if (hh > .3 && p.y < hh){ float a = tp, b = t;
        for (int k = 0; k < 7; k++){ float m = .5*(a+b); vec3 q = ro + rd*m; float qh = hgt(q.xz); if (qh > .3 && q.y < qh) b = m; else a = m; }
        tHit = a; tIn = b; kind = 1; break; }
      tp = t;
    }
  }
  vec3 p = ro + rd*tHit;
  if (kind == 0 && tg > 1e8){ col = PAPER; }
  else if (kind == 0){
    vec2 m = M(p.xz);
    col = mix(PAPER, INK, m.r*(1. - smoothstep(.0, .5, hm)));           // shora jen namalované písmo
    float sh = shadow(p);
    float ao = 1. - .35*smoothstep(0., 1., (M(p.xz + vec2(9.,0)).r + M(p.xz - vec2(9.,0)).r + M(p.xz + vec2(0,9.)).r + M(p.xz - vec2(0,9.)).r)*.25)*smoothstep(.5, 30., hm);
    col *= mix(.62, 1., sh)*ao;
  } else {
    vec3 pin = ro + rd*tIn; float h = hgt(pin.xz), e = 4.;
    vec2 g = vec2(M(p.xz + vec2(e,0)).r - M(p.xz - vec2(e,0)).r, M(p.xz + vec2(0,e)).r - M(p.xz - vec2(0,e)).r)
           + vec2(M(p.xz + vec2(e,0)).g - M(p.xz - vec2(e,0)).g, M(p.xz + vec2(0,e)).g - M(p.xz - vec2(0,e)).g);
    float full = M(pin.xz).g > .5 ? uHv : uHg;                          // stěna = svah masky, střecha = plná výška
    bool top = pin.y > full - 1.5 || length(g) < .02;
    vec3 n = top ? vec3(0,1,0) : normalize(vec3(-g.x, 0., -g.y));
    float dif = max(0., dot(n, uSunD));                                  // stěny bez vrženého stínu (zrnil)
    // bílý model z papíru s černými střechami: písmo je čitelné i z boku
    float up = smoothstep(0., uHv, p.y);
    col = top ? INK + vec3(.012)*dif : PAPER*(.30 + .62*dif + .08*(.5+.5*n.z))*mix(.78, 1., up);
  }
  col = mix(col, PAPER*1.02, (1. - exp(-tHit*uFog))*step(.5, hm));   // opar do dálky
  col *= 1. + (fract(sin(dot(v*uRes*1.37, vec2(12.9898,78.233)))*43758.5453) - .5)*.025;
  o = vec4(pow(clamp(col, 0., 1.), vec3(1./2.2)), 1.);
}`;

let G, S = null;
try { G = fullscreen(FS, ['uRes', 'uC', 'uF', 'uR', 'uU', 'uTan', 'uAsp', 'uHg', 'uHv', 'uFog', 'uDpr', 'uBox', 'uSunD', 'uMask']); }
catch (e) { console.warn(e); }

let scale = null, slow = 0;
function layout() {
  const f = fit(scale ?? 1.25, scale ?? 1.5); if (!f || !G) return;
  const { W, H, dpr } = f, ws = words();
  // R = všechna slova, G = jen „Vás“ (nejvyšší věž)
  const m = textMask(W, H, Math.min(dpr, 1.5), ws, x => {
    for (const w of ws.list) { x.fillStyle = w === ws.vas ? '#ffff00' : '#ff0000'; x.fillText(w.t, w.x, w.y + x.measureText(w.t).fontBoundingBoxAscent); }
  });
  G.tex(0, m); G.gl.uniform1i(G.U.uMask, 0); G.gl.viewport(0, 0, canvas.width, canvas.height);
  const b = ws.box, v = ws.vas;
  S = { W, H, dpr, fs: ws.fs, box: [b.l - 4, b.t - 4, b.r + 4, b.b + 4], vx: v.x + v.w / 2, vz: v.y + v.h * 0.62 };
  hero.classList.add('gl');
}

const norm = a => { const l = Math.hypot(...a); return a.map(q => q / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

loop((p, dt) => {
  if (!G || !S) return;
  // když to nestíhá (víc než ~33 ms na snímek), jednou zmenšit rozlišení
  if (scale === null && p > 0.06 && p < 0.9) { slow = dt > 0.034 ? slow + 1 : Math.max(0, slow - 1); if (slow > 20) { scale = 1; refit(); layout(); } }
  const { gl, U } = G, { W, H, fs } = S;
  const ext = easeInOut(smooth(0.04, 0.34, p));            // věže rostou
  const tilt = easeInOut(smooth(0.3, 0.74, p));             // kamera se sklání
  const push = easeInOut(smooth(0.66, 0.9, p));             // dolet k „Vás“
  // dolly zoom: vzdálenost klesá, záběr na zemi zůstává stejný
  const d0 = H * 30, d1 = H * 1.7, dist = mix(mix(d0, d1, Math.pow(ext, 0.35)), Math.min(H, W * 1.5) * 1.05, tilt) * mix(1, 0.8, push);   // na výšku blíž
  const tanH = mix((H / 2) / mix(d0, d1, Math.pow(ext, 0.35)), W / H < 0.8 ? 0.62 : 0.48, tilt);
  const hv = fs * mix(2.4, 4.2, ext) * ext;
  const tx = mix(W / 2, S.vx, tilt), tz = mix(H / 2, S.vz + fs * 0.2, tilt), ty = hv * 0.55 * tilt;
  const ang = mix(0.0001, 0.98, tilt);
  const C = [tx, ty + dist * Math.cos(ang), tz + dist * Math.sin(ang)];
  const F = norm([tx - C[0], ty - C[1], tz - C[2]]), R = [1, 0, 0], Up = norm(cross(R, F));
  gl.uniform2f(U.uRes, W, H); gl.uniform3f(U.uC, ...C); gl.uniform3f(U.uF, ...F); gl.uniform3f(U.uR, ...R); gl.uniform3f(U.uU, ...Up);
  gl.uniform1f(U.uTan, tanH); gl.uniform1f(U.uAsp, W / H); gl.uniform1f(U.uHg, fs * 2.2 * ext); gl.uniform1f(U.uHv, hv);
  gl.uniform1f(U.uFog, 0.00012 * tilt); gl.uniform1f(U.uDpr, S.dpr);
  gl.uniform4f(U.uBox, ...S.box); gl.uniform3f(U.uSunD, ...norm([-0.6, 0.58, 0.55]));
  G.draw();
  head(true);
  window.__state = () => ({ p: +p.toFixed(3), ext: +ext.toFixed(2), tilt: +tilt.toFixed(2), scale, cw: canvas.width });
}, layout);
