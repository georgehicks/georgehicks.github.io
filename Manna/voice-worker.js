/* Manna — voice worker. Runs the Kokoro text-to-speech model (kokoro-js, Apache-2.0) off the main thread so scrolling stays smooth.
   The model (about 90 MB, quantised) downloads once from Hugging Face and is cached by the browser; after that it works offline.
   Nothing you read is sent anywhere. Module worker: needs Safari 15+. */
import { KokoroTTS } from 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm';

const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
let tts = null, loading = null, lastPost = 0;

async function load() {
  if (tts) return tts;
  if (!loading) loading = KokoroTTS.from_pretrained(MODEL, {
    dtype: 'q8', device: 'wasm',
    progress_callback: p => { if (p && p.status === 'progress') { const n = performance.now(); if (n - lastPost > 250 || p.loaded === p.total) { lastPost = n; postMessage({ type: 'progress', file: p.file, loaded: p.loaded, total: p.total }); } } }
  }).then(t => { tts = t; return t; });
  return loading;
}

self.onmessage = async e => {
  const m = e.data;
  try {
    if (m.type === 'load') {
      const t = await load();
      const v = t.voices || {};
      postMessage({ type: 'ready', voices: Object.keys(v).map(id => ({ id, name: v[id].name, lang: v[id].language, gender: v[id].gender })) });
    } else if (m.type === 'gen') {
      const t = await load();
      const a = await t.generate(m.text, { voice: m.voice });
      const data = new Float32Array(a.audio);
      postMessage({ type: 'audio', id: m.id, data, rate: a.sampling_rate }, [data.buffer]);
    }
  } catch (err) {
    postMessage({ type: 'error', id: m.id, message: String(err && err.message || err) });
  }
};
