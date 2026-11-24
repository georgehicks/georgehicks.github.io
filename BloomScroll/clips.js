/* Manna — pre-built voice clips. Every card that can be read aloud has a recorded clip in voice/<hash>.mp3, made once by
   _scripts/voice-build (Kokoro, voice Adam) so nothing is generated on the phone. A clip is named by a hash of the exact words
   it says, so changing a card's text means the old clip is simply no longer found (and the new one is made on the next build).
   This file composes the spoken text of each card the same way app.js does; the build and the app both use it, so they agree. */
(function (root) {
  'use strict';
  function norm(t) { return String(t).replace(/\s+/g, ' ').trim(); }
  function hex8(n) { return ('00000000' + (n >>> 0).toString(16)).slice(-8); }
  // Two 32-bit hashes of the UTF-8 bytes, side by side: short, and collisions are not a worry for a few hundred clips.
  function hash(t) {
    var b = new TextEncoder().encode(norm(t)), h1 = 0x811c9dc5, h2 = 5381;
    for (var i = 0; i < b.length; i++) { h1 = Math.imul(h1 ^ b[i], 16777619) >>> 0; h2 = (Math.imul(h2, 33) + b[i]) >>> 0; }
    return hex8(h1) + hex8(h2);
  }
  var man = null, ready = null;
  function load() {
    if (ready) return ready;
    ready = fetch('voice/manifest.json').then(function (r) { return r.ok ? r.json() : { clips: {} }; }).then(function (j) { man = j.clips || {}; return man; }).catch(function () { man = {}; return man; });
    return ready;
  }
  function has(text) { return !!(man && text && man[hash(text)]); }
  function url(text) { return 'voice/' + hash(text) + '.mp3'; }

  // The words of every card the voice can read, labelled for the build log. Mirrors the _say lines in app.js.
  function texts() {
    var T = root.MannaText, C = root.MannaContent, P = root.MannaPlaces, out = [];
    function add(kind, label, text) { out.push({ kind: kind, label: label, text: norm(text), hash: hash(text) }); }
    Object.keys(T.verses).forEach(function (ref) { add('scripture', ref, ref + '. ' + T.verses[ref]); });
    function wis(x, i, k) { add('wisdom', k + i, x.t + (x.a ? ' — ' + x.a : '')); }
    T.long.forEach(function (x, i) { wis(x, i, 'long'); });
    C.QUOTES.forEach(function (x, i) { wis(x, i, 'quote'); });
    C.THREADS.forEach(function (x, i) { wis(x, i, 'thread'); });
    C.SCIENCE.forEach(function (x, i) { add('science', 'science' + i, x.h + '. ' + x.t); });
    C.PHILOSOPHY.forEach(function (x, i) { add('philosophy', 'phil' + i, x.h + '. ' + x.t + ' ' + x.turn); });
    C.RELATIONSHIP.forEach(function (x, i) { add('relationship', 'rel' + i, x.h + '. ' + x.t + ' Try tonight: ' + x.tryit); });
    P.world.forEach(function (p) { add('places', p.id, p.name + '. ' + p.t); });
    P.bible.forEach(function (p) { add('journeys', p.id, p.name + '. ' + p.t + (p.text ? ' ' + p.read + '. ' + p.text : '')); });
    var seen = {}; return out.filter(function (o) { if (seen[o.hash]) return false; seen[o.hash] = 1; return true; });
  }
  root.MannaClips = { hash: hash, norm: norm, load: load, has: has, url: url, texts: texts, manifest: function () { return man || {}; } };
})(typeof window !== 'undefined' ? window : this);
