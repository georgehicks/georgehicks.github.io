/* Bloom Scroll — Solitaire (Klondike). Tap a card to send it where it belongs, or drag it. Easy: draw one, hints, undo. Normal: draw one, undo.
   Hard: draw three, no undo. You can always turn the stock over again. */
(function (root) {
  'use strict';
  var K = root.MannaKit, G = root.MannaGames, el = K.el;
  var SUITS = ['♠', '♥', '♦', '♣'], RANKS = [null, 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  function red(c) { return c.s === 1 || c.s === 2; }

  function solitaire(level, host, api) {
    K.css('solitaire', '' +
      '.sc-wrap{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 18%,#1e5440,#0f2d21 62%,#091a13);box-shadow:inset 0 0 70px rgba(0,0,0,.55)}' +
      '.sc-wrap::before{content:"";position:absolute;inset:0;background:repeating-radial-gradient(circle at 20% 30%,rgba(255,255,255,.018) 0 1px,transparent 1px 3px);pointer-events:none}' +
      '.sc-layer{position:absolute;left:0;right:0;top:0;bottom:62px;touch-action:none}' +
      '.sc-slot{position:absolute;border:1.5px solid rgba(255,255,255,.12);background:rgba(0,0,0,.16);box-shadow:inset 0 2px 6px rgba(0,0,0,.35);border-radius:8px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.3);font-size:1.3rem}' +
      '.sc-card{position:absolute;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,.55),0 2px 6px rgba(0,0,0,.25);transition:left .18s ease,top .18s ease;font-family:var(--sans);touch-action:none;overflow:hidden}' +
      '.sc-card.up{background:linear-gradient(160deg,#fffef9,#f1e9d4);color:#1c1c26;border:1px solid rgba(60,40,10,.18)}.sc-card.up.red{color:#c4263f}' +
      '.sc-card.dn{background:radial-gradient(circle at 50% 50%,rgba(242,200,121,.5) 0 5%,transparent 6%),repeating-linear-gradient(45deg,#33479a 0 4px,#26387f 4px 8px),#26387f;border:3px solid #f1eadb;box-shadow:inset 0 0 0 2px #1b2a66,0 1px 2px rgba(0,0,0,.55),0 2px 6px rgba(0,0,0,.25)}' +
      '.sc-card .r{position:absolute;left:6%;top:1%;font-weight:700;line-height:1.1}.sc-card .s{position:absolute;right:7%;top:2%;line-height:1.1;opacity:.9}.sc-card .c{position:absolute;left:0;right:0;bottom:5%;text-align:center;line-height:1}' +
      '.sc-card .fr{position:absolute;left:14%;right:14%;top:30%;bottom:8%;border:1.5px solid currentColor;border-radius:5px;opacity:.45;background:repeating-linear-gradient(135deg,transparent 0 5px,currentColor 5px 6px);background-blend-mode:soft-light}' +
      '.sc-card.court .c{bottom:12%;z-index:1;text-shadow:0 0 6px #fffdf4,0 0 6px #fffdf4}.sc-card .cl{position:absolute;left:0;right:0;top:36%;text-align:center;font-family:var(--serif);font-weight:700;z-index:1;line-height:1;text-shadow:0 0 6px #fffdf4,0 0 6px #fffdf4}' +
      '.sc-card.drag{transition:none;z-index:900!important;box-shadow:0 10px 22px rgba(0,0,0,.6)}.sc-card.hint{box-shadow:0 0 0 3px var(--gold),0 0 18px var(--gold)}' +
      '.sc-card.wig{animation:scwig .25s}@keyframes scwig{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}');
    var draw3 = level === 'hard', canUndo = level !== 'hard', canHint = level === 'easy';
    var wrap = el('div', 'sc-wrap'), layer = el('div', 'sc-layer'), bar = el('div', 'kit-bar'); bar.style.cssText = 'position:absolute;left:0;right:0;bottom:0;'; host.appendChild(wrap); wrap.appendChild(layer); wrap.appendChild(bar);
    var hr = host.getBoundingClientRect(), W = hr.width, H = hr.height - 62, gap = 4, side = 5, cw = Math.floor((W - side * 2 - gap * 6) / 7), ch = Math.floor(cw * 1.4), topY = 6, tabY = topY + ch + 12;
    var st, byId = [], els = [], hist, moves, over, wins = 0, alive = true, slots = [], hintId = -1, autoT = 0;
    var fs = cw * 0.3;

    function newGame() {
      clearInterval(autoT); layer.innerHTML = ''; els = []; byId = []; slots = []; hist = []; moves = 0; over = false; hintId = -1;
      var deck = []; for (var s = 0; s < 4; s++) for (var r = 1; r <= 13; r++) deck.push({ id: s * 13 + r - 1, s: s, r: r, up: false }); K.shuffle(deck); deck.forEach(function (c) { byId[c.id] = c; });
      st = { stock: [], waste: [], found: [[], [], [], []], tab: [[], [], [], [], [], [], []] };
      for (var col = 0; col < 7; col++) for (var k = 0; k <= col; k++) { var c = deck.pop(); c.up = k === col; st.tab[col].push(c); }
      st.stock = deck;
      // slots
      var i; for (i = 0; i < 4; i++) addSlot(side + (3 + i) * (cw + gap), topY, '');
      addSlot(side, topY, '↻'); for (i = 0; i < 7; i++) addSlot(side + i * (cw + gap), tabY, '');
      for (i = 0; i < 52; i++) { var c2 = byId[i], d = el('div', 'sc-card dn'); d.style.width = cw + 'px'; d.style.height = ch + 'px'; d.style.fontSize = fs + 'px'; d.dataset.id = i; layer.appendChild(d); els[i] = d; }
      layout(true); buttons(); info();
    }
    function addSlot(x, y, t) { var s = el('div', 'sc-slot', t); s.style.cssText += 'left:' + x + 'px;top:' + y + 'px;width:' + cw + 'px;height:' + ch + 'px'; layer.appendChild(s); slots.push(s); if (t) s.addEventListener('click', function () { drawStock(); }); }
    function face(i) {
      var c = byId[i], d = els[i]; d.className = 'sc-card ' + (c.up ? 'up' + (red(c) ? ' red' : '') + (c.r > 10 ? ' court' : '') : 'dn') + (hintId === i ? ' hint' : '');
      if (c.up) { if (!d.firstChild) d.innerHTML = '<span class="r">' + RANKS[c.r] + '</span><span class="s">' + SUITS[c.s] + '</span>' + (c.r > 10 ? '<span class="fr"></span><span class="cl" style="font-size:' + (cw * 0.5) + 'px">' + RANKS[c.r] + '</span>' : '') + '<span class="c" style="font-size:' + (cw * (c.r > 10 ? 0.42 : 0.55)) + 'px">' + SUITS[c.s] + '</span>'; } else d.innerHTML = '';
    }
    function place(c, x, y, z) { var d = els[c.id]; d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.zIndex = z; face(c.id); }
    function layout(instant) {
      var z = 1, i, maxExtra = 0, offU, offD;
      st.tab.forEach(function (p) { var e = 0; p.forEach(function (c, k) { if (k < p.length - 1) e += c.up ? 1 : 0.46; }); if (e > maxExtra) maxExtra = e; });
      var room = H - tabY - ch - 4; offU = Math.min(ch * 0.3, maxExtra ? room / maxExtra : ch * 0.3); offD = offU * 0.46;
      st.stock.forEach(function (c, k) { place(c, side, topY, z++); }); st.stock.forEach(function (c) { c.up = false; });
      var wl = st.waste.length; st.waste.forEach(function (c, k) { var fan = draw3 ? Math.max(0, k - (wl - 3)) : 0; place(c, side + (cw + gap) + fan * cw * 0.24, topY, z++); });
      st.found.forEach(function (p, f) { p.forEach(function (c) { place(c, side + (3 + f) * (cw + gap), topY, z++); }); });
      st.tab.forEach(function (p, col) { var y = tabY; p.forEach(function (c) { place(c, side + col * (cw + gap), y, z++); y += c.up ? offU : offD; }); });
      slots[4].textContent = st.stock.length ? '' : (st.waste.length ? '↻' : '');
    }
    function info() { api.status('Moves ' + moves + (wins ? ' · Won ' + wins : '')); }
    function buttons() {
      bar.innerHTML = '';
      if (canUndo) { var ub = K.btn('', 'Undo', undo); ub.disabled = !hist.length || over; bar.appendChild(ub); }
      if (canHint) { var hb = K.btn('', 'Hint', hint); hb.disabled = over; bar.appendChild(hb); }
      if (!over && !st.stock.length && !st.waste.length && st.tab.every(function (p) { return p.every(function (c) { return c.up; }); })) bar.appendChild(K.btn('on', 'Finish for me', autoFinish));
    }
    function snap() { var f = function (p) { return p.map(function (c) { return [c.id, c.up ? 1 : 0]; }); }; return JSON.stringify({ stock: f(st.stock), waste: f(st.waste), found: st.found.map(f), tab: st.tab.map(f), moves: moves }); }
    function restore(js) { var o = JSON.parse(js), g = function (p) { return p.map(function (x) { var c = byId[x[0]]; c.up = !!x[1]; return c; }); }; st = { stock: g(o.stock), waste: g(o.waste), found: o.found.map(g), tab: o.tab.map(g) }; moves = o.moves; }
    function push() { hist.push(snap()); if (hist.length > 200) hist.shift(); moves++; hintId = -1; }
    function undo() { if (!hist.length || over) return; restore(hist.pop()); hintId = -1; layout(); buttons(); info(); }
    function drawStock() {
      if (over) return; push();
      if (st.stock.length) { var n = draw3 ? 3 : 1; for (var i = 0; i < n && st.stock.length; i++) { var c = st.stock.pop(); c.up = true; st.waste.push(c); } }
      else if (st.waste.length) { while (st.waste.length) { var w = st.waste.pop(); w.up = false; st.stock.push(w); } }
      else { hist.pop(); moves--; return; }
      layout(); buttons(); info();
    }
    function locate(c) {
      var i; if (st.waste.indexOf(c) >= 0) return { k: 'waste', pos: st.waste.indexOf(c) };
      for (i = 0; i < 4; i++) if (st.found[i].indexOf(c) >= 0) return { k: 'found', i: i, pos: st.found[i].indexOf(c) };
      for (i = 0; i < 7; i++) if (st.tab[i].indexOf(c) >= 0) return { k: 'tab', i: i, pos: st.tab[i].indexOf(c) };
      return { k: 'stock' };
    }
    function group(c, loc) { if (loc.k === 'tab') return st.tab[loc.i].slice(loc.pos); return [c]; }
    function canTab(c, col) { var p = st.tab[col]; if (!p.length) return c.r === 13; var t = p[p.length - 1]; return t.up && red(t) !== red(c) && t.r === c.r + 1; }
    function canFound(c, f) { var p = st.found[f]; if (!p.length) return c.r === 1; var t = p[p.length - 1]; return t.s === c.s && c.r === t.r + 1; }
    function remove(c, loc) {
      if (loc.k === 'waste') st.waste.pop(); else if (loc.k === 'found') st.found[loc.i].pop(); else if (loc.k === 'tab') { var p = st.tab[loc.i]; p.splice(loc.pos); if (p.length && !p[p.length - 1].up) p[p.length - 1].up = true; }
    }
    function moveTo(c, loc, dest) {
      var g = group(c, loc); push(); remove(c, loc);
      if (dest.k === 'found') st.found[dest.i].push(c); else g.forEach(function (x) { st.tab[dest.i].push(x); });
      layout(); buttons(); info(); checkWin();
    }
    function autoDest(c, loc) {
      var g = group(c, loc), i;
      if (g.length === 1) for (i = 0; i < 4; i++) if (canFound(c, i) && !(loc.k === 'found' && loc.i === i)) return { k: 'found', i: i };
      for (i = 0; i < 7; i++) if (!(loc.k === 'tab' && loc.i === i) && st.tab[i].length && canTab(c, i)) return { k: 'tab', i: i };
      for (i = 0; i < 7; i++) if (!(loc.k === 'tab' && loc.i === i) && !st.tab[i].length && canTab(c, i) && !(loc.k === 'tab' && loc.pos === 0)) return { k: 'tab', i: i };
      return null;
    }
    function playable(c, loc) {
      if (!c.up) return false; if (loc.k === 'waste') return loc.pos === st.waste.length - 1; if (loc.k === 'found') return loc.pos === st.found[loc.i].length - 1; return loc.k === 'tab';
    }
    // ---- pointer: tap sends the card where it fits; dragging drops it on a pile ----
    var drag = null;
    layer.addEventListener('pointerdown', function (e) {
      if (over) return; var t = e.target.closest ? e.target.closest('.sc-card') : null; if (!t) return;
      var c = byId[+t.dataset.id], loc = locate(c); e.preventDefault();
      if (loc.k === 'stock') { drag = { stock: true, x: e.clientX, y: e.clientY }; return; }
      if (!playable(c, loc)) return;
      var g = group(c, loc); drag = { c: c, loc: loc, g: g, x: e.clientX, y: e.clientY, moved: false, base: g.map(function (x) { var d = els[x.id]; return [parseFloat(d.style.left), parseFloat(d.style.top)]; }) };
      try { layer.setPointerCapture(e.pointerId); } catch (x) {}
    });
    layer.addEventListener('pointermove', function (e) {
      if (!drag || drag.stock) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 8) { drag.moved = true; drag.g.forEach(function (x) { els[x.id].classList.add('drag'); }); }
      if (drag.moved) drag.g.forEach(function (x, k) { var d = els[x.id]; d.style.left = (drag.base[k][0] + dx) + 'px'; d.style.top = (drag.base[k][1] + dy) + 'px'; });
    });
    function up(e) {
      if (!drag) return; var d0 = drag; drag = null; if (d0.stock) { if (Math.hypot(e.clientX - d0.x, e.clientY - d0.y) < 10) drawStock(); return; }
      d0.g.forEach(function (x) { els[x.id].classList.remove('drag'); });
      if (!d0.moved) { var dest = autoDest(d0.c, d0.loc); if (dest) moveTo(d0.c, d0.loc, dest); else { els[d0.c.id].classList.add('wig'); setTimeout(function () { els[d0.c.id].classList.remove('wig'); }, 280); layout(); } return; }
      var lr = layer.getBoundingClientRect(), cxp = e.clientX - lr.left, cyp = e.clientY - lr.top, best = null, bd = 1e9, i;
      var lx = d0.base[0][0] + (e.clientX - d0.x) + cw / 2, ly = d0.base[0][1] + (e.clientY - d0.y) + ch / 2;
      for (i = 0; i < 4; i++) if (d0.g.length === 1 && canFound(d0.c, i)) { var fx = side + (3 + i) * (cw + gap) + cw / 2, fy = topY + ch / 2, dd = Math.hypot(lx - fx, ly - fy); if (dd < cw * 1.1 && dd < bd) { bd = dd; best = { k: 'found', i: i }; } }
      for (i = 0; i < 7; i++) if (!(d0.loc.k === 'tab' && d0.loc.i === i) && canTab(d0.c, i)) { var tx = side + i * (cw + gap) + cw / 2, dd2 = Math.abs(lx - tx); if (dd2 < cw * 0.75 && ly > tabY - ch * 0.3 && dd2 < bd) { bd = dd2; best = { k: 'tab', i: i }; } }
      if (best) moveTo(d0.c, d0.loc, best); else layout();
    }
    layer.addEventListener('pointerup', up); layer.addEventListener('pointercancel', function () { if (drag && !drag.stock) { drag.g.forEach(function (x) { els[x.id].classList.remove('drag'); }); } drag = null; layout(); });
    // ---- hint / finish / win ----
    function hint() {
      if (over) return; var i, c, loc, dest, found = null;
      var cand = []; if (st.waste.length) cand.push(st.waste[st.waste.length - 1]); st.tab.forEach(function (p) { p.forEach(function (x) { if (x.up) cand.push(x); }); });
      for (i = 0; i < cand.length && !found; i++) { c = cand[i]; loc = locate(c); if (!playable(c, loc)) continue; dest = autoDest(c, loc); if (dest && dest.k === 'found') found = { c: c, msg: 'Send it up to the foundation' }; }
      for (i = 0; i < cand.length && !found; i++) { c = cand[i]; loc = locate(c); if (!playable(c, loc)) continue; dest = autoDest(c, loc); if (dest && dest.k === 'tab' && (loc.k === 'waste' || (loc.k === 'tab' && loc.pos > 0 && !st.tab[loc.i][loc.pos - 1].up))) found = { c: c, msg: loc.k === 'waste' ? 'This one fits on the tableau' : 'Moving this uncovers a card' }; }
      for (i = 0; i < cand.length && !found; i++) { c = cand[i]; loc = locate(c); if (!playable(c, loc)) continue; dest = autoDest(c, loc); if (dest && dest.k === 'tab' && !(loc.k === 'tab' && loc.pos === 0)) found = { c: c, msg: 'This one can move' }; }
      if (found) { hintId = found.c.id; face(found.c.id); api.say(found.msg, 1800); setTimeout(function () { hintId = -1; if (alive && els[found.c.id]) face(found.c.id); }, 2200); }
      else if (st.stock.length || st.waste.length) api.say('Turn over the stock', 1500); else api.say('No moves left — try Undo or New game', 2200);
    }
    function total() { return st.found.reduce(function (a, p) { return a + p.length; }, 0); }
    function checkWin() { if (total() === 52 && !over) { over = true; wins++; api.setBest(wins); api.win({ cheer: 'solitaire', title: 'Every card home', sub: 'Beautifully done.', look: true, delay: 1.6 }); buttons(); info(); } }
    function autoFinish() {
      if (over) return; clearInterval(autoT);
      autoT = setInterval(function () {
        if (!alive) return clearInterval(autoT); var moved = false;
        for (var col = 0; col < 7 && !moved; col++) { var p = st.tab[col]; if (!p.length) continue; var c = p[p.length - 1]; for (var f = 0; f < 4; f++) if (canFound(c, f)) { moveTo(c, { k: 'tab', i: col, pos: p.length - 1 }, { k: 'found', i: f }); moved = true; break; } }
        if (!moved) clearInterval(autoT);
      }, 120);
    }
    newGame();
    return { stop: function () { alive = false; clearInterval(autoT); }, restart: newGame, peek: function () { return { st: st, byId: byId, hist: hist, over: over }; } };
  }

  G.list.push(G.reg({ id: 'solitaire', title: 'Solitaire', blurb: 'Build four piles from Ace to King. Tap a card to send it where it fits, or drag it.', make: solitaire,
    levels: { easy: 'Draw one card, hints and undo.', normal: 'Draw one card, undo.', hard: 'Draw three cards, no undo.' }, bestLabel: function (b) { return b + ' won'; } }));
})(typeof window !== 'undefined' ? window : globalThis);
