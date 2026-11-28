/* Bloom Scroll — Hold the Pass (tower defence). Ten places to defend, each with its own road, look and run of waves, and a Random place that
   makes a new road every time. Eight towers (Bolt, Dart, Frost, Thorn, Burst, Storm, Lancer, Lantern), seven kinds of foe (some armoured, some fly,
   one is a boss). The Easy / Normal / Hard picker from the game kit sets gold, lives and how tough the foes are; stars per place are remembered
   per difficulty. Everything is drawn on one canvas: the ground is painted once into an offscreen canvas, then towers, foes, shots and sparks go on top. */
(function (root) {
  'use strict';
  var K = root.MannaKit, COLS = 7, ROWS = 10, BAR = 58, HUDH = 52;

  function rng(seed) { var a = seed | 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function glow(g, x, y, r, rgb, al) { var q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, 'rgba(' + rgb + ',' + al + ')'); q.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = q; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }

  // ---------- remembered stars ----------
  var SK = 'manna.pass';
  function loadS() { try { return JSON.parse(localStorage.getItem(SK) || '{}') || {}; } catch (e) { return {}; } }
  function stars(diff, id) { var o = loadS(); return (o[diff] && o[diff][id]) || 0; }
  function setStars(diff, id, n) { var o = loadS(); o[diff] = o[diff] || {}; if ((o[diff][id] || 0) < n) o[diff][id] = n; try { localStorage.setItem(SK, JSON.stringify(o)); } catch (e) {} var c = 0; for (var k in o[diff]) if (o[diff][k] > 0) c++; return c; }
  // the old endless game kept "best wave" numbers under the same name; they mean something else now, so they are cleared once
  (function () { try { var o = loadS(); if (!o.v2) { var b = JSON.parse(localStorage.getItem('manna.gbest') || '{}'); ['easy', 'normal', 'hard'].forEach(function (l) { delete b['pass.' + l]; }); localStorage.setItem('manna.gbest', JSON.stringify(b)); o.v2 = 1; localStorage.setItem(SK, JSON.stringify(o)); } } catch (e) {} })();
  var EK = 'manna.pass.endless';
  function endBest(diff, id) { try { var o = JSON.parse(localStorage.getItem(EK) || '{}') || {}; return (o[diff] && o[diff][id]) || 0; } catch (e) { return 0; } }
  function setEndBest(diff, id, w) { try { var o = JSON.parse(localStorage.getItem(EK) || '{}') || {}; o[diff] = o[diff] || {}; if ((o[diff][id] || 0) < w) { o[diff][id] = w; localStorage.setItem(EK, JSON.stringify(o)); return true; } } catch (e) {} return false; }
  function cleared(diff) { var o = loadS()[diff] || {}, c = 0; for (var k in o) if (o[k] > 0) c++; return c; }

  // ---------- places ----------
  var THEMES = {
    valley: { sky: ['#16222e', '#0b101d'], tile: [138, 30, 14, 22], edge: [140, 34, 26], road: ['#241b11', '#6f5d3e', '#8d7a52'], deco: 'grass', amb: 'fly', gate: '233,120,138' },
    wood:   { sky: ['#0f1f1a', '#07100d'], tile: [150, 32, 11, 20], edge: [150, 30, 22], road: ['#1d150d', '#5b4a31', '#765f40'], deco: 'wood', amb: 'leaf', gate: '190,120,240' },
    dunes:  { sky: ['#3a2a1d', '#1a110b'], tile: [34, 38, 24, 10], edge: [34, 40, 36], road: ['#2a1c0e', '#7d6140', '#a08258'], deco: 'dune', amb: 'dust', gate: '255,160,90' },
    frost:  { sky: ['#1a2a3d', '#0b1422'], tile: [208, 26, 30, 12], edge: [208, 30, 46], road: ['#18202e', '#52687f', '#7c96b0'], deco: 'pine', amb: 'snow', gate: '140,200,255' },
    ember:  { sky: ['#2a1210', '#0e0606'], tile: [10, 22, 12, 10], edge: [12, 26, 24], road: ['#120806', '#4a2e26', '#6a4538'], deco: 'lava', amb: 'ember', gate: '255,110,50', roadGlow: 'rgba(255,100,40,.24)' },
    marsh:  { sky: ['#142530', '#08111a'], tile: [172, 28, 13, 14], edge: [172, 30, 26], road: ['#101a1a', '#3f5c58', '#5d807a'], deco: 'reed', amb: 'fly', gate: '120,230,200' }
  };
  var ALL = ['blob', 'runner', 'swarm', 'brute', 'wisp', 'shell'];
  var LEVELS = [
    { name: 'Dusk Valley', theme: 'valley', N: 8, av: ['blob', 'runner'], c: [[0, 1], [5, 1], [5, 3], [1, 3], [1, 5], [5, 5], [5, 7], [1, 7], [1, 9], [6, 9]] },
    { name: 'Whispering Wood', theme: 'wood', N: 9, av: ['blob', 'runner', 'swarm'], c: [[1, 0], [1, 8], [3, 8], [3, 1], [5, 1], [5, 9]] },
    { name: 'Amber Dunes', theme: 'dunes', N: 10, av: ['blob', 'runner', 'swarm', 'brute'], c: [[0, 0], [6, 0], [6, 9], [1, 9], [1, 2], [4, 2], [4, 7], [3, 7]] },
    { name: 'Frozen Pass', theme: 'frost', N: 10, av: ['blob', 'runner', 'swarm', 'brute', 'wisp'], c: [[6, 0], [6, 2], [2, 2], [2, 4], [5, 4], [5, 6], [1, 6], [1, 8], [4, 8], [4, 9]] },
    { name: 'Ember Hills', theme: 'ember', N: 12, boss: 1, av: ALL, c: [[0, 2], [3, 2], [3, 0], [5, 0], [5, 4], [1, 4], [1, 6], [6, 6], [6, 8], [2, 8], [2, 9]] },
    { name: 'Moonlit Marsh', theme: 'marsh', N: 12, av: ALL, c: [[0, 0], [2, 0], [2, 2], [4, 2], [4, 0], [6, 0], [6, 4], [1, 4], [1, 6], [5, 6], [5, 8], [3, 8], [3, 9]] },
    { name: 'Sandstone Steps', theme: 'dunes', N: 13, av: ALL, c: [[0, 0], [2, 0], [2, 2], [4, 2], [4, 4], [6, 4], [6, 6], [4, 6], [4, 8], [2, 8], [2, 9]] },
    { name: 'Broad Fields', theme: 'valley', N: 14, av: ALL, c: [[0, 1], [5, 1], [5, 4], [1, 4], [1, 7], [6, 7], [6, 9]] },
    { name: 'The Long Road', theme: 'frost', N: 15, av: ALL, c: [[0, 0], [0, 8], [2, 8], [2, 1], [4, 1], [4, 8], [6, 8], [6, 0]] },
    { name: 'The Last Gate', theme: 'ember', N: 16, boss: 2, av: ALL, c: [[0, 0], [6, 0], [6, 9], [0, 9], [0, 2], [4, 2], [4, 7], [2, 7], [2, 4]] }
  ];
  LEVELS.forEach(function (d, i) { d.id = i + 1; d.L = i + 1; });

  function expand(c) {
    var path = [], i, j;
    for (i = 0; i < c.length - 1; i++) { var a = c[i], b = c[i + 1], n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); for (j = 0; j < n; j++) path.push([a[0] + Math.sign(b[0] - a[0]) * j, a[1] + Math.sign(b[1] - a[1]) * j]); }
    path.push(c[c.length - 1].slice()); return path;
  }
  function pathOf(d) { return d.path || (d.path = expand(d.c)); }
  // a road should never run alongside itself (that would leave no grass between the lanes)
  function clean(path) { for (var i = 0; i < path.length; i++) for (var j = i + 2; j < path.length; j++) if (Math.abs(path[i][0] - path[j][0]) + Math.abs(path[i][1] - path[j][1]) === 1) return false; return true; }
  // A new road for the Random place: a self-avoiding walk from an edge that never touches itself, ending on an edge.
  function genPath(rnd) {
    var D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var tries = 0; tries < 200; tries++) {
      var sides = [[0, 1 + Math.floor(rnd() * 8)], [COLS - 1, 1 + Math.floor(rnd() * 8)], [1 + Math.floor(rnd() * 5), 0]], s = sides[Math.floor(rnd() * 3)], path = [s], used = {}, budget = 5000;
      used[s.join()] = 1;
      var walk = function (dir) {
        if (budget-- < 0) return false;
        var p = path[path.length - 1], n = path.length;
        if (n >= 26 && (p[0] === 0 || p[0] === COLS - 1 || p[1] === ROWS - 1) && Math.abs(p[0] - s[0]) + Math.abs(p[1] - s[1]) >= 5) return true;
        if (n > 42) return false;
        var order = D.slice().sort(function () { return rnd() - 0.5; });
        if (dir && rnd() < 0.6) { order.sort(function (a, b) { return (b[0] === dir[0] && b[1] === dir[1]) - (a[0] === dir[0] && a[1] === dir[1]); }); }
        for (var k = 0; k < 4; k++) {
          var d = order[k], q = [p[0] + d[0], p[1] + d[1]];
          if (q[0] < 0 || q[1] < 0 || q[0] >= COLS || q[1] >= ROWS || used[q.join()]) continue;
          var touch = false; for (var m = 0; m < 4; m++) { var nb = [q[0] + D[m][0], q[1] + D[m][1]]; if ((nb[0] !== p[0] || nb[1] !== p[1]) && used[nb.join()]) { touch = true; break; } }
          if (touch) continue;
          used[q.join()] = 1; path.push(q); if (walk(d)) return true; path.pop(); delete used[q.join()];
        }
        return false;
      };
      if (walk(null)) return path;
    }
    return expand(LEVELS[0].c);
  }

  // ---------- towers and foes ----------
  var TW = {
    bolt:   { name: 'Bolt',   cost: 25, range: 1.9, dmg: 3,   rate: 0.7,  up: 1.7, col: '#f2c879', rgb: '255,225,150', info: 'A steady all-rounder.' },
    dart:   { name: 'Dart',   cost: 30, range: 1.5, dmg: 1.1, rate: 0.26, up: 0.45, col: '#a8e6a1', rgb: '170,240,160', info: 'Very quick, light hits.' },
    frost:  { name: 'Frost',  cost: 35, range: 1.6, dmg: 1,   rate: 1.1,  up: 0.5, col: '#8fd3ff', rgb: '160,220,255', info: 'Slows what it hits.' },
    thorn:  { name: 'Thorn',  cost: 40, range: 1.7, dmg: 0.4, rate: 1.0,  up: 0.2, col: '#c58bf0', rgb: '200,150,255', info: 'Poison that ignores armour.' },
    burst:  { name: 'Burst',  cost: 55, range: 1.7, dmg: 2,   rate: 1.5,  up: 1.1, col: '#e9788a', rgb: '255,150,140', info: 'Splash on a whole group.', splash: 0.85 },
    storm:  { name: 'Storm',  cost: 75, range: 2.0, dmg: 4,   rate: 1.4,  up: 1.9, col: '#9db4ff', rgb: '150,180,255', info: 'Lightning leaps between foes.' },
    lancer: { name: 'Lancer', cost: 70, range: 3.4, dmg: 10,  rate: 2.1,  up: 4.5, col: '#e8eef7', rgb: '230,240,255', info: 'Long reach, picks the toughest.' },
    lantern:{ name: 'Lantern',cost: 60, range: 1.5, dmg: 0,   rate: 1,    up: 0,   col: '#ffd27a', rgb: '255,200,110', info: 'Makes towers beside it hit harder.', sup: 1 }
  };
  var ORDER = ['bolt', 'dart', 'frost', 'thorn', 'burst', 'storm', 'lancer', 'lantern'];
  var EN = {
    blob:   { hp: 1,   spd: 1,    rew: 4,  r: 0.22 },
    runner: { hp: 0.55, spd: 1.7, rew: 4,  r: 0.17 },
    swarm:  { hp: 0.3, spd: 1.25, rew: 2,  r: 0.13 },
    brute:  { hp: 2.6, spd: 0.7,  rew: 9,  r: 0.3 },
    shell:  { hp: 1.7, spd: 0.85, rew: 8,  r: 0.25, armor: 1.5 },
    wisp:   { hp: 0.7, spd: 0.75, rew: 7,  r: 0.2,  fly: 1 },
    boss:   { hp: 1,   spd: 0.5,  rew: 80, r: 0.44, armor: 0.8, leak: 5 }
  };
  var CST = { blob: 1, runner: 0.7, swarm: 0.35, brute: 3, shell: 2.2, wisp: 1.3 };
  // one wave: a list of { t: type, at: seconds after the wave starts }
  function plan(d, w, rnd) {
    var av = d.av, B = 5 + w * 1.7 + d.L * 0.5, q = [], at = 0, last = w === d.N, m = w % 4;
    function grp(type, share, gap) {
      if (av.indexOf(type) < 0) type = 'blob';
      var n = Math.max(2, Math.min(36, Math.round(B * share / CST[type])));
      for (var i = 0; i < n; i++) { q.push({ t: type, at: at }); at += gap; } at += 1.1;
    }
    if (last && d.boss) { q.push({ t: 'boss', at: 0 }); at = 3; grp('blob', 0.35, 0.8); grp(av.indexOf('shell') >= 0 ? 'shell' : 'brute', 0.3, 1.1); }
    else if (last) { grp('brute', 0.5, 1.4); grp('blob', 0.5, 0.7); }
    else if (m === 1) grp('blob', 1, 0.85);
    else if (m === 2) { grp('runner', 0.55, 0.55); grp('swarm', 0.45, 0.22); }
    else if (m === 3) { grp('brute', 0.4, 1.5); grp('shell', 0.3, 1.1); grp('blob', 0.3, 0.8); }
    else { grp('wisp', 0.4, 0.9); grp('blob', 0.35, 0.8); grp('runner', 0.25, 0.5); }
    return q;
  }

  // ---------- drawing the towers (also used for the little pictures on the buttons) ----------
  function plinth(g, x, y, s, lvl) {
    g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(x, y + s * 0.27, s * 0.42, s * 0.15, 0, 0, 7); g.fill();
    g.fillStyle = '#3d4257'; rr(g, x - s * 0.37, y - s * 0.02, s * 0.74, s * 0.3, s * 0.1); g.fill();
    g.fillStyle = '#5f6682'; rr(g, x - s * 0.37, y - s * 0.02, s * 0.74, s * 0.12, s * 0.06); g.fill();
    if (lvl >= 2) { g.strokeStyle = lvl >= 3 ? '#ffd873' : '#cdbd86'; g.lineWidth = 1.3; rr(g, x - s * 0.37, y - s * 0.02, s * 0.74, s * 0.3, s * 0.1); g.stroke(); }
  }
  function drawTowerOn(g, kind, x, y, s, o) {
    var ang = o.ang || 0, fl = o.fl || 0, lvl = o.lvl || 1, ck = o.clock || 0, kick = fl > 0 ? s * 0.05 : 0, i;
    plinth(g, x, y, s, lvl);
    if (kind === 'bolt') {
      g.fillStyle = '#7e5f27'; rr(g, x - s * 0.21, y - s * 0.3, s * 0.42, s * 0.32, s * 0.06); g.fill();
      g.fillStyle = '#c9a050'; g.fillRect(x - s * 0.21, y - s * 0.3, s * 0.42, s * 0.07); g.fillStyle = '#5c4318'; g.fillRect(x - s * 0.21, y - s * 0.1, s * 0.42, s * 0.04);
      g.save(); g.translate(x, y - s * 0.27); g.rotate(ang);
      g.fillStyle = '#e8c070'; rr(g, -s * 0.04, -s * 0.06, s * 0.4 - kick, s * 0.12, s * 0.03); g.fill();
      g.fillStyle = '#fff3d2'; g.beginPath(); g.moveTo(s * 0.36 - kick, -s * 0.09); g.lineTo(s * 0.5 - kick, 0); g.lineTo(s * 0.36 - kick, s * 0.09); g.fill();
      g.fillStyle = '#b8903f'; g.beginPath(); g.arc(0, 0, s * 0.09, 0, 7); g.fill(); g.restore();
    } else if (kind === 'dart') {
      g.fillStyle = '#6a4e2c'; g.fillRect(x - s * 0.2, y - s * 0.12, s * 0.06, s * 0.14); g.fillRect(x + s * 0.14, y - s * 0.12, s * 0.06, s * 0.14);
      g.fillStyle = '#8f6c3a'; rr(g, x - s * 0.26, y - s * 0.22, s * 0.52, s * 0.14, s * 0.04); g.fill(); g.fillStyle = '#b08a52'; g.fillRect(x - s * 0.26, y - s * 0.22, s * 0.52, s * 0.04);
      g.fillStyle = '#4f9a58'; g.beginPath(); g.moveTo(x - s * 0.3, y - s * 0.22); g.lineTo(x, y - s * 0.46); g.lineTo(x + s * 0.3, y - s * 0.22); g.closePath(); g.fill(); g.fillStyle = '#7ccf80'; g.beginPath(); g.moveTo(x - s * 0.3, y - s * 0.22); g.lineTo(x, y - s * 0.46); g.lineTo(x, y - s * 0.22); g.fill();
      g.save(); g.translate(x, y - s * 0.17); g.rotate(ang); g.fillStyle = '#2f3a2c'; g.fillRect(0, -s * 0.07, s * 0.34 - kick, s * 0.05); g.fillRect(0, s * 0.02, s * 0.34 - kick, s * 0.05); g.fillStyle = '#a8e6a1'; g.fillRect(s * 0.3 - kick, -s * 0.07, s * 0.05, s * 0.05); g.fillRect(s * 0.3 - kick, s * 0.02, s * 0.05, s * 0.05); g.restore();
    } else if (kind === 'frost') {
      var pl = 1 + Math.sin(ck * 3) * 0.05;
      [[-0.2, 0.34, 0.1, 0.17], [0.2, 0.3, 0.1, 0.16]].forEach(function (c) { g.fillStyle = '#4d8fbd'; g.beginPath(); g.moveTo(x + c[0] * s, y - s * c[1]); g.lineTo(x + c[0] * s + s * c[2], y - s * 0.02); g.lineTo(x + c[0] * s - s * c[2], y - s * 0.02); g.closePath(); g.fill(); });
      g.fillStyle = '#5da3d4'; g.beginPath(); g.moveTo(x, y - s * 0.58 * pl); g.lineTo(x + s * 0.24, y - s * 0.22); g.lineTo(x, y + s * 0.02); g.lineTo(x - s * 0.24, y - s * 0.22); g.closePath(); g.fill();
      g.fillStyle = '#b9e5ff'; g.beginPath(); g.moveTo(x, y - s * 0.58 * pl); g.lineTo(x + s * 0.24, y - s * 0.22); g.lineTo(x, y - s * 0.32); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.arc(x - s * 0.06, y - s * 0.32, s * 0.04, 0, 7); g.fill();
      if (fl > 0) { g.globalCompositeOperation = 'lighter'; glow(g, x, y - s * 0.28, s * 0.5, '150,220,255', 0.6); g.globalCompositeOperation = 'source-over'; }
    } else if (kind === 'thorn') {
      var pu = 1 + Math.sin(ck * 4) * 0.08;
      g.fillStyle = '#2c5a36'; [[-0.16, -0.08, 0.2], [0.16, -0.08, 0.2], [0, -0.2, 0.24]].forEach(function (b) { g.beginPath(); g.arc(x + b[0] * s, y + b[1] * s, b[2] * s, 0, 7); g.fill(); });
      g.fillStyle = '#3f7d4a'; g.beginPath(); g.arc(x - s * 0.05, y - s * 0.26, s * 0.16, 0, 7); g.fill();
      g.fillStyle = '#1d3d25'; for (i = 0; i < 9; i++) { var a = -3.1 + i * 0.4, rx = x + Math.cos(a) * s * 0.3, ry = y - s * 0.12 + Math.sin(a) * s * 0.3; g.beginPath(); g.moveTo(rx - 2, ry); g.lineTo(rx + Math.cos(a) * s * 0.1, ry + Math.sin(a) * s * 0.1); g.lineTo(rx + 2, ry); g.fill(); }
      g.fillStyle = '#c58bf0'; [[-0.1, -0.3], [0.12, -0.22], [0.02, -0.12]].forEach(function (b) { g.beginPath(); g.arc(x + b[0] * s, y + b[1] * s, s * 0.055 * pu, 0, 7); g.fill(); });
      if (fl > 0) { g.globalCompositeOperation = 'lighter'; glow(g, x, y - s * 0.2, s * 0.45, '200,150,255', 0.6); g.globalCompositeOperation = 'source-over'; }
    } else if (kind === 'burst') {
      g.fillStyle = '#7d3f52'; g.beginPath(); g.arc(x, y - s * 0.14, s * 0.25, 0, 7); g.fill(); g.fillStyle = '#a95a70'; g.beginPath(); g.arc(x - s * 0.06, y - s * 0.2, s * 0.14, 0, 7); g.fill();
      g.strokeStyle = '#d8b46a'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y - s * 0.14, s * 0.25, 0.3, 2.8); g.stroke();
      g.save(); g.translate(x, y - s * 0.16); g.rotate(ang); g.fillStyle = '#2d1f2a'; rr(g, 0, -s * 0.09, s * 0.4 - kick, s * 0.18, s * 0.05); g.fill(); g.fillStyle = '#d8b46a'; g.fillRect(s * 0.28 - kick, -s * 0.1, s * 0.04, s * 0.2); g.restore();
    } else if (kind === 'storm') {
      g.fillStyle = '#39405a'; g.fillRect(x - s * 0.05, y - s * 0.42, s * 0.1, s * 0.42);
      [[0.0, 0.26], [0.1, 0.2], [0.2, 0.14]].forEach(function (r, j) { g.strokeStyle = j % 2 ? '#c27a4a' : '#e29a62'; g.lineWidth = 2.2; g.beginPath(); g.ellipse(x, y - s * (0.12 + r[0] * 1.2 + j * 0.0), s * r[1], s * 0.05, 0, 0, 7); g.stroke(); });
      var gl = 0.6 + 0.4 * Math.sin(ck * 9) + (fl > 0 ? 0.6 : 0);
      g.fillStyle = '#cdd9ff'; g.beginPath(); g.arc(x, y - s * 0.48, s * 0.11, 0, 7); g.fill();
      g.globalCompositeOperation = 'lighter'; glow(g, x, y - s * 0.48, s * (0.3 + 0.1 * gl), '150,180,255', 0.55 + 0.25 * gl);
      g.strokeStyle = 'rgba(190,210,255,.8)'; g.lineWidth = 1; for (i = 0; i < 3; i++) { var a2 = ck * 5 + i * 2.1, l0 = s * 0.12; g.beginPath(); g.moveTo(x + Math.cos(a2) * l0, y - s * 0.48 + Math.sin(a2) * l0); g.lineTo(x + Math.cos(a2 + 0.3) * s * 0.2, y - s * 0.48 + Math.sin(a2 + 0.3) * s * 0.2); g.lineTo(x + Math.cos(a2 - 0.1) * s * 0.28, y - s * 0.48 + Math.sin(a2 - 0.1) * s * 0.26); g.stroke(); }
      g.globalCompositeOperation = 'source-over';
    } else if (kind === 'lancer') {
      g.fillStyle = '#6a7390'; rr(g, x - s * 0.17, y - s * 0.46, s * 0.34, s * 0.48, s * 0.04); g.fill(); g.fillStyle = '#8a93b0'; g.fillRect(x - s * 0.17, y - s * 0.46, s * 0.1, s * 0.48);
      g.fillStyle = '#545c78'; for (i = 0; i < 3; i++) g.fillRect(x - s * 0.19 + i * s * 0.14, y - s * 0.54, s * 0.1, s * 0.09);
      g.fillStyle = '#2a3045'; g.fillRect(x - s * 0.04, y - s * 0.3, s * 0.08, s * 0.12);
      g.save(); g.translate(x, y - s * 0.36); g.rotate(ang); g.fillStyle = '#e8eef7'; g.fillRect(0, -s * 0.035, s * 0.52 - kick, s * 0.07); g.fillStyle = '#9fb0cc'; g.fillRect(0, s * 0.0, s * 0.52 - kick, s * 0.035); g.fillStyle = '#fff'; g.fillRect(s * 0.46 - kick, -s * 0.05, s * 0.06, s * 0.1); g.restore();
    } else {
      var fk = 0.85 + 0.15 * Math.sin(ck * 6);
      g.fillStyle = '#4a3e2c'; g.fillRect(x - s * 0.03, y - s * 0.34, s * 0.06, s * 0.36);
      g.strokeStyle = '#6a5a3c'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - s * 0.34); g.quadraticCurveTo(x + s * 0.16, y - s * 0.46, x + s * 0.16, y - s * 0.34); g.stroke();
      g.fillStyle = '#7a6638'; rr(g, x + s * 0.08, y - s * 0.36, s * 0.16, s * 0.2, s * 0.03); g.fill(); g.fillStyle = '#ffd27a'; rr(g, x + s * 0.1, y - s * 0.34, s * 0.12, s * 0.16, s * 0.02); g.fill();
      g.globalCompositeOperation = 'lighter'; glow(g, x + s * 0.16, y - s * 0.26, s * 0.55 * fk, '255,200,110', 0.55); glow(g, x + s * 0.16, y - s * 0.26, s * 0.2, '255,240,200', 0.7); g.globalCompositeOperation = 'source-over';
    }
    if (o.pips !== false) for (i = 0; i < lvl; i++) { g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(x + (i - (lvl - 1) / 2) * s * 0.16, y + s * 0.2, s * 0.045, 0, 7); g.fill(); }
  }
  var THUMBS = {};
  function thumb(kind) {
    if (THUMBS[kind] != null) return THUMBS[kind];
    var cv = document.createElement('canvas'); cv.width = cv.height = 76; var g = cv.getContext('2d'); drawTowerOn(g, kind, 38, 54, 64, { ang: -0.9, lvl: 1, clock: 1, pips: false });
    try { THUMBS[kind] = cv.toDataURL(); } catch (e) { THUMBS[kind] = ''; } return THUMBS[kind];
  }

  // ---------- drawing the foes ----------
  function body(g, x, y, rx, ry, col, dk) {
    g.fillStyle = dk; g.beginPath(); g.ellipse(x, y + ry * 0.06, rx, ry, 0, 0, 7); g.fill();
    g.fillStyle = col; g.beginPath(); g.ellipse(x, y - ry * 0.08, rx * 0.94, ry * 0.9, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.ellipse(x - rx * 0.28, y - ry * 0.45, rx * 0.45, ry * 0.25, -0.4, 0, 7); g.fill();
  }
  function eyes(g, x, y, r, face, big) {
    var er = r * (big || 0.2);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x + face * r * 0.2 - r * 0.28, y, er, 0, 7); g.arc(x + face * r * 0.2 + r * 0.28, y, er, 0, 7); g.fill();
    g.fillStyle = '#20182a'; g.beginPath(); g.arc(x + face * r * 0.3 - r * 0.28, y + er * 0.1, er * 0.5, 0, 7); g.arc(x + face * r * 0.3 + r * 0.28, y + er * 0.1, er * 0.5, 0, 7); g.fill();
  }
  function drawFoe(g, e, cs, ck) {
    var r = cs * EN[e.type].r, x = e.x, y = e.y, f = e.fx, t = e.type, bob = Math.abs(Math.sin(ck * (t === 'runner' || t === 'swarm' ? 15 : 9) + e.ph)) * cs * 0.06, hit = e.hit > 0, i;
    var C = {
      blob: ['#e9788a', '#b4526a'], runner: ['#f0a35c', '#b0682c'], swarm: ['#c79bf0', '#8b62b8'], brute: ['#a6405c', '#6f2540'], shell: ['#8d9ab8', '#4f5870'], wisp: ['#9be8e0', '#4ea8a0'], boss: ['#6d3a8c', '#3d1f55']
    }[t], col = hit ? '#ffffff' : e.slow > 0 ? '#7fc2ec' : e.pD > 0 && e.pT > 0 ? '#9ed48a' : C[0], dk = C[1];
    if (t === 'wisp') {
      var hv = cs * 0.3 + Math.sin(ck * 3 + e.ph) * cs * 0.04;
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y + r * 0.6, r * 0.7, r * 0.25, 0, 0, 7); g.fill();
      g.globalCompositeOperation = 'lighter'; glow(g, x, y - hv, r * 2.4, '120,230,220', 0.35);
      for (i = 1; i < 5; i++) glow(g, x - f * i * r * 0.5, y - hv + Math.sin(ck * 8 + i) * 2 + i * 1.5, r * (1 - i * 0.16), '120,230,220', 0.3 - i * 0.05);
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = hit ? '#fff' : '#c9fff8'; g.beginPath(); g.arc(x, y - hv, r * 0.85, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(x, y - hv + r * 0.1, r * 0.62, 0, 7); g.fill();
      g.fillStyle = '#10343a'; g.beginPath(); g.arc(x + f * r * 0.2 - r * 0.2, y - hv, r * 0.12, 0, 7); g.arc(x + f * r * 0.2 + r * 0.2, y - hv, r * 0.12, 0, 7); g.fill();
      e.hy = y - hv; return;
    }
    e.hy = y - bob;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x, y + r * 0.9, r * 0.95, r * 0.35, 0, 0, 7); g.fill();
    if (t === 'blob') {
      var fo = Math.sin(ck * 9 + e.ph) * r * 0.35; g.fillStyle = dk; g.beginPath(); g.ellipse(x - r * 0.4 + fo, y + r * 0.8, r * 0.22, r * 0.16, 0, 0, 7); g.ellipse(x + r * 0.4 - fo, y + r * 0.8, r * 0.22, r * 0.16, 0, 0, 7); g.fill();
      body(g, x, y - bob, r, r, col, dk); eyes(g, x, y - bob - r * 0.1, r, f);
    } else if (t === 'runner') {
      g.fillStyle = 'rgba(240,163,92,.22)'; g.beginPath(); g.ellipse(x - f * r * 1.7, y - bob, r * 1.2, r * 0.45, 0, 0, 7); g.fill();
      g.fillStyle = dk; g.beginPath(); g.moveTo(x - f * r * 0.5, y - bob - r * 0.5); g.lineTo(x - f * r * 1.2, y - bob - r * 1.1); g.lineTo(x - f * r * 0.1, y - bob - r * 0.7); g.fill();
      body(g, x, y - bob, r * 1.2, r * 0.82, col, dk); eyes(g, x + f * r * 0.2, y - bob - r * 0.08, r * 0.9, f, 0.22);
      g.strokeStyle = '#2a1a10'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x + f * r * 0.1, y - bob - r * 0.38); g.lineTo(x + f * r * 0.7, y - bob - r * 0.2); g.stroke();
    } else if (t === 'swarm') {
      g.strokeStyle = dk; g.lineWidth = 1.2; for (i = -1; i <= 1; i++) { var lw = Math.sin(ck * 18 + i + e.ph) * r * 0.35; g.beginPath(); g.moveTo(x - r * 0.7, y + i * r * 0.4); g.lineTo(x - r * 1.2, y + i * r * 0.5 + lw); g.moveTo(x + r * 0.7, y + i * r * 0.4); g.lineTo(x + r * 1.2, y + i * r * 0.5 - lw); g.stroke(); }
      body(g, x, y - bob, r, r * 0.9, col, dk); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + f * r * 0.3, y - bob - r * 0.1, r * 0.3, 0, 7); g.fill(); g.fillStyle = '#20182a'; g.beginPath(); g.arc(x + f * r * 0.38, y - bob - r * 0.08, r * 0.14, 0, 7); g.fill();
    } else if (t === 'brute') {
      var fo2 = Math.sin(ck * 7 + e.ph) * r * 0.3; g.fillStyle = dk; g.beginPath(); g.ellipse(x - r * 0.45 + fo2, y + r * 0.82, r * 0.3, r * 0.2, 0, 0, 7); g.ellipse(x + r * 0.45 - fo2, y + r * 0.82, r * 0.3, r * 0.2, 0, 0, 7); g.fill();
      g.fillStyle = '#dcd2c0'; [-1, 1].forEach(function (sd) { g.beginPath(); g.moveTo(x + sd * r * 0.55, y - bob - r * 0.6); g.lineTo(x + sd * r * 0.95, y - bob - r * 1.3); g.lineTo(x + sd * r * 0.2, y - bob - r * 0.9); g.fill(); });
      g.fillStyle = dk; [-1, 1].forEach(function (sd) { g.beginPath(); g.moveTo(x + sd * r * 0.95, y - bob - r * 0.1); g.lineTo(x + sd * r * 1.3, y - bob - r * 0.4); g.lineTo(x + sd * r * 0.9, y - bob + r * 0.3); g.fill(); });
      body(g, x, y - bob, r, r, col, dk); eyes(g, x, y - bob - r * 0.12, r, f, 0.2);
      g.strokeStyle = '#1f1018'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - r * 0.55, y - bob - r * 0.45); g.lineTo(x - r * 0.05, y - bob - r * 0.28); g.moveTo(x + r * 0.55, y - bob - r * 0.45); g.lineTo(x + r * 0.05, y - bob - r * 0.28); g.stroke();
      g.fillStyle = '#f4ecdc'; g.beginPath(); g.moveTo(x - r * 0.3, y - bob + r * 0.45); g.lineTo(x - r * 0.2, y - bob + r * 0.8); g.lineTo(x - r * 0.1, y - bob + r * 0.45); g.moveTo(x + r * 0.3, y - bob + r * 0.45); g.lineTo(x + r * 0.2, y - bob + r * 0.8); g.lineTo(x + r * 0.1, y - bob + r * 0.45); g.fill();
    } else if (t === 'shell') {
      g.strokeStyle = dk; g.lineWidth = 1.6; for (i = -1; i <= 1; i++) { var lw2 = Math.sin(ck * 8 + i + e.ph) * r * 0.2; g.beginPath(); g.moveTo(x - r * 0.8, y + i * r * 0.35); g.lineTo(x - r * 1.15, y + i * r * 0.45 + lw2); g.moveTo(x + r * 0.8, y + i * r * 0.35); g.lineTo(x + r * 1.15, y + i * r * 0.45 - lw2); g.stroke(); }
      g.fillStyle = dk; g.beginPath(); g.arc(x + f * r * 0.85, y - bob, r * 0.4, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + f * r * 1.0, y - bob - r * 0.08, r * 0.14, 0, 7); g.fill();
      g.fillStyle = dk; g.beginPath(); g.ellipse(x, y - bob + r * 0.06, r, r * 0.92, 0, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.ellipse(x, y - bob - r * 0.04, r * 0.92, r * 0.8, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(30,36,56,.55)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(x, y - bob - r * 0.8); g.lineTo(x, y - bob + r * 0.7); g.moveTo(x - r * 0.55, y - bob - r * 0.5); g.quadraticCurveTo(x - r * 0.25, y - bob, x - r * 0.55, y - bob + r * 0.5); g.moveTo(x + r * 0.55, y - bob - r * 0.5); g.quadraticCurveTo(x + r * 0.25, y - bob, x + r * 0.55, y - bob + r * 0.5); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.38)'; g.beginPath(); g.ellipse(x - r * 0.35, y - bob - r * 0.45, r * 0.4, r * 0.2, -0.5, 0, 7); g.fill();
    } else {   // boss
      var pu = 0.5 + 0.5 * Math.sin(ck * 3);
      g.globalCompositeOperation = 'lighter'; glow(g, x, y - bob, r * 2.6, '170,90,220', 0.2 + 0.1 * pu); g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#e8dcc4'; [-1, 1].forEach(function (sd) { g.beginPath(); g.moveTo(x + sd * r * 0.5, y - bob - r * 0.7); g.quadraticCurveTo(x + sd * r * 1.3, y - bob - r * 1.0, x + sd * r * 1.1, y - bob - r * 1.8); g.quadraticCurveTo(x + sd * r * 0.8, y - bob - r * 1.1, x + sd * r * 0.15, y - bob - r * 0.9); g.fill(); });
      body(g, x, y - bob, r, r, col, dk);
      g.fillStyle = '#f2c879'; g.beginPath(); g.moveTo(x - r * 0.6, y - bob - r * 0.75); for (i = 0; i < 4; i++) { g.lineTo(x - r * 0.6 + r * 0.4 * i + r * 0.2, y - bob - r * 1.15); g.lineTo(x - r * 0.6 + r * 0.4 * (i + 1), y - bob - r * 0.78); } g.fill();
      g.fillStyle = '#ff5b5b'; g.beginPath(); g.ellipse(x - r * 0.32, y - bob - r * 0.12, r * 0.18, r * 0.12, 0, 0, 7); g.ellipse(x + r * 0.32, y - bob - r * 0.12, r * 0.18, r * 0.12, 0, 0, 7); g.fill();
      g.fillStyle = '#1b0f26'; g.beginPath(); g.moveTo(x - r * 0.45, y - bob + r * 0.3); g.lineTo(x + r * 0.45, y - bob + r * 0.3); g.lineTo(x, y - bob + r * 0.58); g.fill();
    }
    if (e.slow > 0) { g.strokeStyle = 'rgba(190,230,255,.8)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y - bob, r * 1.2, 0, 7); g.stroke(); }
    if (e.pT > 0) { g.fillStyle = 'rgba(160,230,120,.8)'; for (i = 0; i < 3; i++) { var py = ((ck * 20 + i * 9 + e.ph * 5) % 18); g.beginPath(); g.arc(x + (i - 1) * r * 0.5, y - bob - r * 0.4 - py * 0.5, 1.6, 0, 7); g.fill(); } }
    if (t === 'shell' && e.armorFlash > 0) { g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y - bob, r * 1.05, 3.6, 5.6); g.stroke(); }
  }

  // ---------- the game ----------
  var KEEP = null;     // a game in progress survives a re-fit of the screen (see K.run) for a few seconds
  function make(diff, host, api) {
    var P = { easy: { gold: 150, lives: 20, hp: 0.75, inc: 3 }, normal: { gold: 100, lives: 12, hp: 1, inc: 2 }, hard: { gold: 75, lives: 8, hp: 1.25, inc: 1.5 } }[diff] || { gold: 100, lives: 12, hp: 1, inc: 2 };
    K.css('pass',
      '.ps-sel{position:absolute;inset:0;overflow:auto;padding:.7rem .7rem 1rem;display:flex;flex-direction:column;gap:.5rem}' +
      '.ps-sub{text-align:center;color:var(--ink-muted,#A2A9BE);font-family:var(--serif,Georgia,serif);font-style:italic;margin-bottom:.1rem}' +
      '.ps-grid{display:grid;grid-template-columns:1fr 1fr;gap:.45rem}' +
      '.ps-lv{display:flex;gap:.5rem;align-items:center;text-align:left;padding:.4rem .5rem;border-radius:14px;border:1px solid var(--border,#2B3252);background:var(--surface,#171B2E);color:var(--ink,#EDE8DC);min-height:70px}' +
      '.ps-lv canvas{flex:none;border-radius:6px}.ps-lv b{display:block;font-family:var(--serif,Georgia,serif);font-weight:normal;font-size:.95rem;line-height:1.15}' +
      '.ps-lv span{display:block;color:var(--ink-muted,#A2A9BE);font-size:.75rem;margin-top:.1rem}.ps-lv i{display:block;font-style:normal;color:var(--gold,#F2C879);font-size:.85rem;letter-spacing:.1em;margin-top:.05rem}' +
      '.ps-rand{display:block;width:100%;padding:.75rem 1rem;border-radius:14px;border:1px solid var(--gold,#F2C879);background:var(--surface,#171B2E);color:var(--gold,#F2C879);font-family:var(--serif,Georgia,serif);font-size:1.05rem}' +
      '.ps-bar{position:absolute;left:0;right:0;bottom:0;height:' + BAR + 'px;background:#0a0d18;z-index:2;display:flex;gap:4px;padding:5px 6px;align-items:stretch;border-top:1px solid rgba(255,255,255,.06)}' +
      '.ps-tb,.ps-b{flex:1;min-width:0;border:1px solid var(--border,#2B3252);background:var(--surface,#171B2E);color:#ece8dc;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;padding:1px 0;font-size:.72rem;line-height:1.1}' +
      '.ps-tb img{width:32px;height:32px;display:block;pointer-events:none}.ps-tb.on{border-color:#F2C879;background:#232a4a}.ps-tb.no{opacity:.42}.ps-b{font-size:.85rem;flex:1 1 0}.ps-b:disabled{opacity:.4}.ps-b.no{opacity:.5}' +
      '.ps-info{flex:1.5;min-width:0;display:flex;flex-direction:column;justify-content:center;padding:0 4px;color:#ece8dc;font-size:.82rem;line-height:1.15}.ps-info small{color:#a2a9be;font-size:.68rem}' +
      '.ps-card{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);width:min(88%,340px);z-index:3;background:rgba(14,18,34,.96);border:1px solid var(--border,#2B3252);border-radius:18px;padding:1.1rem 1rem;text-align:center;display:flex;flex-direction:column;gap:.55rem;box-shadow:0 10px 40px rgba(0,0,0,.6)}' +
      '.ps-card h3{margin:0;font-family:var(--serif,Georgia,serif);font-weight:normal;font-size:1.45rem;color:var(--gold,#F2C879)}.ps-card p{margin:0;color:var(--ink-muted,#A2A9BE)}.ps-card .st{font-size:1.9rem;color:#F2C879;letter-spacing:.2em}' +
      '.ps-card button{min-height:44px;border-radius:12px;border:1px solid var(--border,#2B3252);background:var(--surface,#171B2E);color:var(--ink,#EDE8DC);font-size:.98rem}.ps-card button.pri{border-color:var(--gold,#F2C879);color:var(--gold,#F2C879)}');
    var sel = K.el('div', 'ps-sel'), gameStop = null, game = null, alive = true;

    function showSelect() {
      if (game) { game.stop(); game = null; }
      host.innerHTML = ''; host.appendChild(sel); sel.innerHTML = ''; api.status('Cleared ' + cleared(diff) + ' of ' + LEVELS.length);
      sel.appendChild(K.el('div', 'ps-sub', 'Choose a place to hold'));
      var grid = K.el('div', 'ps-grid'); sel.appendChild(grid);
      LEVELS.forEach(function (d) {
        var s = stars(diff, d.id), b = K.el('button', 'ps-lv'); b.type = 'button'; b.appendChild(mapThumb(d));
        var t = K.el('div', '', '<b>' + d.id + '. ' + d.name + '</b><span>' + d.N + ' waves' + (d.boss ? ' · a boss' : '') + '</span><i>' + '★★★'.slice(0, s) + '<u style="text-decoration:none;opacity:.3">' + '★★★'.slice(0, 3 - s) + '</u>' + (endBest(diff, d.id) ? ' <small style="letter-spacing:0;color:#a2a9be">∞ ' + endBest(diff, d.id) + '</small>' : '') + '</i>'); b.appendChild(t);
        b.onclick = function () { start(d); }; grid.appendChild(b);
      });
      var rb = K.btn('ps-rand', '🎲  A random place', function () { start(randomPlace()); }); sel.appendChild(rb);
    }
    function randomPlace() {
      var r = rng(Math.floor(Math.random() * 1e9)), keys = Object.keys(THEMES), L = 3 + Math.floor(r() * 6);
      return { id: 'r', name: 'A random place', theme: keys[Math.floor(r() * keys.length)], N: 10 + Math.floor(r() * 5), L: L, boss: L >= 7 ? 1 : 0, av: ALL, path: genPath(r), rnd: true };
    }
    function mapThumb(d) {
      var cv = document.createElement('canvas'), w = 42, h = 60, dp = 2; cv.width = w * dp; cv.height = h * dp; cv.style.width = w + 'px'; cv.style.height = h + 'px';
      var g = cv.getContext('2d'), T = THEMES[d.theme], path = pathOf(d), cw = w / COLS, ch = h / ROWS; g.scale(dp, dp);
      g.fillStyle = 'hsl(' + T.tile[0] + ',' + (T.tile[1] + 4) + '%,' + (T.tile[2] + 5) + '%)'; rr(g, 0, 0, w, h, 6); g.fill();
      g.lineJoin = g.lineCap = 'round'; g.strokeStyle = T.road[2]; g.lineWidth = cw * 0.75; g.beginPath(); path.forEach(function (p, i) { var x = (p[0] + 0.5) * cw, y = (p[1] + 0.5) * ch; if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke();
      var a = path[0], z = path[path.length - 1]; g.fillStyle = 'rgb(' + T.gate + ')'; g.beginPath(); g.arc((a[0] + 0.5) * cw, (a[1] + 0.5) * ch, 3, 0, 7); g.fill(); g.fillStyle = '#f2c879'; g.beginPath(); g.arc((z[0] + 0.5) * cw, (z[1] + 0.5) * ch, 3, 0, 7); g.fill();
      return cv;
    }
    function start(d, snap) {
      if (game) game.stop(); host.innerHTML = ''; game = create(d, snap);
    }

    // ===== one place, being played =====
    function create(def, snap) {
      var TH = THEMES[def.theme], path = pathOf(def), onPath = {}, bar = K.el('div', 'ps-bar'), card = null, i;
      path.forEach(function (p) { onPath[p[0] + ',' + p[1]] = 1; });
      host.appendChild(bar);
      var c = K.canvas(host), W = c.W, HH = c.H - BAR, ctx = c.ctx, cs = Math.min(W / COLS, (HH - HUDH - 6) / ROWS), ox = (W - cs * COLS) / 2, oy = Math.max(3, Math.floor((HH - HUDH - 6 - cs * ROWS) / 2) + 3);
      var hud1 = oy + ROWS * cs + 7, hud2 = hud1 + 25;
      function cx(col) { return ox + col * cs + cs / 2; } function cy(row) { return oy + row * cs + cs / 2; }
      function gpos(d) {
        var n = path.length, k, f, a, b;
        if (d <= 0) { a = path[0]; b = path[1]; return [cx(a[0]) + (b[0] - a[0]) * d * cs, cy(a[1]) + (b[1] - a[1]) * d * cs]; }
        k = Math.min(n - 2, Math.floor(d)); f = Math.min(1, d - k); a = path[k]; b = path[k + 1];
        return [cx(a[0]) + (b[0] - a[0]) * f * cs, cy(a[1]) + (b[1] - a[1]) * f * cs];
      }
      var gateP = gpos(-0.5), keepP = gpos(path.length - 1), FL = Math.max(3, Math.hypot(keepP[0] - gateP[0], keepP[1] - gateP[1]) / cs), plast = path.length - 1;
      var gold, lives, wave, towers, enemies, bullets, rays, arcs, booms, parts, floats, queue, wclock, breakT, phase, pick, selT, fast, flash, clock, msg, msgT, goldT, endless = false, hudBtns = [];
      function fresh() {
        gold = P.gold + (def.L - 1) * 20; lives = P.lives; wave = 0; towers = {}; enemies = []; bullets = []; rays = []; arcs = []; booms = []; parts = []; floats = []; queue = []; wclock = 0; breakT = 9; phase = 'break';
        pick = 'bolt'; selT = null; fast = 1; flash = 0; clock = 0; msg = def.name; msgT = 3; goldT = 0; endless = false; closeCard();
      }
      var maxLives = P.lives;
      if (snap) { var s0 = snap; gold = s0.gold; lives = s0.lives; wave = s0.wave; towers = s0.towers; enemies = s0.enemies; bullets = []; rays = []; arcs = []; booms = []; parts = []; floats = []; queue = s0.queue; wclock = s0.wclock; breakT = s0.breakT; phase = s0.phase; pick = s0.pick; selT = null; fast = s0.fast; flash = 0; clock = s0.clock; msg = ''; msgT = 0; goldT = 0; endless = !!s0.endless; enemies.forEach(locate); }
      else fresh();

      // ---- the ground, painted once ----
      var dpr = Math.min(2, root.devicePixelRatio || 1), bg = document.createElement('canvas'); bg.width = Math.round(W * dpr); bg.height = Math.round(c.H * dpr);
      function tileFill(q, r) { var t = TH.tile, h = hash(q, r); return 'hsl(' + (t[0] + h * t[3]) + ',' + (t[1] + h * 10) + '%,' + (t[2] + h * 6) + '%)'; }
      function decorate(g, x, y, q, r, h) {
        var k, bx, by, e = TH.edge;
        if (TH.deco === 'grass') {
          g.strokeStyle = 'hsl(' + (140 + h * 20) + ',34%,' + (24 + h * 8) + '%)'; g.lineWidth = 1.2; g.lineCap = 'round';
          for (k = 0; k < 6; k++) { bx = x + cs * (0.12 + 0.76 * hash(q + k, r * 3 + 1)); by = y + cs * (0.35 + 0.55 * hash(q * 5 + 2, r + k)); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + (hash(k, q) - 0.5) * 4, by - cs * 0.12 - hash(r, k) * 3); g.stroke(); }
          if (hash(q * 7, r * 3) > 0.78) { g.fillStyle = ['#e9c8f0', '#ffe9a8', '#bfe3ff'][Math.floor(hash(r, q) * 3)]; g.beginPath(); g.arc(x + cs * (0.2 + 0.6 * hash(q, r * 9)), y + cs * (0.3 + 0.5 * hash(q * 4, r)), 1.8, 0, 7); g.fill(); }
          else if (hash(q * 3, r * 7) > 0.88) { g.fillStyle = '#3b4252'; g.beginPath(); g.ellipse(x + cs * 0.72, y + cs * 0.78, cs * 0.09, cs * 0.06, 0, 0, 7); g.fill(); }
        } else if (TH.deco === 'wood') {
          g.fillStyle = 'rgba(120,200,120,.07)'; g.beginPath(); g.ellipse(x + cs * (0.3 + 0.4 * h), y + cs * 0.6, cs * 0.3, cs * 0.14, 0, 0, 7); g.fill();
          g.strokeStyle = 'hsl(140,30%,22%)'; g.lineWidth = 1.2; for (k = 0; k < 3; k++) { bx = x + cs * (0.2 + 0.2 * k + 0.1 * h); by = y + cs * 0.82; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + 4, by - cs * 0.2, bx + 8 - k * 3, by - cs * 0.3); g.stroke(); }
          if (h > 0.84) { bx = x + cs * 0.72; by = y + cs * 0.72; g.fillStyle = '#d9d2c0'; g.fillRect(bx - 1.5, by, 3, cs * 0.12); g.fillStyle = '#c4483f'; g.beginPath(); g.ellipse(bx, by, cs * 0.1, cs * 0.065, 0, Math.PI, 0); g.fill(); g.fillStyle = '#fff'; g.fillRect(bx - 3, by - 3, 2, 2); }
          else if (h < 0.14) { g.fillStyle = '#2a1d12'; g.fillRect(x + cs * 0.2, y + cs * 0.3, cs * 0.07, cs * 0.2); g.fillStyle = '#1d4a2c'; g.beginPath(); g.arc(x + cs * 0.235, y + cs * 0.28, cs * 0.2, 0, 7); g.fill(); g.fillStyle = '#2f6b3f'; g.beginPath(); g.arc(x + cs * 0.19, y + cs * 0.22, cs * 0.11, 0, 7); g.fill(); }
        } else if (TH.deco === 'dune') {
          g.strokeStyle = 'rgba(255,230,180,.13)'; g.lineWidth = 1.2; for (k = 0; k < 3; k++) { g.beginPath(); g.arc(x + cs * (0.25 + 0.2 * k), y + cs * (0.5 + 0.1 * k) + cs * 0.4, cs * 0.45, -2.3, -0.9); g.stroke(); }
          if (h > 0.9) { bx = x + cs * 0.74; by = y + cs * 0.72; g.fillStyle = '#4c7a43'; rr(g, bx - 3, by - cs * 0.28, 6, cs * 0.34, 3); g.fill(); rr(g, bx - 9, by - cs * 0.18, 5, 3, 1.5); g.fill(); rr(g, bx + 4, by - cs * 0.22, 5, 3, 1.5); g.fill(); }
          else if (h > 0.55) { g.fillStyle = 'rgba(60,40,20,.35)'; g.beginPath(); g.ellipse(x + cs * (0.2 + 0.5 * h), y + cs * 0.78, cs * 0.08, cs * 0.05, 0, 0, 7); g.fill(); }
        } else if (TH.deco === 'pine') {
          g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.ellipse(x + cs * (0.3 + 0.4 * h), y + cs * 0.72, cs * 0.34, cs * 0.12, 0, 0, 7); g.fill();
          if (h > 0.82) { bx = x + cs * 0.76; by = y + cs * 0.72; g.fillStyle = '#1d4a40'; for (k = 0; k < 3; k++) { g.beginPath(); g.moveTo(bx, by - cs * (0.46 - k * 0.12)); g.lineTo(bx + cs * (0.1 + k * 0.05), by - cs * (0.16 - k * 0.1)); g.lineTo(bx - cs * (0.1 + k * 0.05), by - cs * (0.16 - k * 0.1)); g.fill(); } g.fillStyle = '#eef6ff'; g.beginPath(); g.moveTo(bx, by - cs * 0.46); g.lineTo(bx + cs * 0.05, by - cs * 0.36); g.lineTo(bx - cs * 0.05, by - cs * 0.36); g.fill(); }
          else if (h < 0.2) { g.strokeStyle = 'rgba(220,240,255,.7)'; g.lineWidth = 1; bx = x + cs * 0.3; by = y + cs * 0.35; g.beginPath(); g.moveTo(bx - 4, by); g.lineTo(bx + 4, by); g.moveTo(bx, by - 4); g.lineTo(bx, by + 4); g.stroke(); }
        } else if (TH.deco === 'lava') {
          if (h > 0.4) { bx = x + cs * (0.15 + 0.3 * h); by = y + cs * 0.2; var pts = [[bx, by], [bx + cs * 0.2, by + cs * 0.2 * h * 2], [bx + cs * 0.1, by + cs * 0.45], [bx + cs * 0.35, by + cs * 0.6]];
            [['rgba(255,100,40,.5)', 3], ['#ffb060', 1]].forEach(function (L) { g.strokeStyle = L[0]; g.lineWidth = L[1]; g.beginPath(); pts.forEach(function (p, j) { if (j) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.stroke(); }); }
          g.fillStyle = 'rgba(255,255,255,.04)'; g.beginPath(); g.ellipse(x + cs * 0.65, y + cs * 0.75, cs * 0.12, cs * 0.06, 0, 0, 7); g.fill();
        } else {
          g.fillStyle = 'rgba(120,220,210,.08)'; g.beginPath(); g.ellipse(x + cs * (0.35 + 0.3 * h), y + cs * 0.55, cs * 0.34, cs * 0.14, 0, 0, 7); g.fill();
          g.strokeStyle = '#2f6b5f'; g.lineWidth = 1.2; for (k = 0; k < 3; k++) { bx = x + cs * (0.66 + 0.07 * k); by = y + cs * 0.86; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + (k - 1) * 3, by - cs * (0.3 + 0.08 * k)); g.stroke(); g.fillStyle = '#6b4a2a'; g.fillRect(bx + (k - 1) * 3 - 1.5, by - cs * (0.3 + 0.08 * k) - 4, 3, 5); }
          if (h > 0.6) { g.fillStyle = '#2f6b4f'; g.beginPath(); g.ellipse(x + cs * 0.28, y + cs * 0.72, cs * 0.14, cs * 0.08, 0, 0.3, 6); g.fill(); if (h > 0.85) { g.fillStyle = '#f0a8c8'; g.beginPath(); g.arc(x + cs * 0.3, y + cs * 0.7, 2.2, 0, 7); g.fill(); } }
        }
      }
      (function paintGround() {
        var g = bg.getContext('2d'), q, r, k, x, y, h, T = TH; g.setTransform(dpr, 0, 0, dpr, 0, 0);
        var sky = g.createLinearGradient(0, 0, 0, c.H); sky.addColorStop(0, T.sky[0]); sky.addColorStop(1, T.sky[1]); g.fillStyle = sky; g.fillRect(0, 0, W, c.H);
        for (r = 0; r < ROWS; r++) for (q = 0; q < COLS; q++) {
          if (onPath[q + ',' + r]) continue; x = ox + q * cs; y = oy + r * cs; h = hash(q, r);
          g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, x + 1, y + 3, cs - 2, cs - 2, cs * 0.16); g.fill();
          g.fillStyle = tileFill(q, r); rr(g, x + 1, y + 1, cs - 2, cs - 3, cs * 0.16); g.fill();
          g.fillStyle = 'rgba(255,255,255,.06)'; rr(g, x + 3, y + 3, cs - 6, cs * 0.3, cs * 0.12); g.fill();
          g.strokeStyle = 'hsla(' + T.edge[0] + ',' + T.edge[1] + '%,' + T.edge[2] + '%,.55)'; g.lineWidth = 1; rr(g, x + 1, y + 1, cs - 2, cs - 3, cs * 0.16); g.stroke();
          decorate(g, x, y, q, r, h);
        }
        g.lineCap = g.lineJoin = 'round';
        if (T.roadGlow) { g.strokeStyle = T.roadGlow; g.lineWidth = cs * 1.35; g.beginPath(); path.forEach(function (pp, ix) { if (ix) g.lineTo(cx(pp[0]), cy(pp[1])); else g.moveTo(cx(pp[0]), cy(pp[1])); }); g.stroke(); }
        [[cs * 0.98, T.road[0]], [cs * 0.86, T.road[1]], [cs * 0.72, T.road[2]]].forEach(function (L) { g.strokeStyle = L[1]; g.lineWidth = L[0]; g.beginPath(); path.forEach(function (pp, ix) { if (ix) g.lineTo(cx(pp[0]), cy(pp[1])); else g.moveTo(cx(pp[0]), cy(pp[1])); }); g.stroke(); });
        path.forEach(function (pp, ix) { for (k = 0; k < 5; k++) { var px = cx(pp[0]) + (hash(ix, k) - 0.5) * cs * 0.6, py = cy(pp[1]) + (hash(k, ix + 3) - 0.5) * cs * 0.6; g.fillStyle = hash(ix + k, 5) > 0.5 ? 'rgba(255,245,215,.13)' : 'rgba(30,20,8,.2)'; g.beginPath(); g.ellipse(px, py, cs * 0.07, cs * 0.05, hash(k, ix), 0, 7); g.fill(); } });
        // the gate the foes come out of
        var a = path[0], b = path[1], dx = b[0] - a[0], dy = b[1] - a[1], ga = Math.atan2(dy, dx), gx = gateP[0], gy = gateP[1];
        g.save(); g.translate(gx, gy); g.rotate(ga);
        glow(g, 0, 0, cs * 0.9, T.gate, 0.4); g.fillStyle = '#06080e'; g.beginPath(); g.ellipse(0, 0, cs * 0.2, cs * 0.46, 0, 0, 7); g.fill(); g.strokeStyle = '#3a3f55'; g.lineWidth = 4; g.stroke();
        g.fillStyle = '#4a5068'; rr(g, -cs * 0.12, -cs * 0.56, cs * 0.24, cs * 0.14, 3); g.fill(); rr(g, -cs * 0.12, cs * 0.42, cs * 0.24, cs * 0.14, 3); g.fill(); g.restore();
        // the keep at the end of the road
        var ex = keepP[0], ey = keepP[1]; g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(ex, ey + cs * 0.3, cs * 0.5, cs * 0.15, 0, 0, 7); g.fill();
        g.fillStyle = '#565d76'; g.fillRect(ex - cs * 0.36, ey - cs * 0.22, cs * 0.72, cs * 0.5); g.fillStyle = '#7079a0'; g.fillRect(ex - cs * 0.36, ey - cs * 0.22, cs * 0.72, cs * 0.1);
        [-1, 1].forEach(function (sd) { g.fillStyle = '#4a5068'; g.fillRect(ex + sd * cs * 0.3 - cs * 0.09, ey - cs * 0.42, cs * 0.18, cs * 0.7); g.fillStyle = '#9a4b5e'; g.beginPath(); g.moveTo(ex + sd * cs * 0.3 - cs * 0.13, ey - cs * 0.42); g.lineTo(ex + sd * cs * 0.3, ey - cs * 0.62); g.lineTo(ex + sd * cs * 0.3 + cs * 0.13, ey - cs * 0.42); g.fill(); });
        g.fillStyle = '#5a6078'; for (k = 0; k < 3; k++) g.fillRect(ex - cs * 0.2 + k * cs * 0.16, ey - cs * 0.3, cs * 0.1, cs * 0.1);
        g.fillStyle = '#1b1f30'; g.beginPath(); g.arc(ex, ey + cs * 0.28, cs * 0.14, Math.PI, 0); g.fill(); glow(g, ex, ey + cs * 0.22, cs * 0.3, '255,200,110', 0.4);
        g.strokeStyle = '#d8d0b8'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ex, ey - cs * 0.3); g.lineTo(ex, ey - cs * 0.7); g.stroke(); g.fillStyle = '#f2c879'; g.beginPath(); g.moveTo(ex, ey - cs * 0.7); g.lineTo(ex + cs * 0.22, ey - cs * 0.62); g.lineTo(ex, ey - cs * 0.54); g.fill();
        var vg = g.createRadialGradient(W / 2, c.H / 2, Math.min(W, c.H) * 0.35, W / 2, c.H / 2, Math.max(W, c.H) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(2,4,12,.55)'); g.fillStyle = vg; g.fillRect(0, 0, W, c.H);
      })();
      var amb = []; for (i = 0; i < 22; i++) amb.push({ x: Math.random() * W, y: Math.random() * HH, a: Math.random() * 7, s: 0.3 + Math.random() * 0.6 });

      // ---- foes ----
      function locate(e) {
        if (e.fly) { var f = Math.min(1, e.d / FL); e.x = gateP[0] + (keepP[0] - gateP[0]) * f; e.y = gateP[1] + (keepP[1] - gateP[1]) * f; e.fx = keepP[0] >= gateP[0] ? 1 : -1; e.prog = e.d / FL * plast; }
        else { var p = gpos(e.d), q = gpos(e.d + 0.25); e.x = p[0]; e.y = p[1]; if (q[0] > p[0] + 0.01) e.fx = 1; else if (q[0] < p[0] - 0.01) e.fx = -1; e.prog = e.d; }
      }
      function spawn(type) {
        var T = EN[type], hpw = (8 + 3.2 * wave) * (1 + 0.1 * (def.L - 1)) * P.hp, hp = type === 'boss' ? hpw * (def.boss === 2 ? 20 : 11) : hpw * T.hp;
        var e = { type: type, d: T.fly ? 0 : -0.9, hp: hp, max: hp, spd: T.spd * (0.9 + Math.min(0.5, wave * 0.025 + def.L * 0.02)), slow: 0, hit: 0, ph: Math.random() * 6, pT: 0, pD: 0, armor: T.armor || 0, fly: !!T.fly, leak: T.leak || 1, rew: Math.round(T.rew * (1 + 0.04 * wave + 0.03 * def.L)), x: 0, y: 0, fx: 1, prog: 0 };
        locate(e); enemies.push(e);
      }
      function hurt(e, amt, pierce) {
        var a = pierce ? amt : Math.max(amt * 0.35, amt - e.armor); if (e.armor && !pierce && amt - e.armor < amt * 0.6) e.armorFlash = 0.12; e.hp -= a; e.hit = 0.1;
      }
      function spark(x, y, col, n) { for (var q = 0; q < n; q++) { var an = Math.random() * 6.3, sp = 30 + Math.random() * 70; parts.push({ x: x, y: y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 20, t: 0.45 + Math.random() * 0.3, m: 0.75, col: col, r: 1.5 + Math.random() * 2 }); } }

      // ---- towers ----
      function rangePx(t) { return TW[t.kind].range * cs * (1 + (t.lvl - 1) * 0.08); }
      function upCost(t) { return Math.round(TW[t.kind].cost * 0.7 * t.lvl); }
      function sellVal(t) { return Math.round(t.spent * 0.6); }
      function rebuff() {
        var keys = Object.keys(towers);
        keys.forEach(function (k) { towers[k].buff = 1; });
        keys.forEach(function (k) { var u = towers[k]; if (u.kind !== 'lantern') return; keys.forEach(function (k2) { var t = towers[k2]; if (t !== u && t.kind !== 'lantern' && Math.abs(t.col - u.col) <= 1 && Math.abs(t.row - u.row) <= 1) t.buff += 0.2 + 0.12 * (u.lvl - 1); }); });
      }
      function place(kind, col, row) {
        var k = TW[kind], key = col + ',' + row;
        if (onPath[key] || towers[key] || col < 0 || row < 0 || col >= COLS || row >= ROWS) return false;
        if (gold < k.cost) { msg = 'Not yet — gold comes with time'; msgT = 1.2; return false; }
        gold -= k.cost; towers[key] = { col: col, row: row, kind: kind, lvl: 1, cd: 0.2, spent: k.cost, ang: 1.57, fl: 0, born: clock, buff: 1 }; rebuff(); spark(cx(col), cy(row), k.col, 8); return true;
      }
      function chainHit(first, t, dmg) {
        var hit = [first], cur = first, n = (TW.storm.chain || 3) + (t.lvl >= 3 ? 1 : 0), pts = [[cx(t.col), cy(t.row) - cs * 0.48], [first.x, first.y]];
        hurt(first, dmg);
        while (hit.length < n) {
          var nx = null, nd = cs * 1.4;
          enemies.forEach(function (e) { if (e.hp > 0 && hit.indexOf(e) < 0) { var d = Math.hypot(e.x - cur.x, e.y - cur.y); if (d < nd) { nd = d; nx = e; } } });
          if (!nx) break; hurt(nx, dmg * Math.pow(0.75, hit.length)); hit.push(nx); pts.push([nx.x, nx.y]); cur = nx;
        }
        arcs.push({ pts: pts, t: 0.18 }); hit.forEach(function (e) { spark(e.x, e.y, '#bcd0ff', 3); });
      }
      function fire(t) {
        var k = TW[t.kind], tx = cx(t.col), ty = cy(t.row) - cs * 0.14, rg = rangePx(t), best = null, bs = -1e9, dmg = (k.dmg + (t.lvl - 1) * k.up) * t.buff;
        for (var j = 0; j < enemies.length; j++) {
          var e = enemies[j]; if (e.hp <= 0 || Math.hypot(e.x - tx, e.y - ty) > rg) continue;
          var sc = t.kind === 'lancer' ? e.hp : t.kind === 'thorn' && e.pT > 0.5 ? e.prog - 1000 : e.prog; if (sc > bs) { bs = sc; best = e; }
        }
        if (!best) return false;
        t.ang = Math.atan2(best.y - ty, best.x - tx); t.fl = 0.14; t.cd = k.rate;
        if (t.kind === 'lancer') { hurt(best, dmg); rays.push({ x0: tx + Math.cos(t.ang) * cs * 0.5, y0: ty - cs * 0.22 + Math.sin(t.ang) * cs * 0.5, x1: best.x, y1: best.y, t: 0.15 }); spark(best.x, best.y, '#ffffff', 5); }
        else if (t.kind === 'storm') chainHit(best, t, dmg);
        else bullets.push({ x: tx, y: ty - cs * 0.14, px: tx, py: ty, e: best, kind: t.kind, dmg: dmg, lvl: t.lvl, sp: { bolt: 380, dart: 540, frost: 330, thorn: 300, burst: 270 }[t.kind] });
        return true;
      }
      function landed(b) {
        var e = b.e, k = TW[b.kind];
        if (b.kind === 'burst') { enemies.forEach(function (o) { if (o.hp > 0 && Math.hypot(o.x - e.x, o.y - e.y) < k.splash * cs) hurt(o, b.dmg); }); booms.push({ x: e.x, y: e.y, t: 0.35 }); spark(e.x, e.y, '#ffb3a0', 10); return; }
        hurt(e, b.dmg, b.kind === 'thorn');
        if (b.kind === 'frost') e.slow = 1.5 + b.lvl * 0.3;
        if (b.kind === 'thorn') { e.pT = 3; e.pD = Math.max(e.pD, 2 + e.max * (0.015 + 0.008 * (b.lvl - 1))); }
        spark(e.x, e.y, k.col, 4);
      }

      // ---- the run of a place ----
      function startWave() {
        wave++; queue = plan(def, wave, rng(def.id === 'r' ? wave * 7 + 3 : def.id * 100 + wave)); wclock = 0; phase = 'wave';
        if (endless) { var big = wave > def.N && (wave - def.N) % 5 === 0; if (big) queue.unshift({ t: 'boss', at: 0 }); msg = big ? 'Endless · wave ' + wave + ' — a boss' : 'Endless · wave ' + wave; }
        else msg = wave === def.N ? 'The last wave' : 'Wave ' + wave + ' of ' + def.N; msgT = 1.8;
      }
      function finish(won) {
        phase = won ? 'won' : 'lost'; var st = 0;
        if (won) { st = lives >= maxLives ? 3 : lives >= maxLives * 0.6 ? 2 : 1; if (def.id !== 'r') { var n = setStars(diff, def.id, st); api.setBest(n); } }
        showCard(won, st);
      }
      function tick(dt) {
        clock += dt; if (phase === 'won' || phase === 'lost') { fx(dt); return; }
        goldT += dt; if (goldT > 2.5) { goldT = 0; gold += P.inc; }
        if (phase === 'break') { breakT -= dt; if (breakT <= 0) startWave(); }
        else {
          wclock += dt; while (queue.length && queue[0].at <= wclock) spawn(queue.shift().t);
          if (!queue.length && !enemies.length) {
            var bonus = 10 + wave * 2 + Math.round(P.inc * 2); gold += bonus; floats.push({ x: W / 2, y: oy + ROWS * cs * 0.4, t: 1.4, txt: 'Wave clear +' + bonus, big: 1 });
            if (endless) { var nb = setEndBest(diff, def.id, wave); if (nb && wave > def.N && (wave - def.N) % 5 === 0) floats.push({ x: W / 2, y: oy + ROWS * cs * 0.55, t: 1.6, txt: 'Your furthest yet', big: 1 }); }
            else if (wave >= def.N) { finish(true); return; }
            phase = 'break'; breakT = 7;
          }
        }
        enemies.forEach(function (e) {
          e.slow = Math.max(0, e.slow - dt); e.hit = Math.max(0, e.hit - dt); if (e.armorFlash) e.armorFlash = Math.max(0, e.armorFlash - dt);
          if (e.pT > 0) { e.pT -= dt; e.hp -= e.pD * dt; if (e.pT <= 0) e.pD = 0; }
          e.d += dt * e.spd * (e.slow > 0 ? 0.45 : 1); locate(e);
        });
        enemies = enemies.filter(function (e) {
          if ((e.fly && e.d >= FL) || (!e.fly && e.d >= plast)) { lives -= e.leak; flash = 0.45; spark(e.x, e.y, '#ff7a7a', 8); e.dead = true; return false; }
          if (e.hp <= 0) { gold += e.rew; spark(e.x, e.y, e.type === 'boss' ? '#d9a0ff' : '#e9788a', e.type === 'boss' ? 30 : 12); floats.push({ x: e.x, y: e.y - cs * 0.2, t: 0.9, txt: '+' + e.rew }); e.dead = true; return false; }
          return true;
        });
        if (lives <= 0) { lives = 0; finish(false); return; }
        Object.keys(towers).forEach(function (key) {
          var t = towers[key]; t.fl = Math.max(0, t.fl - dt); if (t.kind === 'lantern') return; t.cd -= dt * (1 + (t.buff - 1) * 0.5); if (t.cd > 0) return; fire(t);
        });
        bullets.forEach(function (b) {
          if (b.e.dead) { b.dead = true; return; }
          var dx = b.e.x - b.x, dy = b.e.y - b.y, d = Math.hypot(dx, dy); b.px = b.x; b.py = b.y;
          if (d < 9) { b.dead = true; landed(b); } else { b.x += dx / d * b.sp * dt; b.y += dy / d * b.sp * dt; }
        });
        bullets = bullets.filter(function (b) { return !b.dead; }); fx(dt);
      }
      function fx(dt) {
        rays.forEach(function (r) { r.t -= dt; }); rays = rays.filter(function (r) { return r.t > 0; }); arcs.forEach(function (r) { r.t -= dt; }); arcs = arcs.filter(function (r) { return r.t > 0; });
        booms.forEach(function (m) { m.t -= dt; }); booms = booms.filter(function (m) { return m.t > 0; });
        parts.forEach(function (q) { q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 90 * dt; }); parts = parts.filter(function (q) { return q.t > 0; });
        floats.forEach(function (f) { f.t -= dt; f.y -= 26 * dt; }); floats = floats.filter(function (f) { return f.t > 0; });
        flash = Math.max(0, flash - dt); msgT = Math.max(0, msgT - dt);
      }

      // ---- the bar of towers (or, for a tower you tapped, its upgrade and sell buttons) ----
      var afford = '';
      function paintBar() {
        bar.innerHTML = ''; var t = selT && towers[selT];
        if (t) {
          var k = TW[t.kind]; bar.appendChild(K.el('div', 'ps-info', '<b>' + k.name + ' · level ' + t.lvl + '</b><small>' + k.info + '</small>'));
          var up = K.btn('ps-b', t.lvl >= 3 ? 'Maxed' : 'Upgrade ' + upCost(t), function () {
            if (t.lvl >= 3) return; if (gold >= upCost(t)) { gold -= upCost(t); t.spent += upCost(t); t.lvl++; rebuff(); msg = 'Stronger'; msgT = 0.8; spark(cx(t.col), cy(t.row), k.col, 10); paintBar(); } else { msg = 'Not enough yet'; msgT = 1; }
          }); up.disabled = t.lvl >= 3; bar.appendChild(up);
          bar.appendChild(K.btn('ps-b', 'Sell +' + sellVal(t), function () { gold += sellVal(t); delete towers[selT]; selT = null; rebuff(); paintBar(); }));
          bar.appendChild(K.btn('ps-b', 'Done', function () { selT = null; paintBar(); }));
        } else {
          ORDER.forEach(function (kd) {
            var b = K.el('button', 'ps-tb' + (pick === kd ? ' on' : '')); b.type = 'button'; b.dataset.k = kd; b.innerHTML = '<img alt="" src="' + thumb(kd) + '"><span>' + TW[kd].cost + '</span>';
            b.onclick = function () { pick = kd; msg = TW[kd].name + ' — ' + TW[kd].info; msgT = 2.4; paintBar(); }; bar.appendChild(b);
          });
        }
        afford = ''; updAfford();
      }
      function updAfford() {
        var key = Math.floor(gold) + '|' + (selT || ''), t = selT && towers[selT]; if (key === afford) return; afford = key;
        if (t) { var u = bar.querySelector('.ps-b'); if (u && !u.disabled) u.classList.toggle('no', gold < upCost(t)); }
        else Array.prototype.forEach.call(bar.querySelectorAll('.ps-tb'), function (b) { b.classList.toggle('no', gold < TW[b.dataset.k].cost); });
      }

      // ---- the win / lose card ----
      function closeCard() { if (card && card.parentNode) card.parentNode.removeChild(card); card = null; }
      function goEndless(again) {
        if (again) fresh(); closeCard(); endless = true; phase = 'break'; breakT = again ? 9 : 10; if (!again) gold += 60; selT = null;
        msg = 'Endless — until your lives run out'; msgT = 3; paintBar();
      }
      function showCard(won, st) {
        closeCard(); var next = LEVELS[def.id] && def.id !== 'r' ? LEVELS[def.id] : null, bt = [];
        if (won) {
          if (next) bt.push({ label: 'Next: ' + next.name, pri: true, fn: function () { start(next); } });
          if (def.id === 'r') bt.push({ label: 'Another random place', pri: true, fn: function () { start(randomPlace()); } });
          bt.push({ label: '∞  Endless — until your lives run out', pri: !next && def.id !== 'r', fn: function () { goEndless(false); } });
          bt.push({ label: 'Play it again', fn: function () { fresh(); paintBar(); } });
          bt.push({ label: 'All places', fn: showSelect });
          card = api.win({ title: 'The pass holds', stars: st, sub: def.name + ' — all ' + def.N + ' waves, ' + lives + ' of ' + maxLives + ' lives left.', buttons: bt, noAgain: true, noLevel: true, cheer: 'pass', arg: { x: keepP[0], y: keepP[1] }, delay: 1.4 });
          return;
        }
        var held = Math.max(0, wave - 1), eb = endBest(diff, def.id);
        card = K.el('div', 'ps-card');
        if (endless) card.innerHTML = '<h3>The pass fell</h3><p>You held through ' + held + ' waves' + (eb && eb >= held ? (eb === held ? ' — your furthest yet.' : ' (your furthest: ' + eb + ').') : '.') + '</p>';
        else card.innerHTML = '<h3>The pass fell</h3><p>On wave ' + wave + ' of ' + def.N + '. Try again — you keep what you learned.</p>';
        if (endless) card.appendChild(K.btn('pri', '∞  Endless again', function () { goEndless(true); }));
        card.appendChild(K.btn(endless ? '' : 'pri', endless ? 'Play it again' : 'Try again', function () { fresh(); paintBar(); }));
        card.appendChild(K.btn('', 'All places', showSelect)); host.appendChild(card);
      }

      // ---- input ----
      c.cv.addEventListener('pointerdown', function (e) {
        var r = c.cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, j;
        for (j = 0; j < hudBtns.length; j++) { var hb = hudBtns[j]; if (px >= hb.x && px <= hb.x + hb.w && py >= hb.y - 4 && py <= hb.y + hb.h + 4) { hb.fn(); return; } }
        if (phase === 'won' || phase === 'lost') return;
        var col = Math.floor((px - ox) / cs), row = Math.floor((py - oy) / cs), key = col + ',' + row;
        if (col < 0 || row < 0 || col >= COLS || row >= ROWS || onPath[key]) { selT = null; paintBar(); return; }
        if (towers[key]) { selT = key; paintBar(); return; }
        var had = selT; selT = null; place(pick, col, row); if (had) paintBar(); else updAfford();
      });
      function callNext() { if (phase === 'break') { gold += Math.max(0, Math.ceil(breakT) * 2); breakT = 0; } }

      // ---- drawing ----
      function pill(x, y, w, h, on) { ctx.fillStyle = on ? 'rgba(60,52,24,.9)' : 'rgba(10,13,24,.84)'; rr(ctx, x, y, w, h, h / 2); ctx.fill(); ctx.strokeStyle = on ? 'rgba(242,200,121,.7)' : 'rgba(255,255,255,.1)'; ctx.lineWidth = 1; ctx.stroke(); }
      function heartAt(x, y, s, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y + s * 0.9); ctx.bezierCurveTo(x - s * 1.5, y - s * 0.2, x - s * 0.6, y - s * 1.1, x, y - s * 0.3); ctx.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.5, y - s * 0.2, x, y + s * 0.9); ctx.fill(); }
      function drawAmb() {
        var k = TH.amb;
        amb.forEach(function (f) {
          var x, y;
          if (k === 'fly') { x = (f.x + Math.sin(clock * f.s + f.a) * 18 + W) % W; y = (f.y + Math.cos(clock * f.s * 0.8 + f.a) * 14 + HH) % HH; ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, y, 6, '255,240,170', 0.35 + 0.3 * Math.sin(clock * 2 + f.a)); ctx.globalCompositeOperation = 'source-over'; }
          else if (k === 'leaf') { x = (f.x + Math.sin(clock * f.s + f.a) * 30 + clock * 8 * f.s + W) % W; y = (f.y + clock * 14 * f.s) % HH; ctx.fillStyle = 'rgba(150,200,110,.5)'; ctx.beginPath(); ctx.ellipse(x, y, 3.2, 1.6, clock * f.s + f.a, 0, 7); ctx.fill(); }
          else if (k === 'dust') { x = (f.x + clock * 40 * f.s) % W; y = f.y + Math.sin(clock * 0.6 + f.a) * 10; ctx.fillStyle = 'rgba(255,225,170,.12)'; ctx.beginPath(); ctx.ellipse(x, y, 14, 1.6, 0, 0, 7); ctx.fill(); }
          else if (k === 'snow') { x = f.x + Math.sin(clock * f.s + f.a) * 10; y = (f.y + clock * (18 + 20 * f.s)) % HH; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(x, y, 1.2 + f.s * 1.2, 0, 7); ctx.fill(); }
          else { x = f.x + Math.sin(clock * f.s + f.a) * 12; y = HH - ((clock * (22 + 30 * f.s) + f.a * 40) % HH); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, y, 5, '255,140,60', 0.55); ctx.globalCompositeOperation = 'source-over'; }
        });
      }
      function draw() {
        ctx.drawImage(bg, 0, 0, W, c.H);
        var st = selT && towers[selT], tk;
        if (def.av.indexOf('wisp') >= 0) { ctx.strokeStyle = 'rgba(160,240,230,.16)'; ctx.lineWidth = 2; ctx.setLineDash([3, 8]); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(gateP[0], gateP[1]); ctx.lineTo(keepP[0], keepP[1]); ctx.stroke(); ctx.setLineDash([]); }
        Object.keys(towers).forEach(function (k) { var t = towers[k]; if (t.kind === 'lantern') { ctx.globalCompositeOperation = 'lighter'; glow(ctx, cx(t.col), cy(t.row), cs * 1.45, '255,190,100', 0.1 + 0.03 * t.lvl); ctx.globalCompositeOperation = 'source-over'; } });
        function ring(t, al) { var rg = TW[t.kind].sup ? cs * 1.5 : rangePx(t); ctx.fillStyle = 'rgba(242,200,121,' + al * 0.12 + ')'; ctx.beginPath(); ctx.arc(cx(t.col), cy(t.row), rg, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(242,200,121,' + al * 0.7 + ')'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]); }
        if (st) ring(st, 1);
        for (tk in towers) { var tw = towers[tk]; if (tw !== st && clock - tw.born < 1.4) ring(tw, Math.min(1, (1.4 - (clock - tw.born)) / 0.8)); }
        var items = [];
        Object.keys(towers).forEach(function (key) { var t = towers[key]; items.push({ y: cy(t.row), f: function () {
          var s = cs, pop = Math.min(1, (clock - t.born) * 5), sc = 0.6 + 0.4 * pop, x = cx(t.col), y = cy(t.row);
          ctx.save(); ctx.translate(x, y + s * 0.12); ctx.scale(sc, sc); ctx.translate(-x, -(y + s * 0.12));
          drawTowerOn(ctx, t.kind, x, y, s, { ang: t.ang, fl: t.fl, lvl: t.lvl, clock: clock + t.col * 0.7 }); ctx.restore();
          if (t.fl > 0 && !TW[t.kind].sup) { ctx.globalCompositeOperation = 'lighter'; glow(ctx, x + Math.cos(t.ang) * s * 0.4, y - s * 0.2 + Math.sin(t.ang) * s * 0.4, s * 0.4, TW[t.kind].rgb, 0.7); ctx.globalCompositeOperation = 'source-over'; }
          if (t.lvl >= 2) { ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, y - s * 0.12, s * (0.3 + t.lvl * 0.1), TW[t.kind].rgb, 0.1 + t.lvl * 0.04); ctx.globalCompositeOperation = 'source-over'; }
          if (t.buff > 1 && !TW[t.kind].sup) { ctx.fillStyle = 'rgba(255,210,120,.9)'; ctx.font = 'bold ' + Math.round(s * 0.24) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('▲', x + s * 0.34, y - s * 0.34); }
          if (selT === t.col + ',' + t.row) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; rr(ctx, x - s * 0.46, y - s * 0.66, s * 0.92, s * 1.1, s * 0.14); ctx.stroke(); }
        } }); });
        enemies.forEach(function (e) { items.push({ y: e.y + (e.fly ? cs : 0), f: function () { drawFoe(ctx, e, cs, clock); } }); });
        items.sort(function (a, b) { return a.y - b.y; }).forEach(function (it) { it.f(); });
        enemies.forEach(function (e) { if (e.hp < e.max && e.hy != null) { var r = cs * EN[e.type].r, w = r * 2.2, yy = e.hy - r * 1.55 - (e.type === 'boss' ? r * 0.7 : 0); ctx.fillStyle = 'rgba(0,0,0,.55)'; rr(ctx, e.x - w / 2, yy, w, 4, 2); ctx.fill(); ctx.fillStyle = e.hp / e.max > 0.4 ? '#9be8b5' : '#f2c879'; rr(ctx, e.x - w / 2, yy, Math.max(2, w * Math.max(0, e.hp) / e.max), 4, 2); ctx.fill(); } });
        bullets.forEach(function (b) {
          var col = TW[b.kind].col, rgb = TW[b.kind].rgb; ctx.lineCap = 'round'; ctx.strokeStyle = col; ctx.globalAlpha = 0.5; ctx.lineWidth = b.kind === 'burst' ? 5 : b.kind === 'dart' ? 2 : 3; ctx.beginPath(); ctx.moveTo(b.px - (b.x - b.px) * 2, b.py - (b.y - b.py) * 2); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'lighter'; glow(ctx, b.x, b.y, b.kind === 'burst' ? 11 : 8, rgb, 0.95); ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.kind === 'burst' ? 3.5 : b.kind === 'dart' ? 1.6 : 2.2, 0, 7); ctx.fill();
        });
        rays.forEach(function (r) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(230,240,255,' + Math.min(1, r.t * 7) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(r.x0, r.y0); ctx.lineTo(r.x1, r.y1); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,' + Math.min(1, r.t * 7) + ')'; ctx.lineWidth = 1; ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; });
        arcs.forEach(function (a) {
          ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; [['rgba(130,160,255,.6)', 4], ['rgba(235,240,255,.95)', 1.4]].forEach(function (L) { ctx.strokeStyle = L[0]; ctx.lineWidth = L[1]; ctx.beginPath(); a.pts.forEach(function (p, j) { var jx = j && j < a.pts.length ? (Math.random() - 0.5) * 6 : 0, jy = j ? (Math.random() - 0.5) * 6 : 0; if (j) ctx.lineTo(p[0] + jx, p[1] + jy); else ctx.moveTo(p[0], p[1]); }); ctx.stroke(); }); ctx.globalCompositeOperation = 'source-over';
        });
        booms.forEach(function (m) { var f = 1 - m.t / 0.35, R = TW.burst.splash * cs * (0.3 + f * 0.8); ctx.globalCompositeOperation = 'lighter'; glow(ctx, m.x, m.y, R, '255,140,120', 0.55 * (1 - f)); ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = 'rgba(255,200,180,' + (1 - f) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(m.x, m.y, R, 0, 7); ctx.stroke(); });
        parts.forEach(function (q) { ctx.globalAlpha = Math.min(1, q.t / q.m * 1.5); ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 7); ctx.fill(); }); ctx.globalAlpha = 1;
        drawAmb();
        ctx.textAlign = 'center'; floats.forEach(function (f) { ctx.font = (f.big ? '600 ' + Math.round(cs * 0.4) : 'bold ' + Math.round(cs * 0.3)) + 'px -apple-system,sans-serif'; ctx.fillStyle = 'rgba(255,226,140,' + Math.min(1, f.t * 1.6) + ')'; ctx.fillText(f.txt, f.x, f.y); });
        if (flash > 0) { var fg = ctx.createRadialGradient(W / 2, HH / 2, HH * 0.2, W / 2, HH / 2, HH * 0.8); fg.addColorStop(0, 'rgba(255,60,60,0)'); fg.addColorStop(1, 'rgba(255,60,60,' + flash * 0.7 + ')'); ctx.fillStyle = fg; ctx.fillRect(0, 0, W, HH); }
        // HUD: row one is what you have, row two is what you can do
        hudBtns = []; ctx.font = '600 12.5px -apple-system,sans-serif';
        pill(8, hud1, 78, 22); ctx.fillStyle = '#f2c879'; ctx.beginPath(); ctx.arc(24, hud1 + 11, 6, 0, 7); ctx.fill(); ctx.fillStyle = '#b8903f'; ctx.beginPath(); ctx.arc(24, hud1 + 11, 3, 0, 7); ctx.fill();
        ctx.fillStyle = '#ece8dc'; ctx.textAlign = 'left'; ctx.fillText(Math.floor(gold), 37, hud1 + 15.5);
        var left = enemies.length + queue.length, wl = phase === 'break' ? (wave ? 'Next wave in ' + Math.ceil(breakT) + 's' : 'First wave in ' + Math.ceil(breakT) + 's') : (endless ? '∞ Wave ' + wave : 'Wave ' + wave + '/' + def.N) + (left ? ' · ' + left + ' left' : ''), ww = Math.max(120, wl.length * 7 + 22);
        if (phase === 'won' || phase === 'lost') wl = def.name;
        pill(W / 2 - ww / 2, hud1, ww, 22); ctx.fillStyle = '#c5cad8'; ctx.textAlign = 'center'; ctx.fillText(wl, W / 2, hud1 + 15.5);
        pill(W - 78, hud1, 70, 22); heartAt(W - 62, hud1 + 10, 5.2, lives <= 3 ? '#ff6b6b' : '#e5383b'); ctx.fillStyle = '#ece8dc'; ctx.textAlign = 'left'; ctx.fillText(lives, W - 50, hud1 + 15.5);
        function btn(x, w, label, on, fn) { pill(x, hud2, w, 22, on); ctx.fillStyle = on ? '#f2c879' : '#c5cad8'; ctx.textAlign = 'center'; ctx.fillText(label, x + w / 2, hud2 + 15.5); hudBtns.push({ x: x, y: hud2, w: w, h: 22, fn: fn }); }
        btn(8, 86, '‹ All places', false, showSelect);
        btn(W / 2 - 34, 68, fast > 1 ? '×2 speed' : '×1 speed', fast > 1, function () { fast = fast > 1 ? 1 : 2; });
        if (phase === 'break') btn(W - 118, 110, 'Call next wave', false, callNext);
        if (msgT > 0) { ctx.textAlign = 'center'; ctx.font = '20px Georgia,serif'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(5,8,16,' + Math.min(0.8, msgT) + ')'; ctx.strokeText(msg, W / 2, oy + ROWS * cs * 0.47); ctx.fillStyle = 'rgba(245,238,220,' + Math.min(1, msgT) + ')'; ctx.fillText(msg, W / 2, oy + ROWS * cs * 0.47); }
      }

      var stopLoop = K.loop(function (dt) { if (!card) { for (var s = 0; s < fast; s++) tick(dt); } else fx(dt); updAfford(); draw(); });
      paintBar(); if (phase === 'won' || phase === 'lost') showCard(phase === 'won', 3);
      api.status(def.name);
      return {
        stop: function () {
          stopLoop();
          if (phase !== 'won' && phase !== 'lost') KEEP = { t: Date.now(), diff: diff, def: def, st: { gold: gold, lives: lives, wave: wave, towers: towers, enemies: enemies, queue: queue, wclock: wclock, breakT: breakT, phase: phase, pick: pick, fast: fast, clock: clock, endless: endless } }; else KEEP = null;
        },
        restart: function () { fresh(); paintBar(); },
        peek: function () { return { def: def.name, id: def.id, wave: wave, N: def.N, gold: gold, lives: lives, phase: phase, towers: Object.keys(towers).length, enemies: enemies.length, queue: queue.length, cs: cs, path: path,
          place: function (k, col, row) { return place(k, col, row); }, plots: function () { var o = []; for (var r = 0; r < ROWS; r++) for (var q = 0; q < COLS; q++) if (!onPath[q + ',' + r] && !towers[q + ',' + r]) o.push([q, r]); return o; },
          upgrade: function (col, row) { var t = towers[col + ',' + row]; if (t && t.lvl < 3 && gold >= upCost(t)) { gold -= upCost(t); t.spent += upCost(t); t.lvl++; rebuff(); return true; } return false; },
          call: function () { callNext(); }, step: function (n, dt) { for (var q = 0; q < n && phase !== 'won' && phase !== 'lost'; q++) tick(dt || 0.05); return phase; }, speed: function (n) { fast = n; }, addGold: function (n) { gold += n; }, towerList: function () { return Object.keys(towers).map(function (k) { return towers[k].kind + '@' + k + ' L' + towers[k].lvl + ' x' + towers[k].buff.toFixed(2); }); } }; }
      };
    }

    // enter: a game kept from a moment ago (the screen was re-fitted) carries on; otherwise choose a place
    if (KEEP && KEEP.diff === diff && Date.now() - KEEP.t < 4000) { var kp = KEEP; KEEP = null; host.innerHTML = ''; game = create(kp.def, kp.st); }
    else { KEEP = null; showSelect(); }
    return {
      stop: function () { if (game) { game.stop(); game = null; } },
      restart: function () { if (game) game.restart(); else showSelect(); },
      peek: function () { return game ? game.peek() : { select: true }; }
    };
  }

  root.MannaPass = { make: make, LEVELS: LEVELS, THEMES: THEMES, TW: TW, expand: expand, clean: clean, genPath: genPath, rng: rng, plan: plan, cleared: cleared, drawTowerOn: drawTowerOn, drawFoe: drawFoe, EN: EN };
})(typeof window !== 'undefined' ? window : globalThis);
