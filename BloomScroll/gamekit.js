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
    '.kit-bar{display:flex;gap:.45rem;justify-content:center;padding:.5rem;flex:none}' +
    '.kit-bar button{flex:1;max-width:9rem;min-height:44px;border:1px solid var(--border,#2B3252);background:var(--surface,#171B2E);color:var(--ink,#EDE8DC);border-radius:12px;font-size:.95rem}' +
    '.kit-bar button.on{border-color:var(--gold,#F2C879);background:var(--surface-2,#1F2440)}' +
    '.kit-bar button:disabled{opacity:.4}');

  // def: { id, title, blurb, levels:{easy,normal,hard}, make(level, host, api) -> { stop(), restart() } }
  K.run = function (box, def) {
    var wrap = K.el('div', 'kit'); box.appendChild(wrap);
    var cur = null, level = null;
    function clear() { if (cur && cur.stop) { try { cur.stop(); } catch (e) {} } cur = null; wrap.innerHTML = ''; }
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
      var lb = K.btn('', NM[l] + ' ▾', picker), nb = K.btn('', 'New game', function () { if (cur && cur.restart) cur.restart(); });
      strip.appendChild(lb); strip.appendChild(mid); strip.appendChild(nb); wrap.appendChild(strip); wrap.appendChild(host);
      var api = {
        level: l, mid: mid, host: host,
        status: function (t) { mid.textContent = t || ''; },
        best: function () { return K.best(def.id, l); },
        setBest: function (v, low) { return K.setBest(def.id, l, v, low); },
        say: function (t, ms) { var m = K.el('div', 'kit-msg', t); host.appendChild(m); setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); }, ms || 1600); }
      };
      cur = def.make(l, host, api) || {};
      nb.hidden = !cur.restart;
    }
    picker();
    return { stop: function () { clear(); if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, peek: function () { return cur && cur.peek ? cur.peek() : null; } };
  };

  K.LV = LV; K.NM = NM;
  root.MannaKit = K;
})(typeof window !== 'undefined' ? window : globalThis);
