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
    reset();
    function move(e) { if (!drag) return; var r = c.cv.getBoundingClientRect(); ship.tx = Math.max(18, Math.min(W - 18, drag.sx + (e.clientX - drag.x) * 1.25)); }
    c.cv.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, sx: ship.tx }; try { c.cv.setPointerCapture(e.pointerId); } catch (x) {} });
    c.cv.addEventListener('pointermove', move);
    c.cv.addEventListener('pointerup', function () { drag = null; }); c.cv.addEventListener('pointercancel', function () { drag = null; });
    function drop(x, y, kind) { pows.push({ x: x, y: y, k: kind || ['triple', 'rapid', 'shield'][Math.floor(Math.random() * 3)] }); }
    function lose() { lives--; ship.inv = 1.5; shake = 0.3; if (shield) { shield = false; lives++; } }
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
        foes.forEach(function (f) { if (!f.dead && b.y > -50 && Math.abs(b.x - f.x) < 13 && Math.abs(b.y - f.y) < 11) { b.y = -99; f.hp--; if (f.hp <= 0) { f.dead = true; score += 10 + (4 - Math.min(4, f.r)) * 2; if (Math.random() < P.drop) drop(f.x, f.y); } } });
        if (ufo && Math.abs(b.x - ufo.x) < 18 && Math.abs(b.y - 26) < 10) { b.y = -99; score += 50; drop(ufo.x, 30); ufo = null; msg = 'Bonus'; msgT = 0.9; }
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
      ctx.fillStyle = '#060913'; ctx.fillRect(-10, 0, W + 20, H);
      ctx.fillStyle = '#fff'; stars.forEach(function (s) { s[1] = (s[1] + s[2] * 6 * dt) % H; ctx.globalAlpha = 0.25 + s[2] * 0.3; ctx.fillRect(s[0], s[1], s[2], s[2]); }); ctx.globalAlpha = 1;
      foes.forEach(function (f) { ctx.fillStyle = f.hp > 1 ? '#ffd27a' : ['#8fd3ff', '#9be8b5', '#f2c879', '#f08a9a', '#c9a6ff'][f.r % 5]; ctx.fillRect(f.x - 11, f.y - 7, 22, 12); ctx.fillRect(f.x - 14, f.y - 3, 28, 4); ctx.fillStyle = '#060913'; ctx.fillRect(f.x - 6, f.y - 4, 3, 3); ctx.fillRect(f.x + 3, f.y - 4, 3, 3); });
      if (ufo) { ctx.fillStyle = '#ff9aa8'; ctx.beginPath(); ctx.ellipse(ufo.x, 26, 18, 7, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#ffd6dc'; ctx.beginPath(); ctx.ellipse(ufo.x, 21, 8, 6, 0, Math.PI, 0); ctx.fill(); }
      ctx.fillStyle = '#ffe9a8'; bullets.forEach(function (b) { ctx.fillRect(b.x - 1.5, b.y - 8, 3, 10); });
      ctx.fillStyle = '#ff9aa8'; shots.forEach(function (s) { ctx.fillRect(s.x - 1.5, s.y, 3, 9); });
      pows.forEach(function (p) { ctx.fillStyle = p.k === 'shield' ? '#8fd3ff' : p.k === 'triple' ? '#f2c879' : '#9be8b5'; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, 7); ctx.fill(); ctx.fillStyle = '#06080f'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(p.k === 'shield' ? 'S' : p.k === 'triple' ? '3' : 'R', p.x, p.y + 4); });
      if (ship.inv <= 0 || Math.floor(ship.inv * 10) % 2) { ctx.fillStyle = '#ecefff'; ctx.beginPath(); ctx.moveTo(ship.x, ship.y - 14); ctx.lineTo(ship.x + 14, ship.y + 10); ctx.lineTo(ship.x - 14, ship.y + 10); ctx.closePath(); ctx.fill(); }
      if (shield) { ctx.strokeStyle = 'rgba(143,211,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ship.x, ship.y, 22, 0, 7); ctx.stroke(); }
      ctx.fillStyle = '#98a0b2'; ctx.font = '13px -apple-system,sans-serif'; ctx.textAlign = 'left'; ctx.fillText('Wave ' + wave, 12, 20); ctx.textAlign = 'right'; ctx.fillText('♥'.repeat(Math.max(0, lives)), W - 12, 20);
      if (buff.triple > 0 || buff.rapid > 0) { ctx.textAlign = 'center'; ctx.fillStyle = '#f2c879'; ctx.fillText((buff.triple > 0 ? 'Triple ' : '') + (buff.rapid > 0 ? 'Rapid' : ''), W / 2, 20); }
      if (msgT > 0) { ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(236,232,223,' + Math.min(1, msgT) + ')'; ctx.font = '20px Georgia,serif'; ctx.fillText(msg, W / 2, H / 2); }
      ctx.restore();
    });
    api.say('Drag to slide. It fires by itself.', 2400);
    return { stop: stop, restart: function () { reset(); } };
  }

  // ---------------- Hold the Pass (tower defense) ----------------
  function holdPass(level, host, api) {
    var P = { easy: { gold: 130, lives: 20, hp: 0.75, inc: 3 }, normal: { gold: 80, lives: 12, hp: 1, inc: 2 }, hard: { gold: 55, lives: 8, hp: 1.3, inc: 1.5 } }[level];
    var bar = K.el('div', 'kit-bar'); host.appendChild(bar);
    bar.style.cssText = 'position:absolute;left:0;right:0;bottom:0;background:#0a0d18;z-index:2';
    var c = K.canvas(host), W = c.W, H = c.H - 54;
    var ctx = c.ctx, COLS = 7, ROWS = 10, cs = Math.min(W / COLS, (H - 30) / ROWS), ox = (W - cs * COLS) / 2, oy = 6;
    var corners = [[0, 1], [5, 1], [5, 3], [1, 3], [1, 5], [5, 5], [5, 7], [1, 7], [1, 9], [6, 9]], path = [], onPath = {}, i, j;
    for (i = 0; i < corners.length - 1; i++) { var a = corners[i], b = corners[i + 1], n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); for (j = 0; j < n; j++) { var p = [a[0] + Math.sign(b[0] - a[0]) * j, a[1] + Math.sign(b[1] - a[1]) * j]; path.push(p); onPath[p[0] + ',' + p[1]] = 1; } }
    path.push(corners[corners.length - 1]); onPath[corners[corners.length - 1].join(',')] = 1;
    var hudY = Math.min(H - 6, oy + ROWS * cs + 16);
    function cx(col) { return ox + col * cs + cs / 2; } function cy(row) { return oy + row * cs + cs / 2; }
    var KINDS = {
      bolt: { cost: 25, range: 1.9, dmg: 3, rate: 0.7, col: '#f2c879', label: 'Bolt 25' },
      frost: { cost: 35, range: 1.6, dmg: 1, rate: 1.1, col: '#8fd3ff', label: 'Frost 35' },
      burst: { cost: 55, range: 1.7, dmg: 2, rate: 1.5, col: '#e9788a', label: 'Burst 55', splash: 0.85 }
    };
    var gold, lives, wave, enemies, towers, bullets, toSpawn, spawnT, breakT, pick, msg, msgT, hp0, sel, mixN, fast, goldT;
    function reset() { gold = P.gold; lives = P.lives; wave = 0; enemies = []; towers = {}; bullets = []; toSpawn = 0; spawnT = 0; breakT = 5; pick = 'bolt'; msg = 'Place a tower on the grass'; msgT = 3.5; hp0 = 8; sel = null; mixN = 0; fast = 1; goldT = 0; renderBar(); }
    function upCost(t) { return Math.round(KINDS[t.kind].cost * 0.7 * t.lvl); }
    function sellVal(t) { return Math.round(t.spent * 0.6); }
    function renderBar() {
      bar.innerHTML = '';
      if (sel && towers[sel]) {
        var t = towers[sel];
        var up = K.btn('', t.lvl >= 3 ? 'Maxed' : 'Upgrade ' + upCost(t), function () { if (t.lvl < 3 && gold >= upCost(t)) { gold -= upCost(t); t.spent += upCost(t); t.lvl++; msg = 'Stronger'; msgT = 0.8; renderBar(); } else if (t.lvl < 3) { msg = 'Not enough yet'; msgT = 1; } });
        up.disabled = t.lvl >= 3;
        bar.appendChild(up);
        bar.appendChild(K.btn('', 'Sell +' + sellVal(t), function () { gold += sellVal(t); delete towers[sel]; sel = null; renderBar(); }));
        bar.appendChild(K.btn('', 'Done', function () { sel = null; renderBar(); }));
      } else {
        Object.keys(KINDS).forEach(function (k) { var b = K.btn(pick === k ? 'on' : '', KINDS[k].label, function () { pick = k; renderBar(); }); bar.appendChild(b); });
        bar.appendChild(K.btn(fast > 1 ? 'on' : '', '×' + fast, function () { fast = fast > 1 ? 1 : 2; renderBar(); }));
      }
    }
    reset();
    c.cv.addEventListener('pointerdown', function (e) {
      var r = c.cv.getBoundingClientRect(), col = Math.floor((e.clientX - r.left - ox) / cs), row = Math.floor((e.clientY - r.top - oy) / cs), key = col + ',' + row;
      if (col < 0 || row < 0 || col >= COLS || row >= ROWS || onPath[key]) { sel = null; renderBar(); return; }
      if (towers[key]) { sel = key; renderBar(); return; }
      sel = null; var k = KINDS[pick]; if (gold < k.cost) { msg = 'Not yet — gold comes with time'; msgT = 1.2; renderBar(); return; }
      gold -= k.cost; towers[key] = { col: col, row: row, kind: pick, lvl: 1, cd: 0, spent: k.cost }; renderBar();
    });
    function startWave() {
      wave++; toSpawn = 5 + wave * 2; hp0 = (7 + wave * 4) * P.hp; spawnT = 0; msg = 'Wave ' + wave + (wave % 5 === 0 ? ' — heavy' : wave % 3 === 0 ? ' — fast' : ''); msgT = 1.6; api.setBest(wave - 1);
    }
    function pos(e) { var k = Math.floor(e.d), f = e.d - k, a = path[Math.min(k, path.length - 1)], b = path[Math.min(k + 1, path.length - 1)]; return [cx(a[0] + (b[0] - a[0]) * f), cy(a[1] + (b[1] - a[1]) * f)]; }
    var stop = K.loop(function (rdt) {
      var steps = fast, dt = rdt;
      for (var s = 0; s < steps; s++) tick(dt);
      draw();
    });
    function tick(dt) {
      goldT += dt; if (goldT > 2.5) { goldT = 0; gold += P.inc; }
      if (toSpawn > 0) {
        spawnT -= dt;
        if (spawnT <= 0) {
          var kind = 'norm'; if (wave % 5 === 0 && toSpawn % 3 === 0) kind = 'tank'; else if (wave % 3 === 0 && toSpawn % 2 === 0) kind = 'fast';
          var hp = kind === 'tank' ? hp0 * 2.6 : kind === 'fast' ? hp0 * 0.55 : hp0, spd = (0.9 + Math.min(0.9, wave * 0.04)) * (kind === 'tank' ? 0.7 : kind === 'fast' ? 1.7 : 1);
          enemies.push({ d: 0, hp: hp, max: hp, slow: 0, spd: spd, kind: kind }); toSpawn--; spawnT = kind === 'fast' ? 0.55 : 0.95;
        }
      } else if (!enemies.length) { breakT -= dt; if (breakT <= 0) { startWave(); breakT = 5; } }
      enemies.forEach(function (e) { e.slow = Math.max(0, e.slow - dt); e.d += dt * e.spd * (e.slow > 0 ? 0.45 : 1); });
      enemies = enemies.filter(function (e) { if (e.d >= path.length - 1) { lives--; return false; } if (e.hp <= 0) { gold += e.kind === 'tank' ? 8 : 4; return false; } return true; });
      if (lives <= 0) { api.setBest(wave - 1); msg = 'The pass fell on wave ' + wave + ' — rebuild'; reset(); msgT = 2.6; return; }
      Object.keys(towers).forEach(function (key) {
        var t = towers[key], k = KINDS[t.kind]; t.cd -= dt; if (t.cd > 0) return;
        var best = null, bd = 1e9, tx = cx(t.col), ty = cy(t.row), rng = k.range * cs * (1 + (t.lvl - 1) * 0.08);
        enemies.forEach(function (e) { var p = pos(e), d = Math.hypot(p[0] - tx, p[1] - ty); if (d < rng && (best === null || e.d > best.d)) { best = e; bd = d; } });
        if (best) { t.cd = k.rate; bullets.push({ x: tx, y: ty, e: best, col: k.col, kind: t.kind, dmg: k.dmg + (t.kind === 'frost' ? (t.lvl - 1) * 0.5 : (t.lvl - 1) * 1.6) }); }
      });
      bullets.forEach(function (b) {
        if (b.e.hp <= 0) { b.dead = true; return; }
        var p = pos(b.e), dx = p[0] - b.x, dy = p[1] - b.y, d = Math.hypot(dx, dy);
        if (d < 9) {
          b.dead = true;
          if (b.kind === 'burst') { enemies.forEach(function (e) { var q = pos(e); if (Math.hypot(q[0] - p[0], q[1] - p[1]) < KINDS.burst.splash * cs) e.hp -= b.dmg; }); b.boom = 0.25; booms.push({ x: p[0], y: p[1], t: 0.25 }); }
          else { b.e.hp -= b.dmg; if (b.kind === 'frost') b.e.slow = 1.6; }
        } else { b.x += dx / d * 360 * dt; b.y += dy / d * 360 * dt; }
      });
      bullets = bullets.filter(function (b) { return !b.dead; });
      booms.forEach(function (m) { m.t -= dt; }); booms = booms.filter(function (m) { return m.t > 0; });
      msgT = Math.max(0, msgT - dt);
    }
    var booms = [];
    function draw() {
      ctx.fillStyle = '#10141f'; ctx.fillRect(0, 0, W, H + 54);
      for (var r = 0; r < ROWS; r++) for (var q = 0; q < COLS; q++) { ctx.fillStyle = onPath[q + ',' + r] ? '#3a3326' : ((q + r) % 2 ? '#162033' : '#141c2d'); ctx.fillRect(ox + q * cs, oy + r * cs, cs - 1, cs - 1); }
      var st = sel && towers[sel];
      if (st) { var kk = KINDS[st.kind]; ctx.strokeStyle = 'rgba(242,200,121,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx(st.col), cy(st.row), kk.range * cs * (1 + (st.lvl - 1) * 0.08), 0, 7); ctx.stroke(); }
      Object.keys(towers).forEach(function (key) { var t = towers[key], k = KINDS[t.kind]; ctx.fillStyle = k.col; ctx.beginPath(); ctx.arc(cx(t.col), cy(t.row), cs * (0.26 + t.lvl * 0.04), 0, 7); ctx.fill(); if (key === sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); } ctx.fillStyle = '#10141f'; ctx.font = (cs * 0.3) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(t.lvl, cx(t.col), cy(t.row) + cs * 0.1); });
      enemies.forEach(function (e) { var p = pos(e), rr = cs * (e.kind === 'tank' ? 0.3 : e.kind === 'fast' ? 0.16 : 0.22); ctx.fillStyle = e.slow > 0 ? '#9bd7ff' : e.kind === 'tank' ? '#b8506a' : e.kind === 'fast' ? '#f0a35c' : '#e9788a'; ctx.beginPath(); ctx.arc(p[0], p[1], rr, 0, 7); ctx.fill(); ctx.fillStyle = '#0006'; ctx.fillRect(p[0] - 10, p[1] - cs * 0.36, 20, 3); ctx.fillStyle = '#9be8b5'; ctx.fillRect(p[0] - 10, p[1] - cs * 0.36, 20 * Math.max(0, e.hp / e.max), 3); });
      bullets.forEach(function (b) { ctx.fillStyle = b.col; ctx.fillRect(b.x - 2, b.y - 2, 4, 4); });
      booms.forEach(function (m) { ctx.strokeStyle = 'rgba(233,120,138,' + (m.t * 4) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(m.x, m.y, KINDS.burst.splash * cs * (1 - m.t * 2), 0, 7); ctx.stroke(); });
      ctx.fillStyle = '#98a0b2'; ctx.font = '13px -apple-system,sans-serif'; ctx.textAlign = 'left'; ctx.fillText('◆ ' + Math.floor(gold), 10, hudY); ctx.textAlign = 'center'; ctx.fillText(wave ? 'Wave ' + wave : 'Next wave ' + Math.ceil(breakT) + 's', W / 2, hudY); ctx.textAlign = 'right'; ctx.fillText('♥ ' + lives, W - 10, hudY);
      if (msgT > 0) { ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(236,232,223,' + Math.min(1, msgT) + ')'; ctx.font = '18px Georgia,serif'; ctx.fillText(msg, W / 2, H / 2); }
    }
    api.status('Best wave ' + api.best());
    return { stop: function () { stop(); }, restart: reset };
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
      solved++; api.setBest(solved); var rating = moves <= par ? 'Perfect' : moves <= par + 2 ? 'Nicely done' : 'All dark'; info.textContent = rating + '. Again…'; board.style.opacity = '.4';
      setTimeout(function () { if (!alive) return; board.style.opacity = ''; fresh(); }, 1000);
    }
    var alive = true; fresh();
    return { stop: function () { alive = false; }, restart: function () { solved = 0; fresh(); } };
  }

  var DEFS = [
    { id: 'starwatch', title: 'Star Watch', blurb: 'Slide to move; it fires by itself. Catch the glowing pickups.', make: starWatch,
      levels: { easy: '5 lives, slow foes, lots of power-ups.', normal: '3 lives, steady waves.', hard: '2 lives, fast foes that shoot often.' }, bestLabel: function (b) { return 'Best ' + b; } },
    { id: 'pass', title: 'Hold the Pass', blurb: 'Tap grass to build towers along the road. Tap a tower to upgrade or sell.', make: holdPass,
      levels: { easy: 'Lots of gold and lives, softer foes.', normal: 'A fair fight.', hard: 'Little gold, few lives, tougher foes.' }, bestLabel: function (b) { return 'Wave ' + b; } },
    { id: 'lights', title: 'Lights', blurb: 'Turn every light off. Each tap flips its neighbours too.', make: lights,
      levels: { easy: 'Small board, unlimited hints.', normal: '4×4 growing to 5×5, three hints.', hard: '5×5 growing to 6×6, one hint.' }, bestLabel: function (b) { return 'Solved ' + b; } }
  ];
  function reg(d) { return { id: d.id, title: d.title, blurb: d.blurb, start: function (box) { return K.run(box, d); } }; }
  root.MannaGames = { list: DEFS.map(reg), reg: reg };
})(typeof window !== 'undefined' ? window : globalThis);
