/* Whyte Lynx · oddíly pod úvodem (J 2026-11-23). Bez knihoven. */
(function () {
  'use strict';
  var io = 'IntersectionObserver' in window;
  /* odhalení */
  var rv = document.querySelectorAll('.rv');
  if (io) {
    var ro = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } }); }, { rootMargin: '0px 0px -12% 0px' });
    rv.forEach(function (el) { ro.observe(el); });
  } else rv.forEach(function (el) { el.classList.add('in'); });

  /* úvodní věta: slova se barví, jak věta projíždí obrazovkou */
  var big = document.querySelector('.intro-big'), ws = [];
  (function split(n) {
    [].slice.call(n.childNodes).forEach(function (c) {
      if (c.nodeType === 3) {
        var f = document.createDocumentFragment();
        c.nodeValue.split(/( +)/).forEach(function (t) {
          if (!t) return;
          if (/^ +$/.test(t)) { f.appendChild(document.createTextNode(t)); return; }
          var sp = document.createElement('span'); sp.className = 'w'; sp.textContent = t; f.appendChild(sp); ws.push(sp);
        });
        n.replaceChild(f, c);
      } else if (c.nodeType === 1) split(c);
    });
  })(big);

  /* karty prací: zakrytá karta se lehce zmenší */
  var cards = [].slice.call(document.querySelectorAll('.wk'));

  /* navigace: nad tmavým oddílem světlá, za úvodem podklad, dolů se schová */
  var nav = document.querySelector('.nav'), darks = document.querySelectorAll('.real,.contact,.foot');
  var heroH = document.querySelector('.hero').offsetHeight, lastY = scrollY;

  var raf = 0;
  function frame() {
    raf = 0;
    var vh = innerHeight;
    // věta
    var r = big.getBoundingClientRect();
    if (r.top < vh && r.bottom > 0) {
      var p = (vh * .88 - r.top) / (r.height + vh * .12), k = Math.round(Math.max(0, Math.min(1, p)) * ws.length);
      for (var i = 0; i < ws.length; i++) ws[i].classList.toggle('on', i < k);
    }
    // karty
    if (innerWidth > 900) for (var j = 0; j < cards.length - 1; j++) {
      var top = cards[j].getBoundingClientRect().top, nt = cards[j + 1].getBoundingClientRect().top;
      var q = Math.max(0, Math.min(1, 1 - (nt - top) / (vh * .75)));
      cards[j].style.setProperty('--s', (1 - q * .06).toFixed(4));
    }
    // navigace
    var y = 36, dk = false;
    for (var d = 0; d < darks.length; d++) { var b = darks[d].getBoundingClientRect(); if (b.top <= y && b.bottom > y) { dk = true; break; } }
    nav.classList.toggle('dark', dk);
    var s = scrollY, past = s > heroH - vh + 30;
    nav.classList.toggle('solid', past);
    if (past && s > lastY + 4) nav.classList.add('away');
    else if (s < lastY - 4 || !past) nav.classList.remove('away');
    lastY = s;
  }
  addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(frame); }, { passive: true });
  addEventListener('resize', function () { heroH = document.querySelector('.hero').offsetHeight; frame(); });
  nav.addEventListener('focusin', function () { nav.classList.remove('away'); });
  frame();

  /* odkazy na kotvy přes lenis (plynulý skok) */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href'), t = id === '#top' ? 0 : document.querySelector(id);
      if (t === null || !window.__lenis) return;
      e.preventDefault(); window.__lenis.scrollTo(t, { offset: id === '#top' ? 0 : -10, duration: 1.4 });
    });
  });
})();
