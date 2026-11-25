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

  // ===== motif families: genuinely different harmony, scale, rhythm and voice, with a seeded melodic MOTIF (a short idea that is stated, repeated, answered, inverted) =====
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  function noteName(m) { return NOTE[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }
  var DAWN_A = [[48, 55, 59, 64, 67], [45, 52, 60, 64, 67], [41, 48, 57, 60, 64], [43, 50, 57, 59, 62]];
  var DAWN_B = [[41, 48, 57, 60, 64], [43, 50, 57, 59, 62], [40, 47, 55, 59, 62], [45, 52, 60, 64, 67]];
  var DAWN_TUNE = [[[0, 76], [2, 74], [4, 72], [5.5, 74]], [[0, 72], [2, 76], [4, 74], [6, 72]], [[0, 69], [2, 72], [4, 77], [6, 76]], [[0, 74], [2, 71], [4, 67]]];
  var PAT3 = [[0, 1, 2, 3, 2, 1, 2, 1, 0, 1, 2, 3, 2, 1, 3, 2], [0, 2, 1, 3, 2, 3, 1, 2, 0, 2, 1, 3, 1, 2, 3, 1], [0, 1, 3, 2, 1, 2, 3, 2, 0, 3, 2, 1, 2, 1, 3, 1]];
  var FAMILIES = [
    { id: 'dawn', name: 'Dawn', desc: 'The one you know: slow pads, soft kalimba, a small tune that returns.', bpm: 72, density: 0.7, chordBeats: 8, melody: 'tune', arp: { kind: 'arp', sparse: 0.7 }, pulse: 'none', drone: false, padLP: 760,
      progs: [{ names: ['C', 'Am', 'F', 'G'], chords: DAWN_A }, { names: ['F', 'G', 'Em', 'Am'], chords: DAWN_B }] },
    { id: 'water', name: 'Still water', desc: 'Slow and open: a low hum, long bell notes, almost no rhythm. For thinking.', bpm: 52, density: 0.5, chordBeats: 8, melody: 'motif', arp: { kind: 'arp', sparse: 0.18 }, pulse: 'none', drone: true, padLP: 600, verb: 4.6,
      motif: { base: 74, scale: [0, 2, 4, 7, 9], rhythms: [[0, 3], [0, 2.5], [0, 1.5, 4]], start: [0, 1, 2], steps: [-1, 1, 2, -2, 1], lo: -2, hi: 5, at: [0, 4], chance: 0.55, voice: 'bell' },
      progs: [{ names: ['Dmaj9', 'Gmaj7', 'Bm7', 'Asus2'], chords: [[50, 57, 61, 64, 66], [43, 54, 59, 62, 66], [47, 54, 57, 62, 66], [45, 52, 57, 59, 64]] },
              { names: ['Bm7', 'Gmaj7', 'Dmaj9', 'Asus2'], chords: [[47, 54, 57, 62, 66], [43, 54, 59, 62, 66], [50, 57, 61, 64, 66], [45, 52, 57, 59, 64]] }] },
    { id: 'hymn', name: 'Hymn', desc: 'Warm and plain, like a hymn at an easy pace: simple chords, a stepwise tune.', bpm: 63, density: 0.6, chordBeats: 8, melody: 'motif', arp: { kind: 'arp', sparse: 0.28 }, pulse: 'none', drone: false, padLP: 900,
      motif: { base: 67, scale: [0, 2, 4, 5, 7, 9, 11], rhythms: [[0, 1, 2, 3], [0, 1, 2, 3.5], [0, 2, 3]], start: [0, 2, 4], steps: [1, -1, 1, -1, 0, 2, -2], lo: -2, hi: 6, at: [0, 4], chance: 0.8, voice: 'bell' },
      progs: [{ names: ['G', 'C', 'G', 'D'], chords: [[43, 55, 59, 62, 67], [48, 55, 60, 64, 67], [43, 55, 59, 62, 67], [50, 57, 62, 66, 69]] },
              { names: ['Em', 'C', 'G', 'D'], chords: [[40, 55, 59, 64, 67], [48, 55, 60, 64, 67], [43, 55, 59, 62, 67], [50, 57, 62, 66, 69]] }] },
    { id: 'quest', name: 'Quest', desc: 'Steady and a little urgent, like a game level: a running pattern and a melody that develops.', bpm: 100, density: 0.9, chordBeats: 8, melody: 'motif', arp: { kind: 'ostinato', sparse: 0.92 }, pulse: 'drive', drone: false, padLP: 1100,
      motif: { base: 74, scale: [0, 2, 3, 5, 7, 9, 10], rhythms: [[0, 0.5, 1, 2], [0, 1, 1.5, 2.5], [0, 0.75, 1.5, 3], [0, 1, 2, 2.5, 3]], start: [0, 2, 4], steps: [1, -1, 2, -2, 0, 1], lo: -3, hi: 7, at: [0, 4], chance: 0.9, voice: 'pluck' },
      progs: [{ names: ['Dm', 'F', 'C', 'G'], chords: [[38, 53, 57, 62, 65], [41, 57, 60, 65, 69], [48, 55, 60, 64, 67], [43, 55, 59, 62, 67]] },
              { names: ['Dm', 'Am', 'F', 'C'], chords: [[38, 53, 57, 62, 65], [45, 52, 57, 60, 64], [41, 57, 60, 65, 69], [48, 55, 60, 64, 67]] }] },
    { id: 'lantern', name: 'Lantern', desc: 'Patient and a little wistful: a small repeating pattern under sparse bell notes.', bpm: 80, density: 0.8, chordBeats: 8, melody: 'motif', arp: { kind: 'arp', sparse: 0.85 }, pulse: 'soft', drone: false, padLP: 800,
      motif: { base: 69, scale: [0, 2, 3, 5, 7, 8, 10], rhythms: [[0, 1.5, 3], [0, 2, 3.5], [0, 1, 3]], start: [0, 2, 4], steps: [1, -1, -2, 2, 1, -1], lo: -2, hi: 6, at: [0, 4], chance: 0.6, voice: 'bell' },
      progs: [{ names: ['Am', 'F', 'Am', 'F'], chords: [[45, 52, 57, 60, 64], [41, 53, 57, 60, 65], [45, 52, 57, 60, 64], [41, 53, 57, 60, 65]] },
              { names: ['Am', 'F', 'C', 'G'], chords: [[45, 52, 57, 60, 64], [41, 53, 57, 60, 65], [48, 55, 60, 64, 67], [43, 50, 55, 59, 62]] }] },
  ];
  M.FAMILIES = FAMILIES.map(function (f) { return { id: f.id, name: f.name, desc: f.desc, bpm: f.bpm, density: f.density }; });

  // a motif: a few notes (beat, scale degree) built once per seed; each statement of it is varied (repeated, moved up, inverted, or an answer that resolves home)
  function makeMotif(rnd, fam) {
    var sp = fam.motif; if (!sp) return [];
    var tmpl = sp.rhythms[Math.floor(rnd() * sp.rhythms.length)], deg = sp.start[Math.floor(rnd() * sp.start.length)], out = [];
    tmpl.forEach(function (beat, i) { if (i > 0) deg += sp.steps[Math.floor(rnd() * sp.steps.length)]; deg = Math.max(sp.lo, Math.min(sp.hi, deg)); out.push({ beat: beat, deg: deg }); });
    return out;
  }
  function motifMidi(fam, d) { var sc = fam.motif.scale, n = sc.length, oct = Math.floor(d / n), i = ((d % n) + n) % n; return fam.motif.base + 12 * oct + sc[i]; }
  function vary(motif, kind, sp) {
    var first = motif[0].deg, clamp = function (d) { return Math.max(sp.lo, Math.min(sp.hi, d)); };
    return motif.map(function (n, i) {
      var d = n.deg;
      if (kind === 1) d = n.deg + 1; else if (kind === 2) d = first + (first - n.deg); else if (kind === 3 && i === motif.length - 1) d = 0;
      return { beat: n.beat, deg: clamp(d) };
    });
  }
  function snapToChord(fam, d, chord) {   // on a strong beat, lean to a note that belongs to the chord
    var pcs = chord.slice(1).map(function (m) { return m % 12; }), best = d, bd = 99;
    for (var k = -2; k <= 2; k++) { var m = motifMidi(fam, d + k) % 12; if (pcs.indexOf(m) >= 0 && Math.abs(k) < bd) { best = d + k; bd = Math.abs(k); } }
    return best;
  }

  function genFamily(c, dest, t0, o) {
    var fam = o.fam, rnd = mulberry32(Math.imul((o.seed | 0) ^ 0x9E3779B9, 2246822519) + 104729), SH = o.shift || 0, BPM = o.bpm || fam.bpm, BEAT = 60 / BPM, LEN = BEAT * fam.chordBeats;
    var dens = o.density != null ? o.density : fam.density, busy = Math.max(0.05, dens / fam.density);
    function hz(m) { return 440 * Math.pow(2, (m + SH - 69) / 12); }
    var out = c.createGain(); out.gain.value = 1; out.connect(dest);
    var verb = c.createConvolver(); verb.buffer = impulse(c, fam.verb || 3.6); var wet = c.createGain(); wet.gain.value = 0.6; verb.connect(wet); wet.connect(out);
    var dry = c.createGain(); dry.gain.value = 0.75; dry.connect(out); var bus = c.createGain(); bus.connect(dry); bus.connect(verb);
    rnd(); rnd(); rnd();   // the first values of a seeded generator are alike across nearby seeds; skip them
    var noise = noiseBuf(c), motif = makeMotif(rnd, fam), S = { chordT: t0, i: 0, n: 0 };

    function pad(t, notes, dur) {
      var f = c.createBiquadFilter(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain();
      f.type = 'lowpass'; f.frequency.value = fam.padLP; f.Q.value = 0.6; lfo.frequency.value = 0.09 + rnd() * 0.05; lg.gain.value = fam.padLP * 0.42; lfo.connect(lg); lg.connect(f.frequency); lfo.start(t); lfo.stop(t + dur + 3.5);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 2.4); g.gain.setValueAtTime(1, t + dur - 0.3); g.gain.linearRampToValueAtTime(0, t + dur + 3); f.connect(g); g.connect(bus);
      notes.slice(1).forEach(function (m, i) {
        [-7, 7].forEach(function (dt) { var o2 = c.createOscillator(), og = c.createGain(); o2.type = 'sawtooth'; o2.frequency.value = hz(m); o2.detune.value = dt; og.gain.value = 0.0085; o2.connect(og); og.connect(f); o2.start(t); o2.stop(t + dur + 3.2); });
        if (i % 2 === 0) { var sn = c.createOscillator(), sg = c.createGain(); sn.type = 'sine'; sn.frequency.value = hz(m); sg.gain.value = 0.02; sn.connect(sg); sg.connect(g); sn.start(t); sn.stop(t + dur + 3.2); }
      });
      var b = c.createOscillator(), bg = c.createGain(); b.type = 'sine'; b.frequency.value = hz(notes[0] - 12); bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(0.085, t + 1.6); bg.gain.setValueAtTime(0.085, t + dur - 0.5); bg.gain.linearRampToValueAtTime(0, t + dur + 1.8); b.connect(bg); bg.connect(dry); b.start(t); b.stop(t + dur + 2);
    }
    function droneNote(t, dur, m) {
      [m, m + 7].forEach(function (mm, i) { var o2 = c.createOscillator(), g = c.createGain(); o2.type = 'sine'; o2.frequency.value = hz(mm); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(i ? 0.018 : 0.03, t + 3); g.gain.setValueAtTime(i ? 0.018 : 0.03, t + dur - 0.4); g.gain.linearRampToValueAtTime(0, t + dur + 3); o2.connect(g); g.connect(dry); o2.start(t); o2.stop(t + dur + 3.1); });
    }
    function pluck(t, m, vel, pan) {
      var o1 = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), g2 = c.createGain(); o1.frequency.value = hz(m); o2.frequency.value = hz(m) * 5.4; g2.gain.value = 0.16;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.036 * vel, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0007, t + 1.25); var g3 = c.createGain(); g3.gain.setValueAtTime(1, t); g3.gain.exponentialRampToValueAtTime(0.01, t + 0.22); o2.connect(g3); g3.connect(g2); g2.connect(g); o1.connect(g);
      if (c.createStereoPanner) { var p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(bus); } else g.connect(bus);
      o1.start(t); o2.start(t); o1.stop(t + 1.3); o2.stop(t + 1.3);
    }
    function bell(t, m, beats, vel) {
      var o1 = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), g2 = c.createGain(), d = Math.min(3.8, beats * BEAT * 1.4 + 0.9); o1.type = 'sine'; o1.frequency.value = hz(m); o2.frequency.value = hz(m) * 2; g2.gain.value = 0.28;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05 * vel, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + d); o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(bus); o1.start(t); o2.start(t); o1.stop(t + d + 0.1); o2.stop(t + d + 0.1);
    }
    function thump(t, v) { var o1 = c.createOscillator(), g = c.createGain(); o1.type = 'sine'; o1.frequency.setValueAtTime(95, t); o1.frequency.exponentialRampToValueAtTime(42, t + 0.16); g.gain.setValueAtTime(0.075 * v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.3); o1.connect(g); g.connect(dry); o1.start(t); o1.stop(t + 0.32); }
    function shaker(t, v) { var sn = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); sn.buffer = noise; f.type = 'bandpass'; f.frequency.value = 6500; f.Q.value = 0.8; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.012 * v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.1); sn.connect(f); f.connect(g); g.connect(dry); sn.start(t); sn.stop(t + 0.12); }
    function lead(t, m, beats, vel) { if (fam.motif && fam.motif.voice === 'pluck') pluck(t, m, vel * 1.6, 0); else bell(t, m, beats, vel); }

    var plen = fam.progs[0].chords.length;
    function chord(t, idx) {
      var cycle = Math.floor(idx / plen), pi = cycle % fam.progs.length, pos = idx % plen, notes = fam.progs[pi].chords[pos], dur = LEN + 0.4;
      pad(t, notes, dur); if (fam.drone) droneNote(t, dur, fam.progs[0].chords[0][0] - 12 + 12);
      // the accompaniment pattern
      var up = notes.slice(1).map(function (m) { return m + 12; }), slots = fam.chordBeats * 2, sparse = Math.min(1, fam.arp.sparse * busy);
      if (fam.arp.kind === 'ostinato') {
        var order = [0, 1, 2, 3, 2, 1, 2, 1];
        for (var k = 0; k < slots; k++) { if (rnd() > sparse) continue; var accent = k % 4 === 0 ? 1 : k % 2 === 0 ? 0.8 : 0.62; pluck(t + k * BEAT / 2, up[order[k % 8] % up.length], accent * (0.85 + rnd() * 0.3), (k % 2 ? 0.3 : -0.3)); }
      } else {
        var pat = PAT3[(cycle + pos) % 3];
        for (var k2 = 0; k2 < slots; k2++) { if (rnd() > sparse) continue; var tt = t + k2 * BEAT / 2 + (rnd() - 0.5) * 0.02, ac = k2 % 4 === 0 ? 1 : k2 % 2 === 0 ? 0.8 : 0.62; pluck(tt, up[pat[k2 % 16] % up.length] + (k2 % 8 === 7 && rnd() < 0.4 ? 12 : 0), ac * (0.85 + rnd() * 0.3), (k2 % 2 ? 0.35 : -0.35) + (rnd() - 0.5) * 0.3); }
      }
      // the melody
      if (fam.melody === 'tune') { if (pi === 0) DAWN_TUNE[pos % 4].forEach(function (n) { bell(Math.max(t, t + n[0] * BEAT), n[1], 2, 1); }); }
      else if (fam.melody === 'motif') {
        fam.motif.at.forEach(function (at) {
          if (rnd() > Math.min(1, fam.motif.chance * busy)) return;
          var kind = S.n % 4 === 0 || rnd() < 0.25 ? 0 : [1, 2, 3, 0][Math.floor(rnd() * 4)]; S.n++;
          var v = vary(motif, kind, fam.motif);
          v.forEach(function (n, i) {
            var d = i === 0 && at === 0 ? snapToChord(fam, n.deg, notes) : n.deg, next = v[i + 1] ? v[i + 1].beat - n.beat : 2;
            lead(t + (at + n.beat) * BEAT, motifMidi(fam, d), next, 0.9 + rnd() * 0.2);
          });
        });
      }
      // the pulse
      if (fam.pulse === 'drive') { for (var b = 0; b < fam.chordBeats; b++) { if (b % 4 === 0) thump(t + b * BEAT, 1); else if (b % 4 === 2) thump(t + b * BEAT, 0.45); shaker(t + b * BEAT + BEAT / 2, b % 2 ? 0.7 : 1); } }
      else if (fam.pulse === 'soft') { thump(t, 0.35); thump(t + 4 * BEAT, 0.2); for (var b2 = 0; b2 < fam.chordBeats; b2 += 2) shaker(t + b2 * BEAT + BEAT / 2, 0.4); }
    }
    return {
      motif: motif, bus: bus,
      schedule: function (until) { while (S.chordT < until) { chord(S.chordT, S.i); S.i++; S.chordT += LEN; } },
      stop: function () { out.gain.cancelScheduledValues(c.currentTime); out.gain.setTargetAtTime(0, c.currentTime, 0.2); setTimeout(function () { try { out.disconnect(); } catch (e) {} }, 1300); },
    };
  }
  M._genFamily = genFamily; M._family = function (id) { for (var i = 0; i < FAMILIES.length; i++) if (FAMILIES[i].id === id) return FAMILIES[i]; return null; };
  var lastInfo = null;
  // Call from a tap. opts: { seed, shift (semitones), bpm, density (0..1) }. Returns what is playing, including the motif's notes.
  M.startFamily = function (id, opts) {
    var fam = M._family(id); if (!fam || !ensure()) return null; opts = opts || {}; clearTimeout(stopT);
    try { if (ctx.state !== 'running') ctx.resume(); } catch (e) {}
    master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(base * vol, ctx.currentTime, 0.4);
    if (src) { src.stop(); src = null; } if (timer) { clearInterval(timer); timer = 0; }
    var seed = opts.seed != null ? opts.seed | 0 : Math.floor(Math.random() * 9000) + 1;
    var g = genFamily(ctx, master, ctx.currentTime + 0.15, { fam: fam, seed: seed, shift: opts.shift || 0, bpm: opts.bpm, density: opts.density });
    g.schedule(ctx.currentTime + 2); timer = setInterval(function () { g.schedule(ctx.currentTime + 2); }, 500);
    src = { stop: function () { clearInterval(timer); timer = 0; g.stop(); } }; playing = true; cur = 'fam:' + id; ++token;
    lastInfo = { id: fam.id, name: fam.name, seed: seed, bpm: opts.bpm || fam.bpm, shift: opts.shift || 0, density: opts.density != null ? opts.density : fam.density,
                 chords: fam.progs[0].names.join(' – '), motif: fam.melody === 'motif' ? g.motif.map(function (n) { return { beat: n.beat, name: noteName(motifMidi(fam, n.deg) + (opts.shift || 0)) }; }) : [] };
    return lastInfo;
  };
  M.info = function () { return lastInfo; };

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
