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

  // ---------------- Treasuring (a small version of the Treasuring app) ----------------
  // Place your heart with Jesus; then what falls (worries, thanks, people, lies) is given to the bucket it belongs in. No score, no failing: a wrong bucket just sends it back with a hint.
  var TR = {
    worry: ['Money', 'My health', 'A conversation I’m dreading', 'The work waiting for me', 'The future', 'What someone thinks of me', 'A deadline', 'Being behind', 'Tightness in my chest', 'Shame', 'Dread', 'The urge to check', 'Restlessness', 'Loneliness', 'Heaviness', 'Weariness'],
    thanks: ['A meal', 'Breath in my lungs', 'Someone who was kind', 'The quiet right now', 'A bed to sleep in', 'Light through a window', 'A friend', 'That He is near', 'Forgiveness', 'Something that went right today'],
    person: ['A family member', 'A friend who is hurting', 'Someone who is sick', 'Someone hard to love', 'A leader over me', 'A neighbor'],
    lie: [
      { t: 'It all depends on me.', truth: 'The outcome is His. I do my part, and He carries the rest.', ref: 'Proverbs 16:9; 1 Peter 5:7' },
      { t: 'God will not provide for me.', truth: 'My Father knows what I need, and He gives it.', ref: 'Matthew 6:31–33' },
      { t: 'I am alone in this.', truth: 'He is with me always, and He will not leave me.', ref: 'Matthew 28:20' },
      { t: 'If they really knew me, they would turn away.', truth: 'I am fully known and fully loved. In Christ there is no condemnation.', ref: 'Romans 8:1' },
      { t: 'I am not enough.', truth: 'His power is made perfect in weakness. He is enough.', ref: '2 Corinthians 12:9' },
      { t: 'God has forgotten me.', truth: 'He cares for me, and He does not forget His own.', ref: 'Isaiah 49:15' },
      { t: 'The worst is coming, and I cannot face it.', truth: 'He goes before me. Tomorrow has its own worries, and He is already there.', ref: 'Matthew 6:34' },
      { t: 'I will lose the ones I love.', truth: 'They are in His hands, and He cares for them more than I can.', ref: 'Matthew 10:29–31' }
    ]
  };
  var TR_BUCKETS = [
    { id: 'worry', label: 'Release', line: 'Father, into your hands.' },
    { id: 'thanks', label: 'Thanks', line: 'Father, thank you.' },
    { id: 'person', label: 'Pray', line: 'Father, I pray for them now.' },
    { id: 'lie', label: 'Lies', line: 'Jesus, I put this lie down.' }
  ];
  var TR_HINT = { worry: 'That one goes into His hands.', thanks: 'A thank-you. The chest.', person: 'A person. Pray for them.', lie: 'That is a lie. Put it down.' };

  function treasuring(box) {
    var c = mkCanvas(box), ctx = c.ctx, W = c.W, H = c.H, cv = c.cv; cv.style.touchAction = 'none';
    var DOCKH = 66, dockY = H - DOCKH - 20, discX = W / 2, discY = Math.min(112, H * 0.2), discR = 27;
    var bw = (W - 24 - 30) / 4, buckets = TR_BUCKETS.map(function (b, i) { return { id: b.id, label: b.label, line: b.line, x: 12 + i * (bw + 10), y: dockY, w: bw, h: DOCKH }; });
    var heart = { x: W * 0.22, y: H * 0.6, hx: W * 0.22, hy: H * 0.6, placed: false }, items = [], parts = [], held = null, drag = null, msg = null, tm = 0, spawnT = 1, given = 0, tipOn = true, i;
    var stars = []; for (i = 0; i < 40; i++) stars.push([Math.random() * W, Math.random() * H * 0.8, Math.random() * 1.3 + 0.3, Math.random() * 6]);
    var order = []; function nextKind() { if (!order.length) order = ['worry', 'thanks', 'worry', 'person', 'lie', 'worry', 'thanks', 'lie', 'person'].sort(function () { return Math.random() - 0.5; }); return order.shift(); }
    function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
    function wrap(text, maxW, font) {
      ctx.font = font; var words = text.split(' '), lines = [], cur = '';
      words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
      if (cur) lines.push(cur); return lines;
    }
    function spawn() {
      var kind = nextKind(), src = TR[kind], pick = src[Math.floor(Math.random() * src.length)], text = kind === 'lie' ? pick.t : pick, f = '14px Georgia,serif';
      var lines = wrap(text, Math.min(220, W - 70), f), w = 0; lines.forEach(function (l) { w = Math.max(w, ctx.measureText(l).width); });
      w += 26; var h = lines.length * 18 + 14, bx = rand(w / 2 + 10, W - w / 2 - 10);
      items.push({ kind: kind, text: text, data: kind === 'lie' ? pick : null, lines: lines, w: w, h: h, bx: bx, x: bx, y: discY + discR + 36, ph: Math.random() * 6, a: 0, state: 'fall' });
    }
    function say(lines, secs) { msg = { lines: lines, t: secs || 2.8, max: secs || 2.8 }; }
    function bucketAt(x, y) { for (var k = 0; k < buckets.length; k++) { var b = buckets[k]; if (x >= b.x - 4 && x <= b.x + b.w + 4 && y >= b.y - 8 && y <= b.y + b.h + 10) return b; } return null; }
    function hitItem(x, y) { for (var k = items.length - 1; k >= 0; k--) { var it = items[k]; if (it.state !== 'gone' && Math.abs(x - it.x) < it.w / 2 + 8 && Math.abs(y - it.y) < it.h / 2 + 8) return it; } return null; }
    function free(it) { it.state = 'fall'; it.bx = it.x - Math.sin(tm * 0.6 + it.ph) * 10; if (held === it) held = null; }
    function give(it, b) {
      if (b.id === it.kind) {
        it.state = 'gone'; if (held === it) held = null; given++; tipOn = false;
        var line = b.id === 'person' ? 'Father, I pray for ' + lowerFirst(it.text) + ' now.' : b.line;
        var ls = [{ t: line, size: 19, color: '#F2C879', font: 'italic' }];
        if (it.data) { ls.push({ t: 'The truth:', size: 12, color: '#98a0b2', font: '' }); wrap(it.data.truth, W - 36, '16px Georgia,serif').forEach(function (l) { ls.push({ t: l, size: 16, color: '#ece8df', font: '' }); }); ls.push({ t: it.data.ref, size: 12, color: '#98a0b2', font: '' }); }
        say(ls, it.data ? 8 : 3.6);
        for (var n = 0; n < 16; n++) parts.push({ x: b.x + b.w / 2, y: b.y + 14, vx: rand(-60, 60), vy: rand(-130, -30), life: rand(0.8, 1.5), max: 1.5 });
      } else {
        free(it); it.y = Math.min(it.y, dockY - 140); it.bx = it.x; say([{ t: TR_HINT[it.kind], size: 16, color: '#d9c9a0', font: 'italic' }], 3);
      }
    }
    function pos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    cv.addEventListener('pointerdown', function (e) {
      var p = pos(e); try { cv.setPointerCapture(e.pointerId); } catch (x) {}
      if (!heart.placed) { if (Math.hypot(p.x - heart.x, p.y - heart.y) < 40) drag = { kind: 'heart', ox: heart.x - p.x, oy: heart.y - p.y, moved: 0 }; return; }
      var b = bucketAt(p.x, p.y);
      if (held && b) { give(held, b); drag = null; return; }
      var it = hitItem(p.x, p.y);
      if (it) { if (held && held !== it) free(held); it.state = 'drag'; drag = { kind: 'item', it: it, ox: it.x - p.x, oy: it.y - p.y, moved: 0, sx: p.x, sy: p.y }; }
      else if (held) free(held);
    });
    cv.addEventListener('pointermove', function (e) {
      if (!drag) return; var p = pos(e);
      if (drag.kind === 'heart') { heart.x = Math.max(16, Math.min(W - 16, p.x + drag.ox)); heart.y = Math.max(16, Math.min(H - 16, p.y + drag.oy)); }
      else { var it = drag.it; it.x = Math.max(it.w / 2, Math.min(W - it.w / 2, p.x + drag.ox)); it.y = p.y + drag.oy - 6; drag.moved = Math.max(drag.moved, Math.hypot(p.x - drag.sx, p.y - drag.sy)); drag.over = bucketAt(p.x, p.y); }
    });
    function up(e) {
      if (!drag) return; var p = pos(e), d = drag; drag = null;
      if (d.kind === 'heart') { if (Math.hypot(heart.x - discX, heart.y - discY) < discR + 46) { heart.placed = true; spawnT = 1.2; say([{ t: 'Jesus, I place my heart with you.', size: 18, color: '#F2C879', font: 'italic' }], 3); } else { heart.hx = W * 0.22; heart.hy = H * 0.6; } return; }
      var it = d.it, b = bucketAt(p.x, p.y);
      if (d.moved < 10) { held = it; it.state = 'held'; it.hx = W / 2; it.hy = Math.max(it.y, discY + 80); return; }
      if (b) give(it, b); else free(it);
    }
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

    function heartPath(x, y, s) { ctx.beginPath(); ctx.moveTo(x, y + s * 0.95); ctx.bezierCurveTo(x - s * 1.7, y - s * 0.1, x - s * 0.95, y - s * 1.15, x, y - s * 0.38); ctx.bezierCurveTo(x + s * 0.95, y - s * 1.15, x + s * 1.7, y - s * 0.1, x, y + s * 0.95); ctx.closePath(); }
    function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function icon(id, cx, cy, col) {
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (id === 'worry') { ctx.beginPath(); ctx.arc(cx, cy - 3, 12, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy - 12, 3, 0, 7); ctx.globalAlpha *= 0.5; ctx.fill(); ctx.globalAlpha /= 0.5; }
      else if (id === 'thanks') { roundRect(cx - 12, cy - 1, 24, 13, 2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy - 1, 12, Math.PI, 2 * Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy + 4, 1.8, 0, 7); ctx.fill(); }
      else if (id === 'person') { roundRect(cx - 5, cy + 1, 10, 12, 1.5); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, cy - 11); ctx.bezierCurveTo(cx + 6, cy - 5, cx + 5, cy, cx, cy); ctx.bezierCurveTo(cx - 5, cy, cx - 6, cy - 5, cx, cy - 11); ctx.globalAlpha *= 0.45; ctx.fill(); ctx.globalAlpha /= 0.45; ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(cx - 12, cy - 5); ctx.lineTo(cx + 12, cy - 5); ctx.moveTo(cx - 4, cy - 5); ctx.lineTo(cx - 4, cy - 9); ctx.lineTo(cx + 4, cy - 9); ctx.lineTo(cx + 4, cy - 5); ctx.moveTo(cx - 9, cy - 5); ctx.lineTo(cx - 7, cy + 12); ctx.lineTo(cx + 7, cy + 12); ctx.lineTo(cx + 9, cy - 5); ctx.moveTo(cx - 2.5, cy); ctx.lineTo(cx - 2.5, cy + 8); ctx.moveTo(cx + 2.5, cy); ctx.lineTo(cx + 2.5, cy + 8); ctx.stroke(); }
    }

    var stop = loop(function (dt) {
      tm += dt;
      // update
      if (heart.placed) { heart.hx = discX; heart.hy = discY + 1; }
      if (!drag || drag.kind !== 'heart') { heart.x += (heart.hx - heart.x) * Math.min(1, dt * 7); heart.y += (heart.hy - heart.y) * Math.min(1, dt * 7); }
      if (heart.placed) { spawnT -= dt; if (spawnT <= 0 && items.filter(function (z) { return z.state !== 'gone'; }).length < 3) { spawn(); spawnT = rand(3.2, 4.6); } else if (spawnT <= 0) spawnT = 1; }
      items.forEach(function (it) {
        it.a = Math.min(1, it.a + dt * 1.6);
        if (it.state === 'fall') { it.y += 30 * dt; it.x = it.bx + Math.sin(tm * 0.6 + it.ph) * 10; if (it.y > dockY - 14) { it.a -= dt * 3.4; if (it.a <= 0) it.state = 'gone'; } }
        else if (it.state === 'held') { it.x += (it.hx - it.x) * Math.min(1, dt * 8); it.y += (it.hy - it.y) * Math.min(1, dt * 8); }
      });
      items = items.filter(function (it) { return it.state !== 'gone'; });
      parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt; p.life -= dt; }); parts = parts.filter(function (p) { return p.life > 0; });
      if (msg) { msg.t -= dt; if (msg.t <= 0) msg = null; }
      // draw
      var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b0d1c'); g.addColorStop(1, '#161c3a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff'; stars.forEach(function (s) { ctx.globalAlpha = 0.12 + 0.18 * Math.sin(tm * 0.8 + s[3]) + 0.12; ctx.fillRect(s[0], s[1], s[2], s[2]); }); ctx.globalAlpha = 1;
      // cloud
      ctx.fillStyle = heart.placed ? 'rgba(200,210,245,.15)' : 'rgba(180,190,230,.08)';
      [[-84, 8, 26], [-44, -2, 32], [0, -6, 38], [46, 0, 32], [86, 8, 26]].forEach(function (q) { ctx.beginPath(); ctx.arc(discX + q[0], 10 + q[1], q[2], 0, 7); ctx.fill(); });
      // Jesus
      var br = heart.placed ? 1 + 0.1 * Math.sin(tm * 0.9) : 1, hg = ctx.createRadialGradient(discX, discY, 0, discX, discY, 100 * br);
      hg.addColorStop(0, heart.placed ? 'rgba(242,200,121,.5)' : 'rgba(242,200,121,.28)'); hg.addColorStop(0.6, 'rgba(242,200,121,.05)'); hg.addColorStop(1, 'rgba(242,200,121,0)');
      ctx.fillStyle = hg; ctx.fillRect(discX - 110, discY - 110, 220, 220);
      var dg = ctx.createRadialGradient(discX, discY - 4, 2, discX, discY, discR); dg.addColorStop(0, '#fff1c8'); dg.addColorStop(0.6, '#F2C879'); dg.addColorStop(1, 'rgba(242,200,121,.6)');
      ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(discX, discY, discR, 0, 7); ctx.fill();
      if (!heart.placed) { ctx.strokeStyle = 'rgba(14,17,32,.5)'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(discX, discY - 13); ctx.lineTo(discX, discY + 13); ctx.moveTo(discX - 9, discY - 5); ctx.lineTo(discX + 9, discY - 5); ctx.stroke(); }
      ctx.fillStyle = '#98a0b2'; ctx.font = '13px Georgia,serif'; ctx.textAlign = 'center'; ctx.fillText('Jesus', discX, discY + discR + 18);
      // heart
      var hs = heart.placed ? 11 + 0.9 * Math.sin(tm * 1.3) : 16, hyy = heart.y + (heart.placed || (drag && drag.kind === 'heart') ? 0 : 4 * Math.sin(tm * 2));
      heartPath(heart.x, hyy, hs);
      if (heart.placed) { ctx.fillStyle = '#E9788A'; ctx.shadowColor = 'rgba(233,120,138,.6)'; ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0; }
      else { ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(233,120,138,.9)'; ctx.lineWidth = 2.4; ctx.stroke(); ctx.setLineDash([]); }
      if (!heart.placed) { ctx.fillStyle = '#ece8df'; ctx.font = 'italic 18px Georgia,serif'; ctx.fillText('Drag your heart to Him.', W / 2, H * 0.4); ctx.fillStyle = '#98a0b2'; ctx.font = '12px -apple-system,sans-serif'; ctx.fillText('Nothing drops until you do.', W / 2, H * 0.4 + 22); }
      // dock
      var over = drag && drag.kind === 'item' ? drag.over : null;
      buckets.forEach(function (b) {
        var hot = over === b || (held && false), col = b.id === 'lie' ? '#b9a6d9' : '#F2C879';
        ctx.globalAlpha = 1; roundRect(b.x, b.y, b.w, b.h, 14); ctx.fillStyle = hot ? 'rgba(242,200,121,.2)' : (heart.placed ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.03)'); ctx.fill();
        ctx.lineWidth = 1.4; ctx.strokeStyle = hot ? col : 'rgba(255,255,255,.14)'; ctx.stroke();
        ctx.globalAlpha = heart.placed ? 1 : 0.45; icon(b.id, b.x + b.w / 2, b.y + 26, col);
        ctx.fillStyle = '#c9ccd8'; ctx.font = '11px -apple-system,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h - 9); ctx.globalAlpha = 1;
      });
      // items
      items.forEach(function (it) {
        var isH = it === held || (drag && drag.it === it), a = Math.max(0, it.a);
        ctx.globalAlpha = a; roundRect(it.x - it.w / 2, it.y - it.h / 2, it.w, it.h, 12);
        ctx.fillStyle = it.kind === 'lie' ? 'rgba(52,44,70,.92)' : 'rgba(34,40,72,.94)'; if (isH) { ctx.shadowColor = 'rgba(242,200,121,.6)'; ctx.shadowBlur = 18; } ctx.fill(); ctx.shadowBlur = 0;
        ctx.lineWidth = isH ? 2 : 1; ctx.strokeStyle = isH ? '#F2C879' : 'rgba(255,255,255,.2)'; ctx.stroke();
        ctx.fillStyle = '#ece8df'; ctx.font = '14px Georgia,serif'; ctx.textAlign = 'center';
        it.lines.forEach(function (l, k) { ctx.fillText(l, it.x, it.y - (it.lines.length - 1) * 9 + k * 18 + 5); }); ctx.globalAlpha = 1;
      });
      // sparks
      parts.forEach(function (p) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = '#ffe9b0'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, 7); ctx.fill(); }); ctx.globalAlpha = 1;
      // preview line while dragging over a bucket, held tip, message
      if (over && drag.it) { ctx.fillStyle = '#F2C879'; ctx.font = 'italic 14px Georgia,serif'; ctx.textAlign = 'center'; ctx.fillText(over.id === 'person' ? 'Father, I pray for them now.' : over.line, W / 2, dockY - 10); }
      else if (held) { ctx.fillStyle = '#d9c9a0'; ctx.font = 'italic 13px Georgia,serif'; ctx.textAlign = 'center'; ctx.fillText('Tap a bucket to give it to Him.', W / 2, dockY - 10); }
      else if (heart.placed && tipOn && !drag) { ctx.fillStyle = '#98a0b2'; ctx.font = '12px -apple-system,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Tap a drop to hold it, or drag it to a bucket.', W / 2, dockY - 10); }
      if (msg) {
        var al = Math.min(1, msg.t * 1.5, (msg.max - msg.t) * 3 + 0.2), ly = H * 0.42 - (msg.lines.length - 1) * 11; ctx.globalAlpha = Math.max(0, al); ctx.textAlign = 'center';
        var bh = msg.lines.length * 22 + 20; ctx.fillStyle = 'rgba(11,13,28,.72)'; roundRect(14, ly - 26, W - 28, bh, 16); ctx.fill();
        msg.lines.forEach(function (l, k) { ctx.fillStyle = l.color; ctx.font = (l.font ? l.font + ' ' : '') + l.size + 'px ' + (l.size < 13 ? '-apple-system,sans-serif' : 'Georgia,serif'); ctx.fillText(l.t, W / 2, ly + k * 22); }); ctx.globalAlpha = 1;
      }
      if (given) { ctx.fillStyle = '#6f7690'; ctx.font = '12px -apple-system,sans-serif'; ctx.textAlign = 'right'; ctx.fillText('given to Him: ' + given, W - 12, H - 6); ctx.textAlign = 'center'; }
    });
    return { stop: stop, peek: function () { return { items: items.map(function (z) { return { kind: z.kind, text: z.text, x: z.x, y: z.y, state: z.state }; }), buckets: buckets, heart: heart, given: given, msg: msg && msg.lines.map(function (l) { return l.t; }) }; } };
  }

  root.MannaGames = {
    list: [
      { id: 'starwatch', title: 'Star Watch', blurb: 'Slide to move; it fires by itself. A gentle old-school shooter.', start: starWatch },
      { id: 'pass', title: 'Hold the Pass', blurb: 'Tap to build towers along the road. Relaxed tower defense — waves keep coming.', start: holdPass },
      { id: 'treasuring', title: 'Treasuring', blurb: 'Place your heart with Jesus, then give what falls to Him: worries into His hands, thanks in the chest, people in prayer, lies put down.', start: treasuring },
      { id: 'lights', title: 'Lights', blurb: 'Turn every light off. Each tap flips its neighbours too.', start: lights }
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
