/* Whyte Lynx — konfigurátor „Načrtněte si svůj web“ (J 2026-10-17, v3).
   Z 16. 10.: „ať si ty lidi v podstatě můžou načrtnout ten jejich web v konfigurátoru a poslat mi ho do mailu,
   jak by chtěli, aby vypadal“, „musí být extrémně nabušený“, obory do konfigurátoru nepsat vůbec.
   Z 17. 10.: inspirace konfigurátory aut (Mercedes, BMW, Ferrari): „mnohem víc možností a ať si tu stránku můžou
   v podstatě navrhnout rovnou, ale aby to nebylo zas moc dlouhé“. Proto: řady (hotové styly) jako výbava aut, náhled volby
   už při najetí myší, pohled na celou stránku, uložené verze A/B/C, 5 kroků s „doladěním“ schovaným pod rozbalovacím
   oddílem a úpravy přímo v náhledu (lišta u každé části: vzhled, posunout, skrýt; přidat část).
   Stav → náhled stránky (šablony níže) → odkaz #navrh=… (deflate + base64url) → odeslání přes kontakt.php
   i s vlastní fotkou a logem v příloze. Texty v náhledu jdou přepsat přímo kliknutím.
   Z 17. 10. 23:25: „pro lidi to bude moc náročné, zjednodušíme to… 10 krásných stylů a vychytávek už představených,
   aby si to lidi mohli naklikat jedním klikem… odeslání dotazu a jak si přejou ten web udělat dej vedle toho… zvětši
   ten mobil a počítač“. Proto (v4): napřed jednoduchý výběr — 10 stylů jedním klikem, vychytávky s ikonou a popiskem
   (zapnutá se hned ukáže v náhledu) a formulář vedle velkého náhledu. Celých 5 kroků zůstává pod „Doladit do detailu“.
   Z 18. 10. (v5): 14 opravdu různých stylů (charakter sk: linky, časopis, razítka, pruhy, plán, neon, plakát, geometrie…),
   lišty v náhledu v jednom řádku s malým křížkem, křížek i u vychytávek, větší telefon a počítač na úzké obrazovce. */
