/* Bloom Scroll — Paper Toss. An office after hours: pull the paper back and let go to land it in the wastebasket hoop. Pedestal fans blow across
   the room — new ones, in new places, at new strengths, for every throw. Easy: one steady fan and a guide arc. Normal: two gusting fans. Hard: three
   strong fans (one sweeping), a smaller basket that moves, and no guide. No lives, no game over. */
(function (root) {
  'use strict';
  var K = root.MannaKit, G = root.MannaGames, rand = K.rand;

  function paperToss(level, host, api) {
    var P = {
      easy: { fans: 1, str: [200, 330], gust: 0, sweep: 0, bw: 1.15, moves: 0, guide: 2, R: [90, 110] },
      normal: { fans: 2, str: [380, 640], gust: 1, sweep: 0, bw: 0.95, moves: 0.1, guide: 1, R: [95, 120] },
      hard: { fans: 3, str: [600, 980], gust: 1, sweep: 1, bw: 0.78, moves: 0.24, guide: 0, R: [105, 135] }
    }[level];
    var c = K.canvas(host), ctx = c.ctx, W = c.W, H = c.H, cv = c.cv; cv.style.touchAction = 'none';
    var g = H * 1.15, floorY = H * 0.88, R0 = Math.max(9, W * 0.032), launch = { x: W * 0.15, y: H * 0.7 }, pullMax = W * 0.3, vmax = Math.sqrt(g * W * 0.95), kv = vmax / pullMax;
    var score = 0, streak = 0, fans = [], hoop, ball, state, aim = null, t = 0, msg = '', msgT = 0, endT = 0, touched, alive = true, restT = 0, scored = false, clutter = [], i;
    for (i = 0; i < 7; i++) clutter.push([rand(0.35, 0.95), rand(0.03, 0.08), rand(0.7, 1.3)]);

    function newThrow() {
      var bw = W * 0.17 * P.bw, hx = W * (0.78 + rand(-1, 1) * P.moves * 0.7); hx = Math.max(W * 0.58, Math.min(W * 0.86, hx));
      hoop = { x: hx, bw: bw, rimY: floorY - H * 0.15, L: hx - bw / 2, R: hx + bw / 2 }; hoop.boardX = hoop.R + 5;
      fans = []; var n = P.fans, k, dx = hoop.x - launch.x, dy = hoop.rimY - launch.y, th = 0.9, v2 = g * dx * dx / (2 * Math.cos(th) * Math.cos(th) * (dx * Math.tan(th) - dy));
      for (k = 0; k < n; k++) {
        // each fan stands somewhere along the usual arc, so it always matters; fraction of the way across, jittered
        var f = 0.24 + 0.56 * (k + rand(0.1, 0.9)) / n, ex = dx * f, ey = launch.y - (ex * Math.tan(th) - g * ex * ex / (2 * v2 * Math.cos(th) * Math.cos(th)));
        var s = rand(P.str[0], P.str[1]), left = Math.random() < 0.5, tilt = rand(-0.5, 0.5);
        fans.push({ x: launch.x + ex, y: Math.max(H * 0.2, Math.min(floorY - H * 0.14, ey + rand(-0.07, 0.07) * H)), ang: (left ? Math.PI : 0) + (left ? -tilt : tilt), str: s, gust: P.gust, freq: rand(0.9, 2.4), ph: rand(0, 6), R: rand(P.R[0], P.R[1]) * (W / 360), sweep: P.sweep && k === 0 ? rand(0.5, 1.1) : 0, blade: rand(0, 6), streaks: [] });
        for (var j = 0; j < 9; j++) fans[k].streaks.push(Math.random());
      }
      ball = { x: launch.x, y: launch.y, vx: 0, vy: 0, rot: 0, vr: 0 }; state = 'aim'; aim = null; touched = ''; scored = false; restT = 0; endT = 0;
    }
    function fanDir(f) { return f.sweep ? f.ang + Math.sin(t * f.sweep) * 0.7 : f.ang; }
    function fanPow(f) { return f.gust ? 0.55 + 0.45 * Math.sin(t * f.freq + f.ph) : 1; }
    function wind(x, y) {
      var ax = 0, ay = 0;
      fans.forEach(function (f) { var d = Math.hypot(x - f.x, y - f.y); if (d < f.R) { var fall = 1 - d / f.R, p = f.str * fanPow(f) * fall, a = fanDir(f); ax += Math.cos(a) * p; ay += Math.sin(a) * p; } });
      return [ax, ay];
    }
    function guide(vx, vy, n) { var pts = [], x = launch.x, y = launch.y, dt = 1 / 40; for (var k = 0; k < n; k++) { vy += g * dt; x += vx * dt; y += vy * dt; if (k % 2 === 0) pts.push([x, y]); if (y > floorY) break; } return pts; }
    function pt(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    cv.addEventListener('pointerdown', function (e) { if (state !== 'aim') return; var p = pt(e); if (Math.hypot(p[0] - launch.x, p[1] - launch.y) < W * 0.28) { aim = { px: p[0], py: p[1] }; try { cv.setPointerCapture(e.pointerId); } catch (x) {} } });
    cv.addEventListener('pointermove', function (e) { if (!aim) return; var p = pt(e); aim.px = p[0]; aim.py = p[1]; });
    function pull() { if (!aim) return [0, 0]; var dx = launch.x - aim.px, dy = launch.y - aim.py, l = Math.hypot(dx, dy); if (l > pullMax) { dx *= pullMax / l; dy *= pullMax / l; } return [dx, dy]; }
    function release() {
      if (!aim) return; var p = pull(); aim = null; if (Math.hypot(p[0], p[1]) < 16 || p[0] <= 0 && Math.abs(p[1]) < 10) return;
      ball.vx = p[0] * kv; ball.vy = p[1] * kv; ball.vr = (Math.random() < 0.5 ? -1 : 1) * rand(4, 9); state = 'fly'; t0 = t;
    }
    cv.addEventListener('pointerup', release); cv.addEventListener('pointercancel', function () { aim = null; });
    var t0 = 0;

    function step(dt) {
      var prevY = ball.y, w = wind(ball.x, ball.y);
      ball.vx += w[0] * dt; ball.vy += (g + w[1]) * dt; var drag = 1 - 0.18 * dt; ball.vx *= drag; ball.vy *= drag;
      ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.rot += ball.vr * dt;
      // rim points
      [[hoop.L, hoop.rimY], [hoop.R, hoop.rimY]].forEach(function (rp) {
        var dx = ball.x - rp[0], dy = ball.y - rp[1], d = Math.hypot(dx, dy), m = R0 + 3;
        if (d < m && d > 0.001) { var nx = dx / d, ny = dy / d, dot = ball.vx * nx + ball.vy * ny; ball.x = rp[0] + nx * m; ball.y = rp[1] + ny * m; if (dot < 0) { ball.vx -= 1.45 * dot * nx; ball.vy -= 1.45 * dot * ny; } if (!touched) touched = 'rim'; }
      });
      // basket walls (below the rim)
      var inY = ball.y > hoop.rimY + 2 && ball.y < floorY + 4;
      if (inY) {
        [[hoop.L, -1], [hoop.R, 1]].forEach(function (wl) {
          var wx = wl[0], dir = wl[1];
          if (Math.abs(ball.x - wx) < R0) { if ((ball.x - wx) * dir >= 0) { ball.x = wx + dir * R0; ball.vx = Math.abs(ball.vx) * 0.35 * dir; } else { ball.x = wx - dir * R0; ball.vx = -Math.abs(ball.vx) * 0.35 * dir; } }
        });
      }
      // backboard
      var bTop = hoop.rimY - H * 0.15, bx = hoop.boardX;
      if (ball.y > bTop - R0 && ball.y < hoop.rimY + 4 && ball.x + R0 > bx && ball.x - R0 < bx + 7 && ball.vx > 0) { ball.x = bx - R0; ball.vx = -ball.vx * 0.5; if (!touched) touched = 'board'; }
      if (ball.x > W - R0) { ball.x = W - R0; ball.vx = -Math.abs(ball.vx) * 0.4; }
      // floor
      var insideB = ball.x > hoop.L && ball.x < hoop.R, fy = (insideB ? floorY - 5 : floorY) - R0;
      if (ball.y > fy) { ball.y = fy; if (ball.vy > 40) ball.vy = -ball.vy * 0.32; else ball.vy = 0; ball.vx *= 0.9; ball.vr *= 0.9; }
      // scoring: centre crosses the rim line going down, between the rim points
      if (!scored && prevY < hoop.rimY && ball.y >= hoop.rimY && ball.x > hoop.L + 1 && ball.x < hoop.R - 1) {
        scored = true; streak++; var pts = 1 + Math.min(4, streak - 1); score += pts;
        msg = touched === '' ? 'Swish!' : touched === 'board' ? 'Bank shot!' : 'In off the rim!'; if (streak > 2) msg += ' ×' + streak; msgT = 1.4; api.setBest(score); endT = 1.1;
      }
      if (ball.y >= fy - 0.5 && Math.hypot(ball.vx, ball.vy) < 30) restT += dt; else restT = 0;
    }
    function miss() { if (scored) return; streak = 0; msg = ball.x > hoop.R + 4 || ball.x < launch.x ? 'Missed — new fans' : 'Short — new fans'; msgT = 1.3; }
    function status() { api.status('Score ' + score + ' · Streak ' + streak + ' · Best ' + Math.max(api.best(), score)); }

    var stop = K.loop(function (dt) {
      t += dt; msgT = Math.max(0, msgT - dt);
      if (state === 'fly') {
        for (var k = 0; k < 3; k++) step(dt / 3);
        var gone = ball.x < -R0 * 2 || ball.x > W + R0 * 2 || (t - t0) > 6.5 || restT > 0.5;
        if (scored) { endT -= dt; if (endT <= 0) { state = 'wait'; endT = 0.35; } }
        else if (gone) { miss(); state = 'wait'; endT = 0.9; }
      } else if (state === 'wait') { endT -= dt; if (endT <= 0) { newThrow(); status(); } }
      fans.forEach(function (f) { f.blade += dt * (4 + f.str * fanPow(f) * 0.03); f.streaks = f.streaks.map(function (s) { return (s + dt * (0.35 + f.str * fanPow(f) / 500)) % 1; }); });
      render();
    });

    // ---------------- drawing ----------------
    function render() {
      var wallG = ctx.createLinearGradient(0, 0, 0, floorY); wallG.addColorStop(0, '#222a47'); wallG.addColorStop(1, '#171d33'); ctx.fillStyle = wallG; ctx.fillRect(0, 0, W, H);
      // window with blinds and a night city
      var wx = W * 0.5, wy = H * 0.06, ww = W * 0.4, wh = H * 0.24; ctx.fillStyle = '#0c1226'; ctx.fillRect(wx, wy, ww, wh);
      ctx.fillStyle = '#16204a'; for (i = 0; i < 9; i++) { var bh = wh * (0.18 + ((i * 37) % 10) / 40); ctx.fillRect(wx + i * ww / 9, wy + wh - bh, ww / 9 - 2, bh); }
      ctx.fillStyle = 'rgba(242,200,121,.7)'; for (i = 0; i < 26; i++) ctx.fillRect(wx + ((i * 53) % 100) / 100 * ww, wy + wh * (0.45 + ((i * 29) % 50) / 100), 2, 2);
      ctx.fillStyle = 'rgba(120,130,170,.28)'; for (i = 0; i < 9; i++) ctx.fillRect(wx, wy + i * wh / 9, ww, wh / 18);
      ctx.strokeStyle = '#3a4468'; ctx.lineWidth = 3; ctx.strokeRect(wx, wy, ww, wh);
      // clock
      var cx0 = W * 0.2, cy0 = H * 0.13, now = new Date(); ctx.fillStyle = '#e8e2d2'; ctx.beginPath(); ctx.arc(cx0, cy0, W * 0.06, 0, 7); ctx.fill(); ctx.strokeStyle = '#1a1a22'; ctx.lineWidth = 2; var ha = (now.getHours() % 12 + now.getMinutes() / 60) / 12 * 6.283 - 1.5708, ma = now.getMinutes() / 60 * 6.283 - 1.5708;
      ctx.beginPath(); ctx.moveTo(cx0, cy0); ctx.lineTo(cx0 + Math.cos(ha) * W * 0.035, cy0 + Math.sin(ha) * W * 0.035); ctx.moveTo(cx0, cy0); ctx.lineTo(cx0 + Math.cos(ma) * W * 0.05, cy0 + Math.sin(ma) * W * 0.05); ctx.stroke();
      // poster
      ctx.fillStyle = '#2f3a63'; ctx.fillRect(W * 0.33, H * 0.09, W * 0.12, H * 0.13); ctx.fillStyle = '#f2c879'; ctx.font = 'bold ' + (W * 0.03) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('FRIDAY', W * 0.39, H * 0.155); ctx.font = (W * 0.022) + 'px sans-serif'; ctx.fillStyle = '#c8cde0'; ctx.fillText('almost', W * 0.39, H * 0.19);
      // floor
      ctx.fillStyle = '#2a2f48'; ctx.fillRect(0, floorY, W, H - floorY); ctx.fillStyle = '#353b58'; ctx.fillRect(0, floorY, W, 3); ctx.fillStyle = '#0c0f1c'; ctx.fillRect(0, floorY - 7, W, 7);
      clutter.forEach(function (q) { if (q[0] * W > hoop.L - 30 && q[0] * W < hoop.R + 30) return; ctx.fillStyle = 'rgba(235,232,222,.55)'; ctx.beginPath(); ctx.arc(q[0] * W, floorY + q[1] * H, R0 * 0.7 * q[2], 0, 7); ctx.fill(); });
      // desk with a monitor and a mug
      var dy = launch.y + R0 + 4; ctx.fillStyle = '#3a2f2a'; ctx.fillRect(0, dy, W * 0.3, 9); ctx.fillStyle = '#2a211e'; ctx.fillRect(W * 0.02, dy + 9, 7, floorY - dy - 16); ctx.fillRect(W * 0.26, dy + 9, 7, floorY - dy - 16);
      ctx.fillStyle = '#10142a'; ctx.fillRect(W * 0.03, dy - H * 0.16, W * 0.12, H * 0.11); ctx.fillStyle = '#1c2a55'; ctx.fillRect(W * 0.035, dy - H * 0.155, W * 0.11, H * 0.1); ctx.fillStyle = '#10142a'; ctx.fillRect(W * 0.08, dy - H * 0.05, W * 0.02, H * 0.05);
      ctx.fillStyle = '#c0556a'; ctx.fillRect(W * 0.24, dy - H * 0.04, W * 0.035, H * 0.04);
      // fans (pedestal)
      fans.forEach(function (f) {
        ctx.strokeStyle = '#59627f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(f.x, floorY - 2); ctx.lineTo(f.x, f.y + 14); ctx.stroke(); ctx.fillStyle = '#3d4563'; ctx.beginPath(); ctx.ellipse(f.x, floorY - 2, 17, 5, 0, 0, 7); ctx.fill();
        var a = fanDir(f), p = fanPow(f);
        // airflow
        ctx.strokeStyle = 'rgba(190,225,255,' + (0.1 + 0.3 * p) + ')'; ctx.lineWidth = 1.6;
        f.streaks.forEach(function (s, k) { var along = s * f.R * 1.05, off = ((k % 3) - 1) * f.R * 0.28 * (0.3 + s); var sx = f.x + Math.cos(a) * along - Math.sin(a) * off, sy = f.y + Math.sin(a) * along + Math.cos(a) * off; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * 12 * (0.5 + p), sy + Math.sin(a) * 12 * (0.5 + p)); ctx.stroke(); });
        ctx.fillStyle = '#8c95b5'; ctx.beginPath(); ctx.arc(f.x, f.y, 16, 0, 7); ctx.fill(); ctx.fillStyle = '#1a1f36'; ctx.beginPath(); ctx.arc(f.x, f.y, 13, 0, 7); ctx.fill();
        ctx.fillStyle = '#b7c0dd'; for (var b = 0; b < 3; b++) { var ba = f.blade + b * 2.094; ctx.beginPath(); ctx.ellipse(f.x + Math.cos(ba) * 6, f.y + Math.sin(ba) * 6, 7, 2.6, ba, 0, 7); ctx.fill(); }
        ctx.strokeStyle = '#f2c879'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * 18, f.y + Math.sin(a) * 18); ctx.lineTo(f.x + Math.cos(a) * 28, f.y + Math.sin(a) * 28); ctx.stroke();
        ctx.fillStyle = '#f2c879'; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * 29, f.y + Math.sin(a) * 29, 3, 0, 7); ctx.fill();
      });
      // wastebasket + backboard + hoop
      var top = hoop.rimY, bw0 = hoop.bw; ctx.fillStyle = '#e8e2d2'; ctx.fillRect(hoop.boardX, top - H * 0.15, 7, H * 0.15 + 4); ctx.strokeStyle = '#c0556a'; ctx.lineWidth = 2; ctx.strokeRect(hoop.boardX - 0.5, top - H * 0.08, 7, H * 0.05);
      if (!(ball && ball.y > top && ball.x > hoop.L && ball.x < hoop.R && ball.y < floorY)) drawBall();
      ctx.fillStyle = '#3d4968'; ctx.beginPath(); ctx.moveTo(hoop.L, top); ctx.lineTo(hoop.R, top); ctx.lineTo(hoop.R - bw0 * 0.1, floorY); ctx.lineTo(hoop.L + bw0 * 0.1, floorY); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1; for (i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(hoop.L + bw0 * i / 6, top); ctx.lineTo(hoop.L + bw0 * 0.1 + bw0 * 0.8 * i / 6, floorY); ctx.stroke(); }
      ctx.strokeStyle = '#ff8a3d'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(hoop.L - 3, top); ctx.lineTo(hoop.R + 3, top); ctx.stroke(); ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.arc(hoop.L, top, 3.5, 0, 7); ctx.arc(hoop.R, top, 3.5, 0, 7); ctx.fill();
      if (ball && ball.y > top && ball.x > hoop.L && ball.x < hoop.R && ball.y < floorY) { ctx.save(); ctx.beginPath(); ctx.rect(hoop.L, top, bw0, floorY - top); ctx.clip(); drawBall(); ctx.restore(); }
      // aiming band and guide
      if (aim && state === 'aim') {
        var p = pull(), bx = launch.x - p[0], by = launch.y - p[1];
        ctx.strokeStyle = 'rgba(242,200,121,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(launch.x - 10, launch.y + 6); ctx.lineTo(bx, by); ctx.lineTo(launch.x + 10, launch.y + 6); ctx.stroke();
        if (P.guide) { var pts = guide(p[0] * kv, p[1] * kv, P.guide === 2 ? 70 : 30); ctx.fillStyle = 'rgba(255,255,255,.7)'; pts.forEach(function (q, k) { ctx.globalAlpha = 1 - k / (pts.length + 2); ctx.beginPath(); ctx.arc(q[0], q[1], 2.4, 0, 7); ctx.fill(); }); ctx.globalAlpha = 1; }
        ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(launch.x - 44, launch.y + 24, 88 * Math.hypot(p[0], p[1]) / pullMax, 4);
      }
      ctx.textAlign = 'center';
      if (state === 'aim' && !aim && !score && !streak) { ctx.fillStyle = 'rgba(236,232,223,.8)'; ctx.font = '15px Georgia,serif'; ctx.fillText('Pull the paper back and let go', W / 2, floorY + (H - floorY) * 0.5); ctx.fillStyle = 'rgba(236,232,223,.5)'; ctx.font = '12px sans-serif'; ctx.fillText(P.guide ? 'The dotted line ignores the fans' : 'Watch the fans — no guide on Hard', W / 2, floorY + (H - floorY) * 0.5 + 20); }
      if (msgT > 0) { ctx.fillStyle = 'rgba(242,200,121,' + Math.min(1, msgT) + ')'; ctx.font = '26px Georgia,serif'; ctx.fillText(msg, W / 2, H * 0.4); }
    }
    function drawBall() {
      var x = aim && state === 'aim' ? launch.x - pull()[0] : ball.x, y = aim && state === 'aim' ? launch.y - pull()[1] : ball.y;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ball.rot); ctx.fillStyle = '#f4f0e4'; ctx.beginPath();
      for (var k = 0; k < 9; k++) { var a = k / 9 * 6.283, rr = R0 * (0.88 + ((k * 7) % 5) / 22); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(80,80,100,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-R0 * 0.6, -R0 * 0.2); ctx.lineTo(R0 * 0.1, R0 * 0.5); ctx.moveTo(-R0 * 0.1, -R0 * 0.6); ctx.lineTo(R0 * 0.55, -R0 * 0.1); ctx.moveTo(-R0 * 0.3, R0 * 0.3); ctx.lineTo(R0 * 0.3, R0 * 0.1); ctx.stroke(); ctx.restore();
    }
    newThrow(); status();
    return { stop: stop, restart: function () { score = 0; streak = 0; msgT = 0; newThrow(); status(); }, peek: function () { return { hoop: hoop, launch: launch, kv: kv, g: g, fans: fans, state: state, score: score, streak: streak, ball: ball, W: W, H: H, pullMax: pullMax }; } };
  }

  G.list.push(G.reg({ id: 'papertoss', title: 'Paper Toss', blurb: 'Late at the office. Pull the paper back, let go, and get it in the hoop — while the fans blow it about.', make: paperToss,
    levels: { easy: 'One steady fan, a bigger basket, and a dotted guide.', normal: 'Two gusting fans and a shorter guide.', hard: 'Three strong fans, one sweeping. Smaller moving basket, no guide.' }, bestLabel: function (b) { return 'Best ' + b; } }));
})(typeof window !== 'undefined' ? window : globalThis);
