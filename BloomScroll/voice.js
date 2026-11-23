/* Manna — read-aloud. Main-thread side of the Kokoro voice (see voice-worker.js). Opt-in: nothing is downloaded until you ask.
   The model generates speech a little slower than real time on many devices, so there is a queue: the card you are on has priority,
   and with auto-read on, the NEXT card's audio is prepared in the background while you listen. Finished chunks are cached for this visit. */
(function (root) {
  'use strict';
  var worker = null, ctx = null, state = 'off', voices = [], pending = {}, nid = 1, cur = null, progressCb = null, loaded = {}, waiters = [];
  var qHigh = [], qLow = [], busy = false, inflight = {}, cache = {}, order = [], gpuInfo = null, engineLoaded = null, fast = false;

  function supported() { return !!(root.Worker && (root.AudioContext || root.webkitAudioContext)); }
  function status() { return state; }                  // off | loading | ready | error
  function list() { return voices; }

  // Can this device run the model on its graphics chip? Resolves { ok, f16 }. Call once at startup.
  function detect() {
    if (gpuInfo) return Promise.resolve(gpuInfo);
    var none = { ok: false, f16: false };
    if (!root.navigator || !root.navigator.gpu) return Promise.resolve(gpuInfo = none);
    return root.navigator.gpu.requestAdapter().then(function (a) { return gpuInfo = a ? { ok: true, f16: !!(a.features && a.features.has('shader-f16')) } : none; }, function () { return gpuInfo = none; });
  }
  function gpu() { return gpuInfo || { ok: false, f16: false }; }
  function engine() { return state === 'off' ? null : engineLoaded; }

  // engine: 'gpu' (graphics chip, fast) or 'cpu' (processor, small download, slower than real time on most phones).
  function start(onProgress, eng) {
    eng = eng === 'gpu' && gpu().ok ? 'gpu' : 'cpu';
    if (state !== 'off' && engineLoaded !== eng) reset();
    engineLoaded = eng; fast = eng === 'gpu';
    progressCb = onProgress || progressCb;
    if (state === 'ready') return Promise.resolve();
    return new Promise(function (res, rej) {
      waiters.push({ res: res, rej: rej });
      if (state === 'loading') return;
      state = 'loading';
      try { worker = new Worker('voice-worker.js', { type: 'module' }); } catch (e) { return fail(e.message); }
      worker.onerror = function (e) { fail(e.message || 'The voice could not start.'); };
      worker.onmessage = function (e) {
        var m = e.data;
        if (m.type === 'progress') {
          loaded[m.file] = [m.loaded || 0, m.total || 0];
          var l = 0, t = 0; Object.keys(loaded).forEach(function (k) { l += loaded[k][0]; t += loaded[k][1]; });
          if (progressCb && t) progressCb(Math.min(1, l / t));
        } else if (m.type === 'ready') {
          voices = (m.voices || []).filter(function (v) { return /^en/.test(v.lang || 'en'); });
          state = 'ready'; waiters.splice(0).forEach(function (w) { w.res(); }); pump();
        } else if (m.type === 'audio') {
          var p = pending[m.id]; if (p) { delete pending[m.id]; p.res(m); }
        } else if (m.type === 'error') {
          if (m.id && pending[m.id]) { var q = pending[m.id]; delete pending[m.id]; q.rej(new Error(m.message)); } else fail(m.message);
        }
      };
      loaded = {};
      worker.postMessage({ type: 'load', device: fast ? 'webgpu' : 'wasm', dtype: fast ? (gpu().f16 ? 'fp16' : 'fp32') : 'q8' });
    });
  }
  function fail(msg) { state = 'error'; waiters.splice(0).forEach(function (w) { w.rej(new Error(msg || 'The voice could not load.')); }); }
  function reset() { if (worker) { worker.terminate(); worker = null; } state = 'off'; busy = false; qHigh = []; qLow = []; inflight = {}; pending = {}; }

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

  // First sentence alone (so speech starts sooner), then short chunks (~110 characters, broken at sentence ends, or at ; : , inside a long
  // sentence). The model makes speech a little slower than real time, so short chunks keep the gap between them small.
  var MAXC = 110;   // 230 once the graphics chip is doing the work (fast enough that longer chunks, which sound smoother, cost nothing)
  function maxc() { return fast ? 230 : MAXC; }
  function splitLong(x) {
    if (x.length <= maxc()) return [x];
    var parts = x.match(/[^;:,—]+[;:,—]?\s*/g) || [x], out = [], acc = '';
    parts.forEach(function (p) { if (acc && (acc + p).length > maxc()) { out.push(acc.trim()); acc = p; } else acc += p; });
    if (acc.trim()) out.push(acc.trim());
    return out;
  }
  function chunks(text) {
    var s = String(text).replace(/\s+/g, ' ').trim().match(/[^.!?…]+[.!?…]+["”’')\]]*|[^.!?…]+$/g) || [String(text)], out = [], acc = '';
    if (!s.length) return out;
    out.push(s.shift().trim());
    s.forEach(function (x) { x = x.trim(); if (!x) return; if (acc && (acc + ' ' + x).length > maxc()) { splitLong(acc).forEach(function (y) { out.push(y); }); acc = x; } else acc = acc ? acc + ' ' + x : x; });
    if (acc) splitLong(acc).forEach(function (y) { out.push(y); });
    return out.filter(Boolean);
  }

  // ---- generation queue (one chunk in flight at a time; high priority = what you're listening to) ----
  function key(t, v) { return v + '|' + t; }
  function store(k, m) { cache[k] = m; order.push(k); while (order.length > 40) delete cache[order.shift()]; }
  function enqueue(text, voice, high, job) {
    var k = key(text, voice);
    if (cache[k]) return Promise.resolve(cache[k]);
    var it = inflight[k];
    if (!it) {
      it = { text: text, voice: voice, k: k, jobs: [] };
      it.p = new Promise(function (res, rej) { it.res = res; it.rej = rej; }); it.p.catch(function () {});
      inflight[k] = it; (high ? qHigh : qLow).push(it);
    } else if (high && qLow.indexOf(it) >= 0) { qLow.splice(qLow.indexOf(it), 1); qHigh.push(it); }
    if (job) it.jobs.push(job);
    pump(); return it.p;
  }
  function dead(it) { return it.jobs.length && it.jobs.every(function (j) { return j.stopped; }) && qLow.indexOf(it) < 0 && false; }
  function pump() {
    if (busy || state !== 'ready') return;
    var it = qHigh.shift() || qLow.shift(); if (!it) return;
    if (it.jobs.length && it.jobs.every(function (j) { return j.stopped; })) { delete inflight[it.k]; it.rej(new Error('stopped')); return pump(); }
    busy = true; var id = nid++;
    pending[id] = {
      res: function (m) { busy = false; store(it.k, m); delete inflight[it.k]; it.res(m); pump(); },
      rej: function (e) { busy = false; delete inflight[it.k]; it.rej(e); pump(); }
    };
    worker.postMessage({ type: 'gen', id: id, text: it.text, voice: it.voice });
  }

  async function play(m, job) {
    if (!ctx) unlock();
    if (ctx.state !== 'running') { try { await Promise.race([ctx.resume(), sleep(700)]); } catch (e) {} }
    if (job.stopped) return;
    if (ctx.state !== 'running') throw new Error('blocked');
    return new Promise(function (res) {
      var buf = ctx.createBuffer(1, m.data.length, m.rate); buf.copyToChannel(m.data, 0);
      var src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination); job.src = src; src.onended = res; src.start();
    });
  }

  // onState('thinking' | 'playing' | 'done' | 'error')
  function speak(text, voice, onState) {
    stop(); unlock();
    var job = { stopped: false, src: null }; cur = job; var parts = chunks(text);
    var ps = parts.map(function (p) { return enqueue(p, voice, true, job); });
    (async function () {
      try {
        if (onState) onState('thinking');
        for (var i = 0; i < ps.length; i++) {
          var m = await ps[i]; if (job.stopped) return;
          if (onState) onState('playing');
          await play(m, job); if (job.stopped) return;
          if (i + 1 < ps.length && onState) onState('thinking');
        }
        if (!job.stopped) { cur = null; if (onState) onState('done'); }
      } catch (e) { if (!job.stopped) { cur = null; if (onState) onState(e && e.message === 'blocked' ? 'blocked' : 'error'); } }
    })();
    return job;
  }
  // Warm the cache for text you are about to read (low priority; does nothing until the voice is ready).
  function prefetch(text, voice) { if (state !== 'ready' || !text) return; chunks(text).forEach(function (p) { enqueue(p, voice, false, null); }); }
  function stop() { if (cur) { cur.stopped = true; try { if (cur.src) cur.src.stop(); } catch (e) {} cur = null; } }
  function speaking() { return !!cur; }

  root.MannaVoice = { supported: supported, status: status, list: list, start: start, detect: detect, gpu: gpu, engine: engine, unlock: unlock, speak: speak, prefetch: prefetch, stop: stop, speaking: speaking, reset: reset, chunks: chunks };
})(typeof window !== 'undefined' ? window : globalThis);
