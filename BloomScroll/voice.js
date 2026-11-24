/* Manna — read-aloud. Plays the pre-recorded clips in voice/ (see clips.js and _scripts/voice-build). Nothing is generated on the
   phone and no model is downloaded: a clip is a small MP3 fetched when you reach its card (the next one is fetched ahead of time),
   and the service worker keeps it afterwards so it plays offline. */
(function (root) {
  'use strict';
  var ctx = null, cur = null, cache = {}, order = [], K = root.MannaClips;

  function supported() { return !!(K && (root.AudioContext || root.webkitAudioContext)); }
  function has(text) { return !!(K && K.has(text)); }

  // iOS only lets audio start from inside a tap, so this is called from every tap/click in the app (see app.js). It creates the
  // context, resumes it and plays one silent sample, which marks the page as allowed to play for the rest of the visit.
  function unlock() {
    if (!supported()) return;
    try {
      if (!ctx) ctx = new (root.AudioContext || root.webkitAudioContext)();
      if (ctx.state !== 'running') ctx.resume();
      if (!unlock.done) { var b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); unlock.done = true; }
    } catch (e) {}
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function decode(ab) { return new Promise(function (res, rej) { if (!ctx) unlock(); var p = ctx.decodeAudioData(ab, res, rej); if (p && p.catch) p.catch(rej); }); }

  // The decoded audio of a clip, fetched once; the last dozen are kept for this visit.
  function clip(text) {
    var k = K.hash(text); if (cache[k]) return cache[k];
    var p = fetch(K.url(text)).then(function (r) { if (!r.ok) throw new Error('missing'); return r.arrayBuffer(); }).then(decode);
    cache[k] = p; order.push(k); while (order.length > 12) delete cache[order.shift()];
    p.catch(function () { delete cache[k]; });
    return p;
  }

  // onState('thinking' | 'playing' | 'done' | 'blocked' | 'error')
  function speak(text, onState) {
    stop(); unlock();
    var job = { stopped: false, src: null }; cur = job;
    (async function () {
      try {
        if (onState) onState('thinking');
        var buf = await clip(text); if (job.stopped) return;
        if (!ctx) unlock();
        if (ctx.state !== 'running') { try { await Promise.race([ctx.resume(), sleep(700)]); } catch (e) {} }
        if (job.stopped) return;
        if (ctx.state !== 'running') throw new Error('blocked');
        var src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination); job.src = src;
        src.onended = function () { if (!job.stopped) { cur = null; if (onState) onState('done'); } };
        src.start(); if (onState) onState('playing');
      } catch (e) { if (!job.stopped) { cur = null; if (onState) onState(e && e.message === 'blocked' ? 'blocked' : 'error'); } }
    })();
    return job;
  }
  // Fetch the clip for a card you are about to read, so a tap on it is answered at once.
  function prefetch(text) { if (has(text)) clip(text).catch(function () {}); }
  function stop() { if (cur) { cur.stopped = true; try { if (cur.src) cur.src.stop(); } catch (e) {} cur = null; } }
  function speaking() { return !!cur; }

  root.MannaVoice = { supported: supported, has: has, unlock: unlock, speak: speak, prefetch: prefetch, stop: stop, speaking: speaking };
})(typeof window !== 'undefined' ? window : this);
