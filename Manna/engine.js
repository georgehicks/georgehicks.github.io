/* Manna — engine. Pure logic, no DOM, no storage: the descent curve, the feed mix, and the adaptive mental-math trainer.
   Tested in tests.html. Everything that needs randomness takes an rng() so tests can be deterministic. */
(function (root) {
  'use strict';
  var C = (typeof require !== 'undefined' && typeof module !== 'undefined') ? require('./content.js') : root.MannaContent;

  // ---------- descent ----------
  // p is progress through the sitting, 0..1. Three phases: spark -> wisdom -> stillness.
  function phaseAt(p) { return p < 0.38 ? 'spark' : p < 0.74 ? 'wisdom' : 'stillness'; }

  // Weight multiplier per category for each phase. Games and math fade out entirely in stillness.
  var PHASE_WEIGHT = {
    spark:     { math: 3, riddles: 2, jokes: 2, games: 2, places: 2, science: 2, want: 1, wisdom: 1, relationship: 1, philosophy: 1, journeys: 1, scripture: 0.6 },
    wisdom:    { math: 0.5, riddles: 0.8, jokes: 0.8, games: 0.4, places: 1.4, science: 1.4, want: 2, wisdom: 2.4, relationship: 1.6, philosophy: 1.8, journeys: 1.8, scripture: 1.4 },
    stillness: { math: 0, riddles: 0, jokes: 0.15, games: 0, places: 1, science: 0.3, want: 1, wisdom: 2.2, relationship: 0.6, philosophy: 0.8, journeys: 1.4, scripture: 3.6 }
  };

  function weights(cats, p, mood, single) {
    var ph = phaseAt(p), out = {};
    cats.forEach(function (id) {
      var w = single ? 1 : (PHASE_WEIGHT[ph][id] == null ? 1 : PHASE_WEIGHT[ph][id]);
      if (mood) { var m = C.MOODS.filter(function (x) { return x.id === mood; })[0]; if (m && m.tune[id] != null) w *= m.tune[id]; }
      out[id] = w;
    });
    return out;
  }

  function pickWeighted(weightMap, rng) {
    var keys = Object.keys(weightMap), total = 0, i;
    for (i = 0; i < keys.length; i++) total += Math.max(0, weightMap[keys[i]]);
    if (total <= 0) return keys.length ? keys[0] : null;
    var r = rng() * total;
    for (i = 0; i < keys.length; i++) { r -= Math.max(0, weightMap[keys[i]]); if (r <= 0) return keys[i]; }
    return keys[keys.length - 1];
  }

  // Never repeat a card until the pool for that category has been used (history = list of recently used ids).
  function pickFresh(ids, recent, rng) {
    var recentSet = {}; recent.forEach(function (x) { recentSet[x] = 1; });
    var fresh = ids.filter(function (x) { return !recentSet[x]; });
    if (!fresh.length) fresh = ids;
    return fresh[Math.floor(rng() * fresh.length)];
  }

  // Screen warmth/dim over the sitting: 0 at start up to `max` at the end (a multiply layer).
  function dimAt(p, strength) { var s = strength == null ? 0.38 : strength; return Math.max(0, Math.min(1, p)) * s; }

  // ---------- math ----------
  function ri(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

  var MAXLVL = { add: 6, sub: 6, mul: 7, div: 5, comp: 3, pct: 4, sq: 3 };
  var LABEL = { add: 'Adding', sub: 'Subtracting', mul: 'Multiplying', div: 'Dividing', comp: 'To a round number', pct: 'Percents & fractions', sq: 'Squares' };

  // Each generator returns { q: display, expr: JS-evaluable expression, a: integer answer }.
  var GEN = {
    add: function (L, rng) {
      var a, b;
      if (L <= 1) { a = ri(rng, 2, 9); b = ri(rng, 2, 9); if (a + b > 20) b = 20 - a; }
      else if (L === 2) { a = ri(rng, 11, 89); b = ri(rng, 2, 9); }
      else if (L === 3) { a = ri(rng, 1, 7) * 10 + ri(rng, 1, 4); b = ri(rng, 1, 7) * 10 + ri(rng, 1, 4); }
      else if (L === 4) { a = ri(rng, 15, 89); b = ri(rng, 15, 89); }
      else if (L === 5) { a = ri(rng, 101, 899); b = ri(rng, 11, 99); }
      else { a = ri(rng, 101, 899); b = ri(rng, 101, 899); }
      return { q: a + ' + ' + b, expr: a + '+' + b, a: a + b };
    },
    sub: function (L, rng) {
      var a, b;
      if (L <= 1) { a = ri(rng, 6, 20); b = ri(rng, 2, a - 1); }
      else if (L === 2) { a = ri(rng, 20, 99); b = ri(rng, 2, 9); }
      else if (L === 3) { a = ri(rng, 5, 9) * 10 + ri(rng, 5, 9); b = ri(rng, 1, 4) * 10 + ri(rng, 1, 4); }
      else if (L === 4) { a = ri(rng, 41, 99); b = ri(rng, 12, a - 5); }
      else if (L === 5) { a = ri(rng, 201, 999); b = ri(rng, 11, 99); }
      else { a = ri(rng, 301, 999); b = ri(rng, 101, a - 20); }
      return { q: a + ' − ' + b, expr: a + '-' + b, a: a - b };
    },
    mul: function (L, rng) {
      var a, b;
      if (L <= 1) { a = ri(rng, 2, 9); b = pick(rng, [2, 5, 10]); }
      else if (L === 2) { a = ri(rng, 2, 5); b = ri(rng, 2, 9); }
      else if (L === 3) { a = ri(rng, 3, 9); b = ri(rng, 3, 9); }
      else if (L === 4) { a = ri(rng, 6, 12); b = ri(rng, 6, 12); }
      else if (L === 5) { a = ri(rng, 12, 49); b = ri(rng, 3, 9); }
      else if (L === 6) { a = ri(rng, 12, 99); b = pick(rng, [11, 12, 15, 25]); }
      else { a = ri(rng, 13, 49); b = ri(rng, 13, 49); }
      return { q: a + ' × ' + b, expr: a + '*' + b, a: a * b };
    },
    div: function (L, rng) {
      var b, c;
      if (L <= 1) { b = pick(rng, [2, 5, 10]); c = ri(rng, 2, 9); }
      else if (L === 2) { b = ri(rng, 2, 5); c = ri(rng, 3, 9); }
      else if (L === 3) { b = ri(rng, 3, 9); c = ri(rng, 3, 12); }
      else if (L === 4) { b = ri(rng, 6, 12); c = ri(rng, 6, 15); }
      else { b = ri(rng, 3, 9); c = ri(rng, 12, 60); }
      return { q: (b * c) + ' ÷ ' + b, expr: (b * c) + '/' + b, a: c };
    },
    comp: function (L, rng) {
      var n, m;
      if (L <= 1) { m = 10; n = ri(rng, 1, 9); }
      else if (L === 2) { m = 100; n = ri(rng, 6, 94); }
      else { m = 1000; n = ri(rng, 101, 899); }
      return { q: m + ' − ' + n, expr: m + '-' + n, a: m - n };
    },
    pct: function (L, rng) {
      var n, k;
      if (L <= 1) { k = pick(rng, [10, 50]); n = ri(rng, 2, 20) * 10; return { q: k + '% of ' + n, expr: n + '*' + k + '/100', a: n * k / 100 }; }
      if (L === 2) { k = pick(rng, [25, 20]); n = ri(rng, 2, 20) * 20; return { q: k + '% of ' + n, expr: n + '*' + k + '/100', a: n * k / 100 }; }
      if (L === 3) { k = pick(rng, [15, 5, 30]); n = ri(rng, 2, 20) * 20; return { q: k + '% of ' + n, expr: n + '*' + k + '/100', a: n * k / 100 }; }
      var f = pick(rng, [[3, 4], [2, 3], [3, 5], [5, 6], [7, 8]]); n = f[1] * ri(rng, 2, 12);
      return { q: f[0] + '/' + f[1] + ' of ' + n, expr: n + '*' + f[0] + '/' + f[1], a: n * f[0] / f[1] };
    },
    sq: function (L, rng) {
      var n;
      if (L <= 1) n = ri(rng, 2, 12);
      else if (L === 2) n = ri(rng, 13, 20);
      else n = pick(rng, [25, 35, 45, 55, 65, 75, 85, 95, 21, 31, 41, 51]);
      return { q: n + '²', expr: n + '*' + n, a: n * n };
    }
  };
  var SKILLS = Object.keys(GEN);

  function newMath() {
    var s = {};
    SKILLS.forEach(function (k) { s[k] = { lvl: 1, acc: 0.5, n: 0, streak: 0 }; });
    return s;
  }

  // Target seconds for a "fast" correct answer grows with level.
  function targetSecs(skill, L) { return 4 + L * 1.6 + (skill === 'mul' || skill === 'pct' ? 1 : 0); }

  // Update a skill after an answer. Fast & right pushes up; wrong pulls back a little; stays in [1, MAXLVL].
  function grade(state, skill, correct, secs) {
    var s = state[skill], L = Math.floor(s.lvl);
    s.n++;
    s.acc = s.acc * 0.85 + (correct ? 1 : 0) * 0.15;
    if (correct) {
      s.streak++;
      var fast = secs <= targetSecs(skill, L);
      s.lvl += (fast ? 0.2 : 0.07) + 0.04 * Math.min(s.streak, 5);
    } else {
      s.streak = 0;
      s.lvl -= 0.45;
    }
    s.lvl = Math.max(1, Math.min(MAXLVL[skill], s.lvl));
    return s;
  }

  // Which skill next: weight toward weaker ones (low accuracy, low level), but never starve the strong ones.
  function nextSkill(state, rng, last) {
    var w = {};
    SKILLS.forEach(function (k) {
      var s = state[k];
      w[k] = 0.6 + (1 - s.acc) * 1.4 + (MAXLVL[k] - s.lvl) / MAXLVL[k];
      if (k === last) w[k] *= 0.25;
    });
    return pickWeighted(w, rng);
  }

  // A problem for a skill at the player's level; one time in five, a stretch problem one level up.
  function nextProblem(state, skill, rng) {
    var s = state[skill], L = Math.floor(s.lvl);
    if (rng() < 0.2) L = Math.min(MAXLVL[skill], L + 1);
    var p = GEN[skill](L, rng);
    p.skill = skill; p.level = L; p.tip = C.TIPS[skill];
    return p;
  }

  // Four close-but-wrong options (used only if the player turns on tap-to-choose).
  function distractors(a, rng) {
    var set = {}; set[a] = 1; var out = [];
    var deltas = [1, -1, 10, -10, 2, -2, 5, 100, -100];
    var tries = 0;
    while (out.length < 3 && tries++ < 40) {
      var d = pick(rng, deltas) * (rng() < 0.5 ? 1 : 1);
      var v = a + d; if (v < 0 || set[v]) continue; set[v] = 1; out.push(v);
    }
    return out;
  }

  var api = {
    phaseAt: phaseAt, PHASE_WEIGHT: PHASE_WEIGHT, weights: weights, pickWeighted: pickWeighted, pickFresh: pickFresh, dimAt: dimAt,
    GEN: GEN, SKILLS: SKILLS, MAXLVL: MAXLVL, LABEL: LABEL, newMath: newMath, grade: grade, nextSkill: nextSkill, nextProblem: nextProblem,
    distractors: distractors, targetSecs: targetSecs
  };
  root.MannaEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
