/* U2 Kapka. Fáze posunu (v násobcích výšky okna): 0–GROW tečka roste, HOLD jantarová plocha s větou, SHRINK zmenšení do tečky dalšího nadpisu. */
(function () {
  if (matchMedia('(min-width:100000px)').matches) return;
  var GROW = .8, HOLD = 1.3, SHRINK = .9;
  var h1 = document.querySelector('.hero h1');
  function addDot(el) {
    if (!el || el.querySelector('.k-dot')) return null;
    var t = el.lastChild;
    if (/[?!]\s*$/.test(el.textContent)) return null;
    if (t && t.nodeType === 3) t.nodeValue = t.nodeValue.replace(/[.\s]+$/, '');
    var d = document.createElement('i'); d.className = 'k-dot'; el.appendChild(d); return d;
  }
  var d0 = addDot(h1);
  var heads = [].slice.call(document.querySelectorAll('main section h2'));
  heads.forEach(addDot);
  var d1 = document.querySelector('#sluzby h2 .k-dot') || (heads[0] && heads[0].querySelector('.k-dot'));
  var gap = document.createElement('div'); gap.className = 'k-gap'; gap.setAttribute('aria-hidden', 'true');
  gap.style.setProperty('--k-total', (HOLD + SHRINK) * 100);
  var hero = document.querySelector('.hero'); hero.parentNode.insertBefore(gap, hero.nextSibling);
  var fill = document.createElement('div'); fill.className = 'k-fill'; fill.setAttribute('aria-hidden', 'true');
  fill.innerHTML = '<div class="k-say"><span>Kdo hledá,</span><span>najde.</span><span>Ať najde Vás<i></i></span></div>';
  document.body.appendChild(fill);
  var lines = [].slice.call(fill.querySelectorAll('.k-say span'));
  function c(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function ctr(el) { var r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width / 2]; }
  function far(x, y, w, h) { return Math.hypot(Math.max(x, w - x), Math.max(y, h - y)) + 2; }
  function frame() {
    var vh = innerHeight, vw = innerWidth, y = scrollY;
    var g0 = gap.offsetTop - vh * GROW;             // začátek růstu tak, aby plná plocha byla, když mezera dojede nahoru
    if (g0 < 0) g0 = 0;
    var g1 = gap.offsetTop, s0 = g1 + vh * HOLD, s1 = s0 + vh * SHRINK;
    var x, yy, r, on = true, say = 0;
    if (y <= g0) { on = false; }
    else if (y < g1) { var p = ease(c((y - g0) / (g1 - g0))), a = ctr(d0); x = a[0]; yy = a[1]; r = a[2] + (far(x, yy, vw, vh) - a[2]) * p; }
    else if (y < s0) { x = vw / 2; yy = vh / 2; r = far(x, yy, vw, vh); say = (y - g1) / (vh * HOLD); }
    else if (y < s1) { var q = ease(c((y - s0) / (s1 - s0))), b = ctr(d1); x = b[0]; yy = b[1]; r = far(x, yy, vw, vh) + (b[2] - far(x, yy, vw, vh)) * q; }
    else on = false;
    fill.classList.toggle('on', on);
    if (on) fill.style.clipPath = 'circle(' + r.toFixed(1) + 'px at ' + x.toFixed(1) + 'px ' + yy.toFixed(1) + 'px)';
    lines.forEach(function (l, i) { l.classList.toggle('in', on && y >= g1 - vh * .05 && say >= i * .22 && y < s0 + vh * .25); });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
