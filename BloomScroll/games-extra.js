/* Bloom Scroll — 2048, Bricks, Four in a Row. Touch first: swipe, drag, tap. No game-over screens that sting: a finished game rests and the next one begins. */
(function (root) {
  'use strict';
  var K = root.MannaKit, G = root.MannaGames, el = K.el, rand = K.rand;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // =====================================================================================================================
  // 2048. Swipe anywhere on the board (or use the arrow keys). Tiles that match merge. Easy: a 5×5 board and unlimited undo. Normal: 4×4, three undos. Hard: 4×4, more 4s, no undo.
  // =====================================================================================================================
  function tfe(level, host, api) {
    var P = { easy: { n: 5, undo: 99, four: 0.1 }, normal: { n: 4, undo: 3, four: 0.1 }, hard: { n: 4, undo: 0, four: 0.3 } }[level], N = P.n;
    K.css('tfe', '.tf-wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.8rem;background:radial-gradient(ellipse at 50% 0,#1f2a5c 0,#0d1024 65%)}' +
      '.tf-hud{display:flex;gap:.6rem}.tf-pill{padding:.3rem .9rem;border-radius:999px;background:rgba(10,13,28,.85);border:1px solid rgba(255,255,255,.1);font-size:.95rem;min-width:6rem;text-align:center;font-variant-numeric:tabular-nums}' +
      '.tf-board{position:relative;border-radius:16px;background:#1a2040;box-shadow:0 12px 32px rgba(0,0,0,.55),inset 0 2px 8px rgba(0,0,0,.6);touch-action:none;-webkit-user-select:none;user-select:none}' +
      '.tf-bg{position:absolute;border-radius:10px;background:#252c52}' +
      '.tf-t{position:absolute;border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:var(--serif,Georgia,serif);font-weight:bold;transition:transform .12s ease-out;will-change:transform;box-shadow:0 3px 8px rgba(0,0,0,.35)}' +
      '.tf-t.n{animation:tfNew .22s ease-out both}.tf-t.m{animation:tfPop .2s ease-out both}@keyframes tfNew{from{opacity:0;scale:.4}}@keyframes tfPop{50%{scale:1.18}}');
    var COL = { 2: ['#3b4a7e', '#eaeefc'], 4: ['#4a5a96', '#eaeefc'], 8: ['#7a6ec0', '#fff'], 16: ['#a064c8', '#fff'], 32: ['#d0629e', '#fff'], 64: ['#e5707a', '#fff'], 128: ['#e8946a', '#fff'], 256: ['#eab35e', '#2a1c06'], 512: ['#f0c868', '#2a1c06'], 1024: ['#f6d884', '#2a1c06'], 2048: ['#ffe9a8', '#2a1c06'] };
    var wrap = el('div', 'tf-wrap'), hud = el('div', 'tf-hud'), ps = el('div', 'tf-pill'), pb = el('div', 'tf-pill'), board = el('div', 'tf-board'), bar = el('div', 'kit-bar'); hud.appendChild(ps); hud.appendChild(pb);
    host.appendChild(wrap); wrap.appendChild(hud); wrap.appendChild(board); wrap.appendChild(bar); bar.style.width = '100%';
    var hr = host.getBoundingClientRect(), B = Math.floor(Math.min(hr.width - 32, hr.height - 210)), gap = Math.max(6, Math.round(B / 60)), cs = Math.floor((B - gap * (N + 1)) / N); B = cs * N + gap * (N + 1);
    board.style.width = board.style.height = B + 'px'; board.style.fontSize = (cs * 0.4) + 'px';
    var grid, score, tiles, uid, hist, undos, over, won, alive = true;
    for (var i = 0; i < N * N; i++) { var b0 = el('div', 'tf-bg'); b0.style.cssText = 'width:' + cs + 'px;height:' + cs + 'px;left:' + (gap + (i % N) * (cs + gap)) + 'px;top:' + (gap + Math.floor(i / N) * (cs + gap)) + 'px'; board.appendChild(b0); }
    function newGame() { grid = []; for (var r = 0; r < N; r++) grid.push(new Array(N).fill(null)); [].forEach.call(board.querySelectorAll('.tf-t'), function (t) { t.remove(); }); score = 0; uid = 0; hist = []; undos = P.undo; over = false; won = false; spawn(); spawn(); paint(); drawBar(); }
    function spawn() { var free = []; for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (!grid[r][c]) free.push([r, c]); if (!free.length) return; var f = free[Math.floor(Math.random() * free.length)]; grid[r = f[0]][c = f[1]] = mk(Math.random() < P.four ? 4 : 2, f[0], f[1], true); }
    function mk(v, r, c, isNew) { var t = { id: ++uid, v: v, r: r, c: c, e: null }; t.e = el('div', 'tf-t' + (isNew ? ' n' : '')); t.e.style.width = t.e.style.height = cs + 'px'; board.appendChild(t.e); place(t); return t; }
    function place(t) { t.e.style.transform = 'translate(' + (gap + t.c * (cs + gap)) + 'px,' + (gap + t.r * (cs + gap)) + 'px)'; var col = COL[t.v] || ['#ffe9a8', '#2a1c06']; t.e.style.background = col[0]; t.e.style.color = col[1]; t.e.textContent = t.v; t.e.style.fontSize = (t.v >= 1024 ? 0.74 : t.v >= 128 ? 0.86 : 1) * cs * 0.4 + 'px'; }
    function snap() { return { s: score, g: grid.map(function (row) { return row.map(function (t) { return t ? t.v : 0; }); }) }; }
    function restore(sn) { [].forEach.call(board.querySelectorAll('.tf-t'), function (t) { t.remove(); }); score = sn.s; for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) grid[r][c] = sn.g[r][c] ? mk(sn.g[r][c], r, c) : null; over = false; paint(); }
    function paint() { ps.textContent = 'Score ' + score; api.setBest(score); pb.textContent = 'Best ' + (api.best() || 0); api.status(''); }
    function move(dir) {                                   // 0 left, 1 up, 2 right, 3 down
      if (over) return; var before = snap(), moved = false, gained = 0, dead = [];
      for (var i = 0; i < N; i++) {
        var line = []; for (var k = 0; k < N; k++) { var r = dir === 0 || dir === 2 ? i : (dir === 1 ? k : N - 1 - k), c = dir === 1 || dir === 3 ? i : (dir === 0 ? k : N - 1 - k); line.push([r, c]); }
        var ts = line.map(function (p) { return grid[p[0]][p[1]]; }).filter(Boolean), out = [];
        ts.forEach(function (t) { var top = out[out.length - 1]; if (top && top.v === t.v && !top.m) { top.v *= 2; top.m = true; t.into = top; gained += top.v; dead.push(t); } else out.push(t); });
        line.forEach(function (p) { grid[p[0]][p[1]] = null; });
        out.forEach(function (t, j) { var p = line[j]; if (t.r !== p[0] || t.c !== p[1]) moved = true; t.r = p[0]; t.c = p[1]; grid[p[0]][p[1]] = t; });
        dead.forEach(function (t) { if (t.into) { t.r = t.into.r; t.c = t.into.c; } });
      }
      if (!moved && !dead.length) return; hist.push(before); if (hist.length > 30) hist.shift();
      score += gained; var all = []; for (var r2 = 0; r2 < N; r2++) for (var c2 = 0; c2 < N; c2++) if (grid[r2][c2]) all.push(grid[r2][c2]);
      all.concat(dead).forEach(place); dead.forEach(function (t) { setTimeout(function () { t.e.remove(); }, 130); });
      all.forEach(function (t) { if (t.m) { t.m = false; t.e.classList.remove('m'); void t.e.offsetWidth; t.e.classList.add('m'); if (t.v === 2048 && !won) { won = true; api.say('2048 — and you can keep going', 2400); } } });
      setTimeout(function () { if (!alive) return; spawn(); paint(); if (!canMove()) { over = true; api.say('No more moves — try again?', 2600); } }, 110); paint(); drawBar();
    }
    function canMove() { for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) { var t = grid[r][c]; if (!t) return true; if (c + 1 < N && grid[r][c + 1] && grid[r][c + 1].v === t.v) return true; if (r + 1 < N && grid[r + 1][c] && grid[r + 1][c].v === t.v) return true; } return false; }
    function drawBar() { bar.innerHTML = ''; if (P.undo) { var u = K.btn('', 'Undo' + (P.undo < 99 ? ' (' + undos + ')' : ''), function () { if (!hist.length || (P.undo < 99 && undos <= 0)) return; if (P.undo < 99) undos--; restore(hist.pop()); drawBar(); }); u.disabled = !hist.length || (P.undo < 99 && undos <= 0); bar.appendChild(u); } }
    var sx = 0, sy = 0, down = false;
    board.addEventListener('pointerdown', function (e) { down = true; sx = e.clientX; sy = e.clientY; try { board.setPointerCapture(e.pointerId); } catch (x) {} });
    board.addEventListener('pointerup', function (e) { if (!down) return; down = false; var dx = e.clientX - sx, dy = e.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return; move(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 0 : 2) : (dy < 0 ? 1 : 3)); });
    function kd(e) { var m = { ArrowLeft: 0, ArrowUp: 1, ArrowRight: 2, ArrowDown: 3 }[e.key]; if (m != null) { e.preventDefault(); move(m); } }
    document.addEventListener('keydown', kd);
    newGame();
    return { stop: function () { alive = false; document.removeEventListener('keydown', kd); }, restart: newGame, peek: function () { return { grid: grid, score: score, move: move, over: over }; } };
  }

  // =====================================================================================================================
  // Bricks. Slide the paddle with your finger; the ball breaks the bricks. Some bricks drop a gift: a wider paddle, a slower ball, or three balls. A lost ball is just a retry.
  // =====================================================================================================================
  function bricks(level, host, api) {
    var P = { easy: { lives: 6, rows: 4, v: 330, pw: 0.26, tough: 0, gift: 0.22 }, normal: { lives: 4, rows: 6, v: 390, pw: 0.2, tough: 0, gift: 0.16 }, hard: { lives: 3, rows: 7, v: 450, pw: 0.16, tough: 0.3, gift: 0.12 } }[level];
    var c = K.canvas(host), W = c.W, H = c.H, ctx = c.ctx, COLS = 8, bw = (W - 24) / COLS, bh = 22, top = 70, py = H - 70, PH = 14, R = 7;
    var HUES = [350, 22, 45, 140, 190, 235, 275];
    var bricksL, balls, pad, caps, parts, lives, score, lvl, st, stT, msg, msgT, clock = 0, alive = true, wide = 0, slow = 0, tx;
    function build() {
      bricksL = []; var rows = Math.min(8, P.rows + Math.floor((lvl - 1) / 2)), pat = (lvl - 1) % 3;
      for (var r = 0; r < rows; r++) for (var q = 0; q < COLS; q++) { if (pat === 1 && (q + r) % 4 === 0) continue; if (pat === 2 && Math.abs(q - 3.5) < r * 0.45 - 0.6) continue; bricksL.push({ x: 12 + q * bw, y: top + r * (bh + 4), w: bw - 4, h: bh, hue: HUES[r % HUES.length], hp: Math.random() < P.tough ? 2 : 1 }); }
    }
    function newGame() { lives = P.lives; score = 0; lvl = 1; wide = slow = 0; caps = []; parts = []; build(); serve(); status(); }
    function serve() { pad = { x: W / 2, w: W * P.pw }; tx = pad.x; balls = [{ x: pad.x, y: py - PH - R - 1, vx: 0, vy: 0, on: true, trail: [] }]; st = 'serve'; stT = 1.3; msg = lvl === 1 && score === 0 ? 'Slide to move · the ball launches by itself' : 'Level ' + lvl; msgT = 1.3; }
    function status() { api.status('Level ' + lvl + ' · ' + (api.best() ? 'best ' + api.best() : '')); }
    function burst(x, y, hue, n) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.3, s = 40 + Math.random() * 120; parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, t: 0.5 + Math.random() * 0.3, col: 'hsl(' + hue + ',90%,65%)', r: 1.6 + Math.random() * 2 }); } }
    function pwNow() { return pad.w * (wide > 0 ? 1.55 : 1); }
    function speed() { return P.v * (1 + Math.min(0.5, lvl * 0.05)) * (slow > 0 ? 0.7 : 1); }
    function hitBrick(b, ball) {
      b.hp--; if (b.hp > 0) { burst(b.x + b.w / 2, b.y + b.h / 2, 0, 3); return; }
      bricksL.splice(bricksL.indexOf(b), 1); score += 10; api.setBest(score); burst(b.x + b.w / 2, b.y + b.h / 2, b.hue, 9); status();
      if (Math.random() < P.gift) caps.push({ x: b.x + b.w / 2, y: b.y, k: ['wide', 'slow', 'multi'][Math.floor(Math.random() * 3)] });
    }
    function update(dt) {
      clock += dt; msgT = Math.max(0, msgT - dt); wide = Math.max(0, wide - dt); slow = Math.max(0, slow - dt);
      parts.forEach(function (p) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt; }); parts = parts.filter(function (p) { return p.t > 0; });
      pad.x += (tx - pad.x) * Math.min(1, 22 * dt); var hw = pwNow() / 2; pad.x = clamp(pad.x, hw + 4, W - hw - 4);
      if (st === 'rest') { stT -= dt; if (stT <= 0) newGame(); return; }
      if (st === 'serve') { stT -= dt; balls[0].x = pad.x; if (stT <= 0) { balls[0].on = false; var a = rand(-0.5, 0.5), s = speed(); balls[0].vx = Math.sin(a) * s; balls[0].vy = -Math.cos(a) * s; st = 'play'; } return; }
      caps.forEach(function (g) { g.y += 120 * dt; if (g.y > py - PH && g.y < py + PH && Math.abs(g.x - pad.x) < hw + 10) { g.got = true; if (g.k === 'wide') wide = 12; else if (g.k === 'slow') slow = 10; else { var src = balls[0]; for (var i = 0; i < 2; i++) { var a = rand(-0.9, 0.9), s = speed(); balls.push({ x: src.x, y: src.y, vx: Math.sin(a) * s, vy: -Math.abs(Math.cos(a)) * s, on: false, trail: [] }); } } msg = g.k === 'wide' ? 'Wider paddle' : g.k === 'slow' ? 'Slower ball' : 'Three balls'; msgT = 1; } }); caps = caps.filter(function (g) { return !g.got && g.y < H + 20; });
      balls.forEach(function (b) {
        var sp = Math.hypot(b.vx, b.vy), n = Math.max(1, Math.ceil(sp * dt / (R * 0.8))), h = dt / n; b.trail.push([b.x, b.y]); if (b.trail.length > 9) b.trail.shift();
        for (var i = 0; i < n; i++) {
          b.x += b.vx * h; b.y += b.vy * h;
          if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx); } if (b.x > W - R) { b.x = W - R; b.vx = -Math.abs(b.vx); } if (b.y < R + 40) { b.y = R + 40; b.vy = Math.abs(b.vy); }
          if (b.vy > 0 && b.y + R >= py && b.y + R <= py + PH + 8 && Math.abs(b.x - pad.x) <= hw + R) { var off = clamp((b.x - pad.x) / hw, -1, 1), s = speed(), a = off * 1.05; b.vx = Math.sin(a) * s; b.vy = -Math.cos(a) * s; b.y = py - R; }
          for (var k = 0; k < bricksL.length; k++) {
            var br = bricksL[k], cx = clamp(b.x, br.x, br.x + br.w), cy = clamp(b.y, br.y, br.y + br.h), dx = b.x - cx, dy = b.y - cy;
            if (dx * dx + dy * dy < R * R) { if (Math.abs(dx) > Math.abs(dy)) b.vx = Math.abs(b.vx) * (dx > 0 ? 1 : -1); else b.vy = Math.abs(b.vy) * (dy > 0 ? 1 : -1); hitBrick(br, b); break; }
          }
        }
      });
      balls = balls.filter(function (b) { return b.y < H + 20; });
      if (!bricksL.length) { lvl++; api.setBest(score); caps = []; build(); serve(); status(); return; }
      if (!balls.length) { lives--; if (lives <= 0) { st = 'rest'; stT = 2.8; msg = 'Rest a moment — score ' + score; msgT = 2.8; api.setBest(score); } else { wide = 0; serve(); msg = lives + ' ball' + (lives === 1 ? '' : 's') + ' left'; msgT = 1.2; } }
    }
    function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    var bg = document.createElement('canvas'), dpr = Math.min(2, root.devicePixelRatio || 1); bg.width = Math.round(W * dpr); bg.height = Math.round(H * dpr);
    (function () { var g = bg.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); var s = g.createLinearGradient(0, 0, 0, H); s.addColorStop(0, '#0b0f26'); s.addColorStop(1, '#160f2e'); g.fillStyle = s; g.fillRect(0, 0, W, H); for (var i = 0; i < 70; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.1 + Math.random() * 0.5) + ')'; g.fillRect(Math.random() * W, Math.random() * H, 1.3, 1.3); } g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, 38, W, 1); })();
    function draw() {
      ctx.drawImage(bg, 0, 0, W, H);
      bricksL.forEach(function (b) { var g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h); g.addColorStop(0, 'hsl(' + b.hue + ',85%,' + (b.hp > 1 ? 74 : 66) + '%)'); g.addColorStop(1, 'hsl(' + b.hue + ',80%,' + (b.hp > 1 ? 52 : 44) + '%)'); ctx.fillStyle = g; rr(b.x, b.y, b.w, b.h, 6); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.3)'; rr(b.x + 2, b.y + 2, b.w - 4, 5, 3); ctx.fill(); if (b.hp > 1) { ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; rr(b.x + 1, b.y + 1, b.w - 2, b.h - 2, 6); ctx.stroke(); } });
      caps.forEach(function (g) { ctx.fillStyle = g.k === 'wide' ? '#7be0d6' : g.k === 'slow' ? '#8fd3ff' : '#f2c879'; rr(g.x - 14, g.y - 9, 28, 18, 9); ctx.fill(); ctx.fillStyle = '#10142a'; ctx.font = 'bold 12px -apple-system,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(g.k === 'wide' ? '↔' : g.k === 'slow' ? '◔' : '●●●', g.x, g.y + 4); });
      var hw = pwNow() / 2, pg = ctx.createLinearGradient(0, py, 0, py + PH); pg.addColorStop(0, '#fbe3b0'); pg.addColorStop(1, '#c99a4a'); ctx.fillStyle = pg; rr(pad.x - hw, py, hw * 2, PH, 7); ctx.fill(); if (wide > 0) { ctx.strokeStyle = 'rgba(123,224,214,.7)'; ctx.lineWidth = 2; rr(pad.x - hw - 2, py - 2, hw * 2 + 4, PH + 4, 9); ctx.stroke(); }
      balls.forEach(function (b) { b.trail.forEach(function (p, i) { ctx.fillStyle = 'rgba(255,240,200,' + (i / b.trail.length * 0.25) + ')'; ctx.beginPath(); ctx.arc(p[0], p[1], R * (0.4 + i / b.trail.length * 0.5), 0, 7); ctx.fill(); }); ctx.globalCompositeOperation = 'lighter'; var gl = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, R * 3); gl.addColorStop(0, 'rgba(255,230,160,.6)'); gl.addColorStop(1, 'rgba(255,230,160,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(b.x, b.y, R * 3, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, 7); ctx.fill(); });
      parts.forEach(function (p) { ctx.globalAlpha = Math.min(1, p.t * 2); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(10,13,28,.85)'; rr(10, 8, 88, 26, 13); ctx.fill(); ctx.font = '600 13px -apple-system,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ece8dc'; ctx.fillText('Score ' + score, 54, 26);
      for (var i = 0; i < Math.min(lives, 8); i++) { ctx.fillStyle = '#f2c879'; ctx.beginPath(); ctx.arc(W - 20 - i * 18, 21, 5, 0, 7); ctx.fill(); }
      if (msgT > 0) { ctx.font = '21px Georgia,serif'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(5,8,16,' + Math.min(0.85, msgT) + ')'; ctx.strokeText(msg, W / 2, H * 0.58, W - 24); ctx.fillStyle = 'rgba(252,246,228,' + Math.min(1, msgT * 1.5) + ')'; ctx.fillText(msg, W / 2, H * 0.58, W - 24); }
    }
    function pt(e) { var r = c.cv.getBoundingClientRect(); tx = e.clientX - r.left; }
    c.cv.addEventListener('pointerdown', pt); c.cv.addEventListener('pointermove', function (e) { if (e.buttons || e.pointerType === 'touch') pt(e); });
    newGame();
    var stop = K.loop(function (dt) { if (alive) { update(dt); draw(); } });
    return { stop: function () { alive = false; stop(); }, restart: newGame, peek: function () { return { balls: balls, bricks: bricksL.length, lives: lives, score: score, lvl: lvl, st: st, pad: pad, setTx: function (v) { tx = v; } }; } };
  }

  // =====================================================================================================================
  // Four in a Row. You are gold and drop first. Easy looks two moves ahead and slips; Normal four; Hard thinks as far ahead as it can in under a second.
  // =====================================================================================================================
  function fourRow(level, host, api) {
    var P = { easy: { d: 2, slip: 0.3, ms: 100 }, normal: { d: 4, slip: 0.06, ms: 250 }, hard: { d: 9, slip: 0, ms: 800 } }[level], COLS = 7, ROWS = 6;
    var c = K.canvas(host), W = c.W, H = c.H, ctx = c.ctx, cs = Math.floor(Math.min((W - 28) / COLS, (H - 190) / ROWS)), bx = Math.floor((W - cs * COLS) / 2), by = Math.floor((H - cs * ROWS) / 2) + 14;
    var cells, turn, over, win, drops, hover = -1, msg, msgT, wins, clock = 0, alive = true, thinkT = 0, nextT = 0;
    function newGame() { cells = new Array(COLS * ROWS).fill(0); turn = 1; over = false; win = null; drops = []; msg = 'Your drop — tap a column'; msgT = 1.6; thinkT = 0; nextT = 0; status(); }
    function status() { api.status('You won ' + (api.best() || 0)); }
    function rowFor(b, col) { for (var r = ROWS - 1; r >= 0; r--) if (!b[r * COLS + col]) return r; return -1; }
    function winner(b) {
      var D = [[1, 0], [0, 1], [1, 1], [1, -1]];
      for (var r = 0; r < ROWS; r++) for (var q = 0; q < COLS; q++) { var v = b[r * COLS + q]; if (!v) continue; for (var d = 0; d < 4; d++) { var cnt = 1, line = [[r, q]]; for (var k = 1; k < 4; k++) { var rr_ = r + D[d][1] * k, cc = q + D[d][0] * k; if (rr_ < 0 || rr_ >= ROWS || cc < 0 || cc >= COLS || b[rr_ * COLS + cc] !== v) break; cnt++; line.push([rr_, cc]); } if (cnt === 4) return { v: v, line: line }; } }
      return null;
    }
    function drop(col, who) {
      var r = rowFor(cells, col); if (r < 0) return false; cells[r * COLS + col] = who; drops.push({ col: col, row: r, who: who, y: by - cs, vy: 0, done: false });
      var w = winner(cells); if (w) { over = true; win = w; if (w.v === 1) { api.setBest((api.best() || 0) + 1); } msg = w.v === 1 ? 'Four in a row — you win!' : 'Four for the computer — again?'; msgT = 3; nextT = 3.2; status(); }
      else if (cells.every(Boolean)) { over = true; msg = 'A full board — a draw'; msgT = 2.5; nextT = 2.8; }
      return true;
    }
    // ---- the computer: negamax with alpha-beta, centre columns first ----
    var ORDER = [3, 2, 4, 1, 5, 0, 6], t0, nodes;
    function score4(b, who) {
      var s = 0, D = [[1, 0], [0, 1], [1, 1], [1, -1]];
      for (var r = 0; r < ROWS; r++) { var cv = b[r * COLS + 3]; if (cv === who) s += 3; else if (cv) s -= 3; }
      for (r = 0; r < ROWS; r++) for (var q = 0; q < COLS; q++) for (var d = 0; d < 4; d++) {
        var me = 0, op = 0, ok = true; for (var k = 0; k < 4; k++) { var rr_ = r + D[d][1] * k, cc = q + D[d][0] * k; if (rr_ < 0 || rr_ >= ROWS || cc < 0 || cc >= COLS) { ok = false; break; } var v = b[rr_ * COLS + cc]; if (v === who) me++; else if (v) op++; }
        if (!ok) continue; if (me && !op) s += me === 3 ? 6 : me === 2 ? 2 : 0; else if (op && !me) s -= op === 3 ? 7 : op === 2 ? 2 : 0;
      }
      return s;
    }
    function nega(b, who, depth, a, bt) {
      nodes++; if ((nodes & 255) === 0 && performance.now() - t0 > P.ms) return null;
      var w = winner(b); if (w) return w.v === who ? 1000 + depth : -1000 - depth; if (b.every(Boolean)) return 0; if (depth === 0) return score4(b, who);
      var best = -1e9;
      for (var i = 0; i < 7; i++) { var col = ORDER[i], r = rowFor(b, col); if (r < 0) continue; b[r * COLS + col] = who; var v = nega(b, 3 - who, depth - 1, -bt, -a); b[r * COLS + col] = 0; if (v === null) return null; v = -v; if (v > best) best = v; if (best > a) a = best; if (a >= bt) break; }
      return best;
    }
    function think() {
      var legal = ORDER.filter(function (col) { return rowFor(cells, col) >= 0; }); if (Math.random() < P.slip) return legal[Math.floor(Math.random() * legal.length)];
      t0 = performance.now(); nodes = 0; var best = legal[0];
      for (var d = 1; d <= P.d; d++) {
        var bestV = -1e9, pick = null, aborted = false;
        for (var i = 0; i < legal.length; i++) { var col = legal[i], r = rowFor(cells, col); cells[r * COLS + col] = 2; var v = nega(cells, 1, d - 1, -1e9, 1e9); cells[r * COLS + col] = 0; if (v === null) { aborted = true; break; } v = -v; if (v > bestV) { bestV = v; pick = col; } }
        if (aborted) break; best = pick; if (bestV > 900) break; legal.sort(function (x, y) { return x === pick ? -1 : y === pick ? 1 : 0; });
      }
      return best;
    }
    function tap(col) { if (over || turn !== 1 || drops.some(function (d) { return !d.done; })) return; if (drop(col, 1)) { turn = 2; thinkT = 0.55; msg = ''; } }
    function pt(e) { var r = c.cv.getBoundingClientRect(); return Math.floor((e.clientX - r.left - bx) / cs); }
    c.cv.addEventListener('pointermove', function (e) { hover = pt(e); }); c.cv.addEventListener('pointerleave', function () { hover = -1; });
    c.cv.addEventListener('pointerdown', function (e) { var col = pt(e); hover = col; if (col >= 0 && col < COLS) tap(col); });
    function update(dt) {
      clock += dt; msgT = Math.max(0, msgT - dt);
      drops.forEach(function (d) { if (d.done) return; var ty = by + d.row * cs; d.vy += 2600 * dt; d.y += d.vy * dt; if (d.y >= ty) { d.y = ty; d.vy *= -0.28; if (Math.abs(d.vy) < 90) { d.done = true; d.y = ty; } } });
      if (over) { nextT -= dt; if (nextT <= 0) newGame(); return; }
      if (turn === 2 && drops.every(function (d) { return d.done; })) { thinkT -= dt; if (thinkT <= 0) { var col = think(); drop(col, 2); if (!over) { turn = 1; msg = 'Your drop'; msgT = 0.9; } } }
    }
    function draw() {
      var bgc = ctx.createLinearGradient(0, 0, 0, H); bgc.addColorStop(0, '#0d1126'); bgc.addColorStop(1, '#171236'); ctx.fillStyle = bgc; ctx.fillRect(0, 0, W, H);
      if (hover >= 0 && hover < COLS && turn === 1 && !over) { ctx.fillStyle = 'rgba(242,200,121,.14)'; ctx.fillRect(bx + hover * cs, by - 6, cs, cs * ROWS + 12); ctx.fillStyle = 'rgba(242,200,121,.75)'; ctx.beginPath(); ctx.arc(bx + hover * cs + cs / 2, by - cs * 0.45, cs * 0.3, 0, 7); ctx.fill(); }
      // discs behind the board (falling or landed)
      for (var r = 0; r < ROWS; r++) for (var q = 0; q < COLS; q++) { var v = cells[r * COLS + q]; if (!v) continue; var d = drops.filter(function (dd) { return dd.col === q && dd.row === r; })[0], y = d ? d.y : by + r * cs; disc(bx + q * cs + cs / 2, y + cs / 2, v); }
      // the board with holes
      ctx.save(); ctx.beginPath(); ctx.rect(bx - 8, by - 8, cs * COLS + 16, cs * ROWS + 16); for (r = 0; r < ROWS; r++) for (q = 0; q < COLS; q++) { ctx.moveTo(bx + q * cs + cs / 2 + cs * 0.4, by + r * cs + cs / 2); ctx.arc(bx + q * cs + cs / 2, by + r * cs + cs / 2, cs * 0.4, 0, 6.2832, true); }
      var bg2 = ctx.createLinearGradient(0, by, 0, by + cs * ROWS); bg2.addColorStop(0, '#3a56b0'); bg2.addColorStop(1, '#2a3f86'); ctx.fillStyle = bg2; ctx.fill('evenodd'); ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2; for (r = 0; r < ROWS; r++) for (q = 0; q < COLS; q++) { ctx.beginPath(); ctx.arc(bx + q * cs + cs / 2, by + r * cs + cs / 2, cs * 0.4, 0, 7); ctx.stroke(); }
      if (win) { ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 + 0.4 * Math.sin(clock * 8)) + ')'; ctx.lineWidth = 4; win.line.forEach(function (p) { ctx.beginPath(); ctx.arc(bx + p[1] * cs + cs / 2, by + p[0] * cs + cs / 2, cs * 0.34, 0, 7); ctx.stroke(); }); }
      if (turn === 2 && !over) { ctx.font = '15px -apple-system,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(220,226,245,.85)'; ctx.fillText('Thinking' + '...'.slice(0, 1 + Math.floor(clock * 3) % 3), W / 2, by - cs * 0.9); }
      if (msgT > 0 && msg) { ctx.font = '21px Georgia,serif'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(5,8,16,' + Math.min(0.85, msgT) + ')'; ctx.strokeText(msg, W / 2, by + cs * ROWS + 44, W - 24); ctx.fillStyle = 'rgba(252,246,228,' + Math.min(1, msgT * 1.5) + ')'; ctx.fillText(msg, W / 2, by + cs * ROWS + 44, W - 24); }
    }
    function disc(x, y, who) { var g = ctx.createRadialGradient(x - cs * 0.12, y - cs * 0.12, cs * 0.05, x, y, cs * 0.4); if (who === 1) { g.addColorStop(0, '#ffe9a8'); g.addColorStop(1, '#d9a24a'); } else { g.addColorStop(0, '#ff9aaa'); g.addColorStop(1, '#c4506f'); } ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, cs * 0.4, 0, 7); ctx.fill(); }
    newGame();
    var stop = K.loop(function (dt) { if (alive) { update(dt); draw(); } });
    return { stop: function () { alive = false; stop(); }, restart: newGame, peek: function () { return { cells: cells, turn: turn, over: over, tap: tap, drops: drops, win: win }; } };
  }

  G.list.push(G.reg({ id: 'tfe', title: '2048', blurb: 'Swipe to slide the tiles. Matching numbers merge. See how high you can go.', make: tfe,
    levels: { easy: 'A roomy 5×5 board and unlimited undo.', normal: 'The classic 4×4 with three undos.', hard: '4×4, more 4s, and no undo.' }, bestLabel: function (b) { return b + ' pts'; } }));
  G.list.push(G.reg({ id: 'bricks', title: 'Bricks', blurb: 'Slide the paddle, keep the ball alive, and break every brick. Catch the gifts that fall.', make: bricks,
    levels: { easy: 'Six balls, a wide paddle, a slower ball, and lots of gifts.', normal: 'Four balls and a standard paddle.', hard: 'Three balls, a narrow paddle, and bricks that take two hits.' }, bestLabel: function (b) { return b + ' pts'; } }));
  G.list.push(G.reg({ id: 'connect4', title: 'Four in a Row', blurb: 'Drop your gold discs and line up four before the computer does.', make: fourRow,
    levels: { easy: 'A gentle opponent who sometimes slips.', normal: 'A thoughtful opponent looking four moves ahead.', hard: 'A sharp opponent that looks as far ahead as it can.' }, bestLabel: function (b) { return b + ' won'; } }));
})(typeof window !== 'undefined' ? window : globalThis);
