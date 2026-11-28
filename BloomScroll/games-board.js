/* Bloom Scroll — Checkers, Minesweeper, Sudoku. Touch first: big targets, no keyboard, nothing that needs a right-click. */
(function (root) {
  'use strict';
  var K = root.MannaKit, G = root.MannaGames, el = K.el;

  function fmtT(s) { var m = Math.floor(s / 60), x = s % 60; return m + ':' + (x < 10 ? '0' : '') + x; }

  // =====================================================================================================================
  // Checkers (English draughts, 8×8). You are gold and move up. Captures are required; multiple jumps are one turn; kings move both ways.
  // =====================================================================================================================
  function checkers(level, host, api) {
    K.css('checkers', '' +
      '.ck-wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.6rem;background:radial-gradient(ellipse at 50% 38%,rgba(150,105,60,.22),transparent 68%)}' +
      '.ck-board{display:grid;grid-template-columns:repeat(8,1fr);border-radius:12px;overflow:hidden;border:9px solid #6b4424;box-shadow:0 0 0 2px #2c1a0b,0 16px 34px rgba(0,0,0,.65),inset 0 0 0 2px rgba(255,220,160,.28)}' +
      '.ck-sq{position:relative;border:none;padding:0;background:linear-gradient(135deg,#ecd5a8,#d8b985);display:flex;align-items:center;justify-content:center}' +
      '.ck-sq.d{background:linear-gradient(135deg,#7a5230,#593a1f);box-shadow:inset 0 0 8px rgba(0,0,0,.35)}' +
      '.ck-sq.dst::after{content:"";width:36%;height:36%;border-radius:50%;background:radial-gradient(circle at 35% 30%,#d9ffe6,#8fe0ae);box-shadow:0 0 10px 2px rgba(155,232,181,.7);position:absolute}' +
      '.ck-sq.last{box-shadow:inset 0 0 0 3px rgba(242,200,121,.6),inset 0 0 12px rgba(242,200,121,.35)}.ck-sq.sel{box-shadow:inset 0 0 0 3px var(--sage,#9BE8B5),inset 0 0 14px rgba(155,232,181,.4)}' +
      '.ck-p{position:relative;width:80%;height:80%;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.05em;line-height:1;box-shadow:0 3px 0 rgba(0,0,0,.5),0 6px 9px rgba(0,0,0,.4),inset 0 2px 3px rgba(255,255,255,.45),inset 0 -3px 5px rgba(0,0,0,.25)}' +
      '.ck-p::before{content:"";position:absolute;inset:17%;border-radius:50%;border:2px solid rgba(0,0,0,.2);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}' +
      '.ck-p.h{background:radial-gradient(circle at 34% 28%,#fff3cc 0,#f4cc6e 36%,#c98c2b 100%);color:#5a3d06}.ck-p.a{background:radial-gradient(circle at 34% 28%,#ffb0bd 0,#e0566f 38%,#8b2342 100%);color:#ffe0e5}' +
      '.ck-p.can{animation:ckpulse 1.4s ease-in-out infinite}@keyframes ckpulse{50%{transform:scale(1.08);filter:brightness(1.18)}}');
    var depth = { easy: 1, normal: 4, hard: 9 }[level], rnd = { easy: 0.4, normal: 0.06, hard: 0 }[level], tms = { easy: 100, normal: 250, hard: 750 }[level];
    var wrap = el('div', 'ck-wrap'), boardEl = el('div', 'ck-board'), bar = el('div', 'kit-bar'); host.appendChild(wrap); wrap.appendChild(boardEl); wrap.appendChild(bar);
    var hr = host.getBoundingClientRect(), S = Math.floor(Math.min(hr.width - 40, hr.height - 108) / 8), alive = true;
    boardEl.style.width = boardEl.style.height = (S * 8 + 18) + 'px'; boardEl.style.fontSize = (S * 0.5) + 'px';
    var b, turn, sel, cands, prog, work, last, busy, hist, quiet, over, timer = 0;

    function dirsFor(p) { var fw = p > 0 ? -1 : 1, d = [[fw, -1], [fw, 1]]; if (Math.abs(p) === 2) d.push([-fw, -1], [-fw, 1]); return d; }
    function jump(bd, idx, p, steps, out) {
      var r = Math.floor(idx / 8), c = idx % 8, found = false;
      dirsFor(p).forEach(function (d) {
        var mr = r + d[0], mc = c + d[1], lr = r + 2 * d[0], lc = c + 2 * d[1];
        if (lr < 0 || lr > 7 || lc < 0 || lc > 7) return;
        var m = bd[mr * 8 + mc]; if (!m || (m > 0) === (p > 0) || bd[lr * 8 + lc]) return;
        found = true; var nb = bd.slice(), to = lr * 8 + lc, cap = mr * 8 + mc; nb[idx] = 0; nb[cap] = 0;
        var pro = (p === 1 && lr === 0) || (p === -1 && lr === 7), np = pro ? p * 2 : p; nb[to] = np;
        var ns = steps.concat([{ f: idx, t: to, c: cap }]);
        if (pro) out.push({ steps: ns, board: nb }); else { var n0 = out.length; jump(nb, to, np, ns, out); if (out.length === n0) out.push({ steps: ns, board: nb }); }
      });
      return found;
    }
    function seqs(bd, side) {
      var caps = [], moves = [];
      for (var i = 0; i < 64; i++) {
        var p = bd[i]; if (!p || (p > 0) !== (side > 0)) continue;
        jump(bd, i, p, [], caps);
        var r = Math.floor(i / 8), c = i % 8;
        dirsFor(p).forEach(function (d) { var y = r + d[0], x = c + d[1]; if (y < 0 || y > 7 || x < 0 || x > 7 || bd[y * 8 + x]) return; var nb = bd.slice(), to = y * 8 + x; nb[i] = 0; var pro = (p === 1 && y === 0) || (p === -1 && y === 7); nb[to] = pro ? p * 2 : p; moves.push({ steps: [{ f: i, t: to, c: -1 }], board: nb }); });
      }
      return caps.length ? caps : moves;
    }
    function evalB(bd, side) {
      var s = 0;
      for (var i = 0; i < 64; i++) {
        var p = bd[i]; if (!p) continue; var r = Math.floor(i / 8), c = i % 8, v;
        if (Math.abs(p) === 2) v = 175 + (3.5 - Math.abs(c - 3.5)) * 1.5; else { var adv = p > 0 ? 7 - r : r; v = 100 + adv * 4 + (adv === 0 ? 8 : 0) + (3.5 - Math.abs(c - 3.5)) * 1.2; }
        s += p > 0 ? v : -v;
      }
      return side > 0 ? s : -s;
    }
    var deadline = 0, aborted = false;
    function nega(bd, side, d, al, be) {
      if (Date.now() > deadline) { aborted = true; return 0; }
      var ms = seqs(bd, side); if (!ms.length) return -100000 - d;
      if (d <= 0) return evalB(bd, side);
      var best = -1e9; for (var i = 0; i < ms.length; i++) { var v = -nega(ms[i].board, -side, d - 1, -be, -al); if (aborted) return 0; if (v > best) best = v; if (best > al) al = best; if (al >= be) break; }
      return best;
    }
    function aiMove() {
      var ms = K.shuffle(seqs(b, -1)); if (!ms.length) return null;
      if (Math.random() < rnd) return ms[0];
      var chosen = ms[0], t0 = Date.now(); deadline = t0 + tms * 3;
      for (var d = 1; d <= depth; d++) {
        deadline = t0 + tms; aborted = false; var bestV = -1e9, bm = null;
        for (var i = 0; i < ms.length; i++) { var v = -nega(ms[i].board, 1, d - 1, -1e9, 1e9); if (aborted) break; if (v > bestV) { bestV = v; bm = ms[i]; } }
        if (aborted || !bm) break; chosen = bm; if (bestV > 50000 || Date.now() - t0 > tms) break;
      }
      return chosen;
    }

    function newGame() {
      b = new Array(64).fill(0);
      for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) if ((r + c) % 2) { if (r < 3) b[r * 8 + c] = -1; else if (r > 4) b[r * 8 + c] = 1; }
      turn = 1; sel = null; cands = null; prog = 0; work = null; last = {}; busy = false; hist = []; quiet = 0; over = false; draw(); status();
    }
    function status() { api.status(over ? '' : busy ? 'Thinking…' : (seqs(b, 1)[0] && seqs(b, 1)[0].steps[0].c >= 0 ? 'Your move — you must capture' : 'Your move')); }
    function cur() { return work || b; }
    function draw() {
      boardEl.innerHTML = ''; var show = cur(), mine = (!busy && !over && !cands) ? seqs(b, 1) : [], movable = {}, forced = mine.length && mine[0].steps[0].c >= 0;
      mine.forEach(function (m) { movable[m.steps[0].f] = 1; });
      var dst = {}; if (cands) cands.forEach(function (m) { dst[m.steps[prog].t] = 1; });
      for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) {
        var i = r * 8 + c, sq = el('button', 'ck-sq' + ((r + c) % 2 ? ' d' : '') + (dst[i] ? ' dst' : '') + (last[i] ? ' last' : '') + (sel === i ? ' sel' : '')); sq.type = 'button'; sq.style.width = sq.style.height = S + 'px';
        var p = show[i]; if (p) { var pc = el('div', 'ck-p ' + (p > 0 ? 'h' : 'a') + (p > 0 && movable[i] && (forced || level === 'easy') ? ' can' : ''), Math.abs(p) === 2 ? '♛' : ''); sq.appendChild(pc); }
        (function (ii) { sq.addEventListener('click', function () { tap(ii); }); })(i);
        boardEl.appendChild(sq);
      }
      bar.innerHTML = ''; if (level !== 'hard') { var ub = K.btn('', 'Undo', undo); ub.disabled = !hist.length || busy || !!cands; bar.appendChild(ub); }
    }
    function undo() { if (!hist.length || busy) return; b = hist.pop(); cands = null; sel = null; work = null; last = {}; over = false; draw(); status(); }
    function tap(i) {
      if (busy || over) return;
      if (cands) {
        var ok = cands.filter(function (m) { return m.steps[prog].t === i; });
        if (ok.length) { step(ok); return; }
        if (prog === 0) { cands = null; sel = null; work = null; draw(); if (b[i] > 0) tap(i); }
        return;
      }
      if (b[i] <= 0) return;
      var mine = seqs(b, 1), mc = mine.filter(function (m) { return m.steps[0].f === i; });
      if (!mc.length) { api.say(mine[0] && mine[0].steps[0].c >= 0 ? 'A capture is required' : 'That piece cannot move', 1100); return; }
      sel = i; cands = mc; prog = 0; work = null; draw();
    }
    function step(ok) {
      var s = ok[0].steps[prog]; cands = ok; work = (work || b).slice(); var p = work[s.f]; work[s.f] = 0; if (s.c >= 0) work[s.c] = 0;
      var tr = Math.floor(s.t / 8); if ((p === 1 && tr === 0) || (p === -1 && tr === 7)) p *= 2; work[s.t] = p;
      var done = ok.filter(function (m) { return m.steps.length === prog + 1; });
      if (done.length) { hist.push(b); var m = done[0]; var l = {}; m.steps.forEach(function (x) { l[x.f] = 1; l[x.t] = 1; }); finish(m, l); return; }
      prog++; sel = s.t; draw();
    }
    function finish(m, l) {
      var capped = m.steps[0].c >= 0, wasMan = Math.abs(b[m.steps[0].f]) === 1; b = m.board; last = l; sel = null; cands = null; work = null; prog = 0; quiet = (capped || wasMan) ? 0 : quiet + 1;
      turn = -1; draw();
      if (!seqs(b, -1).length) { over = true; draw(); api.status('You won'); api.setBest((api.best() || 0) + 1); api.win({ cheer: 'checkers', title: 'You won', sub: 'Well played.', look: true, delay: 1.6 }); return; }
      if (quiet >= 40) { over = true; api.status('A quiet draw'); api.say('A quiet draw', 2200); return; }
      busy = true; status();
      timer = setTimeout(function () {
        if (!alive) return; var am = aiMove(); if (!am) { busy = false; over = true; draw(); api.status('You won'); api.setBest((api.best() || 0) + 1); api.win({ cheer: 'checkers', title: 'You won', sub: 'They have no move left.', look: true, delay: 1.6 }); return; }
        var cap = am.steps[0].c >= 0, man = Math.abs(b[am.steps[0].f]) === 1, l2 = {}; am.steps.forEach(function (x) { l2[x.f] = 1; l2[x.t] = 1; });
        b = am.board; last = l2; quiet = (cap || man) ? 0 : quiet + 1; busy = false; turn = 1; draw();
        if (!seqs(b, 1).length) { over = true; api.status('Not this time'); api.say('Not this time — again?', 2600); return; }
        if (quiet >= 40) { over = true; api.say('A quiet draw', 2200); return; }
        status();
      }, 420);
    }
    newGame();
    return { stop: function () { alive = false; clearTimeout(timer); }, restart: function () { clearTimeout(timer); newGame(); } };
  }

  // =====================================================================================================================
  // Minesweeper. Tap to dig; hold to flag (or switch to Flag mode). Tap a number with enough flags around it to open the rest. First dig is always safe.
  // Raised tiles that sink and ripple open, glowing numbers, planted flags, a soft shock-ring when a mine is found. Nothing here stings.
  // =====================================================================================================================
  function mines(level, host, api) {
    var FLAG = '<svg viewBox="0 0 24 24"><ellipse cx="8" cy="20.5" rx="4.5" ry="1.6" fill="rgba(0,0,0,.4)"/><path d="M8 3.5v17" stroke="#e8dcc0" stroke-width="2" stroke-linecap="round"/><path d="M8 4.5l11 4.6L8 13.6z" fill="#F2C879"/><path d="M8 4.5l11 4.6-2.4 1z" fill="#fff3d2" opacity=".5"/></svg>';
    var MINE = '<svg viewBox="0 0 24 24"><g stroke="#8c92b0" stroke-width="1.8" stroke-linecap="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></g><circle cx="12" cy="12" r="6.2" fill="#232842"/><circle cx="10" cy="10" r="2" fill="rgba(255,255,255,.4)"/><path d="M15.5 6.5c1.2-1.8 2.6-2 3.6-1.2" stroke="#d8c9a6" stroke-width="1.3" fill="none" stroke-linecap="round"/><circle cx="19.3" cy="5.2" r="1.5" fill="#ffb347"/></svg>';
    K.css('mines', '' +
      '.ms-wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.6rem;background:radial-gradient(ellipse at 50% -10%,#1f2a5c 0,#0d1024 62%)}' +
      '.ms-hud{display:flex;gap:.6rem;justify-content:center}.ms-pill{display:flex;align-items:center;gap:.4rem;padding:.28rem .85rem;border-radius:999px;background:rgba(10,13,28,.85);border:1px solid rgba(255,255,255,.1);font-size:.95rem;color:var(--ink);font-variant-numeric:tabular-nums;min-width:5.4rem;justify-content:center}.ms-pill svg{width:1.05rem;height:1.05rem}' +
      '.ms-frame{padding:6px;border-radius:16px;background:linear-gradient(145deg,#3d4878,#1a2040);box-shadow:0 12px 32px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.18)}' +
      '.ms-board{display:grid;gap:3px;padding:4px;background:#080b19;border-radius:11px;box-shadow:inset 0 2px 8px rgba(0,0,0,.8)}' +
      '.ms-c{position:relative;border:none;padding:0;border-radius:7px;display:flex;align-items:center;justify-content:center;font-weight:800;font-family:var(--sans);touch-action:manipulation;color:var(--ink);' +
        'background:linear-gradient(150deg,#5a6ea0,#36477a);box-shadow:inset 1.5px 1.5px 0 rgba(255,255,255,.3),inset -2px -3px 0 rgba(0,0,0,.3),0 2px 3px rgba(0,0,0,.55);transition:transform .08s}' +
      '.ms-c.alt{background:linear-gradient(150deg,#5266a0,#303f6f)}.ms-c:active:not(.o){transform:scale(.92)}' +
      '.ms-c.o{background:#0f132a;box-shadow:inset 0 2px 5px rgba(0,0,0,.7),inset 0 -1px 0 rgba(255,255,255,.06);animation:msPop .34s ease-out both;animation-delay:var(--d,0ms)}' +
      '@keyframes msPop{0%{transform:scale(.55);opacity:0;filter:brightness(2.4)}60%{transform:scale(1.1);opacity:1}100%{transform:scale(1);filter:none}}' +
      '.ms-c .nm{text-shadow:0 0 9px currentColor}' +
      '.ms-c svg{width:74%;height:74%;display:block}.ms-c.f svg{animation:msPlant .32s cubic-bezier(.3,1.6,.5,1) both}' +
      '@keyframes msPlant{from{transform:translateY(-70%) scale(.5);opacity:0}to{transform:none;opacity:1}}' +
      '.ms-c.m{background:#26132a;animation:msPop .34s ease-out both;animation-delay:var(--d,0ms)}' +
      '.ms-c.x{background:radial-gradient(circle,#ff9c86 0,#b8405a 55%,#5c1f36 100%)}.ms-c.x::after{content:"";position:absolute;inset:-3px;border-radius:50%;border:2px solid rgba(255,180,150,.85);animation:msBoom .8s ease-out forwards;pointer-events:none}' +
      '@keyframes msBoom{from{transform:scale(.4);opacity:1}to{transform:scale(4.5);opacity:0}}' +
      '.ms-frame.win{animation:msWin 1.3s ease-in-out 3}@keyframes msWin{50%{box-shadow:0 0 46px rgba(242,200,121,.75),0 12px 32px rgba(0,0,0,.55)}}' +
      '.ms-c.n1{color:#8fd3ff}.ms-c.n2{color:#9be8b5}.ms-c.n3{color:#ff8fa3}.ms-c.n4{color:#c9a6ff}.ms-c.n5{color:#f2c879}.ms-c.n6{color:#7be0d6}.ms-c.n7{color:#fff}.ms-c.n8{color:#b9bdd0}');
    var P = { easy: { cols: 8, rows: 8, m: 8, mercy: 1 }, normal: { cols: 9, rows: 12, m: 18, mercy: 0 }, hard: { cols: 10, rows: 15, m: 32, mercy: 0 } }[level];
    var wrap = el('div', 'ms-wrap'), hud = el('div', 'ms-hud'), frame = el('div', 'ms-frame'), boardEl = el('div', 'ms-board'), bar = el('div', 'kit-bar');
    var pf = el('div', 'ms-pill'), pt = el('div', 'ms-pill'); hud.appendChild(pf); hud.appendChild(pt);
    bar.style.width = '100%'; host.appendChild(wrap); wrap.appendChild(hud); frame.appendChild(boardEl); wrap.appendChild(frame); wrap.appendChild(bar);
    var hr = host.getBoundingClientRect(), cs = Math.floor(Math.min((hr.width - 40 - (P.cols - 1) * 3) / P.cols, (hr.height - 170 - (P.rows - 1) * 3) / P.rows)); cs = Math.max(24, Math.min(46, cs));
    boardEl.style.gridTemplateColumns = 'repeat(' + P.cols + ',' + cs + 'px)'; boardEl.style.fontSize = (cs * 0.56) + 'px';
    var cells, started, over, flagMode, mercy, t0, tick = 0, alive = true, opened, cellEl = [], holdT = 0, held = false;
    function nb(i) { var r = Math.floor(i / P.cols), c = i % P.cols, o = []; for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; var y = r + dr, x = c + dc; if (y >= 0 && x >= 0 && y < P.rows && x < P.cols) o.push(y * P.cols + x); } return o; }
    function newGame() {
      clearInterval(tick); cells = []; for (var i = 0; i < P.cols * P.rows; i++) cells.push({ m: false, o: false, f: false, n: 0, s: '' }); started = false; over = false; flagMode = false; mercy = P.mercy; opened = 0; t0 = 0; frame.classList.remove('win'); build(); updateStatus(); drawBar();
    }
    function build() {
      boardEl.innerHTML = ''; cellEl = [];
      cells.forEach(function (c, i) {
        var b = el('button', 'ms-c' + (((Math.floor(i / P.cols)) + i) % 2 ? ' alt' : '')); b.type = 'button'; b.style.width = b.style.height = cs + 'px';
        b.addEventListener('pointerdown', function () { held = false; clearTimeout(holdT); holdT = setTimeout(function () { held = true; if (navigator.vibrate) try { navigator.vibrate(15); } catch (e) {} toggleFlag(i); }, 420); });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, function () { clearTimeout(holdT); }); });
        b.addEventListener('click', function () { if (held) { held = false; return; } flagMode ? toggleFlag(i) : dig(i); });
        b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        boardEl.appendChild(b); cellEl.push(b);
      });
    }
    // d = how far the ripple has travelled (delays the pop so a big opening spreads outward)
    function paint(i, d) {
      var c = cells[i], b = cellEl[i], key = (c.o ? 'o' + c.n + (c.m ? 'm' : '') : c.f ? 'f' : over && c.m ? 'M' : '') + (c.x ? 'x' : ''); if (c.s === key) return; c.s = key;
      b.style.setProperty('--d', (d || 0) + 'ms');
      b.className = 'ms-c' + (((Math.floor(i / P.cols)) + i) % 2 ? ' alt' : '') + (c.o ? ' o' + (c.n && !c.m ? ' n' + c.n : '') : '') + (c.f && !c.o ? ' f' : '') + (c.x ? ' x' : '') + (over && c.m && !c.o && !c.f ? ' m' : '');
      b.innerHTML = c.o ? (c.m ? MINE : c.n ? '<span class="nm">' + c.n + '</span>' : '') : c.f ? FLAG : (over && c.m ? MINE : '');
    }
    function place(first) {
      var ban = {}; ban[first] = 1; if (level !== 'hard') nb(first).forEach(function (j) { ban[j] = 1; });
      var pool = []; for (var i = 0; i < cells.length; i++) if (!ban[i]) pool.push(i); K.shuffle(pool); for (i = 0; i < P.m; i++) cells[pool[i]].m = true;
      cells.forEach(function (c, i) { c.n = nb(i).filter(function (j) { return cells[j].m; }).length; });
    }
    function flags() { return cells.filter(function (c) { return c.f && !c.o; }).length; }
    function updateStatus() {
      pf.innerHTML = FLAG + '<b>' + (P.m - flags()) + '</b>'; pt.innerHTML = '<span>⏱</span><b>' + fmtT(t0 ? Math.floor((Date.now() - t0) / 1000) : 0) + '</b>';
      api.status(mercy ? 'one free mistake' : api.best() ? 'best ' + fmtT(api.best()) : '');
    }
    function drawBar() { bar.innerHTML = ''; bar.appendChild(K.btn(!flagMode ? 'on' : '', '⛏ Dig', function () { flagMode = false; drawBar(); })); bar.appendChild(K.btn(flagMode ? 'on' : '', '⚑ Flag', function () { flagMode = true; drawBar(); })); }
    function toggleFlag(i) { if (over) return; var c = cells[i]; if (c.o) { chord(i); return; } c.f = !c.f; paint(i); updateStatus(); }
    function open(i) {
      var q = [[i, 0]], seen = {}; seen[i] = 1;
      while (q.length) {
        var it = q.shift(), j = it[0], c = cells[j]; if (c.o || c.f) continue; c.o = true; opened++; paint(j, it[1] * 38);
        if (c.n === 0 && !c.m) nb(j).forEach(function (k) { if (!cells[k].o && !seen[k]) { seen[k] = 1; q.push([k, it[1] + 1]); } });
      }
    }
    function chord(i) {
      var c = cells[i]; if (!c.o || !c.n) return; var ns = nb(i), fl = ns.filter(function (k) { return cells[k].f; }).length; if (fl !== c.n) return;
      ns.forEach(function (k) { if (!cells[k].f && !cells[k].o) dig(k, true); });
    }
    function dig(i, fromChord) {
      if (over) return; var c = cells[i];
      if (c.o) { if (!fromChord) chord(i); return; } if (c.f) return;
      if (!started) { started = true; place(i); t0 = Date.now(); tick = setInterval(function () { if (alive && !over) updateStatus(); }, 1000); }
      if (c.m) {
        if (mercy > 0) { mercy--; c.f = true; paint(i); api.say('A free mistake — flagged for you', 1400); updateStatus(); return; }
        lose(i); return;
      }
      open(i); updateStatus(); if (opened === cells.length - P.m) win();
    }
    function lose(i) {
      over = true; clearInterval(tick); cells[i].x = true; var r0 = Math.floor(i / P.cols), c0 = i % P.cols;
      cells.forEach(function (c, j) { paint(j, Math.round(Math.hypot(Math.floor(j / P.cols) - r0, j % P.cols - c0) * 45)); });
      api.say('That one had a mine — again?', 2200);
    }
    function win() {
      over = true; clearInterval(tick); var sec = Math.max(1, Math.floor((Date.now() - t0) / 1000)); cells.forEach(function (c, j) { if (c.m && !c.f) { c.f = true; paint(j); } });
      frame.classList.add('win'); var rec = api.setBest(sec, true); updateStatus(); api.win({ cheer: 'mines', delay: 1.8, title: 'Cleared', sub: fmtT(sec) + (rec ? ' — your best' : ''), look: true });
    }
    newGame();
    return { stop: function () { alive = false; clearInterval(tick); clearTimeout(holdT); }, restart: newGame, peek: function () { return { cells: cells, over: over, started: started, opened: opened, P: P }; } };
  }

  // =====================================================================================================================
  // Sudoku. Always a single solution. Easy marks your mistakes and gives unlimited hints; normal marks clashes; hard marks nothing.
  // =====================================================================================================================
  function sudoku(level, host, api) {
    K.css('sudoku', '' +
      '.sd-wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.55rem}' +
      '.sd-board{display:grid;grid-template-columns:repeat(9,1fr);border:2px solid #7a83a6;border-radius:6px;overflow:hidden;background:#0e1120}' +
      '.sd-c{position:relative;border:none;padding:0;background:#161b30;color:var(--ink);font-family:var(--serif);display:flex;align-items:center;justify-content:center;border-right:1px solid #2b3252;border-bottom:1px solid #2b3252}' +
      '.sd-c.br{border-right:2px solid #7a83a6}.sd-c.bb{border-bottom:2px solid #7a83a6}' +
      '.sd-c.g{color:var(--ink)}.sd-c.u{color:var(--sky)}.sd-c.peer{background:#1d2340}.sd-c.same{background:#2d3560}.sd-c.sel{background:#3a4478;box-shadow:inset 0 0 0 2px var(--gold)}' +
      '.sd-c.bad{color:var(--rose);background:#3a1e2e}.sd-c .nt{display:grid;grid-template-columns:repeat(3,1fr);width:100%;height:100%;font-family:var(--sans);color:var(--ink-muted);line-height:1}' +
      '.sd-c .nt i{font-style:normal;display:flex;align-items:center;justify-content:center}' +
      '.sd-pad{display:grid;grid-template-columns:repeat(9,1fr);gap:4px;width:100%}.sd-pad button{min-height:46px;border:none;border-radius:9px;background:#232a48;color:var(--ink);font-size:1.25rem;font-family:var(--serif)}.sd-pad button.dim{opacity:.25}' +
      '.sd-pad button:active{background:#3a4478}');
    var clues = { easy: 40, normal: 32, hard: 26 }[level], hints0 = { easy: 99, normal: 3, hard: 1 }[level];
    var wrap = el('div', 'sd-wrap'), boardEl = el('div', 'sd-board'), pad = el('div', 'sd-pad'), bar = el('div', 'kit-bar'); host.appendChild(wrap); wrap.appendChild(boardEl); wrap.appendChild(pad); wrap.appendChild(bar);
    var hr = host.getBoundingClientRect(), S = Math.floor(Math.min(hr.width - 24, hr.height - 190) / 9), alive = true, tick = 0;
    boardEl.style.width = boardEl.style.height = (S * 9 + 4) + 'px'; pad.style.width = (S * 9 + 4) + 'px'; boardEl.style.fontSize = (S * 0.62) + 'px';
    var sol, giv, val, notes, selI, noteMode, hints, t0, over, cellEl = [];

    function count(g, limit) {
      var rows = new Array(9).fill(0), cols = new Array(9).fill(0), bx = new Array(9).fill(0), n = 0, i;
      for (i = 0; i < 81; i++) if (g[i]) { var m = 1 << g[i]; rows[Math.floor(i / 9)] |= m; cols[i % 9] |= m; bx[Math.floor(i / 27) * 3 + Math.floor((i % 9) / 3)] |= m; }
      function rec() {
        var best = -1, bc = 10, bm = 0;
        for (var k = 0; k < 81; k++) if (!g[k]) { var r = Math.floor(k / 9), c = k % 9, b = Math.floor(r / 3) * 3 + Math.floor(c / 3), used = rows[r] | cols[c] | bx[b], free = 0, cnt = 0; for (var d = 1; d <= 9; d++) if (!(used & (1 << d))) { free |= 1 << d; cnt++; } if (cnt < bc) { bc = cnt; best = k; bm = free; if (cnt <= 1) break; } }
        if (best < 0) { n++; return; } if (bc === 0) return;
        var r2 = Math.floor(best / 9), c2 = best % 9, b2 = Math.floor(r2 / 3) * 3 + Math.floor(c2 / 3);
        for (var d2 = 1; d2 <= 9 && n < limit; d2++) if (bm & (1 << d2)) { g[best] = d2; rows[r2] |= 1 << d2; cols[c2] |= 1 << d2; bx[b2] |= 1 << d2; rec(); g[best] = 0; rows[r2] &= ~(1 << d2); cols[c2] &= ~(1 << d2); bx[b2] &= ~(1 << d2); }
      }
      rec(); return n;
    }
    function generate() {
      var base = 3, side = 9, pat = function (r, c) { return (base * (r % base) + Math.floor(r / base) + c) % side; };
      function sh(a) { return K.shuffle(a.slice()); }
      var rb = sh([0, 1, 2]), cb = sh([0, 1, 2]), rows = [], cols = [], nums = sh([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      rb.forEach(function (g) { sh([0, 1, 2]).forEach(function (r) { rows.push(g * base + r); }); }); cb.forEach(function (g) { sh([0, 1, 2]).forEach(function (c) { cols.push(g * base + c); }); });
      var full = []; rows.forEach(function (r) { cols.forEach(function (c) { full.push(nums[pat(r, c)]); }); });
      var puz = full.slice(), order = K.shuffle(Array.apply(null, { length: 81 }).map(Function.call, Number)), left = 81;
      for (var k = 0; k < order.length && left > clues; k++) { var i = order[k], keep = puz[i]; puz[i] = 0; if (count(puz.slice(), 2) !== 1) puz[i] = keep; else left--; }
      return { full: full, puz: puz };
    }
    function newGame() {
      clearInterval(tick); var g = generate(); sol = g.full; giv = g.puz.map(function (x) { return !!x; }); val = g.puz.slice(); notes = val.map(function () { return 0; });
      selI = -1; noteMode = false; hints = hints0; over = false; t0 = Date.now(); build(); refresh();
      tick = setInterval(function () { if (alive && !over) api.status(fmtT(Math.floor((Date.now() - t0) / 1000))); }, 1000);
    }
    function build() {
      boardEl.innerHTML = ''; cellEl = [];
      for (var i = 0; i < 81; i++) {
        var c = i % 9, r = Math.floor(i / 9), b = el('button', 'sd-c' + (c % 3 === 2 && c < 8 ? ' br' : '') + (r % 3 === 2 && r < 8 ? ' bb' : '')); b.type = 'button'; b.style.width = b.style.height = S + 'px';
        (function (ii) { b.addEventListener('click', function () { if (over) return; selI = ii; refresh(); }); })(i); boardEl.appendChild(b); cellEl.push(b);
      }
      pad.innerHTML = ''; for (var d = 1; d <= 9; d++) (function (dd) { var pb = K.btn('', String(dd), function () { enter(dd); }); pb.dataset.d = dd; pad.appendChild(pb); })(d);
    }
    function peers(a, b) { return a !== b && (Math.floor(a / 9) === Math.floor(b / 9) || a % 9 === b % 9 || (Math.floor(a / 27) === Math.floor(b / 27) && Math.floor((a % 9) / 3) === Math.floor((b % 9) / 3))); }
    function clash(i) { if (!val[i]) return false; for (var j = 0; j < 81; j++) if (peers(i, j) && val[j] === val[i]) return true; return false; }
    function refresh() {
      var sv = selI >= 0 ? val[selI] : 0, done = {}; for (var d = 1; d <= 9; d++) done[d] = 0; val.forEach(function (v, i) { if (v && v === sol[i]) done[v]++; });
      for (var i = 0; i < 81; i++) {
        var b = cellEl[i], v = val[i], cls = 'sd-c' + (cellEl[i].className.indexOf(' br') >= 0 ? ' br' : '') + (cellEl[i].className.indexOf(' bb') >= 0 ? ' bb' : '');
        cls += giv[i] ? ' g' : ' u'; if (selI >= 0) { if (i === selI) cls += ' sel'; else if (sv && v === sv) cls += ' same'; else if (peers(i, selI)) cls += ' peer'; }
        if (!giv[i] && v && ((level === 'easy' && v !== sol[i]) || (level !== 'hard' && clash(i)))) cls += ' bad';
        b.className = cls;
        if (v) b.textContent = v; else if (notes[i]) { var h = '<div class="nt" style="font-size:' + (S * 0.24) + 'px">'; for (var n = 1; n <= 9; n++) h += '<i>' + (notes[i] & (1 << n) ? n : '') + '</i>'; b.innerHTML = h + '</div>'; } else b.textContent = '';
      }
      [].forEach.call(pad.children, function (pb) { pb.classList.toggle('dim', done[pb.dataset.d] >= 9); });
      bar.innerHTML = '';
      bar.appendChild(K.btn(noteMode ? 'on' : '', 'Notes', function () { noteMode = !noteMode; refresh(); }));
      bar.appendChild(K.btn('', 'Erase', function () { if (selI >= 0 && !giv[selI] && !over) { val[selI] = 0; notes[selI] = 0; refresh(); } }));
      var hb = K.btn('', hints > 50 ? 'Hint' : 'Hint (' + hints + ')', hint); hb.disabled = hints <= 0 || over; bar.appendChild(hb);
      if (level !== 'easy') bar.appendChild(K.btn('', 'Check', check));
    }
    function enter(d) {
      if (over || selI < 0 || giv[selI]) { if (selI < 0) api.say('Tap a square first', 1000); return; }
      if (noteMode) { if (val[selI]) return; notes[selI] ^= (1 << d); refresh(); return; }
      val[selI] = val[selI] === d ? 0 : d; notes[selI] = 0;
      if (val[selI]) for (var j = 0; j < 81; j++) if (peers(selI, j)) notes[j] &= ~(1 << d);
      refresh(); if (val.every(function (v, i) { return v === sol[i]; })) win();
    }
    function hint() {
      if (hints <= 0 || over) return; var wrong = -1, i;
      var target = selI >= 0 && !giv[selI] && val[selI] !== sol[selI] ? selI : -1;
      if (target < 0) for (i = 0; i < 81; i++) if (!giv[i] && val[i] !== sol[i]) { target = i; if (!val[i]) break; }
      if (target < 0) return; hints--; selI = target; val[target] = sol[target]; notes[target] = 0; giv[target] = true; refresh(); if (val.every(function (v, k) { return v === sol[k]; })) win();
    }
    function check() { if (over) return; var bad = 0; val.forEach(function (v, i) { if (v && v !== sol[i]) bad++; }); api.say(bad ? bad + (bad === 1 ? ' square is' : ' squares are') + ' off' : 'All correct so far', 1700); }
    function win() { over = true; clearInterval(tick); var sec = Math.max(1, Math.floor((Date.now() - t0) / 1000)); var rec = api.setBest(sec, true); api.status('Solved in ' + fmtT(sec)); selI = -1; refresh(); api.win({ cheer: 'sudoku', delay: 2.4, title: 'Solved', sub: fmtT(sec) + (rec ? ' — your best' : ''), look: true }); }
    newGame();
    return { stop: function () { alive = false; clearTimeout(genT); clearInterval(tick); }, restart: newGame };
  }

  G.list.push(G.reg({ id: 'checkers', title: 'Checkers', blurb: 'You are gold, moving up. Captures are required; kings go both ways.', make: checkers,
    levels: { easy: 'A gentle opponent, hints glow, undo allowed.', normal: 'A thoughtful opponent, undo allowed.', hard: 'A sharp opponent that looks far ahead. No undo.' }, bestLabel: function (b) { return b + ' won'; } }));
  G.list.push(G.reg({ id: 'mines', title: 'Minesweeper', blurb: 'Tap to dig, hold to flag. Numbers count the mines around them.', make: mines,
    levels: { easy: '8×8, 8 mines, and one free mistake.', normal: '9×12, 18 mines.', hard: '10×15, 32 mines. First dig is safe, nothing else is.' }, bestLabel: function (b) { return fmtT(b); } }));
  G.list.push(G.reg({ id: 'sudoku', title: 'Sudoku', blurb: 'Fill every row, column and box with 1 to 9. One solution only.', make: sudoku,
    levels: { easy: 'Many starting numbers, mistakes shown, unlimited hints.', normal: 'Fewer numbers, clashes shown, three hints.', hard: 'Few numbers, nothing shown, one hint.' }, bestLabel: function (b) { return fmtT(b); } }));
})(typeof window !== 'undefined' ? window : globalThis);
