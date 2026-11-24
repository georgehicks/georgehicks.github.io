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

  // ---------------- Hold the Pass (tower defense) ----------------
  // Dusk valley: a winding sand road, grassy building plots, a gate where the enemies come from and a keep at the end.
  // The ground is painted once into an offscreen canvas; towers, creatures, shots and sparks are drawn on top each frame.
  function holdPass(level, host, api) {
    var P = { easy: { gold: 130, lives: 20, hp: 0.75, inc: 3 }, normal: { gold: 80, lives: 12, hp: 1, inc: 2 }, hard: { gold: 55, lives: 8, hp: 1.3, inc: 1.5 } }[level];
    var bar = K.el('div', 'kit-bar'); host.appendChild(bar);
    bar.style.cssText = 'position:absolute;left:0;right:0;bottom:0;background:#0a0d18;z-index:2';
    var c = K.canvas(host), W = c.W, H = c.H - 64;   // the bar of tower buttons below is about 60px tall
    var ctx = c.ctx, COLS = 7, ROWS = 10, cs = Math.min(W / COLS, (H - 30) / ROWS), ox = (W - cs * COLS) / 2, oy = Math.max(6, Math.floor((H - 30 - cs * ROWS) / 2));
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
    var gold, lives, wave, enemies, towers, bullets, toSpawn, spawnT, breakT, pick, msg, msgT, hp0, sel, mixN, fast, goldT, parts, floats, flash, clock = 0, booms = [];
    var flies = []; for (i = 0; i < 12; i++) flies.push({ x: Math.random() * W, y: Math.random() * H, a: Math.random() * 7, s: 0.3 + Math.random() * 0.5 });
    function reset() { gold = P.gold; lives = P.lives; wave = 0; enemies = []; towers = {}; bullets = []; booms = []; parts = []; floats = []; flash = 0; toSpawn = 0; spawnT = 0; breakT = 5; pick = 'bolt'; msg = 'Place a tower on the grass'; msgT = 3.5; hp0 = 8; sel = null; mixN = 0; fast = 1; goldT = 0; renderBar(); }
    function upCost(t) { return Math.round(KINDS[t.kind].cost * 0.7 * t.lvl); }
    function sellVal(t) { return Math.round(t.spent * 0.6); }
    function renderBar() {
      bar.innerHTML = '';
      if (sel && towers[sel]) {
        var t = towers[sel];
        var up = K.btn('', t.lvl >= 3 ? 'Maxed' : 'Upgrade ' + upCost(t), function () { if (t.lvl < 3 && gold >= upCost(t)) { gold -= upCost(t); t.spent += upCost(t); t.lvl++; msg = 'Stronger'; msgT = 0.8; spark(cx(t.col), cy(t.row), KINDS[t.kind].col, 10); renderBar(); } else if (t.lvl < 3) { msg = 'Not enough yet'; msgT = 1; } });
        up.disabled = t.lvl >= 3;
        bar.appendChild(up);
        bar.appendChild(K.btn('', 'Sell +' + sellVal(t), function () { gold += sellVal(t); delete towers[sel]; sel = null; renderBar(); }));
        bar.appendChild(K.btn('', 'Done', function () { sel = null; renderBar(); }));
      } else {
        Object.keys(KINDS).forEach(function (k) { var b = K.btn(pick === k ? 'on' : '', KINDS[k].label, function () { pick = k; renderBar(); }); bar.appendChild(b); });
        bar.appendChild(K.btn(fast > 1 ? 'on' : '', '×' + fast, function () { fast = fast > 1 ? 1 : 2; renderBar(); }));
      }
    }
    function spark(x, y, col, n) { for (var q = 0; q < n; q++) { var an = Math.random() * 6.3, sp = 30 + Math.random() * 70; parts.push({ x: x, y: y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 20, t: 0.45 + Math.random() * 0.3, m: 0.75, col: col, r: 1.5 + Math.random() * 2 }); } }
    reset();
    c.cv.addEventListener('pointerdown', function (e) {
      var r = c.cv.getBoundingClientRect(), col = Math.floor((e.clientX - r.left - ox) / cs), row = Math.floor((e.clientY - r.top - oy) / cs), key = col + ',' + row;
      if (col < 0 || row < 0 || col >= COLS || row >= ROWS || onPath[key]) { sel = null; renderBar(); return; }
      if (towers[key]) { sel = key; renderBar(); return; }
      sel = null; var k = KINDS[pick]; if (gold < k.cost) { msg = 'Not yet — gold comes with time'; msgT = 1.2; renderBar(); return; }
      gold -= k.cost; towers[key] = { col: col, row: row, kind: pick, lvl: 1, cd: 0, spent: k.cost, ang: 1.57, fl: 0, born: clock }; spark(cx(col), cy(row), k.col, 8); renderBar();
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
      clock += dt; goldT += dt; if (goldT > 2.5) { goldT = 0; gold += P.inc; }
      if (toSpawn > 0) {
        spawnT -= dt;
        if (spawnT <= 0) {
          var kind = 'norm'; if (wave % 5 === 0 && toSpawn % 3 === 0) kind = 'tank'; else if (wave % 3 === 0 && toSpawn % 2 === 0) kind = 'fast';
          var hp = kind === 'tank' ? hp0 * 2.6 : kind === 'fast' ? hp0 * 0.55 : hp0, spd = (0.9 + Math.min(0.9, wave * 0.04)) * (kind === 'tank' ? 0.7 : kind === 'fast' ? 1.7 : 1);
          enemies.push({ d: 0, hp: hp, max: hp, slow: 0, spd: spd, kind: kind, ph: Math.random() * 6, hit: 0 }); toSpawn--; spawnT = kind === 'fast' ? 0.55 : 0.95;
        }
      } else if (!enemies.length) { breakT -= dt; if (breakT <= 0) { startWave(); breakT = 5; } }
      enemies.forEach(function (e) { e.slow = Math.max(0, e.slow - dt); e.hit = Math.max(0, e.hit - dt); e.d += dt * e.spd * (e.slow > 0 ? 0.45 : 1); });
      enemies = enemies.filter(function (e) {
        if (e.d >= path.length - 1) { lives--; flash = 0.45; var q = pos(e); spark(q[0], q[1], '#ff7a7a', 8); return false; }
        if (e.hp <= 0) { var q2 = pos(e), gain = e.kind === 'tank' ? 8 : 4; gold += gain; spark(q2[0], q2[1], e.kind === 'tank' ? '#b8506a' : '#e9788a', 12); floats.push({ x: q2[0], y: q2[1] - cs * 0.2, t: 0.9, txt: '+' + gain }); return false; }
        return true;
      });
      if (lives <= 0) { api.setBest(wave - 1); msg = 'The pass fell on wave ' + wave + ' — rebuild'; reset(); msgT = 2.6; return; }
      Object.keys(towers).forEach(function (key) {
        var t = towers[key], k = KINDS[t.kind]; t.cd -= dt; t.fl = Math.max(0, t.fl - dt); if (t.cd > 0) return;
        var best = null, bd = 1e9, tx = cx(t.col), ty = cy(t.row), rng = k.range * cs * (1 + (t.lvl - 1) * 0.08);
        enemies.forEach(function (e) { var p = pos(e), d = Math.hypot(p[0] - tx, p[1] - ty); if (d < rng && (best === null || e.d > best.d)) { best = e; bd = d; } });
        if (best) { var bp = pos(best); t.ang = Math.atan2(bp[1] - ty, bp[0] - tx); t.fl = 0.14; t.cd = k.rate; bullets.push({ x: tx, y: ty, px: tx, py: ty, e: best, col: k.col, kind: t.kind, dmg: k.dmg + (t.kind === 'frost' ? (t.lvl - 1) * 0.5 : (t.lvl - 1) * 1.6) }); }
      });
      bullets.forEach(function (b) {
        if (b.e.hp <= 0) { b.dead = true; return; }
        var p = pos(b.e), dx = p[0] - b.x, dy = p[1] - b.y, d = Math.hypot(dx, dy); b.px = b.x; b.py = b.y;
        if (d < 9) {
          b.dead = true; b.e.hit = 0.12;
          if (b.kind === 'burst') { enemies.forEach(function (e) { var q = pos(e); if (Math.hypot(q[0] - p[0], q[1] - p[1]) < KINDS.burst.splash * cs) { e.hp -= b.dmg; e.hit = 0.12; } }); booms.push({ x: p[0], y: p[1], t: 0.35 }); spark(p[0], p[1], '#ffb3a0', 10); }
          else { b.e.hp -= b.dmg; if (b.kind === 'frost') b.e.slow = 1.6; spark(p[0], p[1], b.col, 5); }
        } else { b.x += dx / d * 360 * dt; b.y += dy / d * 360 * dt; }
      });
      bullets = bullets.filter(function (b) { return !b.dead; });
      booms.forEach(function (m) { m.t -= dt; }); booms = booms.filter(function (m) { return m.t > 0; });
      parts.forEach(function (q) { q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 90 * dt; }); parts = parts.filter(function (q) { return q.t > 0; });
      floats.forEach(function (f) { f.t -= dt; f.y -= 26 * dt; }); floats = floats.filter(function (f) { return f.t > 0; });
      flash = Math.max(0, flash - dt); msgT = Math.max(0, msgT - dt);
    }

    // ---- the ground, painted once ----
    function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
    function rr(x, ctx2, y, w, h, r) { ctx2.beginPath(); ctx2.moveTo(x + r, y); ctx2.arcTo(x + w, y, x + w, y + h, r); ctx2.arcTo(x + w, y + h, x, y + h, r); ctx2.arcTo(x, y + h, x, y, r); ctx2.arcTo(x, y, x + w, y, r); ctx2.closePath(); }
    var dpr = Math.min(2, window.devicePixelRatio || 1), bg = document.createElement('canvas'); bg.width = Math.round(W * dpr); bg.height = Math.round((H + 54) * dpr);
    (function paintGround() {
      var g = bg.getContext('2d'), q, r, k; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      var sky = g.createLinearGradient(0, 0, 0, H + 54); sky.addColorStop(0, '#16222e'); sky.addColorStop(1, '#0b101d'); g.fillStyle = sky; g.fillRect(0, 0, W, H + 54);
      for (r = 0; r < ROWS; r++) for (q = 0; q < COLS; q++) {
        if (onPath[q + ',' + r]) continue; var x = ox + q * cs, y = oy + r * cs, h = hash(q, r);
        g.fillStyle = 'hsl(' + (138 + h * 22) + ',' + (30 + h * 10) + '%,' + (14 + h * 6) + '%)'; rr(x + 1, g, y + 1, cs - 2, cs - 2, cs * 0.16); g.fill();
        g.fillStyle = 'rgba(255,255,255,.05)'; rr(x + 3, g, y + 3, cs - 6, cs * 0.28, cs * 0.12); g.fill();           // soft top light: this is where a tower can stand
        g.strokeStyle = 'hsl(' + (140 + h * 20) + ',34%,' + (24 + h * 8) + '%)'; g.lineWidth = 1.2; g.lineCap = 'round';
        for (k = 0; k < 6; k++) { var bx = x + cs * (0.12 + 0.76 * hash(q + k, r * 3 + 1)), by = y + cs * (0.35 + 0.55 * hash(q * 5 + 2, r + k)); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + (hash(k, q) - 0.5) * 4, by - cs * 0.12 - hash(r, k) * 3); g.stroke(); }
        if (hash(q * 7, r * 3) > 0.78) { g.fillStyle = ['#e9c8f0', '#ffe9a8', '#bfe3ff'][Math.floor(hash(r, q) * 3)]; g.beginPath(); g.arc(x + cs * (0.2 + 0.6 * hash(q, r * 9)), y + cs * (0.3 + 0.5 * hash(q * 4, r)), 1.8, 0, 7); g.fill(); }
        else if (hash(q * 3, r * 7) > 0.88) { g.fillStyle = '#3b4252'; g.beginPath(); g.ellipse(x + cs * 0.72, y + cs * 0.78, cs * 0.09, cs * 0.06, 0, 0, 7); g.fill(); }
      }
      g.lineCap = g.lineJoin = 'round';
      [[cs * 0.98, '#241b11'], [cs * 0.86, '#6f5d3e'], [cs * 0.74, '#8d7a52']].forEach(function (L) { g.strokeStyle = L[1]; g.lineWidth = L[0]; g.beginPath(); path.forEach(function (pp, ix) { ix ? g.lineTo(cx(pp[0]), cy(pp[1])) : g.moveTo(cx(pp[0]), cy(pp[1])); }); g.stroke(); });
      path.forEach(function (pp, ix) {
        for (k = 0; k < 5; k++) { var px = cx(pp[0]) + (hash(ix, k) - 0.5) * cs * 0.62, py = cy(pp[1]) + (hash(k, ix + 3) - 0.5) * cs * 0.62; g.fillStyle = hash(ix + k, 5) > 0.5 ? 'rgba(255,240,200,.14)' : 'rgba(40,28,10,.2)'; g.beginPath(); g.ellipse(px, py, cs * 0.07, cs * 0.05, hash(k, ix), 0, 7); g.fill(); }
      });
      // the gate the enemies come out of
      var sx = ox, sy = cy(path[0][1]); g.fillStyle = '#07090f'; g.beginPath(); g.ellipse(sx + 2, sy, cs * 0.34, cs * 0.46, 0, -1.57, 1.57); g.fill(); g.strokeStyle = '#3a3f55'; g.lineWidth = 4; g.stroke();
      var gl = g.createRadialGradient(sx, sy, 2, sx, sy, cs * 0.7); gl.addColorStop(0, 'rgba(233,120,138,.35)'); gl.addColorStop(1, 'rgba(233,120,138,0)'); g.fillStyle = gl; g.fillRect(sx, sy - cs, cs, cs * 2);
      // the keep at the end of the road
      var ex = cx(path[path.length - 1][0]), ey = cy(path[path.length - 1][1]); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(ex, ey + cs * 0.3, cs * 0.46, cs * 0.14, 0, 0, 7); g.fill();
      g.fillStyle = '#5a6078'; g.fillRect(ex - cs * 0.36, ey - cs * 0.22, cs * 0.72, cs * 0.5); g.fillStyle = '#6c7390'; g.fillRect(ex - cs * 0.36, ey - cs * 0.22, cs * 0.72, cs * 0.1);
      for (k = 0; k < 4; k++) g.fillRect(ex - cs * 0.36 + k * cs * 0.2, ey - cs * 0.32, cs * 0.12, cs * 0.12);
      g.fillStyle = '#1b1f30'; g.beginPath(); g.arc(ex, ey + cs * 0.28, cs * 0.14, Math.PI, 0); g.fill(); g.fillRect(ex - cs * 0.14, ey + cs * 0.28, cs * 0.28, 0.5);
      g.strokeStyle = '#d8d0b8'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ex, ey - cs * 0.32); g.lineTo(ex, ey - cs * 0.62); g.stroke(); g.fillStyle = '#f2c879'; g.beginPath(); g.moveTo(ex, ey - cs * 0.62); g.lineTo(ex + cs * 0.22, ey - cs * 0.54); g.lineTo(ex, ey - cs * 0.46); g.fill();
      var vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(2,4,12,.55)'); g.fillStyle = vg; g.fillRect(0, 0, W, H + 54);
    })();

    function glow(x, y, r, col, al) { var g2 = ctx.createRadialGradient(x, y, 0, x, y, r); g2.addColorStop(0, col.replace('A', al)); g2.addColorStop(1, col.replace('A', 0)); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    function drawTower(t, key) {
      var k = KINDS[t.kind], x = cx(t.col), y = cy(t.row), s = cs, pop = Math.min(1, (clock - t.born) * 5), sc = 0.6 + 0.4 * pop + (t.fl > 0 ? 0.05 : 0);
      ctx.save(); ctx.translate(x, y + s * 0.12); ctx.scale(sc, sc); ctx.translate(-x, -(y + s * 0.12));
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(x, y + s * 0.26, s * 0.4, s * 0.15, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#4b5068'; rr(x - s * 0.36, ctx, y - s * 0.02, s * 0.72, s * 0.28, s * 0.1); ctx.fill(); ctx.fillStyle = '#656c88'; rr(x - s * 0.36, ctx, y - s * 0.02, s * 0.72, s * 0.1, s * 0.06); ctx.fill();
      if (t.kind === 'bolt') {
        ctx.fillStyle = '#b8903f'; rr(x - s * 0.2, ctx, y - s * 0.3, s * 0.4, s * 0.34, s * 0.06); ctx.fill(); ctx.fillStyle = '#d9b45e'; ctx.fillRect(x - s * 0.2, y - s * 0.3, s * 0.4, s * 0.06);
        ctx.save(); ctx.translate(x, y - s * 0.28); ctx.rotate(t.ang); ctx.fillStyle = '#f2c879'; ctx.fillRect(0, -s * 0.05, s * 0.36 - (t.fl > 0 ? s * 0.05 : 0), s * 0.1); ctx.fillStyle = '#fff3d2'; ctx.beginPath(); ctx.moveTo(s * 0.36, -s * 0.08); ctx.lineTo(s * 0.46, 0); ctx.lineTo(s * 0.36, s * 0.08); ctx.fill(); ctx.restore();
      } else if (t.kind === 'frost') {
        var pl = 1 + Math.sin(clock * 3 + t.col) * 0.06; ctx.fillStyle = '#5da3d4'; ctx.beginPath(); ctx.moveTo(x, y - s * 0.56 * pl); ctx.lineTo(x + s * 0.24, y - s * 0.22); ctx.lineTo(x, y + s * 0.02); ctx.lineTo(x - s * 0.24, y - s * 0.22); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#b9e5ff'; ctx.beginPath(); ctx.moveTo(x, y - s * 0.56 * pl); ctx.lineTo(x + s * 0.24, y - s * 0.22); ctx.lineTo(x, y - s * 0.3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(x - s * 0.05, y - s * 0.3, s * 0.04, 0, 7); ctx.fill();
      } else {
        ctx.fillStyle = '#7d3f52'; ctx.beginPath(); ctx.arc(x, y - s * 0.14, s * 0.25, 0, 7); ctx.fill(); ctx.fillStyle = '#a95a70'; ctx.beginPath(); ctx.arc(x - s * 0.06, y - s * 0.2, s * 0.14, 0, 7); ctx.fill();
        ctx.save(); ctx.translate(x, y - s * 0.16); ctx.rotate(t.ang); ctx.fillStyle = '#2d1f2a'; rr(0, ctx, -s * 0.09, s * 0.4 - (t.fl > 0 ? s * 0.05 : 0), s * 0.18, s * 0.05); ctx.fill(); ctx.restore();
      }
      for (var l = 0; l < t.lvl; l++) { ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(x + (l - (t.lvl - 1) / 2) * s * 0.16, y + s * 0.2, s * 0.045, 0, 7); ctx.fill(); }
      ctx.restore();
      if (t.fl > 0) { ctx.globalCompositeOperation = 'lighter'; glow(x + Math.cos(t.ang) * s * 0.4, y - s * 0.2 + Math.sin(t.ang) * s * 0.4, s * 0.45, 'rgba(255,230,160,A)', 0.85); ctx.globalCompositeOperation = 'source-over'; }
      if (t.lvl >= 2) { ctx.globalCompositeOperation = 'lighter'; glow(x, y - s * 0.12, s * (0.35 + t.lvl * 0.1), t.kind === 'frost' ? 'rgba(143,211,255,A)' : t.kind === 'burst' ? 'rgba(233,120,138,A)' : 'rgba(242,200,121,A)', 0.16 + t.lvl * 0.05); ctx.globalCompositeOperation = 'source-over'; }
      if (key === sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; rr(x - s * 0.46, ctx, y - s * 0.62, s * 0.92, s * 1.06, s * 0.14); ctx.stroke(); }
    }
    function drawEnemy(e) {
      var p = pos(e), p2 = pos({ d: e.d + 0.15 }), face = p2[0] >= p[0] ? 1 : -1, x = p[0], y = p[1], tank = e.kind === 'tank', fa = e.kind === 'fast', r = cs * (tank ? 0.3 : fa ? 0.17 : 0.22);
      var bob = Math.abs(Math.sin(clock * (fa ? 16 : 9) + e.ph)) * cs * 0.07, col = e.hit > 0 ? '#ffffff' : e.slow > 0 ? '#7fc2ec' : tank ? '#a6405c' : fa ? '#f0a35c' : '#e9788a', dk = tank ? '#6f2540' : fa ? '#b0682c' : '#b4526a';
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.9, r * 0.9, r * 0.35, 0, 0, 7); ctx.fill();
      if (fa) { ctx.fillStyle = 'rgba(240,163,92,.25)'; ctx.beginPath(); ctx.ellipse(x - face * r * 1.6, y - bob, r * 1.1, r * 0.5, 0, 0, 7); ctx.fill(); }
      ctx.fillStyle = dk; var fo = Math.sin(clock * (fa ? 16 : 9) + e.ph) * r * 0.35; ctx.beginPath(); ctx.ellipse(x - r * 0.4 + fo, y + r * 0.8, r * 0.22, r * 0.16, 0, 0, 7); ctx.ellipse(x + r * 0.4 - fo, y + r * 0.8, r * 0.22, r * 0.16, 0, 0, 7); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y - bob, r * (fa ? 1.15 : 1), r * (fa ? 0.85 : 1), 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - bob - r * 0.35, r * 0.5, r * 0.28, -0.4, 0, 7); ctx.fill();
      if (tank) { ctx.fillStyle = '#d8cfc0'; ctx.beginPath(); ctx.moveTo(x - r * 0.7, y - bob - r * 0.5); ctx.lineTo(x - r * 0.95, y - bob - r * 1.15); ctx.lineTo(x - r * 0.3, y - bob - r * 0.85); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + r * 0.7, y - bob - r * 0.5); ctx.lineTo(x + r * 0.95, y - bob - r * 1.15); ctx.lineTo(x + r * 0.3, y - bob - r * 0.85); ctx.fill(); }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + face * r * 0.2 - r * 0.28, y - bob - r * 0.1, r * 0.22, 0, 7); ctx.arc(x + face * r * 0.2 + r * 0.28, y - bob - r * 0.1, r * 0.22, 0, 7); ctx.fill();
      ctx.fillStyle = '#20182a'; ctx.beginPath(); ctx.arc(x + face * r * 0.32 - r * 0.28, y - bob - r * 0.08, r * 0.11, 0, 7); ctx.arc(x + face * r * 0.32 + r * 0.28, y - bob - r * 0.08, r * 0.11, 0, 7); ctx.fill();
      if (e.slow > 0) { ctx.strokeStyle = 'rgba(190,230,255,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y - bob, r * 1.15, 0, 7); ctx.stroke(); }
      if (e.hp < e.max) { var w = r * 2.2; ctx.fillStyle = 'rgba(0,0,0,.55)'; rr(x - w / 2, ctx, y - bob - r * 1.45, w, 4, 2); ctx.fill(); ctx.fillStyle = e.hp / e.max > 0.4 ? '#9be8b5' : '#f2c879'; rr(x - w / 2, ctx, y - bob - r * 1.45, Math.max(2, w * e.hp / e.max), 4, 2); ctx.fill(); }
    }
    function pill(x, y, w, h) { ctx.fillStyle = 'rgba(10,13,24,.82)'; rr(x, ctx, y, w, h, h / 2); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1; ctx.stroke(); }
    function heartAt(x, y, s, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y + s * 0.9); ctx.bezierCurveTo(x - s * 1.5, y - s * 0.2, x - s * 0.6, y - s * 1.1, x, y - s * 0.3); ctx.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.5, y - s * 0.2, x, y + s * 0.9); ctx.fill(); }
    function draw() {
      ctx.drawImage(bg, 0, 0, W, H + 54);
      var st = sel && towers[sel];
      if (st) { var kk = KINDS[st.kind], rg = kk.range * cs * (1 + (st.lvl - 1) * 0.08); ctx.fillStyle = 'rgba(242,200,121,.07)'; ctx.beginPath(); ctx.arc(cx(st.col), cy(st.row), rg, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(242,200,121,.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]); }
      // everything that stands, drawn from the top of the screen down so nearer things overlap
      var items = []; Object.keys(towers).forEach(function (key) { items.push({ y: cy(towers[key].row), f: function () { drawTower(towers[key], key); } }); }); enemies.forEach(function (e) { items.push({ y: pos(e)[1], f: function () { drawEnemy(e); } }); });
      items.sort(function (a, b) { return a.y - b.y; }).forEach(function (it) { it.f(); });
      bullets.forEach(function (b) {
        ctx.lineCap = 'round'; ctx.strokeStyle = b.col; ctx.globalAlpha = 0.5; ctx.lineWidth = b.kind === 'burst' ? 5 : 3; ctx.beginPath(); ctx.moveTo(b.px - (b.x - b.px) * 2, b.py - (b.y - b.py) * 2); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'lighter'; glow(b.x, b.y, b.kind === 'burst' ? 11 : 8, b.kind === 'frost' ? 'rgba(160,220,255,A)' : b.kind === 'burst' ? 'rgba(255,150,140,A)' : 'rgba(255,225,150,A)', 0.95); ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.kind === 'burst' ? 3.5 : 2.2, 0, 7); ctx.fill();
      });
      booms.forEach(function (m) { var f = 1 - m.t / 0.35, R = KINDS.burst.splash * cs * (0.3 + f * 0.8); ctx.globalCompositeOperation = 'lighter'; glow(m.x, m.y, R, 'rgba(255,140,120,A)', 0.55 * (1 - f)); ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = 'rgba(255,200,180,' + (1 - f) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(m.x, m.y, R, 0, 7); ctx.stroke(); });
      parts.forEach(function (q) { ctx.globalAlpha = Math.min(1, q.t / q.m * 1.5); ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 7); ctx.fill(); }); ctx.globalAlpha = 1;
      ctx.font = 'bold ' + Math.round(cs * 0.3) + 'px -apple-system,sans-serif'; ctx.textAlign = 'center'; floats.forEach(function (f) { ctx.fillStyle = 'rgba(255,226,140,' + Math.min(1, f.t * 1.6) + ')'; ctx.fillText(f.txt, f.x, f.y); });
      ctx.globalCompositeOperation = 'lighter'; flies.forEach(function (f) { var fx = (f.x + Math.sin(clock * f.s + f.a) * 18 + W) % W, fy = (f.y + Math.cos(clock * f.s * 0.8 + f.a) * 14 + H) % H; glow(fx, fy, 6, 'rgba(255,240,170,A)', 0.4 + 0.3 * Math.sin(clock * 2 + f.a)); }); ctx.globalCompositeOperation = 'source-over';
      if (flash > 0) { var fg = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.8); fg.addColorStop(0, 'rgba(255,60,60,0)'); fg.addColorStop(1, 'rgba(255,60,60,' + flash * 0.7 + ')'); ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H + 54); }
      // HUD
      var hy = hudY - 11;
      pill(8, hy, 76, 24); ctx.fillStyle = '#f2c879'; ctx.beginPath(); ctx.arc(24, hy + 12, 6.5, 0, 7); ctx.fill(); ctx.fillStyle = '#b8903f'; ctx.beginPath(); ctx.arc(24, hy + 12, 3.2, 0, 7); ctx.fill();
      ctx.font = '600 13px -apple-system,sans-serif'; ctx.fillStyle = '#ece8dc'; ctx.textAlign = 'left'; ctx.fillText(Math.floor(gold), 37, hy + 17);
      var wl = wave ? 'Wave ' + wave + (enemies.length + toSpawn ? ' · ' + (enemies.length + toSpawn) + ' left' : '') : 'First wave in ' + Math.ceil(breakT) + 's', ww = Math.max(110, wl.length * 7 + 22); if (!wave || (!enemies.length && !toSpawn)) wl = wave ? 'Next wave in ' + Math.ceil(breakT) + 's' : wl;
      pill(W / 2 - ww / 2, hy, ww, 24); ctx.fillStyle = '#c5cad8'; ctx.textAlign = 'center'; ctx.fillText(wl, W / 2, hy + 17);
      pill(W - 76, hy, 68, 24); heartAt(W - 60, hy + 11, 5.5, lives <= 3 ? '#ff6b6b' : '#e5383b'); ctx.fillStyle = '#ece8dc'; ctx.textAlign = 'left'; ctx.fillText(lives, W - 48, hy + 17);
      if (msgT > 0) { ctx.textAlign = 'center'; ctx.font = '20px Georgia,serif'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(5,8,16,' + Math.min(0.8, msgT) + ')'; ctx.strokeText(msg, W / 2, H * 0.48); ctx.fillStyle = 'rgba(245,238,220,' + Math.min(1, msgT) + ')'; ctx.fillText(msg, W / 2, H * 0.48); }
    }
    api.status('Best wave ' + api.best());
    return { stop: function () { stop(); }, restart: reset, peek: function () { return { gold: gold, lives: lives, wave: wave, towers: Object.keys(towers).length, enemies: enemies.length }; } };
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
