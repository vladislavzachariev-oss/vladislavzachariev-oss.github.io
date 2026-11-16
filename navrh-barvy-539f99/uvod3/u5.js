/* U5 Listy: přiřadí barvy listům, spočítá lepení (vysoký list se přilepí až dolním okrajem) a zmenšuje list, přes který jede další. */
(function () {
  var seq = ['l-paper', 'l-sage', 'l-sand', 'l-ink', 'l-clay', 'l-paper', 'l-sage', 'l-sand', 'l-ink'];
  var names = { sluzby: 'Žahourek', ukazka: 'Návrh webu', prace: 'Práce', postup: 'Postup', cena: 'Cena', my: 'Kdo jsme', otazky: 'Otázky', kontakt: 'Kontakt' };
  var S = [].slice.call(document.querySelectorAll('main>section'));
  S.forEach(function (s, i) { s.classList.add(seq[i % seq.length]); });
  var hero = S[0], peek = document.createElement('div'); peek.className = 'l-peek';
  var next = S.slice(1, 5), step = 26;
  next.forEach(function (s, i) {
    var a = document.createElement('a'); a.href = '#' + (s.id || ''); a.className = s.className.match(/l-\w+/)[0];
    a.style.background = 'var(--sh)'; a.style.top = (i * step) + 'px'; a.style.zIndex = i + 1;
    var sp = document.createElement('span'); sp.textContent = names[s.id] || ''; sp.style.left = 'calc(var(--pad) + ' + (i * 0) + 'px)';
    sp.style.color = s.classList.contains('l-ink') ? '#f3efe8' : '#191714';
    a.appendChild(sp); peek.appendChild(a);
  });
  hero.style.position = 'sticky'; hero.appendChild(peek);
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function layout() { var vh = innerHeight; S.forEach(function (s) { s.style.setProperty('--st', Math.min(0, vh - s.offsetHeight) + 'px'); }); }
  layout(); addEventListener('resize', layout); setTimeout(layout, 800); addEventListener('load', layout);
  if (reduce) return;
  function frame() {
    var vh = innerHeight;
    for (var i = 0; i < S.length - 1; i++) {
      var t = S[i + 1].getBoundingClientRect().top, p = 1 - t / vh; p = p < 0 ? 0 : p > 1 ? 1 : p;
      var sc = 1 - .05 * p;
      S[i].style.transform = p > 0 ? 'scale(' + sc.toFixed(4) + ')' : '';
      S[i].style.setProperty('--dk', p > .01 ? (.28 * p).toFixed(3) : '0');
    }
    var hdr = document.querySelector('.hdr'), u = null;
    for (var j = S.length - 1; j >= 0; j--) if (S[j].getBoundingClientRect().top <= 30) { u = S[j]; break; }
    hdr.classList.toggle('l-dark', !!u && u.classList.contains('l-ink'));
    var hp = 1 - S[1].getBoundingClientRect().top / vh; peek.style.opacity = hp > .02 ? Math.max(0, 1 - hp * 4).toFixed(3) : '';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
