#!/usr/bin/env python3
"""Local helper for building BloomScroll's voice clips (see generate.html).
Serves the repo on http://127.0.0.1:8767/ and turns the 16-bit PCM the page posts into MP3 files in BloomScroll/voice/.
Needs the 'lameenc' package:  pip3 install lameenc   (or  PYTHONPATH=<dir with lameenc> python3 server.py)
Run it, then open http://127.0.0.1:8767/_scripts/voice-build/generate.html in a WebGPU browser."""
import http.server, socketserver, os, json, sys
from urllib.parse import urlparse, parse_qs
import lameenc

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
VOICE = os.path.join(ROOT, 'BloomScroll', 'voice')
MAN = os.path.join(VOICE, 'manifest.json')
os.makedirs(VOICE, exist_ok=True)
BITRATE = 32   # kbps, mono: plenty for one speaking voice
manifest = {'voice': 'am_adam', 'kbps': BITRATE, 'clips': {}}
if os.path.exists(MAN):
    manifest = json.load(open(MAN))

def save_manifest():
    manifest['bytes'] = sum(os.path.getsize(os.path.join(VOICE, f)) for f in os.listdir(VOICE) if f.endswith('.mp3'))
    manifest['seconds'] = round(sum(manifest['clips'].values()))
    tmp = MAN + '.tmp'
    json.dump(manifest, open(tmp, 'w'), separators=(',', ':'), sort_keys=True)
    os.replace(tmp, MAN)

def encode(pcm, rate):
    e = lameenc.Encoder()
    e.set_bit_rate(BITRATE); e.set_in_sample_rate(rate); e.set_out_sample_rate(rate)
    e.set_channels(1); e.set_quality(2)
    return bytes(e.encode(pcm)) + bytes(e.flush())

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0'); super().end_headers()
    def log_message(self, *a): pass
    def reply(self, obj):
        b = json.dumps(obj).encode(); self.send_response(200)
        self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        if self.path.startswith('/vb/have'):
            return self.reply({h: s for h, s in manifest['clips'].items() if os.path.exists(os.path.join(VOICE, h + '.mp3'))})
        return super().do_GET()
    def do_POST(self):
        u = urlparse(self.path); q = parse_qs(u.query); n = int(self.headers.get('Content-Length', 0)); body = self.rfile.read(n)
        if u.path == '/vb/put':
            name = q['name'][0]; rate = int(q.get('rate', ['24000'])[0])
            assert name.isalnum() and len(name) == 16
            mp3 = encode(body, rate)
            open(os.path.join(VOICE, name + '.mp3'), 'wb').write(mp3)
            manifest['clips'][name] = round(len(body) / 2 / rate, 1); save_manifest()
            return self.reply({'ok': True, 'bytes': len(mp3), 'clips': len(manifest['clips'])})
        if u.path == '/vb/prune':   # body: JSON list of every hash the app still uses; clips for removed cards are deleted
            keep = set(json.loads(body)); gone = []
            for f in os.listdir(VOICE):
                if f.endswith('.mp3') and f[:-4] not in keep: os.remove(os.path.join(VOICE, f)); gone.append(f[:-4])
            for h in list(manifest['clips']):
                if h not in keep: del manifest['clips'][h]
            save_manifest(); return self.reply({'removed': gone, 'clips': len(manifest['clips'])})
        self.send_error(404)

socketserver.ThreadingTCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(('127.0.0.1', 8767), H) as s:
    print('voice build server on http://127.0.0.1:8767/', flush=True); s.serve_forever()
