/* Bloom Scroll — game music. A soft, endless, built-in soundtrack (slow pads, a low note, and a few bell notes through a long reverb), made live with Web Audio,
   so there is no file to download. If audio/manifest.json lists your own tracks (for example from Suno) they play instead, looped, one after another.
   It starts when a game opens (a tap, which iOS requires), follows the countdown down in volume, and fades out when you leave the game or wind down.
   On an iPhone the ringer switch must be on for Web Audio to be heard. */
(function (root) {
  'use strict';
  var M = {}, ctx = null, master = null, src = null, timer = 0, playing = false, base = 1.2, level = 1, tracks = null, trackBuf = {}, token = 0, stopT = 0;

  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function impulse(c, secs) {
    var n = Math.floor(c.sampleRate * secs), b = c.createBuffer(2, n, c.sampleRate);
    for (var ch = 0; ch < 2; ch++) { var d = b.getChannelData(ch); for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); }
    return b;
  }
  // The generator. gen(ctx, destination) -> { schedule(untilTime) }. Used live (a little ahead of the clock) and offline in tests.
  function gen(c, dest, t0) {
    var verb = c.createConvolver(); verb.buffer = impulse(c, 3.4); var wet = c.createGain(); wet.gain.value = 0.55; verb.connect(wet); wet.connect(dest);
    var dry = c.createGain(); dry.gain.value = 0.7; dry.connect(dest); var bus = c.createGain(); bus.connect(dry); bus.connect(verb);
    var CH = [[48, 55, 59, 64, 67], [45, 52, 60, 64, 67], [41, 48, 57, 60, 64], [43, 50, 57, 60, 62]], SC = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81], S = { chordT: t0, noteT: t0 + 1.5, i: 0 };
    function pad(t, notes, dur) {
      notes.forEach(function (m, i) {
        [-5, 5].forEach(function (dt) {
          var o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.type = i % 2 ? 'sine' : 'triangle'; o.frequency.value = hz(m); o.detune.value = dt; f.type = 'lowpass'; f.frequency.value = 1100;
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.026, t + 2.6); g.gain.setValueAtTime(0.026, t + dur - 0.4); g.gain.linearRampToValueAtTime(0, t + dur + 3);
          o.connect(f); f.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 3.2);
        });
      });
      var b = c.createOscillator(), bg = c.createGain(); b.type = 'sine'; b.frequency.value = hz(notes[0] - 12); bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(0.085, t + 1.8); bg.gain.setValueAtTime(0.085, t + dur - 0.5); bg.gain.linearRampToValueAtTime(0, t + dur + 2); b.connect(bg); bg.connect(dry); b.start(t); b.stop(t + dur + 2.2);
    }
    function bell(t, m) {
      var o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), g2 = c.createGain(); o.frequency.value = hz(m); o2.frequency.value = hz(m) * 2.01; g2.gain.value = 0.22;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.045, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0008, t + 2.3); o.connect(g); o2.connect(g2); g2.connect(g);
      if (c.createStereoPanner) { var p = c.createStereoPanner(); p.pan.value = Math.random() * 1.4 - 0.7; g.connect(p); p.connect(bus); } else g.connect(bus);
      o.start(t); o2.start(t); o.stop(t + 2.4); o2.stop(t + 2.4);
    }
    return {
      schedule: function (until) {
        while (S.chordT < until) { pad(S.chordT, CH[S.i % 4], 8.5); S.i++; S.chordT += 8; }
        while (S.noteT < until) { if (Math.random() < 0.72) bell(S.noteT, SC[Math.floor(Math.random() * SC.length)]); S.noteT += 0.55 + Math.random() * 1.0; }
      },
      bus: bus
    };
  }
  M._gen = gen;

  function ensure() {
    if (ctx) return ctx; var AC = root.AudioContext || root.webkitAudioContext; if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination); return ctx;
  }
  function loadManifest() {
    if (tracks) return Promise.resolve(tracks);
    return fetch('audio/manifest.json').then(function (r) { return r.ok ? r.json() : []; }).then(function (a) { tracks = Array.isArray(a) ? a.filter(function (x) { return typeof x === 'string'; }) : []; return tracks; }).catch(function () { tracks = []; return tracks; });
  }
  function playTrack(name, my) {
    var go = function (buf) {
      if (my !== token || !playing) return; var s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(master); s.start(); src = { stop: function () { try { s.stop(); } catch (e) {} } };
    };
    if (trackBuf[name]) return go(trackBuf[name]);
    fetch('audio/' + encodeURIComponent(name)).then(function (r) { return r.arrayBuffer(); }).then(function (ab) { return new Promise(function (ok, bad) { ctx.decodeAudioData(ab, ok, bad); }); })
      .then(function (b) { trackBuf[name] = b; go(b); }).catch(function () { startGen(my); });
  }
  function startGen(my) {
    if (my !== token || !playing) return; var g = gen(ctx, master, ctx.currentTime + 0.1); g.schedule(ctx.currentTime + 1.5);
    timer = setInterval(function () { g.schedule(ctx.currentTime + 1.5); }, 400); src = { stop: function () { clearInterval(timer); timer = 0; try { g.bus.disconnect(); } catch (e) {} } };
  }

  // Call from a tap. Safe to call again while playing (it just brings the volume back up).
  M.start = function () {
    if (!ensure()) return false; clearTimeout(stopT);
    try { if (ctx.state !== 'running') ctx.resume(); } catch (e) {}
    master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(base * level, ctx.currentTime, 0.8);
    if (playing) return true; playing = true; var my = ++token;
    loadManifest().then(function (list) { if (my !== token || !playing) return; if (list.length) playTrack(list[Math.floor(Math.random() * list.length)], my); else startGen(my); });
    return true;
  };
  // 0 to 1, follows the countdown down
  M.setLevel = function (x) { level = Math.max(0, Math.min(1, x)); if (ctx && playing) master.gain.setTargetAtTime(base * level, ctx.currentTime, 1.2); };
  M.fadeOut = function (secs) {
    if (!ctx || !playing) return; secs = secs || 2; master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0, ctx.currentTime, secs / 4);
    clearTimeout(stopT); stopT = setTimeout(M.stop, secs * 1000 + 300);
  };
  M.stop = function () { clearTimeout(stopT); token++; playing = false; if (src) { src.stop(); src = null; } if (timer) { clearInterval(timer); timer = 0; } if (ctx && master) master.gain.setValueAtTime(0, ctx.currentTime); };
  M.playing = function () { return playing; };
  M.hasTracks = function () { return !!(tracks && tracks.length); };
  M.probe = loadManifest;
  document.addEventListener('visibilitychange', function () { if (!document.hidden && ctx && playing && ctx.state !== 'running') { try { ctx.resume(); } catch (e) {} } });
  root.MannaMusic = M;
})(window);
