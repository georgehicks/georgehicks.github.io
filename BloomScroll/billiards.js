/* Bloom Scroll — Billiards. A simple game of pool you play by yourself: clear the table in as few shots as you can.
   Pull back anywhere (like drawing a cue), let go, and the white ball goes the opposite way; the farther you pull, the harder the hit.
   Balls knock each other properly and bounce off the cushions; sink them in the six pockets. Sink the white ball and it is placed back
   for you with one shot added. Easy shows where the white ball will meet the first ball, Normal shows the line, Hard only the direction.
   No game over: clear the table and a new rack is set. Best is the fewest shots. */
(function (root) {
  'use strict';
  var K = root.MannaKit, G = root.MannaGames;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // 1 yellow, 2 blue, 3 red, 4 purple, 5 orange, 6 green, 7 maroon, 8 black; 9-15 are the same colours as stripes.
  var COL = [null, '#f2c335', '#2f63c8', '#d9383a', '#6a3fa8', '#ee7d2a', '#1f9a58', '#8a2a2a', '#16161c'];
  function colOf(n) { return COL[n <= 8 ? n : n - 8]; }

  function billiards(level, host, api) {
    var P = {
      easy: { rows: 3, pk: 1.85, guide: 2, vmax: 1000 },
      normal: { rows: 4, pk: 1.65, guide: 1, vmax: 1060 },
      hard: { rows: 5, pk: 1.5, guide: 0, vmax: 1100 }
    }[level];
    var c = K.canvas(host), W = c.W, H = c.H, ctx = c.ctx;
    // the table: wooden frame, then the felt
    var tx0 = 8, tx1 = W - 8, ty0 = 48, ty1 = H - 8, RW = 17, fx0 = tx0 + RW, fx1 = tx1 - RW, fy0 = ty0 + RW, fy1 = ty1 - RW, pw = fx1 - fx0, ph = fy1 - fy0;
    var R = clamp(pw / 29, 8, 11.5), PR = R * P.pk, pockets = [[fx0, fy0], [fx1, fy0], [fx0, (fy0 + fy1) / 2], [fx1, (fy0 + fy1) / 2], [fx0, fy1], [fx1, fy1]];
    var balls, sinks, st, shots, aim = null, clock = 0, msg = '', msgT = 0, alive = true, nextT = 0, scratched = false, left = 0;
    var table = document.createElement('canvas');

    function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function paintTable() {
      table.width = Math.round(W * 2); table.height = Math.round(H * 2); var g = table.getContext('2d'); g.scale(2, 2);
      var bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0a0d18'); bg.addColorStop(1, '#10132a'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
      // frame
      g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 20; g.shadowOffsetY = 8;
      var wd = g.createLinearGradient(tx0, ty0, tx1, ty1); wd.addColorStop(0, '#7c4e2a'); wd.addColorStop(0.5, '#5b3719'); wd.addColorStop(1, '#6e4524'); g.fillStyle = wd;
      g.beginPath(); g.moveTo(tx0 + 20, ty0); g.arcTo(tx1, ty0, tx1, ty1, 20); g.arcTo(tx1, ty1, tx0, ty1, 20); g.arcTo(tx0, ty1, tx0, ty0, 20); g.arcTo(tx0, ty0, tx1, ty0, 20); g.closePath(); g.fill(); g.restore();
      g.strokeStyle = 'rgba(255,220,170,.25)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(tx0 + 20, ty0 + 1); g.arcTo(tx1 - 1, ty0 + 1, tx1 - 1, ty1, 19); g.stroke();
      // cushions + felt
      g.fillStyle = '#0c4a30'; g.fillRect(fx0 - 5, fy0 - 5, pw + 10, ph + 10);
      var ft = g.createRadialGradient(W / 2, (fy0 + fy1) / 2, 20, W / 2, (fy0 + fy1) / 2, Math.max(pw, ph) * 0.75); ft.addColorStop(0, '#22915f'); ft.addColorStop(1, '#136a43'); g.fillStyle = ft; g.fillRect(fx0, fy0, pw, ph);
      for (var q = 0; q < 900; q++) { g.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.025) + ')'; g.fillRect(fx0 + Math.random() * pw, fy0 + Math.random() * ph, 1.2, 1.2); }
      g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 3; g.strokeRect(fx0 + 1.5, fy0 + 1.5, pw - 3, ph - 3);
      // diamonds on the rails
      g.fillStyle = 'rgba(245,235,205,.85)';
      for (var d = 1; d <= 7; d++) { var yy = fy0 + ph * d / 8; if (d === 4) continue; g.beginPath(); g.arc(tx0 + RW / 2 - 1, yy, 2, 0, 7); g.arc(tx1 - RW / 2 + 1, yy, 2, 0, 7); g.fill(); }
      for (d = 1; d <= 3; d++) { var xx = fx0 + pw * d / 4; g.beginPath(); g.arc(xx, ty0 + RW / 2 - 1, 2, 0, 7); g.arc(xx, ty1 - RW / 2 + 1, 2, 0, 7); g.fill(); }
      // foot-spot line and the spot
      g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 1; g.beginPath(); g.moveTo(fx0, fy0 + ph * 0.72); g.lineTo(fx1, fy0 + ph * 0.72); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.arc(W / 2, fy0 + ph * 0.72, 2, 0, 7); g.fill();
      // pockets
      pockets.forEach(function (p, i) {
        var ox = p[0] === fx0 ? -1 : 1, oy = i < 2 ? -1 : i > 3 ? 1 : 0, mid = i === 2 || i === 3, cx = p[0] + ox * PR * (mid ? 0.3 : 0.2), cy = p[1] + oy * PR * 0.2;
        var rg = g.createRadialGradient(cx, cy, 1, cx, cy, PR * 1.04); rg.addColorStop(0, '#000'); rg.addColorStop(0.8, '#05070a'); rg.addColorStop(1, '#1b1612'); g.fillStyle = rg; g.beginPath(); g.arc(cx, cy, PR * 1.02, 0, 7); g.fill();
        g.strokeStyle = 'rgba(210,170,90,.55)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, PR * 1.04, 0, 7); g.stroke();
      });
    }
    paintTable();

    function free(x, y, skip) { for (var i = 0; i < balls.length; i++) { var b = balls[i]; if (b !== skip && b.alive && Math.hypot(b.x - x, b.y - y) < R * 2.05) return false; } return true; }
    function placeCue() {
      var cue = balls[0], x = W / 2, y = fy0 + ph * 0.78, n = 0; while (!free(x, y, cue) && n++ < 30) y -= R * 1.2;
      cue.x = x; cue.y = y; cue.vx = cue.vy = 0; cue.alive = true;
    }
    function rack() {
      var nums = []; for (var i = 1; i <= P.rows * (P.rows + 1) / 2; i++) nums.push(i); K.shuffle(nums);
      balls = [{ n: 0, x: 0, y: 0, vx: 0, vy: 0, alive: true }]; sinks = []; var k = 0, ry = fy0 + ph * 0.3, dy = R * 1.76;
      for (var r = 0; r < P.rows; r++) for (var j = 0; j <= r; j++) balls.push({ n: nums[k++], x: W / 2 + (j - r / 2) * (R * 2 + 0.6), y: ry - r * dy + (P.rows - 1) * dy * 0.5, vx: 0, vy: 0, alive: true });
      placeCue(); shots = 0; st = 'aim'; scratched = false; aim = null; msg = 'Pull back anywhere, then let go'; msgT = 3.2; refresh();
    }
    function refresh() { left = balls.filter(function (b) { return b.n && b.alive; }).length; api.status(api.best() ? 'best ' + api.best() + ' shots' : 'clear the table'); }

    function shoot(dx, dy, power) {
      if (st !== 'aim') return false; var l = Math.hypot(dx, dy) || 1, cue = balls[0], v = 90 + (P.vmax - 90) * clamp(power, 0, 1);
      cue.vx = dx / l * v; cue.vy = dy / l * v; shots++; st = 'roll'; aim = null; msgT = 0; return true;
    }
    // where a shot from the white ball would first touch something: { t, b } (b is the ball it meets, null for a cushion)
    function ray(dx, dy) {
      var cue = balls[0], best = 1e9, hit = null, t;
      balls.forEach(function (b) {
        if (b === cue || !b.alive) return;
        var fx = cue.x - b.x, fy = cue.y - b.y, B = fx * dx + fy * dy, C = fx * fx + fy * fy - 4 * R * R, D = B * B - C;
        if (D >= 0) { t = -B - Math.sqrt(D); if (t > 0 && t < best) { best = t; hit = b; } }
      });
      if (dx > 0) { t = (fx1 - R - cue.x) / dx; if (t < best) { best = t; hit = null; } } else if (dx < 0) { t = (fx0 + R - cue.x) / dx; if (t < best) { best = t; hit = null; } }
      if (dy > 0) { t = (fy1 - R - cue.y) / dy; if (t < best) { best = t; hit = null; } } else if (dy < 0) { t = (fy0 + R - cue.y) / dy; if (t < best) { best = t; hit = null; } }
      return { t: Math.max(0, best), b: hit };
    }
    function pt(e) { var r = c.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    c.cv.style.touchAction = 'none';
    c.cv.addEventListener('pointerdown', function (e) { if (st !== 'aim') return; var p = pt(e); aim = { sx: p.x, sy: p.y, x: p.x, y: p.y }; try { c.cv.setPointerCapture(e.pointerId); } catch (x) {} });
    c.cv.addEventListener('pointermove', function (e) { if (aim) { var p = pt(e); aim.x = p.x; aim.y = p.y; } });
    c.cv.addEventListener('pointerup', function () {
      if (!aim) return; var pl = K.pull(aim.sx, aim.sy, aim.x, aim.y, W, H, 150); aim = null;
      if (pl.l >= 16) shoot(pl.dx, pl.dy, (pl.l - 10) / 140);
    });
    c.cv.addEventListener('pointercancel', function () { aim = null; });

    function step(h) {
      var i, j, b, k;
      for (i = 0; i < balls.length; i++) {
        b = balls[i]; if (!b.alive) continue;
        b.x += b.vx * h; b.y += b.vy * h;
        var sp = Math.hypot(b.vx, b.vy);
        if (sp > 0) { var ns = sp * (1 - 0.8 * h) - 34 * h; if (ns < 9) { b.vx = b.vy = 0; } else { b.vx *= ns / sp; b.vy *= ns / sp; } }
        for (k = 0; k < 6; k++) { if (Math.hypot(b.x - pockets[k][0], b.y - pockets[k][1]) < PR) { b.alive = false; sinks.push({ b: b, x: b.x, y: b.y, tx: pockets[k][0], ty: pockets[k][1], t: 0 }); if (!b.n) scratched = true; break; } }
        if (!b.alive) continue;
        if (b.x < fx0 + R) { b.x = fx0 + R; b.vx = Math.abs(b.vx) * 0.8; } else if (b.x > fx1 - R) { b.x = fx1 - R; b.vx = -Math.abs(b.vx) * 0.8; }
        if (b.y < fy0 + R) { b.y = fy0 + R; b.vy = Math.abs(b.vy) * 0.8; } else if (b.y > fy1 - R) { b.y = fy1 - R; b.vy = -Math.abs(b.vy) * 0.8; }
      }
      for (i = 0; i < balls.length; i++) for (j = i + 1; j < balls.length; j++) {
        var a = balls[i], d = balls[j]; if (!a.alive || !d.alive) continue;
        var dx = d.x - a.x, dy = d.y - a.y, dd = dx * dx + dy * dy;
        if (dd < 4 * R * R && dd > 0.0001) {
          var dist = Math.sqrt(dd), nx = dx / dist, ny = dy / dist, over = (2 * R - dist) / 2;
          a.x -= nx * over; a.y -= ny * over; d.x += nx * over; d.y += ny * over;
          var vr = (a.vx - d.vx) * nx + (a.vy - d.vy) * ny;
          if (vr > 0) { var imp = vr * 0.97; a.vx -= imp * nx; a.vy -= imp * ny; d.vx += imp * nx; d.vy += imp * ny; }
        }
      }
    }
    function moving() { return balls.some(function (b) { return b.alive && (b.vx || b.vy); }); }

    function update(dt) {
      clock += dt; msgT = Math.max(0, msgT - dt);
      sinks.forEach(function (s) { s.t += dt * 3.2; }); sinks = sinks.filter(function (s) { return s.t < 1; });
      if (st === 'roll') {
        var n = Math.min(14, Math.ceil(dt * 240)), h = dt / n; for (var i = 0; i < n; i++) step(h);
        if (!moving()) {
          refresh();
          if (scratched) { scratched = false; shots++; placeCue(); msg = 'Scratch: the white is back, one shot added'; msgT = 2.4; }
          if (!balls.some(function (b) { return b.n && b.alive; })) { st = 'won'; nextT = 3.6; api.cheer(shots <= 6 ? 100 : 60); var rec = api.setBest(shots, true); msg = 'Table cleared in ' + shots + (shots === 1 ? ' shot' : ' shots') + (rec ? ' — your best' : ''); msgT = 3.2; }
          else st = 'aim';
        }
      } else if (st === 'won') { nextT -= dt; if (nextT <= 0) rack(); }
    }

    function drawBall(b, x, y, sc) {
      var r = R * sc; if (r < 0.5) return;
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(r * 0.28, r * 0.42, r * 0.95, r * 0.8, 0, 0, 7); ctx.fill();
      var col = b.n ? colOf(b.n) : '#f4f1e6';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.save(); ctx.clip();
      if (b.n > 8) {
        ctx.fillStyle = '#f6f3e8'; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.fillStyle = col; ctx.fillRect(-r, -r * 0.55, r * 2, r * 1.1);
      } else { ctx.fillStyle = col; ctx.fillRect(-r, -r, r * 2, r * 2); }
      if (b.n) { ctx.fillStyle = '#f6f3e8'; ctx.beginPath(); ctx.arc(0, 0, r * 0.48, 0, 7); ctx.fill(); ctx.fillStyle = '#17171f'; ctx.font = 'bold ' + Math.round(r * 0.78) + 'px -apple-system,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(b.n), 0, r * 0.04); }
      var sh = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.05, 0, 0, r); sh.addColorStop(0, 'rgba(255,255,255,.65)'); sh.addColorStop(0.35, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.4)'); ctx.fillStyle = sh; ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.restore(); ctx.restore();
    }
    function pill(x, y, w, txt, colr) { ctx.fillStyle = 'rgba(10,13,28,.85)'; rr(x, y, w, 26, 13); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = colr || '#ece8df'; ctx.font = '600 13px -apple-system,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(txt, x + w / 2, y + 17.5); }

    function draw() {
      ctx.drawImage(table, 0, 0, W, H);
      var bw = (W - 24 - 16) / 3; pill(12, 10, bw, 'Shots ' + shots, '#f2c879'); pill(12 + bw + 8, 10, bw, left + (left === 1 ? ' ball left' : ' balls left')); pill(12 + (bw + 8) * 2, 10, bw, api.best() ? 'Best ' + api.best() : 'Best –');
      var cue = balls[0];
      // aiming: guide, then the cue stick
      if (aim && cue.alive) {
        var pl = K.pull(aim.sx, aim.sy, aim.x, aim.y, W, H, 150), l = pl.l;
        if (l > 6) {
          var ux = pl.dx / l, uy = pl.dy / l, pw_ = clamp((l - 10) / 140, 0, 1), rc = ray(ux, uy);
          ctx.save(); ctx.setLineDash([2, 7]); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
          var len = P.guide === 0 ? Math.min(rc.t, 95) : rc.t; ctx.beginPath(); ctx.moveTo(cue.x, cue.y); ctx.lineTo(cue.x + ux * len, cue.y + uy * len); ctx.stroke();
          if (P.guide > 0) {
            var gx = cue.x + ux * rc.t, gy = cue.y + uy * rc.t; ctx.setLineDash([]); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(gx, gy, R, 0, 7); ctx.stroke();
            if (rc.b && P.guide === 2) { var ox = rc.b.x - gx, oy = rc.b.y - gy, ol = Math.hypot(ox, oy) || 1; ctx.setLineDash([2, 6]); ctx.strokeStyle = 'rgba(255,225,150,.85)'; ctx.beginPath(); ctx.moveTo(rc.b.x, rc.b.y); ctx.lineTo(rc.b.x + ox / ol * 70, rc.b.y + oy / ol * 70); ctx.stroke(); }
          }
          ctx.restore();
          // the stick lies behind the white ball, pulled back as far as your drag
          var back = R + 5 + pw_ * 46, sx = cue.x - ux * back, sy = cue.y - uy * back, ex = sx - ux * 170, ey = sy - uy * 170;
          ctx.save(); ctx.lineCap = 'round'; ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
          var sg = ctx.createLinearGradient(sx, sy, ex, ey); sg.addColorStop(0, '#e9cf9a'); sg.addColorStop(0.55, '#b47a3c'); sg.addColorStop(1, '#4a2c12');
          ctx.strokeStyle = sg; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.shadowBlur = 0;
          ctx.strokeStyle = '#6fa8e8'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - ux * 5, sy - uy * 5); ctx.stroke(); ctx.restore();
          ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.5 * pw_) + ')'; ctx.font = '600 12px -apple-system,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(Math.round(pw_ * 100) + '%', cue.x - ux * (back + 60), cue.y - uy * (back + 60) + 4);
        }
      }
      balls.forEach(function (b) { if (b.alive) drawBall(b, b.x, b.y, 1); });
      sinks.forEach(function (s) { var e = s.t, x = s.x + (s.tx - s.x) * e, y = s.y + (s.ty - s.y) * e; drawBall(s.b, x, y, 1 - e * 0.85); });
      if (msgT > 0 && msg) { ctx.font = '21px Georgia,serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; var tw = Math.min(W - 24, 360); ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(4,10,8,' + Math.min(0.85, msgT) + ')'; ctx.strokeText(msg, W / 2, (fy0 + fy1) / 2 + 6, tw); ctx.fillStyle = 'rgba(252,246,228,' + Math.min(1, msgT * 1.5) + ')'; ctx.fillText(msg, W / 2, (fy0 + fy1) / 2 + 6, tw); }
    }
    rack();
    var stop = K.loop(function (dt) { if (!alive) return; update(dt); draw(); });
    return {
      stop: function () { alive = false; stop(); }, restart: rack,
      peek: function () { return { st: st, shots: shots, left: left, balls: balls, R: R, PR: PR, pockets: pockets, field: [fx0, fy0, fx1, fy1], shoot: shoot, ray: ray, step: step, update: update, moving: moving }; }
    };
  }

  G.list.push(G.reg({ id: 'billiards', title: 'Billiards', blurb: 'Pool for one. Pull back anywhere, let go, and clear the table in as few shots as you can.', make: billiards,
    levels: { easy: 'Six balls, wide pockets, and the whole shot lined up for you.', normal: 'Ten balls with a guide to the first ball you will hit.', hard: 'A full fifteen-ball rack, tight pockets, and only a short aiming line.' }, bestLabel: function (b) { return b + ' shots'; } }));
})(typeof window !== 'undefined' ? window : globalThis);
