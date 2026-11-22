/* Bloom Scroll — Treasuring, as a game. A small copy of the real Treasuring app (../Treasure/): place your heart with Jesus, catch what drops from the cloud,
   and give it to a bucket. Five buckets instead of seven (Release, Thanks, Intercede, Hold, Lies). Same look, same short prayers, no score.
   The lists and the lie/truth lines are copied from Treasuring's content.js. Its design belongs to that app; this is a visitor's version. */
(function (root) {
  'use strict';
  var D = {"concerns": ["Money", "My health", "Something I have to decide", "A conversation I’m dreading", "What I said earlier", "The work waiting for me", "The future", "What someone thinks of me", "A deadline", "Being behind", "Something I forgot", "The news", "A habit I can’t shake", "Whether I’m doing enough"], "feelings": ["Tightness in my chest", "Shame", "Wonder", "The urge to check", "Dread", "Relief", "The old accusation", "Restlessness", "Loneliness", "Irritation", "Heaviness", "Gladness", "Numbness", "Weariness", "Longing", "Fear of being seen"], "people": ["A family member", "A friend", "An acquaintance", "A neighbor", "Someone at work", "Someone who is sick", "Someone hard to love", "A leader over me"], "thanks": ["A meal", "Breath in my lungs", "Someone who was kind", "The quiet right now", "A bed to sleep in", "Something that went right today", "Light through a window", "A friend", "That He is near", "Forgiveness", "A task finished", "Something I almost missed"], "thoughts": [{"text": "I should be further along by now.", "note": "It borrows a real thing: He does want you to grow. But He is not holding a deadline you missed. He knows how you are formed and remembers that you are dust (Psalm 103:14)."}, {"text": "If I don’t keep watch, something will go wrong.", "note": "It borrows a real thing: you are meant to be watchful and to do your part. But keeping the world safe was never your job. He who keeps you does not slumber (Psalm 121:3–4)."}, {"text": "God is disappointed in me.", "note": "It borrows a real thing: sin matters to Him. But for those in Christ there is no condemnation (Romans 8:1), and He is near to the brokenhearted (Psalm 34:18)."}, {"text": "I have to earn this.", "note": "It borrows a real thing: obedience is good. But you are saved by grace, as a gift, so that no one can boast (Ephesians 2:8–9)."}, {"text": "Everyone else has it together.", "note": "It borrows a real thing: some people do look settled. But you are comparing their outside to your inside. The Lord looks at the heart (1 Samuel 16:7)."}, {"text": "I’m too much for people.", "note": "It borrows a real thing: someone may once have made you feel that. But He is not tired of you, and He invites all your cares (1 Peter 5:7)."}, {"text": "It’s all up to me.", "note": "It borrows a real thing: you do have a part. But the outcome is His. The Lord establishes the steps (Proverbs 16:9)."}, {"text": "I can’t rest until it’s all done.", "note": "It borrows a real thing: work is good. But He gives sleep to those He loves (Psalm 127:2)."}, {"text": "I’ve already lost my chance.", "note": "It borrows a real thing: some seasons do close. But He is the God who restores the years that were eaten away (Joel 2:25)."}, {"text": "My prayers don’t go anywhere.", "note": "It borrows a real thing: it can feel like silence. But His ears are open to your cry (Psalm 34:15), and the Spirit prays for you when you cannot find the words (Romans 8:26)."}, {"text": "I’m alone in this.", "note": "It borrows a real thing: no one near may see it. But He is with you always (Matthew 28:20) and will never leave you (Hebrews 13:5)."}, {"text": "I’ve done it too many times to be forgiven.", "note": "It borrows a real thing: you have done it before. But if we confess, He is faithful and just to forgive and to cleanse (1 John 1:9)."}, {"text": "I need to know how this ends before I can trust.", "note": "It borrows a real thing: wanting to know is human. But trust walks on the light given for the next step (Proverbs 3:5–6)."}, {"text": "I have to fix everything I said before I can come to Him.", "note": "It borrows a real thing: making things right with people matters (Matthew 5:23–24). But you come to Him first, with confidence, as you are (Hebrews 4:16)."}, {"text": "I’m only worth something when I’m useful.", "note": "It borrows a real thing: serving is good. But you are worth more than the birds He feeds (Luke 12:24), before you do anything at all."}, {"text": "It’s too small to bring to Him.", "note": "It borrows a real thing: it may be small. But He invites you to bring everything to Him in prayer (Philippians 4:6)."}, {"text": "He’s angry about how I spent today.", "note": "It borrows a real thing: a day can be spent badly. But He is compassionate and slow to anger, and has removed our sins as far as the east is from the west (Psalm 103:8, 12)."}, {"text": "If this goes badly, hoping was foolish.", "note": "It borrows a real thing: hope has hurt before. But hope in Him does not put us to shame (Romans 5:5)."}, {"text": "I’ve missed too much to catch up.", "note": "It borrows a real thing: days do get missed. But His mercies are new every morning (Lamentations 3:22–23)."}, {"text": "I must never feel this way.", "note": "It borrows a real thing: some feelings lead us wrong. But He invites you to pour out your heart to Him (Psalm 62:8). The feeling can come to Him as it is."}, {"text": "They will never change.", "note": "It borrows a real thing: change can be slow, and it is not yours to force. But nothing is impossible with God (Luke 1:37)."}, {"text": "I’m the only one who sees this clearly.", "note": "It borrows a real thing: you may be seeing something real. But the wise listen to counsel (Proverbs 12:15), and you do not see the whole."}, {"text": "It’s safer not to hope.", "note": "It borrows a real thing: disappointment hurts. But the psalmist waits and hopes in the Lord (Psalm 130:5)."}, {"text": "I have to settle all of this before bed.", "note": "It borrows a real thing: wanting it settled. But tomorrow has its own worries, and today has enough of its own (Matthew 6:34)."}, {"text": "I’ll never get free of this.", "note": "It borrows a real thing: it has lasted a long time. But if the Son sets you free, you are free indeed (John 8:36)."}, {"text": "I have to be strong for everyone.", "note": "It borrows a real thing: people do lean on you. But His power is made perfect in weakness (2 Corinthians 12:9)."}, {"text": "He only listens when I’ve been good.", "note": "It borrows a real thing: how we live matters. But the one who simply asked for mercy went home right with God (Luke 18:13–14)."}, {"text": "I keep worrying, so I must not have faith.", "note": "It borrows a real thing: worry is not trust. But “I believe; help my unbelief” was received (Mark 9:24)."}], "lies": {"control": {"lie": "It all depends on me.", "truth": "The outcome is His. I do my part, and He carries the rest.", "ref": "Proverbs 16:9; 1 Peter 5:7"}, "provision": {"lie": "God will not provide for me.", "truth": "My Father knows what I need, and He gives it.", "ref": "Matthew 6:31–33; Philippians 4:19"}, "alone": {"lie": "I am alone in this.", "truth": "He is with me always, and He will not leave me.", "ref": "Matthew 28:20; Hebrews 13:5"}, "exposed": {"lie": "If they really knew me, they would turn away.", "truth": "I am fully known and fully loved. In Christ there is no condemnation.", "ref": "Psalm 139:1; Romans 8:1"}, "enough": {"lie": "I am not enough.", "truth": "His power is made perfect in weakness. He is enough.", "ref": "2 Corinthians 12:9"}, "forgotten": {"lie": "God has forgotten me.", "truth": "He cares for me, and He does not forget His own.", "ref": "Isaiah 49:15; 1 Peter 5:7"}, "future": {"lie": "The worst is coming, and I cannot face it.", "truth": "He goes before me. Tomorrow has its own worries, and He is already there.", "ref": "Matthew 6:34; Deuteronomy 31:8"}, "loss": {"lie": "I will lose the ones I love.", "truth": "They are in His hands, and He cares for them more than I can.", "ref": "Matthew 10:29–31"}}, "fears": [{"text": "Running out of money", "lie": "provision"}, {"text": "Something happening to someone I love", "lie": "loss"}, {"text": "Being alone", "lie": "alone"}, {"text": "Being found out", "lie": "exposed"}, {"text": "Failing at what is in front of me", "lie": "enough"}, {"text": "What might happen tomorrow", "lie": "future"}, {"text": "Letting everyone down", "lie": "control"}, {"text": "Being forgotten", "lie": "forgotten"}]};

  var CSS = '' +
    '.tg{--bg:#12141C;--surface:#1B1F2B;--surface-2:#232938;--border:#2D3446;--ink:#ECE8DF;--ink-muted:#98A0B2;--ink-faint:#566079;--gold:#F2C879;--gold-glow:rgba(242,200,121,.38);--heart:#E9788A;--heart-glow:rgba(233,120,138,.4);--cloud:#3A4258;--cloud-open:#5A6684;--font-display:Georgia,"Iowan Old Style","Palatino Linotype",serif;position:absolute;inset:0;overflow:hidden;touch-action:none;color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-user-select:none;user-select:none;background:radial-gradient(ellipse at 50% 70%,color-mix(in srgb,var(--gold) 9%,var(--surface)) 0%,var(--bg) 75%)}' +
    '.tg>*{position:absolute;left:0;top:0}.tg *{box-sizing:border-box}.tg button{font-family:inherit;cursor:pointer;color:inherit}' +
    '.tg .cloud{width:min(86%,340px);height:96px;opacity:.28;transform-origin:50% 50%;transition:opacity 1s ease,filter 1s ease;filter:saturate(.3);pointer-events:none}' +
    '.tg .cloud svg{width:100%;height:100%;overflow:visible}.tg .cloud .puff{fill:var(--cloud);transition:fill 1s ease}.tg.st-open .cloud{opacity:1;filter:none}.tg.st-open .cloud .puff{fill:var(--cloud-open)}' +
    '.tg .cloud .glow{fill:var(--gold);opacity:0;transition:opacity 1.2s ease;filter:blur(14px)}.tg.st-open .cloud .glow{opacity:.28}' +
    '.tg .christ{width:calc(var(--r)*2);height:calc(var(--r)*2);pointer-events:none}' +
    '.tg .christ .halo{position:absolute;inset:-55%;border-radius:50%;background:radial-gradient(circle,var(--gold-glow) 0%,transparent 62%);opacity:.55;transition:opacity .9s ease,transform .9s ease}' +
    '.tg .christ .disc{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 50% 42%,color-mix(in srgb,var(--gold) 80%,#fff) 0%,var(--gold) 55%,color-mix(in srgb,var(--gold) 55%,transparent) 100%);box-shadow:0 0 40px var(--gold-glow);opacity:.9}' +
    '.tg .christ svg{position:absolute;inset:0;width:100%;height:100%}.tg .christ .cross{stroke:var(--bg);stroke-width:4.5;stroke-linecap:round;opacity:.55;fill:none}' +
    '.tg .christ .name{position:absolute;left:0;right:0;top:calc(100% + .35rem);text-align:center;font-family:var(--font-display);font-size:.9rem;letter-spacing:.06em;color:var(--ink-muted)}' +
    '.tg.st-with .christ .halo{opacity:1;transform:scale(1.12);animation:tgbreathe 7s ease-in-out infinite}@keyframes tgbreathe{50%{transform:scale(1.22);opacity:.8}}' +
    '.tg .heart{width:68px;height:68px;padding:0;border:none;background:none;touch-action:none;z-index:5;cursor:grab}.tg .heart.glide{transition:transform .75s cubic-bezier(.2,.75,.25,1)}' +
    '.tg .heart svg{width:100%;height:100%;overflow:visible}.tg .heart .shape{fill:var(--heart);transition:fill .8s ease;filter:drop-shadow(0 0 14px var(--heart-glow))}' +
    '.tg .heart.apart .shape{fill:none;stroke:var(--heart);stroke-width:2.6;stroke-dasharray:5 5;opacity:.85;filter:none}.tg .heart.apart{animation:tgnudge 3.2s ease-in-out infinite}' +
    '.tg .heart.dragging{cursor:grabbing;animation:none}.tg .heart.near .shape{filter:drop-shadow(0 0 22px var(--gold))}@keyframes tgnudge{50%{margin-top:8px}}' +
    '.tg.st-with .heart{animation:none}.tg.st-with .heart svg{animation:tgbeat 5s ease-in-out infinite}@keyframes tgbeat{50%{transform:scale(1.07)}}' +
    '.tg .heartline{left:0;right:0;text-align:center;padding:0 1rem;pointer-events:none;transition:opacity .5s ease}' +
    '.tg .heartline .l1{font-family:var(--font-display);font-style:italic;font-size:1.12rem;color:var(--ink)}.tg .heartline .l2{font-size:.78rem;color:var(--ink-faint);margin-top:.15rem}' +
    '.tg .drop{z-index:3;width:max-content;max-width:80%;padding:.8rem 1.1rem;text-align:center;opacity:0;background:var(--surface-2);border:1px solid var(--border);border-radius:20px;box-shadow:0 8px 28px rgba(0,0,0,.28);touch-action:none;cursor:pointer;pointer-events:none}' +
    '.tg .drop::before{content:"";position:absolute;inset:-16px}.tg .drop.glide{transition:transform .9s cubic-bezier(.3,.7,.3,1),opacity .9s ease}' +
    '.tg .drop .tag{display:block;font-size:.62rem;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:.15rem}' +
    '.tg .drop .txt{font-family:var(--font-display);font-size:1.18rem;line-height:1.3;color:var(--ink)}' +
    '.tg .drop.k-person{border-color:color-mix(in srgb,var(--heart) 45%,var(--border))}.tg .drop.k-thanks{border-color:color-mix(in srgb,var(--gold) 55%,var(--border))}' +
    '.tg .drop.k-feeling{border-color:color-mix(in srgb,#7FA3E0 45%,var(--border))}.tg .drop.k-fear{border-color:color-mix(in srgb,#E0A07F 50%,var(--border))}.tg .drop.k-concern{border-color:color-mix(in srgb,#B79FE0 40%,var(--border))}' +
    '.tg .drop.held{cursor:default;box-shadow:0 0 0 2px var(--gold-glow),0 12px 34px rgba(0,0,0,.35)}.tg .drop.held .txt{font-size:1.32rem}' +
    '.tg .spoken{left:0;right:0;max-width:23rem;margin-inline:auto;text-align:center;padding:0 1rem;pointer-events:none;opacity:0;transition:opacity .7s ease;z-index:4}.tg .spoken.on{opacity:1}' +
    '.tg .spoken .s1{font-family:var(--font-display);font-style:italic;font-size:1.25rem;color:var(--gold);text-shadow:0 0 24px var(--gold-glow)}' +
    '.tg .spoken .s2{font-size:.9rem;color:var(--ink-muted);margin-top:.3rem;text-shadow:0 0 10px var(--bg),0 0 4px var(--bg)}' +
    '.tg .cue{left:0;right:0;max-width:19rem;margin-inline:auto;text-align:center;font-family:var(--font-display);font-style:italic;color:var(--gold);font-size:.95rem;pointer-events:none;opacity:0;transition:opacity .5s ease;z-index:3}.tg .cue.on{opacity:1}' +
    '.tg .holdnote{left:0;right:0;max-width:19rem;margin-inline:auto;text-align:center;font-size:.8rem;color:var(--ink-muted);padding:0 1.5rem;pointer-events:none;opacity:0;transition:opacity .4s ease}.tg .holdnote.on{opacity:1}' +
    '.tg .dock{left:0;right:0;top:auto;bottom:0;height:110px;z-index:4;pointer-events:none}' +
    '.tg .bk{position:absolute;left:0;top:0;width:3rem;padding:.4rem .05rem .3rem;display:flex;flex-direction:column;align-items:center;gap:.12rem;background:var(--surface);border:1px solid var(--border);border-radius:14px;color:var(--ink-muted);pointer-events:auto;transform:var(--pos);transition:transform .2s ease,border-color .2s ease,background .2s ease,opacity .6s ease;opacity:.55}' +
    '.tg .dock.nolayout .bk{transition:none}.tg.st-in .bk{opacity:1}' +
    '.tg .bk svg{width:1.35rem;height:1.35rem;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}.tg .bk .lbl{font-size:.56rem;line-height:1.1;text-align:center;letter-spacing:.01em}' +
    '.tg .bk.father{color:color-mix(in srgb,var(--gold) 80%,var(--ink-muted))}.tg .bk.jesus{color:var(--heart)}.tg .bk.bin{color:#B49A8A}' +
    '.tg .bk.over{transform:var(--pos) scale(1.25);border-color:var(--gold);background:var(--surface-2)}.tg .bk.pulse{animation:tgpulse .9s ease}' +
    '@keyframes tgpulse{40%{transform:var(--pos) scale(1.2);box-shadow:0 0 22px var(--gold-glow)}}';

  var ICON = {
    hands: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10.5V4a1.5 1.5 0 0 1 3 0v6.5M14 10.5V5.5a1.5 1.5 0 0 1 3 0V14M17 9.5a1.5 1.5 0 0 1 3 0V15c0 4-3 7-7 7-3 0-4.5-1.5-6-4l-3-4.5a1.5 1.5 0 0 1 2.5-1.5L8 14"/>',
    thanks: '<path d="M3 11.5V9a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v2.5z" fill="currentColor" fill-opacity=".22"/><rect x="3" y="11.5" width="18" height="8.5" rx="1.5" fill="currentColor" fill-opacity=".1"/><path d="M7.5 5.5v14.5M16.5 5.5v14.5M3 11.5h18"/><rect x="10.2" y="10" width="3.6" height="4.4" rx="1" fill="currentColor"/><path d="M21 2.5v3M19.5 4h3"/>',
    pray: '<path d="M12 2c1.8 2.2 2.8 3.6 2.8 5a2.8 2.8 0 0 1-5.6 0C9.2 5.6 10.2 4.2 12 2z" fill="currentColor" fill-opacity=".3"/><rect x="8.5" y="11" width="7" height="10" rx="1.2"/><path d="M12 9.5v1.5"/>',
    hold: '<path d="M12 3v18M6 9h12"/>',
    lie: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>'
  };
  var BKS = [
    { id: 'hands', cls: 'father', label: 'Release', aria: 'Father, into your hands: release it' },
    { id: 'thanks', cls: 'father', label: 'Thanks', aria: 'Father, thank you: the treasure chest' },
    { id: 'pray', cls: 'father', label: 'Intercede', aria: 'Intercede for a person' },
    { id: 'hold', cls: 'jesus', label: 'Hold', aria: 'Jesus, I hold this to you' },
    { id: 'lie', cls: 'bin jesus', label: 'Lies', aria: 'Jesus, I put this lie down' }
  ];
  var KIND_LABEL = { thought: 'a thought', fear: 'a fear', feeling: 'a feeling', person: 'a person', concern: 'a concern', thanks: 'a thanks' };
  var PACE = 17000;

  function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }

  function start(box) {
    if (!document.getElementById('tg-style')) { var st = document.createElement('style'); st.id = 'tg-style'; st.textContent = CSS; document.head.appendChild(st); }
    var wrap = document.createElement('div'); wrap.className = 'tg';
    wrap.innerHTML = '' +
      '<div class="cloud" aria-hidden="true"><svg viewBox="0 0 340 96"><ellipse class="glow" cx="170" cy="76" rx="120" ry="26"/><circle class="puff" cx="82" cy="58" r="30"/><circle class="puff" cx="128" cy="40" r="38"/><circle class="puff" cx="184" cy="36" r="40"/><circle class="puff" cx="236" cy="54" r="32"/><rect class="puff" x="70" y="56" width="180" height="30" rx="15"/></svg></div>' +
      '<div class="christ" aria-hidden="true"><div class="halo"></div><div class="disc"></div><svg viewBox="0 0 100 100"><path class="cross" d="M50 24v52M32 42h36"/></svg><div class="name">Jesus</div></div>' +
      '<div class="heartline"><div class="l1">Jesus, I place my heart with you.</div><div class="l2">drag your heart to Him</div></div>' +
      '<button class="heart apart" aria-label="Your heart. Press to place it with Jesus."><svg viewBox="0 0 64 64"><path class="shape" d="M32 56C10 40 6 28 6 20a13 13 0 0 1 26-3 13 13 0 0 1 26 3c0 8-4 20-26 36z"/></svg></button>' +
      '<div class="drop" role="button" tabindex="0"><span class="tag"></span><span class="txt"></span></div>' +
      '<div class="spoken"><div class="s1"></div><div class="s2"></div></div>' +
      '<div class="cue"></div><div class="holdnote"></div>' +
      '<div class="dock">' + BKS.map(function (b) { return '<button class="bk ' + b.cls + '" data-b="' + b.id + '" aria-label="' + b.aria + '"><svg viewBox="0 0 24 24">' + ICON[b.id] + '</svg><span class="lbl">' + b.label + '</span></button>'; }).join('') + '</div>';
    box.appendChild(wrap);
    function q(s) { return wrap.querySelector(s); }
    var cloudEl = q('.cloud'), christEl = q('.christ'), heartEl = q('.heart'), heartline = q('.heartline'), dropEl = q('.drop'), spokenEl = q('.spoken'), cue = q('.cue'), holdnote = q('.holdnote'), dock = q('.dock');
    var G = {}, state = 'apart', item = null, fall = null, raf = 0, timers = [], gone = false, caught = false, hints = 0, bag = [], lastText = '', dragItem = null, dragHeart = null, hoverB = null, noteTimer = 0, spokenTimer = 0, baseNote = '', lastDrag = 0;

    function put(e, x, y, s) { e.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) scale(' + (s || 1) + ')'; }
    function later(ms, fn) { var id = setTimeout(function () { timers = timers.filter(function (t) { return t !== id; }); if (!gone) fn(); }, ms); timers.push(id); return id; }

    function layout() {
      var W = wrap.clientWidth, H = wrap.clientHeight; if (!W || !H) return;
      var r = Math.max(40, Math.min(W * 0.2, H * 0.12, 82));
      G = { W: W, H: H, r: r, christ: { x: W / 2, y: H * 0.63 }, cloud: { x: W / 2, y: H * 0.105 }, apart: { x: W / 2, y: H * 0.36 }, y0: H * 0.19, yEnd: H * 0.63 - r * 0.9, hold: { x: W / 2, y: H * 0.27 } };
      christEl.style.setProperty('--r', r + 'px'); put(cloudEl, G.cloud.x, G.cloud.y); put(christEl, G.christ.x, G.christ.y);
      var apart = state === 'apart'; heartEl.classList.remove('glide'); put(heartEl, apart ? G.apart.x : G.christ.x, apart ? G.apart.y : G.christ.y);
      heartline.style.top = (G.apart.y + 48) + 'px'; spokenEl.style.top = (H * 0.345) + 'px'; put(cue, W / 2, H * 0.81); holdnote.style.top = (G.hold.y + 62) + 'px';
      var bks = dock.querySelectorAll('.bk'), n = bks.length, side = 34, lift = Math.min(46, H * 0.065), dh = Math.round(lift + 64);
      dock.style.height = dh + 'px'; dock.classList.add('nolayout');
      Array.prototype.forEach.call(bks, function (b, i) { var t = (i - (n - 1) / 2) / ((n - 1) / 2), x = side + (W - 2 * side) * (i / (n - 1)), y = dh - 33 - lift * t * t; b.style.setProperty('--pos', 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-50%) rotate(' + (-t * 12).toFixed(1) + 'deg)'); });
      requestAnimationFrame(function () { requestAnimationFrame(function () { dock.classList.remove('nolayout'); }); });
    }
    layout(); var ro = null; try { ro = new ResizeObserver(function () { layout(); }); ro.observe(wrap); } catch (e) {}

    function setState(s) {
      state = s; var apart = s === 'apart';
      wrap.classList.toggle('st-in', !apart); wrap.classList.toggle('st-with', !apart); wrap.classList.toggle('st-open', !apart);
      heartEl.classList.toggle('apart', apart); heartline.style.opacity = apart ? 1 : 0;
    }
    function speak(l1, l2) { spokenEl.querySelector('.s1').textContent = l1; spokenEl.querySelector('.s2').textContent = l2 || ''; spokenEl.classList.add('on'); }
    function unspeak() { clearTimeout(spokenTimer); spokenEl.classList.remove('on'); }
    function readMs(l, sub) { return 2800 + (sub ? 1200 + 45 * sub.length : 0); }
    function flash(l1, l2) { speak(l1, l2); clearTimeout(spokenTimer); spokenTimer = setTimeout(function () { if (!gone) unspeak(); }, readMs(l1, l2)); }
    function setNote(t, on) { holdnote.textContent = t || ''; holdnote.classList.toggle('on', !!on && !!t); }
    function flashNote(t, ms) { clearTimeout(noteTimer); setNote(t, true); noteTimer = setTimeout(function () { if (!gone) setNote(baseNote, true); }, ms || 2800); }
    function pulse(name) { var b = dock.querySelector('[data-b="' + name + '"]'); b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); }

    // ---- the heart ----
    function nearJesus() { var hr = heartEl.getBoundingClientRect(), cr = christEl.getBoundingClientRect(); return Math.hypot(hr.left + hr.width / 2 - (cr.left + cr.width / 2), hr.top + hr.height / 2 - (cr.top + cr.height / 2)) < G.r + 34; }
    heartEl.addEventListener('pointerdown', function (e) {
      if (state !== 'apart') return; e.preventDefault(); try { heartEl.setPointerCapture(e.pointerId); } catch (x) {}
      dragHeart = { sx: e.clientX, sy: e.clientY, rect: wrap.getBoundingClientRect(), moved: false }; heartEl.classList.add('dragging');
    });
    heartEl.addEventListener('pointermove', function (e) {
      if (!dragHeart) return; if (!dragHeart.moved && Math.hypot(e.clientX - dragHeart.sx, e.clientY - dragHeart.sy) < 6) return; dragHeart.moved = true;
      heartEl.classList.remove('glide'); put(heartEl, e.clientX - dragHeart.rect.left, e.clientY - dragHeart.rect.top, 1); heartEl.classList.toggle('near', nearJesus());
    });
    function endHeart(e, cancel) {
      if (!dragHeart) return; var d = dragHeart; dragHeart = null; heartEl.classList.remove('dragging'); var near = d.moved ? nearJesus() : true; heartEl.classList.remove('near');
      if (!cancel && near) place(); else { heartEl.classList.add('glide'); put(heartEl, G.apart.x, G.apart.y); }
    }
    heartEl.addEventListener('pointerup', function (e) { endHeart(e, false); }); heartEl.addEventListener('pointercancel', function (e) { endHeart(e, true); });
    function place() { heartEl.classList.add('glide'); put(heartEl, G.christ.x, G.christ.y); setState('with'); flash('Jesus, I place my heart with you.', ''); later(3600, function () { unspeak(); scheduleDrop(600); }); }

    // ---- what falls ----
    function nextItem() {
      if (!bag.length) bag = ['concern', 'thanks', 'feeling', 'person', 'fear', 'thought', 'thanks', 'concern', 'feeling'].sort(function () { return Math.random() - 0.5; });
      var kind = bag.shift(), it, tries = 0;
      do {
        if (kind === 'concern') it = { kind: kind, text: rnd(D.concerns) }; else if (kind === 'feeling') it = { kind: kind, text: rnd(D.feelings) };
        else if (kind === 'person') it = { kind: kind, text: rnd(D.people) }; else if (kind === 'thanks') it = { kind: kind, text: rnd(D.thanks) };
        else if (kind === 'fear') { var f = rnd(D.fears); it = { kind: kind, text: f.text, lie: f.lie }; } else { var t = rnd(D.thoughts); it = { kind: 'thought', text: t.text, note: t.note }; }
      } while (it.text === lastText && tries++ < 5);
      lastText = it.text; return it;
    }
    function scheduleDrop(ms) { later(ms, function () { if (state === 'with') startFall(nextItem()); }); }
    function startFall(it) {
      item = it; state = 'dropping'; dropEl.querySelector('.tag').textContent = KIND_LABEL[it.kind] || ''; dropEl.querySelector('.txt').textContent = it.text;
      dropEl.className = 'drop k-' + it.kind; dropEl.style.pointerEvents = 'auto'; dropEl.style.opacity = 0; put(dropEl, G.W / 2, G.y0, 0.8);
      fall = { t0: performance.now() }; if (!caught) { cue.textContent = 'Tap the drop to catch it.'; cue.classList.add('on'); }
      raf = requestAnimationFrame(tick);
    }
    function tick(now) {
      if (gone || !fall || state !== 'dropping') return; var p = (now - fall.t0) / PACE; if (p >= 1) { arrive(); return; }
      var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; e = 0.6 * p + 0.4 * e;
      put(dropEl, G.W / 2 + Math.sin(p * Math.PI * 3) * G.W * 0.05, G.y0 + (G.yEnd - G.y0) * e, 0.82 + 0.18 * Math.min(1, p * 6)); dropEl.style.opacity = Math.min(1, p * 9);
      raf = requestAnimationFrame(tick);
    }
    function arrive() {
      fall = null; cue.classList.remove('on'); dropEl.style.pointerEvents = 'none';
      var tf = dropEl.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/); dropEl.classList.add('glide'); put(dropEl, tf ? +tf[1] : G.W / 2, (tf ? +tf[2] : G.yEnd) + 46, 0.9); dropEl.style.opacity = 0;
      state = 'with'; later(1000, function () { dropEl.classList.remove('glide'); }); scheduleDrop(1800);
    }
    function catchNow() { if (state !== 'dropping' || !fall) return false; cancelAnimationFrame(raf); fall = null; state = 'holding'; cue.classList.remove('on'); caught = true; baseNote = hints < 3 ? 'Drag it to a bucket below, or tap one.' : ''; if (hints < 3) hints++; return true; }
    function returnToHold() { dropEl.classList.remove('dragging'); dropEl.classList.add('glide', 'held'); dropEl.style.opacity = 1; put(dropEl, G.hold.x, G.hold.y, 1.06); setNote(baseNote, true); }
    function hideDrop() { cancelAnimationFrame(raf); fall = null; dropEl.classList.remove('glide', 'held', 'dragging'); dropEl.style.opacity = 0; dropEl.style.pointerEvents = 'none'; }

    // ---- the dock ----
    function bucketAt(cx, cy) { var best = null, bd = 44; Array.prototype.forEach.call(dock.querySelectorAll('.bk'), function (b) { var r = b.getBoundingClientRect(), d = Math.hypot(cx - (r.left + r.width / 2), cy - (r.top + r.height / 2)); if (d < bd) { bd = d; best = b; } }); return best; }
    function bucketCenter(name) { var r = dock.querySelector('[data-b="' + name + '"]').getBoundingClientRect(), sr = wrap.getBoundingClientRect(); return { x: r.left + r.width / 2 - sr.left, y: r.top + r.height / 2 - sr.top }; }
    function lineFor(name) { return name === 'pray' ? 'Father, I pray for ' + (item && item.kind === 'person' ? lowerFirst(item.text) : 'them') + ' now.' : name === 'hands' ? 'Father, into your hands.' : name === 'thanks' ? 'Father, thank you.' : name === 'hold' ? 'Jesus, I hold this to you.' : 'Jesus, I put this lie down.'; }
    function hover(b) { if (b === hoverB) return; if (hoverB) hoverB.classList.remove('over'); hoverB = b; if (b) { b.classList.add('over'); setNote(lineFor(b.getAttribute('data-b')), true); holdnote.style.color = 'var(--gold)'; } else { holdnote.style.color = ''; setNote(baseNote, true); } }
    dropEl.addEventListener('pointerdown', function (e) {
      e.preventDefault(); if (state === 'dropping') catchNow(); if (state !== 'holding') return;
      try { dropEl.setPointerCapture(e.pointerId); } catch (x) {} dragItem = { moved: false, rect: wrap.getBoundingClientRect(), sx: e.clientX, sy: e.clientY }; dropEl.classList.add('held');
    });
    dropEl.addEventListener('pointermove', function (e) {
      if (!dragItem) return; if (!dragItem.moved && Math.hypot(e.clientX - dragItem.sx, e.clientY - dragItem.sy) < 7) return;
      if (!dragItem.moved) { dragItem.moved = true; dropEl.classList.remove('glide'); dropEl.classList.add('dragging'); clearTimeout(noteTimer); }
      put(dropEl, e.clientX - dragItem.rect.left, e.clientY - dragItem.rect.top - 48, 1); hover(bucketAt(e.clientX, e.clientY));
    });
    function endItemDrag(e, cancel) {
      if (!dragItem) return; var d = dragItem; dragItem = null; var b = d.moved && !cancel ? bucketAt(e.clientX, e.clientY) : null; hover(null);
      if (d.moved) lastDrag = Date.now();
      if (b) bucketDrop(b.getAttribute('data-b')); else if (d.moved) returnToHold();
    }
    dropEl.addEventListener('pointerup', function (e) { endItemDrag(e, false); }); dropEl.addEventListener('pointercancel', function (e) { endItemDrag(e, true); });
    dock.addEventListener('click', function (e) { var b = e.target.closest('.bk'); if (!b || state !== 'holding' || Date.now() - lastDrag < 400) return; bucketDrop(b.getAttribute('data-b')); });

    function bounce(msg) { returnToHold(); flashNote(msg, 3000); }
    function bucketDrop(name) {
      if (state !== 'holding' || !item) return; var it = item;
      if (name === 'pray' && it.kind !== 'person') return bounce('Intercede is for a person you are praying for.');
      if (name === 'lie' && it.kind === 'person') return bounce('A person is never a lie. Give them to the Father.');
      if (name === 'lie' && it.kind === 'thanks') return bounce('Thanks is not a lie.');
      if (name === 'hold') { returnToHold(); flash('Jesus, I hold this to you.', ''); pulse('hold'); return; }
      var line = lineFor(name), sub = '';
      if (name === 'thanks') { line = it.kind === 'thanks' || it.kind === 'person' ? 'Father, thank you for ' + lowerFirst(it.text) + '.' : line; sub = 'I treasure the gift.'; }
      if (name === 'lie') {
        if (it.kind === 'fear' && it.lie && D.lies[it.lie]) { var L = D.lies[it.lie]; sub = 'The lie that may be underneath: “' + L.lie + '” The truth: ' + L.truth + ' (' + L.ref + ')'; }
        else if (it.kind === 'thought') sub = it.note;
      }
      state = 'offering'; setNote('', false); var t = bucketCenter(name); pulse(name); speak(line, sub);
      dropEl.classList.remove('held', 'dragging'); dropEl.classList.add('glide'); put(dropEl, t.x, t.y, 0.2); dropEl.style.opacity = 0;
      later(readMs(line, sub), function () { unspeak(); hideDrop(); item = null; setState('with'); scheduleDrop(900); });
    }

    return { stop: function () { gone = true; cancelAnimationFrame(raf); timers.forEach(clearTimeout); clearTimeout(noteTimer); clearTimeout(spokenTimer); if (ro) ro.disconnect(); if (wrap.parentNode) wrap.parentNode.removeChild(wrap); },
      peek: function () { return { state: state, item: item, spoken: spokenEl.querySelector('.s1').textContent, sub: spokenEl.querySelector('.s2').textContent, G: G }; } };
  }

  root.MannaGames.list.push({ id: 'treasuring', title: 'Treasuring', blurb: 'Place your heart with Jesus, catch what drops, and give it to Him. A small copy of the Treasuring app, with five buckets.', start: start });
})(typeof window !== 'undefined' ? window : globalThis);
