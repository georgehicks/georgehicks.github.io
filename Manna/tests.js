/* Manna — engine tests. Open tests.html. */
(function () {
  var E = window.MannaEngine, C = window.MannaContent, out = document.getElementById('out'), fails = 0, count = 0;
  function t(name, fn) { count++; var ok = false, msg = ''; try { ok = fn() !== false; } catch (e) { msg = e.message; } if (!ok) fails++; var d = document.createElement('div'); d.className = ok ? 'ok' : 'no'; d.textContent = (ok ? '✓ ' : '✗ ') + name + (msg ? ' — ' + msg : ''); out.appendChild(d); }
  function seeded(seed) { var a = seed; return function () { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; }; }

  // Every generator returns an integer answer that matches its own expression, at every level.
  E.SKILLS.forEach(function (k) {
    t('generator ' + k + ': answers are correct integers at every level', function () {
      var rng = seeded(7 + k.length);
      for (var L = 1; L <= E.MAXLVL[k]; L++) for (var i = 0; i < 300; i++) {
        var p = E.GEN[k](L, rng), v = (new Function('return ' + p.expr))();
        if (!Number.isInteger(p.a) || Math.abs(v - p.a) > 1e-9) throw new Error(k + ' L' + L + ' ' + p.q + ' => ' + p.a + ' vs ' + v);
        if (p.a < 0) throw new Error('negative answer: ' + p.q);
      }
    });
  });

  t('grading: fast correct streak raises level', function () { var s = E.newMath(); for (var i = 0; i < 12; i++) E.grade(s, 'add', true, 2); return s.add.lvl > 3; });
  t('grading: wrong answers lower level but never below 1', function () { var s = E.newMath(); for (var i = 0; i < 10; i++) E.grade(s, 'mul', false, 9); return s.mul.lvl === 1; });
  t('grading: level never exceeds max', function () { var s = E.newMath(); for (var i = 0; i < 200; i++) E.grade(s, 'comp', true, 1); return s.comp.lvl === E.MAXLVL.comp; });
  t('weakest skill is chosen more often', function () {
    var s = E.newMath(), rng = seeded(3), counts = {}, i;
    E.SKILLS.forEach(function (k) { s[k].lvl = 5; s[k].acc = 0.95; }); s.mul.lvl = 1; s.mul.acc = 0.2;
    for (i = 0; i < 600; i++) { var k = E.nextSkill(s, rng, null); counts[k] = (counts[k] || 0) + 1; }
    return counts.mul > counts.add * 1.5;
  });
  t('nextSkill avoids repeating the last one too often', function () { var s = E.newMath(), rng = seeded(5), same = 0, last = 'add'; for (var i = 0; i < 400; i++) { var k = E.nextSkill(s, rng, last); if (k === last) same++; last = k; } return same < 80; });

  // descent
  t('phases run spark → wisdom → stillness', function () { return E.phaseAt(0.1) === 'spark' && E.phaseAt(0.5) === 'wisdom' && E.phaseAt(0.9) === 'stillness'; });
  t('math and games vanish in stillness', function () { var w = E.weights(['math', 'games', 'scripture'], 0.9, null, false); return w.math === 0 && w.games === 0 && w.scripture > 0; });
  t('scripture rises through the sitting', function () { return E.weights(['scripture'], 0.9, null, false).scripture > E.weights(['scripture'], 0.1, null, false).scripture; });
  t('single category ignores the phase', function () { return E.weights(['math'], 0.95, null, true).math === 1; });
  t('mood tunes weights', function () { var a = E.weights(['relationship'], 0.5, null, false).relationship, b = E.weights(['relationship'], 0.5, 'lonely', false).relationship; return b > a; });
  t('dim grows from 0 to the set strength', function () { return E.dimAt(0, 0.4) === 0 && Math.abs(E.dimAt(1, 0.4) - 0.4) < 1e-9 && E.dimAt(2, 0.4) <= 0.4; });
  t('pickFresh avoids recent ids until the pool runs out', function () { var rng = seeded(1); for (var i = 0; i < 50; i++) if (E.pickFresh(['a', 'b', 'c'], ['a', 'b'], rng) !== 'c') return false; return E.pickFresh(['a'], ['a'], rng) === 'a'; });
  t('pickWeighted respects zero weights', function () { var rng = seeded(2); for (var i = 0; i < 100; i++) if (E.pickWeighted({ a: 0, b: 1 }, rng) !== 'b') return false; return true; });

  // content integrity
  t('content: every What I Want verse exists in the verse set', function () { return window.MannaText ? C.WANT.every(function (w) { return window.MannaText.verses[w.verse]; }) : true; });
  t('content: unique ids in WANT', function () { var s = {}; return C.WANT.every(function (w) { if (s[w.id]) return false; s[w.id] = 1; return true; }); });
  t('content: every card has text', function () { return C.JOKES.concat(C.RIDDLES).every(function (x) { return x.q && x.a; }) && C.SCIENCE.concat(C.PHILOSOPHY, C.RELATIONSHIP).every(function (x) { return x.h && x.t; }); });

  var s = document.createElement('h3'); s.className = fails ? 'no' : 'ok'; s.textContent = fails ? fails + ' of ' + count + ' failed' : 'All ' + count + ' passed'; out.insertBefore(s, out.firstChild);
})();
