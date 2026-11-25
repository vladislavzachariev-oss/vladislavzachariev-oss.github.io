/* pohyb.js — jeden výpočet pohybu kamery pro nástroj „Pohyb kamery“, pro weby a (stejná čísla) pro Blender
   přes tools/pohyb.py. Souřadnice jako three.js: Y nahoru, metry. Úhel az 0 = kamera na straně +Z, 90 = na straně +X;
   el = výška nad vodorovnou rovinou cíle; d = vzdálenost od cíle; lens = ohnisko v mm na 36 mm delší strany obrazu.

   Pohyb m = { v:1, dur:s, path:'kolem'|'rovne', ease:[x1,y1,x2,y2], ruka:0..1.5, aspect:'9:16'|'16:9',
               keys:[{az, el, d, tx, ty, tz, lens, roll}, …] }
   Záběry nemají vlastní čas: kamera projede všemi plynule (Catmull-Rom), rychlost po dráze je rovnoměrná
   a průběh v čase určuje jen křivka ease (rozjezd a dojezd), takže uprostřed nikdy nezastaví. */

export const PRESETY = {
  stroj: [0, 0, 1, 1],
  plynule: [0.45, 0, 0.55, 1],
  rozjezd: [0.5, 0, 1, 1],
  dojezd: [0.2, 0.6, 0.35, 1],
  svih: [0.7, 0, 0.15, 1],
};

export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t, dX = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = X(t) - x;
      if (Math.abs(e) < 1e-7) return Y(t);
      const d = dX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1;
    t = x;
    for (let i = 0; i < 50; i++) {
      const v = X(t);
      if (Math.abs(v - x) < 1e-7) break;
      if (v < x) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return Y(t);
  };
}

function monotone(xs, ys) {            // Fritsch–Carlson: hladká a nikdy necouvá
  const n = xs.length;
  if (n === 1) return () => ys[0];
  const d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
    if (h > 9) { const s = 3 / Math.sqrt(h); m[i] = s * a * d[i]; m[i + 1] = s * b * d[i]; }
  }
  return x => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

function kanal(vals, s) {               // Catmull-Rom přes hodnoty záběrů, konce zrcadlené
  const n = vals.length;
  if (n === 1) return vals[0];
  const i = Math.min(Math.floor(s), n - 2), t = s - i;
  const g = k => k < 0 ? 2 * vals[0] - vals[1] : k > n - 1 ? 2 * vals[n - 1] - vals[n - 2] : vals[k];
  const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2), t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

const R = Math.PI / 180;
export function kamera(k) {             // poloha kamery jednoho záběru
  const c = Math.cos(k.el * R);
  return [k.tx + k.d * Math.sin(k.az * R) * c, k.ty + k.d * Math.sin(k.el * R), k.tz + k.d * Math.cos(k.az * R) * c];
}

function delka(a, b, path) {           // „délka“ úseku mezi záběry: dráha kamery + posun cíle + zoom + náklon
  const dm = (a.d + b.d) / 2, dt = Math.hypot(b.tx - a.tx, b.ty - a.ty, b.tz - a.tz);
  let L;
  if (path === 'rovne') {
    const ca = kamera(a), cb = kamera(b);
    L = Math.hypot(cb[0] - ca[0], cb[1] - ca[1], cb[2] - ca[2]);
  } else {
    const ec = Math.cos((a.el + b.el) / 2 * R);
    L = Math.hypot((b.az - a.az) * R * dm * ec, (b.el - a.el) * R * dm, b.d - a.d);
  }
  return L + dt + dm * Math.abs(Math.log(b.lens / a.lens)) + dm * Math.abs(b.roll - a.roll) * R * 0.3;
}

const TAU = 2 * Math.PI;
const n1 = T => Math.sin(TAU * 0.37 * T + 1.3) + 0.5 * Math.sin(TAU * 0.83 * T + 0.4) + 0.25 * Math.sin(TAU * 1.71 * T + 2.2);
const n2 = T => Math.sin(TAU * 0.29 * T + 2.1) + 0.5 * Math.sin(TAU * 0.71 * T + 3.3) + 0.25 * Math.sin(TAU * 1.53 * T + 0.9);
const n3 = T => Math.sin(TAU * 0.23 * T + 0.7) + 0.5 * Math.sin(TAU * 0.61 * T + 1.9) + 0.25 * Math.sin(TAU * 1.37 * T + 2.8);

