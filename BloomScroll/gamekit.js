/* Bloom Scroll — game kit. Shared by every game: the Easy / Normal / Hard picker that opens each one, the little strip above the board
   (level, status, New game), remembered level and best scores, and a few helpers. A game is { id, title, blurb, levels:{easy,normal,hard}, make(level, host, api) }
   where make returns { stop(), restart() }. Nothing here ever shows a game-over screen that stings. */
(function (root) {
  'use strict';
  var K = {}, LV = ['easy', 'normal', 'hard'], NM = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };

  function jget(k) { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } }
  function jset(k, o) { try { localStorage.setItem(k, JSON.stringify(o)); } catch (e) {} }
  var LK = 'manna.glevel', BK = 'manna.gbest';
  K.last = function (id) { var l = jget(LK)[id]; return LV.indexOf(l) >= 0 ? l : 'normal'; };
  K.best = function (id, lv) { return jget(BK)[id + '.' + lv] || 0; };
  K.setBest = function (id, lv, v, lowerBetter) {
    var o = jget(BK), k = id + '.' + lv;
    if (o[k] == null || (lowerBetter ? v < o[k] : v > o[k])) { o[k] = v; jset(BK, o); return true; }
    return false;
  };

  K.rand = function (a, b) { return a + Math.random() * (b - a); };
  K.ri = function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); };
  K.shuffle = function (a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  K.el = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  K.btn = function (cls, text, fn) { var b = K.el('button', cls, text); b.type = 'button'; if (fn) b.addEventListener('click', fn); return b; };

  K.canvas = function (host) {
    var cv = document.createElement('canvas'); host.appendChild(cv);
    var o = { cv: cv, ctx: cv.getContext('2d'), W: 0, H: 0 };
    o.size = function () {
      var r = host.getBoundingClientRect(), d = Math.min(2, root.devicePixelRatio || 1);
      o.W = Math.max(200, r.width); o.H = Math.max(260, r.height);
      cv.width = o.W * d; cv.height = o.H * d; cv.style.width = o.W + 'px'; cv.style.height = o.H + 'px';
      o.ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    o.size(); return o;
  };
  // Pull-back aiming that respects the edge of the screen. A drag that starts at (sx, sy) and ends at (x, y) pulls back by (sx-x, sy-y).
  // If the finger would run out of room before a full-power pull (you cannot drag off the phone), the room that IS there counts as a
  // full pull, so a drag from near an edge still reaches full power. Returns the effective pull vector (never longer than maxPull)
  // and pw, 0 to 1. Coordinates are in the same space as W x H (the canvas).
  K.pull = function (sx, sy, x, y, W, H, maxPull) {
    var dx = sx - x, dy = sy - y, l = Math.hypot(dx, dy);
    if (l < 1e-6) return { dx: 0, dy: 0, l: 0, pw: 0 };
    var ux = -dx / l, uy = -dy / l, M = 14;      // the way the finger is travelling
    var tx = ux > 0 ? (W - M - sx) / ux : ux < 0 ? (sx - M) / -ux : 1e9, ty = uy > 0 ? (H - M - sy) / uy : uy < 0 ? (sy - M) / -uy : 1e9;
    var room = Math.max(0, Math.min(tx, ty)), s = room >= maxPull ? 1 : maxPull / Math.max(room, maxPull * 0.38), le = Math.min(l * s, maxPull);
    return { dx: dx / l * le, dy: dy / l * le, l: le, pw: le / maxPull };
  };
  K.loop = function (fn) {
    var raf = 0, last = 0, on = true;
    function tick(t) { if (!on) return; var dt = Math.min(0.05, (t - (last || t)) / 1000); last = t; fn(dt); raf = requestAnimationFrame(tick); }
    raf = requestAnimationFrame(tick);
    return function () { on = false; cancelAnimationFrame(raf); };
  };
  var styled = {};
  K.css = function (id, text) { if (styled[id]) return; styled[id] = 1; var s = document.createElement('style'); s.textContent = text; document.head.appendChild(s); };

  K.css('kit', '' +
    '.kit{position:absolute;inset:0;display:flex;flex-direction:column;color:var(--ink,#EDE8DC);-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}' +
    '.kit-strip{display:flex;align-items:center;gap:.5rem;padding:.35rem .5rem;min-height:46px;flex:none;border-bottom:1px solid rgba(255,255,255,.06)}' +
    '.kit-strip button{min-height:36px;border:1px solid var(--border,#2B3252);background:var(--surface,#171B2E);color:var(--ink-muted,#A2A9BE);border-radius:999px;padding:.2rem .85rem;font-size:.88rem}' +
    '.kit-strip button:active{background:var(--surface-2,#1F2440)}' +
    '.kit-mid{flex:1;min-width:0;text-align:center;font-size:.85rem;color:var(--ink-muted,#A2A9BE);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.kit-host{position:relative;flex:1;min-height:0;overflow:hidden}' +
    '.kit-pick{flex:1;display:flex;flex-direction:column;justify-content:center;padding:1.2rem 1.3rem;gap:.7rem;overflow:auto}' +
    '.kit-t{font-family:var(--serif,Georgia,serif);font-size:1.7rem;color:var(--gold,#F2C879);text-align:center}' +
    '.kit-s{text-align:center;color:var(--ink-muted,#A2A9BE);font-family:var(--serif,Georgia,serif);font-style:italic;margin-bottom:.4rem}' +
    '.kit-lv{display:block;width:100%;text-align:left;padding:.85rem 1.05rem;border-radius:16px;border:1px solid var(--border,#2B3252);background:var(--surface,#171B2E);color:var(--ink,#EDE8DC)}' +
    '.kit-lv b{display:flex;justify-content:space-between;font-family:var(--serif,Georgia,serif);font-weight:normal;font-size:1.15rem}' +
    '.kit-lv b em{font-style:normal;font-family:var(--sans,sans-serif);font-size:.78rem;color:var(--gold,#F2C879)}' +
    '.kit-lv span{display:block;color:var(--ink-muted,#A2A9BE);font-size:.88rem;margin-top:.1rem}' +
    '.kit-lv.last{border-color:var(--gold,#F2C879)}' +
    '.kit-msg{position:absolute;left:0;right:0;top:38%;text-align:center;pointer-events:none;font-family:var(--serif,Georgia,serif);font-size:1.4rem;color:var(--ink,#EDE8DC);text-shadow:0 2px 14px #000}' +
    '@keyframes kitWin{from{opacity:0;transform:translateY(14px) scale(.94);visibility:hidden}1%{visibility:visible}to{opacity:1;transform:none;visibility:visible}}' +
    '@keyframes kitGlow{0%,100%{text-shadow:0 0 14px rgba(242,200,121,.35)}50%{text-shadow:0 0 26px rgba(242,200,121,.75)}}' +
    '@keyframes kitStar{from{opacity:0;transform:scale(.2) rotate(-40deg)}to{opacity:1;transform:none}}' +
    '.kit-win{position:absolute;inset:0;z-index:6;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 45%,rgba(30,26,12,.55),rgba(4,6,14,.78));animation:kitWin .7s ease-out both;animation-delay:var(--wd,.9s)}' +
    '.kit-wc{width:min(86%,340px);display:flex;flex-direction:column;gap:.55rem;text-align:center;padding:1.2rem 1rem;border-radius:20px;border:1px solid rgba(242,200,121,.45);background:rgba(14,18,34,.94);box-shadow:0 12px 44px rgba(0,0,0,.65),0 0 40px rgba(242,200,121,.12)}' +
    '.kit-wc h3{margin:0;font-family:var(--serif,Georgia,serif);font-weight:normal;font-size:1.6rem;color:var(--gold,#F2C879);animation:kitGlow 2.6s ease-in-out infinite}' +
    '.kit-wc p{margin:0;color:var(--ink-muted,#A2A9BE);font-family:var(--serif,Georgia,serif);font-style:italic}' +
    '.kit-ws{font-size:2rem;letter-spacing:.2em;color:var(--gold,#F2C879)}.kit-ws b{display:inline-block;font-weight:normal;animation:kitStar .5s ease-out both}.kit-ws i{font-style:normal;opacity:.25}' +
    '.kit-wc button{min-height:46px;border-radius:12px;border:1px solid var(--border,#2B3252);background:var(--surface,#171B2E);color:var(--ink,#EDE8DC);font-size:1rem}' +
    '.kit-wc button.pri{border-color:var(--gold,#F2C879);color:var(--gold,#F2C879);background:rgba(60,52,24,.55)}.kit-wc button.quiet{border-color:transparent;background:none;color:var(--ink-muted,#A2A9BE);min-height:38px;font-size:.9rem}' +
    '.kit-bar{display:flex;gap:.45rem;justify-content:center;padding:.5rem;flex:none}' +
    '.kit-bar button{flex:1;max-width:9rem;min-height:44px;border:1px solid var(--border,#2B3252);background:var(--surface,#171B2E);color:var(--ink,#EDE8DC);border-radius:12px;font-size:.95rem}' +
    '.kit-bar button.on{border-color:var(--gold,#F2C879);background:var(--surface-2,#1F2440)}' +
    '.kit-bar button:disabled{opacity:.4}');

  // def: { id, title, blurb, levels:{easy,normal,hard}, make(level, host, api) -> { stop(), restart() } }
  K.run = function (box, def) {
    var wrap = K.el('div', 'kit'); box.appendChild(wrap);
    var cur = null, level = null, stopWatch = null;
    function clear() { if (stopWatch) { stopWatch(); stopWatch = null; } if (cur && cur.stop) { try { cur.stop(); } catch (e) {} } cur = null; wrap.innerHTML = ''; }
    function picker() {
      clear(); level = null;
      var p = K.el('div', 'kit-pick'); p.appendChild(K.el('div', 'kit-t', def.title)); p.appendChild(K.el('div', 'kit-s', def.blurb || 'Choose how it should feel tonight.'));
      var last = K.last(def.id);
      LV.forEach(function (l) {
        var b = K.el('button', 'kit-lv' + (l === last ? ' last' : '')), bs = K.best(def.id, l);
        b.type = 'button'; b.innerHTML = '<b>' + NM[l] + '<em>' + (bs && def.bestLabel ? def.bestLabel(bs) : '') + '</em></b><span>' + def.levels[l] + '</span>';
        b.addEventListener('click', function () { play(l); }); p.appendChild(b);
      });
      wrap.appendChild(p);
    }
    function play(l) {
      clear(); level = l; var o = jget(LK); o[def.id] = l; jset(LK, o);
      var strip = K.el('div', 'kit-strip'), mid = K.el('div', 'kit-mid'), host = K.el('div', 'kit-host');
      var lb = K.btn('', NM[l] + ' ▾', picker), nb = K.btn('', 'New game', function () { var wc = host.querySelector('.kit-win'); if (wc) wc.remove(); if (cur && cur.restart) cur.restart(); });
      strip.appendChild(lb); strip.appendChild(mid); strip.appendChild(nb); wrap.appendChild(strip); wrap.appendChild(host);
      var api = {
        level: l, mid: mid, host: host,
        status: function (t) { mid.textContent = t || ''; },
        best: function () { return K.best(def.id, l); },
        setBest: function (v, low) { return K.setBest(def.id, l, v, low); },
        // A small celebration that belongs to this game alone (see cheers.js: one per game, each different). name = the game's own; arg is passed through.
        cheer: function (name, arg) { var C = root.MannaCheer; if (C && C[name]) { try { C[name](host, arg); } catch (e) {} } },
        // A proper win. The game's own celebration (o.cheer names it, o.arg goes to it) starts right away, then (after a breath, so the moment is seen) a card:
        // o = { cheer, arg, title, sub, stars (0-3), buttons: [{ label, fn, pri }], again: 'Play again' label, noAgain, noLevel, look (adds 'Look at the board'), delay (seconds) }
        // Buttons run after the card closes. Returns the card element (it is in the page straight away, hidden until its moment).
        win: function (o) {
          o = o || {}; var old = host.querySelector('.kit-win'); if (old) old.remove();
          if (o.cheer) api.cheer(o.cheer, o.arg);
          var w = K.el('div', 'kit-win'), c = K.el('div', 'kit-wc');
          w.style.setProperty('--wd', (o.delay != null ? o.delay : 0.9) + 's');
          function close() { if (w.parentNode) w.parentNode.removeChild(w); }
          c.appendChild(K.el('h3', '', o.title || 'Well done'));
          if (o.stars != null) { var sh = ''; for (var s = 0; s < 3; s++) sh += s < o.stars ? '<b style="animation-delay:' + (1.1 + s * 0.28) + 's">★</b>' : '<i>★</i>'; c.appendChild(K.el('div', 'kit-ws', sh)); }
          if (o.sub) c.appendChild(K.el('p', '', o.sub));
          var list = (o.buttons || []).slice();
          if (!o.noAgain && cur && cur.restart) list.push({ label: o.again || 'Play again', fn: function () { cur.restart(); }, pri: !list.length });
          if (!o.noLevel) list.push({ label: 'Change level', fn: picker });
          if (o.look) list.push({ label: 'Look at it a moment', quiet: true });
          list.forEach(function (b) { c.appendChild(K.btn((b.pri ? 'pri' : '') + (b.quiet ? ' quiet' : ''), b.label, function () { close(); if (b.fn) b.fn(); })); });
          w.appendChild(c); host.appendChild(w); return w;
        },
        say: function (t, ms) { var m = K.el('div', 'kit-msg', t); host.appendChild(m); setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); }, ms || 1600); }
      };
      // Games that draw on a canvas work out their layout once, from the size of their area. On a phone that area changes while you
      // play (Safari's toolbars slide in and out, the phone turns), which would cut off the bottom controls. So when it changes,
      // the game is set up again at the new size. Games made of ordinary page elements adjust by themselves and are left alone.
      var made = { w: 0, h: 0 }, rt = 0, ro = null;
      function build() { var r = host.getBoundingClientRect(); made = { w: r.width, h: r.height }; cur = def.make(l, host, api) || {}; nb.hidden = !cur.restart; }
      function refit() {
        rt = 0; var r = host.getBoundingClientRect();
        if (r.width < 50 || r.height < 50 || (Math.abs(r.width - made.w) < 3 && Math.abs(r.height - made.h) < 3) || !host.querySelector('canvas')) return;
        if (cur && cur.stop) { try { cur.stop(); } catch (e) {} } cur = null; host.innerHTML = ''; build();
      }
      build();
      if (root.ResizeObserver) { ro = new root.ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(refit, 180); }); ro.observe(host); }
      stopWatch = function () { clearTimeout(rt); if (ro) ro.disconnect(); };
    }
    picker();
    return { stop: function () { clear(); if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, peek: function () { return cur && cur.peek ? cur.peek() : null; } };
  };

  K.LV = LV; K.NM = NM;
  root.MannaKit = K;
})(typeof window !== 'undefined' ? window : globalThis);
