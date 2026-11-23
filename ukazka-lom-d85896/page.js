/* Lom · oddíly pod úvodem (J 2026-11-23). Bez knihoven. */
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
  var wr = 0;
  function fill() {
    wr = 0; var r = big.getBoundingClientRect(), vh = innerHeight;
    if (r.top > vh || r.bottom < 0) return;
    var p = (vh * .86 - r.top) / (r.height + vh * .3);          /* 0 = věta vjíždí, 1 = sedí v horní třetině */
    var k = Math.round(Math.max(0, Math.min(1, p)) * ws.length);
    for (var i = 0; i < ws.length; i++) ws[i].classList.toggle('on', i < k);
  }
  addEventListener('scroll', function () { if (!wr) wr = requestAnimationFrame(fill); }, { passive: true });
  fill();

  /* postup: krok uprostřed obrazovky vybere fotku a teplotu */
  var steps = document.querySelectorAll('.step'), imgs = document.querySelectorAll('.proc-media img');
  var temp = document.querySelector('.temp'), tn = document.querySelector('.temp-n');
  var cur = -1, shown = 1150, target = 1150, raf = 0;
  function fmt(v) { v = Math.round(v); return v >= 1000 ? Math.floor(v / 1000) + '\u00a0' + String(v % 1000).padStart(3, '0') : String(v); }
  function anim() {
    shown += (target - shown) * .12;
    if (Math.abs(target - shown) < .6) shown = target;
    tn.textContent = fmt(shown);
    temp.classList.toggle('cold', shown < 200);
    raf = shown !== target ? requestAnimationFrame(anim) : 0;
  }
  function load(im) { if (im && im.dataset.src) { im.src = im.dataset.src; im.removeAttribute('data-src'); } }
  function pick(i) {
    if (i === cur) return; cur = i;
    load(imgs[i]); load(imgs[i + 1]);
    imgs.forEach(function (im, k) { im.classList.toggle('on', k === i); });
    steps.forEach(function (s, k) { s.classList.toggle('on', k === i); });
    target = +steps[i].dataset.t;
    if (!raf) raf = requestAnimationFrame(anim);
  }
  if (io) {
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) pick([].indexOf.call(steps, e.target)); });
    }, { rootMargin: innerWidth < 900 ? '-62% 0px -18% 0px' : '-45% 0px -45% 0px' });
    steps.forEach(function (s) { so.observe(s); });
    new IntersectionObserver(function (es) { if (es[0].isIntersecting) load(imgs[1]); }, { rootMargin: '600px 0px' }).observe(document.querySelector('.proc'));
  }
  pick(0);

  /* termíny prohlídek: příští čtyři soboty × 10:00 a 14:00 */
  var box = document.querySelector('.slots'), go = document.querySelector('.visit-go');
  var D = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'];
  var d = new Date(); d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  for (var w = 0; w < 4; w++) {
    ['10:00', '14:00'].forEach(function (h) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'slot';
      var lab = 'So ' + d.getDate() + '. ' + (d.getMonth() + 1) + '. · ' + h;
      b.innerHTML = '<span class="slot-d">So </span>' + lab.slice(3); b.setAttribute('aria-label', lab.replace('So ', 'sobota ')); b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        box.querySelectorAll('.slot').forEach(function (x) { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); });
        b.classList.add('on'); b.setAttribute('aria-pressed', 'true');
        go.removeAttribute('aria-disabled');
        go.textContent = 'Rezervovat sobotu ' + lab.slice(3).replace(/ /g, ' ');   // datum s časem se nezlomí
        go.href = 'mailto:dilna@lom-sklo.cz?subject=' + encodeURIComponent('Prohlídka dílny ' + lab);
      });
      box.appendChild(b);
    });
    d.setDate(d.getDate() + 7);
  }

  /* jemná hloubka fotky dílny */
  var vb = document.querySelector('.visit-bg'), vs = document.querySelector('.visit'), vr = 0;
  function par() {
    vr = 0; var r = vs.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    var q = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
    vb.style.transform = 'translate3d(0,' + (q * (innerWidth < 561 ? -3 : -6)).toFixed(2) + '%,0)';
  }
  addEventListener('scroll', function () { if (!vr) vr = requestAnimationFrame(par); }, { passive: true });
  par();

  /* navigace nad tmavým oddílem zesvětlí */
  var nav = document.querySelector('.nav'), darks = document.querySelectorAll('.proc,.visit,.foot'), nr = 0;
  function navTone() {
    nr = 0; var y = 36, dk = false;
    for (var i = 0; i < darks.length; i++) { var r = darks[i].getBoundingClientRect(); if (r.top <= y && r.bottom > y) { dk = true; break; } }
    nav.classList.toggle('dark', dk);
    /* za úvodem dostane podklad; při posunu dolů se schová, nahoru se vrátí */
    var sy = scrollY, past = sy > heroH - innerHeight + 30;   /* jakmile úvod začne odjíždět */
    nav.classList.toggle('solid', past);
    if (past && sy > lastY + 4) nav.classList.add('away');
    else if (sy < lastY - 4 || !past) nav.classList.remove('away');
    lastY = sy;
  }
  var heroH = document.querySelector('.hero').offsetHeight, lastY = scrollY;
  addEventListener('resize', function () { heroH = document.querySelector('.hero').offsetHeight; });
  nav.addEventListener('focusin', function () { nav.classList.remove('away'); });
  addEventListener('scroll', function () { if (!nr) nr = requestAnimationFrame(navTone); }, { passive: true });
  navTone();
})();
