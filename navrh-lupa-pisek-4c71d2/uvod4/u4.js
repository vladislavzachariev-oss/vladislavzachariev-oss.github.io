/* P2 Písek nadpisů (Z 16. 11. 2026: lupa a písek; „víc barev, ať to souvisí s celou stránkou“).
   Jeden písek pro celou stránku: zrnka tvoří vždy jeden nadpis. Když se k oknu blíží další nadpis, čelo větru
   rozsype ten současný zleva a zrnka přeletí do dalšího, kde se usadí v jeho barvě. Stav je čistá funkce posunu. */
(function () {
  var PAL = ['#ff6a1a', '#2f6fde', '#e8238f', '#2f9d5b', '#7a4fd6', '#e0452b', '#0fa3a3', '#c99312', '#ff6a1a', '#2f6fde'];
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var hs = [].slice.call(document.querySelectorAll('main .hero h1, main>section h2')).filter(function (h) { return h.offsetParent !== null; });
  var H = hs.map(function (el, j) {
    el.classList.add('sd-h'); el.style.setProperty('--hc', PAL[j % PAL.length]);
    var sec = el.closest('section'); if (sec) sec.style.setProperty('--amber', PAL[j % PAL.length]);
    return { el: el, c: PAL[j % PAL.length], buf: null, box: null };
  });
  var canvas = document.createElement('canvas'); canvas.className = 'sd-gl'; canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  var VS = '#version 300 es\n' +
    'in vec2 aS; in vec2 aE; in vec2 aR;\n' +
    'uniform vec2 uRes; uniform float uT, uDpr, uY, uK; uniform vec4 uBS, uBE; uniform vec3 uCS, uCE;\n' +
    'out vec4 vC;\n' +
    'const float PI = 3.14159265;\n' +
    'void main(){\n' +
    '  float d = clamp((aS.x - uBS.x)/max(1., uBS.z), 0., 1.);\n' +
    '  float t1 = clamp((uK - .28 - d*.2 - aR.x*.04)/.24, 0., 1.);\n' +
    '  float dE = clamp((aE.x - uBE.x)/max(1., uBE.z), 0., 1.);\n' +
    '  float g = clamp((uK - .42 - aR.y*.16 - dE*.06)/.3, 0., 1.);\n' +
    '  float t2 = g < .5 ? 4.*g*g*g : 1. - pow(-2.*g + 2., 3.)/2.;\n' +
    '  float W = uRes.x, Hh = uRes.y;\n' +
    '  vec2 sw = vec2(sin(aS.y*.03 + aR.x*6.283 + t1*4.), cos(aS.x*.02 + aR.y*6.283 + t1*3.));\n' +
    '  vec2 pb = aS + vec2(W*(.12 + .3*aR.x)*t1*t1, -Hh*.05*t1*(.3 + aR.y)) + sw*W*.02*t1;\n' +
    '  vec2 dir = aE - pb; vec2 nrm = vec2(-dir.y, dir.x);\n' +
    '  vec2 pos = mix(pb, aE, t2) + nrm*sin(PI*t2)*(aR.y - .5)*.28;\n' +
    '  float fly = t1*(1. - t2);\n' +
    '  pos += vec2(sin(uT*1.3 + aR.x*40.), cos(uT*1.1 + aR.y*40.))*2.5*fly;\n' +
    '  pos.y -= uY;\n' +
    '  float vis = step(.28 + d*.2 - .012, uK);\n' +
    '  float a = vis*mix(.95, .8, fly)*(1. - smoothstep(.93, 1., uK));\n' +
    '  vC = vec4(mix(uCS, uCE, smoothstep(.1, .9, t2)), a);\n' +
    '  gl_PointSize = mix(mix(1.5, 1.2, fly), 1.7, t2)*uDpr;\n' +
    '  gl_Position = vec4(pos.x/W*2. - 1., 1. - pos.y/Hh*2., 0., 1.);\n' +
    '}';
  var FS = '#version 300 es\nprecision mediump float;\nin vec4 vC; out vec4 o;\n' +
    'void main(){ vec2 q = gl_PointCoord - .5; float a = vC.a*smoothstep(.5, .28, length(q)); o = vec4(vC.rgb*a, a); }';

  var gl = null, U = {}, rbuf = null, N = 0, L = null;
  function rgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16) / 255; }); }
  try {
    gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true });
    if (!gl) throw new Error('bez WebGL2');
    var sh = function (t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    var prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    ['aS', 'aE', 'aR'].forEach(function (n, i) { gl.bindAttribLocation(prog, i, n); }); gl.linkProgram(prog); gl.useProgram(prog);
    ['uRes', 'uT', 'uDpr', 'uY', 'uK', 'uBS', 'uBE', 'uCS', 'uCE'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(gl.createVertexArray());
    [0, 1, 2].forEach(function (l) { gl.enableVertexAttribArray(l); });
    rbuf = gl.createBuffer();
  } catch (e) { console.warn(e); gl = null; }

  var seed = 11; function rnd() { return (seed = (seed * 16807) % 2147483647) / 2147483647; }
  // body uvnitř písma jednoho nadpisu, v souřadnicích dokumentu
  function sample(h) {
    var el = h.el, cs = getComputedStyle(el), sx = scrollX, sy = scrollY, ws = [];
    var tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n;
    while ((n = tw.nextNode())) {
      var re = /[^\s ]+/g, m;
      while ((m = re.exec(n.data))) {
        var r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
        var b = r.getClientRects()[0]; if (b) ws.push({ t: m[0], x: b.left + sx, y: b.top + sy, w: b.width, h: b.height });
      }
    }
    if (!ws.length) return null;
    var bx = { l: 1e9, t: 1e9, r: -1e9, b: -1e9 };
    ws.forEach(function (w) { bx.l = Math.min(bx.l, w.x); bx.t = Math.min(bx.t, w.y); bx.r = Math.max(bx.r, w.x + w.w); bx.b = Math.max(bx.b, w.y + w.h); });
    var Wc = Math.ceil(bx.r - bx.l) + 4, Hc = Math.ceil(bx.b - bx.t) + 4;
    var c = document.createElement('canvas'); c.width = Wc; c.height = Hc;
    var x = c.getContext('2d', { willReadFrequently: true });
    x.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; if ('letterSpacing' in x) x.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
    x.fillStyle = '#fff'; x.textBaseline = 'alphabetic';
    ws.forEach(function (w) { x.fillText(w.t, w.x - bx.l, w.y - bx.t + x.measureText(w.t).fontBoundingBoxAscent); });
    var d = x.getImageData(0, 0, Wc, Hc).data, pts = [];
    for (var yy = 0; yy < Hc; yy++) for (var xx = 0; xx < Wc; xx++) if (d[(yy * Wc + xx) * 4] > 110) pts.push(xx + bx.l, yy + bx.t);
    var er = el.getBoundingClientRect();
    h.box = { l: bx.l, t: bx.t, w: bx.r - bx.l, h: bx.b - bx.t, cy: (bx.t + bx.b) / 2, off: bx.l - (er.left + sx) };
    return pts;
  }
  function layout() {
    var W = innerWidth, Hh = innerHeight, dpr = Math.min(devicePixelRatio, W < 700 ? 1.75 : 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(Hh * dpr);
    if (!gl) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    N = W < 700 ? 22000 : 46000; seed = 11;
    H.forEach(function (h) {
      var p = sample(h); if (!p || !p.length) { h.buf = null; return; }
      var n0 = p.length / 2, A = new Float32Array(N * 2);
      for (var i = 0; i < N; i++) { var s = (i < n0 ? i : Math.floor(rnd() * n0)) * 2; A[i * 2] = p[s] + rnd() - .5; A[i * 2 + 1] = p[s + 1] + rnd() - .5; }
      if (!h.buf) h.buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, h.buf); gl.bufferData(gl.ARRAY_BUFFER, A, gl.STATIC_DRAW);
    });
    var R = new Float32Array(N * 2); for (var i = 0; i < N * 2; i++) R[i] = rnd();
    gl.bindBuffer(gl.ARRAY_BUFFER, rbuf); gl.bufferData(gl.ARRAY_BUFFER, R, gl.STATIC_DRAW);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
    L = { W: W, H: Hh, dpr: dpr };
    root.classList.add('sd-on');
  }
  function sm(a, b, v) { var t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); }

  var last = performance.now(), clock = 0, ks = 0, started = false;
  function frame(now) {
    var dt = Math.min(.05, (now - last) / 1000); last = now; clock += dt;
    requestAnimationFrame(frame);
    if (!L) return;
    var hv = H.filter(function (h) { return h.box && h.buf; });
    if (hv.length < 2) return;
    var y = scrollY, a = y + L.H * .42, i = 0, k = 0;
    if (a <= hv[0].box.cy) { i = 0; k = 0; }
    else if (a >= hv[hv.length - 1].box.cy) { i = hv.length - 1; k = 0; }
    else { while (i < hv.length - 2 && a >= hv[i + 1].box.cy) i++; k = (a - hv[i].box.cy) / (hv[i + 1].box.cy - hv[i].box.cy); }
    // jen viditelné nadpisy: slabě naznačené, současný plný a odfoukávaný zleva, další se plní
    hv.forEach(function (h, j) {
      var o = .13, mk = 'none';
      if (j === i) {
        o = 1;
        var fr = (k - .28 + .012) / .2;
        if (fr > 0) { var px = h.box.off + fr * h.box.w; mk = 'linear-gradient(90deg, transparent ' + px.toFixed(1) + 'px, #000 ' + (px + 1).toFixed(1) + 'px)'; }
      } else if (j === i + 1) o = .13 + .87 * sm(.9, 1, k);
      h.el.style.setProperty('--ho', o.toFixed(3));
      if (h._mk !== mk) { h.el.style.maskImage = h.el.style.webkitMaskImage = mk; h._mk = mk; }
    });
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    if (k <= 0 || i >= hv.length - 1) return;
    var A = hv[i], B = hv[i + 1];
    gl.bindBuffer(gl.ARRAY_BUFFER, A.buf); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, B.buf); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(U.uRes, L.W, L.H); gl.uniform1f(U.uT, clock); gl.uniform1f(U.uDpr, L.dpr); gl.uniform1f(U.uY, y); gl.uniform1f(U.uK, k);
    gl.uniform4f(U.uBS, A.box.l, A.box.t, A.box.w, A.box.h); gl.uniform4f(U.uBE, B.box.l, B.box.t, B.box.w, B.box.h);
    gl.uniform3fv(U.uCS, rgb(A.c)); gl.uniform3fv(U.uCE, rgb(B.c));
    gl.drawArrays(gl.POINTS, 0, N);
  }
  if (reduce) return;
  var t; addEventListener('resize', function () { clearTimeout(t); t = setTimeout(layout, 150); });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () { layout(); requestAnimationFrame(frame); setTimeout(layout, 1800); });
})();
