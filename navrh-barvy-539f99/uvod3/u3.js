/* U3 Den: P = poloha posunu 0–1 → barvy oblohy, dráha a barva slunce, hodiny 6:00–23:30; po 88 % přepne stránku na noc. */
(function () {
  var K = [ // P, horní barva, dolní barva, slunce, hodina
    [0, '#ffc9a8', '#fff0e2', '#ff8f5e', 6],
    [.22, '#bcdcff', '#eef6ff', '#ffe6a6', 9],
    [.45, '#a9d3ff', '#f4f9ff', '#fff6d8', 12.5],
    [.66, '#ffe0a0', '#fff6dc', '#ffc062', 16],
    [.82, '#ff9b7a', '#ffd3a6', '#ff5a33', 19],
    [.93, '#2b2d5e', '#6b4a7c', '#f3e6d6', 21.5],
    [1, '#0f1430', '#252552', '#e9ecf5', 23.5]
  ];
  var says = [[0, 'Ráno hledají otevírací dobu'], [.3, 'V poledne hledají, kam na oběd'], [.62, 'Odpoledne volají'], [.82, 'Večer si vybírají na zítra'], [.93, 'V noci web pracuje dál']];
  var root = document.documentElement;
  var sky = document.createElement('div'); sky.className = 'd-sky';
  var sun = document.createElement('div'); sun.className = 'd-sun rise';
  var clock = document.createElement('div'); clock.className = 'd-clock'; clock.setAttribute('aria-hidden', 'true');
  [sky, sun].forEach(function (e) { e.setAttribute('aria-hidden', 'true'); document.body.insertBefore(e, document.body.firstChild); });
  document.body.appendChild(clock);
  function hx(h) { var n = parseInt(h.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; }
  function mix(a, b, t) { a = hx(a); b = hx(b); return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); }).join(',') + ')'; }
  function at(P) { for (var i = 0; i < K.length - 1; i++) if (P <= K[i + 1][0]) { var a = K[i], b = K[i + 1], t = (P - a[0]) / (b[0] - a[0]); t = t * t * (3 - 2 * t); return [mix(a[1], b[1], t), mix(a[2], b[2], t), mix(a[3], b[3], t), a[4] + (b[4] - a[4]) * t]; } var z = K[K.length - 1]; return [z[1], z[2], z[3], z[4]]; }
  var last = -1;
  function frame() {
    var max = document.documentElement.scrollHeight - innerHeight, P = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    if (Math.abs(P - last) > .0005) {
      last = P; var c = at(P), vw = innerWidth, vh = innerHeight;
      sky.style.setProperty('--s1', c[0]); sky.style.setProperty('--s2', c[1]); sun.style.setProperty('--sun', c[2]);
      document.body.style.background = c[0];
      var a = Math.min(1, P / .9), x = vw * (.78 - .56 * a), y = vh * (.62 - .5 * Math.sin(Math.PI * a)); // slunce vychází vpravo dole, zapadá vlevo
      if (P > .9) { x = vw * .8; y = vh * .2; }                      // měsíc
      sun.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + (P > .9 ? .45 : 1) + ')';
      root.classList.toggle('night', P > .88);
      var hh = Math.floor(c[3]), mm = Math.round((c[3] - hh) * 60 / 5) * 5; if (mm === 60) { hh++; mm = 0; }
      var s = says[0][1]; says.forEach(function (q) { if (P >= q[0]) s = q[1]; });
      clock.innerHTML = hh + ':' + (mm < 10 ? '0' : '') + mm + '<small>' + s + '</small>';
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
