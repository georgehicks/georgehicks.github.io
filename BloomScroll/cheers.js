/* Bloom Scroll — one celebration per game, each its own picture and its own little chime, so a win in Solitaire does not look or sound like a win in Putt.
   Every one lays a canvas over the game for a few seconds (touches pass through it) and removes itself. They are called by name through api.cheer(name, arg)
   or api.win({ cheer: name, arg }) — see gamekit.js. Nothing here is shared except the plumbing that puts a canvas on top. */
(function (root) {
  'use strict';
  var K = root.MannaKit, C = {}, TAU = Math.PI * 2;
  function chime(notes, step, type) { var Mu = root.MannaMusic; if (Mu && Mu.chime) { try { Mu.chime(notes, step, type); } catch (e) {} } }
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function eob(x) { x = clamp(x); var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function R(a, b) { return a + Math.random() * (b - a); }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function glow(g, x, y, r, rgb, al) { var q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, 'rgba(' + rgb + ',' + al + ')'); q.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = q; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  // the plumbing: a canvas over the host for dur seconds; o.init(W,H) makes the state, o.draw(g,W,H,t,dt,S) paints a frame; o.keep leaves earlier frames (trails)
  function overlay(host, dur, o) {
    var r = host.getBoundingClientRect(), W = Math.max(120, r.width), H = Math.max(160, r.height), d = Math.min(2, root.devicePixelRatio || 1), cv = document.createElement('canvas');
    cv.width = W * d; cv.height = H * d; cv.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px;pointer-events:none;z-index:7';
    host.appendChild(cv); var g = cv.getContext('2d'), S = o.init ? o.init(W, H) : {}, t = 0; g.setTransform(d, 0, 0, d, 0, 0);
    var stop = K.loop(function (dt) {
      t += dt; if (!o.keep) g.clearRect(0, 0, W, H); cv.style.opacity = clamp((dur - t) / 0.9);
      o.draw(g, W, H, t, dt, S);
      if (t > dur || !cv.isConnected) { stop(); if (cv.parentNode) cv.parentNode.removeChild(cv); }
    });
  }

  // ---- Solitaire: the cards come home and spring off the top, bouncing across the table and leaving their trails, as they always have ----
  C.solitaire = function (host) {
    chime([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.14);
    var suits = ['♠', '♥', '♦', '♣'], ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    overlay(host, 5.2, { keep: true, init: function () { return { c: [], n: 0, ac: 0 }; }, draw: function (g, W, H, t, dt, S) {
      S.ac += dt; if (t < 2.6 && S.ac > 0.17) { S.ac = 0; var k = S.n++ % 4; S.c.push({ x: W * (0.28 + 0.14 * k), y: 64, vx: (k % 2 ? -1 : 1) * R(80, 240) * (k > 1 ? 0.8 : 1), vy: R(-200, -60), s: suits[k], r: ranks[S.n % 13] }); }
      var cw = Math.min(46, W * 0.12), ch = cw * 1.4, floor = H - ch - 6;
      S.c.forEach(function (c) {
        c.vy += 900 * dt; c.x += c.vx * dt; c.y += c.vy * dt; if (c.y > floor) { c.y = floor; c.vy *= -0.8; }
        if (c.x < -cw || c.x > W + cw) return;
        g.fillStyle = '#fbf7ec'; rr(g, c.x, c.y, cw, ch, 5); g.fill(); g.strokeStyle = 'rgba(40,40,60,.55)'; g.lineWidth = 1; g.stroke();
        g.fillStyle = c.s === '♥' || c.s === '♦' ? '#c33d4f' : '#23263a'; g.font = '600 ' + Math.round(cw * 0.34) + 'px Georgia,serif'; g.textAlign = 'left'; g.fillText(c.r, c.x + 4, c.y + cw * 0.36);
        g.font = Math.round(cw * 0.62) + 'px Georgia,serif'; g.textAlign = 'center'; g.fillText(c.s, c.x + cw / 2, c.y + ch * 0.8);
      });
    } });
  };

  // ---- Checkers: a golden crown rises on rays of light, and gold pieces circle it ----
  C.checkers = function (host) {
    chime([392, 523.25, 659.25, 783.99, 1046.5], 0.17);
    overlay(host, 4.8, { init: function () { var a = []; for (var i = 0; i < 14; i++) a.push(i / 14 * TAU); return { a: a }; }, draw: function (g, W, H, t, dt, S) {
      var cx = W / 2, cy = H * 0.4, m = Math.min(W, H), k = eob(t / 0.8), i;
      g.save(); g.globalCompositeOperation = 'lighter'; g.translate(cx, cy); g.rotate(t * 0.25);
      for (i = 0; i < 14; i++) { g.rotate(TAU / 14); g.fillStyle = 'rgba(255,214,120,' + 0.12 * clamp(t / 0.8) + ')'; g.beginPath(); g.moveTo(0, 0); g.lineTo(H, -H * 0.045); g.lineTo(H, H * 0.045); g.fill(); }
      g.restore(); glow(g, cx, cy, m * 0.5, '255,205,110', 0.35 * clamp(t / 0.6));
      g.save(); g.translate(cx, cy - Math.sin(t * 2) * 4); var s = m * 0.0036 * k; g.scale(s, s);
      var gr = g.createLinearGradient(0, -50, 0, 34); gr.addColorStop(0, '#ffe9a0'); gr.addColorStop(1, '#c98f2e');
      g.fillStyle = gr; g.strokeStyle = '#8a5d16'; g.lineWidth = 3; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-62, 32); g.lineTo(-74, -32); g.lineTo(-32, -2); g.lineTo(0, -50); g.lineTo(32, -2); g.lineTo(74, -32); g.lineTo(62, 32); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#a8751f'; g.fillRect(-62, 16, 124, 16);
      [[-74, -32], [0, -50], [74, -32]].forEach(function (p, j) { g.fillStyle = ['#e5383b', '#5dd0ff', '#e5383b'][j]; g.beginPath(); g.arc(p[0], p[1] - 4, 8, 0, TAU); g.fill(); g.strokeStyle = '#fff6'; g.lineWidth = 1.5; g.stroke(); });
      g.restore();
      for (i = 0; i < 14; i++) {
        var an = S.a[i] + t * 1.5, rad = clamp(t / 1.1) * m * 0.36 + (t > 2.6 ? (t - 2.6) * 140 : 0), x = cx + Math.cos(an) * rad, y = cy + Math.sin(an) * rad * 0.45, z = 0.8 + 0.3 * Math.sin(an);
        g.fillStyle = '#9a6a1c'; g.beginPath(); g.ellipse(x, y + 3, 13 * z, 7 * z, 0, 0, TAU); g.fill(); g.fillStyle = '#f2c879'; g.beginPath(); g.ellipse(x, y, 13 * z, 7 * z, 0, 0, TAU); g.fill();
        g.strokeStyle = '#b98a30'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y, 8 * z, 4 * z, 0, 0, TAU); g.stroke();
      }
    } });
  };

  // ---- Minesweeper: every mine is gone, and the field blooms, flowers opening outward from the middle ----
  C.mines = function (host) {
    chime([783.99, 987.77, 1174.66, 1568], 0.2);
    overlay(host, 5.4, { init: function (W, H) {
      var f = [], i; for (i = 0; i < 24; i++) { var x = W * R(0.07, 0.93), y = H * R(0.32, 0.96); f.push({ x: x, y: y, h: R(34, 84), hue: [335, 48, 285, 12, 205][i % 5], d: Math.hypot(x - W / 2, y - H / 2) / Math.max(W, H) * 1.8 + R(0, 0.5), ph: R(0, 6), z: R(0.8, 1.35) }); }
      f.sort(function (a, b) { return a.y - b.y; }); return { f: f }; }, draw: function (g, W, H, t, dt, S) {
      S.f.forEach(function (f) {
        var p = clamp((t - f.d) / 1.1); if (p <= 0) return; var e = eob(p), sw = Math.sin(t * 1.6 + f.ph) * 3, hx = f.x + sw * 1.5, hy = f.y - f.h * e;
        g.strokeStyle = '#4f9a58'; g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(f.x, f.y); g.quadraticCurveTo(f.x + sw, f.y - f.h * e * 0.5, hx, hy); g.stroke();
        g.fillStyle = '#5fae68'; g.beginPath(); g.ellipse(f.x + sw * 0.6 + 6, f.y - f.h * e * 0.42, 7 * e, 3 * e, -0.5, 0, TAU); g.fill();
        var pr = 9 * f.z * e; for (var k = 0; k < 5; k++) { var a = k / 5 * TAU + sw * 0.05; g.fillStyle = 'hsl(' + f.hue + ',78%,' + (66 + (k % 2) * 6) + '%)'; g.beginPath(); g.ellipse(hx + Math.cos(a) * pr * 0.9, hy + Math.sin(a) * pr * 0.9, pr * 0.8, pr * 0.5, a, 0, TAU); g.fill(); }
        g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(hx, hy, pr * 0.45, 0, TAU); g.fill();
      });
    } });
  };

  // ---- Sudoku: a band of light sweeps the board and the digits one to nine rise, each with its own note of the scale ----
  C.sudoku = function (host) {
    chime([523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5, 1174.66], 0.2);
    overlay(host, 4.6, { draw: function (g, W, H, t) {
      var x = (t / 1.9) * (W + 240) - 120, bg = g.createLinearGradient(x - 110, 0, x + 110, 0); bg.addColorStop(0, 'rgba(255,225,150,0)'); bg.addColorStop(0.5, 'rgba(255,225,150,.26)'); bg.addColorStop(1, 'rgba(255,225,150,0)');
      g.fillStyle = bg; g.fillRect(x - 110, 0, 220, H);
      var sz = Math.min(46, W / 9 * 0.95); g.textAlign = 'center'; g.font = '600 ' + sz + 'px Georgia,serif'; g.shadowColor = 'rgba(255,205,110,.95)'; g.shadowBlur = 16;
      for (var i = 0; i < 9; i++) { var p = clamp((t - 0.25 - i * 0.2) / 1.6); if (p <= 0) continue; g.globalAlpha = Math.sin(p * Math.PI); g.fillStyle = '#ffe9a8'; g.fillText(String(i + 1), W * (i + 0.5) / 9, H * 0.8 - p * H * 0.52); }
      g.globalAlpha = 1; g.shadowBlur = 0;
    } });
  };

  // ---- 2048: the number itself blazes, rings of gold spread out from it, embers rise ----
  C.tfe = function (host) {
    chime([261.63, 392, 523.25, 783.99, 1046.5], 0.22, 'triangle');
    overlay(host, 4.6, { init: function (W, H) { var e = []; for (var i = 0; i < 44; i++) e.push({ x: R(0, W), y: H + R(0, H * 0.6), vy: -R(50, 150), s: R(1.5, 3.6), ph: R(0, 6) }); return { e: e }; }, draw: function (g, W, H, t, dt, S) {
      var cx = W / 2, cy = H * 0.42, m = Math.min(W, H), i;
      for (i = 0; i < 4; i++) { var p = (t - i * 0.4) / 2; if (p > 0 && p < 1) { g.strokeStyle = 'rgba(242,200,121,' + (1 - p) * 0.75 + ')'; g.lineWidth = 4 * (1 - p) + 1; g.beginPath(); g.arc(cx, cy, p * m * 0.75, 0, TAU); g.stroke(); } }
      g.save(); g.globalCompositeOperation = 'lighter'; g.translate(cx, cy); g.rotate(-t * 0.35); for (i = 0; i < 12; i++) { g.rotate(TAU / 12); g.fillStyle = 'rgba(255,200,90,' + 0.1 * clamp(t) + ')'; g.beginPath(); g.moveTo(0, 0); g.lineTo(H, -H * 0.05); g.lineTo(H, H * 0.05); g.fill(); } g.restore();
      var sz = Math.min(m * 0.34, 130) * eob(t / 0.7) * (1 + 0.035 * Math.sin(t * 5)), gr = g.createLinearGradient(0, cy - sz / 2, 0, cy + sz / 2); gr.addColorStop(0, '#fff3c0'); gr.addColorStop(1, '#f0a530');
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold ' + Math.round(sz) + 'px -apple-system,Helvetica,sans-serif'; g.shadowColor = 'rgba(255,190,70,.95)'; g.shadowBlur = 34; g.fillStyle = gr; g.fillText('2048', cx, cy); g.shadowBlur = 0; g.textBaseline = 'alphabetic';
      g.globalCompositeOperation = 'lighter'; S.e.forEach(function (e) { e.y += e.vy * dt; e.x += Math.sin(t * 2 + e.ph) * 12 * dt; if (e.y < -10) return; glow(g, e.x, e.y, e.s * 4, '255,170,70', 0.8); }); g.globalCompositeOperation = 'source-over';
    } });
  };

  // ---- Four in a Row: discs rain down all seven columns and settle, the row of gold in the middle pulsing ----
  C.fourrow = function (host) {
    chime([523.25, 659.25, 783.99, 659.25, 1046.5], 0.12, 'triangle');
    overlay(host, 4.4, { init: function (W, H) {
      var cw = W / 7, r = Math.min(cw * 0.4, 26), d = [], c, i; for (c = 0; c < 7; c++) for (i = 0; i < 3; i++) d.push({ x: cw * (c + 0.5), y: -r * 2, vy: 0, land: H * 0.9 - i * r * 2.15, d: c * 0.13 + i * 0.4, gold: (c + i) % 2 === 0, r: r, i: i });
      return { d: d }; }, draw: function (g, W, H, t, dt, S) {
      S.d.forEach(function (o) {
        if (t < o.d) return; o.vy += 1500 * dt; o.y += o.vy * dt; if (o.y >= o.land) { o.y = o.land; o.vy *= -0.42; if (Math.abs(o.vy) < 40) o.vy = 0; }
        var a = o.gold ? ['#fff0b8', '#e0a93c'] : ['#ffd0da', '#d9647e'], q = g.createRadialGradient(o.x - o.r * 0.3, o.y - o.r * 0.3, 1, o.x, o.y, o.r); q.addColorStop(0, a[0]); q.addColorStop(1, a[1]);
        g.fillStyle = q; g.beginPath(); g.arc(o.x, o.y, o.r, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.5; g.beginPath(); g.arc(o.x, o.y, o.r * 0.68, 0, TAU); g.stroke();
        if (o.gold && t > 2 && o.vy === 0) { g.globalCompositeOperation = 'lighter'; glow(g, o.x, o.y, o.r * 1.8, '255,215,120', 0.25 + 0.2 * Math.sin(t * 6 + o.x)); g.globalCompositeOperation = 'source-over'; }
      });
    } });
  };

  // ---- Putt: fireworks. arg = how many rockets (a hole in one gets many; a bogey gets one small one) ----
  C.putt = function (host, n) {
    n = Math.max(1, n || 1); chime(n > 3 ? [784, 1047, 1319, 1568, 2093] : n > 1 ? [784, 1047, 1319] : [784, 1175], 0.12);
    overlay(host, 2.4 + n * 0.45, { init: function () { return { k: 0, ro: [], sp: [] }; }, draw: function (g, W, H, t, dt, S) {
      if (S.k < n && t > S.k * 0.42) { S.k++; S.ro.push({ x: W * R(0.18, 0.82), y: H, ty: H * R(0.14, 0.42), col: ['255,233,168', '155,232,181', '170,215,255', '255,255,255', '255,170,200'][Math.floor(Math.random() * 5)], big: n > 3 ? 1.25 : 1 }); }
      g.globalCompositeOperation = 'lighter';
      S.ro = S.ro.filter(function (r) {
        r.y -= H * 1.05 * dt; glow(g, r.x, r.y, 9, r.col, 0.9); g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(r.x, r.y, 1.8, 0, TAU); g.fill();
        if (r.y <= r.ty) { for (var i = 0; i < 30; i++) { var a = i / 30 * TAU + R(-0.1, 0.1), sp = R(55, 175) * r.big; S.sp.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, l: 1.2, col: r.col }); } return false; } return true; });
      S.sp = S.sp.filter(function (s) { s.l -= dt; if (s.l <= 0) return false; s.vy += 90 * dt; s.vx *= 1 - 0.6 * dt; s.x += s.vx * dt; s.y += s.vy * dt; glow(g, s.x, s.y, 5, s.col, clamp(s.l / 0.8)); return true; });
      g.globalCompositeOperation = 'source-over';
    } });
  };

  // ---- Lights: dawn. A warm sun climbs from the bottom of the screen and little lamps float up through it ----
  C.lights = function (host, perfect) {
    chime(perfect ? [659.25, 783.99, 987.77, 1318.5] : [659.25, 783.99, 987.77], 0.15);
    overlay(host, 2.8, { init: function (W, H) { var o = []; for (var i = 0; i < 28; i++) o.push({ x: R(0, W), y: H * R(0.55, 1.1), r: R(5, 15), vy: -R(14, 40), ph: R(0, 6) }); return { o: o }; }, draw: function (g, W, H, t, dt, S) {
      var p = clamp(t / 1.8); g.globalCompositeOperation = 'lighter';
      glow(g, W / 2, H * 1.05 - p * H * 0.42, H * (0.35 + 0.65 * p), '255,208,120', 0.5 * (1 - 0.3 * p)); glow(g, W / 2, H * 1.05 - p * H * 0.42, H * 0.2 * (0.4 + p), '255,246,210', 0.55 * p);
      S.o.forEach(function (o) { o.y += o.vy * dt; glow(g, o.x + Math.sin(t * 1.5 + o.ph) * 8, o.y, o.r * 2.2, '255,225,150', 0.28 + 0.22 * Math.sin(t * 3 + o.ph)); });
      g.globalCompositeOperation = 'source-over';
    } });
  };

  // ---- Bricks: the wall comes down in colourful pieces that tumble from the top and bounce on the floor ----
  C.bricks = function (host) {
    chime([523.25, 659.25, 783.99, 1046.5], 0.09, 'triangle');
    overlay(host, 3.4, { init: function (W, H) { var s = []; for (var i = 0; i < 48; i++) s.push({ x: R(0, W), y: -R(10, H * 0.7), vy: R(60, 200), vx: R(-50, 50), a: R(0, 6), va: R(-8, 8), hue: [0, 28, 52, 130, 200, 285][i % 6], w: R(22, 34), h: 12 }); return { s: s }; }, draw: function (g, W, H, t, dt, S) {
      S.s.forEach(function (b) {
        b.vy += 420 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.va * dt; if (b.y > H - 26) { b.y = H - 26; b.vy *= -0.38; b.vx *= 0.8; b.va *= 0.6; }
        g.save(); g.translate(b.x, b.y); g.rotate(b.a); var q = g.createLinearGradient(0, -b.h / 2, 0, b.h / 2); q.addColorStop(0, 'hsl(' + b.hue + ',85%,72%)'); q.addColorStop(1, 'hsl(' + b.hue + ',80%,52%)'); g.fillStyle = q; rr(g, -b.w / 2, -b.h / 2, b.w, b.h, 2.5); g.fill();
        g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-b.w / 2 + 2, -b.h / 2 + 1.5, b.w - 4, 2); g.restore();
      });
    } });
  };

  // ---- Billiards: a handful of pool balls fly up from the corners and bounce about the table, spinning ----
  C.billiards = function (host, great) {
    chime(great ? [698.46, 880, 1046.5, 1318.5, 1568] : [698.46, 880, 1046.5], 0.1, 'triangle');
    overlay(host, 3.6, { init: function (W, H) {
      var cols = ['#f2c23a', '#2f5fd0', '#d03b3b', '#6b3fa0', '#e8782a', '#2f9a55', '#8a2a2a', '#1b1b1f', '#f2c23a'], b = [];
      for (var i = 0; i < (great ? 9 : 6); i++) b.push({ x: i % 2 ? W * 0.94 : W * 0.06, y: H * 0.96, vx: (i % 2 ? -1 : 1) * R(60, 200), vy: -R(520, 820), a: 0, n: i + 1, col: cols[i], d: i * 0.2, r: Math.min(19, W * 0.05) });
      return { b: b }; }, draw: function (g, W, H, t, dt, S) {
      S.b.forEach(function (b) {
        if (t < b.d) return; b.vy += 800 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.vx * dt / b.r;
        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.92; } if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * 0.92; } if (b.y > H - b.r - 4) { b.y = H - b.r - 4; b.vy *= -0.7; if (Math.abs(b.vy) < 40) b.vy = 0; b.vx *= 0.985; }
        g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(b.x + 3, H - 6, b.r * 0.9, b.r * 0.28, 0, 0, TAU); g.fill();
        var q = g.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.4, 1, b.x, b.y, b.r); q.addColorStop(0, '#fff'); q.addColorStop(0.25, b.col); q.addColorStop(1, '#0006'); g.fillStyle = b.col; g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill();
        g.fillStyle = q; g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill();
        g.save(); g.translate(b.x, b.y); g.rotate(b.a); g.fillStyle = '#f7f3e8'; g.beginPath(); g.arc(0, 0, b.r * 0.5, 0, TAU); g.fill(); g.fillStyle = '#222'; g.font = 'bold ' + Math.round(b.r * 0.7) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(b.n), 0, 1); g.restore();
      });
    } });
  };

  // ---- Blast Maze: the stage goes up in a chain of bomb blasts, crossing flames and rings, popping across the field ----
  C.blast = function (host) {
    chime([329.63, 440, 659.25, 880], 0.11, 'triangle');
    overlay(host, 2.6, { init: function (W, H) { var b = []; for (var i = 0; i < 15; i++) b.push({ x: W * R(0.1, 0.9), y: H * R(0.12, 0.88), t0: i * 0.14, hue: i % 2 ? 40 : 18 }); return { b: b }; }, draw: function (g, W, H, t, dt, S) {
      g.globalCompositeOperation = 'lighter';
      S.b.forEach(function (o) {
        var p = (t - o.t0) / 0.75; if (p <= 0 || p >= 1) return; var len = 18 + p * 62, a = 1 - p, wd = 15 * (1 - p * 0.5);
        glow(g, o.x, o.y, 30 + p * 40, '255,170,60', 0.6 * a);
        g.fillStyle = 'rgba(255,150,50,' + a * 0.85 + ')'; g.fillRect(o.x - len, o.y - wd / 2, len * 2, wd); g.fillRect(o.x - wd / 2, o.y - len, wd, len * 2);
        g.fillStyle = 'rgba(255,240,170,' + a + ')'; g.fillRect(o.x - len * 0.8, o.y - wd / 5, len * 1.6, wd * 0.4); g.fillRect(o.x - wd / 5, o.y - len * 0.8, wd * 0.4, len * 1.6);
        g.strokeStyle = 'rgba(255,190,90,' + a + ')'; g.lineWidth = 3; g.beginPath(); g.arc(o.x, o.y, p * 46, 0, TAU); g.stroke();
      });
      g.globalCompositeOperation = 'source-over';
    } });
  };

  // ---- Hold the Pass: the keep's banner goes up. Rays of morning pour from the keep, bunting runs across the top, gold sparks climb, and bells ring ----
  C.pass = function (host, at) {
    chime([523.25, 659.25, 783.99, 1046.5, 783.99, 1318.5, 1568], 0.22);
    overlay(host, 5.4, { init: function (W, H) { return { x: at ? at.x : W * 0.5, y: at ? at.y : H * 0.8, sp: [], ac: 0 }; }, draw: function (g, W, H, t, dt, S) {
      var i, m = Math.max(W, H);
      g.save(); g.globalCompositeOperation = 'lighter'; g.translate(S.x, S.y); g.rotate(t * 0.18);
      for (i = 0; i < 14; i++) { g.rotate(TAU / 14); g.fillStyle = 'rgba(255,214,130,' + 0.1 * clamp(t / 0.9) + ')'; g.beginPath(); g.moveTo(0, 0); g.lineTo(m * 1.3, -m * 0.07); g.lineTo(m * 1.3, m * 0.07); g.fill(); }
      g.restore(); g.globalCompositeOperation = 'lighter'; glow(g, S.x, S.y, m * 0.35, '255,210,120', 0.4 * clamp(t / 0.8)); g.globalCompositeOperation = 'source-over';
      var N = 11, cols = ['#e5383b', '#F2C879', '#5dd0ff', '#9be8b5', '#d9a0ff'], sag = 16;
      g.strokeStyle = 'rgba(230,220,200,.8)'; g.lineWidth = 1.4; g.beginPath(); for (i = 0; i <= 40; i++) { var u = i / 40; var px = W * u, py = 12 + sag * Math.sin(u * Math.PI); if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.stroke();
      for (i = 0; i < N; i++) {
        var u2 = (i + 0.5) / N, px2 = W * u2, py2 = 12 + sag * Math.sin(u2 * Math.PI), p = clamp((t - i * 0.07) / 0.5), sw = Math.sin(t * 3 + i * 0.9) * 0.18, w = W / N * 0.78;
        g.save(); g.translate(px2, py2); g.rotate(sw); g.scale(1, eob(p)); g.fillStyle = cols[i % 5]; g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(w / 2, 0); g.lineTo(0, w * 1.15); g.closePath(); g.fill(); g.restore();
      }
      S.ac += dt; if (t < 3.2 && S.ac > 0.05) { S.ac = 0; S.sp.push({ x: S.x + R(-14, 14), y: S.y + R(-10, 6), vx: R(-35, 35), vy: -R(60, 150), l: R(1.2, 2) }); }
      g.globalCompositeOperation = 'lighter'; S.sp = S.sp.filter(function (s) { s.l -= dt; if (s.l <= 0) return false; s.x += s.vx * dt; s.y += s.vy * dt; s.vx += Math.sin(t * 4 + s.y) * 20 * dt; glow(g, s.x, s.y, 6, '255,220,130', clamp(s.l)); return true; }); g.globalCompositeOperation = 'source-over';
    } });
  };

  root.MannaCheer = C;
})(typeof window !== 'undefined' ? window : globalThis);
