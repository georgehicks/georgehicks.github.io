/* Bloom Scroll — Putt. Mini golf on a freshly made course every hole: pull back anywhere, let go, and roll the ball into the cup.
   Walls bounce, sand drags, water costs a stroke, bumpers kick, and on Hard a windmill turns across the green. Courses are always checked so the cup can be reached.
   Easy shows the whole path of your shot, Normal a short part of it, Hard only the direction and power. No game over: a round ends and the next begins. */
(function (root) {
  'use strict';
  var K = root.MannaKit, G = root.MannaGames, rand = K.rand, ri = K.ri;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function putt(level, host, api) {
    var P = {
      easy: { holes: 6, hr: 15, vmax: 780, fric: 1.45, sandF: 4, guide: 2, ob: [0, 2], bump: [0, 0], water: 0, sand: 1, mill: 0, sink: 360, pick: 9 },
      normal: { holes: 9, hr: 12, vmax: 880, fric: 1.65, sandF: 5, guide: 1, ob: [1, 3], bump: [0, 1], water: 1, sand: 2, mill: 0, sink: 290, pick: 8 },
      hard: { holes: 9, hr: 10.5, vmax: 960, fric: 1.85, sandF: 5.5, guide: 0, ob: [2, 4], bump: [1, 2], water: 2, sand: 2, mill: 1, sink: 240, pick: 7 }
    }[level];
    var c = K.canvas(host), W = c.W, H = c.H, ctx = c.ctx, R = 7, M = 14, fx0 = M, fx1 = W - M, fy0 = 62, fy1 = H - M;
    var hole = 0, total = 0, parTotal = 0, card = [], clock = 0, alive = true;
    var tee, cup, walls, bumps, sands, waters, mill, par, strokes, ball, st, stT, msg, msgT, aim, trail, lastRest, sinkT, parts, flagT = 0, bestPath;

    // ---------- making a course ----------
    function circleHitsRect(x, y, r, w) { var cx = clamp(x, w.x, w.x + w.w), cy = clamp(y, w.y, w.y + w.h); return (x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r; }
    function blockedAt(x, y, pad) {
      for (var i = 0; i < walls.length; i++) if (circleHitsRect(x, y, R + pad, walls[i])) return true;
      for (i = 0; i < bumps.length; i++) if (Math.hypot(x - bumps[i].x, y - bumps[i].y) < bumps[i].r + R + pad) return true;
      for (i = 0; i < waters.length; i++) if (circleHitsRect(x, y, pad, waters[i])) return true;
      return false;
    }
    function reachable() {
      var s = 12, cols = Math.ceil((fx1 - fx0) / s), rows = Math.ceil((fy1 - fy0) / s), seen = new Uint8Array(cols * rows), dist = new Int16Array(cols * rows), q = [], head = 0;
      function id(x, y) { return Math.floor((y - fy0) / s) * cols + Math.floor((x - fx0) / s); }
      var start = id(tee.x, tee.y); seen[start] = 1; q.push(start);
      while (head < q.length) {
        var cur = q[head++], cx = (cur % cols) * s + fx0 + s / 2, cy = Math.floor(cur / cols) * s + fy0 + s / 2;
        if (Math.hypot(cx - cup.x, cy - cup.y) < 14) return dist[cur] * s;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var nx = cx + d[0] * s, ny = cy + d[1] * s; if (nx < fx0 + R || nx > fx1 - R || ny < fy0 + R || ny > fy1 - R) return; var n = id(nx, ny); if (seen[n] || blockedAt(nx, ny, 3)) return; seen[n] = 1; dist[n] = dist[cur] + 1; q.push(n); });
      }
      return -1;
    }
    function makeHole() {
      for (var tries = 0; tries < 60; tries++) {
        tee = { x: rand(fx0 + 60, fx1 - 60), y: fy1 - 46 }; cup = { x: rand(fx0 + 50, fx1 - 50), y: fy0 + rand(46, 90) };
        walls = []; bumps = []; sands = []; waters = []; mill = null;
        var nOb = tries > 40 ? 0 : ri(P.ob[0], P.ob[1]) + (hole >= 5 && level !== 'easy' ? 1 : 0), i, k;
        for (i = 0; i < nOb; i++) {
          var horiz = Math.random() < 0.6, w = horiz ? rand(70, 150) : 18, h = horiz ? 18 : rand(70, 150), x = rand(fx0 + 10, fx1 - 10 - w), y = rand(fy0 + 110, fy1 - 110 - h);
          var wl = { x: x, y: y, w: w, h: h }; if (circleHitsRect(tee.x, tee.y, 56, wl) || circleHitsRect(cup.x, cup.y, 50, wl)) continue; walls.push(wl);
        }
        if (tries < 45) for (i = 0, k = ri(P.bump[0], P.bump[1]); i < k; i++) { var b = { x: rand(fx0 + 50, fx1 - 50), y: rand(fy0 + 120, fy1 - 130), r: rand(14, 19) }; if (Math.hypot(b.x - tee.x, b.y - tee.y) < 80 || Math.hypot(b.x - cup.x, b.y - cup.y) < 70) continue; bumps.push(b); }
        for (i = 0; i < P.water && tries < 40; i++) { var ww = rand(60, 110), wh = rand(36, 60), wt = { x: rand(fx0 + 8, fx1 - 8 - ww), y: rand(fy0 + 130, fy1 - 130 - wh), w: ww, h: wh }; if (circleHitsRect(tee.x, tee.y, 60, wt) || circleHitsRect(cup.x, cup.y, 56, wt)) continue; waters.push(wt); }
        for (i = 0; i < P.sand; i++) { var sw = rand(60, 110), sh = rand(50, 90), sa = { x: rand(fx0 + 8, fx1 - 8 - sw), y: rand(fy0 + 90, fy1 - 90 - sh), w: sw, h: sh }; if (circleHitsRect(cup.x, cup.y, 34, sa) || circleHitsRect(tee.x, tee.y, 40, sa) || waters.some(function (w) { return sa.x < w.x + w.w + 6 && sa.x + sa.w > w.x - 6 && sa.y < w.y + w.h + 6 && sa.y + sa.h > w.y - 6; })) continue; sands.push(sa); }
        if (P.mill && tries < 35) { mill = { x: rand(fx0 + 90, fx1 - 90), y: (tee.y + cup.y) / 2 + rand(-30, 30), L: rand(52, 70), a: Math.random() * 6, w: (Math.random() < 0.5 ? -1 : 1) * rand(1.1, 1.7) }; }
        var d = reachable(); if (d < 0) continue;
        par = clamp(Math.ceil(d / 340) + (walls.length + bumps.length + waters.length >= 3 ? 1 : 0), 2, 5); return;
      }
      walls = []; bumps = []; sands = []; waters = []; mill = null; par = 2;
    }
    function startHole() {
      makeHole(); strokes = 0; ball = { x: tee.x, y: tee.y, vx: 0, vy: 0, r: 1 }; lastRest = { x: tee.x, y: tee.y }; st = 'aim'; aim = null; trail = []; sinkT = 0; parts = [];
      msg = 'Hole ' + (hole + 1) + ' · par ' + par; msgT = 1.6; status();
    }
    function newRound() { hole = 0; total = 0; parTotal = 0; card = []; startHole(); }
    function status() { api.status(api.best() ? 'best round ' + api.best() : 'a new course every hole'); }

    // ---------- physics ----------
    function rectBounce(b, w, e) {
      var cx = clamp(b.x, w.x, w.x + w.w), cy = clamp(b.y, w.y, w.y + w.h), dx = b.x - cx, dy = b.y - cy, d2 = dx * dx + dy * dy, nx, ny;
      if (d2 >= R * R) return false;
      if (d2 > 1e-6) { var d = Math.sqrt(d2); nx = dx / d; ny = dy / d; b.x = cx + nx * R; b.y = cy + ny * R; }
      else { var l = b.x - w.x, r = w.x + w.w - b.x, t = b.y - w.y, bo = w.y + w.h - b.y, m = Math.min(l, r, t, bo); nx = m === l ? -1 : m === r ? 1 : 0; ny = m === t ? -1 : m === bo ? 1 : 0; b.x += nx * (m + R); b.y += ny * (m + R); }
      var vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; } return true;
    }
    function stepBall(b, dt, a, evs) {
      var sp = Math.hypot(b.vx, b.vy), n = Math.max(1, Math.ceil(sp * dt / (R * 0.7))), h = dt / n;
      for (var i = 0; i < n; i++) {
        b.x += b.vx * h; b.y += b.vy * h;
        if (b.x < fx0 + R) { b.x = fx0 + R; b.vx = Math.abs(b.vx) * 0.82; evs && evs.push('wall'); } if (b.x > fx1 - R) { b.x = fx1 - R; b.vx = -Math.abs(b.vx) * 0.82; evs && evs.push('wall'); }
        if (b.y < fy0 + R) { b.y = fy0 + R; b.vy = Math.abs(b.vy) * 0.82; evs && evs.push('wall'); } if (b.y > fy1 - R) { b.y = fy1 - R; b.vy = -Math.abs(b.vy) * 0.82; evs && evs.push('wall'); }
        for (var k = 0; k < walls.length; k++) if (rectBounce(b, walls[k], 0.8) && evs) evs.push('wall');
        for (k = 0; k < bumps.length; k++) { var bp = bumps[k], dx = b.x - bp.x, dy = b.y - bp.y, d = Math.hypot(dx, dy); if (d < bp.r + R && d > 0) { var nx = dx / d, ny = dy / d; b.x = bp.x + nx * (bp.r + R); b.y = bp.y + ny * (bp.r + R); var vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= 2.15 * vn * nx; b.vy -= 2.15 * vn * ny; } if (evs) evs.push('bump'); bp.hit = 0.18; } }
        if (mill) {
          var ca = Math.cos(a), sa = Math.sin(a), ax = mill.x - ca * mill.L, ay = mill.y - sa * mill.L, bx2 = mill.x + ca * mill.L, by2 = mill.y + sa * mill.L, ex = bx2 - ax, ey = by2 - ay, tt = clamp(((b.x - ax) * ex + (b.y - ay) * ey) / (ex * ex + ey * ey), 0, 1), px = ax + ex * tt, py = ay + ey * tt, mx = b.x - px, my = b.y - py, md = Math.hypot(mx, my);
          if (md < R + 5 && md > 0) { var mnx = mx / md, mny = my / md; b.x = px + mnx * (R + 5); b.y = py + mny * (R + 5); var rvx = b.vx - (-(py - mill.y) * mill.w), rvy = b.vy - ((px - mill.x) * mill.w), mvn = rvx * mnx + rvy * mny; if (mvn < 0) { b.vx -= 1.9 * mvn * mnx; b.vy -= 1.9 * mvn * mny; } if (evs) evs.push('mill'); }
        }
      }
      var f = P.fric; for (var s = 0; s < sands.length; s++) if (b.x > sands[s].x && b.x < sands[s].x + sands[s].w && b.y > sands[s].y && b.y < sands[s].y + sands[s].h) f = P.sandF;
      var dec = Math.exp(-f * dt); b.vx *= dec; b.vy *= dec; if (Math.hypot(b.vx, b.vy) < 22) { b.vx *= 0.93; b.vy *= 0.93; }
      for (s = 0; s < waters.length; s++) if (b.x > waters[s].x && b.x < waters[s].x + waters[s].w && b.y > waters[s].y && b.y < waters[s].y + waters[s].h) { evs && evs.push('water'); return; }
      var cd = Math.hypot(b.x - cup.x, b.y - cup.y), v = Math.hypot(b.vx, b.vy);
      if (cd < P.hr && v < P.sink) evs && evs.push('sink'); else if (cd < P.hr * 1.5 && v < P.sink * 0.5) { b.vx += (cup.x - b.x) * 1.2 * dt; b.vy += (cup.y - b.y) * 1.2 * dt; }
    }
    function simulate(vx, vy, steps) {
      var b = { x: ball.x, y: ball.y, vx: vx, vy: vy }, pts = [[b.x, b.y]], a = mill ? mill.a : 0, evs;
      for (var i = 0; i < steps; i++) { evs = []; if (mill) a += mill.w * (1 / 60); stepBall(b, 1 / 60, a, evs); if (i % 3 === 0) pts.push([b.x, b.y]); if (evs.indexOf('water') >= 0 || evs.indexOf('sink') >= 0 || Math.hypot(b.vx, b.vy) < 8) break; }
      return pts;
    }
    function shoot(dx, dy, power) {
      var v = 140 + power * (P.vmax - 140), l = Math.hypot(dx, dy) || 1; ball.vx = dx / l * v; ball.vy = dy / l * v; strokes++; st = 'roll'; lastRest = { x: ball.x, y: ball.y }; trail = []; aim = null; status();
    }
    function sunk() {
      st = 'sink'; sinkT = 0.5; ball.vx = ball.vy = 0; var s = strokes, d = s - par, name = s === 1 ? 'Hole in one!' : d <= -2 ? 'Eagle!' : d === -1 ? 'Birdie' : d === 0 ? 'Par' : d === 1 ? 'Bogey' : '+' + d;
      msg = name + ' — ' + s; msgT = 1.8; for (var i = 0; i < 16; i++) { var a = Math.random() * 6.3; parts.push({ x: cup.x, y: cup.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90 - 40, t: 0.7, col: ['#ffe9a8', '#fff', '#9be8b5'][i % 3], r: 2 }); }
    }
    function pickUp() { if (strokes >= par + P.pick) { msg = 'Pick it up — ' + strokes; msgT = 1.5; finishHole(strokes); } }
    function finishHole(strk) {
      card.push(strk); total += strk; parTotal += par; hole++;
      if (hole >= P.holes) { var diff = total - parTotal; msg = 'Round done: ' + total + (diff ? (diff > 0 ? ' (+' : ' (') + diff + ')' : ' (level par)'); msgT = 3; st = 'end'; stT = 3.4; api.setBest(total, true); }
      else { st = 'next'; stT = 1.5; }
    }

    // ---------- input: pull back anywhere, release to roll ----------
    function pt(e) { var r = c.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    c.cv.addEventListener('pointerdown', function (e) { if (st !== 'aim') return; var p = pt(e); aim = { sx: p.x, sy: p.y, x: p.x, y: p.y }; try { c.cv.setPointerCapture(e.pointerId); } catch (x) {} });
    c.cv.addEventListener('pointermove', function (e) { if (aim) { var p = pt(e); aim.x = p.x; aim.y = p.y; } });
    function release() { if (!aim) return; var pl = K.pull(aim.sx, aim.sy, aim.x, aim.y, W, H, 130); aim = null; if (pl.pw > 0.06 && st === 'aim') shoot(pl.dx, pl.dy, pl.pw); }
    c.cv.addEventListener('pointerup', release); c.cv.addEventListener('pointercancel', function () { aim = null; });

    function update(dt) {
      clock += dt; msgT = Math.max(0, msgT - dt); flagT += dt; if (mill) mill.a += mill.w * dt;
      bumps.forEach(function (b) { b.hit = Math.max(0, (b.hit || 0) - dt); });
      parts.forEach(function (q) { q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 150 * dt; }); parts = parts.filter(function (q) { return q.t > 0; });
      if (st === 'roll') {
        var evs = []; stepBall(ball, dt, mill ? mill.a : 0, evs); trail.push([ball.x, ball.y]); if (trail.length > 18) trail.shift();
        if (evs.indexOf('water') >= 0) { for (var i = 0; i < 12; i++) { var a = Math.random() * 6.3; parts.push({ x: ball.x, y: ball.y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70 - 60, t: 0.6, col: '#bfe8ff', r: 2.2 }); } strokes++; msg = 'Splash — one stroke added'; msgT = 1.6; ball.x = lastRest.x; ball.y = lastRest.y; ball.vx = ball.vy = 0; st = 'aim'; trail = []; status(); pickUp(); return; }
        if (evs.indexOf('sink') >= 0) { sunk(); return; }
        if (Math.hypot(ball.vx, ball.vy) < 6) { ball.vx = ball.vy = 0; st = 'aim'; trail = []; pickUp(); }
      } else if (st === 'sink') { sinkT -= dt; ball.x += (cup.x - ball.x) * Math.min(1, 12 * dt); ball.y += (cup.y - ball.y) * Math.min(1, 12 * dt); ball.r = Math.max(0, sinkT / 0.5); if (sinkT <= 0) finishHole(strokes); }
      else if (st === 'next') { stT -= dt; if (stT <= 0) { startHole(); } }
      else if (st === 'end') { stT -= dt; if (stT <= 0) newRound(); }
    }

    // ---------- drawing ----------
    function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function pill(x, y, w, txt, col) { ctx.fillStyle = 'rgba(10,13,28,.85)'; rr(x, y, w, 26, 13); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.stroke(); ctx.fillStyle = col || '#ece8dc'; ctx.font = '600 13px -apple-system,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(txt, x + w / 2, y + 18); }
    var bgc = document.createElement('canvas'), bgHole = -1;
    function paintBg() {
      var dpr = Math.min(2, root.devicePixelRatio || 1); bgc.width = Math.round(W * dpr); bgc.height = Math.round(H * dpr); var g = bgc.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = '#0f2a1d'; g.fillRect(0, 0, W, H);
      for (var y = fy0; y < fy1; y += 24) { g.fillStyle = ((y - fy0) / 24) % 2 ? '#2e7d4a' : '#2a7445'; g.fillRect(fx0, y, fx1 - fx0, Math.min(24, fy1 - y)); }
      sands.forEach(function (s) { g.fillStyle = '#d9c28a'; g.beginPath(); g.ellipse(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, s.h / 2, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(160,130,70,.35)'; for (var i = 0; i < 26; i++) g.fillRect(s.x + Math.random() * s.w * 0.9 + s.w * 0.05, s.y + Math.random() * s.h * 0.9 + s.h * 0.05, 2, 2); });
      g.fillStyle = '#245e3a'; rr2(g, tee.x - 20, tee.y - 12, 40, 24, 6); g.fill(); g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 1; g.stroke();
      // rail around the green
      g.strokeStyle = '#8a5a2b'; g.lineWidth = 8; rr2(g, fx0 - 2, fy0 - 2, fx1 - fx0 + 4, fy1 - fy0 + 4, 8); g.stroke(); g.strokeStyle = '#b98543'; g.lineWidth = 3; rr2(g, fx0 - 4, fy0 - 4, fx1 - fx0 + 8, fy1 - fy0 + 8, 9); g.stroke();
      var v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,10,5,.4)'); g.fillStyle = v; g.fillRect(0, 0, W, H); bgHole = hole;
    }
    function rr2(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
    var lastKey = '';
    function draw() {
      var key = hole + ':' + par + ':' + tee.x; if (key !== lastKey) { lastKey = key; paintBg(); }
      ctx.drawImage(bgc, 0, 0, W, H);
      waters.forEach(function (w) { var g = ctx.createLinearGradient(0, w.y, 0, w.y + w.h); g.addColorStop(0, '#3b86c8'); g.addColorStop(1, '#215d9a'); ctx.fillStyle = g; rr(w.x, w.y, w.w, w.h, 14); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; for (var i = 0; i < 3; i++) { var yy = w.y + w.h * (0.25 + i * 0.25); ctx.beginPath(); for (var x = w.x + 8; x < w.x + w.w - 8; x += 4) { var yv = yy + Math.sin(x * 0.12 + clock * 2 + i) * 2.2; x === w.x + 8 ? ctx.moveTo(x, yv) : ctx.lineTo(x, yv); } ctx.stroke(); } ctx.strokeStyle = '#6aa6dc'; ctx.lineWidth = 2; rr(w.x, w.y, w.w, w.h, 14); ctx.stroke(); });
      // the cup and its flag
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.arc(cup.x, cup.y + 1, P.hr + 2, 0, 7); ctx.fill(); ctx.fillStyle = '#0c0f10'; ctx.beginPath(); ctx.arc(cup.x, cup.y, P.hr, 0, 7); ctx.fill(); ctx.strokeStyle = '#d9d2bd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cup.x, cup.y, P.hr, 0, 7); ctx.stroke();
      var fw = Math.sin(flagT * 4) * 3; ctx.strokeStyle = '#efe7d0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cup.x, cup.y); ctx.lineTo(cup.x, cup.y - 44); ctx.stroke(); ctx.fillStyle = '#e5383b'; ctx.beginPath(); ctx.moveTo(cup.x, cup.y - 44); ctx.quadraticCurveTo(cup.x + 14, cup.y - 44 + fw, cup.x + 26, cup.y - 38 + fw * 1.4); ctx.quadraticCurveTo(cup.x + 14, cup.y - 34 + fw, cup.x, cup.y - 30); ctx.fill();
      walls.forEach(function (w) { ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(w.x + 3, w.y + 4, w.w, w.h, 4); ctx.fill(); ctx.fillStyle = '#9d6a33'; rr(w.x, w.y, w.w, w.h, 4); ctx.fill(); ctx.fillStyle = '#c9954f'; rr(w.x, w.y, w.w, Math.min(6, w.h / 2), 4); ctx.fill(); ctx.strokeStyle = 'rgba(70,40,15,.5)'; ctx.lineWidth = 1; for (var i = 1; i < 4; i++) { ctx.beginPath(); if (w.w > w.h) { ctx.moveTo(w.x + w.w * i / 4, w.y + 2); ctx.lineTo(w.x + w.w * i / 4, w.y + w.h - 2); } else { ctx.moveTo(w.x + 2, w.y + w.h * i / 4); ctx.lineTo(w.x + w.w - 2, w.y + w.h * i / 4); } ctx.stroke(); } });
      bumps.forEach(function (b) { var s = 1 + (b.hit || 0) * 1.2; ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(b.x + 3, b.y + 4, b.r * s, 0, 7); ctx.fill(); ctx.fillStyle = '#e9788a'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * s, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * s * 0.62, 0, 7); ctx.fill(); ctx.fillStyle = '#e9788a'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * s * 0.3, 0, 7); ctx.fill(); });
      if (mill) { var ca = Math.cos(mill.a), sa = Math.sin(mill.a); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(mill.x - ca * mill.L + 3, mill.y - sa * mill.L + 4); ctx.lineTo(mill.x + ca * mill.L + 3, mill.y + sa * mill.L + 4); ctx.stroke(); ctx.strokeStyle = '#f2f2f2'; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(mill.x - ca * mill.L, mill.y - sa * mill.L); ctx.lineTo(mill.x + ca * mill.L, mill.y + sa * mill.L); ctx.stroke(); ctx.strokeStyle = '#d6453f'; ctx.lineWidth = 11; ctx.setLineDash([9, 9]); ctx.beginPath(); ctx.moveTo(mill.x - ca * mill.L, mill.y - sa * mill.L); ctx.lineTo(mill.x + ca * mill.L, mill.y + sa * mill.L); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#8a5a2b'; ctx.beginPath(); ctx.arc(mill.x, mill.y, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#c9954f'; ctx.beginPath(); ctx.arc(mill.x, mill.y, 5, 0, 7); ctx.fill(); }
      // trail, aim, ball
      if (trail.length > 1) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); trail.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.stroke(); }
      if (aim && st === 'aim') {
        var pl = K.pull(aim.sx, aim.sy, aim.x, aim.y, W, H, 130), dx = pl.dx, dy = pl.dy, len = pl.l, pw = pl.pw;
        if (len > 8) {
          var ux = dx / len, uy = dy / len, v = 140 + pw * (P.vmax - 140);
          if (P.guide > 0) { var pts = simulate(ux * v, uy * v, 260), use = P.guide === 2 ? pts.length : Math.min(pts.length, 12); ctx.setLineDash([2, 7]); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3; ctx.beginPath(); for (var i = 0; i < use; i++) i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1]); ctx.stroke(); ctx.setLineDash([]); }
          var al = 24 + pw * 54; ctx.strokeStyle = 'rgba(255,233,168,.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ball.x + ux * 12, ball.y + uy * 12); ctx.lineTo(ball.x + ux * (12 + al), ball.y + uy * (12 + al)); ctx.stroke(); ctx.fillStyle = 'rgba(255,233,168,.95)'; ctx.beginPath(); var ex = ball.x + ux * (12 + al), ey = ball.y + uy * (12 + al); ctx.moveTo(ex + ux * 9, ey + uy * 9); ctx.lineTo(ex - uy * 6, ey + ux * 6); ctx.lineTo(ex + uy * 6, ey - ux * 6); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ball.x, ball.y); ctx.lineTo(ball.x - ux * len * 0.6, ball.y - uy * len * 0.6); ctx.stroke();
          ctx.strokeStyle = pw > 0.85 ? '#ff9a7a' : '#9be8b5'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ball.x, ball.y, 17, -Math.PI / 2, -Math.PI / 2 + pw * 6.283); ctx.stroke();
        }
      }
      if (ball.r > 0.02) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(ball.x + 2, ball.y + 3, R * ball.r, R * 0.7 * ball.r, 0, 0, 7); ctx.fill(); var g = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, R * ball.r); g.addColorStop(0, '#fff'); g.addColorStop(1, '#cfd5e3'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ball.x, ball.y, R * ball.r, 0, 7); ctx.fill(); }
      parts.forEach(function (q) { ctx.globalAlpha = Math.min(1, q.t * 2); ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 7); ctx.fill(); }); ctx.globalAlpha = 1;
      // HUD
      pill(10, 12, 92, 'Hole ' + Math.min(hole + 1, P.holes) + ' / ' + P.holes); pill(W / 2 - 34, 12, 68, 'Par ' + par); pill(W - 112, 12, 102, strokes + ' stroke' + (strokes === 1 ? '' : 's'), '#F2C879');
      if (card.length) { ctx.fillStyle = 'rgba(200,206,225,.7)'; ctx.font = '12px -apple-system,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Round so far: ' + total + ' (par ' + parTotal + ')', W / 2, 52); }
      if (msgT > 0) { ctx.textAlign = 'center'; ctx.font = '24px Georgia,serif'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(5,12,8,' + Math.min(0.85, msgT) + ')'; ctx.strokeText(msg, W / 2, H * 0.5); ctx.fillStyle = 'rgba(252,246,228,' + Math.min(1, msgT * 1.5) + ')'; ctx.fillText(msg, W / 2, H * 0.5); }
      else if (st === 'aim' && strokes === 0 && !aim) { ctx.textAlign = 'center'; ctx.font = '14px -apple-system,sans-serif'; ctx.fillStyle = 'rgba(235,240,230,.85)'; ctx.fillText('Pull back anywhere, then let go', W / 2, tee.y + 36); }
    }
    newRound();
    var stop = K.loop(function (dt) { if (alive) { update(dt); draw(); } });
    return { stop: function () { alive = false; stop(); }, restart: newRound, peek: function () { return { st: st, ball: ball, cup: cup, tee: tee, par: par, strokes: strokes, hole: hole, total: total, walls: walls, waters: waters, mill: mill, bumps: bumps, shoot: shoot, P: P, card: card, fx: [fx0, fx1, fy0, fy1], reachable: reachable }; } };
  }

  G.list.push(G.reg({ id: 'putt', title: 'Putt', blurb: 'Mini golf, a new course every hole. Pull back anywhere, let go, and roll it home.', make: putt,
    levels: { easy: 'Six holes, a wide cup, and your whole shot drawn out for you.', normal: 'Nine holes with walls, sand and water. A short guide.', hard: 'Nine tight holes with water, bumpers and a turning windmill. Only direction and power shown.' }, bestLabel: function (b) { return b + ' strokes'; } }));
})(typeof window !== 'undefined' ? window : globalThis);