(function () {
  'use strict';
  var d = document, app = d.getElementById('nv');
  if (!app || !window.JSON || !d.querySelector) return;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); };
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)');
  var narrow = function () { return innerWidth <= 980; };
  var own = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  /* ---------- volby ---------- */
  // barvy po skupinách jako laky u aut; jména jsou česká, bez kódů
  var COLORS = [
    ['#161616', 'Uhel', 'k'], ['#4a4f57', 'Břidlice', 'k'], ['#1f3c6e', 'Námořní', 'k'], ['#2f5d46', 'Lesní', 'k'], ['#7a1f2b', 'Bordó', 'k'], ['#8c6d3b', 'Oříšek', 'k'],
    ['#1c31c9', 'Kobalt', 's'], ['#0f8b8d', 'Petrolej', 's'], ['#3d7a52', 'Zelená', 's'], ['#5b3fd1', 'Fialová', 's'], ['#7c5cff', 'Ultrafialová', 's'], ['#14b8a6', 'Tyrkys', 's'], ['#e8238f', 'Malina', 's'], ['#c9392b', 'Červená', 's'], ['#d0582a', 'Mandarinka', 's'], ['#f5c518', 'Slunečnice', 's'],
    ['#8fb3a0', 'Šalvěj', 'j'], ['#9db4d6', 'Holubí', 'j'], ['#c7a4d8', 'Levandule', 'j'], ['#e8a7a0', 'Pudrová', 'j'], ['#e6c37a', 'Med', 'j'], ['#a8d5c8', 'Máta', 'j'],
    ['#a0522d', 'Terakota', 'z'], ['#b5835a', 'Karamel', 'z'], ['#4e3b31', 'Káva', 'z'], ['#6b705c', 'Olivová', 'z'], ['#5f6f3a', 'Mech', 'z'], ['#c2a878', 'Písek', 'z']
  ];
  var CGRP = { k: 'Klasické', s: 'Syté', j: 'Jemné', z: 'Zemité' };
  var cname = function (h) { var c = COLORS.filter(function (x) { return x[0] === h; })[0]; return c ? c[1] : ''; };
  var FONTS = {
    moderni: { n: 'Moderní', f: "'Archivo',system-ui,sans-serif", w: 700, s: '100%', t: 'none', l: '-.025em' },
    uzke: { n: 'Úzké', f: "'Archivo',system-ui,sans-serif", w: 800, s: '68%', t: 'uppercase', l: '-.005em' },
    klasicke: { n: 'Klasické', f: "'Lora',Georgia,serif", w: 600, s: '100%', t: 'none', l: '-.01em' },
    kulate: { n: 'Kulaté', f: "'Nunito',system-ui,sans-serif", w: 800, s: '100%', t: 'none', l: '-.01em' },
    geometricke: { n: 'Geometrické', f: "'Sora',system-ui,sans-serif", w: 700, s: '100%', t: 'none', l: '-.03em' },
    charakterni: { n: 'Charakterní', f: "'Bricolage Grotesque',system-ui,sans-serif", w: 800, s: '100%', t: 'none', l: '-.03em' },
    technicke: { n: 'Technické', f: "'Space Grotesk',system-ui,sans-serif", w: 700, s: '100%', t: 'none', l: '-.03em' },
    vyrazne: { n: 'Výrazné', f: "'Unbounded',system-ui,sans-serif", w: 700, s: '100%', t: 'none', l: '-.02em', k: .8 },
    rucni: { n: 'Ruční', f: "'Caveat',cursive", w: 700, s: '100%', t: 'none', l: '0', k: 1.3 },
    // v5 (Z 18. 10.: „kompletně různých stylů“): Fraunces má osy SOFT a WONK, jedno písmo dá ostrý časopis, měkkou přírodu i retro
    casopis: { n: 'Časopisové', f: "'Fraunces',Georgia,serif", w: 600, s: '100%', t: 'none', l: '-.025em', v: "'SOFT' 0,'WONK' 0" },
    mekke: { n: 'Měkké', f: "'Fraunces',Georgia,serif", w: 600, s: '100%', t: 'none', l: '-.015em', v: "'SOFT' 100,'WONK' 0" },
    retro: { n: 'Retro', f: "'Fraunces',Georgia,serif", w: 900, s: '100%', t: 'none', l: '-.035em', v: "'SOFT' 100,'WONK' 1" },
    patkove: { n: 'Patkové', f: "'Bitter',Georgia,serif", w: 700, s: '100%', t: 'none', l: '-.015em' },
    siroke: { n: 'Široké', f: "'Archivo',system-ui,sans-serif", w: 900, s: '118%', t: 'uppercase', l: '-.03em', k: .78 },
    tenke: { n: 'Tenké', f: "'Archivo',system-ui,sans-serif", w: 300, s: '100%', t: 'none', l: '-.045em' }
  };
  var BFONTS = { moderni: ['Moderní', "'Archivo',system-ui,sans-serif"], klasicke: ['Klasické', "'Lora',Georgia,serif"], kulate: ['Kulaté', "'Nunito',system-ui,sans-serif"], technicke: ['Technické', "'Space Grotesk',system-ui,sans-serif"],
    strojove: ['Strojové', "'JetBrains Mono',ui-monospace,monospace"] };
  var HEROS = { vedle: 'Fotka vedle textu', pres: 'Fotka přes celou šířku', pod: 'Fotka pod textem', deleny: 'Půl na půl', text: 'Jen velký nadpis' };
  // fotky: s = ke stylu (každý hotový styl má svou), t = podle zaměření; bez názvů oborů (Z 16. 10.), náhled img/obor/t-KLÍČ.webp
  var PHOTOS = [['pokoj', 'Světlo', 's'], ['kontrast', 'Kontrast', 's'], ['klid', 'Klid', 's'], ['radost', 'Radost', 's'], ['noc', 'Noc', 's'], ['zelen', 'Zeleň', 's'],
    ['ruce', 'Ruce', 't'], ['autoservis', 'Dílna', 't'], ['jidlo', 'Jídlo', 't'], ['kavarna', 'Útulno', 't'], ['zahrada', 'Zahrada', 't'], ['dum', 'Dům', 't'],
    ['pece', 'Péče', 't'], ['kadernictvi', 'Zrcadla', 't'], ['koupelna', 'Čisto', 't'], ['kancelar', 'Kancelář', 't'], ['obchod', 'Obchod', 't'],
    ['svetnice', 'Večer', 't'], ['krajina', 'Krajina', 't'], ['salek', 'Detail', 't'], ['hala', 'Tma', 't'],
    ['soumrak', 'Soumrak', 't'], ['zare', 'Záře', 't']];
  var PH = {}; PHOTOS.forEach(function (p) { PH[p[0]] = p; });
  // obor z podstránky (web-pro-*.html → ./#obor=autoservis): styl, fotka a texty pro ten obor, vše jde dál upravit (22. 10.)
  var OBORY = {
    autoservis: { p: 'remeslny', i: 'autoservis', t: { name: 'Váš autoservis', kick: 'Autoservis a pneuservis · Vaše město', title: 'Servis, na který se dá spolehnout', sub: 'Opravy, pneuservis a příprava na STK. Termín si objednáte online, nebo jedním ťuknutím zavoláte.', btn: 'Objednat servis', s1: 'Opravy a údržba', s1d: 'Olej, brzdy, rozvody i diagnostika.', s2: 'Pneuservis', s2d: 'Přezutí, vyvážení a uskladnění kol.', s3: 'Příprava na STK', s3d: 'Auto zkontrolujeme a připravíme na technickou.' } },
    kadernictvi: { p: 'elegantni', i: 'kadernictvi', t: { name: 'Vaše kadeřnictví', kick: 'Kadeřnictví · Vaše město', title: 'Účes, se kterým se budete cítit dobře', sub: 'Střih, barvení i melír. Objednejte se online, nebo zavolejte.', btn: 'Objednat se', s1: 'Dámské střihy', s1d: 'Střih, foukaná a styling.', s2: 'Barvení a melír', s2d: 'Poradíme, co Vám bude slušet.', s3: 'Pánské střihy', s3d: 'Rychle a bez čekání.' } },
    restaurace: { p: 'vyloha', i: 'jidlo', t: { name: 'Váš podnik', kick: 'Restaurace · Vaše město', title: 'Dobré jídlo kousek od Vás', sub: 'Menu, otevírací doba a rezervace stolu na jednom místě.', btn: 'Rezervovat stůl', s1: 'Polední menu', s1d: 'Každý všední den něco jiného.', s2: 'Večerní kuchyně', s2d: 'Na večeři s přáteli i ve dvou.', s3: 'Jídlo s sebou', s3d: 'Objednejte a vyzvedněte si.' } },
    remeslnik: { p: 'hloubka', i: 'dum', t: { name: 'Vaše firma', kick: 'Řemeslník · Vaše město a okolí', title: 'Poctivá práce, kterou je vidět', sub: 'Podívejte se na hotové zakázky a napište, co potřebujete.', btn: 'Poptat zakázku', s1: 'Hlavní služba', s1d: 'Co děláte nejčastěji.', s2: 'Renovace', s2d: 'Opravy a obnova toho, co už máte.', s3: 'Montáž', s3d: 'Na klíč, včetně úklidu.' } },
    ubytovani: { p: 'prirodni', i: 'krajina', t: { name: 'Vaše chata', kick: 'Ubytování · Vaše místo', title: 'Klid, výhled a nikdo kolem', sub: 'Podívejte se na pokoje a okolí a napište nám, kdy chcete přijet.', btn: 'Poptat termín', s1: 'Pokoje', s1d: 'Kolik lidí se vejde a co je v ceně.', s2: 'Okolí', s2d: 'Výlety, koupání a sjezdovky.', s3: 'Cesta k nám', s3d: 'Kde zaparkovat i v zimě.' } },
    obchod: { p: 'hravy', i: 'obchod', t: { name: 'Váš obchod', kick: 'Obchod · Vaše město', title: 'Přijďte se podívat, co je nového', sub: 'Otevírací doba, sortiment a objednávka na jednom místě.', btn: 'Objednat', s1: 'Sortiment', s1d: 'Co u nás koupíte.', s2: 'Objednávka', s2d: 'Napište a připravíme Vám to.', s3: 'Kde nás najdete', s3d: 'Adresa a otevírací doba.' } }
  };
  // galerie a fotky v částech berou fotky, které k té hlavní ladí (světlé ke světlým, tmavé k tmavým, příroda k přírodě);
  // předtím šly popořadě a vedle chaty v lese stál šálek a tmavá hala (22. 10.)
  var NB = {
    pokoj: 'koupelna kancelar kavarna kadernictvi pece obchod klid', koupelna: 'pokoj pece kancelar kadernictvi klid dum salek',
    kancelar: 'pokoj koupelna kavarna salek kadernictvi klid obchod', kavarna: 'jidlo salek obchod pokoj svetnice radost kancelar',
    kadernictvi: 'pece pokoj koupelna kavarna klid salek obchod', pece: 'kadernictvi klid koupelna pokoj salek zelen kavarna',
    obchod: 'kavarna jidlo ruce pokoj svetnice salek kadernictvi', ruce: 'autoservis obchod jidlo svetnice kontrast dum kavarna',
    autoservis: 'ruce kontrast dum hala obchod kancelar noc', jidlo: 'kavarna salek obchod radost zelen svetnice ruce',
    salek: 'kavarna jidlo klid pece pokoj obchod svetnice', klid: 'salek pece koupelna pokoj zelen kadernictvi svetnice',
    radost: 'jidlo kavarna zahrada salek zelen pece obchod', zelen: 'zahrada krajina dum svetnice jidlo klid pece',
    zahrada: 'zelen dum krajina svetnice radost jidlo ruce', dum: 'zahrada krajina zelen svetnice ruce autoservis koupelna',
    krajina: 'svetnice dum zahrada zelen jidlo salek klid', svetnice: 'krajina dum soumrak noc kavarna jidlo zahrada',
    noc: 'hala soumrak zare svetnice kontrast autoservis kavarna', hala: 'noc zare soumrak autoservis kontrast ruce svetnice',
    soumrak: 'noc svetnice zare kavarna hala jidlo obchod', zare: 'ruce hala noc soumrak autoservis svetnice obchod',
    kontrast: 'ruce autoservis hala noc obchod dum radost'
  };
  var RADII = { ostre: ['Ostré', 0, 0], jemne: ['Jemné', 12, 8], kulate: ['Kulaté', 26, 999] };
  // jednoduché volby: klíč stavu → { hodnota: popisek }; první hodnota je výchozí
  var O = {
    bg: { bila: 'Bílé', krem: 'Krémové', seda: 'Šedé', tmava: 'Tmavé', barva: 'Do barvy' },
    pat: { zadny: 'Žádný', tecky: 'Tečky', mriz: 'Mřížka', zrno: 'Zrno' },
    hs: { velke: 'Velké', stridme: 'Střídmé', obri: 'Obří' },
    b: { plna: 'Plná', obrys: 'Obrysová', podtrzena: 'Podtržená' },
    sh: { plochy: 'Bez stínů', jemny: 'Jemné', vyrazny: 'Výrazné' },
    hh: { bezna: 'Běžná', vysoka: 'Na celou obrazovku' },
    al: { vlevo: 'Vlevo', stred: 'Na střed' },
    ft: { barva: 'Barevně', cb: 'Černobíle', tint: 'Do barvy', teple: 'Tepleji' },
    ps: { rohy: 'Podle rohů', oblouk: 'Oblouk', vyrez: 'Zkosený roh' },
    nav: { klasicka: 'Klasická', barevna: 'Barevná', lista: 'S lištou kontaktů', stred: 'Logo uprostřed' },
    mk: { ctverec: 'Čtvereček', kruh: 'Kolečko', inicial: 'Počáteční písmeno' },
    sep: { cara: 'Čára', strid: 'Střídání pozadí', vlna: 'Vlna', nic: 'Nic' },
    dn: { bezna: 'Běžné', vzdusna: 'Vzdušné', usporna: 'Úsporné' },
    an: { zadne: 'Žádné', jemne: 'Jemné', vyrazne: 'Výrazné' },
    ico: { tecky: 'Barevné body', ikony: 'Ikony', nic: 'Bez ikon' },
    // charakter = ozdoby a tvary, které ze stejné kostry udělají jiný web (linky, razítka, pruhy, plán, neon, plakát…)
    sk: { zadny: 'Čistý', jemny: 'Jemné linky', magazin: 'Časopis', organic: 'Přírodní tvary', rustik: 'Venkovský', soft: 'Pastelové plochy', retro: 'Retro pruhy',
      hravy: 'Hravý', pop: 'Komiks', dilna: 'Dílna', blueprint: 'Technický plán', neon: 'Neon', plakat: 'Plakát', bauhaus: 'Geometrie',
      bily: 'Bez barvy', hloubka: 'Hloubka (3D)', sklo: 'Sklo (3D)', vyloha: 'Výloha (3D)' }
  };
  var SECS = { sluzby: 'Služby', proc: 'Proč my', onas: 'O nás', galerie: 'Galerie', cenik: 'Ceník', postup: 'Jak to probíhá', tym: 'Kdo jsme', novinky: 'Novinky',
    partneri: 'Spolupracujeme', otazky: 'Časté otázky', vyzva: 'Výzva k akci', formular: 'Poptávkový formulář', kontakt: 'Kontakt a mapa' };
  var NAVN = { sluzby: 'Služby', proc: 'Proč my', onas: 'O nás', galerie: 'Galerie', cenik: 'Ceník', postup: 'Postup', tym: 'Tým', novinky: 'Novinky', partneri: 'Partneři',
    otazky: 'Otázky', vyzva: 'Poradit', formular: 'Napište nám', kontakt: 'Kontakt' };
  // vzhledy jednotlivých částí (první je výchozí)
  var VARS = {
    sluzby: { karty: 'Karty', seznam: 'Seznam', fotky: 'S fotkami' },
    proc: { sloupce: 'Sloupce', pruh: 'Barevný pruh' },
    onas: { vpravo: 'Fotka vpravo', vlevo: 'Fotka vlevo', text: 'Jen text' },
    galerie: { mozaika: 'Mozaika', mrizka: 'Mřížka', pas: 'Pás' },
    cenik: { radky: 'Řádky', karty: 'Karty' },
    postup: { vedle: 'Vedle sebe', osa: 'Časová osa' },
    tym: { hranate: 'Hranaté', kulate: 'Kulaté' },
    vyzva: { barva: 'V barvě', foto: 'Přes fotku' },
    formular: { sam: 'Samotný', vedle: 'S textem vedle' },
    kontakt: { mapa: 'S mapou', velka: 'Velká mapa', udaje: 'Jen údaje' }
  };
  var EXTRAS = { volat: 'Tlačítko Zavolat v hlavičce', lista: 'Spodní lišta na mobilu', rez: 'Online rezervace termínu', hod: 'Otevírací doba', akce: 'Oznámení nahoře (akce, dovolená)',
    google: 'Odkaz na profil na Googlu', soc: 'Sociální sítě', wa: 'Tlačítko WhatsApp', jaz: 'Více jazyků', chat: 'Chatovací bublina' };
  // krátké popisky pro přepínače v panelu (dva sloupce); do souhrnu jdou dlouhé z EXTRAS
  var EXS = { volat: 'Tlačítko Zavolat', lista: 'Lišta na mobilu', rez: 'Rezervace online', hod: 'Otevírací doba', akce: 'Oznámení nahoře',
    google: 'Profil na Googlu', soc: 'Sociální sítě', wa: 'WhatsApp', jaz: 'Více jazyků', chat: 'Chat' };
  // hotové styly = „řady“ jako u aut: nastaví vzhled celé stránky najednou; co v řadě chybí, bere se z DEF
  // v5 (Z 18. 10.: „cca 10 možná i více kompletně různých stylů, aby každý vypadal originálně a nebyl jen Clean“): každý styl má
  // vlastní charakter (sk), písmo, barvy a rozvržení úvodu, rozvržení se mezi styly střídají
  var PRESETS = {
    cisty: { n: 'Čistý', c: '#161616', bg: 'bila', f: 'moderni', hero: 'vedle', img: 'pokoj', r: 'jemne', b: 'plna' },
    elegantni: { n: 'Elegantní', c: '#2f5d46', bg: 'krem', f: 'klasicke', bf: 'klasicke', hero: 'pres', img: 'klid', r: 'ostre', b: 'obrys', al: 'stred', nav: 'stred', dn: 'vzdusna', an: 'jemne', sk: 'jemny' },
    magazin: { n: 'Magazín', c: '#161616', c2: '#c9392b', bg: 'bila', f: 'casopis', bf: 'klasicke', hero: 'pod', img: 'ruce', r: 'ostre', b: 'podtrzena', hs: 'obri', ft: 'cb', sk: 'magazin' },
    prirodni: { n: 'Přírodní', c: '#3d7a52', c2: '#a0522d', bg: 'krem', f: 'mekke', hero: 'vedle', img: 'zelen', r: 'kulate', b: 'plna', sep: 'strid', ft: 'teple', ico: 'ikony', sk: 'organic' },
    venkov: { n: 'Venkovský', c: '#7a1f2b', c2: '#5f6f3a', bg: 'krem', f: 'patkove', bf: 'klasicke', hero: 'vedle', img: 'svetnice', r: 'jemne', b: 'plna', pat: 'zrno', ft: 'teple', mk: 'inicial', sk: 'rustik' },
    pastelovy: { n: 'Pastelový', c: '#e8a7a0', c2: '#5f6f3a', bg: 'barva', f: 'geometricke', hero: 'deleny', img: 'pece', r: 'kulate', b: 'plna', sh: 'jemny', mk: 'kruh', sep: 'nic', sk: 'soft' },
    retro: { n: 'Retro', c: '#d0582a', c2: '#e6c37a', bg: 'krem', f: 'retro', hero: 'text', img: 'kavarna', r: 'jemne', b: 'plna', nav: 'barevna', pat: 'zrno', ft: 'teple', mk: 'inicial', sep: 'nic', sk: 'retro' },
    hravy: { n: 'Hravý', c: '#e8238f', c2: '#f5c518', bg: 'barva', f: 'kulate', bf: 'kulate', hero: 'pod', img: 'radost', r: 'kulate', b: 'plna', mk: 'kruh', sep: 'vlna', ico: 'ikony', an: 'vyrazne', sk: 'hravy' },
    pop: { n: 'Komiks', c: '#5b3fd1', c2: '#a8d5c8', bg: 'krem', f: 'charakterni', hero: 'vedle', img: 'obchod', r: 'jemne', b: 'plna', sep: 'nic', ico: 'ikony', sk: 'pop' },
    remeslny: { n: 'Řemeslný', c: '#f5c518', c2: '#161616', bg: 'seda', f: 'uzke', hero: 'pres', img: 'autoservis', r: 'ostre', b: 'plna', nav: 'lista', sep: 'nic', hh: 'vysoka', ico: 'ikony', sk: 'dilna' },
    technicky: { n: 'Technický', c: '#1f3c6e', c2: '#d0582a', bg: 'barva', f: 'technicke', bf: 'strojove', hero: 'text', img: 'kancelar', r: 'ostre', b: 'obrys', pat: 'mriz', ico: 'ikony', sk: 'blueprint' },
    tmavy: { n: 'Noční', c: '#7c5cff', c2: '#14b8a6', bg: 'tmava', f: 'geometricke', hero: 'pres', img: 'noc', r: 'jemne', b: 'plna', hh: 'vysoka', pat: 'mriz', ico: 'ikony', sk: 'neon' },
    vyrazny: { n: 'Výrazný', c: '#c9392b', bg: 'bila', f: 'siroke', hero: 'pod', img: 'kontrast', r: 'ostre', b: 'plna', hs: 'obri', ft: 'tint', sep: 'nic', an: 'vyrazne', sk: 'plakat' },
    bauhaus: { n: 'Geometrický', c: '#1c31c9', c2: '#f5c518', bg: 'krem', f: 'vyrazne', hero: 'deleny', img: 'dum', r: 'ostre', b: 'plna', mk: 'kruh', sep: 'nic', sk: 'bauhaus' },
    noblesni: { n: 'Noblesní', c: '#4e3b31', bg: 'krem', f: 'klasicke', bf: 'klasicke', hero: 'pod', img: 'salek', r: 'ostre', b: 'podtrzena', hs: 'obri', al: 'stred', ft: 'teple', dn: 'vzdusna', nav: 'stred', an: 'jemne' },
    svezi: { n: 'Svěží', c: '#0f8b8d', bg: 'bila', f: 'kulate', hero: 'vedle', img: 'koupelna', r: 'kulate', b: 'plna', ps: 'oblouk', an: 'jemne', sh: 'jemny', ico: 'ikony' },
    // v6 (Z 21. 10.: „každý bude svůj a originální se 3d efektama bez barvy celý čistý bílý“, „nějaký dlouhý nějaký krátký“)
    bily: { n: 'Bílý', c: '#161616', bg: 'bila', f: 'tenke', hero: 'text', img: 'koupelna', r: 'ostre', b: 'obrys', hs: 'obri', ft: 'cb', sep: 'cara', ico: 'nic', dn: 'vzdusna', an: 'jemne', sk: 'bily' },
    hloubka: { n: 'Hloubka', d3: 1, c: '#1c31c9', c2: '#e6c37a', bg: 'seda', f: 'geometricke', hero: 'vedle', img: 'krajina', r: 'kulate', b: 'plna', sh: 'vyrazny', ico: 'ikony', sep: 'nic', an: 'jemne', sk: 'hloubka' },
    sklo: { n: 'Sklo', d3: 1, c: '#7c5cff', c2: '#14b8a6', bg: 'barva', f: 'geometricke', hero: 'text', img: 'salek', r: 'kulate', b: 'plna', al: 'stred', sep: 'nic', ico: 'ikony', an: 'jemne', sk: 'sklo' },
    vyloha: { n: 'Výloha', d3: 1, c: '#161616', c2: '#d0582a', bg: 'bila', f: 'charakterni', hero: 'pod', img: 'jidlo', r: 'jemne', b: 'plna', sep: 'nic', an: 'jemne', sk: 'vyloha' }
  };
  // délka stránky stylu: krátká (2–3 části), střední (4–5), dlouhá (6+); úvod a patička jsou vždy
  var LENS = {
    bily: ['sluzby', 'onas', 'kontakt'], cisty: ['sluzby', 'onas', 'galerie', 'kontakt'],
    hloubka: ['sluzby', 'proc', 'galerie', 'postup', 'cenik', 'otazky', 'kontakt'], sklo: ['sluzby', 'proc', 'cenik', 'formular', 'kontakt'],
    vyloha: ['galerie', 'sluzby', 'onas', 'cenik', 'vyzva', 'kontakt'], elegantni: ['onas', 'sluzby', 'galerie', 'kontakt'],
    magazin: ['onas', 'galerie', 'sluzby', 'novinky', 'tym', 'kontakt'], prirodni: ['sluzby', 'proc', 'galerie', 'kontakt'],
    retro: ['sluzby', 'cenik', 'galerie', 'kontakt'], hravy: ['sluzby', 'galerie', 'kontakt'], pop: ['sluzby', 'cenik', 'otazky', 'kontakt'],
    remeslny: ['sluzby', 'proc', 'galerie', 'cenik', 'postup', 'otazky', 'kontakt'], technicky: ['sluzby', 'postup', 'cenik', 'tym', 'otazky', 'formular', 'kontakt'],
    tmavy: ['sluzby', 'galerie', 'kontakt'], vyrazny: ['sluzby', 'vyzva', 'kontakt'], bauhaus: ['sluzby', 'proc', 'galerie', 'kontakt']
  };
  Object.keys(LENS).forEach(function (k) { PRESETS[k].on = LENS[k]; });
  var lenOf = function (p) { var n = p.on ? p.on.length : 0; return !n ? '' : n <= 3 ? 'krátká' : n <= 5 ? 'střední' : 'dlouhá'; };
  // jednoduchý výběr: 14 stylů od klidných po výrazné (Noblesní a Svěží zůstávají jen v „Doladit do detailu“, staré odkazy fungují)
  // v6: 16 stylů; Venkovský a Pastelový se podobaly Retru a Hravému, zůstávají v „Doladit do detailu“
  var EASY = ['bily', 'cisty', 'hloubka', 'sklo', 'vyloha', 'elegantni', 'magazin', 'prirodni', 'retro', 'hravy', 'pop', 'remeslny', 'technicky', 'tmavy', 'vyrazny', 'bauhaus'];
  var EXD = { volat: 'Zavolají Vám jedním klepnutím', lista: 'Zavolat a Napsat stále po ruce', rez: 'Termín si vyberou sami', hod: 'Hned vidí, kdy máte otevřeno', akce: 'Akce, dovolená, novinka',
    google: 'Odkaz na Vaši firmu na mapě', soc: 'Facebook, Instagram', wa: 'Zpráva jedním klepnutím', jaz: 'Třeba i anglicky', chat: 'Bublina pro rychlý dotaz' };
  var GICO = {
    volat: '<path d="M6.6 3.5 9 3l1.7 4-2 1.5a11 11 0 0 0 6.8 6.8l1.5-2 4 1.7-.5 2.4a2 2 0 0 1-2 1.6A16.5 16.5 0 0 1 5 5.5a2 2 0 0 1 1.6-2z"/>',
    lista: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M7 16.5h10"/>',
    rez: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    hod: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    akce: '<path d="M4 10v4h3l7 4V6l-7 4z"/><path d="M18 9.5a3.5 3.5 0 0 1 0 5"/>',
    google: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    soc: '<path d="M12 19.5s-7.5-4.4-7.5-9.7A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.5c0 5.3-7.5 9.7-7.5 9.7z"/>',
    wa: '<path d="M4.5 19.5l1.2-3.6a7.8 7.8 0 1 1 2.9 2.7z"/>',
    jaz: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.6 2.6 14.4 0 17M12 3.5c-2.6 2.6-2.6 14.4 0 17"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>'
  };
  var PKEYS = ['c', 'c2', 'bg', 'pat', 'f', 'bf', 'hs', 'r', 'b', 'sh', 'hero', 'hh', 'img', 'ft', 'ps', 'al', 'nav', 'mk', 'sep', 'dn', 'an', 'ico', 'sk'];
  var TX = {
    name: 'Vaše firma', kick: 'Vaše město', title: 'Poctivá práce kousek od Vás',
    sub: 'Sem patří jedna dvě věty o tom, co děláte a proč si vybrat právě Vás. Klikněte na text a přepište ho.',
    btn: 'Domluvit termín', tel: '777 123 456', adr: 'Ulice 123, Vaše město', mail: 'info@vase-firma.cz', hours: 'Po–Pá 8:00–17:00',
    ann: 'Sem napište krátké oznámení, třeba akci nebo dovolenou',
    s_sluzby: 'Co pro Vás děláme', s1: 'Hlavní služba', s1d: 'Krátce popište, co zákazník dostane.', s2: 'Druhá služba', s2d: 'Pár slov stačí, podrobnosti doplníme spolu.', s3: 'Třetí služba', s3d: 'Cokoli dalšího, co nabízíte.',
    s_proc: 'Proč právě my', w1: 'Termín dodržíme', w1d: 'Řekneme, kdy to bude, a platí to.', w2: 'Cenu víte předem', w2d: 'Žádná překvapení na konci.', w3: 'Jsme kousek od Vás', w3d: 'Přijedeme, nebo se zastavte.',
    s_onas: 'O nás', onas: 'Kdo jste, jak dlouho to děláte a na čem Vám záleží. Lidé chtějí vědět, komu volají.',
    s_galerie: 'Naše práce', s_cenik: 'Ceník', c1: 'První položka', c2: 'Druhá položka', c3: 'Třetí položka', c4: 'Čtvrtá položka', cnote: 'Přesnou cenu řekneme předem.',
    s_postup: 'Jak to probíhá', p1: 'Ozvete se', p1d: 'Zavoláte nebo napíšete, co potřebujete.', p2: 'Domluvíme se', p2d: 'Cenu i termín víte předem.', p3: 'Hotovo', p3d: 'Uděláme to a máte klid.',
    s_tym: 'Kdo jsme', m1: 'Jméno Příjmení', r1: 'Vedení', m2: 'Jméno Příjmení', r2: 'Tým', m3: 'Jméno Příjmení', r3: 'Kancelář',
    s_novinky: 'Novinky', n1: 'Nová služba v nabídce', n2: 'Otevírací doba o svátcích', n3: 'Hledáme nového kolegu',
    s_partneri: 'Spolupracujeme s',
    s_otazky: 'Časté otázky', q1: 'Kolik to bude stát?', q2: 'Jak rychle máte volno?', q3: 'Kde Vás najdu?',
    s_vyzva: 'Nevíte si rady?', vyzvad: 'Zavolejte nebo napište, rádi poradíme.', vbtn: 'Zavolat',
    s_formular: 'Napište nám', fsub: 'Napište, co potřebujete. Ozveme se co nejdřív.', fbtn: 'Odeslat', s_kontakt: 'Kde nás najdete', s_rez: 'Vyberte si termín'
  };
  var TLBL = { name: 'Název firmy', kick: 'Řádek nad nadpisem', title: 'Hlavní nadpis', sub: 'Text pod nadpisem', btn: 'Hlavní tlačítko', tel: 'Telefon', adr: 'Adresa', mail: 'E-mail', hours: 'Otevírací doba', ann: 'Oznámení nahoře' };
  var DEF = {
    p: 'cisty', c: '#161616', c2: '', f: 'moderni', bf: 'moderni', hero: 'vedle', img: 'pokoj', r: 'jemne',
    ord: Object.keys(SECS), on: ['sluzby', 'onas', 'galerie', 'kontakt'], ex: ['volat', 'lista', 'hod'], vr: {}, t: {}, view: 'pc'
  };
  Object.keys(O).forEach(function (k) { DEF[k] = Object.keys(O[k])[0]; });
  var S = clone(DEF), hist = [], foto = null, logo = null, fromLink = false;
  var ov = false, peek = null, peekY = 0, selK = null, addOpen = false, seen = {}, io = null, pgrp = 's', vers = [];
  try { vers = JSON.parse(localStorage.getItem('wlVerze') || '[]'); if (!Array.isArray(vers)) vers = []; } catch (e) { vers = []; }
  var vr = function (k) { var v = S.vr[k]; return VARS[k] && own(VARS[k], v) ? v : VARS[k] ? Object.keys(VARS[k])[0] : ''; };

  /* ---------- barvy ---------- */
  function rgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; }
  function lum(h) { var c = rgb(h).map(function (v) { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
  function mix(a, b, t) { var x = rgb(a), y = rgb(b); return '#' + x.map(function (v, i) { var n = Math.round(v + (y[i] - v) * t).toString(16); return n.length < 2 ? '0' + n : n; }).join(''); }
  function ratio(a, b) { var l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); }
  function theme() {
    var c = S.c, t;
    if (S.bg === 'tmava') { t = { bg: '#141414', fg: '#f3f1ec', mut: '#a8a49b', card: '#1f1f1e', line: '#2e2d2b' }; if (lum(c) < .03) c = '#f3f1ec'; }
    else if (S.bg === 'krem') t = { bg: '#f6f1e7', fg: '#24211c', mut: '#6f685c', card: '#fffaf0', line: '#e5dccb' };
    else if (S.bg === 'seda') t = { bg: '#eef0f2', fg: '#15181c', mut: '#5d636b', card: '#ffffff', line: '#dce0e4' };
    else if (S.bg === 'barva') t = { bg: mix(c, '#ffffff', .9), fg: '#161616', mut: '#55524d', card: '#ffffff', line: mix(c, '#ffffff', .76) };
    else t = { bg: '#ffffff', fg: '#161616', mut: '#66645f', card: '#f5f4f1', line: '#e6e4df' };
    t.c = c;
    t.on = ratio(c, '#ffffff') >= 2.6 ? '#ffffff' : '#161616';
    t.cx = ratio(c, t.bg) >= 2.4 ? c : t.fg;
    var c2 = S.c2 || c; if (S.bg === 'tmava' && lum(c2) < .03) c2 = '#f3f1ec';
    t.c2 = c2; t.on2 = ratio(c2, '#ffffff') >= 2.6 ? '#ffffff' : '#161616'; t.cx2 = ratio(c2, t.bg) >= 2.4 ? c2 : t.fg;
    t.alt = S.bg === 'barva' ? mix(c, '#ffffff', .8) : t.card;
    return t;
  }

  /* ---------- texty a obrázky ---------- */
  var plain = (function () { var e = d.createElement('div'); try { e.contentEditable = 'plaintext-only'; } catch (er) { return false; } return e.contentEditable === 'plaintext-only'; })();
  var tx = function (k) { return S.t[k] != null ? S.t[k] : TX[k]; };
  var ed = function (k, tag, cls) { return '<' + tag + (cls ? ' class="' + cls + '"' : '') + ' data-t="' + k + '">' + esc(tx(k)) + '</' + tag + '>'; };
  var tv = function (k) { return '<span data-tv="' + k + '">' + esc(tx(k)) + '</span>'; };
  var has = function (k) { return S.ex.indexOf(k) > -1; };
  var isOn = function (k) { return S.on.indexOf(k) > -1; };
  function imgSrc() { if (S.img === 'vlastni') return foto || ''; if (S.img === 'zadna' || !PH[S.img]) return ''; return 'img/obor/' + S.img + '.webp'; }
  // galerie a obrázky v částech: nejdřív další fotky ze stejné skupiny (ke stylu / podle zaměření), pak ostatní
  function others(n) {
    var cur = PH[S.img], grp = cur ? cur[2] : 's', i = Math.max(0, PHOTOS.indexOf(cur)), near = [], same = [], rest = [];
    var nb = cur && NB[S.img] ? NB[S.img].split(' ') : [];
    nb.forEach(function (k) { if (PH[k]) near.push('img/obor/' + k + '.webp'); });
    for (var k = 1; k < PHOTOS.length; k++) { var p = PHOTOS[(i + k) % PHOTOS.length]; if (nb.indexOf(p[0]) < 0) (p[2] === grp ? same : rest).push('img/obor/' + p[0] + '.webp'); }
    return near.concat(same, rest).slice(0, n);
  }
  var ph = function (src, cls, lazy) { return '<span class="p-ph' + (cls ? ' ' + cls : '') + '"><img src="' + esc(src) + '" alt=""' + (lazy ? ' loading="lazy"' : '') + '></span>'; };
  function slug(s) {
    s = (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return (s || 'vase-firma').slice(0, 28);
  }
  var initial = function () { return (tx('name').trim().charAt(0) || 'V').toUpperCase(); };
  var SVG = {
    tel: '<svg viewBox="0 0 24 24"><path d="M6.6 3.5 9 3l1.7 4-2 1.5a11 11 0 0 0 6.8 6.8l1.5-2 4 1.7-.5 2.4a2 2 0 0 1-2 1.6A16 16 0 0 1 5 5.5a2 2 0 0 1 1.6-2z"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 22s7-6.4 7-12a7 7 0 0 0-14 0c0 5.6 7 12 7 12z"/><circle cx="12" cy="10" r="2.6" fill="var(--bg)"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    arr: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    cyc: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 0 1-14.3 4.9M4 12A8 8 0 0 1 18.3 7.1M18.5 3v4.3h-4.3M5.5 21v-4.3h4.3"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    bin: '<svg viewBox="0 0 24 24"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/></svg>'
  };
  // čárové ikony u služeb a výhod (obecné, ne podle oboru)
  var ICONS = ['<svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg>', '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    '<svg viewBox="0 0 24 24"><path d="M12 21s6.5-5.8 6.5-11a6.5 6.5 0 0 0-13 0c0 5.2 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>'];
  var ico = function (i) { return S.ico === 'nic' ? '' : S.ico === 'ikony' ? '<i class="p-ico ln">' + ICONS[(i - 1) % 3] + '</i>' : '<i class="p-ico"></i>'; };

  /* ---------- náhled: šablony stránky ---------- */
  function brand(cls) {
    var mark = logo ? '<img class="p-logo" src="' + logo + '" alt="">' : '<i class="p-mark">' + (S.mk === 'inicial' ? esc(initial()) : '') + '</i>';
    return '<span class="p-brand' + (cls ? ' ' + cls : '') + '">' + mark;
  }
  // lišta nad částí v náhledu: úpravy přímo na stránce (Z 17. 10.: „ať si tu stránku můžou v podstatě navrhnout rovnou“)
  // Z 18. 10.: „ať ty tlačítka jsou v pohodě a nic nepřetéká… ať ty tlačítka jde malým křížkem odebrat“: lišta je v jednom řádku
  // na horní hraně části (nezakrývá nadpis), malý křížek v rohu ji zavře; odebrání celé části je koš
  var tbx = '<button type="button" class="p-tbx" data-pa="close" aria-label="Zavřít lištu" title="Zavřít lištu">' + SVG.x + '</button>';
  var tl = function (pa, label, title, k) { return '<button type="button" class="p-tl" data-pa="' + pa + '"' + (k ? ' data-k="' + k + '"' : '') + ' title="' + title + '">' + SVG.cyc + '<span>' + label + '</span></button>'; };
  function tb(k) {
    var v = VARS[k];
    return '<span class="p-tb"><b>' + SECS[k] + '</b>' + (v ? tl('var', v[vr(k)], 'Přepnout vzhled části', k) : '') +
      '<button type="button" class="p-ti" data-pa="up" data-k="' + k + '" aria-label="Posunout výš" title="Posunout výš">' + SVG.up + '</button>' +
      '<button type="button" class="p-ti" data-pa="down" data-k="' + k + '" aria-label="Posunout níž" title="Posunout níž">' + SVG.down + '</button>' +
      '<button type="button" class="p-ti" data-pa="off" data-k="' + k + '" aria-label="Odebrat část" title="Odebrat část">' + SVG.bin + '</button>' + tbx + '</span>';
  }
  function nav(mob) {
    var links = mob ? '' : '<span class="p-links">' + S.ord.filter(isOn).slice(0, 4).map(function (k) { return '<span>' + NAVN[k] + '</span>'; }).join('') + '</span>';
    var lang = has('jaz') ? '<span class="p-lang"><b>CZ</b><span>EN</span><span>DE</span></span>' : '';
    var call = has('volat') ? '<span class="p-btn sm p-call">' + SVG.tel + (mob ? '' : tv('tel')) + '</span>' : '';
    var top = S.nav === 'lista' ? '<div class="p-top"><span>' + SVG.tel + tv('tel') + '</span>' + (mob ? '' : '<span>' + SVG.pin + tv('adr') + '</span>') + '<span class="p-tr">' + tv('hours') + '</span></div>' : '';
    var ann = has('akce') ? ed('ann', 'p', 'p-ann') : '';
    return ann + top + '<header class="p-nav" data-s="nav"><span class="p-tb"><b>Hlavička</b>' + tl('nav', O.nav[S.nav], 'Přepnout hlavičku') + tbx + '</span>' +
      brand() + ed('name', 'span') + '</span>' + links + '<span class="p-na">' + lang + call + (mob ? '<span class="p-burger"><i></i><i></i><i></i></span>' : '') + '</span></header>';
  }
  function hero() {
    var src = imgSrc();
    var badge = has('hod') ? '<span class="p-badge"><i></i>' + tv('hours') + '</span>' : '';
    var acts = '<div class="p-acts">' + ed('btn', 'span', 'p-btn') + '<span class="p-btn alt">' + (has('rez') ? 'Vybrat termín' : 'Zavolat') + '</span></div>';
    var t = '<span class="p-tb"><b>Úvod</b>' + tl('hero', HEROS[S.hero], 'Přepnout rozvržení úvodu') +
      (S.img !== 'vlastni' && S.hero !== 'text' ? tl('img', 'Fotka', 'Další fotka') : '') + tl('hh', 'Výška', 'Přepnout výšku úvodu') + tbx + '</span>';
    var ring = S.sk === 'vyloha' && src && (S.hero === 'pod' || S.hero === 'vedle' || S.hero === 'deleny');
    var pic = ring ? '<div class="p-img p-ring" data-scroller><div>' + [src].concat(others(7)).map(function (u, i) {
      return '<span class="p-ph" style="--i:' + i + '"><img src="' + esc(u) + '" alt=""' + (i ? ' loading="lazy"' : '') + '></span>'; }).join('') + '</div></div>'
      : '<div class="p-img p-ph">' + (src ? '<img src="' + esc(src) + '" alt="">' : '') + '</div>';
    var orbs = S.sk === 'sklo' ? '<span class="p-orbs" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' : '';
    return '<section class="p-hero" data-s="uvod">' + t + orbs + '<div class="p-txt">' + badge + ed('kick', 'p', 'p-kick') + ed('title', 'p', 'p-h p-h1') + ed('sub', 'p', 'p-sub') + acts + '</div>' +
      pic + '</section>';
  }
  function sec(k, body, cls) { return '<section class="p-sec p-s-' + k + ' v-' + (vr(k) || 'x') + (cls ? ' ' + cls : '') + '" data-s="' + k + '">' + tb(k) + ed('s_' + k, 'p', 'p-h p-h2') + body + '</section>'; }
  var three = function (fn) { return [1, 2, 3].map(fn).join(''); };
  var SEC = {
    sluzby: function () {
      var v = vr('sluzby'), imgs = others(6).slice(3);
      if (v === 'seznam') return sec('sluzby', '<div class="p-list">' + three(function (i) { return '<div class="p-li">' + ico(i) + ed('s' + i, 'b') + ed('s' + i + 'd', 'span') + '</div>'; }) + '</div>');
      return sec('sluzby', '<div class="p-grid3">' + three(function (i) {
        return '<div class="p-card">' + (v === 'fotky' ? ph(imgs[i - 1], 'p-cimg', 1) : ico(i)) + ed('s' + i, 'b') + ed('s' + i + 'd', 'span') + '</div>';
      }) + '</div>');
    },
    proc: function () {
      return sec('proc', '<div class="p-grid3 p-why">' + three(function (i) { return '<div>' + (S.ico === 'nic' ? '' : '<i class="p-ico ln">' + ICONS[0] + '</i>') + ed('w' + i, 'b') + ed('w' + i + 'd', 'span') + '</div>'; }) + '</div>');
    },
    onas: function () {
      var v = vr('onas');
      return sec('onas', v === 'text' ? ed('onas', 'p', 'p-lead p-big') : '<div class="p-two">' + ed('onas', 'p', 'p-lead') + '<div class="p-img p-ph"><img src="' + others(1)[0] + '" alt="" loading="lazy"></div></div>');
    },
    galerie: function () {
      var v = vr('galerie'), n = v === 'mrizka' ? 6 : 5, src = imgSrc(), list = (src ? [src] : []).concat(others(src ? n - 1 : n));
      return sec('galerie', '<div class="p-gal">' + list.map(function (u) { return ph(u, '', 1); }).join('') + '</div>');
    },
    cenik: function () {
      if (vr('cenik') === 'karty') return sec('cenik', '<div class="p-grid3">' + three(function (i) { return '<div class="p-card p-pc">' + ed('c' + i, 'b') + '<strong>od … Kč</strong><span class="p-btn alt">Poptat</span></div>'; }) + '</div>' + ed('cnote', 'p', 'p-note'));
      return sec('cenik', '<div class="p-prices">' + [1, 2, 3, 4].map(function (i) { return '<div class="p-price">' + ed('c' + i, 'span') + '<b>od … Kč</b></div>'; }).join('') + '</div>' + ed('cnote', 'p', 'p-note'));
    },
    postup: function () {
      return sec('postup', '<div class="' + (vr('postup') === 'osa' ? 'p-osa' : 'p-grid3') + ' p-steps">' + three(function (i) { return '<div class="p-step"><i>' + i + '</i><div>' + ed('p' + i, 'b') + ed('p' + i + 'd', 'span') + '</div></div>'; }) + '</div>');
    },
    tym: function () {
      return sec('tym', '<div class="p-grid3 p-team">' + three(function (i) {
        var ini = tx('m' + i).split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
        return '<div><i class="p-av">' + esc(ini) + '</i>' + ed('m' + i, 'b') + ed('r' + i, 'span') + '</div>';
      }) + '</div>');
    },
    novinky: function () {
      var now = new Date(), ago = [4, 16, 35];
      return sec('novinky', '<div class="p-grid3">' + three(function (i) {
        var t = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ago[i - 1]);
        return '<div class="p-card p-news"><small>' + t.getDate() + '. ' + (t.getMonth() + 1) + '. ' + t.getFullYear() + '</small>' + ed('n' + i, 'b') + '<span class="p-more">Číst dál ' + SVG.arr + '</span></div>';
      }) + '</div>');
    },
    partneri: function () { return sec('partneri', '<div class="p-logos">' + [1, 2, 3, 4, 5].map(function (i) { return '<span class="l' + i + '">Logo</span>'; }).join('') + '</div>'); },
    otazky: function () { return sec('otazky', '<div class="p-faq">' + three(function (i) { return '<div>' + ed('q' + i, 'span') + SVG.plus + '</div>'; }) + '</div>'); },
    vyzva: function () {
      var foto2 = vr('vyzva') === 'foto' ? '<span class="p-vbg p-ph"><img src="' + (imgSrc() || others(1)[0]) + '" alt="" loading="lazy"></span>' : '';
      return '<section class="p-sec p-s-vyzva v-' + vr('vyzva') + '" data-s="vyzva">' + tb('vyzva') + foto2 + '<div class="p-vin">' + ed('s_vyzva', 'p', 'p-h p-h2') + ed('vyzvad', 'p', 'p-sub') + '<span class="p-btn">' + SVG.tel + tv('vbtn') + '</span></div></section>';
    },
    formular: function () {
      var f = '<div class="p-form"><span class="p-in">Jméno</span><span class="p-in">E-mail nebo telefon</span><span class="p-in area">Co potřebujete?</span>' + ed('fbtn', 'span', 'p-btn') + '</div>';
      return sec('formular', vr('formular') === 'vedle' ? '<div class="p-two">' + '<div>' + ed('fsub', 'p', 'p-lead') + '<p class="p-row">' + SVG.tel + tv('tel') + '</p><p class="p-row"><i class="p-at">@</i>' + tv('mail') + '</p></div>' + f + '</div>' : f);
    },
    kontakt: function () {
      var v = vr('kontakt');
      var rows = '<p class="p-row">' + SVG.pin + tv('adr') + '</p><p class="p-row">' + SVG.tel + tv('tel') + '</p><p class="p-row"><i class="p-at">@</i>' + tv('mail') + '</p>' +
        (has('hod') ? '<p class="p-row"><i class="p-at">◷</i>' + tv('hours') + '</p>' : '') +
        (has('google') ? '<span class="p-gl">' + SVG.pin + 'Profil na Googlu</span>' : '');
      var map = '<div class="p-map"><svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice"><path d="M-10 70 Q120 40 210 110 T420 90" /><path d="M60 -10 L120 260" /><path d="M260 -10 Q240 120 300 260" /><path class="th" d="M-10 190 L420 160" /></svg><span class="p-mpin">' + SVG.pin + '</span></div>';
      if (v === 'udaje') return sec('kontakt', '<div class="p-krows">' + rows + '</div>');
      if (v === 'velka') return sec('kontakt', '<div class="p-kbig">' + map + '<div class="p-kcard">' + rows + '</div></div>');
      return sec('kontakt', '<div class="p-two"><div>' + rows + '</div>' + map + '</div>');
    }
  };
  function rez() {
    var dn = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'], now = new Date(), days = '';
    for (var i = 1; i <= 6; i++) { var t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i); days += '<span class="p-day' + (i === 2 ? ' on' : '') + '"><small>' + dn[t.getDay()] + '</small><b>' + t.getDate() + '.</b></span>'; }
    var times = ['8:00', '9:30', '11:00', '13:30', '15:00'].map(function (t, i) { return '<span class="p-time' + (i === 2 ? ' on' : '') + '">' + t + '</span>'; }).join('');
    return '<section class="p-sec p-rezs" data-s="rez">' + ed('s_rez', 'p', 'p-h p-h2') + '<div class="p-rez"><div class="p-days">' + days + '</div><div class="p-times">' + times + '</div><span class="p-btn">Rezervovat</span></div></section>';
  }
  function foot() {
    return '<footer class="p-foot">' + brand('sm') + tv('name') + '</span>' +
      (has('soc') ? '<span class="p-soc"><i>f</i><i>ig</i><i>yt</i></span>' : '') +
      (has('google') ? '<span class="p-gl">' + SVG.pin + 'Profil na Googlu</span>' : '') +
      '<span>© ' + new Date().getFullYear() + ' ' + tv('name') + '</span></footer>';
  }
  function adder() {
    var off = S.ord.filter(function (k) { return !isOn(k); });
    if (!off.length) return '';
    return '<div class="p-add' + (addOpen ? ' open' : '') + '"><button type="button" class="p-addb" data-pa="addm">' + SVG.plus + 'Přidat část stránky</button>' +
      '<div class="p-addm">' + off.map(function (k) { return '<button type="button" data-pa="add" data-k="' + k + '">' + SECS[k] + '</button>'; }).join('') + '</div></div>';
  }
  // vychytávky plovoucí nad stránkou: malý křížek je rovnou vypne
  var fx = function (k) { return '<button type="button" class="p-fx" data-overhang data-pa="exoff" data-k="' + k + '" aria-label="Odebrat: ' + EXS[k] + '" title="Odebrat: ' + EXS[k] + '">' + SVG.x + '</button>'; };
  function floaters(mob) {
    var lista = has('lista') && mob ? '<div class="p-lista"><span class="p-btn">' + SVG.tel + 'Zavolat</span><span class="p-btn alt">Napsat</span>' + fx('lista') + '</div>' : '';
    var chat = has('chat') ? '<span class="p-chat' + (lista ? ' up' : '') + '">' + SVG.chat + fx('chat') + '</span>' : '';
    var wa = has('wa') ? '<span class="p-wa' + (lista ? ' up' : '') + '">' + SVG.chat + 'WhatsApp' + fx('wa') + '</span>' : '';
    return lista || chat || wa ? '<div class="p-float">' + lista + chat + wa + '</div>' : '';
  }

  /* ---------- kostra aplikace ---------- */
  var chip = function (k, v, label, extra) { return '<button type="button" data-set="' + k + '" data-v="' + v + '"' + (extra || '') + '>' + label + '</button>'; };
  var chips = function (k, map) { return '<div class="nv-chips">' + Object.keys(map).map(function (v) { return chip(k, v, map[v]); }).join('') + '</div>'; };
  var grp = function (title, inner, extra) { return '<div class="nv-g"' + (extra || '') + '><p>' + title + '</p>' + inner + '</div>'; };
  var more = function (title, inner) { return '<details class="nv-more"><summary>' + title + '<i></i></summary><div class="nv-mb">' + inner + '</div></details>'; };
  var field = function (k, multi) {
    var id = 'nv-t-' + k;
    return '<div class="nv-f"><label for="' + id + '">' + TLBL[k] + '</label>' + (multi ? '<textarea id="' + id + '" data-tin="' + k + '" rows="3" maxlength="300"></textarea>' : '<input id="' + id + '" data-tin="' + k + '" maxlength="120" autocomplete="off">') + '</div>';
  };
  var LAYSVG = {
    vedle: '<rect x="4" y="12" width="22" height="4" rx="1"/><rect x="4" y="19" width="16" height="2.5" rx="1" class="l"/><rect x="4" y="25" width="10" height="5" rx="1.5"/><rect x="32" y="8" width="24" height="26" rx="2" class="ph"/>',
    pres: '<rect x="0" y="0" width="60" height="42" class="ph"/><rect x="6" y="20" width="26" height="4.5" rx="1" class="w"/><rect x="6" y="27" width="18" height="2.5" rx="1" class="w"/><rect x="6" y="32" width="10" height="4.5" rx="1.5" class="w"/>',
    pod: '<rect x="16" y="5" width="28" height="4" rx="1"/><rect x="20" y="11" width="20" height="2.5" rx="1" class="l"/><rect x="6" y="18" width="48" height="20" rx="2" class="ph"/>',
    deleny: '<rect x="0" y="0" width="30" height="42" class="c"/><rect x="5" y="15" width="18" height="4" rx="1" class="w"/><rect x="5" y="22" width="13" height="2.5" rx="1" class="w"/><rect x="30" y="0" width="30" height="42" class="ph"/>',
    text: '<rect x="4" y="9" width="40" height="7" rx="1.5"/><rect x="4" y="19" width="30" height="7" rx="1.5"/><rect x="4" y="30" width="12" height="4.5" rx="1.5" class="c"/><circle cx="52" cy="10" r="9" class="c"/>'
  };
  var STEPS = [['styl', 'Styl'], ['barvy', 'Barvy a písmo'], ['uvod', 'Úvod'], ['obsah', 'Obsah'], ['poslat', 'Souhrn']];
  function shell() {
    var bgOf = function (p) { var bg = p.bg || 'bila'; return bg === 'tmava' ? '#141414' : bg === 'krem' ? '#f6f1e7' : bg === 'seda' ? '#eef0f2' : bg === 'barva' ? mix(p.c, '#ffffff', .88) : '#ffffff'; };
    var card = function (k) {
      var p = PRESETS[k], f = FONTS[p.f];
      return '<button type="button" class="nv-preset" data-set="p" data-v="' + k + '" data-sk="' + (p.sk || 'zadny') + '" data-peek="Styl ' + p.n + (p.d3 ? ' · 3D' : '') + (lenOf(p) ? ' · ' + lenOf(p) + ' stránka' : '') + '" style="--pc:' + p.c + ';--pc2:' + (p.c2 || p.c) + ';--pbg:' + bgOf(p) + ';--pfg:' + (p.bg === 'tmava' ? '#f3f1ec' : '#161616') +
        ';--pf:' + f.f.replace(/"/g, '') + ';--pw:' + f.w + ';--ps:' + f.s + ';--pt:' + f.t + ';--pv:' + (f.v || 'normal') + ';--pr:' + RADII[p.r][1] + 'px">' +
        '<i class="nv-pi" style="background-image:url(img/obor/t-' + p.img + '.webp)">' + (p.d3 ? '<small class="nv-3d">3D</small>' : '') + '</i>' +
        '<span class="nv-pt"><b>Aa</b><span>' + p.n + '</span>' + (lenOf(p) ? '<small>' + lenOf(p) + ' stránka</small>' : '') + '</span><em></em></button>';
    };
    var presets = Object.keys(PRESETS).map(card).join('');
    var gads = Object.keys(EXTRAS).map(function (k) {
      return '<label class="nv-gx"><input type="checkbox" data-ex="' + k + '"><i><svg viewBox="0 0 24 24" aria-hidden="true">' + GICO[k] + '</svg></i><span><b>' + EXS[k] + '</b><small>' + EXD[k] + '</small></span><em class="nv-gxx" aria-hidden="true">' + SVG.x + '</em></label>';
    }).join('');
    var swatches = function (k, list) { return list.map(function (c) { return '<button type="button" class="nv-swb" data-set="' + k + '" data-v="' + c[0] + '" data-peek="' + c[1] + '" style="--c:' + c[0] + '" aria-label="' + c[1] + '" title="' + c[1] + '"></button>'; }).join(''); };
    var colors = Object.keys(CGRP).map(function (g) { return '<div class="nv-cg"><small>' + CGRP[g] + '</small><div class="nv-sw">' + swatches('c', COLORS.filter(function (c) { return c[2] === g; })) + '</div></div>'; }).join('');
    var c2 = '<div class="nv-sw"><button type="button" class="nv-swb nv-same" data-set="c2" data-v="" title="Stejná jako hlavní" aria-label="Stejná jako hlavní"></button>' +
      swatches('c2', COLORS.filter(function (c, i) { return i % 2 === 0 || c[2] === 's'; })) + '</div>';
    var fonts = Object.keys(FONTS).map(function (k) { var f = FONTS[k]; return chip('f', k, f.n, ' style="font-family:' + f.f.replace(/"/g, '') + ';font-weight:' + f.w + ';font-stretch:' + f.s + ';text-transform:' + f.t + (f.v ? ';font-variation-settings:' + f.v.replace(/'/g, '&#39;') : '') + (f.k ? ';font-size:' + (15 * f.k).toFixed(1) + 'px' : '') + '"'); }).join('');
    var bfonts = Object.keys(BFONTS).map(function (k) { return chip('bf', k, BFONTS[k][0], ' style="font-family:' + BFONTS[k][1].replace(/"/g, '') + '"'); }).join('');
    var lays = Object.keys(HEROS).map(function (k) { return '<button type="button" data-set="hero" data-v="' + k + '"><svg viewBox="0 0 60 42" aria-hidden="true">' + LAYSVG[k] + '</svg><span>' + HEROS[k] + '</span></button>'; }).join('');
    var photos = PHOTOS.map(function (p) { return '<button type="button" data-set="img" data-v="' + p[0] + '" data-g="' + p[2] + '" data-peek="Fotka: ' + p[1] + '" aria-label="Fotka: ' + p[1] + '"><i style="background-image:url(img/obor/t-' + p[0] + '.webp)"></i><span>' + p[1] + '</span></button>'; }).join('');
    var radii = '<div class="nv-chips">' + Object.keys(RADII).map(function (k) { return chip('r', k, '<i class="nv-rc" style="border-radius:' + Math.min(RADII[k][1], 10) + 'px 0 0 0"></i>' + RADII[k][0]); }).join('') + '</div>';
    var exs = Object.keys(EXTRAS).map(function (k) { return '<label class="nv-tg"><input type="checkbox" data-ex="' + k + '"><i></i><span>' + EXS[k] + '</span></label>'; }).join('');
    var navb = function (i) {
      var prev = STEPS[i - 1], next = STEPS[i + 1];
      return '<div class="nv-nav">' + (prev ? '<button type="button" class="nv-tool" data-tab="' + prev[0] + '" data-go>Zpět</button>' : '') +
        (next ? '<button type="button" class="btn nv-next" data-tab="' + next[0] + '" data-go>Dál: ' + next[1].toLowerCase() + SVG.arr + '</button>' : '') + '</div>' +
        (i < 3 ? '<button type="button" class="nv-skip" data-tab="poslat" data-go>Hotovo, chci návrh poslat</button>' : '');
    };
    app.innerHTML =
      '<div class="nv-styles nv-easy"><p class="nv-lbl">Vyberte styl <span>jedním klikem</span></p><div class="nv-sts" data-scroller>' + EASY.map(card).join('') + '</div>' +
        '<button type="button" class="nv-adv2" data-act="adv"><span>Upravit vybraný styl přesně<small>barvy, písmo, fotky, části stránky, texty</small></span>' + SVG.arr + '</button></div>' +
      '<div class="nv-gads nv-easy"><p class="nv-lbl">Vychytávky <span>zapnuté hned uvidíte v náhledu</span></p><div class="nv-gxs" data-scroller>' + gads + '</div></div>' +
      '<div class="nv-stage">' +
        '<div class="nv-tools"><div class="nv-seg" role="group" aria-label="Zobrazení"><button type="button" data-view="pc">Počítač</button><button type="button" data-view="mob">Mobil</button></div>' +
        '<button type="button" class="nv-tool nv-ovb" data-act="ov" aria-pressed="false">Celá stránka</button>' +
        '<span class="nv-sp"></span><div class="nv-vers nv-vs1"></div>' +
        '<button type="button" class="nv-tool" data-act="random">Náhodně</button><button type="button" class="nv-tool" data-act="undo" disabled>Zpět</button></div>' +
        '<div class="nv-frame" data-view="pc"><div class="nv-bar"><i></i><i></i><i></i><span class="nv-url"></span></div><div class="nv-scroll" data-lenis-prevent><div class="nv-page"></div></div><span class="nv-peek" aria-hidden="true"></span></div>' +
        '<p class="nv-hint">Na texty v náhledu klikněte a pište. Části stránky jdou měnit, posouvat i přidávat přímo v náhledu. Ukázka je jen ukázka, předělat se dá cokoli.</p>' +
      '</div>' +
      '<div class="nv-send nv-easy"><p class="nv-lbl">Pošlete nám to</p><p class="nv-sl"><i class="nv-sc"></i><span></span></p>' +
        '<p class="nv-sx">Podle Vašeho výběru připravíme ukázku webu zdarma a ozveme se. Ukázka je jen ukázka: vzhled, barvy i texty se dají kdykoli předělat. Web stojí 8 000 Kč jednorázově, bez měsíčních poplatků, a web i doména patří Vám.</p>' +
        '<div class="nv-fslot"></div>' +
        '<button type="button" class="nv-advb" data-act="adv"><span><b>Doladit do detailu</b><small>barvy, písmo, fotky, části stránky, texty</small></span>' + SVG.arr + '</button></div>' +
      '<div class="nv-panel">' +
        '<button type="button" class="nv-back" data-act="easy">Zpět na jednoduchý výběr</button>' +
        '<p class="nv-from" hidden>Otevřeli jste návrh z odkazu. Můžete ho dál upravit a poslat.</p>' +
        '<ol class="nv-steps" role="tablist" aria-label="Kroky návrhu">' +
          STEPS.map(function (t, i) { return '<li><button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="false"><i>' + (i + 1) + '</i><span>' + t[1] + '</span></button></li>'; }).join('') +
        '</ol>' +
        '<div class="nv-pane" data-pane="styl"><p class="nv-intro">Vyberte styl, který je Vám nejbližší, a hned ho uvidíte v náhledu. Stačí vybrat a poslat, do detailů jít nemusíte.</p><div class="nv-presets">' + presets + '</div>' +
          grp('Charakter <span>ozdoby a tvary, které stylu dávají tvář</span>', chips('sk', O.sk), ' style="margin-top:20px"') +
          '<button type="button" class="nv-tool nv-wide" data-act="random">Zkusit náhodný návrh</button>' + navb(0) + '</div>' +
        '<div class="nv-pane" data-pane="barvy" hidden>' +
          grp('Hlavní barva <b class="nv-cn"></b>', colors + '<div class="nv-cg"><small>Vlastní</small><div class="nv-sw"><label class="nv-own" title="Vlastní barva"><input type="color" data-color aria-label="Vlastní barva"></label></div></div>') +
          grp('Pozadí', chips('bg', O.bg)) +
          grp('Písmo nadpisů', '<div class="nv-chips nv-fonts">' + fonts + '</div>') +
          more('Doladit barvy, písmo a tvary', grp('Druhá barva <span>na ikony a drobnosti</span>', c2) + grp('Vzor pozadí', chips('pat', O.pat)) + grp('Písmo textu', '<div class="nv-chips">' + bfonts + '</div>') +
            grp('Velikost nadpisů', chips('hs', O.hs)) + grp('Rohy', radii) + grp('Tlačítka', chips('b', O.b)) + grp('Stíny', chips('sh', O.sh))) +
          navb(1) + '</div>' +
        '<div class="nv-pane" data-pane="uvod" hidden>' +
          grp('Rozvržení úvodu', '<div class="nv-lay">' + lays + '</div>') +
          grp('Fotka', '<div class="nv-seg nv-pg" role="group" aria-label="Skupina fotek"><button type="button" data-pg="s">Ke stylu</button><button type="button" data-pg="t">Podle zaměření</button></div>' +
            '<div class="nv-photos">' + photos + '</div><div class="nv-chips nv-pex"><label class="nv-upbtn nv-up"><input type="file" accept="image/*" data-file="foto"><span>Nahrát vlastní fotku</span></label>' + chip('img', 'zadna', 'Bez fotky') + '</div>') +
          grp('Logo', '<div class="nv-chips"><label class="nv-upbtn"><input type="file" accept="image/*" data-file="logo"><span>Nahrát logo</span></label><button type="button" data-act="nologo" hidden>Bez loga</button></div>') +
          more('Doladit úvod a hlavičku', grp('Výška úvodu', chips('hh', O.hh)) + grp('Zarovnání textu', chips('al', O.al)) + grp('Úprava fotek', chips('ft', O.ft)) + grp('Tvar fotek', chips('ps', O.ps)) +
            grp('Hlavička', chips('nav', O.nav)) + grp('Značka, když nemáte logo', chips('mk', O.mk))) +
          more('Texty a kontakt', '<p class="nv-note">Texty můžete psát i přímo do náhledu.</p>' + field('name') + field('kick') + field('title', 1) + field('sub', 1) + field('btn') + field('tel') + field('adr') + field('mail') + field('hours')) +
          navb(2) + '</div>' +
        '<div class="nv-pane" data-pane="obsah" hidden>' +
          '<p class="nv-intro">Co na stránce bude a v jakém pořadí. Vzhled každé části přepnete tady nebo přímo v náhledu.</p>' +
          '<ul class="nv-secs"></ul>' +
          grp('Přidat část', '<div class="nv-chips nv-addc"></div>', ' data-add') +
          grp('Doplňky', '<div class="nv-exs">' + exs + '</div>') +
          more('Celkový dojem', grp('Oddělení částí', chips('sep', O.sep)) + grp('Rozestupy', chips('dn', O.dn)) + grp('Animace při rolování', chips('an', O.an)) + grp('Ikony', chips('ico', O.ico))) +
          navb(3) + '</div>' +
        '<div class="nv-pane" data-pane="poslat" hidden>' +
          '<div class="nv-card"><div class="nv-ch"><i class="nv-chc"></i><div><b class="nv-chn"></b><span class="nv-chs"></span></div></div><details class="nv-sumd"><summary>Celý souhrn voleb<i></i></summary><div class="nv-sum"></div></details></div>' +
          '<div class="nv-g"><p>Verze návrhu <span>porovnejte až tři</span></p><div class="nv-vers nv-vs2"></div></div>' +
          '<p class="nv-intro">Pošlete nám návrh. Podle něj připravíme ukázku Vašeho webu zdarma a ozveme se. Ukázka je jen ukázka: vzhled, barvy i texty se dají kdykoli předělat. Web stojí 8 000 Kč jednorázově, bez měsíčních poplatků, a web i doména patří Vám.</p>' +
          '<form class="nv-form" novalidate>' +
            '<div class="nv-f"><label for="nv-jmeno">Jméno a firma</label><input id="nv-jmeno" name="jmeno" maxlength="120" autocomplete="name" required></div>' +
            '<div class="nv-f"><label for="nv-kontakt">E-mail nebo telefon</label><input id="nv-kontakt" name="kontakt" maxlength="120" autocomplete="email" required></div>' +
            '<div class="nv-f"><label for="nv-zprava">Jak si web přejete? <span>(nepovinné)</span></label><textarea id="nv-zprava" name="zprava" maxlength="3000" rows="4" placeholder="Co děláte, co na webu nesmí chybět, odkaz na Vaši firmu nebo na web, který se Vám líbí"></textarea></div>' +
            '<div class="hp" aria-hidden="true"><input name="web" tabindex="-1" autocomplete="off" aria-label="Nevyplňujte"></div>' +
            '<button class="btn" type="submit">Poslat návrh</button>' +
            '<button type="button" class="nv-tool nv-wide" data-act="copy">Zkopírovat odkaz na návrh</button>' +
            '<p class="note">Údaje použijeme jen k odpovědi na Váš návrh. <a href="ochrana-udaju.html">Jak s nimi zacházíme</a></p>' +
            '<p class="form-msg" role="status"></p>' +
          '</form>' + '<div class="nv-nav"><button type="button" class="nv-tool" data-tab="obsah" data-go>Zpět</button></div></div>' +
      '</div>';
  }
  shell();
  var stage = $('.nv-stage', app), frame = $('.nv-frame', app), scroller = $('.nv-scroll', app), page = $('.nv-page', app), urlEl = $('.nv-url', app), peekEl = $('.nv-peek', app);
  var secList = $('.nv-secs', app), addC = $('.nv-addc', app), sum = $('.nv-sum', app), form = $('.nv-form', app), fmsg = $('.form-msg', form), undoBtn = $('[data-act="undo"]', app);

  /* ---------- vykreslení ---------- */
  // Počítač: stránka 1024 px zmenšená na šířku rámu. Mobil: celý displej telefonu 375 × 667 px přizpůsobený výšce rámu,
  // klidně i větší než 1 : 1 (Z 17. 10.: „na mobil tak je to hodně malý“, 23:25 „zvětši ten mobil a počítač, ať je to velké“). Celá stránka: zmenšená tak, aby se vešla celá, jako pohled na auto z dálky.
  // --iz vrací lišty pro úpravy na skutečnou velikost, ať je zmenšení jakékoli
  // Z 18. 10.: „zvětši ten telefon i počítač, je to pořád malé všechno“: na úzké obrazovce má telefon celou šířku (výška rámu
  // podle něj, ne naopak) a „počítač“ je stránka široká 760–1024 px podle místa, ať písmo není drobné
  var PCW = 1024;
  function setZ(z) { page.style.setProperty('--z', z.toFixed(4)); page.style.setProperty('--iz', (1 / z).toFixed(4)); }
  function fit() {
    frame.style.height = ''; if (S.view !== 'mob') frame.style.width = '';
    var nar = narrow(), easyN = nar && !app.classList.contains('adv');
    PCW = nar && S.view !== 'mob' ? Math.round(Math.max(760, Math.min(1024, scroller.clientWidth / .48))) : 1024;
    page.style.setProperty('--pw', PCW + 'px');
    page.classList.toggle('pcn', S.view !== 'mob' && PCW < 960);
    var bar = $('.nv-bar', frame).offsetHeight, hs = frame.clientHeight - bar, room = stage.clientWidth * 0.92, W = S.view === 'mob' ? 375 : PCW, z;
    if (ov) {
      if (S.view === 'mob') frame.style.width = Math.round(Math.min(room, Math.max(260, stage.clientWidth * .5))) + 'px'; else frame.style.width = '';
      setZ(1);
      var H = page.getBoundingClientRect().height / (parseFloat(getComputedStyle(document.body).zoom) || 1);  // velký monitor: body má zoom (wl.css)
      z = Math.min((scroller.clientWidth - 24) / W, (hs - 24) / Math.max(1, H));
      setZ(Math.max(0.05, z));
      return;
    }
    if (S.view === 'mob') {
      if (easyN) {
        var sw = stage.clientWidth; if (sw <= 0) return;
        z = Math.max(.6, Math.min(1.15, (sw - 18) / 375));
        frame.style.width = Math.round(375 * z) + 'px';
        frame.style.height = Math.round(Math.max(360, Math.min(667 * z + bar, innerHeight - 96))) + 'px';
        setZ(z); return;
      }
      if (hs <= 0 || room <= 0) return;
      // úzký panel „Doladit“: telefon čitelně široký, displej se pak roluje uvnitř; počítač: celý displej na výšku rámu
      z = nar ? Math.min(1, room / 375, Math.max(hs / 560, .78)) : Math.max(.5, Math.min(1.25, room / 375, hs / 620));
      frame.style.width = Math.round(375 * z) + 'px';
      setZ(z);
    } else {
      frame.style.width = '';
      var w = scroller.clientWidth;
      if (w > 0) setZ(w / PCW);
    }
  }
  function render() {
    var th = theme(), F = FONTS[S.f], R = RADII[S.r], mob = S.view === 'mob', y = scroller.scrollTop;
    page.className = 'nv-page' + (mob ? ' mob' : '');
    ['hero', 'b', 'bg', 'pat', 'hh', 'ft', 'ps', 'al', 'nav', 'mk', 'sep', 'an', 'ico', 'sh', 'sk', 'bf'].forEach(function (k) { page.setAttribute('data-' + k, S[k]); });
    page.setAttribute('data-img', imgSrc() ? '1' : '0');
    var sp = { bezna: [76, 50], vzdusna: [108, 66], usporna: [50, 36] }[S.dn][mob ? 1 : 0];
    var shd = { plochy: 'none', jemny: '0 14px 34px -16px rgba(0,0,0,.22)', vyrazny: '0 26px 54px -18px rgba(0,0,0,.4)' }[S.sh];
    [['--c', th.c], ['--on', th.on], ['--cx', th.cx], ['--c2', th.c2], ['--on2', th.on2], ['--cx2', th.cx2], ['--bg', th.bg], ['--fg', th.fg], ['--mut', th.mut], ['--card', th.card], ['--line', th.line], ['--alt', th.alt],
      ['--r', R[1] + 'px'], ['--rb', R[2] + 'px'], ['--hf', F.f], ['--hw', F.w], ['--hs', F.s], ['--ht', F.t], ['--hl', F.l], ['--hv', F.v || 'normal'], ['--hk', F.k || 1], ['--hz', { velke: 1, stridme: .8, obri: 1.28 }[S.hs]],
      ['--bf', BFONTS[S.bf][1]], ['--sp', sp + 'px'], ['--shd', shd]].forEach(function (p) { page.style.setProperty(p[0], p[1]); });
    var secs = S.ord.filter(isOn).map(function (k) { return SEC[k](); });
    page.innerHTML = nav(mob) + hero() + (has('rez') ? rez() : '') + secs.join('') + (ov ? '' : adder()) + foot() + floaters(mob);
    if (S.sep === 'strid' || S.sep === 'vlna') $$('.p-sec:not(.p-s-vyzva):not(.p-rezs)', page).forEach(function (el, i) { if (i % 2 === 0) el.classList.add('alt'); });
    $$('[data-t]', page).forEach(function (el) { el.setAttribute('contenteditable', plain ? 'plaintext-only' : 'true'); el.spellcheck = false; });
    if (selK) { var sl = $('[data-s="' + selK + '"]', page); if (sl) sl.classList.add('p-sel'); }
    frame.setAttribute('data-view', S.view);
    frame.classList.toggle('ov', ov);
    scroller.style.background = th.bg;
    urlEl.textContent = slug(tx('name')) + '.cz';
    fit();
    scroller.scrollTop = ov ? 0 : y;
    anim();
  }
  // animace v náhledu: co už jednou bylo vidět, se při další změně neanimuje znovu (jinak by každá barva „blikala“)
  function anim() {
    if (io) { io.disconnect(); io = null; }
    var els = $$('.p-hero,.p-sec', page);
    if (S.an === 'zadne' || reduce || ov || !('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('in'); }); return; }
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); seen[e.target.getAttribute('data-s')] = 1; io.unobserve(e.target); } });
    }, { root: scroller, threshold: .1 });
    els.forEach(function (el) { if (seen[el.getAttribute('data-s')]) el.classList.add('in'); else io.observe(el); });
  }
  function syncPanel() {
    $$('.nv-panel [data-set],.nv-vers [data-set],.nv-styles [data-set]', app).forEach(function (b) {
      var k = b.getAttribute('data-set'), v = b.getAttribute('data-v'), cur = k.indexOf('vr:') === 0 ? vr(k.slice(3)) : S[k];
      b.setAttribute('aria-pressed', String(cur === v));
    });
    $$('button[data-view]', app).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === S.view)); });
    $('[data-act="ov"]', app).setAttribute('aria-pressed', String(ov));
    $$('[data-ex]', app).forEach(function (i) { i.checked = has(i.getAttribute('data-ex')); });
    $$('[data-tin]', app).forEach(function (i) { if (i !== d.activeElement) i.value = tx(i.getAttribute('data-tin')); });
    var ownC = $('[data-color]', app), known = COLORS.some(function (c) { return c[0] === S.c; });
    ownC.value = S.c; ownC.parentNode.classList.toggle('on', !known); ownC.parentNode.style.setProperty('--c', known ? 'transparent' : S.c);
    $('.nv-cn', app).textContent = (cname(S.c) || 'Vlastní') + ' ' + S.c.toUpperCase();
    $('.nv-up', app).classList.toggle('on', S.img === 'vlastni');
    $$('[data-pg]', app).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-pg') === pgrp)); });
    $('.nv-photos', app).setAttribute('data-g', pgrp);
    $$('.nv-photos>button', app).forEach(function (b) { b.hidden = b.getAttribute('data-g') !== pgrp; });
    $('[data-act="nologo"]', app).hidden = !logo;
    undoBtn.disabled = !hist.length;
    var onL = S.ord.filter(isOn), offL = S.ord.filter(function (k) { return !isOn(k); });
    secList.innerHTML = onL.length ? onL.map(function (k, i) {
      var v = VARS[k];
      return '<li data-k="' + k + '"><div class="nv-sr"><b>' + SECS[k] + '</b><span class="nv-mv">' +
        '<button type="button" data-act="up" data-k="' + k + '" aria-label="' + SECS[k] + ' výš"' + (i ? '' : ' disabled') + '>' + SVG.up + '</button>' +
        '<button type="button" data-act="down" data-k="' + k + '" aria-label="' + SECS[k] + ' níž"' + (i < onL.length - 1 ? '' : ' disabled') + '>' + SVG.down + '</button>' +
        '<button type="button" data-act="off" data-k="' + k + '" aria-label="Odebrat ' + SECS[k] + '">' + SVG.x + '</button></span></div>' +
        (v ? '<div class="nv-vr">' + Object.keys(v).map(function (x) { return '<button type="button" data-set="vr:' + k + '" data-v="' + x + '" data-peek="' + SECS[k] + ': ' + v[x] + '" aria-pressed="' + (vr(k) === x) + '">' + v[x] + '</button>'; }).join('') + '</div>' : '') + '</li>';
    }).join('') : '<li class="nv-empty">Zatím jen úvod. Přidejte části níže.</li>';
    addC.innerHTML = offL.map(function (k) { return '<button type="button" data-act="on" data-k="' + k + '">' + SVG.plus + SECS[k] + '</button>'; }).join('');
    addC.parentNode.hidden = !offL.length;
    var pr = PRESETS[S.p];
    $('.nv-chc', app).style.cssText = 'background:' + S.c + (S.c2 ? ';box-shadow:inset -14px 0 0 ' + S.c2 : '');
    $('.nv-chn', app).textContent = tx('name');
    $('.nv-chs', app).textContent = 'Styl ' + (pr ? pr.n.toLowerCase() + (samePreset() ? '' : ', upravený') : 'vlastní') + ' · ' + onL.length + ' ' + (onL.length === 1 ? 'část' : onL.length > 1 && onL.length < 5 ? 'části' : 'částí');
    sum.innerHTML = '<ul>' + summary().filter(function (l) { return l && l.indexOf('  ') !== 0 && l.indexOf('Upravené texty') !== 0; }).map(function (l) { var i = l.indexOf(':'); return '<li><b>' + esc(l.slice(0, i)) + '</b>' + esc(l.slice(i + 1)) + '</li>'; }).join('') + '</ul>';
    verUI();
    var ne = S.ex.length;
    $('.nv-sc', app).style.cssText = 'background:' + S.c + (S.c2 ? ';box-shadow:inset -9px 0 0 ' + S.c2 : '');
    $('.nv-sl span', app).textContent = 'Styl ' + (pr ? pr.n.toLowerCase() + (samePreset() ? '' : ', upravený') : 'vlastní') + ' · ' +
      (ne ? ne + ' ' + (ne === 1 ? 'vychytávka' : ne < 5 ? 'vychytávky' : 'vychytávek') : 'bez vychytávek');
  }

  /* ---------- změny, zpět, uložení, náhled při najetí ---------- */
  var saveT = null;
  function packObj() {
    var o = { p: S.p, h: S.hero, i: S.img, o: S.ord, on: S.on, ex: S.ex, vr: S.vr, t: S.t, v: S.view };
    PKEYS.forEach(function (k) { if (k !== 'hero' && k !== 'img') o[k] = S[k]; });
    return o;
  }
  function persist() { clearTimeout(saveT); saveT = setTimeout(function () { try { localStorage.setItem('wlNavrh', JSON.stringify(packObj())); } catch (e) {} }, 400); }
  function endPeek() { if (peek) { S = JSON.parse(peek); peek = null; stage.classList.remove('peek'); } }
  function change(fn, focus) {
    endPeek();
    hist.push(JSON.stringify(S)); if (hist.length > 50) hist.shift();
    fn();
    render(); syncPanel(); persist();
    if (focus) reveal(focus);
  }
  function samePreset() { var p = PRESETS[S.p]; return p && PKEYS.every(function (k) { return S[k] === (own(p, k) ? p[k] : DEF[k]); }); }
  function apply(k, v) {
    if (k === 'p') { var p = PRESETS[v]; if (!p) return; S.p = v; PKEYS.forEach(function (x) { S[x] = own(p, x) ? p[x] : DEF[x]; }); if (p.on) S.on = p.on.slice(); if (PH[S.img]) pgrp = PH[S.img][2]; return; }
    if (k.indexOf('vr:') === 0) { S.vr[k.slice(3)] = v; return; }
    S[k] = v;
    if (k === 'an') seen = {};
  }
  var HEROK = { p: 1, hero: 1, img: 1, hh: 1, nav: 1, mk: 1, al: 1, an: 1, f: 1, hs: 1, sk: 1 };
  function reveal(k) {
    var el = k === 'top' || k === 'end' ? null : $('[data-s="' + k + '"]', page);
    var top = el ? el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 30 : k === 'end' ? scroller.scrollHeight : 0;
    scroller.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
    if (el) { el.classList.remove('p-flash'); void el.offsetWidth; el.classList.add('p-flash'); }
  }
  // jako barvy u konfigurátorů aut: najetí myší na volbu ji hned ukáže v náhledu, odjetí vrátí původní stav
  var peekT = null, peekB = null;
  function peekOn(b) {
    if (!peek) { peek = JSON.stringify(S); peekY = scroller.scrollTop; }
    S = JSON.parse(peek);
    var k = b.getAttribute('data-set'); apply(k, b.getAttribute('data-v'));
    render();
    if (HEROK[k] && !ov) scroller.scrollTop = 0;
    else if (k.indexOf('vr:') === 0 && !ov) { var el = $('[data-s="' + k.slice(3) + '"]', page); if (el) scroller.scrollTop = Math.max(0, el.offsetTop - 20); }
    peekEl.textContent = b.getAttribute('data-peek') || b.textContent.trim();
    stage.classList.add('peek');
  }
  function peekOff() { if (!peek) return; S = JSON.parse(peek); peek = null; stage.classList.remove('peek'); render(); scroller.scrollTop = peekY; }
  var panel = $('.nv-panel', app);
  [panel, $('.nv-styles', app)].forEach(function (el) { el.addEventListener('pointerover', peekOver); el.addEventListener('pointerout', peekOut); });
  // Hloubka (3D): karta nebo fotka v úvodu se natáčí za myší, odlesk jde s ní
  var tiltEl = null;
  function untilt() { if (tiltEl) { ['--rx', '--ry', '--gx', '--gy'].forEach(function (p) { tiltEl.style.removeProperty(p); }); tiltEl = null; } }
  page.addEventListener('pointermove', function (e) {
    if (S.sk !== 'hloubka' || reduce || e.pointerType === 'touch') return;
    var el = e.target.closest('.p-card,.p-hero>.p-img');
    if (el !== tiltEl) untilt();
    if (!el) return;
    tiltEl = el;
    var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    el.style.setProperty('--ry', (x * 14).toFixed(2) + 'deg'); el.style.setProperty('--rx', (-y * 12).toFixed(2) + 'deg');
    el.style.setProperty('--gx', ((x + .5) * 100).toFixed(1) + '%'); el.style.setProperty('--gy', ((y + .5) * 100).toFixed(1) + '%');
  });
  page.addEventListener('pointerleave', untilt);
  function peekOver(e) {
    if (!fine.matches || e.pointerType === 'touch') return;
    var b = e.target.closest('[data-set]'); if (!b || b === peekB) return;
    var k = b.getAttribute('data-set'), v = b.getAttribute('data-v'), cur = k.indexOf('vr:') === 0 ? vr(k.slice(3)) : (peek ? JSON.parse(peek) : S)[k];
    peekB = b; clearTimeout(peekT);
    if (cur === v && !peek) return;
    peekT = setTimeout(function () { peekOn(b); }, peek ? 40 : 110);
  }
  function peekOut(e) {
    var b = e.target.closest('[data-set]'); if (!b || (e.relatedTarget && b.contains(e.relatedTarget))) return;
    peekB = null; clearTimeout(peekT);
    peekT = setTimeout(peekOff, 160);
  }
  function random() {
    var pick = function (a) { return a[(Math.random() * a.length) | 0]; };
    change(function () {
      S.p = ''; S.c = pick(COLORS)[0]; S.c2 = Math.random() < .3 ? pick(COLORS)[0] : ''; S.f = pick(Object.keys(FONTS)); S.bf = pick(Object.keys(BFONTS)); S.hero = pick(Object.keys(HEROS));
      S.img = pick(PHOTOS)[0]; S.r = pick(Object.keys(RADII));
      Object.keys(O).forEach(function (k) { S[k] = pick(Object.keys(O[k])); });
      if (Math.random() < .5) S.bg = 'bila';
      S.on = Object.keys(SECS).filter(function (k) { return k === 'kontakt' || Math.random() < .4; });
      S.ex = Object.keys(EXTRAS).filter(function () { return Math.random() < .35; });
      Object.keys(VARS).forEach(function (k) { S.vr[k] = pick(Object.keys(VARS[k])); });
      seen = {};
    }, 'top');
  }

  /* ---------- odkaz na návrh ---------- */
  function b64u(u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function through(u8, stream) { return new Response(new Blob([u8]).stream().pipeThrough(stream)).arrayBuffer().then(function (ab) { return new Uint8Array(ab); }); }
  function pack(o) {
    var u8 = new TextEncoder().encode(JSON.stringify(o || packObj()));
    var plainOut = function () { return 'j' + b64u(u8); };
    try { if (window.CompressionStream) return through(u8, new CompressionStream('deflate-raw')).then(function (z) { return 'z' + b64u(z); }, plainOut); } catch (e) {}
    return Promise.resolve(plainOut());
  }
  function unpack(s) {
    var u8 = unb64u(s.slice(1));
    var p = s.charAt(0) === 'z' ? through(u8, new DecompressionStream('deflate-raw')) : Promise.resolve(u8);
    return p.then(function (b) { return JSON.parse(new TextDecoder().decode(b)); });
  }
  function link(o) { return pack(o).then(function (code) { return location.origin + location.pathname + '#navrh=' + code; }); }
  function load(o) {
    var n = clone(DEF), ok = function (map, v) { return typeof v === 'string' && own(map, v); };
    if (!o || typeof o !== 'object') return n;
    if (ok(PRESETS, o.p) || o.p === '') n.p = o.p;
    if (/^#[0-9a-f]{6}$/i.test(o.c)) n.c = o.c.toLowerCase();
    if (/^#[0-9a-f]{6}$/i.test(o.c2)) n.c2 = o.c2.toLowerCase();
    if (ok(FONTS, o.f)) n.f = o.f; if (ok(HEROS, o.h)) n.hero = o.h; if (ok(RADII, o.r)) n.r = o.r;
    if (ok(BFONTS, o.bf)) n.bf = o.bf; else if (o.f === 'kulate') n.bf = 'kulate';
    Object.keys(O).forEach(function (k) { if (ok(O[k], o[k])) n[k] = o[k]; });
    if (o.i === 'zadna' || o.i === 'vlastni' || ok(PH, o.i)) n.img = o.i;
    if (o.v === 'mob' || o.v === 'pc') n.view = o.v;
    if (Array.isArray(o.o)) { var ord = []; o.o.concat(Object.keys(SECS)).forEach(function (k) { if (ok(SECS, k) && ord.indexOf(k) < 0) ord.push(k); }); n.ord = ord; }
    if (Array.isArray(o.on)) n.on = o.on.filter(function (k, i, a) { return ok(SECS, k) && a.indexOf(k) === i; });
    if (Array.isArray(o.ex)) n.ex = o.ex.filter(function (k) { return ok(EXTRAS, k); });
    if (o.vr && typeof o.vr === 'object') Object.keys(o.vr).forEach(function (k) { if (ok(VARS, k) && ok(VARS[k], o.vr[k])) n.vr[k] = o.vr[k]; });
    if (o.t && typeof o.t === 'object') Object.keys(o.t).forEach(function (k) { if (ok(TX, k) && typeof o.t[k] === 'string') n.t[k] = o.t[k].slice(0, 300); });
    return n;
  }

  /* ---------- verze A / B / C (uložené konfigurace) ---------- */
  var verKey = function (o) { o = clone(o); delete o.v; return JSON.stringify(o); };
  function verUI() {
    var cur = verKey(packObj());
    var html = vers.map(function (v, i) {
      return '<span class="nv-ver"><button type="button" data-act="ver" data-i="' + i + '" aria-pressed="' + (verKey(v) === cur) + '" title="Otevřít verzi ' + 'ABC'.charAt(i) + '">' + 'ABC'.charAt(i) + '</button>' +
        '<button type="button" class="nv-verx" data-act="verx" data-i="' + i + '" aria-label="Smazat verzi ' + 'ABC'.charAt(i) + '">' + SVG.x + '</button></span>';
    }).join('') + (vers.length < 3 ? '<button type="button" class="nv-tool nv-vsave" data-act="versave">' + SVG.plus + 'Uložit verzi</button>' : '');
    $$('.nv-vers', app).forEach(function (c) { c.innerHTML = html; });
  }
  function saveVers() { try { localStorage.setItem('wlVerze', JSON.stringify(vers)); } catch (e) {} }

  /* ---------- souhrn do e-mailu ---------- */
  function summary() {
    var pr = PRESETS[S.p], L = function (k) { return O[k][S[k]].toLowerCase(); };
    var parts = S.ord.filter(isOn).map(function (k) { return SECS[k] + (VARS[k] ? ' (' + VARS[k][vr(k)].toLowerCase() + ')' : ''); });
    var out = [
      'Styl: ' + (pr ? pr.n + (samePreset() ? '' : ', upravený') : 'vlastní') + (S.sk !== 'zadny' ? ', charakter ' + L('sk') : ''),
      'Barvy: ' + (cname(S.c) || 'vlastní') + ' ' + S.c + (S.c2 ? ', druhá ' + (cname(S.c2) || '') + ' ' + S.c2 : '') + ', pozadí ' + L('bg') + (S.pat !== 'zadny' ? ', vzor ' + L('pat') : ''),
      'Písmo: nadpisy ' + FONTS[S.f].n.toLowerCase() + ' (' + L('hs') + '), text ' + BFONTS[S.bf][0].toLowerCase(),
      'Tvary: ' + RADII[S.r][0].toLowerCase() + ' rohy, ' + L('b') + ' tlačítka, ' + L('sh') + ' stíny',
      'Hlavička: ' + L('nav') + (logo ? ', vlastní logo v příloze' : ', značka ' + L('mk')),
      'Úvod: ' + HEROS[S.hero].toLowerCase() + ', výška ' + L('hh') + ', text ' + L('al'),
      'Fotka: ' + (S.img === 'zadna' ? 'bez fotky' : S.img === 'vlastni' ? (foto ? 'vlastní, posíláme v příloze' : 'vlastní, pošlou zvlášť') : 'ilustrační (' + PH[S.img][1].toLowerCase() + ')') +
        (S.img !== 'zadna' ? ', ' + L('ft') + ', tvar ' + L('ps') : ''),
      'Části stránky: ' + (parts.join(', ') || 'jen úvod'),
      'Dojem: oddělení ' + L('sep') + ', rozestupy ' + L('dn') + ', animace ' + L('an') + ', ' + L('ico'),
      'Doplňky: ' + (S.ex.map(function (k) { return EXTRAS[k]; }).join(', ') || 'žádné'),
      'Náhled naposledy: ' + (S.view === 'mob' ? 'mobil' : 'počítač')
    ];
    var ch = Object.keys(S.t).filter(function (k) { return S.t[k].trim() && S.t[k] !== TX[k]; });
    if (ch.length) {
      out.push(''); out.push('Upravené texty:');
      ch.forEach(function (k) { out.push('  ' + (TLBL[k] || (k.indexOf('s_') === 0 ? 'Nadpis části ' + (SECS[k.slice(2)] || 'Rezervace') : 'Text ' + k)) + ': ' + S.t[k].replace(/\s+/g, ' ')); });
    }
    return out;
  }

  /* ---------- obsluha ---------- */
  var tabs = $$('[role="tab"]', app), panes = $$('.nv-pane', app), STEPK = STEPS.map(function (s) { return s[0]; });
  function tab(t, scroll) {
    var ti = STEPK.indexOf(t);
    tabs.forEach(function (b) { var i = STEPK.indexOf(b.getAttribute('data-tab')); b.setAttribute('aria-selected', String(i === ti)); b.parentNode.classList.toggle('done', i < ti); });
    panes.forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== t; });
    app.setAttribute('data-tab', t);
    if (t === 'obsah' && !S.on.length) reveal('top');
    if (scroll) {
      var tb2 = $('.nv-steps', app).getBoundingClientRect(), off = narrow() ? stage.getBoundingClientRect().bottom + 8 : 96;
      if (tb2.top < off - 2 || tb2.top > innerHeight * .55) scrollBy({ top: tb2.top - off, behavior: reduce ? 'auto' : 'smooth' });
    }
  }
  function cycle(map, cur) { var ks = Object.keys(map); return ks[(ks.indexOf(cur) + 1) % ks.length]; }
  // přesun mezi zapnutými částmi (vypnuté v pořadí přeskočí, jinak by šipka „nic neudělala“)
  function move(key, dir) {
    var onL = S.ord.filter(isOn), i = onL.indexOf(key), j = i + dir;
    if (i < 0 || j < 0 || j >= onL.length) return false;
    var a = S.ord.indexOf(key), b = S.ord.indexOf(onL[j]);
    S.ord[a] = onL[j]; S.ord[b] = key; return true;
  }
  function pageAct(b) {
    var a = b.getAttribute('data-pa'), k = b.getAttribute('data-k');
    if (a === 'addm') { addOpen = !addOpen; b.parentNode.classList.toggle('open', addOpen); return; }
    // křížek zavře lištu; s myší zůstane schovaná, dokud kurzor z části neodjede
    if (a === 'close') {
      var s = b.closest('[data-s]'); selK = null; b.blur();
      if (s) {
        s.classList.remove('p-sel');
        if (fine.matches) { s.classList.add('p-tbo'); s.addEventListener('pointerleave', function f() { s.classList.remove('p-tbo'); s.removeEventListener('pointerleave', f); }); }
      }
      return;
    }
    if (a === 'exoff') return change(function () { S.ex = S.ex.filter(function (x) { return x !== k; }); });
    if (a === 'add') { addOpen = false; selK = k; return change(function () { if (!isOn(k)) S.on.push(k); }, k); }
    if (a === 'var') return change(function () { S.vr[k] = cycle(VARS[k], vr(k)); }, k);
    if (a === 'up' || a === 'down') { selK = k; return change(function () { move(k, a === 'up' ? -1 : 1); }, k); }
    if (a === 'off') { selK = null; return change(function () { S.on = S.on.filter(function (x) { return x !== k; }); }); }
    if (a === 'hero') return change(function () { S.hero = cycle(HEROS, S.hero); }, 'top');
    if (a === 'hh') return change(function () { S.hh = cycle(O.hh, S.hh); }, 'top');
    if (a === 'nav') return change(function () { S.nav = cycle(O.nav, S.nav); }, 'top');
    if (a === 'img') return change(function () {
      var g = PH[S.img] ? PH[S.img][2] : pgrp, list = PHOTOS.filter(function (p) { return p[2] === g; }), i = list.indexOf(PH[S.img]);
      S.img = list[(i + 1) % list.length][0]; pgrp = g;
    }, 'top');
  }
  app.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || !app.contains(b) || b.disabled) return;
    if (b.hasAttribute('data-pa')) return pageAct(b);
    var k = b.getAttribute('data-set'), v = b.getAttribute('data-v');
    if (k) return change(function () { apply(k, v); }, HEROK[k] ? 'top' : k.indexOf('vr:') === 0 ? k.slice(3) : null);
    if (b.hasAttribute('data-tab')) return tab(b.getAttribute('data-tab'), b.hasAttribute('data-go') || narrow());
    if (b.hasAttribute('data-view')) { endPeek(); S.view = b.getAttribute('data-view'); render(); syncPanel(); persist(); return; }
    if (b.hasAttribute('data-pg')) { pgrp = b.getAttribute('data-pg'); syncPanel(); return; }
    var act = b.getAttribute('data-act'), key = b.getAttribute('data-k');
    if (act === 'ov') { endPeek(); ov = !ov; render(); syncPanel(); return; }
    if (act === 'adv' || act === 'easy') { mode(act === 'adv'); var top = app.getBoundingClientRect().top; if (top < 0 || top > innerHeight * .5) scrollBy({ top: top - 16, behavior: reduce ? 'auto' : 'smooth' }); return; }
    if (act === 'random') return random();
    if (act === 'undo' && hist.length) { endPeek(); S = JSON.parse(hist.pop()); render(); syncPanel(); persist(); return; }
    if (act === 'nologo') return change(function () { logo = null; });
    if (act === 'up' || act === 'down') {
      change(function () { move(key, act === 'up' ? -1 : 1); }, key);
      var nb = $('[data-act="' + act + '"][data-k="' + key + '"]', secList); if (nb && !nb.disabled) nb.focus();
      return;
    }
    if (act === 'off') return change(function () { S.on = S.on.filter(function (x) { return x !== key; }); });
    if (act === 'on') return change(function () { if (!isOn(key)) S.on.push(key); }, key);
    if (act === 'versave') { vers.push(packObj()); saveVers(); verUI(); return; }
    if (act === 'ver') { var vo = vers[+b.getAttribute('data-i')]; if (vo) change(function () { var view = S.view; S = load(vo); S.view = view; seen = {}; }, 'top'); return; }
    if (act === 'verx') { vers.splice(+b.getAttribute('data-i'), 1); saveVers(); verUI(); return; }
    if (act === 'copy') {
      link().then(function (u) {
        var done = function () { b.textContent = 'Odkaz je zkopírovaný'; setTimeout(function () { b.textContent = 'Zkopírovat odkaz na návrh'; }, 2400); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(done, function () { prompt('Odkaz na návrh:', u); });
        else prompt('Odkaz na návrh:', u);
      });
    }
  });
  /* klik do náhledu: v pohledu „Celá stránka“ přiblíží danou část, jinak část vybere (lišta zůstane vidět i na dotykovém displeji) */
  page.addEventListener('click', function (e) {
    if (e.target.closest('button,[data-t]')) return;
    var s = e.target.closest('[data-s]');
    // klik mimo části (patička, okraj) výběr zruší a lišta zmizí
    if (!s) { if (selK && !ov) { selK = null; $$('.p-sel', page).forEach(function (x) { x.classList.remove('p-sel'); }); } return; }
    var k = s.getAttribute('data-s');
    if (ov) { ov = false; render(); syncPanel(); if (k !== 'nav') reveal(k === 'uvod' ? 'top' : k); return; }
    selK = k; $$('.p-sel', page).forEach(function (x) { x.classList.remove('p-sel'); }); s.classList.add('p-sel');
    // když je začátek části nad okrajem náhledu, dorolovat, ať je její lišta vidět (na mobilu jinak zůstane schovaná)
    var pn = $('.p-nav', page), off = s.getBoundingClientRect().top - scroller.getBoundingClientRect().top - (pn && k !== 'nav' ? pn.getBoundingClientRect().height : 0);
    if (off < 0) scroller.scrollBy({ top: off, behavior: 'smooth' });
    if (k !== 'nav' && k !== 'uvod' && k !== 'rez') { var li = $('li[data-k="' + k + '"]', secList); if (li) { li.classList.remove('nv-hl'); void li.offsetWidth; li.classList.add('nv-hl'); } }
  });
  app.addEventListener('change', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-ex')) {
      var x = t.getAttribute('data-ex'), on2 = t.checked;
      return change(function () { S.ex = S.ex.filter(function (y) { return y !== x; }); if (on2) S.ex.push(x); if (on2 && x === 'lista') S.view = 'mob'; }, on2 ? ({ rez: 'rez', hod: 'top', volat: 'top', jaz: 'top', akce: 'top', soc: 'end', google: S.on.indexOf('kontakt') > -1 ? 'kontakt' : 'end' }[x] || null) : null);
    }
    if (t.hasAttribute('data-file')) {
      var kind = t.getAttribute('data-file'), file = t.files && t.files[0];
      t.value = '';
      if (!file) return;
      readImg(file, kind === 'foto' ? 1400 : 600, kind === 'foto' ? 'image/jpeg' : 'image/png').then(function (url) {
        change(function () { if (kind === 'foto') { foto = url; S.img = 'vlastni'; } else logo = url; }, 'top');
      }, function () { alertMsg('Tenhle soubor se nepodařilo načíst. Zkuste prosím fotku ve formátu JPG nebo PNG.'); });
    }
  });
  var colT = null;
  app.addEventListener('input', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-color')) { clearTimeout(colT); var val = t.value; colT = setTimeout(function () { change(function () { S.c = val.toLowerCase(); }); }, 60); return; }
    if (t.hasAttribute('data-tin')) {
      var k = t.getAttribute('data-tin');
      S.t[k] = t.value; persist();
      var els = $$('[data-t="' + k + '"],[data-tv="' + k + '"]', page);
      if (els.length) els.forEach(function (el) { el.textContent = t.value || TX[k]; }); else render();
      if (k === 'name') nameSide(t.value);
    }
  });
  function nameSide(v) {
    urlEl.textContent = slug(v) + '.cz';
    if (S.mk === 'inicial') $$('.p-mark', page).forEach(function (m) { m.textContent = initial(); });
    var n = $('.nv-chn', app); if (n) n.textContent = tx('name');
  }
  /* psaní přímo v náhledu */
  page.addEventListener('input', function (e) {
    var el = e.target.closest('[data-t]'); if (!el) return;
    var k = el.getAttribute('data-t'), v = el.textContent.replace(/\s+/g, ' ').slice(0, 300);
    S.t[k] = v; persist();
    $$('[data-t="' + k + '"],[data-tv="' + k + '"]', page).forEach(function (o) { if (o !== el) o.textContent = v; });
    var inp = $('[data-tin="' + k + '"]', app); if (inp) inp.value = v;
    if (k === 'name') nameSide(v);
  });
  page.addEventListener('focusout', function (e) {
    var el = e.target.closest && e.target.closest('[data-t]'); if (!el) return;
    var k = el.getAttribute('data-t');
    if (!el.textContent.trim()) { delete S.t[k]; el.textContent = TX[k]; persist(); }
    syncPanel();
  });
  page.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.closest('[data-t]')) { e.preventDefault(); e.target.blur(); } });
  page.addEventListener('paste', function (e) {
    if (plain || !e.target.closest('[data-t]')) return;
    e.preventDefault(); var t = (e.clipboardData || window.clipboardData).getData('text'); d.execCommand('insertText', false, t);
  });
  /* na mobilu se náhled při psaní do panelu odlepí, aby nezakryl pole */
  app.addEventListener('focusin', function (e) { if (e.target.matches('.nv-panel input:not([type=checkbox]):not([type=color]):not([type=file]),.nv-panel textarea')) app.classList.add('typing'); });
  app.addEventListener('focusout', function () { app.classList.remove('typing'); });

  function readImg(file, max, type) {
    return new Promise(function (res, rej) {
      if (!file || !/^image\//.test(file.type) || file.size > 25e6) return rej();
      var fr = new FileReader();
      fr.onload = function () {
        var im = new Image();
        im.onload = function () {
          var k = Math.min(1, max / Math.max(im.width, im.height)), c = d.createElement('canvas');
          c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
          var g = c.getContext('2d');
          if (type === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
          g.drawImage(im, 0, 0, c.width, c.height);
          var out = c.toDataURL(type, .82);
          if (out.length > 650000) out = c.toDataURL('image/jpeg', .72);
          res(out);
        };
        im.onerror = rej; im.src = fr.result;
      };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }
  function alertMsg(t) { fmsg.className = 'form-msg err'; fmsg.textContent = t; var h = $('.nv-hint', app); if (h) { h.textContent = t; h.classList.add('err'); } }

  /* ---------- odeslání ---------- */
  var FAIL = 'Návrh se nepodařilo odeslat. Zavolejte nám prosím na 776 289 219 nebo napište na vladislav@whytelynx.cz.';
  var contactOk = function (v) { v = v.trim(); var dg = v.replace(/\D/g, ''); return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || (/^\+?[\d\s\-\/().]+$/.test(v) && dg.length >= 9 && dg.length <= 15); };
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var nm = form.elements.jmeno, ct = form.elements.kontakt;
    nm.setCustomValidity(nm.value.trim() ? '' : 'Vyplňte prosím jméno.');
    ct.setCustomValidity(contactOk(ct.value) ? '' : 'Zadejte platný e-mail nebo telefonní číslo.');
    if (!nm.reportValidity() || !ct.reportValidity()) return;
    var b = $('button[type="submit"]', form), label = b.textContent; b.disabled = true; b.textContent = 'Odesílám…';
    endPeek();
    Promise.all([link()].concat(vers.map(function (v) { return link(v); }))).then(function (us) {
      var fd = new FormData(form), text = summary().join('\n');
      // uložené verze jako odkazy navíc; kontakt.php bere souhrn do 8000 znaků
      var extra = us.slice(1).map(function (u, i) { return 'Verze ' + 'ABC'.charAt(i) + ': ' + u; });
      if (extra.length && (text + extra.join('\n')).length < 7600) text += '\n\nUložené verze návrhu:\n' + extra.join('\n');
      fd.append('navrh', text);
      fd.append('navrh_odkaz', us[0]);
      if (S.img === 'vlastni' && foto) fd.append('foto', foto);
      if (logo) fd.append('logo', logo);
      return fetch('kontakt.php', { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } }).then(function (r) { return r.json(); });
    }).then(function (dt) {
      if (dt && dt.ok) { fmsg.className = 'form-msg ok'; fmsg.textContent = 'Děkujeme, návrh odešel. Brzy se Vám ozveme.'; form.elements.zprava.value = ''; }
      else { fmsg.className = 'form-msg err'; fmsg.textContent = (dt && dt.error) || FAIL; }
    }).catch(function () { fmsg.className = 'form-msg err'; fmsg.textContent = FAIL; })
      .then(function () { b.disabled = false; b.textContent = label; });
  });
  form.addEventListener('input', function (e) { if (e.target.setCustomValidity) e.target.setCustomValidity(''); });

  /* ---------- start ---------- */
  var fontsIn = false;
  function loadFonts() {
    if (fontsIn) return; fontsIn = true;
    var l = d.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Bitter:wght@700&family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Caveat:wght@700&family=Fraunces:opsz,wght,SOFT,WONK@9..144,400..900,0..100,0..1' +
      '&family=JetBrains+Mono:wght@400;600&family=Lora:wght@400;600&family=Nunito:wght@400;800&family=Sora:wght@700&family=Space+Grotesk:wght@400;700&family=Unbounded:wght@700&display=swap';
    d.head.appendChild(l);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { if (es[0].isIntersecting) loadFonts(); }, { rootMargin: '900px 0px' }).observe(app);
    new IntersectionObserver(function (es) { d.body.classList.toggle('nv-in', es[0].isIntersecting); }, { rootMargin: '-30% 0px -30% 0px' }).observe(app);
  } else loadFonts();
  var hm = /[#&]navrh=([A-Za-z0-9_-]+)/.exec(location.hash);
  if (hm) {
    unpack(hm[1]).then(function (o) {
      S = load(o); if (narrow()) S.view = 'mob'; fromLink = true; $('.nv-from', app).hidden = false; loadFonts(); render(); syncPanel();
      setTimeout(function () { scrollTo(0, Math.max(0, app.getBoundingClientRect().top + scrollY - (narrow() ? 0 : 90))); }, 250);
    }).catch(function () {});
  } else {
    try { var ls = localStorage.getItem('wlNavrh'); if (ls) S = load(JSON.parse(ls)); } catch (e) {}
    if (narrow()) S.view = 'mob';
    var om = /[#&]obor=([a-z]+)/.exec(location.hash), ob = om && own(OBORY, om[1]) ? OBORY[om[1]] : null;
    if (ob) {
      apply('p', ob.p); S.img = ob.i; S.t = clone(ob.t); if (PH[S.img]) pgrp = PH[S.img][2]; loadFonts();
      setTimeout(function () {
        scrollTo(0, Math.max(0, app.getBoundingClientRect().top + scrollY - (narrow() ? 0 : 90)));
        // na mobilu je pás stylů vodorovný: posunout ho na vybraný styl, jinak ho návštěvník z oboru nevidí
        var st = $('.nv-sts', app), sel = st && $('[data-set="p"][aria-pressed="true"]', st);
        if (sel && st.scrollWidth > st.clientWidth) st.scrollLeft += sel.getBoundingClientRect().left - st.getBoundingClientRect().left - 16;
      }, 250);
    }
  }
  if (PH[S.img]) pgrp = PH[S.img][2];
  render(); syncPanel(); tab('styl');
  var fslot = $('.nv-fslot', app), fhome = form.parentNode, fnext = form.nextSibling;
  function mode(a) {
    endPeek(); ov = false;
    app.classList.toggle('adv', a);
    if (a) { fhome.insertBefore(form, fnext); tab('styl'); } else fslot.appendChild(form);
    try { localStorage.setItem('wlNavrhAdv', a ? '1' : ''); } catch (e) {}
    render(); syncPanel();
  }
  var adv0 = false; try { adv0 = localStorage.getItem('wlNavrhAdv') === '1'; } catch (e) {}
  mode(adv0);
  var rt = null;
  addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(fit, 120); });
  window.__nv = { S: function () { return S; }, summary: summary, link: link, render: render, mode: mode, ov: function (v) { ov = !!v; render(); syncPanel(); } };
})();
