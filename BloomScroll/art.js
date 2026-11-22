/* Manna — generated art. Layered-landscape SVGs seeded from a string, so a given verse always gets the same picture.
   No images, no licences, works offline. If art/manifest.json lists pictures (for example ones made in Grok), the app may use them instead. */
(function (root) {
  'use strict';

  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rngFrom(seed) {
    var a = hash(String(seed)) || 1;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  // sky = top, mid, horizon; layers = back-to-front mountain colours; sun = disc colour; stars = bool; water = bool
  var PALETTES = {
    dawn:   { sky: ['#2a2a5c', '#c26a7a', '#f6c27a'], layers: ['#7a5a86', '#5a4570', '#3a2f55', '#231d3d'], sun: '#fff1c8', glow: '#ffd58a', stars: false },
    dusk:   { sky: ['#16163a', '#7b3a6a', '#f08a5a'], layers: ['#5a3a6a', '#3d2c58', '#261d40', '#150f28'], sun: '#ffd1a1', glow: '#ff9a62', stars: false },
    night:  { sky: ['#070b1e', '#121a3d', '#26346a'], layers: ['#1d2650', '#151c3f', '#0d1230', '#070a1c'], sun: '#f4f1e2', glow: '#aab8ff', stars: true },
    day:    { sky: ['#3d78c4', '#7fb3e6', '#d6ecf7'], layers: ['#7da0b8', '#5d8588', '#3f6a62', '#2a4a45'], sun: '#fffbe0', glow: '#fff3b0', stars: false },
    sea:    { sky: ['#0f2a4a', '#3a6f95', '#bfe0e8'], layers: ['#5c8aa0', '#3f6a82', '#264d63', '#143445'], sun: '#fff7d6', glow: '#ffe9a8', stars: false, water: true },
    desert: { sky: ['#4a3a6a', '#e09a6a', '#fbd9a0'], layers: ['#c98a5a', '#a86a45', '#7d4b34', '#4d2f25'], sun: '#fff0c0', glow: '#ffd08a', stars: false },
    forest: { sky: ['#243b4a', '#5f8f86', '#d4e8c0'], layers: ['#5f8a6a', '#3f6a52', '#274b3d', '#14301f'], sun: '#fffbd0', glow: '#e8f2a8', stars: false },
    gold:   { sky: ['#2b2140', '#a05a4a', '#ffd98a'], layers: ['#8a5a4a', '#6a4338', '#43292a', '#251718'], sun: '#fff5cf', glow: '#ffd98a', stars: false },
    mountain: { sky: ['#1b2a4e', '#5979a8', '#dfe8f2'], layers: ['#8aa0bc', '#657d9c', '#445a7a', '#27384f'], sun: '#fffbe6', glow: '#ffffff', stars: false },
    green:  { sky: ['#1d3a3a', '#5a9a86', '#e3f0c8'], layers: ['#6aa07a', '#487d5a', '#2c5a42', '#17352a'], sun: '#fffbd0', glow: '#f0f6b0', stars: false }
  };
  var MOODS = ['dawn', 'dusk', 'night', 'sea', 'forest', 'gold', 'mountain', 'green', 'day'];

  function ridge(rng, baseY, amp, id) {
    var pts = [], x, steps = 7, i;
    for (i = 0; i <= steps; i++) pts.push([i * (420 / steps) - 10, baseY + (rng() - 0.5) * amp * 2]);
    var d = 'M-10 700 L' + pts[0][0] + ' ' + pts[0][1].toFixed(1);
    for (i = 1; i < pts.length; i++) {
      var p0 = pts[i - 1], p1 = pts[i], mx = (p0[0] + p1[0]) / 2;
      d += ' C' + mx.toFixed(1) + ' ' + p0[1].toFixed(1) + ' ' + mx.toFixed(1) + ' ' + p1[1].toFixed(1) + ' ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1);
    }
    return d + ' L410 700 Z';
  }

  function scene(seed, mood) {
    var rng = rngFrom(seed);
    if (!PALETTES[mood]) mood = MOODS[Math.floor(rng() * MOODS.length)];
    var P = PALETTES[mood], u = 'a' + hash(seed + mood).toString(36), s = '';
    var sx = 70 + rng() * 260, sy = 70 + rng() * 100, sr = 20 + rng() * 18;
    s += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">';
    s += '<defs><linearGradient id="' + u + 's" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + P.sky[0] + '"/><stop offset=".55" stop-color="' + P.sky[1] + '"/><stop offset="1" stop-color="' + P.sky[2] + '"/></linearGradient>';
    s += '<radialGradient id="' + u + 'g"><stop offset="0" stop-color="' + P.glow + '" stop-opacity=".85"/><stop offset="1" stop-color="' + P.glow + '" stop-opacity="0"/></radialGradient>';
    s += '<filter id="' + u + 'b"><feGaussianBlur stdDeviation="9"/></filter></defs>';
    s += '<rect width="400" height="700" fill="url(#' + u + 's)"/>';
    var i;
    if (P.stars) for (i = 0; i < 70; i++) s += '<circle cx="' + (rng() * 400).toFixed(1) + '" cy="' + (rng() * 380).toFixed(1) + '" r="' + (0.4 + rng() * 1.2).toFixed(2) + '" fill="#fff" opacity="' + (0.3 + rng() * 0.7).toFixed(2) + '"/>';
    s += '<circle cx="' + sx.toFixed(1) + '" cy="' + sy.toFixed(1) + '" r="' + (sr * 4).toFixed(1) + '" fill="url(#' + u + 'g)"/>';
    s += '<circle cx="' + sx.toFixed(1) + '" cy="' + sy.toFixed(1) + '" r="' + sr.toFixed(1) + '" fill="' + P.sun + '"/>';
    for (i = 0; i < 3; i++) s += '<ellipse cx="' + (rng() * 400).toFixed(0) + '" cy="' + (90 + rng() * 260).toFixed(0) + '" rx="' + (70 + rng() * 90).toFixed(0) + '" ry="' + (7 + rng() * 10).toFixed(0) + '" fill="#fff" opacity="' + (0.07 + rng() * 0.1).toFixed(2) + '" filter="url(#' + u + 'b)"/>';
    var base = 360;
    for (i = 0; i < P.layers.length; i++) {
      s += '<path d="' + ridge(rng, base + i * 62, 40 - i * 6, u) + '" fill="' + P.layers[i] + '"/>';
    }
    if (P.water) {
      s += '<rect y="520" width="400" height="180" fill="' + P.layers[3] + '" opacity=".55"/>';
      for (i = 0; i < 9; i++) s += '<rect x="' + (sx - 60 + rng() * 120).toFixed(0) + '" y="' + (530 + i * 17).toFixed(0) + '" width="' + (20 + rng() * 70).toFixed(0) + '" height="2" fill="' + P.sun + '" opacity="' + (0.35 - i * 0.03).toFixed(2) + '"/>';
    }
    s += '<rect width="400" height="700" fill="#000" opacity=".12"/></svg>';
    return s;
  }

  root.MannaArt = { scene: scene, moods: MOODS, rng: rngFrom, hash: hash };
})(typeof window !== 'undefined' ? window : globalThis);
