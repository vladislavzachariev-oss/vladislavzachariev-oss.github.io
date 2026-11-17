(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* k = barva služby, kt = barva písma na ní, kd = tmavší odstín pro cenu na bílé, tint = pozadí sekce s autem */
  var S = [
    { kind: 'Servis', name: 'Pravidelný servis', price: 'od 1 290 Kč', time: 'Trvá asi 1,5 hodiny, mezitím si u nás dáte kávu.',
      txt: 'Olej a filtry podle výrobce, kontrola brzd, kapalin a podvozku, zápis do servisní knížky.',
      k: '#ff8a3d', kt: '#fff', kd: '#e8650f', tint: '#ffe6d1',
      ic: '<path d="M7 9h10l2 3v6H5v-6z"/><path d="M9 9V6h6v3M5 15H3M21 15h-2"/>' },
    { kind: 'Brzdy', name: 'Brzdy a podvozek', price: 'od 1 100 Kč', time: 'Výměna destiček na jedné nápravě trvá asi hodinu.',
      txt: 'Destičky, kotouče, tlumiče a geometrie. Změříme kotouče, takže víte, kolik vám ještě vydrží.',
      k: '#ff4d6d', kt: '#fff', kd: '#e11d48', tint: '#ffe0e6',
      ic: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 7.5a7 7 0 0 1 4-2.4"/>' },
    { kind: 'Pneu', name: 'Pneuservis a uskladnění', price: 'od 690 Kč', time: 'Přezutí počkáte, trvá asi 40 minut.',
      txt: 'Přezutí, vyvážení a oprava defektu. Sadu kol vám přes sezónu uložíme v suchém skladu za 800 Kč.',
      k: '#3d7bfd', kt: '#fff', kd: '#2459d8', tint: '#dfe8ff',
      ic: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 3.5v4.5M12 16v4.5M3.5 12H8M16 12h4.5"/>' },
    { kind: 'Klima', name: 'Klimatizace', price: 'od 1 490 Kč', time: 'Trvá asi hodinu.',
      txt: 'Plnění, dezinfekce a hledání úniků. Nejlépe na jaře, než přijdou vedra.',
      k: '#12b5a5', kt: '#fff', kd: '#0b8c80', tint: '#d6f5f1',
      ic: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/>' },
    { kind: 'Diagnostika', name: 'Diagnostika', price: '690 Kč', time: 'Trvá asi 30 minut.',
      txt: 'Svítí kontrolka? Načteme chyby a změříme, co je opravdu vadné. Když opravu uděláme u nás, diagnostiku neplatíte.',
      k: '#8b5cf6', kt: '#fff', kd: '#6d3ee0', tint: '#ebe2ff',
      ic: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.3"/>' },
    { kind: 'STK', name: 'Příprava na STK', price: 'od 990 Kč', time: 'Odvoz na STK a zpět stojí 400 Kč.',
      txt: 'Auto projdeme zespodu i shora, drobné závady opravíme a na technickou s ním zajedeme za vás.',
      k: '#12b76a', kt: '#fff', kd: '#0b8a4f', tint: '#d8f6e6',
      ic: '<rect x="3.5" y="7" width="17" height="10" rx="2"/><path d="m8 12 2.5 2.5L16 9.5"/>' }
  ];

  var garage = $('#auto'), card = $('.card'), cur = -1, picked = 0;
  var F = {}; $$('[data-f]', card).forEach(function (el) { F[el.getAttribute('data-f')] = el; });

  function paint(el, s) { el.style.setProperty('--k', s.k); el.style.setProperty('--kt', s.kt); el.style.setProperty('--kd', s.kd); }
  $$('.chips button, .pin').forEach(function (b) { paint(b, S[+b.getAttribute('data-s')]); });

  function select(i, user) {
    if (i === cur) return;
    cur = i; var s = S[i];
    garage.setAttribute('data-c', String(i));
    garage.style.setProperty('--tint', s.tint);
    card.style.setProperty('--c', s.k); card.style.setProperty('--ct', s.kt);
    F.kind.textContent = s.kind; F.name.textContent = s.name; F.price.textContent = s.price; F.time.textContent = s.time; F.txt.textContent = s.txt;
    if (user) { card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap'); }
    $$('.chips button, .pin').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-s') === i)); });
  }
  $$('.chips button, .pin').forEach(function (b) {
    b.addEventListener('click', function () { select(+b.getAttribute('data-s'), true); });
  });
  select(0, false);

  /* ceník */
  var tiles = $('[data-tiles]');
  tiles.innerHTML = S.map(function (s, i) {
    return '<li class="tile" data-s="' + i + '" tabindex="0" role="button" aria-label="' + s.name + ', ' + s.price + ', ukázat na autě">' +
      '<i><svg viewBox="0 0 24 24" aria-hidden="true">' + s.ic + '</svg></i><b>' + s.name + '</b><strong>' + s.price + '</strong><span>' + s.time + '</span></li>';
  }).join('');
  $$('.tile', tiles).forEach(function (t) {
    var i = +t.getAttribute('data-s'); paint(t, S[i]); t.style.setProperty('--tint', S[i].tint);
    var go = function () { select(i, true); garage.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    t.addEventListener('click', go);
    t.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });

  /* objednání: služba a den */
  var pickS = $('[data-pick-s]');
  pickS.innerHTML = S.map(function (s, i) { return '<button type="button" data-i="' + i + '">' + s.kind + '</button>'; }).join('');
  function setPick(i) {
    picked = i;
    $$('button', pickS).forEach(function (b) { var on = +b.getAttribute('data-i') === i; b.setAttribute('aria-pressed', String(on)); if (on) paint(b, S[i]); });
  }
  $$('button', pickS).forEach(function (b) { b.addEventListener('click', function () { setPick(+b.getAttribute('data-i')); }); });
  setPick(0);
  $('[data-go]').addEventListener('click', function () { setPick(cur); });

  var DN = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'], days = $('[data-days]'), d = new Date(), out = [];
  d.setHours(12, 0, 0, 0);
  while (out.length < 6) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) out.push(new Date(d)); }
  days.innerHTML = out.map(function (x, i) {
    return '<button type="button" aria-pressed="' + (i === 0) + '"><span>' + DN[x.getDay()] + '</span><small>' + x.getDate() + '. ' + (x.getMonth() + 1) + '.</small></button>';
  }).join('');
  $$('button', days).forEach(function (b) {
    b.addEventListener('click', function () { $$('button', days).forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); }); });
  });

  $('[data-form]').addEventListener('submit', function (e) { e.preventDefault(); $('[data-ok]').hidden = false; });

  /* živě otevřeno / zavřeno (čas v Liberci) */
  var H = { 1: [7, 17], 2: [7, 17], 3: [7, 17], 4: [7, 17], 5: [7, 17], 6: [8, 12], 0: null };
  function live() {
    var now;
    try { now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Prague' })); } catch (e) { now = new Date(); }
    var day = now.getDay(), h = now.getHours() + now.getMinutes() / 60, o = H[day], open = !!o && h >= o[0] && h < o[1];
    var txt = open ? 'Otevřeno do ' + o[1] + ':00' : 'Teď zavřeno';
    $$('[data-live]').forEach(function (el) { el.classList.toggle('is-off', !open); $('span', el).textContent = txt; });
    $$('[data-hours] li').forEach(function (li) { li.classList.toggle('today', +li.getAttribute('data-d') === day); });
  }
  live(); setInterval(live, 60000);
})();
