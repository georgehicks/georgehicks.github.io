/* Bloom Scroll — Hand it over. People, cares, and whatever has a grip on you: choose them, then give them to Jesus and watch them rise into His light.
   Everything here is tap-first (no keyboard unless you choose "type your own"). What you hand over is kept on this phone, so you can see over time where you took it.
   Two ways in: the full screen from Home (tabs: People / Cares / Gripping), and a guided pass inside the wind-down (one beat at a time, each skippable).
   Store: localStorage "manna.release" = { v:1, items:[ { id, k:'p'|'c'|'g', n:name, g:group|null, t:created, h:[[time, grip 0-3], ...], s:settledTime|null } ] }. */
(function (root) {
  'use strict';
  var T = root.MannaText || { verses: {} };
  var KEY = 'manna.release';

  // ---------- what is on offer (tap to add; typing is the last resort) ----------
  var PRE = {
    p: [
      ['Family', ['My spouse', 'My children', 'My parents', 'My brothers and sisters', 'My grandchildren', 'My in-laws']],
      ['Friends', ['My closest friends', 'My neighbors', 'Someone far away']],
      ['Work', ['My boss', 'The people I work with', 'My clients', 'Someone I lead']],
      ['Church', ['My church', 'My pastor', 'My small group']],
      ['Hard to love', ['Someone who hurt me', 'Someone I find hard to forgive', 'Someone I am in conflict with', 'My enemies']],
      ['The world', ['The sick and suffering', 'Those who lead us', 'The lost', 'The poor and hungry', 'Those who grieve']]
    ],
    c: [
      ['Provision', ['Money', 'Work', 'Bills and debt', 'Our home']],
      ['Body', ['My health', 'Someone’s health', 'Sleep', 'Getting older']],
      ['Heart', ['Loneliness', 'Grief', 'Regret', 'Failure', 'Guilt']],
      ['Ahead', ['Tomorrow', 'A decision I face', 'The future', 'The news']],
      ['Home', ['My marriage', 'My children’s future', 'A strained relationship']]
    ],
    g: [
      ['Afraid', ['Fear', 'Worry', 'Control', 'Hurry', 'Self-reliance']],
      ['Wounded', ['Anger', 'Resentment', 'Shame', 'Regret', 'Grief']],
      ['Wanting', ['Craving', 'Numbing out', 'Comparison', 'Envy', 'Needing to be seen', 'What people think']],
      ['Driven', ['Perfectionism', 'Pride', 'Money and security']]
    ]
  };
  // What He says back, for the common grips. Everything else gets one of the kind's defaults.
  var GV = {
    'Fear': 'Isaiah 41:10', 'Worry': 'Matthew 6:33-34', 'Control': 'Proverbs 3:5-6', 'Hurry': 'Luke 10:41-42', 'Self-reliance': '2 Corinthians 12:9',
    'Anger': 'Ephesians 4:31-32', 'Resentment': 'Ephesians 4:31-32', 'Shame': 'Romans 8:1', 'Regret': 'Lamentations 3:22-23', 'Grief': 'Revelation 21:4',
    'Craving': '1 Corinthians 10:13', 'Numbing out': 'Psalm 46:10', 'Comparison': 'Psalm 131:1-2', 'Envy': 'Proverbs 14:30', 'Needing to be seen': '1 Peter 5:6-7',
    'What people think': '1 Samuel 16:7', 'Perfectionism': '2 Corinthians 12:9', 'Pride': '1 Peter 5:6-7', 'Money and security': 'Luke 12:15'
  };
  var DV = { p: ['Psalm 121:1-2', 'Romans 8:38-39'], c: ['1 Peter 5:6-7', 'Matthew 11:28-30', 'Psalm 37:4-5'], g: ['Isaiah 26:3', 'John 14:27', 'Psalm 46:10'] };
  var KIND = {
    p: { tab: 'People', ask: 'Who is on your heart?', sub: 'Tap them, then place them in His hands. They stay on your list.', said: 'They are Yours.', one: 'person', empty: 'Tap anyone who is on your heart.' },
    c: { tab: 'Cares', ask: 'What are you carrying?', sub: 'Tap what is weighing on you, then give it to Him.', said: 'It is Yours to carry.', one: 'care', empty: 'Tap what is weighing on you.' },
    g: { tab: 'Gripping', ask: 'What has a hold on you?', sub: 'Tap what has hold of you. Then open your hand.', said: 'My hand is open.', one: 'grip', empty: 'Tap whatever has hold of you.' }
  };
  var GUIDE = {
    sleep: {
      p: { h: 'Who is on your heart tonight?', s: 'Tap them. Then place them in His hands.' },
      c: { h: 'What are you carrying into the night?', s: 'You do not have to hold it while you sleep.' },
      g: { h: 'What has a hold on you?', s: 'Name it. Then open your hand.' }
    },
    brk: { g: { h: 'Before you step away: is anything gripping you?', s: 'Name it, and open your hand for a few minutes.' } }
  };
  var LOOSE = ['', 'Loose', 'Firm', 'Clenched'];

  // ---------- store ----------
  function load() { try { var o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && Array.isArray(o.items)) return o; } catch (e) {} return { v: 1, items: [] }; }
  var D = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} }
  function uid() { return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function dayKey(ts) { var d = new Date(ts - 5 * 3600000); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }   // the night runs until 5 a.m.
  function get(id) { return D.items.filter(function (i) { return i.id === id; })[0]; }
  function live(k) { return D.items.filter(function (i) { return i.k === k && !i.s; }); }
  function add(k, name, group) {
    name = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 40); if (!name) return null;
    var it = D.items.filter(function (i) { return i.k === k && i.n.toLowerCase() === name.toLowerCase(); })[0];
    if (it) { it.s = null; save(); return it; }
    it = { id: uid(), k: k, n: name, g: group || null, t: Date.now(), h: [], s: null }; D.items.push(it); save(); return it;
  }
  function give(ids, grip) {
    var now = Date.now();
    ids.forEach(function (id) { var it = get(id); if (!it) return; it.h.push([now, grip || 0]); if (it.h.length > 60) it.h.splice(0, it.h.length - 60); });
    save();
  }
  function tonight(it) { var l = it.h[it.h.length - 1]; return !!l && dayKey(l[0]) === dayKey(Date.now()); }
  function stats() {
    var cut = Date.now() - 30 * 86400000, n = 0, nights = {};
    D.items.forEach(function (it) { it.h.forEach(function (e) { if (e[0] > cut) { n++; nights[dayKey(e[0])] = 1; } }); });
    return { n: n, nights: Object.keys(nights).length, items: D.items.filter(function (i) { return !i.s; }).length };
  }
  function verseFor(it) {
    var ref = GV[it.n] || DV[it.k][(it.n.length + it.h.length) % DV[it.k].length];
    return T.verses[ref] ? { ref: ref, text: T.verses[ref] } : null;
  }
  function when(ts) { return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  // ---------- style ----------
  var css = '' +
    '.rel{position:absolute;inset:0;display:flex;flex-direction:column;color:var(--ink,#EDE8DC);background:radial-gradient(ellipse at 50% 0,#1d2250 0,#0b0d1d 70%);-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;overflow:hidden}' +
    '.rel-top{display:flex;align-items:center;justify-content:space-between;padding:calc(var(--top,0px) + .35rem) .6rem 0;min-height:calc(var(--top,0px) + 48px);flex:none;position:relative;z-index:3}' +
    '.rel-top button{background:none;border:none;color:var(--ink-muted,#A2A9BE);min-height:44px;min-width:44px;font-size:1rem;padding:.4rem .5rem}' +
    '.rel-top b{font-family:var(--serif,Georgia,serif);font-weight:normal;font-size:1.15rem;color:#fff3d2}' +
    '.rel-dots{display:flex;gap:.45rem;align-items:center}.rel-dots i{width:.5rem;height:.5rem;border-radius:50%;background:rgba(255,255,255,.18)}.rel-dots i.on{background:#F2C879;box-shadow:0 0 8px #F2C879}.rel-dots i.done{background:rgba(242,200,121,.5)}' +
    '.rel-sky{position:relative;flex:none;height:clamp(120px,21vh,190px);display:flex;align-items:center;justify-content:center;margin-top:-.3rem}' +
    '.rel-sky::before{content:"";position:absolute;left:50%;top:50%;width:440px;height:440px;margin:-220px 0 0 -220px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,rgba(255,228,150,.45) 0,rgba(255,200,100,.17) 30%,rgba(255,200,100,0) 62%);animation:relGlow 7s ease-in-out infinite}' +
    '@keyframes relGlow{50%{transform:scale(1.14);opacity:.8}}' +
    '.rel-heart{position:relative;width:46px;height:62px;z-index:2;filter:drop-shadow(0 0 10px rgba(255,236,170,.9))}.rel-heart.pulse{animation:relBeat .9s ease-out}' +
    '@keyframes relBeat{0%{transform:scale(1)}30%{transform:scale(1.35)}100%{transform:scale(1)}}' +
    '.rel-ring{position:absolute;left:50%;top:50%;width:90px;height:90px;margin:-45px 0 0 -45px;border-radius:50%;pointer-events:none;border:2px solid rgba(255,226,140,.8);opacity:0}.rel-ring.go{animation:relRing 1.3s ease-out}' +
    '@keyframes relRing{0%{transform:scale(.4);opacity:.9}100%{transform:scale(2.8);opacity:0}}' +
    '.rel-said{position:absolute;left:0;right:0;bottom:.2rem;text-align:center;font-family:var(--serif,Georgia,serif);font-size:1.15rem;color:#fff3d2;text-shadow:0 0 16px rgba(242,200,121,.6);opacity:0;transition:opacity .9s;pointer-events:none}.rel-said.on{opacity:1}' +
    '.rel-tabs{display:flex;gap:.45rem;justify-content:center;padding:.2rem .8rem .5rem;flex:none}' +
    '.rel-tab{min-height:40px;border:1px solid var(--border,#2B3252);background:rgba(23,27,46,.7);color:var(--ink-muted,#A2A9BE);border-radius:999px;padding:.3rem .95rem;font-size:.95rem}' +
    '.rel-tab.on{background:var(--surface-2,#1F2440);border-color:var(--c);color:var(--ink,#EDE8DC);box-shadow:0 0 14px var(--cg)}' +
    '.rel-tab small{opacity:.7;margin-left:.3rem}' +
    '.rel-body{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:.2rem 1rem 1rem}' +
    '.rel-h{font-family:var(--serif,Georgia,serif);font-size:1.3rem;text-align:center;margin:.2rem 0 .15rem;color:#fff3d2}' +
    '.rel-sub{text-align:center;color:var(--ink-muted,#A2A9BE);font-size:.92rem;margin:0 auto .5rem;max-width:26rem}' +
    '.rel-verse{margin:.2rem auto .6rem;max-width:26rem;text-align:center;font-family:var(--serif,Georgia,serif);font-style:italic;color:#fbe3b0;font-size:1rem;line-height:1.45;animation:relIn 1.2s ease both}.rel-verse small{display:block;font-style:normal;font-family:var(--sans,sans-serif);color:var(--ink-muted,#A2A9BE);margin-top:.2rem}' +
    '@keyframes relIn{from{opacity:0;transform:translateY(6px)}}' +
    '.rel-g{font-size:.74rem;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint,#7A83A6);margin:1.1rem .3rem .35rem}' +
    '.rel-tray{text-align:center}' +
    '.k-p{--c:#F2C879;--cb:rgba(242,200,121,.4);--cg:rgba(242,200,121,.5);--bg:rgba(242,200,121,.1)}.k-c{--c:#8FD3FF;--cb:rgba(143,211,255,.4);--cg:rgba(143,211,255,.45);--bg:rgba(143,211,255,.09)}.k-g{--c:#E9788A;--cb:rgba(233,120,138,.45);--cg:rgba(233,120,138,.45);--bg:rgba(233,120,138,.1)}' +
    '.rel-orb{position:relative;display:inline-flex;align-items:center;gap:.45rem;margin:.28rem .2rem;padding:.7rem 1.1rem;min-height:46px;max-width:100%;border-radius:999px;border:1px solid var(--cb);color:var(--ink,#EDE8DC);font-size:1rem;text-align:left;background:radial-gradient(circle at 30% 22%,rgba(255,255,255,.16),var(--bg) 62%);transition:transform .35s,box-shadow .35s,opacity .4s,outline-offset 2.4s,outline-color 2.4s;outline:2px solid transparent;outline-offset:2px;touch-action:manipulation}' +
    '.rel-orb.sel{border-color:var(--c);box-shadow:0 0 0 1px var(--c),0 0 22px var(--cg);transform:translateY(-5px);animation:relBob 2.6s ease-in-out infinite}' +
    '@keyframes relBob{50%{transform:translateY(-9px)}}' +
    '.rel-orb .dot{width:7px;height:7px;border-radius:50%;background:var(--c);box-shadow:0 0 8px var(--c);flex:none}' +
    '.rel-orb.k-g.sel.t3{outline:2px dashed var(--c);outline-offset:3px;animation:relShake .22s linear infinite}' +
    '.rel-orb.k-g.sel.t2{outline:2px solid var(--cb);outline-offset:3px}' +
    '@keyframes relShake{25%{transform:translate(1.5px,-5px)}75%{transform:translate(-1.5px,-4px)}}' +
    '.rel-orb.k-g.sel.opening{animation:none;transform:translateY(-12px) scale(1.12);outline-color:transparent;outline-offset:16px;box-shadow:0 0 34px var(--cg);transition:transform 2.4s ease-out,outline-offset 2.4s ease-out,outline-color 2.4s,box-shadow 2.4s}' +
    '.rel-orb.gone{opacity:0;transition:none}' +
    '.rel-add{border-style:dashed;color:var(--ink-muted,#A2A9BE);background:transparent}' +
    '.rel-fly{position:fixed;z-index:90;margin:0;pointer-events:none;will-change:transform,opacity}' +
    '.rel-sug{display:flex;flex-wrap:wrap;gap:.2rem;justify-content:center;margin-top:.6rem}.rel-sug .rel-orb{border-style:dashed}' +
    '.rel-hint{text-align:center;color:var(--ink-faint,#7A83A6);font-size:.82rem;margin:.8rem 0 0}' +
    '.rel-bar{flex:none;padding:.5rem 1rem calc(var(--bot,0px) + .8rem);background:linear-gradient(rgba(11,13,29,0),rgba(11,13,29,.96) 30%);display:flex;flex-direction:column;gap:.5rem;position:relative;z-index:3}' +
    '.rel-row{display:flex;gap:.6rem;align-items:center}' +
    '.rel-give{flex:1;min-height:54px;border:none;border-radius:16px;font-size:1.08rem;font-weight:600;color:#241a06;background:linear-gradient(180deg,#f6d38e,#e8b85c);box-shadow:0 6px 26px rgba(242,200,121,.22)}' +
    '.rel-give:disabled{opacity:.35;box-shadow:none}' +
    '.rel-all,.rel-skip{min-height:46px;border:1px solid var(--border,#2B3252);background:rgba(23,27,46,.8);color:var(--ink-muted,#A2A9BE);border-radius:14px;padding:0 1rem;font-size:.95rem}' +
    '.rel-skip{background:none;border:none;text-decoration:underline;text-decoration-color:var(--ink-faint,#7A83A6)}' +
    '.rel-seg{display:flex;gap:.4rem;align-items:center;justify-content:center;font-size:.85rem;color:var(--ink-muted,#A2A9BE)}' +
    '.rel-seg button{min-height:40px;border:1px solid var(--border,#2B3252);background:rgba(23,27,46,.8);color:var(--ink-muted,#A2A9BE);border-radius:999px;padding:0 .9rem;font-size:.9rem}.rel-seg button.on{border-color:var(--c);color:var(--ink,#EDE8DC);background:var(--surface-2,#1F2440)}' +
    '.rel-hold{position:relative;flex:1;min-height:58px;border:1px solid var(--cb);border-radius:16px;color:#ffe9ee;font-family:var(--serif,Georgia,serif);font-size:1.1rem;background:linear-gradient(90deg,rgba(233,120,138,.55) var(--p,0%),rgba(60,26,40,.85) var(--p,0%));touch-action:none;-webkit-user-select:none;user-select:none}.rel-hold:disabled{opacity:.35}' +
    '.rel-over{position:absolute;inset:0;z-index:20;background:#070812;display:flex;flex-direction:column;animation:relIn .35s ease both}' +
    '.rel-over .rel-top b{font-size:1.2rem}' +
    '.rel-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:.3rem 1.1rem calc(var(--bot,0px) + 1.5rem)}' +
    '.rel-chips{display:flex;flex-wrap:wrap;gap:.45rem;margin:.5rem 0}' +
    '.rel-chip{min-height:42px;border:1px solid var(--border,#2B3252);background:rgba(23,27,46,.8);color:var(--ink-muted,#A2A9BE);border-radius:999px;padding:.3rem .95rem;font-size:.95rem;text-align:left}.rel-chip.on{border-color:var(--c);color:var(--ink,#EDE8DC);background:var(--surface-2,#1F2440)}.rel-chip.have{opacity:.45}' +
    '.rel-own{display:flex;gap:.5rem;margin:.4rem 0}.rel-own input{flex:1;margin:0 !important;font-size:16px}.rel-own button{border:none;border-radius:12px;background:linear-gradient(180deg,#f6d38e,#e8b85c);color:#241a06;font-weight:600;padding:0 1.1rem}' +
    '.rel-sit{max-width:27rem;margin:0 auto;padding:1.2rem .3rem 1rem;text-align:center;animation:relIn 1.4s ease both}.rel-sitt{font-size:.85rem;color:var(--ink-faint,#7A83A6);letter-spacing:.06em;margin-bottom:1.1rem}' +
    '.rel-sitv{font-family:var(--serif,Georgia,serif);font-size:1.28rem;line-height:1.6;color:#fbe3b0;margin:0 0 1.5rem}.rel-sitv small{display:block;font-family:var(--sans,sans-serif);font-style:normal;font-size:.8rem;color:var(--ink-muted,#A2A9BE);margin-top:.5rem}.rel-sitl{display:block;font-family:var(--sans,sans-serif);font-size:.74rem;letter-spacing:.12em;text-transform:uppercase;color:#E9788A;margin-bottom:.35rem}' +
    '.rel-card{padding:.85rem 1rem;border:1px solid var(--border,#2B3252);border-radius:14px;background:rgba(23,27,46,.75);margin:.55rem 0;text-align:left;width:100%;display:block}' +
    '.rel-card b{font-family:var(--serif,Georgia,serif);font-weight:normal;font-size:1.08rem}.rel-card .m{color:var(--ink-muted,#A2A9BE);font-size:.82rem;margin-top:.1rem}' +
    '.rel-beads{display:flex;gap:.28rem;align-items:center;margin-top:.45rem;min-height:14px;flex-wrap:wrap}.rel-beads i{display:block;border-radius:50%;background:var(--c);opacity:.85}' +
    '.rel-sum{font-family:var(--serif,Georgia,serif);font-size:1.15rem;color:#fff3d2;text-align:center;margin:.6rem 0 .2rem}' +
    '.rel-l{font-size:.76rem;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint,#7A83A6);margin:1.1rem 0 .2rem}' +
    '.rel-act{display:block;width:100%;margin-top:.55rem;min-height:50px;border-radius:14px;border:1px solid var(--border,#2B3252);background:rgba(23,27,46,.85);color:var(--ink,#EDE8DC);font-size:1rem}.rel-act.gold{border-color:#F2C879;color:#F2C879}';
  (function () { var s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); })();

  var HEART = '<svg class="rel-heart" viewBox="0 0 46 62" aria-hidden="true"><g stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M23 2v58M6 20h34"/></g><path d="M23 36C13 29 10 24 10 20a6.5 6.5 0 0 1 13-1.5A6.5 6.5 0 0 1 36 20c0 4-3 9-13 16z" fill="#e5383b"/></svg>';

  // ---------- the view ----------
  // o: { kinds:['p','c','g'], guided:'sleep'|'brk'|null, onBack(), onDone(gave) }
  function view(host, o) {
    var kinds = o.kinds || ['p', 'c', 'g'], kind = kinds[0], step = 0, sel = {}, grip = 2, busy = false, lpFlag = false, lpT = 0, gaveAny = false, holdT = 0, hold0 = 0, adv = 0;
    var guided = o.guided || null;
    host.innerHTML = '';
    var root_ = el('div', 'rel'); host.appendChild(root_);
    root_.innerHTML = '<div class="rel-top"></div><div class="rel-sky"><div class="rel-ring"></div>' + HEART + '<div class="rel-said"></div></div><div class="rel-tabs"></div><div class="rel-body"></div><div class="rel-bar"></div>';
    var top = root_.querySelector('.rel-top'), sky = root_.querySelector('.rel-sky'), tabs = root_.querySelector('.rel-tabs'), body = root_.querySelector('.rel-body'), bar = root_.querySelector('.rel-bar');
    var heart = sky.querySelector('.rel-heart'), ring = sky.querySelector('.rel-ring'), said = sky.querySelector('.rel-said');
    var verseHtml = '', sitting = null;

    function selIds() { return Object.keys(sel).filter(function (k) { return sel[k]; }); }
    function clearSel() { sel = {}; }

    function drawTop() {
      if (guided) {
        var dots = kinds.map(function (k, i) { return '<i class="' + (i === step ? 'on' : i < step ? 'done' : '') + '"></i>'; }).join('');
        top.innerHTML = '<span style="min-width:44px"></span><div class="rel-dots">' + dots + '</div><button data-skipall>' + (kinds.length > 1 ? 'Skip' : '') + '</button>';
        var sa = top.querySelector('[data-skipall]'); sa.onclick = function () { finish(); };
      } else {
        top.innerHTML = '<button data-back aria-label="Back">‹ Back</button><b>Hand it over</b><button data-time aria-label="Over time">🕯</button>';
        top.querySelector('[data-back]').onclick = function () { if (o.onBack) o.onBack(); };
        top.querySelector('[data-time]').onclick = overTime;
      }
    }
    function drawTabs() {
      tabs.innerHTML = ''; tabs.hidden = !!guided || kinds.length < 2; if (tabs.hidden) return;
      kinds.forEach(function (k) {
        var n = live(k).length, b = el('button', 'rel-tab k-' + k + (k === kind ? ' on' : ''), KIND[k].tab + (n ? '<small>' + n + '</small>' : '')); b.type = 'button';
        b.onclick = function () { if (busy) return; kind = k; clearSel(); verseHtml = ''; sitting = null; said.classList.remove('on'); draw(); }; tabs.appendChild(b);
      });
    }
    function groups(list) {
      var order = PRE[kind].map(function (g) { return g[0]; }), map = {};
      list.forEach(function (it) { var g = it.g || 'Mine'; (map[g] = map[g] || []).push(it); });
      var names = Object.keys(map).sort(function (a, b) { var ia = order.indexOf(a), ib = order.indexOf(b); if (ia < 0) ia = 99; if (ib < 0) ib = 99; return ia - ib; });
      return names.map(function (n) { return [n, map[n]]; });
    }
    function orbHtml(it) { return esc(it.n) + (tonight(it) ? '<i class="dot" title="Handed over tonight"></i>' : ''); }
    function orbClass(it) { return 'rel-orb k-' + it.k + (sel[it.id] ? ' sel' + (it.k === 'g' ? ' t' + grip : '') : ''); }

    // After giving: the verse(s) stay as long as you like. Nothing moves on until you say Amen.
    function drawSit() {
      var h = '<div class="rel-sit"><div class="rel-sitt">Stay here as long as you like.</div>';
      sitting.v.forEach(function (e) { h += '<div class="rel-sitv">' + (e.label ? '<span class="rel-sitl">' + esc(e.label) + '</span>' : '') + esc(e.text) + '<small>' + esc(e.ref) + ' · Berean Standard Bible</small></div>'; });
      body.innerHTML = h + '</div>'; body.scrollTop = 0;
    }
    function drawBody() {
      if (sitting) return drawSit();
      var list = live(kind), gd = guided && GUIDE[guided] && GUIDE[guided][kind];
      var h = '<div class="rel-h">' + esc(gd ? gd.h : KIND[kind].ask) + '</div>';
      h += verseHtml ? verseHtml : '<div class="rel-sub">' + esc(gd ? gd.s : KIND[kind].sub) + '</div>';
      body.innerHTML = h;
      var tray = el('div', 'rel-tray k-' + kind); body.appendChild(tray);
      var gs = groups(list), showHeads = gs.length > 1;
      gs.forEach(function (g) {
        if (showHeads) tray.appendChild(el('div', 'rel-g', esc(g[0])));
        g[1].forEach(function (it) { var b = el('button', orbClass(it), orbHtml(it)); b.type = 'button'; b.dataset.id = it.id; tray.appendChild(b); });
      });
      var ab = el('button', 'rel-orb rel-add k-' + kind, '+ Add'); ab.type = 'button'; ab.onclick = function () { addView(); }; tray.appendChild(ab);
      if (!list.length) {
        body.appendChild(el('div', 'rel-hint', esc(KIND[kind].empty)));
        var sg = el('div', 'rel-sug k-' + kind); body.appendChild(sg);
        PRE[kind].forEach(function (g) { g[1].slice(0, 2).forEach(function (n) { var b = el('button', 'rel-orb k-' + kind, esc(n)); b.type = 'button'; b.onclick = function () { var it = add(kind, n, g[0]); sel[it.id] = true; draw(); }; sg.appendChild(b); }); });
      } else if (!guided) body.appendChild(el('div', 'rel-hint', 'Hold one to see where it has been.'));
      // tap to choose; hold to see its story
      [].forEach.call(tray.querySelectorAll('.rel-orb[data-id]'), function (b) {
        function cancel() { clearTimeout(lpT); }
        b.addEventListener('pointerdown', function () { lpFlag = false; clearTimeout(lpT); lpT = setTimeout(function () { lpFlag = true; story(b.dataset.id); }, 560); });
        b.addEventListener('pointerup', cancel); b.addEventListener('pointerleave', cancel); b.addEventListener('pointercancel', cancel);
        b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        b.addEventListener('click', function () { if (lpFlag) { lpFlag = false; return; } if (busy) return; sel[b.dataset.id] = !sel[b.dataset.id]; b.className = orbClass(get(b.dataset.id)); drawBar(); });
      });
    }

    function amen() { sitting = null; said.classList.remove('on'); if (guided) next(); else draw(); }
    function drawBar() {
      var ids = selIds(), n = ids.length, gd = guided;
      bar.innerHTML = ''; bar.className = 'rel-bar k-' + kind;
      if (sitting) { var ab2 = el('button', 'rel-give', 'Amen'); ab2.type = 'button'; ab2.onclick = amen; var r0 = el('div', 'rel-row'); r0.appendChild(ab2); bar.appendChild(r0); return; }
      if (kind === 'g') {
        var seg = el('div', 'rel-seg', '<span>How tight?</span>');
        [1, 2, 3].forEach(function (g) { var b = el('button', g === grip ? 'on' : '', LOOSE[g]); b.type = 'button'; b.onclick = function () { grip = g; drawBar(); [].forEach.call(body.querySelectorAll('.rel-orb.sel'), function (x) { x.className = orbClass(get(x.dataset.id)); }); }; seg.appendChild(b); });
        bar.appendChild(seg);
        var row = el('div', 'rel-row'), hb = el('button', 'rel-hold', n ? 'Hold to open your hand' : 'Tap what has hold of you'); hb.type = 'button'; hb.disabled = !n; row.appendChild(hb); bar.appendChild(row);
        wireHold(hb);
      } else {
        var row2 = el('div', 'rel-row'), all = el('button', 'rel-all', n && n === live(kind).length ? 'None' : 'All'); all.type = 'button';
        all.onclick = function () { var l = live(kind), every = l.length && l.every(function (i) { return sel[i.id]; }); l.forEach(function (i) { sel[i.id] = !every; }); drawBody(); drawBar(); };
        var gb = el('button', 'rel-give', n === 0 ? 'Tap who or what to give' : n === 1 ? 'Give “' + esc(get(ids[0]).n.length > 22 ? get(ids[0]).n.slice(0, 21) + '…' : get(ids[0]).n) + '” to Jesus' : 'Give ' + n + ' to Jesus'); gb.type = 'button'; gb.disabled = !n;
        gb.onclick = function () { fly(ids); };
        if (live(kind).length > 1) row2.appendChild(all); row2.appendChild(gb); bar.appendChild(row2);
      }
      if (guided) {
        var sk = el('button', 'rel-skip', gaveAny && !n ? 'Next ›' : (guided === 'brk' ? 'Nothing right now' : 'Nothing tonight')); sk.type = 'button'; sk.onclick = next; bar.appendChild(sk);
      }
    }

    // hold to open your hand: the ring fills, the clenched orbs soften, then they lift off
    function wireHold(hb) {
      function stopH() { clearInterval(holdT); holdT = 0; hb.style.setProperty('--p', '0%'); [].forEach.call(body.querySelectorAll('.rel-orb.opening'), function (x) { x.classList.remove('opening'); }); }
      function down(e) {
        if (busy || holdT || hb.disabled) return; e.preventDefault(); hold0 = Date.now();
        [].forEach.call(body.querySelectorAll('.rel-orb.sel'), function (x) { x.classList.add('opening'); });
        holdT = setInterval(function () { var p = Math.min(1, (Date.now() - hold0) / 2400); hb.style.setProperty('--p', (p * 100) + '%'); if (p >= 1) { clearInterval(holdT); holdT = 0; fly(selIds()); } }, 40);
      }
      hb.addEventListener('pointerdown', down); hb.addEventListener('pointerup', stopH); hb.addEventListener('pointerleave', stopH); hb.addEventListener('pointercancel', stopH);
      hb.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    }

    // the orbs rise into His light, one after another
    function fly(ids) {
      if (busy || !ids.length) return; busy = true; var kd = kind, tg = heart.getBoundingClientRect(), tx = tg.left + tg.width / 2, ty = tg.top + tg.height / 2, last = 0;
      var gripNow = grip, names = ids.map(function (id) { return get(id); });
      ids.forEach(function (id, i) {
        var orb = body.querySelector('.rel-orb[data-id="' + id + '"]'); if (!orb) return;
        var r = orb.getBoundingClientRect(), c = orb.cloneNode(true); c.className = 'rel-orb k-' + kd + ' sel rel-fly'; c.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;animation:none;transform:none;margin:0';
        document.body.appendChild(c); orb.classList.add('gone');
        var dx = tx - (r.left + r.width / 2), dy = ty - (r.top + r.height / 2), wob = (i % 2 ? 1 : -1) * (24 + Math.random() * 30), dur = 1500 + Math.random() * 400, delay = i * 220; last = Math.max(last, delay + dur);
        var done = function () { c.remove(); heart.classList.remove('pulse'); ring.classList.remove('go'); void heart.offsetWidth; heart.classList.add('pulse'); ring.classList.add('go'); };
        try { var a = c.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + (dx * 0.35 + wob) + 'px,' + (dy * 0.5) + 'px) scale(.8)', opacity: 1, offset: 0.45 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.18)', opacity: 0 }], { duration: dur, delay: delay, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'forwards' }); a.onfinish = done; }
        catch (e) { setTimeout(done, delay + dur); }
      });
      setTimeout(function () {
        give(ids, kd === 'g' ? gripNow : 0); gaveAny = true;
        said.textContent = KIND[kd].said; said.classList.add('on');
        var seen = {}, vs = []; names.forEach(function (it) { var v = verseFor(it); if (v && !seen[v.ref] && vs.length < 3) { seen[v.ref] = 1; vs.push({ ref: v.ref, text: v.text, label: kd === 'g' && names.length > 1 ? it.n : '' }); } });
        clearSel(); busy = false; verseHtml = ''; sitting = vs.length ? { v: vs } : null; draw();
        if (!sitting) { if (guided) { adv = setTimeout(function () { said.classList.remove('on'); next(); }, 2500); } else setTimeout(function () { said.classList.remove('on'); }, 3000); }
      }, last + 250);
    }

    function next() { clearTimeout(adv); if (busy) return; sitting = null; if (step < kinds.length - 1) { step++; kind = kinds[step]; clearSel(); verseHtml = ''; said.classList.remove('on'); preselect(); draw(); } else finish(); }
    function finish() { clearTimeout(adv); clearInterval(holdT); if (o.onDone) o.onDone(gaveAny); }
    function preselect() { if (guided === 'sleep' && kind === 'p') live('p').forEach(function (i) { sel[i.id] = true; }); }

    // ---------- an item's story (hold an orb) ----------
    function beads(it) {
      var h = it.h.slice(-16); if (!h.length) return '<span class="m" style="color:var(--ink-faint)">Not yet handed over</span>';
      return h.map(function (e) { var s = it.k === 'g' ? 6 + (e[1] || 2) * 3 : 8; return '<i style="width:' + s + 'px;height:' + s + 'px"></i>'; }).join('');
    }
    function loosening(it) {
      if (it.k !== 'g' || it.h.length < 4) return false; var h = it.h, m = Math.floor(h.length / 2), a = 0, b = 0;
      h.slice(0, m).forEach(function (e) { a += e[1] || 2; }); h.slice(m).forEach(function (e) { b += e[1] || 2; }); return b / (h.length - m) <= a / m - 0.5;
    }
    function overlay(cls) { var ov = el('div', 'rel-over ' + (cls || '')); root_.appendChild(ov); return ov; }
    function story(id) {
      var it = get(id); if (!it) return; var ov = overlay('k-' + it.k), n = it.h.length;
      var meta = (KIND[it.k].one) + (it.g ? ' · ' + it.g : '') + ' · added ' + when(it.t);
      ov.innerHTML = '<div class="rel-top"><button data-x>‹ Back</button><span></span><span style="min-width:44px"></span></div><div class="rel-scroll"><div class="rel-sum">' + esc(it.n) + '</div><div class="m" style="text-align:center;color:var(--ink-muted);font-size:.85rem">' + esc(meta) + '</div>' +
        '<div class="rel-card"><b>' + (n ? 'Handed over ' + (n === 1 ? 'once' : n + ' times') : 'Not handed over yet') + '</b><div class="m">' + (n ? 'Last: ' + when(it.h[n - 1][0]) + (it.k === 'g' ? ' · grip: ' + LOOSE[it.h[n - 1][1] || 2].toLowerCase() : '') : 'Tap it, then give it to Jesus.') + '</div><div class="rel-beads">' + beads(it) + '</div>' + (loosening(it) ? '<div class="m" style="margin-top:.5rem;color:#F2C879">Your hand has been loosening.</div>' : '') + '</div>' +
        '<button class="rel-act gold" data-settle>' + (it.s ? 'Bring it back' : 'He carried it — it is settled') + '</button><button class="rel-act" data-del>Remove from my list</button></div>';
      ov.querySelector('[data-x]').onclick = function () { ov.remove(); };
      ov.querySelector('[data-settle]').onclick = function () { it.s = it.s ? null : Date.now(); save(); ov.remove(); clearSel(); draw(); };
      ov.querySelector('[data-del]').onclick = function () { D.items = D.items.filter(function (x) { return x.id !== it.id; }); save(); ov.remove(); clearSel(); draw(); };
    }

    // ---------- over time ----------
    function overTime() {
      var ov = overlay(), st = stats();
      var h = '<div class="rel-top"><button data-x>‹ Back</button><b>Over time</b><span style="min-width:44px"></span></div><div class="rel-scroll">';
      h += '<div class="rel-sum">' + (st.n ? 'In the last 30 days you handed over ' + st.n + (st.n === 1 ? ' thing' : ' things') + ', on ' + st.nights + (st.nights === 1 ? ' night.' : ' nights.') : 'Nothing handed over yet.') + '</div><div class="m" style="text-align:center;color:var(--ink-muted);font-size:.85rem">Not a score. Just a record of where you took it.</div>';
      ['g', 'c', 'p'].forEach(function (k) {
        var l = live(k).filter(function (i) { return i.h.length; }).sort(function (a, b) { return b.h[b.h.length - 1][0] - a.h[a.h.length - 1][0]; });
        if (!l.length) return; h += '<div class="rel-l">' + (k === 'g' ? 'What has had hold of you' : k === 'c' ? 'What you have carried' : 'Who you have placed in His hands') + '</div>';
        l.forEach(function (it) { h += '<button class="rel-card k-' + k + '" data-id="' + it.id + '"><b>' + esc(it.n) + '</b><span class="m"> · ' + it.h.length + '×' + (loosening(it) ? ' · loosening' : '') + '</span><div class="rel-beads">' + beads(it) + '</div></button>'; });
      });
      var done = D.items.filter(function (i) { return i.s; }).sort(function (a, b) { return b.s - a.s; });
      if (done.length) { h += '<div class="rel-l">He carried these</div>'; done.forEach(function (it) { h += '<button class="rel-card k-' + it.k + '" data-id="' + it.id + '"><b>' + esc(it.n) + '</b><div class="m">Settled ' + when(it.s) + ' · handed over ' + it.h.length + '×</div></button>'; }); }
      if (!D.items.length) h += '<p class="m" style="text-align:center;color:var(--ink-muted)">When you hand something over, it will show up here.</p>';
      ov.innerHTML = h + '</div>';
      ov.querySelector('[data-x]').onclick = function () { ov.remove(); };
      [].forEach.call(ov.querySelectorAll('[data-id]'), function (b) { b.onclick = function () { story(b.dataset.id); }; });
    }

    // ---------- add (tap a suggestion; typing is optional) ----------
    function addView() {
      var ov = overlay('k-' + kind), grp = PRE[kind][0][0], justAdded = [];
      ov.innerHTML = '<div class="rel-top"><button data-x>Cancel</button><b>' + esc(KIND[kind].tab) + '</b><button data-d style="color:#F2C879">Done</button></div><div class="rel-scroll"><div class="rel-own" hidden><input type="text" maxlength="40" placeholder="Type it here" autocomplete="off" autocapitalize="sentences"><button type="button">Add</button></div><div class="rel-chips" data-g></div><div class="rel-chips" data-n></div><button class="rel-act" data-own>+ Something else, in my own words</button></div>';
      var gc = ov.querySelector('[data-g]'), nc = ov.querySelector('[data-n]'), own = ov.querySelector('.rel-own'), inp = own.querySelector('input');
      function paint() {
        gc.innerHTML = ''; nc.innerHTML = '';
        PRE[kind].forEach(function (g) { var b = el('button', 'rel-chip' + (g[0] === grp ? ' on' : ''), esc(g[0])); b.type = 'button'; b.onclick = function () { grp = g[0]; paint(); }; gc.appendChild(b); });
        var have = live(kind).map(function (i) { return i.n.toLowerCase(); });
        PRE[kind].filter(function (g) { return g[0] === grp; })[0][1].forEach(function (n) {
          var has = have.indexOf(n.toLowerCase()) >= 0, b = el('button', 'rel-chip' + (has ? ' have' : ''), (has ? '✓ ' : '+ ') + esc(n)); b.type = 'button';
          if (!has) b.onclick = function () { var it = add(kind, n, grp); justAdded.push(it.id); paint(); }; nc.appendChild(b);
        });
        live(kind).filter(function (i) { return i.g === grp && !PRE[kind].some(function (g) { return g[1].indexOf(i.n) >= 0; }); }).forEach(function (i) { nc.appendChild(el('span', 'rel-chip have', '✓ ' + esc(i.n))); });
      }
      paint();
      ov.querySelector('[data-own]').onclick = function () { own.hidden = false; inp.focus(); };
      function addOwn() { var it = add(kind, inp.value, grp); if (it) { justAdded.push(it.id); inp.value = ''; paint(); } }
      own.querySelector('button').onclick = addOwn; inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addOwn(); } });
      function close() { ov.remove(); }
      ov.querySelector('[data-x]').onclick = close;
      ov.querySelector('[data-d]').onclick = function () { if (inp.value.trim()) addOwn(); justAdded.forEach(function (id) { sel[id] = true; }); close(); draw(); };
    }

    function draw() { drawTop(); drawTabs(); drawBody(); drawBar(); }
    preselect(); draw();
    return { stop: function () { clearTimeout(adv); clearTimeout(lpT); clearInterval(holdT); host.innerHTML = ''; }, peek: function () { return { kind: kind, sel: selIds(), step: step, grip: grip, busy: busy, gave: gaveAny }; }, fly: fly, select: function (id) { sel[id] = true; draw(); } };
  }

  root.MannaRelease = {
    open: function (host, o) { return view(host, { kinds: ['p', 'c', 'g'], onBack: o && o.onBack }); },
    guided: function (host, o) { return view(host, { kinds: o.kinds || ['p', 'c', 'g'], guided: o.mode || 'sleep', onDone: o.onDone }); },
    add: add, give: give, live: live, stats: stats, items: function () { return D.items; }, reload: function () { D = load(); }
  };
})(window);
