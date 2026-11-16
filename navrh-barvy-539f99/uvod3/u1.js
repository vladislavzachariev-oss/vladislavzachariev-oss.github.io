/* U1 Vzorník: vějíř se po načtení rozevře, posunem úvodu se zavírá; části stránky v barvách vzorků, proužek pod hlavičkou ukazuje polohu. */
(function () {
  var C = [['#f1c4ae', 'Kavárna', '01'], ['#f2dc9c', 'Květiny', '02'], ['#c3d8bd', 'Autoservis', '03'], ['#b6cfe8', 'Kadeřnictví', '04'], ['#d2c3e6', 'Penzion', '05'], ['#eec7d5', 'Řemeslník', '06']];
  var hero = document.querySelector('.hero'), mob = matchMedia('(max-width:760px)');
  var fan = document.createElement('div'); fan.className = 'v-fan'; fan.setAttribute('aria-hidden', 'true');
  function angles() { var step = mob.matches ? 13 : 11, base = mob.matches ? -30 : -6; return C.map(function (c, i) { return base + i * step; }); }
  fan.innerHTML = C.map(function (c) { return '<i style="--c:' + c[0] + '"><b>' + c[1] + '</b><small>WL ' + c[2] + '</small></i>'; }).join('');
  hero.insertBefore(fan, hero.firstChild);
  var chips = [].slice.call(fan.children);
  function setA() { var A = angles(); chips.forEach(function (ch, i) { ch.style.setProperty('--a', A[i] + 'deg'); }); }
  setA(); mob.addEventListener('change', setA);
  requestAnimationFrame(function () { requestAnimationFrame(function () { fan.classList.add('open'); }); });
  setTimeout(function () { chips.forEach(function (ch) { ch.style.transition = 'transform .25s linear'; }); }, 1500);
  var S = [].slice.call(document.querySelectorAll('main>section')).slice(1);
  S.forEach(function (s, i) { s.style.setProperty('--c', C[i % 6][0]); });
  var bar = document.createElement('div'); bar.className = 'p-bar'; bar.setAttribute('aria-hidden', 'true');
  bar.innerHTML = C.map(function (c) { return '<i style="--c:' + c[0] + '"></i>'; }).join('');
  document.body.appendChild(bar);
  var hdr = document.querySelector('.hdr'); function hh() { var h = hdr.offsetHeight + 'px'; bar.style.setProperty('--hh', h); document.documentElement.style.setProperty('--hh', h); } hh(); addEventListener('resize', hh);
  var pi = [].slice.call(bar.children), opened = false; setTimeout(function () { opened = true; }, 1500);
  function frame() {
    var y = scrollY, vh = innerHeight;
    if (opened) { var o = Math.max(0, 1 - y / (vh * .7)); chips.forEach(function (ch) { ch.style.setProperty('--o', o.toFixed(3)); }); fan.style.transform = 'translateY(' + (y * .35).toFixed(1) + 'px)'; }
    var docEnd = document.documentElement.scrollHeight - vh, start = hero.offsetHeight * .6;
    bar.classList.toggle('on', y > start);
    var f = Math.max(0, Math.min(1, (y - start) / Math.max(1, docEnd - start))) * 6;
    pi.forEach(function (p, i) { p.style.setProperty('--f', Math.max(0, Math.min(1, f - i)).toFixed(3)); });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
