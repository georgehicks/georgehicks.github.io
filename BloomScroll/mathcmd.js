/* Bloom Scroll — Math Command. Missile Command, with arithmetic: the falling asteroids carry ANSWERS, and the buttons at the bottom are the FORMULAS.
   Work out which formula makes the number on an asteroid, tap it, and a missile flies to that asteroid. Tap a formula that matches nothing falling and the missile fizzles.
   The problems come from the same adaptive engine as the math cards (so your Math levels move as you play). Nothing here ends in a game-over screen: when the city is gone it rests and begins again. */
(function (root) {
  'use strict';
  var K = root.MannaKit, G = root.MannaGames, E = root.MannaEngine, rand = K.rand;

  function mathcmd(level, host, api) {
    var P = { easy: { nF: 3, maxA: 2, fall: 30, spawn: 4.4, cities: 6 }, normal: { nF: 4, maxA: 3, fall: 42, spawn: 3.5, cities: 5 }, hard: { nF: 5, maxA: 4, fall: 56, spawn: 2.8, cities: 4 } }[level];
    K.css('mathcmd', '.mc-tray{position:absolute;left:0;right:0;bottom:0;padding:.5rem .6rem calc(var(--bot,0px) + .6rem);display:flex;flex-wrap:wrap;gap:.45rem;justify-content:center;background:linear-gradient(rgba(8,10,22,0),rgba(8,10,22,.95) 30%);z-index:2}' +
      '.mc-f{flex:1 1 30%;min-width:6.2rem;min-height:54px;border:1px solid #3a4478;border-radius:14px;background:linear-gradient(160deg,#252c4d,#171b2e);color:#f3eede;font-family:var(--serif,Georgia,serif);font-size:1.3rem;box-shadow:0 4px 12px rgba(0,0,0,.4);touch-action:manipulation;-webkit-user-select:none;user-select:none;transition:opacity .2s,transform .1s}' +
      '.mc-f:active{transform:scale(.96);border-color:#F2C879}.mc-f.lock{opacity:.35}');
    var Mn = root.Manna, S = Mn && Mn.S, c = K.canvas(host), W = c.W, H = c.H, ctx = c.ctx, trayH = 76 + Math.ceil(P.nF / 3) * 62, groundY = H - trayH - 14;
    var slots, asts, mis, parts, floats, booms, cities, score, spawnT, cool, msg, msgT, clock = 0, st, stT, last, alive = true;
    var turrets = [W * 0.14, W * 0.5, W * 0.86];

    function problem(exclude) {
      for (var t = 0; t < 30; t++) {
        var sk = E.nextSkill(S.math, Math.random, last), p = E.nextProblem(S.math, sk, Math.random); last = sk;
        if (p.a > 0 && p.a < 10000 && exclude.indexOf(p.a) < 0 && exclude.indexOf(p.q) < 0) return { q: p.q, a: p.a, skill: p.skill || sk, tip: p.tip, ast: null, t0: 0, lock: 0 };
      }
      var a = 10 + Math.floor(Math.random() * 80); return { q: a + ' + 1', a: a + 1, skill: 'add', ast: null, t0: 0, lock: 0 };
    }
    function taken() { var o = []; slots.forEach(function (s) { if (s) { o.push(s.a); o.push(s.q); } }); return o; }
    var tray = K.el('div', 'mc-tray'); host.appendChild(tray); var btns = [];
    for (var i = 0; i < P.nF; i++) (function (ix) { var b = K.btn('mc-f', ''); b.addEventListener('pointerdown', function (e) { e.preventDefault(); fire(ix); }); b.addEventListener('contextmenu', function (e) { e.preventDefault(); }); btns.push(b); tray.appendChild(b); })(i);
    function paintTray() { btns.forEach(function (b, ix) { var s = slots[ix]; b.textContent = s ? s.q : ''; b.classList.toggle('lock', !!(s && s.lock > 0)); }); }
    function newGame() {
      slots = []; asts = []; mis = []; parts = []; floats = []; booms = []; score = 0; spawnT = 0.8; cool = 0; msg = 'Tap the formula that makes the falling number'; msgT = 3.2; st = 'play'; last = null;
      for (var q = 0; q < P.nF; q++) slots.push(problem(taken()));
      cities = []; var n = P.cities, cw = (W - 30) / n; for (q = 0; q < n; q++) cities.push({ x: 15 + cw * (q + 0.5), w: cw * 0.7, h: 22 + Math.random() * 26, alive: true, seed: Math.random() * 9 });
      paintTray(); status();
    }
    function status() { api.status('Score ' + score + (api.best() ? ' · best ' + api.best() : '')); }
    function spawn() {
      var free = slots.filter(function (s) { return !s.ast; }); if (!free.length || asts.length >= P.maxA) return;
      var s = free[Math.floor(Math.random() * free.length)], x, tries = 0, r = 26 + String(s.a).length * 3;
      do { x = rand(r + 8, W - r - 8); tries++; } while (tries < 14 && asts.some(function (a) { return Math.abs(a.x - x) < 70 && a.y < 120; }));
      var a = { x: x, y: -30, vx: rand(-7, 7), num: s.a, r: r, slot: s, rot: rand(0, 6), spin: rand(-1, 1), seed: Math.random() * 9 }; s.ast = a; s.t0 = clock; asts.push(a);
    }
    function grade(s, ok, secs) { try { E.grade(S.math, s.skill, ok, secs); if (Mn && Mn.save) Mn.save(); } catch (e) {} }
    function refill(ix) { slots[ix] = problem(taken().filter(function (v) { return v !== slots[ix].a && v !== slots[ix].q; })); paintTray(); }
    function fire(ix) {
      if (st !== 'play' || cool > 0) return; var s = slots[ix]; if (!s || s.lock > 0) return; cool = 0.22;
      var a = s.ast, from = turrets[0], bd = 1e9; turrets.forEach(function (tx) { var d = Math.abs(tx - (a ? a.x : W / 2)); if (d < bd) { bd = d; from = tx; } });
      if (a) mis.push({ x: from, y: groundY - 6, a: a, s: s, ix: ix, t: 0 });
      else { s.lock = 1.1; grade(s, false, 30); mis.push({ x: from, y: groundY - 6, fizzle: true, tx: from + (W / 2 - from) * 0.3, ty: groundY * 0.45, s: s }); msg = 'Nothing falling has that answer'; msgT = 1.3; paintTray(); }
    }
    function boom(x, y, col, n, big) { booms.push({ x: x, y: y, t: 0.5, m: 0.5, R: big ? 70 : 44, col: col }); for (var i = 0; i < n; i++) { var an = Math.random() * 6.3, sp = 40 + Math.random() * 110; parts.push({ x: x, y: y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 20, t: 0.55 + Math.random() * 0.4, col: col, r: 1.6 + Math.random() * 2.4 }); } }

    function update(dt) {
      clock += dt; msgT = Math.max(0, msgT - dt); cool = Math.max(0, cool - dt);
      parts.forEach(function (p) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; }); parts = parts.filter(function (p) { return p.t > 0; });
      booms.forEach(function (b) { b.t -= dt; }); booms = booms.filter(function (b) { return b.t > 0; }); floats.forEach(function (f) { f.t -= dt; f.y -= 22 * dt; }); floats = floats.filter(function (f) { return f.t > 0; });
      var relock = false; slots.forEach(function (s) { if (s.lock > 0) { s.lock -= dt; if (s.lock <= 0) relock = true; } }); if (relock) paintTray();
      if (st === 'rest') { stT -= dt; if (stT <= 0) newGame(); return; }
      spawnT -= dt; if (spawnT <= 0) { spawn(); spawnT = P.spawn / (1 + Math.min(1, score * 0.02)); }
      var speed = P.fall * (1 + Math.min(1.1, score * 0.016));
      asts.forEach(function (a) { a.y += speed * dt; a.x += a.vx * dt; a.rot += a.spin * dt; if (a.x < a.r) a.vx = Math.abs(a.vx); if (a.x > W - a.r) a.vx = -Math.abs(a.vx); });
      for (var i = asts.length - 1; i >= 0; i--) {
        var a = asts[i]; if (a.y < groundY - 4) continue;
        asts.splice(i, 1); var s = a.slot, ix = slots.indexOf(s); boom(a.x, groundY - 4, '#ff9a6a', 20, true);
        var best = null, bd = 1e9; cities.forEach(function (ct) { if (ct.alive && Math.abs(ct.x - a.x) < bd) { bd = Math.abs(ct.x - a.x); best = ct; } }); if (best) { best.alive = false; boom(best.x, groundY - 10, '#c9a86a', 14); }
        grade(s, false, 30); msg = s.q + ' = ' + s.a; msgT = 2.4; if (ix >= 0) refill(ix);
        if (!cities.some(function (ct) { return ct.alive; })) { st = 'rest'; stT = 2.8; msg = 'The city rests — score ' + score + '. Again?'; msgT = 2.8; api.setBest(score); }
      }
      for (i = mis.length - 1; i >= 0; i--) {
        var m = mis[i], tx = m.fizzle ? m.tx : m.a.x, ty = m.fizzle ? m.ty : m.a.y, dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy), step = 760 * dt; m.t += dt;
        m.trail = m.trail || []; m.trail.push([m.x, m.y]); if (m.trail.length > 10) m.trail.shift();
        if (d <= step + (m.fizzle ? 4 : m.a.r * 0.6)) {
          mis.splice(i, 1);
          if (m.fizzle) { boom(tx, ty, '#9aa3c0', 8); continue; }
          if (asts.indexOf(m.a) < 0) continue; asts.splice(asts.indexOf(m.a), 1); var sl = m.s, ix2 = slots.indexOf(sl); boom(m.a.x, m.a.y, '#ffd36b', 22, true); score++; floats.push({ x: m.a.x, y: m.a.y - 10, t: 1, txt: '+1' });
          grade(sl, true, clock - sl.t0); api.setBest(score); status(); if (ix2 >= 0) refill(ix2);
        } else { m.x += dx / d * step; m.y += dy / d * step; }
      }
    }

    // ---- drawing ----
    var dpr = Math.min(2, root.devicePixelRatio || 1), bg = document.createElement('canvas'); bg.width = Math.round(W * dpr); bg.height = Math.round(H * dpr);
    (function () {
      var g = bg.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); var s = g.createLinearGradient(0, 0, 0, groundY); s.addColorStop(0, '#070a1c'); s.addColorStop(0.7, '#141c40'); s.addColorStop(1, '#2a2f5c'); g.fillStyle = s; g.fillRect(0, 0, W, H);
      for (var i = 0; i < 90; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.2 + Math.random() * 0.6) + ')'; g.fillRect(Math.random() * W, Math.random() * groundY, 1.4, 1.4); }
      var mg = g.createRadialGradient(W * 0.8, 70, 4, W * 0.8, 70, 60); mg.addColorStop(0, 'rgba(255,240,200,.9)'); mg.addColorStop(0.3, 'rgba(255,240,200,.25)'); mg.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = mg; g.fillRect(W * 0.8 - 70, 0, 140, 140); g.fillStyle = '#f7ecc8'; g.beginPath(); g.arc(W * 0.8, 70, 15, 0, 7); g.fill();
      g.fillStyle = '#10142b'; g.fillRect(0, groundY, W, H - groundY);
      g.fillStyle = '#1b2142'; g.beginPath(); g.moveTo(0, groundY + 8); for (var x = 0; x <= W; x += 20) g.lineTo(x, groundY + 4 + Math.sin(x * 0.03) * 4); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    })();
    function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function glow(x, y, r, col, a) { var g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    function draw() {
      ctx.drawImage(bg, 0, 0, W, H);
      cities.forEach(function (ct) {
        var x = ct.x - ct.w / 2;
        if (!ct.alive) { ctx.fillStyle = '#242a4a'; for (var k = 0; k < 4; k++) ctx.fillRect(x + k * ct.w / 4, groundY - 5 - ((k * 7 + ct.seed * 3) % 6), ct.w / 4 - 2, 6); return; }
        for (var b = 0; b < 3; b++) { var bw = ct.w / 3, bh = ct.h * (0.55 + ((b * 5 + ct.seed) % 5) / 8); ctx.fillStyle = '#323a68'; ctx.fillRect(x + b * bw, groundY - bh, bw - 2, bh); ctx.fillStyle = '#454f86'; ctx.fillRect(x + b * bw, groundY - bh, bw - 2, 3); ctx.fillStyle = 'rgba(255,220,130,.85)'; for (var w = 0; w < 4; w++) ctx.fillRect(x + b * bw + 3 + (w % 2) * (bw / 2 - 2), groundY - bh + 8 + Math.floor(w / 2) * 8, 3, 3); }
      });
      turrets.forEach(function (tx) { ctx.fillStyle = '#4b5280'; rr(tx - 14, groundY - 12, 28, 14, 5); ctx.fill(); ctx.fillStyle = '#8890b8'; ctx.fillRect(tx - 3, groundY - 24, 6, 14); });
      var lowest = null; asts.forEach(function (a) { if (!lowest || a.y > lowest.y) lowest = a; });
      asts.forEach(function (a) {
        var danger = a.y > groundY - 150;
        ctx.globalCompositeOperation = 'lighter'; var tg = ctx.createLinearGradient(a.x, a.y - a.r * 3.4, a.x, a.y); tg.addColorStop(0, 'rgba(255,120,60,0)'); tg.addColorStop(1, 'rgba(255,170,80,.55)'); ctx.fillStyle = tg; ctx.beginPath(); ctx.moveTo(a.x - a.r * 0.7, a.y); ctx.lineTo(a.x, a.y - a.r * 3.4); ctx.lineTo(a.x + a.r * 0.7, a.y); ctx.fill(); glow(a.x, a.y, a.r * 1.7, danger ? 'rgba(255,90,70,A)' : 'rgba(255,170,90,A)', 0.35); ctx.globalCompositeOperation = 'source-over';
        ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot * 0.25); var rg = ctx.createRadialGradient(-a.r * 0.3, -a.r * 0.3, 2, 0, 0, a.r); rg.addColorStop(0, '#8d7a6a'); rg.addColorStop(1, '#4d4238'); ctx.fillStyle = rg; ctx.beginPath(); for (var k = 0; k < 11; k++) { var an = k / 11 * 6.283, rad = a.r * (0.9 + 0.12 * Math.sin(k * 2.3 + a.seed)); k ? ctx.lineTo(Math.cos(an) * rad, Math.sin(an) * rad) : ctx.moveTo(Math.cos(an) * rad, Math.sin(an) * rad); } ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.25)'; [[0.4, 0.3, 0.2], [-0.5, -0.1, 0.16], [0.1, -0.55, 0.13]].forEach(function (cr) { ctx.beginPath(); ctx.arc(cr[0] * a.r, cr[1] * a.r, cr[2] * a.r, 0, 7); ctx.fill(); }); ctx.restore();
        ctx.font = 'bold ' + Math.round(a.r * 0.82) + 'px Georgia,serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,12,8,.85)'; ctx.strokeText(a.num, a.x, a.y + a.r * 0.28); ctx.fillStyle = '#fff6df'; ctx.fillText(a.num, a.x, a.y + a.r * 0.28);
        if (a === lowest && a.y > 60) { ctx.strokeStyle = 'rgba(242,200,121,' + (0.35 + 0.25 * Math.sin(clock * 6)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(a.x, a.y, a.r + 8, 0, 7); ctx.stroke(); }
      });
      mis.forEach(function (m) { if (m.trail) { ctx.strokeStyle = 'rgba(255,210,150,.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); m.trail.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.lineTo(m.x, m.y); ctx.stroke(); } ctx.globalCompositeOperation = 'lighter'; glow(m.x, m.y, 12, 'rgba(255,230,160,A)', 0.9); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(m.x, m.y, 3.2, 0, 7); ctx.fill(); });
      booms.forEach(function (b) { var f = 1 - b.t / b.m; ctx.globalCompositeOperation = 'lighter'; glow(b.x, b.y, b.R * (0.4 + f * 0.8), 'rgba(255,190,100,A)', 0.7 * (1 - f)); ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = 'rgba(255,230,170,' + (1 - f) + ')'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(b.x, b.y, b.R * (0.3 + f * 0.9), 0, 7); ctx.stroke(); });
      parts.forEach(function (p) { ctx.globalAlpha = Math.min(1, p.t * 2); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }); ctx.globalAlpha = 1;
      ctx.font = 'bold 20px -apple-system,sans-serif'; ctx.textAlign = 'center'; floats.forEach(function (f) { ctx.fillStyle = 'rgba(255,236,160,' + Math.min(1, f.t * 1.5) + ')'; ctx.fillText(f.txt, f.x, f.y); });
      ctx.fillStyle = 'rgba(10,13,28,.85)'; rr(10, 10, 92, 26, 13); ctx.fill(); ctx.font = '600 13px -apple-system,sans-serif'; ctx.fillStyle = '#ece8dc'; ctx.fillText('Score ' + score, 56, 28);
      var alive = cities.filter(function (ct) { return ct.alive; }).length; ctx.fillStyle = 'rgba(10,13,28,.85)'; rr(W - 106, 10, 96, 26, 13); ctx.fill(); ctx.fillStyle = alive <= 1 ? '#ff8a7a' : '#ece8dc'; ctx.fillText('City ' + alive + '/' + cities.length, W - 58, 28);
      if (msgT > 0) { ctx.font = '21px Georgia,serif'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(5,8,16,' + Math.min(0.85, msgT) + ')'; ctx.strokeText(msg, W / 2, H * 0.38, W - 30); ctx.fillStyle = 'rgba(252,246,228,' + Math.min(1, msgT * 1.5) + ')'; ctx.fillText(msg, W / 2, H * 0.38, W - 30); }
    }
    newGame();
    var stop = K.loop(function (dt) { if (alive) { update(dt); draw(); } });
    return { stop: function () { alive = false; stop(); }, restart: newGame, peek: function () { return { slots: slots, asts: asts, mis: mis, cities: cities, score: score, st: st, fire: fire }; } };
  }

  G.list.push(G.reg({ id: 'mathcmd', title: 'Math Command', blurb: 'Asteroids fall carrying answers. Tap the formula that makes the number, and a missile finds it. Your Math levels move as you play.', make: mathcmd,
    levels: { easy: 'Three formulas, two asteroids, slow fall, six city blocks.', normal: 'Four formulas, three asteroids, five city blocks.', hard: 'Five formulas, four fast asteroids, four city blocks.' }, bestLabel: function (b) { return 'score ' + b; } }));
})(typeof window !== 'undefined' ? window : globalThis);
