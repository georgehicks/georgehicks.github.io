/* Bloom Scroll — game music. Two sources:
   1) Your own tracks: if audio/manifest.json lists files (for example from Suno) they play instead, one after another (a single track loops), through a gentle fade.
   2) Otherwise a built-in, endless, generated piece (no files), the same engine as Abiding Step: five families with their own harmony, scale, speed and voice
      (Dawn, Still water, Hymn, Quest, Lantern), each built round a short melodic motif that is stated, repeated, answered and inverted, and a new random melody
      every time. By default each game opens with a different family (calm ones for thinking games, Quest and Lantern for the action games); the Settings
      chips can pin one. Warm pads that breathe, a soft pluck pattern that follows the chords, a quiet low note, and for Quest a very soft pulse.
   It starts when a game opens (a tap, which iOS requires), follows the countdown down in volume, and fades out when you leave the game or wind down.
   On an iPhone the ringer switch must be on for Web Audio to be heard. */
(function (root) {
  'use strict';
  var M = {}, ctx = null, master = null, src = null, timer = 0, playing = false, base = 1.15, level = 1, tracks = null, trackBuf = {}, token = 0, stopT = 0, curMood = 'calm', style = 'vary', lastFam = '', fading = false, pvT = 0, nowFam = null, force = null;

  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  // A warm room: noise that fades away, softened so it is not hissy.
  function impulse(c, secs) {
    var n = Math.floor(c.sampleRate * secs), b = c.createBuffer(2, n, c.sampleRate);
    for (var ch = 0; ch < 2; ch++) { var d = b.getChannelData(ch), y = 0; for (var i = 0; i < n; i++) { y += ((Math.random() * 2 - 1) - y) * (0.42 - 0.3 * (i / n)); d[i] = y * Math.pow(1 - i / n, 2.4); } }
    return b;
  }
  function noiseBuf(c) { var n = Math.floor(c.sampleRate * 0.12), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return b; }

  // gen(ctx, destination, startTime, { mood: 'calm'|'play', energy: fn -> 0..1 }) -> { schedule(untilTime), bus }
  function gen(c, dest, t0, o) {
    o = o || {}; var play = o.mood === 'play', energy = o.energy || function () { return 1; };
    var verb = c.createConvolver(); verb.buffer = impulse(c, 3.6); var wet = c.createGain(); wet.gain.value = 0.6; verb.connect(wet); wet.connect(dest);
    var dry = c.createGain(); dry.gain.value = 0.75; dry.connect(dest); var bus = c.createGain(); bus.connect(dry); bus.connect(verb);
    var noise = noiseBuf(c), BEAT = 60 / 72, LEN = BEAT * 8;
    // progression A (with the tune) then B (the pattern alone). Chord tones are midi notes.
    var A = [[48, 55, 59, 64, 67], [45, 52, 60, 64, 67], [41, 48, 57, 60, 64], [43, 50, 57, 59, 62]];
    var B = [[41, 48, 57, 60, 64], [43, 50, 57, 59, 62], [40, 47, 55, 59, 62], [45, 52, 60, 64, 67]];
    var TUNE = [[[0, 76], [2, 74], [4, 72], [5.5, 74]], [[0, 72], [2, 76], [4, 74], [6, 72]], [[0, 69], [2, 72], [4, 77], [6, 76]], [[0, 74], [2, 71], [4, 67]]];   // E D C D / C E D C / A C F E / D B G
    var PAT = [[0, 1, 2, 3, 2, 1, 2, 1, 0, 1, 2, 3, 2, 1, 3, 2], [0, 2, 1, 3, 2, 3, 1, 2, 0, 2, 1, 3, 1, 2, 3, 1], [0, 1, 3, 2, 1, 2, 3, 2, 0, 3, 2, 1, 2, 1, 3, 1]];
    var S = { chordT: t0, i: 0 };

    function pad(t, notes, dur) {
      var f = c.createBiquadFilter(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain();
      f.type = 'lowpass'; f.frequency.value = 760; f.Q.value = 0.6; lfo.frequency.value = 0.09 + Math.random() * 0.05; lg.gain.value = 320; lfo.connect(lg); lg.connect(f.frequency); lfo.start(t); lfo.stop(t + dur + 3.5);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 2.4); g.gain.setValueAtTime(1, t + dur - 0.3); g.gain.linearRampToValueAtTime(0, t + dur + 3); f.connect(g); g.connect(bus);
      notes.slice(1).forEach(function (m, i) {
        [-7, 7].forEach(function (dt) { var o = c.createOscillator(), og = c.createGain(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = dt; og.gain.value = 0.0085; o.connect(og); og.connect(f); o.start(t); o.stop(t + dur + 3.2); });
        if (i % 2 === 0) { var s = c.createOscillator(), sg = c.createGain(); s.type = 'sine'; s.frequency.value = hz(m); sg.gain.value = 0.02; s.connect(sg); sg.connect(g); s.start(t); s.stop(t + dur + 3.2); }
      });
      var b = c.createOscillator(), bg = c.createGain(); b.type = 'sine'; b.frequency.value = hz(notes[0] - 12); bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(0.085, t + 1.6); bg.gain.setValueAtTime(0.085, t + dur - 0.5); bg.gain.linearRampToValueAtTime(0, t + dur + 1.8); b.connect(bg); bg.connect(dry); b.start(t); b.stop(t + dur + 2);
    }
    function kalimba(t, m, vel, pan) {
      var o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), g2 = c.createGain(); o.frequency.value = hz(m); o2.frequency.value = hz(m) * 5.4; g2.gain.value = 0.16;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.036 * vel, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0007, t + 1.25); var g3 = c.createGain(); g3.gain.setValueAtTime(1, t); g3.gain.exponentialRampToValueAtTime(0.01, t + 0.22); o2.connect(g3); g3.connect(g2); g2.connect(g); o.connect(g);
      if (c.createStereoPanner) { var p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(bus); } else g.connect(bus);
      o.start(t); o2.start(t); o.stop(t + 1.3); o2.stop(t + 1.3);
    }
    function tune(t, m, beats) {
      var o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), g2 = c.createGain(), d = Math.min(3.4, beats * BEAT * 1.4 + 0.9); o.type = 'sine'; o.frequency.value = hz(m); o2.frequency.value = hz(m) * 2; g2.gain.value = 0.28;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); o2.connect(g2); g2.connect(g); g.connect(bus); o.start(t); o2.start(t); o.stop(t + d + 0.1); o2.stop(t + d + 0.1);
    }
    function thump(t, v) { var o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.16); g.gain.setValueAtTime(0.075 * v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.3); o.connect(g); g.connect(dry); o.start(t); o.stop(t + 0.32); }
    function shaker(t, v) { var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = noise; f.type = 'bandpass'; f.frequency.value = 6500; f.Q.value = 0.8; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.012 * v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.1); s.connect(f); f.connect(g); g.connect(dry); s.start(t); s.stop(t + 0.12); }

    function chord(t, idx) {
      var cycle = Math.floor(idx / 4), pos = idx % 4, aSide = cycle % 2 === 0, notes = (aSide ? A : B)[pos], dur = LEN + 0.4, e = energy();
      pad(t, notes, dur);
      var up = notes.slice(1).map(function (m) { return m + 12; }), pat = PAT[(cycle + pos) % 3], sparse = play ? 0.9 : 0.7;
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
  // Your tracks: shuffled, each played through in turn (a single track loops).
  function playTracks(list, my) {
    var order = list.slice().sort(function () { return Math.random() - 0.5; }), i = 0, cur = null;
    function next() {
      if (my !== token || !playing) return; var name = order[i % order.length]; i++;
      var go = function (buf) { if (my !== token || !playing) return; var s = ctx.createBufferSource(); s.buffer = buf; s.loop = order.length === 1; s.connect(master); s.onended = function () { if (s === cur) next(); }; cur = s; s.start(); };
      if (trackBuf[name]) return go(trackBuf[name]);
      fetch('audio/' + encodeURIComponent(name)).then(function (r) { return r.arrayBuffer(); }).then(function (ab) { return new Promise(function (ok, bad) { ctx.decodeAudioData(ab, ok, bad); }); }).then(function (b) { trackBuf[name] = b; go(b); }).catch(function () { if (order.length > 1 && i < order.length * 2) next(); else startGen(my); });
    }
    src = { stop: function () { var s = cur; cur = null; try { if (s) s.stop(); } catch (e) {} } }; next();
  }
  // which family opens this time: the pinned one, or a fresh pick that is not the last one (calm families for thinking games, livelier ones for action games)
  function pickFam() {
    if (force && M._family(force)) return force; if (style !== 'vary' && M._family(style)) return style;
    var pool = curMood === 'play' ? ['quest', 'lantern', 'dawn'] : ['dawn', 'water', 'hymn', 'lantern'], from = pool.filter(function (x) { return x !== lastFam; });
    return from[Math.floor(Math.random() * from.length)];
  }
  function startGen(my) {
    if (my !== token || !playing) return; var id = pickFam(), fam = M._family(id), seed = Math.floor(Math.random() * 9000) + 1; lastFam = id; nowFam = { id: id, name: fam.name, seed: seed };
    var g = genFamily(ctx, master, ctx.currentTime + 0.1, { fam: fam, seed: seed }); g.schedule(ctx.currentTime + 2);
    timer = setInterval(function () { g.schedule(ctx.currentTime + 2); }, 500); src = { stop: function () { clearInterval(timer); timer = 0; g.stop(); } };
  }
  function begin() { playing = true; var my = ++token; loadManifest().then(function (list) { if (my !== token || !playing) return; if (list.length) playTracks(list, my); else startGen(my); force = null; }); }

  // Call from a tap. mood: 'calm' (thinking games) or 'play' (action games). Safe to call again while playing. A piece that was fading out is replaced by a new one.
  M.start = function (mood) {
    if (!ensure()) return false; clearTimeout(stopT); clearTimeout(pvT); mood = mood === 'play' ? 'play' : 'calm'; var wasFading = fading; fading = false;
    try { if (ctx.state !== 'running') ctx.resume(); } catch (e) {}
    master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(base * level, ctx.currentTime, 0.8);
    if (playing && (wasFading || (mood !== curMood && style === 'vary')) && !(tracks && tracks.length)) { curMood = mood; if (src) src.stop(); src = null; token++; begin(); return true; }
    curMood = mood; if (!playing) begin(); return true;
  };
  // Settings: 'vary' (a different family each game) or one family id
  M.setStyle = function (id) { style = id && id !== 'vary' && M._family(id) ? id : 'vary'; };
  M.getStyle = function () { return style; };
  // Hear a family for a few seconds (from a tap in Settings); id omitted = the next one in turn
  M.preview = function (id) {
    if (!ensure()) return null; M.stop(); force = id && M._family(id) ? id : (function () { var o = M.FAMILIES.filter(function (f) { return f.id !== lastFam; }); return o[Math.floor(Math.random() * o.length)].id; })();
    M.start('calm'); clearTimeout(pvT); pvT = setTimeout(function () { M.fadeOut(1.5); }, 12000); return nowFam;
  };
  M.now = function () { return nowFam; };
  M.setLevel = function (x) { level = Math.max(0, Math.min(1, x)); if (ctx && playing) master.gain.setTargetAtTime(base * level, ctx.currentTime, 1.2); };
  M.fadeOut = function (secs) {
    if (!ctx || !playing) return; secs = secs || 2; fading = true; clearTimeout(pvT); master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0, ctx.currentTime, secs / 4);
    clearTimeout(stopT); stopT = setTimeout(M.stop, secs * 1000 + 300);
  };
  M.stop = function () { clearTimeout(stopT); clearTimeout(pvT); fading = false; token++; playing = false; if (src) { src.stop(); src = null; } if (timer) { clearInterval(timer); timer = 0; } if (ctx && master) master.gain.setValueAtTime(0, ctx.currentTime); };
  // A soft rising chime for a win. Only when the music is on and playing (so the sound switch is respected).
  M.chime = function () {
    if (!ctx || !playing || fading || ctx.state !== 'running') return false;
    var t0 = ctx.currentTime + 0.05, out = ctx.createGain(); out.gain.value = 0.9; out.connect(ctx.destination);
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach(function (f, i) {
      var t = t0 + i * 0.13, o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f; o2.type = 'triangle'; o2.frequency.value = f * 2.005;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      var g2 = ctx.createGain(); g2.gain.value = 0.18; o2.connect(g2); g2.connect(g); o.connect(g); g.connect(out); o.start(t); o2.start(t); o.stop(t + 1.6); o2.stop(t + 1.6);
    });
    setTimeout(function () { try { out.disconnect(); } catch (e) {} }, 2600); return true;
  };
  M.playing = function () { return playing; };
  M.hasTracks = function () { return !!(tracks && tracks.length); };
  M.probe = loadManifest;
  document.addEventListener('visibilitychange', function () { if (!document.hidden && ctx && playing && ctx.state !== 'running') { try { ctx.resume(); } catch (e) {} } });
  root.MannaMusic = M;
})(window);
