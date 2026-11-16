/* P1 Barevný písek (Z 16. 11. 2026: „líbila se lupa a písek“, k tomu „víc barev, ať to souvisí s celou stránkou“).
   Úvod je přilepený, posun ho přehrává: čelo větru rozsype nadpis zleva na zrnka, zrnka v letu dostanou barvu
   a usadí se dole v šesti vrstvách jako barevný písek v lahvi. Spodní vrstva plynule pokračuje jako pozadí další části,
   další části mají barvy vrstev a vlnitý okraj duny. Stav zrnek je čistá funkce posunu (stejný posun = stejný obraz). */
(function () {
  var C = ['#efd9bf', '#f3c3a0', '#eaa58c', '#e9b8c4', '#c9c0e6', '#b9d3ee'];
  var INK = '#16130f', BG = '#faf7f2';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero = document.querySelector('.hero'), h1 = hero.querySelector('h1');
  var others = [].slice.call(hero.querySelectorAll('.hero-copy>:not(h1)'));

  // přilepený úvod
  var stage = document.createElement('div'); stage.className = 's-stage';
  hero.parentNode.insertBefore(stage, hero); stage.appendChild(hero);
  var canvas = document.createElement('canvas'); canvas.className = 's-gl'; canvas.setAttribute('aria-hidden', 'true');
  var svgNS = 'http://www.w3.org/2000/svg', bands = document.createElementNS(svgNS, 'svg');
  bands.setAttribute('class', 's-bands'); bands.setAttribute('aria-hidden', 'true'); bands.setAttribute('preserveAspectRatio', 'none');
  bands.style.cssText = 'top:0;height:100%';
  hero.insertBefore(bands, hero.firstChild); hero.insertBefore(canvas, hero.firstChild);

  // části pod úvodem v barvách vrstev, s vlnitým okrajem duny
  var dunes = ['M0 60V30C140 8 300 4 460 24S760 60 920 38 1110 8 1200 20V60Z', 'M0 60V20C120 36 260 54 420 40S700 2 880 14 1080 46 1200 32V60Z'];
  var secs = [].slice.call(document.querySelectorAll('main>section')).filter(function (s) { return s !== hero; });
  secs.forEach(function (s, i) {
    var c = i === 0 ? C[5] : C[(i - 1) % 6];
    s.style.setProperty('--sc', c);
    if (i > 0) {
      var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 60' preserveAspectRatio='none'><path d='" + dunes[i % 2] + "'/></svg>";
      s.classList.add('s-dune'); s.style.setProperty('--dm', 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")');
      s.style.setProperty('--dh', 'clamp(22px,4vw,54px)');
    }
  });

  var VS = '#version 300 es\n' +
    'in vec2 aS; in vec2 aE; in vec3 aR;\n' +
    'uniform vec2 uRes; uniform float uP, uT, uDpr; uniform vec3 uC[6]; uniform vec3 uInk;\n' +
    'out vec4 vC;\n' +
    'const float PI = 3.14159265;\n' +
    'void main(){\n' +
    '  float W = uRes.x, H = uRes.y;\n' +
    '  float d0 = .05 + .2*aS.x/W;\n' +
    '  float t1 = clamp((uP - d0 - aR.x*.035)/.28, 0., 1.);\n' +
    '  float g = clamp((uP - .36 - aR.y*.14 - aE.x/W*.06)/.28, 0., 1.);\n' +
    '  float t2 = g < .5 ? 4.*g*g*g : 1. - pow(-2.*g + 2., 3.)/2.;\n' +
    '  vec2 sw = vec2(sin(aS.y*.012 + aR.x*6.283 + t1*4.2), cos(aS.x*.009 + aR.y*6.283 + t1*3.1));\n' +
    '  vec2 pb = aS + vec2(W*(.12 + .3*aR.x)*t1*t1, -H*.10*t1*(.4 + aR.y)) + sw*W*.02*t1;\n' +
    '  pb.y += sin(pb.x*.0042 + aS.y*.018 + aR.x*.8)*W*.04*t1;\n' +
    '  vec2 dir = aE - pb; vec2 nrm = vec2(-dir.y, dir.x);\n' +
    '  vec2 pos = mix(pb, aE, t2) + nrm*sin(PI*t2)*(aR.y - .5)*.3;\n' +
    '  float fly = t1*(1. - t2);\n' +
    '  pos += vec2(sin(uT*1.3 + aR.x*40.), cos(uT*1.1 + aR.y*40.))*3.*fly;\n' +
    '  float land = smoothstep(.7, 1., t2);\n' +
    '  int ci = int(aR.z*5. + .5);\n' +
    '  vec3 col = mix(uInk, uC[ci], smoothstep(.15, .85, t2));\n' +
    '  float a = step(d0 - .012, uP)*mix(mix(.92, .85, fly), 1., land);\n' +
    '  vC = vec4(col, a);\n' +
    '  gl_PointSize = mix(mix(1.6, 1.3, fly), 3.4, land)*uDpr;\n' +
    '  gl_Position = vec4(pos.x/W*2. - 1., 1. - pos.y/H*2., 0., 1.);\n' +
    '}';
  var FS = '#version 300 es\nprecision mediump float;\nin vec4 vC; out vec4 o;\n' +
    'void main(){ vec2 q = gl_PointCoord - .5; float a = vC.a*smoothstep(.5, .28, length(q)); o = vec4(vC.rgb*a, a); }';

  var gl = null, U = {}, vao = null, buf = null, N = 0, L = null;
  function lin(h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16) / 255; }); }
  try {
    gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: true });
    if (!gl) throw new Error('bez WebGL2');
    var sh = function (t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    var prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    ['aS', 'aE', 'aR'].forEach(function (n, i) { gl.bindAttribLocation(prog, i, n); }); gl.linkProgram(prog); gl.useProgram(prog);
    ['uRes', 'uP', 'uT', 'uDpr', 'uC', 'uInk'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    gl.uniform3fv(U.uC, new Float32Array([].concat.apply([], C.map(lin)))); gl.uniform3fv(U.uInk, new Float32Array(lin(INK)));
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    vao = gl.createVertexArray(); gl.bindVertexArray(vao); buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 28, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 28, 8);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 28, 16);
  } catch (e) { console.warn(e); gl = null; }

  var seed = 7; function rnd() { return (seed = (seed * 16807) % 2147483647) / 2147483647; }
  // hranice vrstev: j = 0 (povrch duny) … 6 (spodek)
  function edge(j, x, W, H) {
    var y0 = H * (W < 700 ? .6 : .63), step = (H - y0) / 6;
    if (j >= 6) return H + 4;
    var a = step * (j === 0 ? .9 : .38), f = [1.3, 2.1, 1.7, 2.6, 1.4, 2.3][j], ph = [0.4, 2.2, 4.1, 1.3, 3.3, 5.2][j];
    return y0 + step * j + a * Math.sin(x / W * Math.PI * 2 * f + ph) + (j === 0 ? -step * .5 * Math.exp(-Math.pow((x / W - .7) / .22, 2)) : 0);
  }
  function layout() {
    var W = canvas.clientWidth, H = canvas.clientHeight; if (!W || !H) return;
    var dpr = Math.min(devicePixelRatio, W < 700 ? 1.75 : 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    // vrstvy jako SVG (ostré, nahradí zrnka na konci)
    bands.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var html = '';
    for (var j = 0; j < 6; j++) {
      var d = 'M0 ' + edge(j, 0, W, H).toFixed(1);
      for (var x = 8; x <= W; x += 8) d += 'L' + x + ' ' + edge(j, x, W, H).toFixed(1);
      for (var x2 = W; x2 >= 0; x2 -= 8) d += 'L' + x2 + ' ' + edge(j + 1, x2, W, H).toFixed(1);
      html += '<path fill="' + C[j] + '" d="' + d + 'Z"/>';
    }
    bands.innerHTML = html;
    if (!gl) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    // body uvnitř písma nadpisu (souřadnice v úvodu)
    var hr = hero.getBoundingClientRect(), cs = getComputedStyle(h1);
    var mc = document.createElement('canvas'); mc.width = W; mc.height = H;
    var x = mc.getContext('2d', { willReadFrequently: true });
    x.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; if ('letterSpacing' in x) x.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
    x.fillStyle = '#fff'; x.textBaseline = 'alphabetic';
    var tw = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT), n;
    while ((n = tw.nextNode())) {
      var re = /[^\s ]+/g, m;
      while ((m = re.exec(n.data))) {
        var r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
        var b = r.getClientRects()[0]; if (!b) continue;
        x.fillText(m[0], b.left - hr.left, b.top - hr.top + x.measureText(m[0]).fontBoundingBoxAscent);
      }
    }
    var dd = x.getImageData(0, 0, W, H).data, sp = [];
    for (var yy = 0; yy < H; yy++) for (var xx = 0; xx < W; xx++) if (dd[(yy * W + xx) * 4] > 110) sp.push(xx, yy);
    var n0 = sp.length / 2; if (!n0) return;
    N = W < 700 ? 60000 : 140000; seed = 7;
    var A = new Float32Array(N * 7);
    for (var i = 0; i < N; i++) {
      var s = (i < n0 ? i : Math.floor(rnd() * n0)) * 2, k = Math.floor(rnd() * 6), ex = rnd() * W;
      var ey = edge(k, ex, W, H) + (edge(k + 1, ex, W, H) - edge(k, ex, W, H)) * (0.04 + 0.92 * rnd());
      A.set([sp[s] + rnd(), sp[s + 1] + rnd(), ex, ey, rnd(), rnd(), k / 5], i * 7);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, A, gl.STATIC_DRAW);
    L = { W: W, H: H, dpr: dpr, h1L: h1.getBoundingClientRect().left - hr.left };
  }

  function progress() { var r = stage.getBoundingClientRect(); return Math.min(1, Math.max(0, -r.top / Math.max(1, stage.offsetHeight - innerHeight))); }
  function sm(a, b, v) { var t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
  var cur = 0, last = performance.now(), clock = 0;
  function frame(now) {
    var dt = Math.min(.05, (now - last) / 1000); last = now; clock += dt;
    var want = window.__P != null ? window.__P : progress();
    cur += (want - cur) * (1 - Math.exp(-dt * 7)); if (Math.abs(want - cur) < 1e-4) cur = want;
    var p = cur;
    if (gl && L) {
      var bg = lin(BG); gl.clearColor(bg[0], bg[1], bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.uRes, L.W, L.H); gl.uniform1f(U.uP, p); gl.uniform1f(U.uT, clock); gl.uniform1f(U.uDpr, L.dpr);
      gl.drawArrays(gl.POINTS, 0, N);
      var front = (p - .05 + .012) / .2 * L.W - L.h1L;
      var mk = p < .035 ? 'none' : 'linear-gradient(90deg, transparent ' + front.toFixed(1) + 'px, #000 ' + (front + 1).toFixed(1) + 'px)';
      h1.style.maskImage = h1.style.webkitMaskImage = mk;
    }
    var f = 1 - sm(.01, .09, p);
    others.forEach(function (e) { e.style.opacity = f.toFixed(3); e.style.transform = 'translateX(' + ((1 - f) * 40).toFixed(1) + 'px)'; });
    bands.style.opacity = (.9 * sm(.86, .97, p)).toFixed(3);
    canvas.style.opacity = (1 - .65 * sm(.9, 1, p)).toFixed(3);
    requestAnimationFrame(frame);
  }
  if (reduce) return;
  var t; addEventListener('resize', function () { clearTimeout(t); t = setTimeout(layout, 150); });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () { layout(); requestAnimationFrame(frame); });
})();
