/* Bloom Scroll — Rally. Tennis from behind the baseline: slide your racket to meet the ball, hit it off the edge to place it, and win points.
   The ball is launched to a chosen landing spot and bounces once, so it is always readable. First to 5 / 7 / 9 points. No game over: a match ends, the next begins. */
(function (root) {
  'use strict';
  var K = root.MannaKit, G = root.MannaGames, rand = K.rand;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function rally(level, host, api) {
    var P = {
      easy: { v0: 0.85, cpuV: 0.45, noise: 0.09, err: 0.2, aim: 0.15, rwP: 0.17, rwC: 0.12, win: 5 },
      normal: { v0: 1.0, cpuV: 0.75, noise: 0.05, err: 0.09, aim: 0.45, rwP: 0.13, rwC: 0.12, win: 7 },
      hard: { v0: 1.2, cpuV: 1.0, noise: 0.025, err: 0.04, aim: 0.75, rwP: 0.1, rwC: 0.13, win: 9 }
    }[level];
    var G_ = 2.2, c = K.canvas(host), W = c.W, H = c.H, ctx = c.ctx;
    var yFar = H * 0.15, yNear = H * 0.83, CW = W * 0.94, HV = H * 0.35;
    function sc(y) { return 0.46 + 0.54 * y; }
    function sx(x, y) { return W / 2 + (x - 0.5) * CW * sc(y); }
    function sy(y) { return yFar + (yNear - yFar) * y; }

    // ---- the court, painted once ----
    var dpr = Math.min(2, root.devicePixelRatio || 1), bg = document.createElement('canvas'); bg.width = Math.round(W * dpr); bg.height = Math.round(H * dpr);
    (function paint() {
      var g = bg.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      var sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#0e1530'); sky.addColorStop(0.5, '#141c3a'); sky.addColorStop(1, '#0a0e1e'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
      for (var i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.15 + Math.random() * 0.3) + ')'; g.fillRect(Math.random() * W, Math.random() * yFar * 0.9, 1.4, 1.4); }
      // stands: a dark band of seats behind the far baseline
      g.fillStyle = '#10152b'; g.fillRect(0, yFar * 0.55, W, yFar * 0.45); for (i = 0; i < 60; i++) { g.fillStyle = 'hsla(' + (200 + Math.random() * 120) + ',40%,45%,.35)'; g.fillRect(Math.random() * W, yFar * 0.58 + Math.random() * yFar * 0.38, 3, 3); }
      function quad(x0, x1, ya, yb, col) { g.fillStyle = col; g.beginPath(); g.moveTo(sx(x0, ya), sy(ya)); g.lineTo(sx(x1, ya), sy(ya)); g.lineTo(sx(x1, yb), sy(yb)); g.lineTo(sx(x0, yb), sy(yb)); g.closePath(); g.fill(); }
      quad(-0.12, 1.12, -0.12, 1.12, '#1f3f66');                                                // run-off
      var stripe = ['#2f64a8', '#2b5c9e']; for (i = 0; i < 8; i++) quad(0, 1, i / 8, (i + 1) / 8, stripe[i % 2]);
      g.strokeStyle = '#eef3fb'; g.lineWidth = 2; g.lineCap = 'round';
      function ln(x0, y0, x1, y1, w) { g.lineWidth = (w || 2) * (0.6 + 0.4 * sc((y0 + y1) / 2)); g.beginPath(); g.moveTo(sx(x0, y0), sy(y0)); g.lineTo(sx(x1, y1), sy(y1)); g.stroke(); }
      ln(0, 0, 1, 0, 3); ln(0, 1, 1, 1, 3); ln(0, 0, 0, 1, 3); ln(1, 0, 1, 1, 3); ln(0.06, 0, 0.06, 1, 2); ln(0.94, 0, 0.94, 1, 2); ln(0.06, 0.25, 0.94, 0.25, 2); ln(0.06, 0.75, 0.94, 0.75, 2); ln(0.5, 0.25, 0.5, 0.75, 2);
      ln(0.5, -0.01, 0.5, 0.025, 2); ln(0.5, 0.975, 0.5, 1.01, 2);
      // the net
      var ny = 0.5, nx0 = sx(-0.04, ny), nx1 = sx(1.04, ny), nyy = sy(ny), nh = H * 0.05 * sc(ny);
      g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(nx0, nyy, nx1 - nx0, nh * 0.35);
      g.fillStyle = 'rgba(15,20,40,.55)'; g.fillRect(nx0, nyy - nh, nx1 - nx0, nh);
      g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 1; for (var xx = nx0; xx < nx1; xx += 6) { g.beginPath(); g.moveTo(xx, nyy - nh); g.lineTo(xx, nyy); g.stroke(); } for (var yy = nyy - nh; yy < nyy; yy += 6) { g.beginPath(); g.moveTo(nx0, yy); g.lineTo(nx1, yy); g.stroke(); }
      g.fillStyle = '#f2f5fb'; g.fillRect(nx0, nyy - nh - 2, nx1 - nx0, 3); g.fillRect(nx0 - 3, nyy - nh - 2, 4, nh + 4); g.fillRect(nx1 - 1, nyy - nh - 2, 4, nh + 4);
      var vg = g.createRadialGradient(W / 2, H * 0.55, H * 0.3, W / 2, H * 0.55, H * 0.8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(2,4,14,.55)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    })();

    // ---- state ----
    var score, server, rally, best, ball, st, wait, px, pxT, rv, cpuX, cpuT, cpuDelay, swingP, swingC, msg, msgT, parts, clock = 0, alive = true, shakeT = 0, lastRally = 0;
    function newMatch() { score = { p: 0, c: 0 }; server = 'p'; px = pxT = 0.5; cpuX = cpuT = 0.5; rv = 0; swingP = swingC = 0; parts = []; beginPoint('First to ' + P.win); }
    function beginPoint(m) { ball = null; st = 'wait'; wait = 1.1; rally = 0; msg = m || (server === 'p' ? 'Your serve' : 'Their serve'); msgT = 1.1; status(); }
    function status() { api.status(score.p + ' – ' + score.c + (best() ? ' · best rally ' + best() : '')); }
    function best() { return api.best(); }
    function launch(side, x0, lx, spd) {
      var y0 = side === 'p' ? 0.92 : 0.1, dir = side === 'p' ? -1 : 1, ly = side === 'p' ? rand(0.16, 0.34) : rand(0.66, 0.84), h0 = 0.22;
      var tb = Math.abs(ly - y0) / spd;
      ball = { x: x0, y: y0, h: h0, vx: (lx - x0) / tb, vy: dir * spd, vh: (0.5 * G_ * tb * tb - h0) / tb, last: side, bounced: false, fault: lx < 0.065 || lx > 0.935, t: 0 };
      if (side === 'p') { swingP = 0.28; var tx = clamp(x0 + ball.vx * (0.1 - y0) / ball.vy, -0.2, 1.2); cpuT = clamp(tx + rand(-1, 1) * P.noise, 0, 1); cpuDelay = 0.1 + rand(0, 0.1); } else swingC = 0.28;
    }
    function spdNow() { return Math.min(P.v0 + 0.55, P.v0 + rally * 0.03); }
    function serve() {
      st = 'play';
      if (server === 'p') launch('p', px, clamp(0.5 + rand(-0.25, 0.25), 0.15, 0.85), P.v0 * 0.95);
      else { var lx = rand(0.2, 0.8); launch('c', cpuX, lx, P.v0 * 0.9); }
    }
    function hitP() {
      var o = clamp((ball.x - px) / P.rwP, -1, 1), lx = clamp(0.5 + (ball.x - 0.5) * -0.5 + o * 0.4 + clamp(rv * 0.1, -0.2, 0.2), 0.08, 0.92);
      rally++; if (rally > lastRally) lastRally = rally; api.setBest(rally); launch('p', ball.x, lx, spdNow()); spark(sx(ball.x, 0.92), sy(0.92) - ball.h * HV, '#fff3b0', 6); status();
    }
    function hitC() {
      var lx = Math.random() < P.aim ? (px < 0.5 ? rand(0.62, 0.9) : rand(0.1, 0.38)) : rand(0.12, 0.88);
      if (Math.random() < P.err) lx = Math.random() < 0.5 ? rand(-0.1, 0.03) : rand(0.97, 1.1);
      rally++; launch('c', ball.x, lx, spdNow());
    }
    function point(who, why) {
      if (st !== 'play') return; st = 'point'; wait = 1.5; ball.dead = true; score[who]++; msg = (who === 'p' ? 'Point — ' : 'Their point — ') + why; msgT = 1.4; shakeT = who === 'c' ? 0.2 : 0; status();
      if (score[who] >= P.win) { st = 'end'; wait = 3.2; msg = who === 'p' ? 'You take the match, ' + score.p + '–' + score.c : 'They take it, ' + score.c + '–' + score.p + '. Again?'; msgT = 3.2; }
    }
    function spark(x, y, col, n) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.3, s = 30 + Math.random() * 60; parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, t: 0.5, col: col, r: 1.5 + Math.random() * 1.5 }); } }

    // ---- input: your racket follows your finger sideways ----
    function setTarget(e) { var r = c.cv.getBoundingClientRect(); pxT = clamp(0.5 + (e.clientX - r.left - W / 2) / (CW * sc(0.95)), 0.02, 0.98); }
    c.cv.addEventListener('pointerdown', setTarget); c.cv.addEventListener('pointermove', function (e) { if (e.buttons || e.pointerType === 'touch') setTarget(e); });

    function update(dt) {
      clock += dt; var old = px; px += (pxT - px) * Math.min(1, 20 * dt); rv = rv * 0.7 + ((px - old) / Math.max(dt, 1e-3)) * 0.3;
      swingP = Math.max(0, swingP - dt); swingC = Math.max(0, swingC - dt); shakeT = Math.max(0, shakeT - dt); msgT = Math.max(0, msgT - dt);
      parts.forEach(function (q) { q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 120 * dt; }); parts = parts.filter(function (q) { return q.t > 0; });
      if (st === 'wait') { wait -= dt; cpuX += (0.5 - cpuX) * Math.min(1, 3 * dt); if (wait <= 0) serve(); return; }
      if (st === 'point' || st === 'end') { wait -= dt; if (wait <= 0) { if (st === 'end') { newMatch(); return; } server = server === 'p' ? 'c' : 'p'; beginPoint(); } return; }
      // the cpu runs to where it thinks the ball will be
      if (ball.last === 'p' && !ball.fault) { cpuDelay -= dt; if (cpuDelay <= 0) { var d = cpuT - cpuX, mv = P.cpuV * dt; cpuX += Math.abs(d) < mv ? d : Math.sign(d) * mv; } }
      else if (ball.last === 'c') cpuX += (0.5 - cpuX) * Math.min(1, 0.8 * dt);
      ball.t += dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.vh -= G_ * dt; ball.h += ball.vh * dt;
      if (ball.h <= 0 && ball.vh < 0) {
        ball.h = 0; ball.vh = -ball.vh * 0.72; spark(sx(ball.x, ball.y), sy(ball.y), '#f3f6ff', 5);
        if (!ball.bounced) { ball.bounced = true; if (ball.fault) { point(ball.last === 'p' ? 'c' : 'p', 'out'); return; } }
      }
      if (ball.last === 'c' && ball.vy > 0 && ball.y >= 0.92) { if (Math.abs(ball.x - px) <= P.rwP + 0.03 && ball.h < 0.5) hitP(); else if (ball.y > 1.04) point('c', 'missed'); }
      else if (ball.last === 'p' && ball.vy < 0 && ball.y <= 0.1) { if (Math.abs(ball.x - cpuX) <= P.rwC + 0.03) hitC(); else if (ball.y < -0.04) point('p', 'winner'); }
      if (ball.t > 8 || ball.y > 1.3 || ball.y < -0.3) point(ball.last === 'p' ? 'c' : 'p', 'reset');
    }

    // ---- drawing ----
    function figure(x, y, u, shirt, swing, away) {
      ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(x, y + u * 0.04, u * 0.5, u * 0.15, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#e3bd96'; ctx.lineWidth = u * 0.15; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - u * 0.14, y - u * 0.55); ctx.lineTo(x - u * 0.2, y); ctx.moveTo(x + u * 0.14, y - u * 0.55); ctx.lineTo(x + u * 0.2, y); ctx.stroke();
      ctx.fillStyle = '#f4f6fa'; ctx.fillRect(x - u * 0.3, y - u * 0.72, u * 0.6, u * 0.26);
      ctx.fillStyle = shirt; ctx.beginPath(); ctx.moveTo(x - u * 0.3, y - u * 0.72); ctx.lineTo(x - u * 0.24, y - u * 1.28); ctx.lineTo(x + u * 0.24, y - u * 1.28); ctx.lineTo(x + u * 0.3, y - u * 0.72); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e3bd96'; ctx.beginPath(); ctx.arc(x, y - u * 1.48, u * 0.2, 0, 7); ctx.fill();
      ctx.fillStyle = away ? '#2b2118' : '#3a2a1c'; ctx.beginPath(); ctx.arc(x, y - u * 1.52, u * 0.2, Math.PI, 0); ctx.fill(); ctx.fillRect(x - u * 0.2, y - u * 1.52, u * 0.4, u * 0.05);
      if (!away) { ctx.fillStyle = '#2a2230'; ctx.fillRect(x - u * 0.09, y - u * 1.48, u * 0.04, u * 0.05); ctx.fillRect(x + u * 0.05, y - u * 1.48, u * 0.04, u * 0.05); }
      // racket
      var hx = x + (away ? 1 : -1) * u * 0.34, hy = y - u * 1.0, ang = (away ? -1.1 : -2.0) + swing * (away ? 3.4 : -3.4) * 1.0;
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang); ctx.strokeStyle = '#2a2a33'; ctx.lineWidth = u * 0.07; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(u * 0.34, 0); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.strokeStyle = '#e9edf5'; ctx.lineWidth = u * 0.06; ctx.beginPath(); ctx.ellipse(u * 0.56, 0, u * 0.24, u * 0.17, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1; for (var k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(u * 0.56 + k * u * 0.08, -u * 0.15); ctx.lineTo(u * 0.56 + k * u * 0.08, u * 0.15); ctx.stroke(); } ctx.restore();
    }
    function pill(x, y, w, h) { ctx.fillStyle = 'rgba(10,13,28,.85)'; ctx.beginPath(); ctx.moveTo(x + h / 2, y); ctx.arcTo(x + w, y, x + w, y + h, h / 2); ctx.arcTo(x + w, y + h, x, y + h, h / 2); ctx.arcTo(x, y + h, x, y, h / 2); ctx.arcTo(x, y, x + w, y, h / 2); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.stroke(); }
    function draw() {
      var shx = shakeT > 0 ? (Math.random() - 0.5) * 6 : 0; ctx.save(); ctx.translate(shx, 0); ctx.drawImage(bg, 0, 0, W, H);
      // cpu, ball shadow, ball, you  (nearer things last)
      figure(sx(cpuX, 0.045), sy(0.045), H * 0.07 * sc(0.045), '#e9788a', swingC / 0.28, false);
      if (ball && !ball.dead) {
        var bx = sx(ball.x, ball.y), by = sy(ball.y), s = sc(ball.y), r = Math.max(4, H * 0.012 * s * 1.35);
        ctx.fillStyle = 'rgba(0,0,0,' + (0.35 - Math.min(0.2, ball.h * 0.4)) + ')'; ctx.beginPath(); ctx.ellipse(bx, by, r * 1.1, r * 0.45, 0, 0, 7); ctx.fill();
        var hy = by - ball.h * HV * s; ctx.globalCompositeOperation = 'lighter'; var gl = ctx.createRadialGradient(bx, hy, 0, bx, hy, r * 3); gl.addColorStop(0, 'rgba(230,255,120,.4)'); gl.addColorStop(1, 'rgba(230,255,120,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(bx, hy, r * 3, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#d8f23a'; ctx.beginPath(); ctx.arc(bx, hy, r, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = Math.max(1, r * 0.18); ctx.beginPath(); ctx.arc(bx - r * 0.9, hy, r * 0.95, -0.7, 0.7); ctx.stroke();
      }
      figure(sx(px, 0.985), sy(0.985), H * 0.085 * sc(0.985), '#f2c879', swingP / 0.28, true);
      parts.forEach(function (q) { ctx.globalAlpha = Math.min(1, q.t * 2); ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 7); ctx.fill(); }); ctx.globalAlpha = 1; ctx.restore();
      // scoreboard
      pill(W / 2 - 78, 10, 156, 30); ctx.font = '600 15px -apple-system,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#f2c879'; ctx.fillText('You ' + score.p, W / 2 - 38, 31); ctx.fillStyle = '#7a83a6'; ctx.fillText('·', W / 2, 30); ctx.fillStyle = '#e9788a'; ctx.fillText(score.c + ' CPU', W / 2 + 38, 31);
      if (rally >= 2) { pill(W / 2 - 42, 46, 84, 24); ctx.font = '600 13px -apple-system,sans-serif'; ctx.fillStyle = '#ece8dc'; ctx.fillText('Rally ' + rally, W / 2, 62); }
      if (msgT > 0) { ctx.font = '22px Georgia,serif'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(5,8,16,' + Math.min(0.85, msgT) + ')'; ctx.strokeText(msg, W / 2, H * 0.4); ctx.fillStyle = 'rgba(250,244,226,' + Math.min(1, msgT * 1.5) + ')'; ctx.fillText(msg, W / 2, H * 0.4); }
      if (st === 'wait' && wait > 0 && score.p + score.c === 0) { ctx.font = '14px -apple-system,sans-serif'; ctx.fillStyle = 'rgba(200,206,225,.8)'; ctx.fillText('Slide your finger to move the racket · hit it with the edge to angle the ball', W / 2, H * 0.92); }
    }
    newMatch();
    var stop = K.loop(function (dt) { if (alive) { update(dt); draw(); } });
    return { stop: function () { alive = false; stop(); }, restart: newMatch, peek: function () { return { score: score, st: st, ball: ball, px: px, cpuX: cpuX, rally: rally, P: P, setPx: function (v) { pxT = v; px = v; } }; } };
  }

  G.list.push(G.reg({ id: 'rally', title: 'Rally', blurb: 'Tennis at dusk. Slide to meet the ball, hit it off the edge of the racket to place it, and keep the rally alive.', make: rally,
    levels: { easy: 'A slow opponent who sends some out. First to 5. A wide racket.', normal: 'A steady opponent, quickening rallies. First to 7.', hard: 'A fast opponent who hits away from you. A narrow racket. First to 9.' }, bestLabel: function (b) { return 'rally ' + b; } }));
})(typeof window !== 'undefined' ? window : globalThis);
