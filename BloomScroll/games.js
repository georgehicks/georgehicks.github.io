/* Bloom Scroll — Star Watch, Hold the Pass, Lights. Each opens on the Easy / Normal / Hard picker (gamekit.js). No game-over screens that sting:
   when you fall, it rests a moment and begins again. Other games register themselves into MannaGames.list from their own files. */
(function (root) {
  'use strict';
  var K = root.MannaKit, rand = K.rand;

  // ---------------- Star Watch (shooter) ----------------
  function starWatch(level, host, api) {
    var P = { easy: { lives: 5, spd: 24, step: 3, efire: 2.0, sb: 130, drop: 0.2, rate: 0.36 }, normal: { lives: 3, spd: 34, step: 5, efire: 1.25, sb: 170, drop: 0.13, rate: 0.42 }, hard: { lives: 2, spd: 46, step: 7, efire: 0.85, sb: 210, drop: 0.09, rate: 0.48 } }[level];
    var c = K.canvas(host), ctx = c.ctx, W = c.W, H = c.H, i;
    var ship, bullets, shots, foes, pows, ufo, dir, speed, wave, lives, score, fire, efire, msg, msgT, stars = [], buff, shield, ufoT, drag = null, hit, shake;
    for (i = 0; i < 50; i++) stars.push([Math.random() * W, Math.random() * H, Math.random() * 1.4 + 0.3]);
    function reset(w) {
      ship = { x: W / 2, tx: W / 2, y: H - 62, inv: 0 }; bullets = []; shots = []; foes = []; pows = []; ufo = null; dir = 1; wave = w || 0; lives = P.lives; score = 0; fire = 0; efire = 1.2; buff = { triple: 0, rapid: 0 }; shield = false; ufoT = 14; hit = 0; shake = 0; spawn();
    }
    function spawn() {
      wave++; foes = []; dir = 1; speed = P.spd + wave * P.step; shots = [];
      var cols = 7, rows = Math.min(5, 2 + Math.ceil(wave / 2)), gap = Math.min(40, (W - 44) / cols);
      for (var r = 0; r < rows; r++) for (var q = 0; q < cols; q++) foes.push({ x: 28 + q * gap, y: 56 + r * 30, r: r, hp: (r === 0 && wave >= 3) ? 2 : 1 });
      msg = 'Wave ' + wave; msgT = 1.6;
    }
    var clock = 0, parts = [], SC = 2, sprites = {}, bg = document.createElement('canvas');
    // Pixel-art invaders (two flap frames each), cached with a glow. 'X' is body.
    var MAPS = {
      squid: [["...XX...", "..XXXX..", ".XXXXXX.", "XX.XX.XX", "XXXXXXXX", "..X..X..", ".X.XX.X.", "X.X..X.X"], ["...XX...", "..XXXX..", ".XXXXXX.", "XX.XX.XX", "XXXXXXXX", ".X.XX.X.", "X......X", ".X....X."]],
      crab: [["..X.....X..", "...X...X...", "..XXXXXXX..", ".XX.XXX.XX.", "XXXXXXXXXXX", "X.XXXXXXX.X", "X.X.....X.X", "...XX.XX..."], ["..X.....X..", "X..X...X..X", "X.XXXXXXX.X", "XXX.XXX.XXX", "XXXXXXXXXXX", ".XXXXXXXXX.", "..X.....X..", ".X.......X."]],
      octo: [["....XXXX....", ".XXXXXXXXXX.", "XXXXXXXXXXXX", "XXX..XX..XXX", "XXXXXXXXXXXX", "...XX..XX...", "..XX.XX.XX..", "XX........XX"], ["....XXXX....", ".XXXXXXXXXX.", "XXXXXXXXXXXX", "XXX..XX..XXX", "XXXXXXXXXXXX", "..XXX..XXX..", ".XX..XX..XX.", "..XX....XX.."]]
    };
    function sprite(kind, col, frame) {
      var key = kind + col + frame; if (sprites[key]) return sprites[key];
      var m = MAPS[kind][frame], cell = 2.4 * SC, pad = 7 * SC, cv = document.createElement('canvas'), g = cv.getContext('2d');
      cv.width = Math.ceil(m[0].length * cell + pad * 2); cv.height = Math.ceil(m.length * cell + pad * 2);
      var gr = g.createLinearGradient(0, pad, 0, cv.height - pad); gr.addColorStop(0, '#fff'); gr.addColorStop(0.25, col); gr.addColorStop(1, col);
      g.shadowColor = col; g.shadowBlur = 8 * SC; g.fillStyle = gr;
      m.forEach(function (row, y) { for (var x = 0; x < row.length; x++) if (row[x] === 'X') g.fillRect(pad + x * cell, pad + y * cell, cell + 0.4, cell + 0.4); });
      g.shadowBlur = 0; g.fillStyle = 'rgba(0,0,20,.18)'; m.forEach(function (row, y) { if (y > m.length - 3) for (var x = 0; x < row.length; x++) if (row[x] === 'X') g.fillRect(pad + x * cell, pad + y * cell, cell + 0.4, cell + 0.4); });
      return sprites[key] = cv;
    }
    function paintBg() {
      bg.width = Math.round(W * 2); bg.height = Math.round(H * 2); var g = bg.getContext('2d'); g.scale(2, 2);
      var v = g.createLinearGradient(0, 0, 0, H); v.addColorStop(0, '#03050d'); v.addColorStop(0.55, '#0a1030'); v.addColorStop(1, '#1a1440'); g.fillStyle = v; g.fillRect(0, 0, W, H);
      [[0.2, 0.28, 0.5, 'rgba(90,70,200,.28)'], [0.85, 0.5, 0.45, 'rgba(40,120,200,.2)'], [0.45, 0.8, 0.55, 'rgba(180,70,150,.18)']].forEach(function (n) { var r = W * n[2], rg = g.createRadialGradient(W * n[0], H * n[1], 0, W * n[0], H * n[1], r); rg.addColorStop(0, n[3]); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H); });
      // a far planet with a lit rim, low on the left
      var px = W * 0.12, py = H * 0.93, pr = W * 0.34, pg = g.createRadialGradient(px + pr * 0.35, py - pr * 0.4, pr * 0.1, px, py, pr); pg.addColorStop(0, '#3a3f86'); pg.addColorStop(0.7, '#171a46'); pg.addColorStop(1, '#0b0d26'); g.fillStyle = pg; g.beginPath(); g.arc(px, py, pr, 0, 7); g.fill();
      g.strokeStyle = 'rgba(150,170,255,.35)'; g.lineWidth = 2; g.beginPath(); g.arc(px, py, pr, -1.2, -0.2); g.stroke();
      for (var q = 0; q < 70; q++) { g.fillStyle = 'rgba(255,255,255,' + (0.15 + Math.random() * 0.35) + ')'; g.fillRect(Math.random() * W, Math.random() * H, 1, 1); }
    }
    paintBg();
    function burst(x, y, col, n, sp) { for (var q = 0; q < n; q++) { var a = Math.random() * 6.3, v = (0.3 + Math.random()) * (sp || 80); parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, t: 0.45 + Math.random() * 0.4, l: 0.85, r: 1.4 + Math.random() * 2, c: col }); } }
    function drawShip(x, y) {
      var fl = 5 + Math.random() * 4; ctx.save(); ctx.translate(x, y);
      var fg = ctx.createLinearGradient(0, 10, 0, 10 + fl + 8); fg.addColorStop(0, 'rgba(255,230,160,.95)'); fg.addColorStop(0.5, 'rgba(255,140,70,.6)'); fg.addColorStop(1, 'rgba(255,90,60,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(-4, 9); ctx.lineTo(0, 11 + fl + 6); ctx.lineTo(4, 9); ctx.fill();
      ctx.shadowColor = 'rgba(150,190,255,.7)'; ctx.shadowBlur = 10;
      var wg = ctx.createLinearGradient(-15, 0, 15, 0); wg.addColorStop(0, '#6e7fb8'); wg.addColorStop(0.5, '#dfe7ff'); wg.addColorStop(1, '#6e7fb8'); ctx.fillStyle = wg;
      ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(5, -4); ctx.lineTo(16, 8); ctx.lineTo(16, 11); ctx.lineTo(6, 8); ctx.lineTo(3, 11); ctx.lineTo(-3, 11); ctx.lineTo(-6, 8); ctx.lineTo(-16, 11); ctx.lineTo(-16, 8); ctx.lineTo(-5, -4); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = '#ff9aa8'; ctx.fillRect(-16, 7, 3, 3); ctx.fillRect(13, 7, 3, 3);
      var cg = ctx.createLinearGradient(0, -10, 0, 2); cg.addColorStop(0, '#bfeaff'); cg.addColorStop(1, '#3a78c8'); ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(0, -3, 2.6, 6, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
    function miniShip(x, y) { ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#dfe7ff'; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(7, 5); ctx.lineTo(3, 4); ctx.lineTo(0, 6); ctx.lineTo(-3, 4); ctx.lineTo(-7, 5); ctx.closePath(); ctx.fill(); ctx.restore(); }
    reset();
    function move(e) { if (!drag) return; var r = c.cv.getBoundingClientRect(); ship.tx = Math.max(18, Math.min(W - 18, drag.sx + (e.clientX - drag.x) * 1.25)); }
    c.cv.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, sx: ship.tx }; try { c.cv.setPointerCapture(e.pointerId); } catch (x) {} });
    c.cv.addEventListener('pointermove', move);
    c.cv.addEventListener('pointerup', function () { drag = null; }); c.cv.addEventListener('pointercancel', function () { drag = null; });
    function drop(x, y, kind) { pows.push({ x: x, y: y, k: kind || ['triple', 'rapid', 'shield'][Math.floor(Math.random() * 3)] }); }
    function lose() { burst(ship.x, ship.y, '#aee0ff', 26, 130); lives--; ship.inv = 1.5; shake = 0.3; if (shield) { shield = false; lives++; } }
    var stop = K.loop(function (dt) {
      ship.x += (ship.tx - ship.x) * Math.min(1, dt * 16); ship.inv = Math.max(0, ship.inv - dt); shake = Math.max(0, shake - dt);
      buff.triple = Math.max(0, buff.triple - dt); buff.rapid = Math.max(0, buff.rapid - dt);
      fire -= dt; if (fire <= 0) { var sx = buff.triple > 0 ? [-9, 0, 9] : [0]; sx.forEach(function (o) { bullets.push({ x: ship.x + o, y: ship.y - 14, vx: o * 2.2 }); }); fire = P.rate * (buff.rapid > 0 ? 0.5 : 1); }
      bullets.forEach(function (b) { b.y -= 470 * dt; b.x += (b.vx || 0) * dt; }); bullets = bullets.filter(function (b) { return b.y > -10; });
      var edge = false, low = 0;
      foes.forEach(function (f) { f.x += dir * speed * dt; if (f.x < 14 || f.x > W - 14) edge = true; if (f.y > low) low = f.y; });
      if (edge) { dir = -dir; foes.forEach(function (f) { f.y += 13; f.x += dir * 3; }); }
      efire -= dt;
      if (efire <= 0 && foes.length) { var f = foes[Math.floor(Math.random() * foes.length)]; shots.push({ x: f.x, y: f.y + 10 }); efire = rand(0.6, 1.4) * P.efire / (1 + wave * 0.07); }
      shots.forEach(function (s) { s.y += P.sb * dt; }); shots = shots.filter(function (s) { return s.y < H + 10; });
      ufoT -= dt; if (ufoT <= 0 && !ufo) { ufo = { x: -20, v: 70 }; ufoT = rand(16, 24); }
      if (ufo) { ufo.x += ufo.v * dt; if (ufo.x > W + 30) ufo = null; }
      bullets.forEach(function (b) {
        foes.forEach(function (f) { if (!f.dead && b.y > -50 && Math.abs(b.x - f.x) < 13 && Math.abs(b.y - f.y) < 11) { b.y = -99; f.hp--; if (f.hp <= 0) { f.dead = true; burst(f.x, f.y, f.hp <= 0 ? '#ffd9a0' : '#fff', 14); score += 10 + (4 - Math.min(4, f.r)) * 2; if (Math.random() < P.drop) drop(f.x, f.y); } } });
        if (ufo && Math.abs(b.x - ufo.x) < 18 && Math.abs(b.y - 26) < 10) { b.y = -99; score += 50; burst(ufo.x, 26, '#ff9aa8', 22, 110); drop(ufo.x, 30); ufo = null; msg = 'Bonus'; msgT = 0.9; }
      });
      foes = foes.filter(function (f) { return !f.dead; });
      shots.forEach(function (s) { if (ship.inv <= 0 && Math.abs(s.x - ship.x) < 14 && Math.abs(s.y - ship.y) < 12) { s.y = H + 99; lose(); } });
      pows.forEach(function (p) { p.y += 90 * dt; if (Math.abs(p.x - ship.x) < 20 && Math.abs(p.y - ship.y) < 18) { p.y = H + 99; if (p.k === 'shield') shield = true; else buff[p.k] = 9; msg = p.k === 'shield' ? 'Shield' : p.k === 'triple' ? 'Triple shot' : 'Rapid fire'; msgT = 1; } });
      pows = pows.filter(function (p) { return p.y < H + 20; });
      if (low > ship.y - 22) { lose(); foes.forEach(function (f) { f.y -= 90; }); }
      if (lives <= 0) { api.setBest(score); var keep = Math.max(0, wave - 3); reset(keep); msg = 'Rest a moment — again'; msgT = 2; }
      if (!foes.length) spawn();
      msgT = Math.max(0, msgT - dt);
      api.status('Score ' + score + ' · Best ' + Math.max(api.best(), score));
      var sh = shake > 0 ? (Math.random() - 0.5) * 6 : 0;
      ctx.save(); ctx.translate(sh, 0);
      clock += dt;
      ctx.drawImage(bg, -10, 0, W + 20, H);
      stars.forEach(function (s) { s[1] = (s[1] + s[2] * 7 * dt) % H; ctx.globalAlpha = (0.3 + s[2] * 0.3) * (0.7 + 0.3 * Math.sin(clock * 2 + s[0])); ctx.fillStyle = s[2] > 1.3 ? '#cfe3ff' : '#fff'; ctx.fillRect(s[0], s[1], s[2], s[2]); }); ctx.globalAlpha = 1;
      // the invaders: pixel-art sprites with a soft glow; armoured ones are gold. They flap on every step across.
      var fr = Math.floor(clock * speed / 14) % 2;
      foes.forEach(function (f) { var kind = f.r === 0 ? 'squid' : f.r < 3 ? 'crab' : 'octo', sp = sprite(kind, f.hp > 1 ? '#ffd27a' : ['#8fd3ff', '#9be8b5', '#f2c879', '#f08a9a', '#c9a6ff'][f.r % 5], fr); ctx.drawImage(sp, f.x - sp.width / 2 / SC, f.y - sp.height / 2 / SC - 2, sp.width / SC, sp.height / SC); });
      if (ufo) { ctx.save(); ctx.translate(ufo.x, 26); ctx.shadowColor = '#ff9aa8'; ctx.shadowBlur = 12; var g = ctx.createLinearGradient(0, -7, 0, 8); g.addColorStop(0, '#ffc2cc'); g.addColorStop(1, '#d4566d'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 19, 7, 0, 0, 7); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(190,235,255,.85)'; ctx.beginPath(); ctx.ellipse(0, -4, 8, 6, 0, Math.PI, 0); ctx.fill(); for (var u = -2; u <= 2; u++) { ctx.fillStyle = (Math.floor(clock * 6) + u) % 2 ? '#fff6c8' : '#ff7a90'; ctx.beginPath(); ctx.arc(u * 6.5, 1.5, 1.6, 0, 7); ctx.fill(); } ctx.restore(); }
      ctx.globalCompositeOperation = 'lighter';
      bullets.forEach(function (b) { var tg = ctx.createLinearGradient(0, b.y - 16, 0, b.y + 6); tg.addColorStop(0, 'rgba(255,214,120,0)'); tg.addColorStop(1, 'rgba(255,214,120,.75)'); ctx.fillStyle = tg; ctx.fillRect(b.x - 2.2, b.y - 16, 4.4, 22); ctx.fillStyle = '#fff6d8'; ctx.fillRect(b.x - 1, b.y - 8, 2, 11); });
      shots.forEach(function (s) { var wob = Math.sin(clock * 22 + s.y * 0.2) * 1.6; var rg = ctx.createRadialGradient(s.x + wob, s.y + 4, 0, s.x + wob, s.y + 4, 9); rg.addColorStop(0, 'rgba(255,200,215,.95)'); rg.addColorStop(0.35, 'rgba(255,110,140,.7)'); rg.addColorStop(1, 'rgba(255,90,120,0)'); ctx.fillStyle = rg; ctx.fillRect(s.x + wob - 9, s.y - 5, 18, 18); });
      ctx.globalCompositeOperation = 'source-over';
      pows.forEach(function (p) { var col = p.k === 'shield' ? '#8fd3ff' : p.k === 'triple' ? '#f2c879' : '#9be8b5', pul = 1 + 0.12 * Math.sin(clock * 6 + p.x); ctx.save(); ctx.translate(p.x, p.y); ctx.shadowColor = col; ctx.shadowBlur = 14; var pg = ctx.createRadialGradient(-3, -3, 1, 0, 0, 11 * pul); pg.addColorStop(0, '#fff'); pg.addColorStop(0.35, col); pg.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, 0, 10 * pul, 0, 7); ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 12.5 * pul, 0, 7); ctx.stroke(); ctx.fillStyle = '#0b1020'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.k === 'shield' ? 'S' : p.k === 'triple' ? '3' : 'R', 0, 0.5); ctx.restore(); });
      ctx.textBaseline = 'alphabetic';
      if (ship.inv <= 0 || Math.floor(ship.inv * 10) % 2) drawShip(ship.x, ship.y);
      if (shield) { var sr = 24 + Math.sin(clock * 5) * 1.2, sg = ctx.createRadialGradient(ship.x, ship.y, sr * 0.6, ship.x, ship.y, sr); sg.addColorStop(0, 'rgba(143,211,255,0)'); sg.addColorStop(1, 'rgba(143,211,255,.45)'); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(ship.x, ship.y, sr, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(190,230,255,.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ship.x, ship.y, sr, 0, 7); ctx.stroke(); }
      parts = parts.filter(function (p) { return p.t > 0; }); ctx.globalCompositeOperation = 'lighter';
      parts.forEach(function (p) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 40 * dt; var a = Math.max(0, p.t / p.l); ctx.globalAlpha = a; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.4 + a * 0.6), 0, 7); ctx.fill(); });
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      // HUD
      ctx.font = '600 13px -apple-system,sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#aeb6cc'; ctx.fillText('Wave ' + wave, 12, 21);
      for (var h = 0; h < Math.max(0, lives); h++) miniShip(W - 18 - h * 20, 16);
      if (buff.triple > 0 || buff.rapid > 0) { ctx.textAlign = 'center'; ctx.fillStyle = '#f2c879'; ctx.shadowColor = '#f2c879'; ctx.shadowBlur = 8; ctx.fillText((buff.triple > 0 ? 'Triple ' : '') + (buff.rapid > 0 ? 'Rapid' : ''), W / 2, 21); ctx.shadowBlur = 0; }
      if (msgT > 0) { ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(236,232,223,' + Math.min(1, msgT) + ')'; ctx.shadowColor = 'rgba(160,190,255,' + Math.min(0.8, msgT) + ')'; ctx.shadowBlur = 14; ctx.font = '22px Georgia,serif'; ctx.fillText(msg, W / 2, H / 2); ctx.shadowBlur = 0; }
      ctx.restore();
    });
    api.say('Drag to slide. It fires by itself.', 2400);
    return { stop: stop, restart: function () { reset(); }, peek: function () { return { foes: foes.length, lives: lives, score: score, wave: wave, x: ship.x, tx: ship.tx }; } };
  }

  // ---------------- Lights (puzzle) ----------------
  function lights(level, host, api) {
    var cfg = { easy: { n: [3, 3, 4], hints: 99, scr: 5 }, normal: { n: [4, 4, 5], hints: 3, scr: 8 }, hard: { n: [5, 5, 6], hints: 1, scr: 11 } }[level];
    K.css('lights', '.lt-wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1rem;gap:1rem}' +
      '.lt-info{color:var(--ink-muted);text-align:center;min-height:2.6rem;font-size:.95rem}.lt-board{display:grid;gap:.5rem;width:min(92%,380px);aspect-ratio:1;transition:opacity .4s}' +
      '.lt-cell{border:none;border-radius:12px;background:#1b2036;transition:background .2s,box-shadow .2s}.lt-cell.on{background:#d9a85a;box-shadow:0 0 14px rgba(242,200,121,.4)}' +
      '.lt-cell.hint{box-shadow:0 0 0 3px var(--sky),0 0 18px var(--sky)}');
    var solved = 0, n, grid, moves, par, hist, hintsLeft, wrap = K.el('div', 'lt-wrap'), info = K.el('div', 'lt-info'), board = K.el('div', 'lt-board'), hintCell = -1, bar = K.el('div', 'kit-bar');
    host.appendChild(wrap); wrap.appendChild(info); wrap.appendChild(board); wrap.appendChild(bar);
    function press(r, c) { [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var y = r + d[0], x = c + d[1]; if (y >= 0 && x >= 0 && y < n && x < n) grid[y][x] = !grid[y][x]; }); }
    // Gaussian elimination over GF(2): which cells to press to clear the board from here.
    function solution() {
      var N = n * n, M = [], i, j, r, c;
      for (i = 0; i < N; i++) { var row = new Array(N + 1).fill(0); r = Math.floor(i / n); c = i % n; row[N] = grid[r][c] ? 1 : 0; [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var y = r + d[0], x = c + d[1]; if (y >= 0 && x >= 0 && y < n && x < n) row[y * n + x] = 1; }); M.push(row); }
      var piv = [], rr = 0;
      for (var col = 0; col < N && rr < N; col++) {
        var p = -1; for (i = rr; i < N; i++) if (M[i][col]) { p = i; break; } if (p < 0) continue;
        var t = M[p]; M[p] = M[rr]; M[rr] = t;
        for (i = 0; i < N; i++) if (i !== rr && M[i][col]) for (j = col; j <= N; j++) M[i][j] ^= M[rr][j];
        piv.push(col); rr++;
      }
      var out = []; for (i = 0; i < piv.length; i++) if (M[i][N]) out.push(piv[i]); return out;
    }
    function fresh() {
      n = cfg.n[Math.min(2, Math.floor(solved / 3))]; grid = []; for (var r = 0; r < n; r++) { grid.push([]); for (var c = 0; c < n; c++) grid[r].push(false); }
      var k = cfg.scr + n; for (var i = 0; i < k; i++) press(Math.floor(Math.random() * n), Math.floor(Math.random() * n));
      if (!grid.some(function (row) { return row.some(Boolean); })) press(0, 0);
      par = solution().length; moves = 0; hist = []; hintsLeft = cfg.hints; hintCell = -1; draw();
    }
    function done() { return !grid.some(function (rr) { return rr.some(Boolean); }); }
    function draw() {
      board.style.gridTemplateColumns = 'repeat(' + n + ',1fr)'; board.innerHTML = '';
      grid.forEach(function (row, r) { row.forEach(function (on, c) { var b = K.el('button', 'lt-cell' + (on ? ' on' : '') + (hintCell === r * n + c ? ' hint' : '')); b.type = 'button'; b.setAttribute('aria-label', on ? 'lit' : 'dark'); b.addEventListener('click', function () { tap(r, c); }); board.appendChild(b); }); });
      info.textContent = 'Tap a cell to flip it and its neighbours. Turn every light off. · ' + moves + ' taps (' + par + ' is the fewest)';
      bar.innerHTML = '';
      bar.appendChild(K.btn('', 'Undo', function () { var h = hist.pop(); if (h) { press(h[0], h[1]); moves = Math.max(0, moves - 1); hintCell = -1; draw(); } }));
      var hb = K.btn('', hintsLeft > 50 ? 'Hint' : 'Hint (' + hintsLeft + ')', function () { if (hintsLeft <= 0 || done()) return; var s = solution(); if (s.length) { hintCell = s[0]; hintsLeft--; draw(); } }); hb.disabled = hintsLeft <= 0; bar.appendChild(hb);
      api.status('Solved ' + solved);
    }
    function tap(r, c) { press(r, c); hist.push([r, c]); moves++; hintCell = -1; draw(); if (done()) won(); }
    function won() {
      solved++; api.setBest(solved); api.cheer(moves <= par ? 90 : 50); var rating = moves <= par ? 'Perfect' : moves <= par + 2 ? 'Nicely done' : 'All dark'; info.textContent = rating + '. Again…'; board.style.opacity = '.4';
      setTimeout(function () { if (!alive) return; board.style.opacity = ''; fresh(); }, 1000);
    }
    var alive = true; fresh();
    return { stop: function () { alive = false; }, restart: function () { solved = 0; fresh(); } };
  }

  var DEFS = [
    { id: 'starwatch', title: 'Star Watch', blurb: 'Slide to move; it fires by itself. Catch the glowing pickups.', make: starWatch,
      levels: { easy: '5 lives, slow foes, lots of power-ups.', normal: '3 lives, steady waves.', hard: '2 lives, fast foes that shoot often.' }, bestLabel: function (b) { return 'Best ' + b; } },
    { id: 'pass', title: 'Hold the Pass', blurb: 'Ten places to defend, or a random one. Tap grass to build; tap a tower to upgrade or sell.', make: function (l, h, a) { return root.MannaPass.make(l, h, a); },
      levels: { easy: 'Lots of gold and lives, softer foes.', normal: 'A fair fight.', hard: 'Little gold, few lives, tougher foes.' }, bestLabel: function (b) { return 'Cleared ' + b + '/10'; } },
    { id: 'lights', title: 'Lights', blurb: 'Turn every light off. Each tap flips its neighbours too.', make: lights,
      levels: { easy: 'Small board, unlimited hints.', normal: '4×4 growing to 5×5, three hints.', hard: '5×5 growing to 6×6, one hint.' }, bestLabel: function (b) { return 'Solved ' + b; } }
  ];
  function reg(d) { return { id: d.id, title: d.title, blurb: d.blurb, start: function (box) { return K.run(box, d); } }; }
  root.MannaGames = { list: DEFS.map(reg), reg: reg };
})(typeof window !== 'undefined' ? window : globalThis);
