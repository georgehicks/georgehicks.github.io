/* Abiding Step — focus music. A built-in, endless, generated piece (no audio files), adapted from Bloom Scroll's:
   warm slow pads that breathe, a soft kalimba pattern that follows the chords, a small tune that comes round every other time through,
   a quiet low note, and (for "Drive") a very soft pulse like a game level. Four presets change the tempo, the key, how busy the kalimba is, and the pulse.
   It starts inside a tap (a timer starting — iOS requires that) and fades out when the timer ends. On an iPhone the ringer switch must be on to hear Web Audio. */
(function (root) {
  'use strict';
  var M = {}, ctx = null, master = null, src = null, timer = 0, playing = false, vol = 0.6, base = 1.15, token = 0, stopT = 0, cur = '';

  var PRESETS = [
    { id: 'calm',  name: 'Calm',  note: 'slow pads, soft kalimba',          mood: 'calm', bpm: 72,  shift: 0,  sparse: 0.7 },
    { id: 'flow',  name: 'Flow',  note: 'a little brighter and busier',     mood: 'calm', bpm: 84,  shift: 2,  sparse: 0.92 },
    { id: 'drive', name: 'Drive', note: 'steady soft pulse, like a game',   mood: 'play', bpm: 100, shift: 0,  sparse: 0.9 },
    { id: 'deep',  name: 'Deep',  note: 'sparse and low, for thinking',     mood: 'calm', bpm: 58,  shift: -3, sparse: 0.4 },
  ];
  M.PRESETS = PRESETS;
  function find(id) { for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].id === id) return PRESETS[i]; return PRESETS[0]; }

  // A warm room: noise that fades away, softened so it is not hissy.
  function impulse(c, secs) {
    var n = Math.floor(c.sampleRate * secs), b = c.createBuffer(2, n, c.sampleRate);
    for (var ch = 0; ch < 2; ch++) { var d = b.getChannelData(ch), y = 0; for (var i = 0; i < n; i++) { y += ((Math.random() * 2 - 1) - y) * (0.42 - 0.3 * (i / n)); d[i] = y * Math.pow(1 - i / n, 2.4); } }
    return b;
  }
  function noiseBuf(c) { var n = Math.floor(c.sampleRate * 0.12), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return b; }

  // gen(ctx, destination, startTime, { mood, bpm, shift, sparse, energy }) -> { schedule(untilTime), bus }
  function gen(c, dest, t0, o) {
    o = o || {}; var play = o.mood === 'play', energy = o.energy || function () { return 1; };
    var SH = o.shift || 0, BEAT = 60 / (o.bpm || 72), LEN = BEAT * 8, sparse = o.sparse != null ? o.sparse : (play ? 0.9 : 0.7);
    function hz(m) { return 440 * Math.pow(2, (m + SH - 69) / 12); }
    var verb = c.createConvolver(); verb.buffer = impulse(c, 3.6); var wet = c.createGain(); wet.gain.value = 0.6; verb.connect(wet); wet.connect(dest);
    var dry = c.createGain(); dry.gain.value = 0.75; dry.connect(dest); var bus = c.createGain(); bus.connect(dry); bus.connect(verb);
    var noise = noiseBuf(c);
    // progression A (with the tune) then B (the pattern alone). Chord tones are midi notes.
    var A = [[48, 55, 59, 64, 67], [45, 52, 60, 64, 67], [41, 48, 57, 60, 64], [43, 50, 57, 59, 62]];
    var B = [[41, 48, 57, 60, 64], [43, 50, 57, 59, 62], [40, 47, 55, 59, 62], [45, 52, 60, 64, 67]];
    var TUNE = [[[0, 76], [2, 74], [4, 72], [5.5, 74]], [[0, 72], [2, 76], [4, 74], [6, 72]], [[0, 69], [2, 72], [4, 77], [6, 76]], [[0, 74], [2, 71], [4, 67]]];
    var PAT = [[0, 1, 2, 3, 2, 1, 2, 1, 0, 1, 2, 3, 2, 1, 3, 2], [0, 2, 1, 3, 2, 3, 1, 2, 0, 2, 1, 3, 1, 2, 3, 1], [0, 1, 3, 2, 1, 2, 3, 2, 0, 3, 2, 1, 2, 1, 3, 1]];
    var S = { chordT: t0, i: 0 };

    function pad(t, notes, dur) {
      var f = c.createBiquadFilter(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain();
      f.type = 'lowpass'; f.frequency.value = 760; f.Q.value = 0.6; lfo.frequency.value = 0.09 + Math.random() * 0.05; lg.gain.value = 320; lfo.connect(lg); lg.connect(f.frequency); lfo.start(t); lfo.stop(t + dur + 3.5);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 2.4); g.gain.setValueAtTime(1, t + dur - 0.3); g.gain.linearRampToValueAtTime(0, t + dur + 3); f.connect(g); g.connect(bus);
      notes.slice(1).forEach(function (m, i) {
        [-7, 7].forEach(function (dt) { var o2 = c.createOscillator(), og = c.createGain(); o2.type = 'sawtooth'; o2.frequency.value = hz(m); o2.detune.value = dt; og.gain.value = 0.0085; o2.connect(og); og.connect(f); o2.start(t); o2.stop(t + dur + 3.2); });
        if (i % 2 === 0) { var s = c.createOscillator(), sg = c.createGain(); s.type = 'sine'; s.frequency.value = hz(m); sg.gain.value = 0.02; s.connect(sg); sg.connect(g); s.start(t); s.stop(t + dur + 3.2); }
      });
      var b = c.createOscillator(), bg = c.createGain(); b.type = 'sine'; b.frequency.value = hz(notes[0] - 12); bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(0.085, t + 1.6); bg.gain.setValueAtTime(0.085, t + dur - 0.5); bg.gain.linearRampToValueAtTime(0, t + dur + 1.8); b.connect(bg); bg.connect(dry); b.start(t); b.stop(t + dur + 2);
    }
    function kalimba(t, m, vel, pan) {
      var o1 = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), g2 = c.createGain(); o1.frequency.value = hz(m); o2.frequency.value = hz(m) * 5.4; g2.gain.value = 0.16;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.036 * vel, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0007, t + 1.25); var g3 = c.createGain(); g3.gain.setValueAtTime(1, t); g3.gain.exponentialRampToValueAtTime(0.01, t + 0.22); o2.connect(g3); g3.connect(g2); g2.connect(g); o1.connect(g);
      if (c.createStereoPanner) { var p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(bus); } else g.connect(bus);
      o1.start(t); o2.start(t); o1.stop(t + 1.3); o2.stop(t + 1.3);
    }
    function tune(t, m, beats) {
      var o1 = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), g2 = c.createGain(), d = Math.min(3.4, beats * BEAT * 1.4 + 0.9); o1.type = 'sine'; o1.frequency.value = hz(m); o2.frequency.value = hz(m) * 2; g2.gain.value = 0.28;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + d); o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(bus); o1.start(t); o2.start(t); o1.stop(t + d + 0.1); o2.stop(t + d + 0.1);
    }
    function thump(t, v) { var o1 = c.createOscillator(), g = c.createGain(); o1.type = 'sine'; o1.frequency.setValueAtTime(95, t); o1.frequency.exponentialRampToValueAtTime(42, t + 0.16); g.gain.setValueAtTime(0.075 * v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.3); o1.connect(g); g.connect(dry); o1.start(t); o1.stop(t + 0.32); }
    function shaker(t, v) { var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = noise; f.type = 'bandpass'; f.frequency.value = 6500; f.Q.value = 0.8; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.012 * v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.1); s.connect(f); f.connect(g); g.connect(dry); s.start(t); s.stop(t + 0.12); }

    function chord(t, idx) {
      var cycle = Math.floor(idx / 4), pos = idx % 4, aSide = cycle % 2 === 0, notes = (aSide ? A : B)[pos], dur = LEN + 0.4, e = energy();
      pad(t, notes, dur);
      var up = notes.slice(1).map(function (m) { return m + 12; }), pat = PAT[(cycle + pos) % 3];
      for (var k = 0; k < 16; k++) { if (Math.random() > sparse) continue; var tt = Math.max(t, t + k * BEAT / 2 + (Math.random() - 0.5) * 0.02), accent = k % 4 === 0 ? 1 : k % 2 === 0 ? 0.8 : 0.62; kalimba(tt, up[pat[k] % up.length] + (k % 8 === 7 && Math.random() < 0.4 ? 12 : 0), accent * (0.85 + Math.random() * 0.3), (k % 2 ? 0.35 : -0.35) + (Math.random() - 0.5) * 0.3); }
      if (aSide) TUNE[pos].forEach(function (n) { tune(Math.max(t, t + n[0] * BEAT + (Math.random() - 0.5) * 0.015), n[1], 2); });
      if (play && e > 0.18) { var pe = Math.min(1, (e - 0.18) / 0.5); for (var b = 0; b < 8; b++) { if (b % 4 === 0) thump(t + b * BEAT, pe); else if (b % 4 === 2) thump(t + b * BEAT, pe * 0.45); shaker(t + b * BEAT + BEAT / 2, pe * (b % 2 ? 0.7 : 1)); } }
    }
    return { schedule: function (until) { while (S.chordT < until) { chord(S.chordT, S.i); S.i++; S.chordT += LEN; } }, bus: bus };
  }
  M._gen = gen;

  function ensure() {
    if (ctx) return ctx; var AC = root.AudioContext || root.webkitAudioContext; if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination); return ctx;
  }
  function startGen(p, my) {
    if (my !== token || !playing) return;
    var g = gen(ctx, master, ctx.currentTime + 0.1, { mood: p.mood, bpm: p.bpm, shift: p.shift, sparse: p.sparse, energy: function () { return 1; } });
    g.schedule(ctx.currentTime + 2);
    timer = setInterval(function () { g.schedule(ctx.currentTime + 2); }, 500);
    src = { stop: function () { clearInterval(timer); timer = 0; try { g.bus.disconnect(); } catch (e) {} } };
  }

  // Call from a tap. id is a preset id. Safe to call again while playing.
  M.start = function (id) {
    if (!ensure()) return false; clearTimeout(stopT); var p = find(id);
    try { if (ctx.state !== 'running') ctx.resume(); } catch (e) {}
    master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(base * vol, ctx.currentTime, 0.8);
    if (playing && cur === p.id) return true;
    if (playing) { if (src) src.stop(); src = null; if (timer) { clearInterval(timer); timer = 0; } }
    cur = p.id; playing = true; startGen(p, ++token); return true;
  };
  M.setVolume = function (v) { vol = Math.max(0, Math.min(1, v)); if (ctx && playing) master.gain.setTargetAtTime(base * vol, ctx.currentTime, 0.2); };
  M.fadeOut = function (secs) {
    if (!ctx || !playing) return; secs = secs || 2; master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0, ctx.currentTime, secs / 4);
    clearTimeout(stopT); stopT = setTimeout(M.stop, secs * 1000 + 300);
  };
  M.stop = function () { clearTimeout(stopT); token++; playing = false; cur = ''; if (src) { src.stop(); src = null; } if (timer) { clearInterval(timer); timer = 0; } if (ctx && master) master.gain.setValueAtTime(0, ctx.currentTime); };
  M.playing = function () { return playing; };
  document.addEventListener('visibilitychange', function () { if (!document.hidden && ctx && playing && ctx.state !== 'running') { try { ctx.resume(); } catch (e) {} } });
  root.StepMusic = M;
})(window);
