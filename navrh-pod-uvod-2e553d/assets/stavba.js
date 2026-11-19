/* Oddíl „Web se staví před očima“ (J 16. 11. 2026, nápad 2 z pěti). */
(function () {
  'use strict';
  var d = document;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var reduce = matchMedia('(min-width:100000px)').matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var ease = function (p) { p = clamp(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  function seen(el, fn, th) {
    if (!('IntersectionObserver' in window)) { fn(true); return; }
    new IntersectionObserver(function (es) { fn(es[0].isIntersecting); }, { threshold: th || 0.25 }).observe(el);
  }
  function typed(s, a, b, t) { return s.slice(0, Math.round(s.length * clamp((t - a) / (b - a), 0, 1))); }
  function tapAt(tap, scr, el, fx, fy) {
    var r = el.getBoundingClientRect(), sr = scr.getBoundingClientRect();
    tap.style.left = (r.left - sr.left + r.width * (fx == null ? 0.5 : fx)) + 'px';
    tap.style.top = (r.top - sr.top + r.height * (fy == null ? 0.5 : fy)) + 'px';
    tap.classList.remove('go'); void tap.offsetWidth; tap.classList.add('go');
  }
  function inView(el) { var r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }

  /* ---------- 2) Web se staví před očima ---------- */
  var n2 = $('.n2');
  if (n2) (function () {
    var track = $('.n2-track', n2), steps = $$('.n2-steps li', n2), dots = $$('.n2-dots i', n2);
    var capB = $('.n2-cap b', n2), capS = $('.n2-cap span', n2);
    var TXT = steps.map(function (li) { return [$('b', li).textContent, $('span', li).textContent]; });
    var cur = -1;
    function set(s) {
      if (s === cur) return; cur = s;
      n2.dataset.step = String(s);
      steps.forEach(function (li, i) { li.classList.toggle('on', i === s - 1); li.classList.toggle('done', i < s - 1); });
      dots.forEach(function (o, i) { o.classList.toggle('on', i < s); });
      var k = Math.max(0, s - 1); capB.textContent = s ? (s + '/5 ' + TXT[k][0]) : 'Prázdná stránka'; capS.textContent = s ? TXT[k][1] : 'Posouvejte dolů a web se postaví.';
    }
    if (reduce) { n2.classList.add('static'); set(5); return; }
    var ticking = false;
    function upd() {
      ticking = false;
      var r = track.getBoundingClientRect(), span = track.offsetHeight - innerHeight;
      var p = clamp(-r.top / Math.max(1, span), 0, 1);
      set(Math.min(5, Math.floor(p * 6.2)));
    }
    addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    addEventListener('resize', upd);
    upd();
  })();
})();
