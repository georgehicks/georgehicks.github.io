/* Manna — three relaxed games. Each is start(box) -> { stop() }. No scores that sting, no game-over screens: when it ends it simply begins again. */
(function (root) {
  'use strict';

  function mkCanvas(box) {
    var cv = document.createElement('canvas'); box.appendChild(cv);
    var o = { cv: cv, ctx: cv.getContext('2d'), W: 0, H: 0 };
    o.size = function () {
      var r = box.getBoundingClientRect(), d = Math.min(2, root.devicePixelRatio || 1);
      o.W = Math.max(200, r.width); o.H = Math.max(260, r.height);
      cv.width = o.W * d; cv.height = o.H * d; cv.style.width = o.W + 'px'; cv.style.height = o.H + 'px';
      o.ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    o.size(); return o;
  }
  function loop(fn) {
    var raf = 0, last = 0, on = true;
    function tick(t) { if (!on) return; var dt = Math.min(0.05, (t - (last || t)) / 1000); last = t; fn(dt); raf = requestAnimationFrame(tick); }
    raf = requestAnimationFrame(tick);
    return function () { on = false; cancelAnimationFrame(raf); };
  }
  function rand(a, b) { return a + Math.random() * (b - a); }

  // ---------------- Star Watch (shooter) ----------------
  function starWatch(box) {
    var c = mkCanvas(box), ctx = c.ctx, W = c.W, H = c.H;
    var ship = { x: W / 2, tx: W / 2, y: H - 56, inv: 0 }, bullets = [], shots = [], foes = [], dir = 1, speed = 38, wave = 0, lives = 3, fire = 0, enemyFire = 1.2, msg = '', msgT = 0, stars = [], i;
    for (i = 0; i < 50; i++) stars.push([Math.random() * W, Math.random() * H, Math.random() * 1.4 + 0.3]);
    function spawn() {
      wave++; foes = []; dir = 1; speed = 34 + wave * 5;
      var cols = 7, rows = Math.min(5, 3 + Math.floor(wave / 3)), gap = Math.min(40, (W - 40) / cols);
      for (var r = 0; r < rows; r++) for (var q = 0; q < cols; q++) foes.push({ x: 30 + q * gap, y: 50 + r * 30, r: r });
      msg = 'Wave ' + wave; msgT = 1.6;
    }
    spawn();
    function move(e) { var r = c.cv.getBoundingClientRect(); ship.tx = Math.max(20, Math.min(W - 20, e.clientX - r.left)); }
    c.cv.addEventListener('pointerdown', move); c.cv.addEventListener('pointermove', move);
    c.cv.style.touchAction = 'none';
    var stop = loop(function (dt) {
      ship.x += (ship.tx - ship.x) * Math.min(1, dt * 14); ship.inv = Math.max(0, ship.inv - dt);
      fire -= dt; if (fire <= 0) { bullets.push({ x: ship.x, y: ship.y - 14 }); fire = 0.42; }
      bullets.forEach(function (b) { b.y -= 460 * dt; }); bullets = bullets.filter(function (b) { return b.y > -10; });
      var edge = false, low = 0;
      foes.forEach(function (f) { f.x += dir * speed * dt; if (f.x < 14 || f.x > W - 14) edge = true; if (f.y > low) low = f.y; });
      if (edge) { dir = -dir; foes.forEach(function (f) { f.y += 14; f.x += dir * 3; }); }
      enemyFire -= dt;
      if (enemyFire <= 0 && foes.length) { var f = foes[Math.floor(Math.random() * foes.length)]; shots.push({ x: f.x, y: f.y + 10 }); enemyFire = rand(0.7, 1.5) / (1 + wave * 0.08); }
      shots.forEach(function (s) { s.y += 170 * dt; }); shots = shots.filter(function (s) { return s.y < H + 10; });
      bullets.forEach(function (b) { foes.forEach(function (f) { if (!f.dead && Math.abs(b.x - f.x) < 13 && Math.abs(b.y - f.y) < 11) { f.dead = true; b.y = -99; } }); });
      foes = foes.filter(function (f) { return !f.dead; });
      shots.forEach(function (s) { if (ship.inv <= 0 && Math.abs(s.x - ship.x) < 14 && Math.abs(s.y - ship.y) < 12) { s.y = H + 99; lives--; ship.inv = 1.4; } });
      if (low > ship.y - 20) { lives--; ship.inv = 1.4; foes.forEach(function (f) { f.y -= 90; }); }
      if (lives <= 0) { lives = 3; wave = Math.max(0, wave - 2); shots = []; spawn(); msg = 'Again — gently'; msgT = 1.8; }
      if (!foes.length) spawn();
      msgT = Math.max(0, msgT - dt);
      ctx.fillStyle = '#060913'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff'; stars.forEach(function (s) { s[1] = (s[1] + s[2] * 6 * dt) % H; ctx.globalAlpha = 0.25 + s[2] * 0.3; ctx.fillRect(s[0], s[1], s[2], s[2]); }); ctx.globalAlpha = 1;
      foes.forEach(function (f) { ctx.fillStyle = ['#8fd3ff', '#9be8b5', '#f2c879', '#f08a9a', '#c9a6ff'][f.r % 5]; ctx.fillRect(f.x - 11, f.y - 7, 22, 12); ctx.fillRect(f.x - 14, f.y - 3, 28, 4); ctx.fillStyle = '#060913'; ctx.fillRect(f.x - 6, f.y - 4, 3, 3); ctx.fillRect(f.x + 3, f.y - 4, 3, 3); });
      ctx.fillStyle = '#ffe9a8'; bullets.forEach(function (b) { ctx.fillRect(b.x - 1.5, b.y - 8, 3, 10); });
      ctx.fillStyle = '#ff9aa8'; shots.forEach(function (s) { ctx.fillRect(s.x - 1.5, s.y, 3, 9); });
      if (ship.inv <= 0 || Math.floor(ship.inv * 10) % 2) { ctx.fillStyle = '#ecefff'; ctx.beginPath(); ctx.moveTo(ship.x, ship.y - 14); ctx.lineTo(ship.x + 14, ship.y + 10); ctx.lineTo(ship.x - 14, ship.y + 10); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = '#98a0b2'; ctx.font = '13px -apple-system,sans-serif'; ctx.textAlign = 'left'; ctx.fillText('Wave ' + wave, 12, 22); ctx.textAlign = 'right'; ctx.fillText('♥'.repeat(Math.max(0, lives)), W - 12, 22);
      if (msgT > 0) { ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(236,232,223,' + Math.min(1, msgT) + ')'; ctx.font = '20px Georgia,serif'; ctx.fillText(msg, W / 2, H / 2); }
    });
    return { stop: stop };
  }

  // ---------------- Hold the Pass (tower defense) ----------------
  function holdPass(box) {
    var c = mkCanvas(box), ctx = c.ctx, W = c.W, H = c.H - 48;
    var COLS = 7, ROWS = 10, cs = Math.min(W / COLS, H / ROWS), ox = (W - cs * COLS) / 2, oy = 6;
    var corners = [[0, 1], [5, 1], [5, 3], [1, 3], [1, 5], [5, 5], [5, 7], [1, 7], [1, 9], [6, 9]];
    var path = [], onPath = {}, i, j;
    for (i = 0; i < corners.length - 1; i++) {
      var a = corners[i], b = corners[i + 1], n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
      for (j = 0; j < n; j++) { var p = [a[0] + Math.sign(b[0] - a[0]) * j, a[1] + Math.sign(b[1] - a[1]) * j]; path.push(p); onPath[p[0] + ',' + p[1]] = 1; }
    }
    path.push(corners[corners.length - 1]); onPath[corners[corners.length - 1].join(',')] = 1;
    var hudY = Math.min(c.H - 56, oy + ROWS * cs + 18);
    function cx(col) { return ox + col * cs + cs / 2; } function cy(row) { return oy + row * cs + cs / 2; }
    var KINDS = { bolt: { cost: 25, range: 1.9, dmg: 3, rate: 0.7, col: '#f2c879', label: 'Bolt 25' }, frost: { cost: 35, range: 1.6, dmg: 1, rate: 1.1, col: '#8fd3ff', label: 'Frost 35' } };
    var gold = 70, lives = 12, wave = 0, enemies = [], towers = {}, bullets = [], toSpawn = 0, spawnT = 0, breakT = 4, pick = 'bolt', msg = 'Place a tower', msgT = 3, hp0 = 8;
    var bar = document.createElement('div'); bar.className = 'td-bar';
    Object.keys(KINDS).forEach(function (k) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = KINDS[k].label; b.dataset.k = k;
      b.addEventListener('click', function () { pick = k; mark(); }); bar.appendChild(b);
    });
    function mark() { [].forEach.call(bar.children, function (b) { b.classList.toggle('on', b.dataset.k === pick); }); }
    mark(); box.appendChild(bar);
    c.cv.addEventListener('pointerdown', function (e) {
      var r = c.cv.getBoundingClientRect(), col = Math.floor((e.clientX - r.left - ox) / cs), row = Math.floor((e.clientY - r.top - oy) / cs), key = col + ',' + row;
      if (col < 0 || row < 0 || col >= COLS || row >= ROWS || onPath[key]) return;
      var t = towers[key];
      if (t) { var up = 25 * t.lvl; if (t.lvl < 3 && gold >= up) { gold -= up; t.lvl++; msg = 'Stronger'; msgT = 0.8; } return; }
      var k = KINDS[pick]; if (gold < k.cost) { msg = 'Not yet — gold comes with time'; msgT = 1.2; return; }
      gold -= k.cost; towers[key] = { col: col, row: row, kind: pick, lvl: 1, cd: 0 };
    });
    function startWave() { wave++; toSpawn = 5 + wave * 2; hp0 = 7 + wave * 4; spawnT = 0; msg = 'Wave ' + wave; msgT = 1.5; }
    var goldT = 0;
    var stop = loop(function (dt) {
      goldT += dt; if (goldT > 2.5) { goldT = 0; gold += 2; }
      if (toSpawn > 0) { spawnT -= dt; if (spawnT <= 0) { enemies.push({ d: 0, hp: hp0, max: hp0, slow: 0, spd: 0.9 + Math.min(0.9, wave * 0.04) }); toSpawn--; spawnT = 0.95; } }
      else if (!enemies.length) { breakT -= dt; if (breakT <= 0) { startWave(); breakT = 5; } }
      enemies.forEach(function (e) { e.slow = Math.max(0, e.slow - dt); e.d += dt * e.spd * (e.slow > 0 ? 0.45 : 1); });
      enemies = enemies.filter(function (e) { if (e.d >= path.length - 1) { lives--; return false; } if (e.hp <= 0) { gold += 4; return false; } return true; });
      if (lives <= 0) { lives = 12; enemies = []; toSpawn = 0; breakT = 3; msg = 'The pass held — rebuild'; msgT = 2; }
      function pos(e) { var k = Math.floor(e.d), f = e.d - k, a = path[Math.min(k, path.length - 1)], b = path[Math.min(k + 1, path.length - 1)]; return [cx(a[0] + (b[0] - a[0]) * f), cy(a[1] + (b[1] - a[1]) * f)]; }
      Object.keys(towers).forEach(function (key) {
        var t = towers[key], k = KINDS[t.kind]; t.cd -= dt; if (t.cd > 0) return;
        var best = null, bd = 1e9, tx = cx(t.col), ty = cy(t.row);
        enemies.forEach(function (e) { var p = pos(e), d = Math.hypot(p[0] - tx, p[1] - ty); if (d < k.range * cs && d < bd) { bd = d; best = e; } });
        if (best) { t.cd = k.rate; var p2 = pos(best); bullets.push({ x: tx, y: ty, e: best, col: k.col, dmg: k.dmg + (t.kind === 'bolt' ? (t.lvl - 1) * 2 : (t.lvl - 1) * 0.5), frost: t.kind === 'frost' }); }
      });
      bullets.forEach(function (b) {
        var p = pos(b.e), dx = p[0] - b.x, dy = p[1] - b.y, d = Math.hypot(dx, dy);
        if (d < 8) { b.e.hp -= b.dmg; if (b.frost) b.e.slow = 1.6; b.dead = true; } else { b.x += dx / d * 340 * dt; b.y += dy / d * 340 * dt; }
      });
      bullets = bullets.filter(function (b) { return !b.dead && b.e.hp > 0; });
      msgT = Math.max(0, msgT - dt);
      ctx.fillStyle = '#10141f'; ctx.fillRect(0, 0, c.W, c.H);
      for (var r = 0; r < ROWS; r++) for (var q = 0; q < COLS; q++) { ctx.fillStyle = onPath[q + ',' + r] ? '#3a3326' : ((q + r) % 2 ? '#162033' : '#141c2d'); ctx.fillRect(ox + q * cs, oy + r * cs, cs - 1, cs - 1); }
      Object.keys(towers).forEach(function (key) { var t = towers[key], k = KINDS[t.kind]; ctx.fillStyle = k.col; ctx.beginPath(); ctx.arc(cx(t.col), cy(t.row), cs * (0.26 + t.lvl * 0.04), 0, 7); ctx.fill(); ctx.fillStyle = '#10141f'; ctx.font = (cs * 0.3) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(t.lvl, cx(t.col), cy(t.row) + cs * 0.1); });
      enemies.forEach(function (e) { var p = pos(e); ctx.fillStyle = e.slow > 0 ? '#9bd7ff' : '#e9788a'; ctx.beginPath(); ctx.arc(p[0], p[1], cs * 0.22, 0, 7); ctx.fill(); ctx.fillStyle = '#0006'; ctx.fillRect(p[0] - 10, p[1] - cs * 0.34, 20, 3); ctx.fillStyle = '#9be8b5'; ctx.fillRect(p[0] - 10, p[1] - cs * 0.34, 20 * Math.max(0, e.hp / e.max), 3); });
      ctx.fillStyle = '#fff'; bullets.forEach(function (b) { ctx.fillStyle = b.col; ctx.fillRect(b.x - 2, b.y - 2, 4, 4); });
      ctx.fillStyle = '#98a0b2'; ctx.font = '13px -apple-system,sans-serif'; ctx.textAlign = 'left'; ctx.fillText('◆ ' + Math.floor(gold), 10, hudY); ctx.textAlign = 'center'; ctx.fillText('Wave ' + Math.max(1, wave), c.W / 2, hudY); ctx.textAlign = 'right'; ctx.fillText('♥ ' + lives, c.W - 10, hudY);
      if (msgT > 0) { ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(236,232,223,' + Math.min(1, msgT) + ')'; ctx.font = '18px Georgia,serif'; ctx.fillText(msg, c.W / 2, c.H / 2); }
    });
    return { stop: function () { stop(); if (bar.parentNode) bar.parentNode.removeChild(bar); } };
  }

  // ---------------- Lights (puzzle) ----------------
  function lights(box) {
    var n = 4, solved = 0, grid = [], moves = 0, wrap = document.createElement('div'); wrap.className = 'lt-wrap'; box.appendChild(wrap);
    var info = document.createElement('div'); info.className = 'lt-info'; var board = document.createElement('div'); board.className = 'lt-board'; wrap.appendChild(info); wrap.appendChild(board);
    function press(r, c, rec) { [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var y = r + d[0], x = c + d[1]; if (y >= 0 && x >= 0 && y < n && x < n) grid[y][x] = !grid[y][x]; }); }
    function fresh() {
      grid = []; for (var r = 0; r < n; r++) { grid.push([]); for (var c = 0; c < n; c++) grid[r].push(false); }
      var k = 3 + n; for (var i = 0; i < k; i++) press(Math.floor(Math.random() * n), Math.floor(Math.random() * n));
      if (grid.every(function (row) { return row.every(function (x) { return !x; }); })) press(0, 0);
      moves = 0; draw();
    }
    function draw() {
      board.style.gridTemplateColumns = 'repeat(' + n + ',1fr)'; board.innerHTML = '';
      var lit = 0; grid.forEach(function (row, r) { row.forEach(function (on, c) { if (on) lit++; var b = document.createElement('button'); b.type = 'button'; b.className = 'lt-cell' + (on ? ' on' : ''); b.setAttribute('aria-label', on ? 'lit' : 'dark'); b.addEventListener('click', function () { press(r, c); moves++; draw(); if (!grid.some(function (rr) { return rr.some(Boolean); })) won(); }); board.appendChild(b); }); });
      info.textContent = solved ? 'Lit ' + solved + ' · ' + moves + ' taps' : 'Tap a cell to flip it and its neighbours. Turn them all off.';
    }
    function won() { solved++; info.textContent = 'All dark. Again…'; board.style.opacity = '.4'; setTimeout(function () { board.style.opacity = ''; if (solved % 3 === 0 && n < 6) n++; fresh(); }, 900); }
    fresh();
    return { stop: function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); } };
  }

  root.MannaGames = {
    list: [
      { id: 'starwatch', title: 'Star Watch', blurb: 'Slide to move; it fires by itself. A gentle old-school shooter.', start: starWatch },
      { id: 'pass', title: 'Hold the Pass', blurb: 'Tap to build towers along the road. Relaxed tower defense — waves keep coming.', start: holdPass },
      { id: 'lights', title: 'Lights', blurb: 'Turn every light off. Each tap flips its neighbours too.', start: lights }
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
