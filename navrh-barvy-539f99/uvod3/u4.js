/* U4 Obor: střídání oboru každých 2,8 s, dokud je úvod vidět; klik na slovo nebo tečku = další / vybraný obor. Barvy oboru = tokeny celé stránky. */
(function () {
  var O = [
    { w: 'Vaši kavárnu', img: 'zrno-a-zar', c: ['#f4ebdf', '#ead9c4', '#22180f', '#7a4520'] },
    { w: 'Vaše květinářství', img: 'plna-naruc', c: ['#fbeef0', '#f4dbe0', '#2a1418', '#b0365a'] },
    { w: 'Váš autoservis', img: 'zahourek', c: ['#eef1f4', '#dde3ea', '#121821', '#d2461e'] },
    { w: 'Vaši chatu', img: 'sedm-smrku', c: ['#ecf1e9', '#d9e4d3', '#13200f', '#2f6a3c'] },
    { w: 'Vaši truhlárnu', img: 'letokruh', c: ['#f6f0e4', '#e9dcc3', '#221a0c', '#8a5a14'] },
    { w: 'Vaše bistro', img: 'burger-empire', c: ['#fff3df', '#fbe1b8', '#2a1606', '#c4410c'] }
  ];
  var root = document.documentElement, reduce = matchMedia('(min-width:100000px)').matches;
  var copy = document.querySelector('.hero-copy'), h1 = copy.querySelector('h1');
  var line = document.createElement('p'); line.className = 'o-line'; line.setAttribute('aria-hidden', 'true');
  line.innerHTML = 'Web pro<br><span class="o-chip"><img alt="" src="img/prace/' + O[0].img + '-0.webp"></span><span class="o-w"><b>' + O[0].w + '</b></span>';
  copy.insertBefore(line, h1);
  var dots = document.createElement('div'); dots.className = 'o-dots';
  O.forEach(function (o, i) { var b = document.createElement('button'); b.type = 'button'; b.style.background = o.c[3]; b.setAttribute('aria-label', o.w.replace(/^\S+ /, '')); b.onclick = function () { stop = true; go(i); }; dots.appendChild(b); });
  copy.querySelector('.actions').after(dots);
  O.forEach(function (o) { var im = new Image(); im.src = 'img/prace/' + o.img + '-0.webp'; });
  var word = line.querySelector('.o-w'), chip = line.querySelector('.o-chip img');
  var wave = document.createElement('div'); wave.className = 'o-wave'; document.body.appendChild(wave);
  var cur = 0, stop = false, busy = false;
  function paint(c) {
    var s = root.style;
    s.setProperty('--bg', c[0]); s.setProperty('--bg2', c[1]); s.setProperty('--ink', c[2]); s.setProperty('--ink-h', c[2]); s.setProperty('--amber', c[3]);
    s.setProperty('--hdr', hexa(c[0], .82)); s.setProperty('--hdr2', hexa(c[0], .94));
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.content = c[0];
  }
  function hexa(h, a) { var n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function mark() { [].forEach.call(dots.children, function (b, i) { b.classList.toggle('on', i === cur); }); }
  function go(i) {
    if (busy || i === cur) return; busy = true; cur = i; mark();
    var o = O[i], b = word.querySelector('b');
    b.className = 'out';
    setTimeout(function () { b.textContent = o.w; b.className = 'in'; chip.src = 'img/prace/' + o.img + '-0.webp'; }, reduce ? 0 : 300);
    if (reduce) { paint(o.c); busy = false; return; }
    var r = word.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    var R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 4;
    wave.style.background = o.c[0]; wave.style.transition = 'none'; wave.style.clipPath = 'circle(0px at ' + x + 'px ' + y + 'px)';
    wave.offsetWidth;
    wave.style.transition = 'clip-path .85s cubic-bezier(.65,0,.25,1)'; wave.style.clipPath = 'circle(' + R + 'px at ' + x + 'px ' + y + 'px)';
    setTimeout(function () { paint(o.c); }, 520);
    setTimeout(function () { wave.style.transition = 'opacity .35s'; wave.style.opacity = '0'; setTimeout(function () { wave.style.transition = 'none'; wave.style.clipPath = 'circle(0px at 50% 50%)'; wave.style.opacity = '1'; busy = false; }, 380); }, 900);
  }
  word.onclick = function () { stop = true; go((cur + 1) % O.length); };
  paint(O[0].c); mark();
  var hero = document.querySelector('.hero');
  setInterval(function () { if (stop || document.hidden) return; var r = hero.getBoundingClientRect(); if (r.bottom > innerHeight * .5) go((cur + 1) % O.length); }, 2800);
})();
