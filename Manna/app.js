/* Manna — app. The home screen, the scroll (a bounded feed with a visible timer and a descent toward stillness), the cards,
   What I Want, and the landing. Storage prefix: "manna.". No network except optional photo hot-links. */
(function () {
  'use strict';
  var C = window.MannaContent, T = window.MannaText, PL = window.MannaPlaces, E = window.MannaEngine, A = window.MannaArt, G = window.MannaGames;
  var VERSION = 'v6';
  var V = window.MannaVoice;
  var KEY = 'manna.state', SKEY = 'manna.session', PKEY = 'manna.paused';

  // ---------- helpers ----------
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function rnd() { return Math.random(); }
  function fmt(sec) { var m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function catLabel(id) { var c = C.CATS.filter(function (x) { return x.id === id; })[0]; return c ? c.label : id; }

  // ---------- state ----------
  var S = { mins: 15, cats: [], mood: null, kept: [], mine: [], math: E.newMath(), seen: {}, log: [], dim: 0.38, mathInput: 'pad', photos: true, voice: 'am_adam', autoRead: false, voiceInstalled: false };
  try { var raw = JSON.parse(localStorage.getItem(KEY) || 'null'); if (raw) { for (var k in raw) S[k] = raw[k]; } } catch (e) {}
  E.SKILLS.forEach(function (k) { if (!S.math[k]) S.math[k] = E.newMath()[k]; });
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  var artFiles = [];
  try { fetch('art/manifest.json').then(function (r) { return r.ok ? r.json() : []; }).then(function (a) { if (Array.isArray(a)) artFiles = a; }).catch(function () {}); } catch (e) {}

  var DESKTOP = !!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches);

  // ---------- screens ----------
  var SCREENS = ['homeScreen', 'feedScreen', 'landScreen', 'keptScreen', 'mineScreen', 'mathScreen', 'setScreen'];
  function show(id) { SCREENS.forEach(function (s) { $(s).hidden = s !== id; }); }
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-back]')) { renderHome(); show('homeScreen'); } });

  function ask(text, yes, cb, no) {
    var sh = el('div', 'sheet'), box = el('div', '', '<p class="serif" style="font-size:1.15rem;margin:.2rem 0 1rem">' + esc(text) + '</p><div class="timeup" style="position:static;border:none;background:none;box-shadow:none;padding:0"><div class="row"><button class="btn ghost" data-n>' + esc(no || 'Not yet') + '</button><button class="btn primary" data-y>' + esc(yes) + '</button></div></div>');
    sh.appendChild(box); $('layer').appendChild(sh);
    box.querySelector('[data-n]').onclick = function () { sh.remove(); };
    box.querySelector('[data-y]').onclick = function () { sh.remove(); cb(); };
  }

  // ---------- home ----------
  function renderHome() {
    var mc = $('moodChips'); mc.innerHTML = '';
    C.MOODS.forEach(function (m) {
      var b = el('button', 'chip' + (S.mood === m.id ? ' on' : ''), esc(m.label)); b.type = 'button';
      b.onclick = function () { S.mood = S.mood === m.id ? null : m.id; save(); renderHome(); }; mc.appendChild(b);
    });
    var nc = $('minChips'); nc.innerHTML = '';
    [5, 10, 15, 20, 30, 45].forEach(function (n) {
      var b = el('button', 'chip' + (S.mins === n ? ' on' : ''), n + ' min'); b.type = 'button';
      b.onclick = function () { S.mins = n; save(); renderHome(); }; nc.appendChild(b);
    });
    $('goBtn').textContent = (paused ? 'Start a new ' : 'Scroll ') + S.mins + (paused ? '-minute scroll' : ' minutes');
    var pc = $('pausedCard');
    if (paused) {
      var what = paused.sess.cats.length ? paused.sess.cats.map(catLabel).join(', ') : 'a mix of everything';
      pc.hidden = false;
      pc.innerHTML = '<div class="small">Your scroll is paused · ' + esc(what) + '</div><div class="serif" style="font-size:1.25rem;margin:.2rem 0 .7rem">' + fmt(Math.ceil(paused.left / 1000)) + ' left</div><div class="row"><button class="btn primary" id="resumeBtn">Resume</button><button class="btn ghost" id="dropBtn">Let it go</button></div><div class="small" style="margin-top:.6rem">Starting a new one below replaces it.</div>';
      $('resumeBtn').onclick = resume; $('dropBtn').onclick = function () { dropPaused(); renderHome(); };
    } else { pc.hidden = true; pc.innerHTML = ''; }
    var cc = $('catChips'); cc.innerHTML = '';
    C.CATS.forEach(function (c) {
      var on = S.cats.indexOf(c.id) >= 0, b = el('button', 'chip' + (on ? ' on' : ''), esc(c.label)); b.type = 'button';
      b.onclick = function () { var i = S.cats.indexOf(c.id); if (i >= 0) S.cats.splice(i, 1); else S.cats.push(c.id); save(); renderHome(); }; cc.appendChild(b);
    });
    $('mixNote').textContent = S.cats.length ? '· only what you picked' : '· tap to pick, or leave blank for a mix of everything';
    var mm = C.MOODS.filter(function (m) { return m.id === S.mood; })[0], bits = []; if (mm) bits.push(mm.label); bits.push(S.cats.length ? S.cats.map(catLabel).join(', ') : 'a mix of everything');
    $('tuneSum').textContent = 'Tune tonight · ' + bits.join(' · ');
    $('keptCount').textContent = S.kept.length ? S.kept.length + ' saved' : 'Nothing yet';
    var cut = Date.now() - 7 * 86400000, nights = {};
    S.log.forEach(function (l) { if (l.landed && l.t > cut) nights[l.d] = 1; });
    $('foot').textContent = VERSION;
  }
  $('goBtn').onclick = function () { startSession({ cats: S.cats.slice() }); };
  $('wantTile').onclick = function () { startSession({ cats: ['want'] }); };
  $('keptTile').onclick = function () { renderKept(); show('keptScreen'); };
  $('mineTile').onclick = function () { renderMine(); show('mineScreen'); };
  $('mathTile').onclick = function () { renderMath(); show('mathScreen'); };
  $('setTile').onclick = function () { renderSettings(); show('setScreen'); };

  function renderKept() {
    var l = $('keptList'); l.innerHTML = '';
    if (!S.kept.length) l.innerHTML = '<p class="small">Tap the heart on any card to keep it here.</p>';
    S.kept.slice().reverse().forEach(function (k) {
      var d = el('div', 'keptitem', '<button>remove</button>' + esc(k.body) + '<small>' + esc(k.title) + (k.by ? ' · ' + esc(k.by) : '') + '</small>');
      d.querySelector('button').onclick = function () { S.kept = S.kept.filter(function (x) { return x.key !== k.key; }); save(); renderKept(); };
      l.appendChild(d);
    });
  }
  function renderMine() {
    var l = $('mineList'); l.innerHTML = '';
    S.mine.forEach(function (m) {
      var d = el('div', 'keptitem', '<button>remove</button>' + esc(m.t.slice(0, 160)) + (m.t.length > 160 ? '…' : '') + '<small>' + esc(m.a) + '</small>');
      d.querySelector('button').onclick = function () { S.mine = S.mine.filter(function (x) { return x.id !== m.id; }); save(); renderMine(); };
      l.appendChild(d);
    });
  }
  $('mineSave').onclick = function () {
    var a = $('mineA').value.trim(), t = $('mineT').value.trim(); if (!t) return;
    S.mine.push({ id: 'm' + Date.now(), a: a || 'Mine', w: $('mineW').value.trim(), t: t });
    $('mineT').value = ''; save(); renderMine();
  };
  function renderMath() {
    var l = $('mathList'); l.innerHTML = '';
    E.SKILLS.forEach(function (k) {
      var s = S.math[k], pct = Math.round((s.lvl - 1) / (E.MAXLVL[k] - 1) * 100);
      l.appendChild(el('div', 'keptitem', '<div class="row2"><span>' + esc(E.LABEL[k]) + '</span><span class="small">Level ' + Math.floor(s.lvl) + ' of ' + E.MAXLVL[k] + '</span></div><div class="bar2" style="margin-top:.5rem"><i style="width:' + pct + '%"></i></div><p class="small" style="margin:.5rem 0 0;font-family:var(--sans)">' + esc(C.TIPS[k]) + '</p>'));
    });
  }
  function renderSettings() {
    $('dimRange').value = Math.round(S.dim * 100); $('dimVal').textContent = Math.round(S.dim * 100) + '%';
    var ic = $('inputChips'); ic.innerHTML = '';
    [['pad', 'Number pad'], ['choices', 'Tap the answer']].forEach(function (o) { var b = el('button', 'chip' + (S.mathInput === o[0] ? ' on' : ''), o[1]); b.type = 'button'; b.onclick = function () { S.mathInput = o[0]; save(); renderSettings(); }; ic.appendChild(b); });
    renderVoice();
    var pc = $('photoChips'); pc.innerHTML = '';
    [[true, 'Show photos'], [false, 'Drawn art only']].forEach(function (o) { var b = el('button', 'chip' + (S.photos === o[0] ? ' on' : ''), o[1]); b.type = 'button'; b.onclick = function () { S.photos = o[0]; save(); renderSettings(); }; pc.appendChild(b); });
  }
  function renderVoice() {
    var st = $('voiceStatus'), bt = $('voiceBtn'), vc = $('voiceChips'), ac = $('autoChips');
    if (!V || !V.supported()) { st.textContent = 'Not supported in this browser.'; bt.hidden = true; return; }
    var ready = V.status() === 'ready';
    st.textContent = ready ? 'Ready. Works offline.' : S.voiceInstalled ? 'Downloaded earlier. It loads the first time you listen.' : 'Not downloaded yet (about 90 MB, once, best on Wi-Fi).';
    bt.hidden = ready; bt.textContent = S.voiceInstalled ? 'Load the voice now' : 'Download the voice';
    bt.onclick = function () { installVoice(function (t) { bt.textContent = t || (S.voiceInstalled ? 'Load the voice now' : 'Download the voice'); }, renderVoice); };
    vc.innerHTML = '';
    var list = ready && V.list().length ? V.list() : [{ id: 'am_adam', name: 'Adam' }];
    list.forEach(function (v) { var b = el('button', 'chip' + (S.voice === v.id ? ' on' : ''), esc(v.name || v.id)); b.type = 'button'; b.onclick = function () { S.voice = v.id; save(); renderVoice(); if (ready) V.speak('Be still, and know that I am God.', S.voice); }; vc.appendChild(b); });
    ac.innerHTML = '';
    [[false, 'Tap 🔊 to listen'], [true, 'Read each card aloud']].forEach(function (o) { var b = el('button', 'chip' + (S.autoRead === o[0] ? ' on' : ''), o[1]); b.type = 'button'; b.onclick = function () { S.autoRead = o[0]; save(); renderVoice(); }; ac.appendChild(b); });
  }
  $('dimRange').oninput = function () { S.dim = this.value / 100; $('dimVal').textContent = this.value + '%'; save(); };
  $('resetMath').onclick = function () { ask('Reset your math levels to the start?', 'Reset', function () { S.math = E.newMath(); save(); }); };
  $('resetSeen').onclick = function () { S.seen = {}; save(); };

  // ---------- session ----------
  var paused = null;
  try { var pj = JSON.parse(localStorage.getItem(PKEY) || 'null'); if (pj && pj.sess && Date.now() - pj.at < 6 * 3600000) paused = pj; else if (pj) localStorage.removeItem(PKEY); } catch (e) {}
  function dropPaused() { paused = null; try { localStorage.removeItem(PKEY); } catch (e) {} }
  var sess = null, tickT = 0, observer = null, banner = null, cardsN = 0, lastCat = null, closed = false, landing = false, gameH = null;

  function startSession(o) {
    dropPaused(); var now = Date.now();
    sess = { start: now, end: now + S.mins * 60000, mins: S.mins, cats: o.cats || [], mood: S.mood, ext: false, keptNow: [] };
    try { localStorage.setItem(SKEY, JSON.stringify(sess)); } catch (e) {}
    openFeed();
  }
  function openFeed() {
    show('feedScreen'); try { history.pushState({ manna: 1 }, ''); } catch (e) {} var feed = $('feed'); feed.innerHTML = ''; feed.scrollTop = 0; cardsN = 0; lastCat = null; closed = false;
    if (banner) { banner.remove(); banner = null; }
    if (observer) observer.disconnect();
    observer = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting && en.intersectionRatio > 0.6) {
          var c = en.target; if (c._show && !c._shown) { c._shown = true; c._show(); }
          if (V && (V.speaking() || true)) { V.stop(); resetListen(); }
          if (S.autoRead && V && V.status() === 'ready' && c._say) sayCard(c, c.querySelector('.listen'));
          if (S.autoRead && V && V.status() === 'ready') { var nx = c.nextElementSibling; if (nx && nx._say) V.prefetch(nx._say, S.voice); }
          var all = feed.children, idx = [].indexOf.call(all, c);
          if (idx >= all.length - 3) addCards(3);
          var h = c.querySelector('.hint'); if (idx > 0) { var h0 = feed.querySelector('.hint'); if (h0) h0.remove(); }
        }
      });
    }, { root: feed, threshold: [0.6] });
    addCards(4);
    var first = feed.firstChild; if (first && !S.hintSeen) { first.appendChild(el('div', 'hint', DESKTOP ? 'Scroll, or press ↓ or Space' : 'Swipe up ↑')); }
    feed.addEventListener('pointerdown', function () { var h = feed.querySelector('.hint'); if (h) h.remove(); S.hintSeen = true; save(); }, { once: true });
    clearInterval(tickT); tickT = setInterval(tick, 1000); tick();
  }
  function progress() { if (!sess) return 0; var p = Math.max(0, Math.min(1, (Date.now() - sess.start) / (sess.end - sess.start))); return sess.ext ? Math.max(p, 0.95) : p; }
  function tick() {
    if (!sess) return; var now = Date.now(), p = progress(), rem = Math.max(0, Math.ceil((sess.end - now) / 1000));
    $('fill').style.width = (p * 100) + '%'; $('orb').style.left = (p * 100) + '%'; $('left').textContent = fmt(rem);
    $('orb').style.background = p < 0.38 ? '#ffe9b0' : p < 0.74 ? '#f6b38a' : '#b9b6ff';
    $('dim').style.opacity = E.dimAt(p, S.dim); $('feedScreen').style.setProperty('--p', p.toFixed(3)); var gl = $('gameLeft'); if (gl) gl.textContent = fmt(rem) + ' left';
    if (now >= sess.end && !banner) showTimeUp();
    if (banner && now >= sess.end + 45000) land();
  }
  function showTimeUp() {
    banner = el('div', 'timeup', '<div class="serif" style="font-size:1.2rem">That\'s your time.</div><div class="small">Come down gently. He is waiting for you.</div><div class="row">' + (sess.ext ? '' : '<button class="btn ghost" data-x>+3 minutes</button>') + '<button class="btn primary" data-l>Land</button></div>');
    banner.style.zIndex = 45; banner.style.top = 'calc(env(safe-area-inset-top, 0px) + 3.2rem)'; banner.style.bottom = 'auto'; $('layer').appendChild(banner);
    banner.querySelector('[data-l]').onclick = land;
    var x = banner.querySelector('[data-x]'); if (x) x.onclick = function () { sess.ext = true; sess.end = Date.now() + 3 * 60000; try { localStorage.setItem(SKEY, JSON.stringify(sess)); } catch (e) {} banner.remove(); banner = null; tick(); };
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && sess) tick(); });
  // ---------- going back, the menu, refresh ----------
  function teardown() {
    clearInterval(tickT); tickT = 0; if (banner) { banner.remove(); banner = null; }
    if (V) V.stop(); if (gameH) { gameH.stop(); gameH = null; }
    $('layer').innerHTML = ''; if (observer) observer.disconnect(); $('feed').innerHTML = ''; $('dim').style.opacity = 0;
  }
  // Step out without losing the sitting: the clock stops, and you can pick something else, then resume or start fresh.
  function pause() {
    if (!sess || landing) return;
    paused = { sess: sess, left: Math.max(60000, sess.end - Date.now()), total: sess.end - sess.start, at: Date.now() };
    try { localStorage.setItem(PKEY, JSON.stringify(paused)); localStorage.removeItem(SKEY); } catch (e) {}
    sess = null; teardown(); renderHome(); show('homeScreen');
  }
  function resume() {
    if (!paused) return; var p = paused; dropPaused();
    sess = p.sess; sess.end = Date.now() + p.left; sess.start = sess.end - p.total;
    try { localStorage.setItem(SKEY, JSON.stringify(sess)); } catch (e) {}
    openFeed();
  }
  // Change what the scroll is made of, without pausing: the card you are on stays, what comes after is rebuilt.
  function changeWhat() {
    var sh = el('div', 'sheet'), box = el('div', '', '<p class="serif" style="font-size:1.15rem;margin:.2rem 0 .8rem">What do you want to scroll through?</p><div class="chips" id="cwChips"></div><p class="small" style="margin:.7rem 0 0">Leave all unselected for a mix of everything. The time keeps running.</p><button class="btn primary" id="cwGo" style="text-align:center">Change it</button><button class="btn ghost" id="cwX" style="text-align:center">Never mind</button>');
    sh.appendChild(box); $('layer').appendChild(sh);
    var pick = sess.cats.slice(), cw = box.querySelector('#cwChips');
    function draw() {
      cw.innerHTML = '';
      C.CATS.forEach(function (c) {
        var b = el('button', 'chip' + (pick.indexOf(c.id) >= 0 ? ' on' : ''), esc(c.label)); b.type = 'button';
        b.onclick = function () { var i = pick.indexOf(c.id); if (i >= 0) pick.splice(i, 1); else pick.push(c.id); draw(); }; cw.appendChild(b);
      });
    }
    draw();
    box.querySelector('#cwX').onclick = function () { sh.remove(); };
    box.querySelector('#cwGo').onclick = function () {
      sh.remove(); sess.cats = pick; try { localStorage.setItem(SKEY, JSON.stringify(sess)); } catch (e) {}
      var f = $('feed'), cur = currentCard(); if (V) { V.stop(); resetListen(); }
      if (cur) { while (cur.nextElementSibling) { var x = cur.nextElementSibling; observer.unobserve(x); x.remove(); } }
      lastCat = null; closed = false; addCards(3);
      var nx = cur && cur.nextElementSibling; if (nx) setTimeout(function () { step(1); }, 150);
    };
  }
  function currentCard() { var f = $('feed'); return f.children[Math.round(f.scrollTop / Math.max(1, f.clientHeight))] || null; }
  function refreshCard() {
    var c = currentCard(); if (!c || !c.dataset.cat) return; if (V) { V.stop(); resetListen(); }
    var n = makeCard(); observer.unobserve(c); c.replaceWith(n); observer.observe(n);
  }
  function openMenu() {
    var sh = el('div', 'sheet'), box = el('div', '', '<button class="btn" data-a="new">↻  Replace this card</button><button class="btn" data-a="what">Change what I\'m scrolling</button><button class="btn" data-a="leave">‹  Pause and pick something else</button><button class="btn" data-a="land">Land now</button><button class="btn ghost" data-a="x">Keep scrolling</button>');
    sh.appendChild(box); $('layer').appendChild(sh);
    sh.onclick = function (e) { if (e.target === sh) sh.remove(); };
    box.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; var k = b.dataset.a; sh.remove(); if (k === 'new') refreshCard(); else if (k === 'land') land(); else if (k === 'leave') pause(); else if (k === 'what') changeWhat(); };
  }
  $('backBtn').onclick = pause; $('menuBtn').onclick = openMenu;
  window.addEventListener('popstate', function () { if (!$('feedScreen').hidden && sess) { try { history.pushState({ manna: 1 }, ''); } catch (e) {} if (!$('layer').children.length) pause(); } });
  function reloadApp() {
    var done = function () { location.reload(); };
    try {
      navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.update().catch(function () {}); })); })
        .then(function () { return caches.keys(); }).then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('manna-') === 0; }).map(function (k) { return caches.delete(k); })); }).then(done, done);
    } catch (e) { done(); }
  }
  $('reloadBtn').onclick = reloadApp; $('updateBtn').onclick = reloadApp;

  // ---------- feed building ----------
  function chooseCat() {
    var cats = sess.cats.length ? sess.cats : C.CATS.map(function (c) { return c.id; });
    var single = cats.length === 1, w = E.weights(cats, progress(), sess.mood, single);
    cats.forEach(function (id) { if (sess.cats.length > 1) w[id] = Math.max(w[id], 0.08); if (id === lastCat && !single) w[id] *= 0.3; });
    return E.pickWeighted(w, rnd);
  }
  function pickId(cat, ids) {
    var h = S.seen[cat] || [], id = E.pickFresh(ids, h, rnd);
    h.push(id); if (h.length > Math.max(1, ids.length - 1)) h.splice(0, h.length - Math.max(1, ids.length - 1)); S.seen[cat] = h; return id;
  }
  function closingCard() {
    var card = el('section', 'card plain'), ref = C.NIGHT_VERSES[Math.floor(rnd() * C.NIGHT_VERSES.length)];
    card.appendChild(el('div', 'gamecard', '<div class="head">That\'s enough for tonight.</div><div class="mid">' + esc(T.verses[ref] || '') + '</div><div class="by">' + esc(ref) + '</div>'));
    var b = el('button', 'btn primary', 'Come down'); b.type = 'button'; b.style.cssText = 'margin-top:1.6rem;width:70%'; b.onclick = land; card.lastChild.appendChild(b); return card;
  }
  function addCards(n) { if (closed) return; if (progress() >= 0.93) { closed = true; var cc = closingCard(); $('feed').appendChild(cc); observer.observe(cc); return; } for (var i = 0; i < n; i++) { var c = makeCard(); $('feed').appendChild(c); observer.observe(c); } save(); }
  function makeCard() {
    var cat = chooseCat(); lastCat = cat; cardsN++;
    var card = el('section', 'card'); card.dataset.cat = cat;
    var keep = BUILD[cat](card);
    card.appendChild(el('div', 'cat', esc(catLabel(cat))));
    if (card._say && V && V.supported()) addListen(card);
    if (keep && keep.key) addHeart(card, keep);
    return card;
  }
  function addHeart(card, keep) {
    var wrap = actionsOf(card), b = el('button', 'heart', '♥'); b.type = 'button'; b.setAttribute('aria-label', 'Keep');
    function on() { return S.kept.some(function (x) { return x.key === keep.key; }); }
    function paint() { b.classList.toggle('on', on()); }
    b.onclick = function () {
      if (on()) S.kept = S.kept.filter(function (x) { return x.key !== keep.key; });
      else { S.kept.push(keep); if (sess) sess.keptNow.push(keep); }
      save(); paint();
    };
    paint(); wrap.appendChild(b);
  }
  function actionsOf(card) { var w = card.querySelector('.actions'); if (!w) { w = el('div', 'actions'); card.appendChild(w); } return w; }
  // ---------- read aloud (Kokoro voice, opt-in) ----------
  var GLYPH = { idle: '🔊', thinking: '…', playing: '■' };
  function setBtn(b, st) { if (!b) return; b.dataset.state = st; b.textContent = GLYPH[st]; }
  function resetListen() { [].forEach.call(document.querySelectorAll('.listen'), function (b) { setBtn(b, 'idle'); }); }
  function note(text) { var sh = el('div', 'sheet', '<div><p class="serif" style="font-size:1.1rem;margin:.2rem 0 1rem">' + esc(text) + '</p><button class="btn primary" style="width:100%">OK</button></div>'); sh.querySelector('button').onclick = function () { sh.remove(); }; $('layer').appendChild(sh); }
  function installVoice(label, done) {
    function prog(p) { if (label) label(Math.round(p * 100) + '%'); }
    if (label) label('…');
    return V.start(prog).then(function () { S.voiceInstalled = true; save(); if (label) label(null); if (done) done(); }).catch(function (e) { if (label) label(null); V.reset(); note('The voice could not load. Check your connection and try again.'); });
  }
  function sayCard(card, b) {
    if (!V.supported()) return note('This browser cannot play the voice.');
    if (V.status() !== 'ready') {
      var go = function () { installVoice(function (t) { if (b) { if (t) b.textContent = t; else setBtn(b, 'idle'); } }, function () { sayCard(card, b); }); };
      if (!S.voiceInstalled) return ask('Hear it read aloud in a natural voice? The voice downloads once (about 90 MB — best on Wi-Fi), then works offline. Nothing you read leaves your phone.', 'Download', go, 'Not now');
      return go();
    }
    setBtn(b, 'thinking');
    V.speak(card._say, S.voice, function (st) { if (st === 'playing') setBtn(b, 'playing'); else if (st === 'thinking') setBtn(b, 'thinking'); else setBtn(b, 'idle'); });
  }
  function addListen(card) {
    var b = el('button', 'heart listen', GLYPH.idle); b.type = 'button'; b.setAttribute('aria-label', 'Read aloud'); b.dataset.state = 'idle';
    b.onclick = function () { if (b.dataset.state === 'playing' || b.dataset.state === 'thinking') { V.stop(); setBtn(b, 'idle'); } else sayCard(card, b); };
    actionsOf(card).appendChild(b);
  }

  var PHASE_MOODS = { spark: ['day', 'sea', 'mountain', 'green', 'forest'], wisdom: ['dawn', 'gold', 'forest', 'mountain'], stillness: ['dusk', 'night'] };
  function moodNow() { var l = PHASE_MOODS[E.phaseAt(progress())]; return l[Math.floor(rnd() * l.length)]; }
  function sceneBg(card, seed, mood) {
    mood = mood || moodNow();
    var bg = el('div', 'bg');
    if (artFiles.length && rnd() < 0.7) { var f = artFiles[A.hash(seed) % artFiles.length], im = new Image(); im.alt = ''; im.onerror = function () { bg.innerHTML = A.scene(seed, mood); }; im.src = 'art/' + f; bg.appendChild(im); }
    else bg.innerHTML = A.scene(seed, mood);
    card.appendChild(bg); card.appendChild(el('div', 'shade'));
  }
  function verseLine(ref) { return T.verses[ref] ? '<div class="vline">' + esc(T.verses[ref]) + ' <span style="white-space:nowrap">— ' + esc(ref) + '</span></div>' : ''; }

  var BUILD = {};

  BUILD.scripture = function (card) {
    var ref = pickId('scripture', Object.keys(T.verses)), text = T.verses[ref];
    sceneBg(card, ref, null);
    var words = text.split(' '), order = shuffle(words.map(function (_, i) { return i; })), lvl = 0, fr = [0, 0.25, 0.5, 0.8];
    var body = el('div'); card.appendChild(body);
    var p = el('div', 'big tapword'); p.setAttribute('role', 'button'); p.tabIndex = 0; p.setAttribute('aria-label', 'Verse. Press to hide more words.'); p.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.click(); } }; body.appendChild(p);
    body.appendChild(el('div', 'by', esc(ref) + ' <i>· Berean Standard Bible</i>'));
    var memo = el('div', 'memo', 'Tap the verse to hide words — then say it back to Him.'); body.appendChild(memo);
    function paint() {
      var hide = {}; order.slice(0, Math.ceil(words.length * fr[lvl])).forEach(function (i) { hide[i] = 1; });
      p.innerHTML = words.map(function (w, i) { return hide[i] ? '<span class="hid">' + esc(w) + '</span>' : esc(w); }).join(' ');
    }
    paint(); p.onclick = function () { lvl = (lvl + 1) % fr.length; paint(); };
    card._say = ref + '. ' + text;
    return { key: 'scripture:' + ref, title: ref, body: text, by: 'Berean Standard Bible' };
  };

  BUILD.wisdom = function (card) {
    var pool = {}, ids = [];
    T.long.forEach(function (x, i) { pool['l' + i] = { k: 'long', x: x }; });
    C.QUOTES.forEach(function (x, i) { pool['q' + i] = { k: 'quote', x: x }; });
    C.THREADS.forEach(function (x, i) { pool['t' + i] = { k: 'thread', x: x }; });
    S.mine.forEach(function (x) { pool[x.id] = { k: 'mine', x: x }; });
    ids = Object.keys(pool); var id = pickId('wisdom', ids), it = pool[id], x = it.x;
    card.classList.add('plain');
    var cls = it.k === 'long' ? 'long' : 'big';
    card.appendChild(el('div', '', '<div class="' + cls + '">' + (it.k === 'quote' ? '“' + esc(x.t) + '”' : esc(x.t)) + '</div><div class="by">' + esc(x.a) + (x.w ? ' <i>· ' + esc(x.w) + '</i>' : '') + (it.k === 'thread' ? ' <i>· in his spirit, not a quote</i>' : '') + '</div>'));
    card._say = x.t + (x.a ? ' — ' + x.a : '');
    return { key: 'wisdom:' + id, title: x.a + (x.w ? ' · ' + x.w : ''), body: x.t, by: '' };
  };

  BUILD.science = function (card) {
    var i = pickId('science', C.SCIENCE.map(function (_, j) { return j; })), x = C.SCIENCE[i]; card.classList.add('plain');
    card.appendChild(el('div', '', '<div class="head">' + esc(x.h) + '</div><div class="mid">' + esc(x.t) + '</div>' + (x.ref ? verseLine(x.ref) : '')));
    card._say = x.h + '. ' + x.t;
    return { key: 'science:' + i, title: x.h, body: x.t, by: 'Discovery' };
  };
  BUILD.philosophy = function (card) {
    var i = pickId('philosophy', C.PHILOSOPHY.map(function (_, j) { return j; })), x = C.PHILOSOPHY[i]; card.classList.add('plain');
    card.appendChild(el('div', '', '<div class="head">' + esc(x.h) + '</div><div class="mid">' + esc(x.t) + '</div><div class="turn">' + esc(x.turn) + '</div>' + (x.ref ? verseLine(x.ref) : '')));
    card._say = x.h + '. ' + x.t + ' ' + x.turn;
    return { key: 'philosophy:' + i, title: x.h, body: x.t + ' ' + x.turn, by: 'Philosophy' };
  };
  BUILD.relationship = function (card) {
    var i = pickId('relationship', C.RELATIONSHIP.map(function (_, j) { return j; })), x = C.RELATIONSHIP[i]; card.classList.add('plain');
    card.appendChild(el('div', '', '<div class="head">' + esc(x.h) + '</div><div class="mid">' + esc(x.t) + '</div><div class="turn"><b>Try tonight:</b> ' + esc(x.tryit) + '</div><div class="small" style="margin-top:.9rem">Inspired by research from the Gottman Institute, in my own words.</div>'));
    card._say = x.h + '. ' + x.t + ' Try tonight: ' + x.tryit;
    return { key: 'relationship:' + i, title: x.h, body: x.t + ' Try: ' + x.tryit, by: 'Relationship' };
  };

  function revealCard(card, cat, list, label) {
    var i = pickId(cat, list.map(function (_, j) { return j; })), x = list[i]; card.classList.add('plain');
    var d = el('div', 'gamecard', '<div class="big" style="text-align:center">' + esc(x.q) + '</div>'), b = el('button', 'reveal', label); b.type = 'button';
    b.onclick = function () { b.replaceWith(el('div', 'answer', esc(x.a))); };
    d.appendChild(b); card.appendChild(d);
    return { key: cat + ':' + i, title: x.q, body: x.a, by: label === 'Tap for the answer' ? 'Riddle' : 'Dad joke' };
  }
  BUILD.jokes = function (card) { return revealCard(card, 'jokes', C.JOKES, 'Punchline'); };
  BUILD.riddles = function (card) { return revealCard(card, 'riddles', C.RIDDLES, 'Tap for the answer'); };

  function placeCard(card, pl, journey) {
    card.classList.add('place');
    var bg = el('div', 'photo'); card.appendChild(bg); bg.innerHTML = A.scene(pl.id, pl.art);
    if (pl.img && S.photos) { var im = new Image(); im.alt = ''; im.loading = 'lazy'; im.className = 'fadein'; im.onload = function () { im.classList.add('on'); }; im.onerror = function () { im.remove(); }; im.src = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(pl.img.f) + '?width=800'; bg.appendChild(im); }
    card.appendChild(el('div', 'shade'));
    var h = '<div class="head" style="color:#fff">' + esc(pl.name) + '</div><div class="small" style="margin:-.4rem 0 .6rem">' + esc(pl.where) + '</div><div class="mid">' + esc(pl.t) + '</div>';
    if (journey) h += '<div class="turn"><b>Read:</b> ' + esc(pl.refs.join(' · ')) + '</div>' + (pl.text ? '<div class="vline">' + esc(pl.text) + ' <span style="white-space:nowrap">— ' + esc(pl.read) + '</span></div>' : '');
    card.appendChild(el('div', '', h));
    if (pl.img && S.photos) card.appendChild(el('div', 'credit', 'Photo: ' + esc(pl.img.by) + ' · ' + esc(pl.img.lic) + ' · Wikimedia Commons'));
    card._say = pl.name + '. ' + pl.t + (journey && pl.text ? ' ' + pl.read + '. ' + pl.text : '');
    return { key: (journey ? 'journeys:' : 'places:') + pl.id, title: pl.name, body: pl.t, by: pl.where };
  }
  BUILD.places = function (card) { var id = pickId('places', PL.world.map(function (p) { return p.id; })); return placeCard(card, PL.world.filter(function (p) { return p.id === id; })[0], false); };
  BUILD.journeys = function (card) { var id = pickId('journeys', PL.bible.map(function (p) { return p.id; })); return placeCard(card, PL.bible.filter(function (p) { return p.id === id; })[0], true); };

  BUILD.games = function (card) {
    var id = pickId('games', G.list.map(function (g) { return g.id; })), g = G.list.filter(function (x) { return x.id === id; })[0]; card.classList.add('plain');
    var d = el('div', 'gamecard', '<div class="head">' + esc(g.title) + '</div><div class="mid">' + esc(g.blurb) + '</div>'), b = el('button', 'btn primary', 'Play'); b.type = 'button'; b.style.marginTop = '1.6rem'; b.style.width = '70%';
    b.onclick = function () { openGame(g); }; d.appendChild(b); card.appendChild(d); return null;
  };
  function openGame(g) {
    if (V) { V.stop(); resetListen(); }
    var ov = el('div', 'overlay', '<div class="bar"><button class="back" data-x>‹ Back to the scroll</button><span class="small">' + esc(g.title) + ' · <span id="gameLeft"></span></span></div><div class="stagebox"></div>'); $('layer').appendChild(ov);
    var box = ov.querySelector('.stagebox'), h = g.start(box); gameH = h;
    ov.querySelector('[data-x]').onclick = function () { h.stop(); gameH = null; ov.remove(); };
  }

  // ---------- mental math ----------
  BUILD.math = function (card) {
    card.classList.add('plain'); var body = el('div'); card.appendChild(body);
    var n = 3, done, idx, problem, typed, t0, last = null, results, locked;
    function begin() { idx = 0; results = []; done = false; next(); }
    function next() {
      var skill = E.nextSkill(S.math, rnd, last); last = skill; problem = E.nextProblem(S.math, skill, rnd); typed = ''; t0 = Date.now(); locked = false; draw();
    }
    function dots() { var h = ''; for (var i = 0; i < n; i++) h += '<i class="' + (results[i] === true ? 'ok' : results[i] === false ? 'no' : i === idx ? 'on' : '') + '"></i>'; return '<div class="dots">' + h + '</div>'; }
    function draw(state) {
      if (done) {
        var ok = results.filter(Boolean).length;
        body.innerHTML = dots() + '<div class="mathq">' + ok + ' of ' + n + '</div><div class="mathsub">' + (ok === n ? 'Sharp.' : ok ? 'Good. Keep going.' : 'Try again.') + ' Your levels adjusted.</div>';
        var again = el('button', 'reveal', 'Another three'); again.type = 'button'; again.onclick = begin; body.appendChild(again);
        return;
      }
      var s = S.math[problem.skill];
      body.innerHTML = dots() + '<div class="mathsub">' + esc(E.LABEL[problem.skill]) + ' · level ' + Math.floor(s.lvl) + '</div><div class="mathq">' + esc(problem.q) + ' = ?</div><div class="ans" id="ans"></div>';
      var a = body.querySelector('.ans');
      if (state) { if (state === 'no') { a.innerHTML = '<span style="display:block;font-size:.95rem;color:var(--ink-muted);letter-spacing:0">you said ' + esc(typed) + '</span>' + problem.a; a.className = 'ans ok'; } else { a.textContent = problem.a; a.className = 'ans ok'; } if (state === 'no') { body.appendChild(el('div', 'tip', esc(problem.tip))); var nx = el('button', 'reveal', 'Next'); nx.type = 'button'; nx.onclick = advance; body.appendChild(nx); } return; }
      if (S.mathInput === 'choices') {
        var opts = shuffle([problem.a].concat(E.distractors(problem.a, rnd))), pad = el('div', 'pad');
        opts.forEach(function (o) { var b = el('button', '', String(o)); b.type = 'button'; b.onclick = function () { if (locked) return; typed = String(o); check(); }; pad.appendChild(b); });
        pad.style.gridTemplateColumns = '1fr 1fr'; body.appendChild(pad); return;
      }
      a.textContent = typed;
      var pad2 = el('div', 'pad');
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', ''].forEach(function (k) {
        var b = el('button', '', k); b.type = 'button'; if (!k) { b.style.visibility = 'hidden'; } else b.onclick = function () {
          if (locked) return; if (k === '⌫') typed = typed.slice(0, -1); else if (typed.length < 6) typed += k;
          a.textContent = typed; if (k !== '⌫' && typed.length >= String(problem.a).length) check();
        }; pad2.appendChild(b);
      });
      body.appendChild(pad2);
    }
    function check() {
      locked = true; var ok = Number(typed) === problem.a, secs = (Date.now() - t0) / 1000;
      E.grade(S.math, problem.skill, ok, secs); save(); results[idx] = ok; draw(ok ? 'ok' : 'no');
      if (ok) setTimeout(advance, 650);
    }
    function advance() { idx++; if (idx >= n) { done = true; draw(); } else next(); }
    begin(); card._show = function () { t0 = Date.now(); };
    return null;
  };

  // ---------- What I Want ----------
  BUILD.want = function (card) {
    var id = pickId('want', C.WANT.map(function (w) { return w.id; })), w = C.WANT.filter(function (x) { return x.id === id; })[0];
    card.classList.add('plain', 'wantcard'); var body = el('div'); card.appendChild(body); var chose = null;
    function head() { return '<span class="theme">' + esc(C.THEMES[w.theme]) + '</span><div class="head">' + esc(w.title) + '</div>'; }
    function step0() {
      body.innerHTML = head() + '<div class="mid pull">' + esc(w.pull) + '</div>';
      var b = el('button', 'hold', 'Hold to feel it'); b.type = 'button';
      b.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46"></circle></svg>'); body.appendChild(b);
      var c = b.querySelector('circle'), t0 = 0, raf = 0, ok = false; c.style.strokeDasharray = 289; c.style.strokeDashoffset = 289;
      function frame() { var p = Math.min(1, (Date.now() - t0) / 3000); c.style.strokeDashoffset = 289 * (1 - p); if (p >= 1) { ok = true; card.classList.remove('holding'); step1(); } else raf = requestAnimationFrame(frame); }
      function down(e) { e.preventDefault(); if (ok) return; t0 = Date.now(); card.classList.add('holding'); raf = requestAnimationFrame(frame); }
      function up() { if (ok) return; cancelAnimationFrame(raf); c.style.strokeDashoffset = 289; card.classList.remove('holding'); }
      b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
    }
    function step1() {
      body.innerHTML = head() + '<div class="small" style="margin-bottom:.4rem">' + esc(w.pull) + '</div><div class="label" style="margin:.8rem 0 0">What now?</div>';
      var a = el('button', 'choice way', '<b>Take it</b>Go where the pull says.'), b = el('button', 'choice vine', '<b>Turn to Jesus</b>Stay with the Vine, and see what is true.');
      var s = el('button', 'choice', '<b>Stay with it a minute</b>Do nothing yet. Just be honest with Him.'); a.type = b.type = s.type = 'button'; a.onclick = function () { chose = 'way'; step2(); }; b.onclick = function () { chose = 'vine'; step2(); }; s.onclick = stay; body.appendChild(a); body.appendChild(s); body.appendChild(b);
    }
    function step2() {
      var h = head();
      if (chose === 'way') h += '<div class="road w"><b>Where that road runs</b>' + esc(w.world) + '</div><div class="road c"><b>The other door is still open</b>' + esc(w.christ) + '</div>';
      else h += '<div class="road c"><b>The way of Christ</b>' + esc(w.christ) + '</div><div class="road w"><b>Where the pull would have led</b>' + esc(w.world) + '</div>';
      h += verseLine(w.verse); body.innerHTML = h;
      var nx = el('button', 'reveal', 'How do I hold it?'); nx.type = 'button'; nx.onclick = step3; body.appendChild(nx);
    }
    function stay() {
      body.innerHTML = head() + '<div class="mid" style="margin-top:.4rem">You don\'t have to fix it or choose yet. Say it to Him as it is.</div>';
      var p = el('button', 'pray', esc(w.pray)); p.type = 'button'; p.style.marginTop = '1.6rem'; p.onclick = function () { p.textContent = 'Offered.'; p.classList.add('done'); }; body.appendChild(p);
    }
    function step3() {
      body.innerHTML = head() + '<div class="road c"><b>Held open-handed</b>' + esc(w.held) + '</div>';
      var p = el('button', 'pray', esc(w.pray)); p.type = 'button'; p.onclick = function () { p.textContent = 'Offered.'; p.classList.add('done'); }; body.appendChild(p);
    }
    step0();
    return { key: 'want:' + w.id, title: w.title, body: w.held + ' — ' + w.pray, by: 'What I Want' };
  };

  // ---------- landing ----------
  var breathTimers = [];
  function clearBreath() { breathTimers.forEach(clearTimeout); breathTimers = []; }
  function land() {
    if (landing || (!sess && !$('landScreen').hidden)) return;
    landing = true; $('feedScreen').classList.add('fadeout');
    setTimeout(doLand, 1100);
  }
  function doLand() {
    if (V) V.stop(); landing = false; $('feedScreen').classList.remove('fadeout'); if (gameH) { gameH.stop(); gameH = null; }
    clearInterval(tickT); tickT = 0; if (banner) { banner.remove(); banner = null; }
    var s = sess; sess = null; try { localStorage.removeItem(SKEY); } catch (e) {}
    $('layer').innerHTML = ''; if (observer) observer.disconnect(); $('feed').innerHTML = '';
    if (s) { S.log.push({ d: today(), t: Date.now(), mins: s.mins, landed: true }); if (S.log.length > 80) S.log.splice(0, S.log.length - 80); save(); }
    var mood = C.MOODS.filter(function (m) { return s && m.id === s.mood; })[0];
    $('landLine').textContent = mood ? mood.land : 'Time to put it down. He is here.';
    $('landA').hidden = false; $('landB').hidden = true; $('skipBreath').hidden = true; show('landScreen'); landKept = s ? s.keptNow : [];
    var cyc = 6, i = 0, ring = $('breathe'), word = $('bword'), cnt = $('bcount'); clearBreath();
    function inhale() { if (i >= cyc) return landB(); if (i >= 1) $('skipBreath').hidden = false; ring.className = 'breathe in'; word.textContent = C.BREATH.in[i % C.BREATH.in.length]; cnt.textContent = 'Breath ' + (i + 1) + ' of ' + cyc; breathTimers.push(setTimeout(exhale, 4000)); }
    function exhale() { ring.className = 'breathe out'; word.textContent = C.BREATH.out[i % C.BREATH.out.length]; i++; breathTimers.push(setTimeout(inhale, 6000)); }
    ring.className = 'breathe'; breathTimers.push(setTimeout(inhale, 900));
  }
  var landKept = [];
  function landB() {
    clearBreath(); $('landA').hidden = true; $('landB').hidden = false;
    var ref = C.NIGHT_VERSES[Math.floor(rnd() * C.NIGHT_VERSES.length)];
    $('nightH').textContent = 'Come home'; $('nightV').textContent = T.verses[ref] || ''; $('nightRef').textContent = ref + ' · Berean Standard Bible';
    var c = $('carry'); c.innerHTML = '';
    if (landKept.length) { c.appendChild(el('div', 'small', 'Carry into the night')); landKept.slice(-3).forEach(function (k) { c.appendChild(el('div', 'it', esc(k.body.length > 220 ? k.body.slice(0, 220) + '…' : k.body))); }); }
  }
  $('skipBreath').onclick = landB;
  $('landHome').onclick = function () {
    var r = el('div', 'rest', '<div>Goodnight.<div style="margin-top:1.2rem;font-size:.8rem;opacity:.55">tap to close</div></div>');
    r.onclick = function () { r.remove(); $('dim').style.opacity = 0; renderHome(); show('homeScreen'); }; $('layer').appendChild(r);
  };
  $('restHere').onclick = function () {
    var v = $('nightV').textContent, r = el('div', 'rest', '<div>' + esc(v) + '<div style="margin-top:1.2rem;font-size:.8rem;opacity:.55">tap to close</div></div>');
    r.onclick = function () { r.remove(); }; $('layer').appendChild(r);
  };

  // ---------- desktop navigation (no swipe on a computer) ----------
  function step(dir) { var f = $('feed'); if (!f || $('feedScreen').hidden) return; f.scrollBy({ top: dir * f.clientHeight, behavior: 'smooth' }); }
  $('navDown').onclick = function () { step(1); }; $('navUp').onclick = function () { step(-1); };
  document.addEventListener('keydown', function (e) {
    if ($('feedScreen').hidden || $('layer').children.length) return;
    var t = e.target, tag = t && t.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && tag !== 'BUTTON')) { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
  });

  // ---------- boot ----------
  renderHome(); show('homeScreen');
  try {
    var ss = JSON.parse(localStorage.getItem(SKEY) || 'null');
    if (ss && Date.now() < ss.end + 45000 && Date.now() - ss.start < 4 * 3600000) { sess = ss; openFeed(); }
    else if (ss) localStorage.removeItem(SKEY);
  } catch (e) {}
  window.Manna = { S: S, E: E, startSession: startSession, land: land };
})();
