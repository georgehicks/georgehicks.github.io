/* Bloom Scroll — Blast Maze. A garden of stone pillars and wooden crates: drop bombs to clear a path, find power-ups, and blow up the wandering slimes
   before they reach you. Walk with the pad, tap the bomb button (arrow keys and Space work on a computer). No game over: when the lives run out the maze rests and begins again. */
(function (root) {
  'use strict';
  var K = root.MannaKit, G = root.MannaGames, rand = K.rand;
  var COLS = 9, ROWS = 11, DIRS = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

  function blast(level, host, api) {
    var P = {
      easy: { lives: 5, en: 3, soft: 0.36, espd: 1.5, chase: 0, fuse: 2.4, spd: 5.4, pu: 0.42 },
      normal: { lives: 3, en: 4, soft: 0.5, espd: 2.0, chase: 0.25, fuse: 2.1, spd: 4.9, pu: 0.3 },
      hard: { lives: 2, en: 5, soft: 0.58, espd: 2.5, chase: 0.55, fuse: 1.9, spd: 4.6, pu: 0.22 }
    }[level];
    var c = K.canvas(host), W = c.W, H = c.H, ctx = c.ctx, areaH = H - 40, T = Math.floor(Math.min(W / COLS, (areaH - 36) / ROWS));
    var ox = Math.floor((W - T * COLS) / 2), oy = Math.max(40, Math.floor((H - T * ROWS) * 0.3));
    var hintT = 6, grid, bombs, flames, pups, enemies, parts, pl, stage, clock = 0, st, stT, msg, msgT, alive = true, held = [], lastBomb = 0, shake = 0, kills;
    function cell(c0, r0) { return { c: c0, r: r0 }; }
    function blockedFor(c0, r0, isPlayer) {
      if (c0 < 0 || r0 < 0 || c0 >= COLS || r0 >= ROWS || grid[r0][c0]) return true;
      var b = bombAt(c0, r0); return !!b && !(isPlayer && pl.c === c0 && pl.r === r0);     // a bomb you are standing on lets you step off it
    }
    function bombAt(c0, r0) { for (var i = 0; i < bombs.length; i++) if (bombs[i].c === c0 && bombs[i].r === r0) return bombs[i]; return null; }
    function flameAt(c0, r0) { for (var i = 0; i < flames.length; i++) if (flames[i].c === c0 && flames[i].r === r0) return true; return false; }

    function genMap() {
      grid = []; bombs = []; flames = []; pups = []; enemies = []; parts = [];
      for (var r = 0; r < ROWS; r++) { grid.push([]); for (var c0 = 0; c0 < COLS; c0++) { var safe = (r + c0) <= 2; grid[r].push(r % 2 === 1 && c0 % 2 === 1 ? 1 : (!safe && Math.random() < P.soft ? 2 : 0)); } }
      var n = Math.min(P.en + Math.floor((stage - 1) / 2), P.en + 3), tries = 0;
      while (enemies.length < n && tries++ < 400) { var ec = Math.floor(Math.random() * COLS), er = Math.floor(Math.random() * ROWS); if (grid[er][ec] || ec + er < 8 || enemies.some(function (e) { return e.c === ec && e.r === er; })) continue; enemies.push({ c: ec, r: er, mv: null, dir: DIRS[Math.floor(Math.random() * 4)], ph: Math.random() * 6, hue: Math.floor(Math.random() * 3) }); }
      pl.c = 0; pl.r = 0; pl.mv = null; pl.inv = 1.6;
    }
    function newGame() { stage = 1; kills = 0; pl = { c: 0, r: 0, mv: null, lives: P.lives, maxB: 1, range: 2, spd: 0, inv: 0, face: 1 }; held = []; genMap(); st = 'play'; msg = 'Stage 1'; msgT = 1.4; status(); }
    function status() { api.status('Stage ' + stage + (api.best() ? ' · best ' + api.best() : '')); }
    function spark(x, y, col, n, sp) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.3, s = (sp || 60) * (0.4 + Math.random()); parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 25, t: 0.5 + Math.random() * 0.3, col: col, r: 1.5 + Math.random() * 2.2 }); } }
    function px(c0) { return ox + c0 * T + T / 2; } function py(r0) { return oy + r0 * T + T / 2; }

    // ---- bombs and flames ----
    var wantBomb = 0;      // a tap that cannot be honoured this instant (still in the middle of a step, say) is kept for a moment
    function placeBomb(again) {
      if (st !== 'play') return false; var bc = pl.c, br = pl.r; if (pl.mv) { var half = pl.mv.t > 0.5; bc = half ? pl.mv.tc : pl.c; br = half ? pl.mv.tr : pl.r; }
      if (bombAt(bc, br) || bombs.filter(function (b) { return b.mine; }).length >= pl.maxB || grid[br][bc]) { if (!again) wantBomb = 0.28; return false; }
      bombs.push({ c: bc, r: br, t: P.fuse, range: pl.range, mine: true }); wantBomb = 0; return true;
    }
    function detonate(b) {
      var i = bombs.indexOf(b); if (i < 0) return; bombs.splice(i, 1); shake = 0.18; addFlame(b.c, b.r);
      DIRS.forEach(function (d) {
        for (var k = 1; k <= b.range; k++) {
          var cc = b.c + d.x * k, rr = b.r + d.y * k; if (cc < 0 || rr < 0 || cc >= COLS || rr >= ROWS || grid[rr][cc] === 1) break;
          if (grid[rr][cc] === 2) { grid[rr][cc] = 0; spark(px(cc), py(rr), '#c8924f', 9); if (Math.random() < P.pu) pups.push({ c: cc, r: rr, k: ['range', 'bomb', 'speed'][Math.floor(Math.random() * 3)] }); addFlame(cc, rr); break; }
          addFlame(cc, rr); var ob = bombAt(cc, rr); if (ob) ob.t = Math.min(ob.t, 0.06);
          pups = pups.filter(function (p) { return !(p.c === cc && p.r === rr); });
        }
      });
    }
    function addFlame(c0, r0) { flames.push({ c: c0, r: r0, t: 0.5, m: 0.5 }); spark(px(c0), py(r0), '#ffb347', 3, 90); }

    // ---- moving ----
    function stepEntity(e, dt, speed, pick, isPlayer) {
      var rem = dt;
      while (rem > 1e-6) {
        if (!e.mv) { var d = pick(e); if (!d) return; var tc = e.c + d.x, tr = e.r + d.y; if (blockedFor(tc, tr, isPlayer)) { if (isPlayer && d.x) e.face = d.x; return; } e.mv = { tc: tc, tr: tr, t: 0 }; e.dir = d; if (d.x) e.face = d.x; }
        var need = (1 - e.mv.t) / speed;
        if (rem >= need) { rem -= need; e.c = e.mv.tc; e.r = e.mv.tr; e.mv = null; if (isPlayer) arrive(); else if (!pick(e)) return; }
        else { e.mv.t += rem * speed; rem = 0; }
      }
    }
    function arrive() {
      for (var i = pups.length - 1; i >= 0; i--) { var p = pups[i]; if (p.c === pl.c && p.r === pl.r) { pups.splice(i, 1); if (p.k === 'range') pl.range = Math.min(5, pl.range + 1); else if (p.k === 'bomb') pl.maxB = Math.min(4, pl.maxB + 1); else pl.spd = Math.min(1.4, pl.spd + 0.5); spark(px(p.c), py(p.r), '#fff3b0', 10); msg = p.k === 'range' ? 'Bigger blasts' : p.k === 'bomb' ? 'One more bomb' : 'Quicker feet'; msgT = 1; } }
    }
    function playerDir() { return held.length ? held[held.length - 1] : null; }
    function enemyPick(e) {
      var opts = DIRS.filter(function (d) { var tc = e.c + d.x, tr = e.r + d.y; return !blockedFor(tc, tr, false) && !flameAt(tc, tr); });
      if (!opts.length) return null; var back = opts.filter(function (d) { return !(d.x === -e.dir.x && d.y === -e.dir.y); }); if (back.length) opts = back;
      var dist = Math.abs(pl.c - e.c) + Math.abs(pl.r - e.r);
      if (P.chase && dist < 8 && Math.random() < P.chase) { opts.sort(function (a, b) { return (Math.abs(pl.c - (e.c + a.x)) + Math.abs(pl.r - (e.r + a.y))) - (Math.abs(pl.c - (e.c + b.x)) + Math.abs(pl.r - (e.r + b.y))); }); return opts[0]; }
      var straight = opts.filter(function (d) { return d.x === e.dir.x && d.y === e.dir.y; }); if (straight.length && Math.random() < 0.7) return straight[0];
      return opts[Math.floor(Math.random() * opts.length)];
    }
    function pos(e) { var t = e.mv ? e.mv.t : 0, tc = e.mv ? e.mv.tc : e.c, tr = e.mv ? e.mv.tr : e.r; return { x: e.c + (tc - e.c) * t, y: e.r + (tr - e.r) * t }; }
    function hurt() {
      if (pl.inv > 0 || st !== 'play') return; pl.lives--; spark(px(pl.c), py(pl.r), '#ffd36b', 16, 110); shake = 0.25;
      if (pl.lives <= 0) { st = 'rest'; stT = 2.6; msg = 'Rest a moment — then again'; msgT = 2.6; api.setBest(stage); return; }
      pl.c = 0; pl.r = 0; pl.mv = null; pl.inv = 2.4; msg = 'Careful — ' + pl.lives + ' left'; msgT = 1.2;
    }

    function update(dt) {
      clock += dt; if (wantBomb > 0) { wantBomb -= dt; if (placeBomb(true)) wantBomb = 0; } hintT = Math.max(0, hintT - dt * 0.4); shake = Math.max(0, shake - dt); msgT = Math.max(0, msgT - dt); pl.inv = Math.max(0, pl.inv - dt);
      parts.forEach(function (q) { q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 140 * dt; }); parts = parts.filter(function (q) { return q.t > 0; });
      if (st === 'rest') { stT -= dt; if (stT <= 0) newGame(); return; }
      if (st === 'clear') { stT -= dt; if (stT <= 0) { stage++; api.setBest(stage); genMap(); st = 'play'; msg = 'Stage ' + stage; msgT = 1.4; status(); } return; }
      var pd = playerDir();
      if (pl.mv && pd) { var mx = pl.mv.tc - pl.c, my = pl.mv.tr - pl.r; if (pd.x === -mx && pd.y === -my && (mx || my)) { var oc = pl.c, orr = pl.r; pl.c = pl.mv.tc; pl.r = pl.mv.tr; pl.mv = { tc: oc, tr: orr, t: 1 - pl.mv.t }; } }
      stepEntity(pl, dt, P.spd + pl.spd, playerDir, true);
      bombs.forEach(function (b) { b.t -= dt; }); bombs.slice().forEach(function (b) { if (b.t <= 0) detonate(b); });
      flames.forEach(function (f) { f.t -= dt; }); flames = flames.filter(function (f) { return f.t > 0; });
      enemies.forEach(function (e) { stepEntity(e, dt, P.espd, enemyPick, false); });
      // flames and slimes
      var pp = pos(pl), pcx = Math.round(pp.x), pcy = Math.round(pp.y);
      if (flameAt(pcx, pcy)) hurt();
      for (var i = enemies.length - 1; i >= 0; i--) {
        var e = enemies[i], ep = pos(e); if (flameAt(Math.round(ep.x), Math.round(ep.y))) { spark(px(ep.x), py(ep.y), '#b58cff', 14, 100); enemies.splice(i, 1); kills++; continue; }
        if (Math.hypot(ep.x - pp.x, ep.y - pp.y) < 0.62) hurt();
      }
      if (st === 'play' && !enemies.length) { st = 'clear'; stT = 1.8; msg = 'Stage cleared'; msgT = 1.8; }
    }

    // ---- drawing ----
    function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function glow(x, y, r, col, a) { var g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    var bg = document.createElement('canvas'), dpr = Math.min(2, root.devicePixelRatio || 1); bg.width = Math.round(W * dpr); bg.height = Math.round(H * dpr);
    (function paintBg() {
      var g = bg.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); var s = g.createLinearGradient(0, 0, 0, H); s.addColorStop(0, '#101a2c'); s.addColorStop(1, '#0a0f1c'); g.fillStyle = s; g.fillRect(0, 0, W, H);
      g.fillStyle = '#2a2f4a'; g.beginPath(); g.moveTo(ox - 8 + 10, oy - 8); g.arcTo(ox + COLS * T + 8, oy - 8, ox + COLS * T + 8, oy + ROWS * T + 8, 12); g.arcTo(ox + COLS * T + 8, oy + ROWS * T + 8, ox - 8, oy + ROWS * T + 8, 12); g.arcTo(ox - 8, oy + ROWS * T + 8, ox - 8, oy - 8, 12); g.arcTo(ox - 8, oy - 8, ox + COLS * T + 8, oy - 8, 12); g.fill();
      for (var r = 0; r < ROWS; r++) for (var c0 = 0; c0 < COLS; c0++) { g.fillStyle = (r + c0) % 2 ? '#2a5a43' : '#255239'; g.fillRect(ox + c0 * T, oy + r * T, T, T); if ((r * 7 + c0 * 3) % 5 === 0) { g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(ox + c0 * T + T * 0.2, oy + r * T + T * 0.3, 2, 5); g.fillRect(ox + c0 * T + T * 0.6, oy + r * T + T * 0.6, 2, 5); } }
    })();
    function pillText(x, y, w, txt, col) { ctx.fillStyle = 'rgba(10,13,28,.85)'; rr(x, y, w, 24, 12); ctx.fill(); ctx.fillStyle = col || '#ece8dc'; ctx.font = '600 13px -apple-system,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(txt, x + w / 2, y + 17); }
    function draw() {
      ctx.save(); if (shake > 0) ctx.translate((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5); ctx.drawImage(bg, 0, 0, W, H);
      for (var r = 0; r < ROWS; r++) for (var c0 = 0; c0 < COLS; c0++) {
        var g0 = grid[r][c0], x = ox + c0 * T, y = oy + r * T;
        if (g0 === 1) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + 2, y + T * 0.8, T - 2, T * 0.2); ctx.fillStyle = '#4d5472'; rr(x + 1, y + 1, T - 2, T - 3, T * 0.12); ctx.fill(); ctx.fillStyle = '#7b84a6'; rr(x + 1, y + 1, T - 2, T * 0.34, T * 0.12); ctx.fill(); ctx.fillStyle = '#3a405a'; ctx.fillRect(x + 3, y + T * 0.7, T - 6, T * 0.2); }
        else if (g0 === 2) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x + 2, y + T * 0.84, T - 2, T * 0.16); ctx.fillStyle = '#9a6a38'; rr(x + 2, y + 2, T - 4, T - 5, T * 0.1); ctx.fill(); ctx.fillStyle = '#c0894a'; rr(x + 2, y + 2, T - 4, T * 0.3, T * 0.1); ctx.fill(); ctx.strokeStyle = '#6f4a24'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 3, y + T * 0.5); ctx.lineTo(x + T - 3, y + T * 0.5); ctx.moveTo(x + 3, y + T * 0.75); ctx.lineTo(x + T - 3, y + T * 0.75); ctx.stroke(); ctx.fillStyle = '#e6c07a'; [[0.2, 0.2], [0.8, 0.2]].forEach(function (p) { ctx.beginPath(); ctx.arc(x + T * p[0], y + T * p[1], 1.5, 0, 7); ctx.fill(); }); }
      }
      pups.forEach(function (p) { var bob = Math.sin(clock * 4 + p.c) * 2; ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(px(p.c), py(p.r) + T * 0.3, T * 0.25, T * 0.08, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#242a48'; ctx.beginPath(); ctx.arc(px(p.c), py(p.r) + bob, T * 0.34, 0, 7); ctx.fill(); ctx.strokeStyle = '#F2C879'; ctx.lineWidth = 2; ctx.stroke(); ctx.font = Math.round(T * 0.42) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(p.k === 'range' ? '🔥' : p.k === 'bomb' ? '💣' : '⚡', px(p.c), py(p.r) + bob + T * 0.15); });
      bombs.forEach(function (b) { var k = 1 - b.t / P.fuse, sz = 1 + Math.sin(clock * (8 + k * 14)) * 0.07 * (0.5 + k), x = px(b.c), y = py(b.r) + T * 0.04; ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y + T * 0.3, T * 0.3, T * 0.1, 0, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'lighter'; glow(x, y, T * (0.5 + k * 0.4), 'rgba(255,90,60,A)', 0.1 + k * 0.35); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#1c2033'; ctx.beginPath(); ctx.arc(x, y, T * 0.32 * sz, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(x - T * 0.1, y - T * 0.1, T * 0.09, 0, 7); ctx.fill(); ctx.strokeStyle = '#cdbb94'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + T * 0.1, y - T * 0.3); ctx.quadraticCurveTo(x + T * 0.25, y - T * 0.5, x + T * 0.34, y - T * 0.4); ctx.stroke(); ctx.globalCompositeOperation = 'lighter'; glow(x + T * 0.34, y - T * 0.42, T * 0.2, 'rgba(255,200,90,A)', 0.8 + Math.sin(clock * 30) * 0.2); ctx.globalCompositeOperation = 'source-over'; });
      flames.forEach(function (f) { var a = f.t / f.m, x = px(f.c), y = py(f.r); ctx.globalCompositeOperation = 'lighter'; glow(x, y, T * 0.95, 'rgba(255,120,40,A)', 0.55 * a); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(255,170,60,' + (0.55 + a * 0.4) + ')'; rr(x - T * 0.44, y - T * 0.44, T * 0.88, T * 0.88, T * 0.22); ctx.fill(); ctx.fillStyle = 'rgba(255,240,170,' + a + ')'; rr(x - T * 0.26, y - T * 0.26, T * 0.52, T * 0.52, T * 0.16); ctx.fill(); });
      // creatures, tallest row last
      var list = enemies.map(function (e) { return { y: pos(e).y, f: function () { slime(e); } }; }); list.push({ y: pos(pl).y, f: hero }); list.sort(function (a, b) { return a.y - b.y; }).forEach(function (it) { it.f(); });
      parts.forEach(function (q) { ctx.globalAlpha = Math.min(1, q.t * 2); ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 7); ctx.fill(); }); ctx.globalAlpha = 1; ctx.restore();
      // HUD
      var hx = ox; ctx.textAlign = 'center'; pillText(hx, 6, 74, 'Stage ' + stage); for (var i = 0; i < Math.min(pl.lives, 8); i++) { ctx.font = '16px sans-serif'; ctx.fillStyle = '#e5383b'; ctx.fillText('♥', ox + COLS * T - 14 - i * 18, 24); }
      pillText(ox + 84, 6, 70, '💣' + pl.maxB + ' 🔥' + pl.range); pillText(ox + 164, 6, 66, '👾 ' + enemies.length);
      if (steer) { ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(steer.ax, steer.ay, 34, 0, 7); ctx.stroke(); ctx.fillStyle = 'rgba(242,200,121,.35)'; ctx.beginPath(); ctx.arc(steer.x, steer.y, 14, 0, 7); ctx.fill(); }
      else if (hintT > 0) { ctx.textAlign = 'center'; ctx.font = '14px -apple-system,sans-serif'; ctx.fillStyle = 'rgba(225,230,245,' + Math.min(0.85, hintT) + ')'; ctx.fillText('Drag anywhere to walk · tap to drop a bomb', W / 2, oy + T * ROWS + 30); }
      if (msgT > 0) { ctx.textAlign = 'center'; ctx.font = '22px Georgia,serif'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(5,8,16,' + Math.min(0.85, msgT) + ')'; ctx.strokeText(msg, W / 2, oy + T * ROWS * 0.5); ctx.fillStyle = 'rgba(250,244,226,' + Math.min(1, msgT * 1.5) + ')'; ctx.fillText(msg, W / 2, oy + T * ROWS * 0.5); }
    }
    function hero() {
      var p = pos(pl), x = px(p.x), y = py(p.y), moving = !!pl.mv, bob = moving ? Math.abs(Math.sin(clock * 14)) * T * 0.05 : Math.sin(clock * 3) * T * 0.015;
      if (pl.inv > 0 && Math.floor(clock * 12) % 2) return;
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y + T * 0.33, T * 0.3, T * 0.1, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#e9b44f'; rr(x - T * 0.27, y - T * 0.05 - bob, T * 0.54, T * 0.4, T * 0.14); ctx.fill(); ctx.fillStyle = '#c98f2e'; ctx.fillRect(x - T * 0.27, y + T * 0.2 - bob, T * 0.54, T * 0.06);
      ctx.fillStyle = '#f6d9ae'; ctx.beginPath(); ctx.arc(x, y - T * 0.2 - bob, T * 0.27, 0, 7); ctx.fill();
      ctx.fillStyle = '#3d6fb5'; ctx.beginPath(); ctx.arc(x, y - T * 0.26 - bob, T * 0.27, Math.PI, 0); ctx.fill(); ctx.fillRect(x - T * 0.27, y - T * 0.28 - bob, T * 0.54, T * 0.06); ctx.fillRect(x + (pl.face > 0 ? 0 : -T * 0.4), y - T * 0.28 - bob, T * 0.4, T * 0.05);
      ctx.fillStyle = '#2a2230'; ctx.beginPath(); ctx.arc(x + pl.face * T * 0.1 - T * 0.07, y - T * 0.17 - bob, T * 0.04, 0, 7); ctx.arc(x + pl.face * T * 0.1 + T * 0.09, y - T * 0.17 - bob, T * 0.04, 0, 7); ctx.fill();
    }
    function slime(e) {
      var p = pos(e), x = px(p.x), y = py(p.y), sq = Math.sin(clock * 7 + e.ph) * 0.08, cols = [['#9b6bff', '#6e44c9'], ['#5bd0b0', '#2f9c82'], ['#ff8aa8', '#c4506f']][e.hue];
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y + T * 0.33, T * 0.32, T * 0.1, 0, 0, 7); ctx.fill();
      ctx.fillStyle = cols[1]; ctx.beginPath(); ctx.ellipse(x, y + T * 0.12, T * (0.36 + sq), T * (0.26 - sq), 0, 0, 7); ctx.fill(); ctx.fillStyle = cols[0]; ctx.beginPath(); ctx.ellipse(x, y + T * 0.06, T * (0.34 + sq), T * (0.28 - sq), 0, Math.PI, 0); ctx.ellipse(x, y + T * 0.08, T * (0.34 + sq), T * (0.2 - sq), 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(x - T * 0.1, y - T * 0.08, T * 0.1, T * 0.06, -0.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - T * 0.12, y + T * 0.02, T * 0.08, 0, 7); ctx.arc(x + T * 0.12, y + T * 0.02, T * 0.08, 0, 7); ctx.fill(); ctx.fillStyle = '#1b1426'; var ex = e.dir.x * T * 0.03, ey = e.dir.y * T * 0.03; ctx.beginPath(); ctx.arc(x - T * 0.12 + ex, y + T * 0.03 + ey, T * 0.04, 0, 7); ctx.arc(x + T * 0.12 + ex, y + T * 0.03 + ey, T * 0.04, 0, 7); ctx.fill();
    }

    // ---- controls: you watch the maze, not buttons ----
    // Put a finger down anywhere and drag to walk (a floating stick: it follows your finger, so you can change direction without lifting).
    // A quick tap anywhere drops a bomb, and so does tapping with a second finger while the first keeps walking.
    var steer = null, ptrs = {};
    c.cv.style.touchAction = 'none';
    function steerDir() {
      if (!steer) return null; var dx = steer.x - steer.ax, dy = steer.y - steer.ay, m = Math.hypot(dx, dy); if (m < 12) return null;
      if (m > 34) { steer.ax = steer.x - dx / m * 34; steer.ay = steer.y - dy / m * 34; dx = steer.x - steer.ax; dy = steer.y - steer.ay; }
      return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIRS[0] : DIRS[1]) : (dy > 0 ? DIRS[2] : DIRS[3]);
    }
    var keyHeld = [], stick = null;
    function refresh() { held = keyHeld.slice(); if (stick) held.push(stick); }
    function setSteer() { stick = steerDir(); refresh(); }
    function pxy(e) { var r = c.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    c.cv.addEventListener('pointerdown', function (e) {
      e.preventDefault(); var p = pxy(e); try { c.cv.setPointerCapture(e.pointerId); } catch (x) {}
      if (steer) { placeBomb(); return; }                                              // a second finger = bomb
      steer = { id: e.pointerId, ax: p.x, ay: p.y, x: p.x, y: p.y, t: Date.now(), moved: 0 }; hintT = 0;
    });
    c.cv.addEventListener('pointermove', function (e) { if (!steer || e.pointerId !== steer.id) return; var p = pxy(e); steer.moved = Math.max(steer.moved, Math.hypot(p.x - steer.x, p.y - steer.y)); steer.x = p.x; steer.y = p.y; setSteer(); });
    // A relaxed tap: up to half a second, with a little finger drift.
    function lift(e) { if (!steer || e.pointerId !== steer.id) return; var tap = e.type === 'pointerup' && Date.now() - steer.t < 480 && Math.hypot(steer.x - steer.ax, steer.y - steer.ay) < 24 && steer.moved < 24; steer = null; setSteer(); if (tap) placeBomb(); }
    c.cv.addEventListener('pointerup', lift); c.cv.addEventListener('pointercancel', lift); c.cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    var KEYS = { ArrowUp: DIRS[3], ArrowDown: DIRS[2], ArrowLeft: DIRS[1], ArrowRight: DIRS[0], w: DIRS[3], s: DIRS[2], a: DIRS[1], d: DIRS[0] };
    function kd(e) { var d = KEYS[e.key]; if (d) { e.preventDefault(); keyHeld = keyHeld.filter(function (h) { return h !== d; }); keyHeld.push(d); refresh(); } else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); placeBomb(); } }
    function ku(e) { var d = KEYS[e.key]; if (d) { keyHeld = keyHeld.filter(function (h) { return h !== d; }); refresh(); } }
    document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
    newGame();
    var stop = K.loop(function (dt) { if (alive) { update(dt); draw(); } });
    return { stop: function () { alive = false; stop(); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); }, restart: newGame, peek: function () { return { st: st, stage: stage, pl: pl, enemies: enemies, bombs: bombs, flames: flames, grid: grid, held: held, placeBomb: placeBomb, setHeld: function (a) { held = a; }, pups: pups, T: T }; } };
  }

  G.list.push(G.reg({ id: 'blast', title: 'Blast Maze', blurb: 'Drag anywhere to walk, tap to drop a bomb. Clear the crates, grab power-ups, blow up the slimes. Mind your own blast.', make: blast,
    levels: { easy: 'Five lives, three slow slimes, a long fuse, and plenty of power-ups.', normal: 'Three lives, four slimes that sometimes come looking for you.', hard: 'Two lives, five quick slimes that hunt you, a short fuse.' }, bestLabel: function (b) { return 'stage ' + b; } }));
})(typeof window !== 'undefined' ? window : globalThis);