/* priprav(m) → { poza(T), prijezdy:[s], …}; poza(T) = { cam:[x,y,z], tgt:[x,y,z], lens, roll } */
export function priprav(m) {
  const K = m.keys, n = K.length, ez = bezier(...m.ease);
  const cum = [0];
  for (let i = 0; i < n - 1; i++) cum.push(cum[i] + Math.max(delka(K[i], K[i + 1], m.path), 1e-6));
  const tot = cum[n - 1] || 1;
  const frac = cum.map(c => n > 1 ? c / tot : 0);
  const sOf = monotone(frac.length > 1 ? frac : [0, 1], frac.length > 1 ? frac.map((_, i) => i) : [0, 0]);
  const col = f => K.map(f);
  const ch = m.path === 'rovne'
    ? { cx: col(k => kamera(k)[0]), cy: col(k => kamera(k)[1]), cz: col(k => kamera(k)[2]) }
    : { az: col(k => k.az), el: col(k => k.el), ld: col(k => Math.log(k.d)) };
  const tx = col(k => k.tx), ty = col(k => k.ty), tz = col(k => k.tz), lens = col(k => Math.log(k.lens)), roll = col(k => k.roll);
  const poza = T => {
    const p = ez(Math.min(1, Math.max(0, T / m.dur)));
    const s = n > 1 ? Math.min(n - 1, Math.max(0, sOf(p))) : 0;
    const tgt = [kanal(tx, s), kanal(ty, s), kanal(tz, s)];
    let cam;
    if (m.path === 'rovne') cam = [kanal(ch.cx, s), kanal(ch.cy, s), kanal(ch.cz, s)];
    else {
      const a = kanal(ch.az, s) * R, e = kanal(ch.el, s) * R, d = Math.exp(kanal(ch.ld, s)), c = Math.cos(e);
      cam = [tgt[0] + d * Math.sin(a) * c, tgt[1] + d * Math.sin(e), tgt[2] + d * Math.cos(a) * c];
    }
    let rl = kanal(roll, s);
    const A = m.ruka || 0;
    if (A) {                               // ruka kameramana: drobné, stále stejné chvění (Blender dostane totéž)
      const f = [tgt[0] - cam[0], tgt[1] - cam[1], tgt[2] - cam[2]], dd = Math.hypot(...f);
      const fx = f[0] / dd, fy = f[1] / dd, fz = f[2] / dd;
      let rx = -fz, rz = fx;                // right = fwd × (0,1,0)
      const rn = Math.hypot(rx, rz) || 1; rx /= rn; rz /= rn;
      const ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;   // up = right × fwd
      const a1 = dd * 0.008 * A * n1(T), a2 = dd * 0.006 * A * n2(T);
      tgt[0] += rx * a1 + ux * a2; tgt[1] += uy * a2; tgt[2] += rz * a1 + uz * a2;
      rl += 0.6 * A * n3(T);
    }
    return { cam, tgt, lens: Math.exp(kanal(lens, s)), roll: rl };
  };
  // kdy kamera projede jednotlivé záběry (pro popis a značky na ose)
  const prijezdy = frac.map(f => {
    let lo = 0, hi = 1;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (ez(mid) < f) lo = mid; else hi = mid; }
    return (lo + hi) / 2 * m.dur;
  });
  return { poza, prijezdy };
}

/* svislý zorný úhel three.js z ohniska: 36 mm na delší straně obrazu (jako Blender, sensor_fit AUTO) */
export function fovV(lens, aspect) {
  const half = 18 / lens;
  return 2 * Math.atan(aspect >= 1 ? half / aspect : half) / R;
}

/* odkaz: #m=<base64url JSON> */
const r = (x, k) => Math.round(x * 10 ** k) / 10 ** k;
export function zabal(m) {
  const o = { v: 1, dur: r(m.dur, 2), path: m.path, ease: m.ease.map(x => r(x, 3)), ruka: r(m.ruka || 0, 2), aspect: m.aspect,
    keys: m.keys.map(k => [r(k.az, 1), r(k.el, 1), r(k.d, 2), r(k.tx, 3), r(k.ty, 3), r(k.tz, 3), r(k.lens, 1), r(k.roll, 1)]) };
  if (m.pozn) o.pozn = m.pozn;            // co má pohyb dělat, slovy Z
  const b = btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function rozbal(s) {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  const o = JSON.parse(decodeURIComponent(escape(atob(b + '==='.slice((b.length + 3) % 4)))));
  return { ...o, keys: o.keys.map(([az, el, d, tx, ty, tz, lens, roll]) => ({ az, el, d, tx, ty, tz, lens, roll })) };
}

/* plynulý posun jako Oryzo a Igloo (změřeno v jejich kódu 25. 11. 2026): x += (cíl − x)·(1 − e^(−k·dt)) */
export const dobeh = (x, cil, k, dt) => x + (cil - x) * (1 - Math.exp(-k * dt));
