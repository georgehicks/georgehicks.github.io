/* Treasuring — the player. Everything on screen follows the engine's states (see engine.js / spec section 4). */
(function () {
  'use strict';
  var C = TreasureContent, E = TreasureEngine, L = C.LINES;
  var KEY = 'treasure:v1';
  var PACE = { slow: 26000, gentle: 18000, brisk: 11000 };
  var KIND_LABEL = { thought: 'a thought', feeling: 'a feeling', person: 'a person', concern: 'a concern', thanks: 'a thanks' };
  var LIST_NAMES = [
    { id: 'people', label: 'People', kind: 'person', add: 'Add a name', empty: 'No one here. Add a name and they will drop.' },
    { id: 'concerns', label: 'Concerns', kind: 'concern', add: 'Add a concern', empty: 'Nothing here.' },
    { id: 'thanks', label: 'Thanks', kind: 'thanks', add: 'Add a thanks', empty: 'Nothing here.' },
    { id: 'feelings', label: 'Feelings', kind: 'feeling', add: 'Add a feeling', empty: 'Nothing here.' },
    { id: 'claims', label: 'Prayer words', kind: 'claim', add: 'Add a word to pray', empty: 'Nothing here.' }
  ];

  // ---------- storage ----------
  function uid() { return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function seed(arr, p) { return arr.map(function (t, i) { return { id: p + i, text: t, paused: false }; }); }
  function defaults() {
    return { v: 1, offers: [], queue: [], pending: null, deckState: { deck: [], drawn: [] }, lastKey: null,
      settings: { pace: 'gentle', theme: 'auto', length: 'd30' },
      lists: { people: seed(C.SEEDS.people, 'p'), concerns: seed(C.SEEDS.concerns, 'c'), thanks: seed(C.SEEDS.thanks, 'g'), feelings: seed(C.SEEDS.feelings, 'f'), claims: seed(C.SEEDS.claims, 'w') } };
  }
  function load() {
    var d = defaults();
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var s = JSON.parse(raw); for (var k in s) d[k] = s[k]; }
    } catch (e) {}
    d.settings = Object.assign({ pace: 'gentle', theme: 'auto', length: 'd30' }, d.settings);
    if (!d.peopleSeeded) { // the generic starters become ordinary, editable list items (once)
      if (!d.lists.people.some(function (p) { return /^p\d+$/.test(p.id); })) d.lists.people = d.lists.people.concat(seed(C.SEEDS.people, 'p'));
      d.peopleSeeded = true;
    }
    return d;
  }
  var S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  var sit = new E.Sitting(S);

  // ---------- dom ----------
  function $(id) { return document.getElementById(id); }
  function el(tag, props, kids) {
    var e = document.createElement(tag);
    for (var k in (props || {})) {
      var v = props[k];
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    (kids || []).forEach(function (c) { if (c) e.append(c); });
    return e;
  }
  var stage = $('stage'), cloudEl = $('cloud'), christEl = $('christ'), heartEl = $('heart'), heartline = $('heartline'),
    dropEl = $('drop'), spokenEl = $('spoken'), restEl = $('restnote'), bPray = $('b-pray'), bSpirit = $('b-spirit'),
    dock = $('dock'), cue = $('cue'), holdnote = $('holdnote'), partpick = $('partpick'), contBtn = $('btn-continue'), installBar = $('installbar'), pauseBtn = $('btn-pause'), overlays = $('overlays');

  function put(e, x, y, s) { e.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) scale(' + (s || 1) + ')'; }

  // ---------- timers ----------
  var timers = [], raf = 0, fall = null;
  function later(ms, fn) { var id = setTimeout(function () { timers = timers.filter(function (t) { return t !== id; }); fn(); }, ms); timers.push(id); return id; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  // ---------- geometry ----------
  var G = {}, heartPos = { x: 0, y: 0 };
  function layout() {
    var W = stage.clientWidth, H = stage.clientHeight; if (!W || !H) return;
    var r = Math.max(40, Math.min(W * 0.2, H * 0.12, 82));
    G = { W: W, H: H, r: r, christ: { x: W / 2, y: H * 0.63 }, cloud: { x: W / 2, y: H * 0.105 }, apart: { x: W / 2, y: H * 0.36 },
      y0: H * 0.19, yEnd: H * 0.63 - r * 0.9, hold: { x: W / 2, y: H * 0.27 } };
    christEl.style.setProperty('--r', r + 'px');
    put(cloudEl, G.cloud.x, G.cloud.y); put(christEl, G.christ.x, G.christ.y);
    var apart = sit.state === 'apart' || sit.state === 'placing';
    heartPos = apart ? G.apart : G.christ;
    heartEl.classList.remove('glide'); put(heartEl, heartPos.x, heartPos.y);
    heartline.style.top = (G.apart.y + 48) + 'px';
    spokenEl.style.top = (H * 0.345) + 'px'; restEl.style.top = (H * 0.33) + 'px';
    put(contBtn, W / 2, H * 0.455); put(cue, W / 2, H * 0.77); installBar.style.top = (H * 0.775) + 'px'; holdnote.style.top = (G.hold.y + 62) + 'px'; partpick.style.top = (H * 0.36) + 'px';
    // the buckets follow a bowl-shaped curve along the bottom: lowest in the middle, rising and tilting toward the ends
    var bks = dock.querySelectorAll('.bk'), n = bks.length, side = 27, lift = Math.min(46, H * 0.065), dh = Math.round(lift + 64);
    dock.style.height = dh + 'px'; dock.classList.add('nolayout');
    Array.prototype.forEach.call(bks, function (b, i) {
      var t = (i - (n - 1) / 2) / ((n - 1) / 2), x = side + (W - 2 * side) * (i / (n - 1)), y = dh - 33 - lift * t * t;
      b.style.setProperty('--pos', 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-50%) rotate(' + (-t * 12).toFixed(1) + 'deg)');
    });
    requestAnimationFrame(function () { requestAnimationFrame(function () { dock.classList.remove('nolayout'); }); });
    var sb = bucketEl('spirit').getBoundingClientRect(), sr = stage.getBoundingClientRect();
    G.spirit = { x: sb.left + sb.width / 2 - sr.left, y: sb.top + sb.height / 2 - sr.top };
  }

  // ---------- render ----------
  var restMsg = 'Resting. Your heart stays with Him.';
  function render() {
    var st = sit.state, apart = st === 'apart' || st === 'placing';
    stage.classList.toggle('st-in', !apart);
    stage.classList.toggle('st-with', !apart && st !== 'paused');
    stage.classList.toggle('st-open', !apart && st !== 'paused');
    heartEl.classList.toggle('apart', apart);
    heartEl.setAttribute('aria-label', apart ? 'Your heart. Press to place it with Jesus.' : 'Your heart, with Jesus. Press to take it back.');
    heartline.style.opacity = apart ? 1 : 0;
    restEl.textContent = restMsg; restEl.classList.toggle('on', st === 'paused');
    pauseBtn.hidden = !(st === 'with' || st === 'dropping');
    contBtn.hidden = st !== 'paused'; contBtn.textContent = run.over ? 'Keep going' : 'Continue';
    installBar.hidden = !(st === 'paused' && run.over && !isInstalled() && !S.settings.installDone);
    updateSpirit();
  }
  function updateSpirit() {
    var n = S.queue.length, c = $('spirit-count');
    c.hidden = !n; c.textContent = n;
    bSpirit.classList.toggle('has', n > 0);
    bSpirit.setAttribute('aria-label', 'Holy Spirit, help me understand. ' + (n ? n + ' here with Him.' : 'Nothing here yet.'));
  }
  function pulse(b) { b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); }

  function speak(l1, l2) {
    spokenEl.querySelector('.s1').textContent = l1; spokenEl.querySelector('.s2').textContent = l2 || '';
    spokenEl.classList.add('on');
  }
  function unspeak() { clearTimeout(spokenTimer); spokenEl.classList.remove('on'); }
  // A flashed line stays long enough to read: a base, plus time for any longer note beneath it.
  var spokenTimer = 0;
  function readMs(line, sub) { return 2600 + (sub ? 1200 + 45 * sub.length : 0); }
  function flash(l1, l2) { speak(l1, l2); clearTimeout(spokenTimer); spokenTimer = setTimeout(unspeak, readMs(l1, l2)); }

  // ---------- flow control ----------
  function hideDrop() { cue.classList.remove('on'); cancelAnimationFrame(raf); fall = null; dropEl.classList.remove('glide', 'held', 'dragging'); dropEl.style.opacity = 0; dropEl.style.pointerEvents = 'none'; }
  function closeSheet() { holdnote.classList.remove('on'); partpick.hidden = true; }
  function abortFlow() { clearTimers(); hideDrop(); closeSheet(); unspeak(); }
  // How long a sitting lasts: a number of drops or minutes of time with Him. Reaching it only rests the drops.
  var run = { drops: 0, ms: 0, since: 0, over: false };
  var LENGTHS = [['d15', '15 drops'], ['d30', '30 drops'], ['d50', '50 drops'], ['m5', '5 minutes'], ['m10', '10 minutes'], ['m20', '20 minutes'], ['none', 'No end']];
  function clockOn() { if (!run.since) run.since = Date.now(); }
  function clockOff() { if (run.since) { run.ms += Date.now() - run.since; run.since = 0; } }
  function resetRun() { run = { drops: 0, ms: 0, since: Date.now(), over: false }; }
  function limitReached() {
    var l = S.settings.length || 'd30'; if (l === 'none') return false;
    var n = +l.slice(1);
    if (l[0] === 'd') return run.drops >= n;
    return run.ms + (run.since ? Date.now() - run.since : 0) >= n * 60000;
  }
  function stopForNow(msg) {
    abortFlow(); if (!sit.pause()) return; clockOff(); restMsg = msg; save(); render();
  }
  contBtn.addEventListener('click', function () { resume(); });
  pauseBtn.addEventListener('click', function () { stopForNow('Resting. Your heart stays with Him.'); });
  function resume() { if (sit.resume()) { if (run.over) resetRun(); else clockOn(); save(); render(); scheduleDrop(900); } }

  function scheduleDrop(ms) { later(ms, nextDrop); }
  function draw() {
    var item = E.drawNext(S.deckState, E.buildPool(S.lists), Math.random, S.lastKey);
    if (item) S.lastKey = item.key; return item;
  }
  function nextDrop() {
    if (sit.state !== 'with') return;
    if (limitReached()) { run.over = true; stopForNow('That is a full sitting. Your heart is still with Him, and you can stay as long as you like.'); return; }
    var wasPending = !!S.pending;
    var item = S.pending || draw(); if (!item) return;
    if (!sit.beginDrop(item)) return;
    if (!wasPending) run.drops++;
    save(); startFall(item);
  }
  function startFall(item) {
    dropEl.querySelector('.tag').textContent = KIND_LABEL[item.kind] || '';
    dropEl.querySelector('.txt').textContent = item.text;
    dropEl.className = 'drop k-' + item.kind;
    dropEl.style.pointerEvents = 'auto'; dropEl.style.opacity = 0;
    put(dropEl, G.W / 2, G.y0, .8);
    fall = { item: item, t0: performance.now(), dur: PACE[S.settings.pace] || PACE.gentle };
    if (!S.settings.caught) { cue.textContent = 'Tap the drop to catch it.'; cue.classList.add('on'); }
    raf = requestAnimationFrame(tick);
  }
  function tick(now) {
    if (!fall || sit.state !== 'dropping') return;
    var p = (now - fall.t0) / fall.dur;
    if (p >= 1) { arrive(); return; }
    var e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; e = .6 * p + .4 * e; // nearly steady, a soft start
    var y = G.y0 + (G.yEnd - G.y0) * e, x = G.W / 2 + Math.sin(p * Math.PI * 3) * G.W * 0.05;
    put(dropEl, x, y, .82 + .18 * Math.min(1, p * 6));
    dropEl.style.opacity = Math.min(1, p * 9);
    raf = requestAnimationFrame(tick);
  }
  // Uncaught: it does not strike the heart. It goes to the Holy Spirit's bucket.
  function arrive() {
    fall = null; cue.classList.remove('on'); dropEl.style.pointerEvents = 'none';
    // it passes by: a little further down, and gone. It is not sent to any bucket.
    var tf = dropEl.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
    dropEl.classList.add('glide'); put(dropEl, tf ? +tf[1] : G.W / 2, (tf ? +tf[2] : G.yEnd) + 46, .9); dropEl.style.opacity = 0;
    sit.arriveUncaught(); save();
    later(1000, function () { dropEl.classList.remove('glide'); });
    if (sit.uncaughtRun >= 4) { stopForNow('It has been quiet, so the drops are resting. Your heart is still with Him.'); return; }
    scheduleDrop(1800);
  }

  // ---------- the dock: grab a drop, drag it to a bucket ----------
  var BK = { hands: 'into-hands', part: 'my-part', thanks: 'thank-you', spirit: 'understand', hold: 'hold', pray: 'pray-now', lie: 'lie' };
  function bucketEl(name) { return dock.querySelector('[data-b="' + name + '"]'); }
  function bucketAt(cx, cy) {
    var best = null, bd = 40; // within about a bucket's reach of its centre; the nearest wins
    Array.prototype.forEach.call(dock.querySelectorAll('.bk'), function (b) {
      var r = b.getBoundingClientRect(), d = Math.hypot(cx - (r.left + r.width / 2), cy - (r.top + r.height / 2));
      if (d < bd) { bd = d; best = b; }
    });
    return best;
  }
  function bucketCenter(name) {
    var r = bucketEl(name).getBoundingClientRect(), sr = stage.getBoundingClientRect();
    return { x: r.left + r.width / 2 - sr.left, y: r.top + r.height / 2 - sr.top };
  }
  function lineFor(name, item) { return name === 'pray' ? E.lineText('pray-now', item ? spokenName(item.text) : '') : L[BK[name]].text; }

  var baseNote = '', noteTimer = 0;
  function setNote(t, on) { holdnote.textContent = t || ''; holdnote.classList.toggle('on', !!on && !!t); }
  function flashNote(t, ms) { clearTimeout(noteTimer); setNote(t, true); noteTimer = setTimeout(function () { setNote(baseNote, true); }, ms || 2600); }

  function catchNow() {
    if (sit.state !== 'dropping' || !fall) return false;
    cancelAnimationFrame(raf); var item = fall.item; fall = null;
    sit.catchDrop(); cue.classList.remove('on'); S.settings.caught = true; save(); render();
    baseNote = '';
    if (item.kind === 'person' && item.part) baseNote = 'Your part last time: ' + item.part;
    else if ((S.settings.hint || 0) < 4) { baseNote = 'Drag it to a bucket below, or tap one.'; S.settings.hint = (S.settings.hint || 0) + 1; save(); }
    return true;
  }
  function returnToHold() {
    dropEl.classList.remove('dragging'); dropEl.classList.add('glide', 'held'); dropEl.style.opacity = 1;
    put(dropEl, G.hold.x, G.hold.y, 1.06); setNote(baseNote, true);
  }
  var dragItem = null, hoverB = null;
  function hover(b) {
    if (b === hoverB) return;
    if (hoverB) hoverB.classList.remove('over');
    hoverB = b;
    if (b) { b.classList.add('over'); setNote(lineFor(b.getAttribute('data-b'), sit.drop), true); holdnote.style.color = 'var(--gold)'; }
    else { holdnote.style.color = ''; setNote(baseNote, true); }
  }
  dropEl.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    if (sit.state === 'dropping') catchNow();
    if (sit.state !== 'holding') return;
    try { dropEl.setPointerCapture(e.pointerId); } catch (x) {}
    dragItem = { moved: false, rect: stage.getBoundingClientRect(), sx: e.clientX, sy: e.clientY };
    dropEl.classList.add('held');
  });
  dropEl.addEventListener('pointermove', function (e) {
    if (!dragItem) return;
    if (!dragItem.moved && Math.hypot(e.clientX - dragItem.sx, e.clientY - dragItem.sy) < 7) return;
    if (!dragItem.moved) { dragItem.moved = true; dropEl.classList.remove('glide'); dropEl.classList.add('dragging'); clearTimeout(noteTimer); }
    put(dropEl, e.clientX - dragItem.rect.left, e.clientY - dragItem.rect.top - 48, 1);
    hover(bucketAt(e.clientX, e.clientY));
  });
  function endItemDrag(e, cancel) {
    if (!dragItem) return; var d = dragItem; dragItem = null;
    var b = d.moved && !cancel ? bucketAt(e.clientX, e.clientY) : null;
    hover(null); dropEl.classList.remove('dragging');
    if (b) bucketDrop(b.getAttribute('data-b')); else returnToHold();
  }
  dropEl.addEventListener('pointerup', function (e) { endItemDrag(e, false); });
  dropEl.addEventListener('pointercancel', function (e) { endItemDrag(e, true); });
  dropEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (catchNow()) returnToHold(); }
  });
  // Tapping a bucket while holding is the same as dropping on it; otherwise it just shows its line.
  Array.prototype.forEach.call(dock.querySelectorAll('.bk'), function (b) {
    b.addEventListener('click', function () {
      var name = b.getAttribute('data-b');
      if (sit.state === 'holding') { bucketDrop(name); return; }
      if (name === 'spirit') { openSpirit(); return; }
      if (name === 'pray') { openPrayBucket(); return; }
      var st = sit.state; if (st === 'apart' || st === 'placing') { flash('Jesus, I place my heart with you.', 'Drag your heart to Him first.'); return; }
      flash(lineFor(name, null), '');
    });
  });

  function lieOrBounce(msg) { returnToHold(); flashNote(msg, 3000); }
  function bucketDrop(name) {
    var item = sit.drop; if (!item || sit.state !== 'holding') return;
    if (name === 'pray' && item.kind !== 'person') { lieOrBounce('Intercede is for a person you are praying for.'); return; }
    if (name === 'lie' && item.kind === 'person') { lieOrBounce('A person is never a lie. Give them to the Father.'); return; }
    if (name === 'lie' && item.kind === 'thanks') { lieOrBounce('Thanks is not a lie.'); return; }
    if (name === 'hold') { sit.hold(); save(); returnToHold(); flash(L.hold.text, ''); pulse(bucketEl('hold')); return; }
    if (name === 'part') { showPartPick(item); return; }
    doOffer(item, BK[name], null, name);
  }
  function partPickDone() { partpick.hidden = true; partpick.innerHTML = ''; }
  function showPartPick(item) {
    returnToHold(); setNote('', false);
    partpick.innerHTML = ''; partpick.hidden = false;
    partPicker(partpick, function (part) { partPickDone(); doOffer(item, 'my-part', part, 'part'); }, function () { partPickDone(); setNote(baseNote, true); });
  }
  function lineBtn(id, soft, sublabel, onclick, text) {
    return el('button', { class: 'linebtn' + (soft ? ' soft' : ''), 'data-line': id, onclick: onclick }, [
      el('span', { class: 'line', text: text || L[id].text }), el('span', { class: 'sub', text: sublabel || L[id].label })]);
  }
  function partPicker(container, onPick, onCancel, title, noneText) {
    container.append(el('div', { class: 'sheet-title', text: title || L['my-part'].text }));
    var chips = el('div', { class: 'chips' });
    chips.append(el('button', { class: 'chip', text: noneText || 'None today', onclick: function () { onPick('none'); } }));
    C.PARTS.forEach(function (p) { chips.append(el('button', { class: 'chip', text: p, onclick: function () { onPick(p); } })); });
    chips.append(el('button', { class: 'chip quiet', text: 'Write my own…', onclick: function () {
      askText({ label: 'Today’s part', placeholder: 'One thing', ok: function (v) { onPick(v); }, cancel: onCancel });
    } }));
    container.append(chips);
    container.append(el('button', { class: 'linkbtn', text: 'Back', onclick: onCancel }));
  }
  function rememberPart(item, part) {
    if (item.kind !== 'person' || !item.listId) return;
    var p = S.lists.people.filter(function (x) { return x.id === item.listId; })[0];
    if (!p) return;
    if (!part || /^none\b/i.test(part)) delete p.part; else p.part = part;
  }
  // After "Father, thank you." lands, name what it was for — only where that reads true: a thanks, or a person.
  var TREASURE = 'I treasure the gift.';
  var LEAD = /^(a|an|the|someone|something|that|my|our|his|her|this)\b/i;
  function spokenName(t) { return LEAD.test(t || '') ? t.charAt(0).toLowerCase() + t.slice(1) : t; }
  function thanksLine(item, line) {
    if (!item) return line;
    var t = (item.text || '').trim(); if (!t) return line;
    if (item.kind === 'thanks') t = t.charAt(0).toLowerCase() + t.slice(1);
    else if (item.kind === 'person' && LEAD.test(t)) t = t.charAt(0).toLowerCase() + t.slice(1);
    else if (item.kind !== 'person') return line;
    return line.replace(/\.$/, '') + ' for ' + t + '.';
  }
  function doOffer(item, id, part, bucket) {
    var r = sit.offer(id, { part: part }); if (!r.ok) { lieOrBounce('Not that one.'); return; }
    if (id === 'my-part') rememberPart(item, part);
    save(); setNote('', false); updateSpirit();
    var t = bucketCenter(bucket); pulse(bucketEl(bucket));
    if (r.next === 'understanding') {
      dropEl.classList.remove('held', 'dragging'); dropEl.classList.add('glide'); put(dropEl, t.x, t.y, .2); dropEl.style.opacity = 0;
      render(); later(800, function () { hideDrop(); openUnderstanding(); }); return;
    }
    var sub = id === 'my-part' && part && !/^none\b/i.test(part) ? 'Today’s part: ' + part : (r.verdict || (id === 'thank-you' ? TREASURE : ''));
    leave(id === 'thank-you' ? thanksLine(item, r.line) : id === 'pray-now' ? E.lineText('pray-now', spokenName(item.text)) : r.line, sub, id === 'pray-now' ? function () { openPray(item.listId); } : null, t, r.verdict ? 4200 : 0);
  }
  // The short prayer flashes as the item lands in its bucket, then the item is gone.
  function leave(line, sub, after, t, extra) {
    speak(line, sub);
    dropEl.classList.remove('held', 'dragging'); dropEl.classList.add('glide'); put(dropEl, t.x, t.y, .2); dropEl.style.opacity = 0;
    later(readMs(line, sub), function () {
      unspeak(); hideDrop(); sit.finishOffer(); save(); render();
      if (after) after(); else scheduleDrop(900);
    });
  }

  // ---------- overlays ----------
  var openOv = [];
  function mountOverlay(id, title, onBack, bodyClass) {
    var old = $(id); if (old) old.remove();
    var body = el('div', { class: 'ov-body' + (bodyClass ? ' ' + bodyClass : '') });
    var ov = el('div', { class: 'overlay', id: id, role: 'dialog', 'aria-label': title }, [
      el('div', { class: 'ov-head' }, [el('button', { class: 'back', 'aria-label': 'Back', text: '‹', onclick: onBack }), el('h2', { text: title })]), body]);
    ov._back = onBack; overlays.append(ov); openOv.push(ov);
    requestAnimationFrame(function () { requestAnimationFrame(function () { ov.classList.add('open'); }); });
    return { ov: ov, body: body };
  }
  function closeOverlay(id) {
    var ov = $(id); if (!ov) return;
    openOv = openOv.filter(function (o) { return o !== ov; });
    ov.classList.remove('open'); setTimeout(function () { ov.remove(); }, 300);
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { var tc = $('topcard'); if (tc) { tc._cancel(); return; } var top = openOv[openOv.length - 1]; if (top && top._back) top._back(); }
  });

  // A single-line input anchored at the top of the screen, so the phone keyboard never sits over what you are writing.
  function askText(o) {
    var host = $('topcard-host'); host.innerHTML = '';
    var input = el('input', { class: 'field', type: 'text', placeholder: o.placeholder || '', maxlength: '80', 'aria-label': o.label, autocomplete: 'off', autocapitalize: 'sentences' });
    if (o.value) input.value = o.value;
    function close() { host.innerHTML = ''; }
    function ok() { var v = input.value.trim(); if (!v) return; close(); o.ok(v); }
    function cancel() { close(); if (o.cancel) o.cancel(); }
    var card = el('div', { class: 'topcard', id: 'topcard' }, [el('div', { class: 'inner' }, [
      el('label', { text: o.label }),
      el('div', { class: 'addrow', style: 'margin:0' }, [input, el('button', { class: 'btn primary', text: 'Save', onclick: ok }), el('button', { class: 'btn', text: 'Cancel', onclick: cancel })])])]);
    card._cancel = cancel;
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ok(); } });
    host.append(el('div', { class: 'scrim', onclick: cancel }), card);
    setTimeout(function () { input.focus(); input.select(); }, 60);
  }

  // ---------- understanding (the Holy Spirit's bucket) ----------
  function openUnderstanding() {
    var m = mountOverlay('ov-und', L.understand.text, finishUnderstanding);
    renderUnd(m.body);
  }
  function finishUnderstanding() {
    clearTimers(); sit.leaveUnderstanding(); save(); closeOverlay('ov-und'); render(); scheduleDrop(1000);
  }
  function undBody() { return $('ov-und') && $('ov-und').querySelector('.ov-body'); }
  function renderUnd(body) {
    body.innerHTML = ''; body.scrollTop = 0;
    var it = sit.understanding;
    if (!it) {
      body.append(el('div', { class: 'emptynote', text: 'Nothing else is here. Back to Him whenever you like.' }), el('div', { style: 'text-align:center' }, [el('button', { class: 'btn primary', text: 'Done for now', onclick: finishUnderstanding })]));
      return;
    }
    body.append(el('p', { class: 'quiet', text: S.queue.length + ' here with the Spirit' }));
    var card = el('div', { class: 'card' }, [
      el('div', { class: 'tag', text: (KIND_LABEL[it.kind] || '') + (it.source === 'uncaught' ? ' · it passed by' : '') }),
      el('div', { class: 'big', text: it.text })]);
    if (it.kind === 'thought') {
      card.append(el('span', { class: 'verdict ' + (it.truth ? 'truth' : 'lie'), text: it.truth ? 'This one is true' : 'This one is a lie' }), el('div', { class: 'note', text: it.note }));
    } else {
      card.append(el('div', { class: 'qs' }, C.QUESTIONS.map(function (q) { return el('p', { text: q }); })));
    }
    body.append(card);
    var holdBtn = lineBtn('hold', true, null, function () { if (sit.hold()) { holdBtn.classList.add('said'); save(); } });
    if (sit.held.hold) holdBtn.classList.add('said');
    body.append(holdBtn,
      lineBtn('not-him', false, null, function () { undOffer(it, 'not-him'); }),
      lineBtn('know', false, null, function () { undKnow(it); }),
      lineBtn('do', false, null, function () { undDo(it); }),
      el('div', { class: 'sec', text: 'Or offer it' }),
      lineBtn('into-hands', false, null, function () { undOffer(it, 'into-hands'); }),
      lineBtn('my-part', false, null, function () { body.innerHTML = ''; partPicker(body, function (p) { undOffer(it, 'my-part', p); }, function () { renderUnd(body); }); }),
      lineBtn('thank-you', false, null, function () { undOffer(it, 'thank-you'); }));
    body.append(el('div', { style: 'display:flex;gap:.5rem;margin-top:.6rem;flex-wrap:wrap' }, [
      S.queue.length > 1 ? el('button', { class: 'btn', text: 'Leave it for now', onclick: function () { sit.skipUnderstanding(); renderUnd(body); } }) : null,
      el('button', { class: 'btn', text: 'Done for now', onclick: finishUnderstanding })]));
  }
  function undOffer(it, id, part) {
    var r = sit.offer(id, { part: part }); if (!r.ok) return;
    if (id === 'my-part') rememberPart(it, part);
    save(); updateSpirit();
    var body = undBody(); body.innerHTML = '';
    var sub = id === 'my-part' && part && !/^none\b/i.test(part) ? 'Today’s part: ' + part : (id === 'thank-you' ? TREASURE : '');
    body.append(el('div', { class: 'card', style: 'text-align:center' }, [
      el('div', { class: 'big', style: 'font-style:italic;color:var(--gold)', text: id === 'thank-you' ? thanksLine(it, r.line) : r.line }),
      sub ? el('p', { class: 'quiet', text: sub }) : null,
      r.explain ? el('p', { class: 'note', style: 'text-align:left', text: r.explain }) : null]));
    function next() { sit.nextUnderstanding(); renderUnd(body); }
    if (r.explain || id === 'not-him') {
      body.append(el('div', { style: 'display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap' }, [
        id === 'not-him' ? el('button', { class: 'btn', text: 'Ask what is true instead', onclick: function () { sit.understanding = it; undKnow(it); } }) : null,
        el('button', { class: 'btn primary', text: 'Continue', onclick: next })]));
    } else later(1500, function () { if ($('ov-und')) next(); });
  }
  // "Lord, what do you want me to know about this?" The app asks; the person writes whatever comes, or nothing.
  function undKnow(it) {
    var line = sit.ask('know'); if (!line) return; save();
    var body = undBody(); body.innerHTML = ''; body.scrollTop = 0;
    body.append(el('div', { class: 'card', style: 'text-align:center' }, [
      el('div', { class: 'tag', text: it.text }),
      el('div', { class: 'big', style: 'font-style:italic;color:var(--gold)', text: line }),
      el('p', { class: 'quiet', text: 'Wait a moment. If something comes, you can write it here. If nothing comes, that is all right.' })]));
    var chips = el('div', { class: 'chips', style: 'justify-content:center' });
    C.SENSED.forEach(function (how) {
      chips.append(el('button', { class: 'chip', text: how, onclick: function () {
        askText({ label: how + ' — what came?', placeholder: '', ok: function (v) { undSensed(it, how, v); } });
      } }));
    });
    body.append(chips, el('div', { style: 'text-align:center' }, [el('button', { class: 'btn', text: 'Nothing yet — leave it here', onclick: function () { renderUnd(body); } })]));
  }
  function undSensed(it, how, text) {
    sit.sense(how, text, false); save();
    var body = undBody(); body.innerHTML = ''; body.scrollTop = 0;
    body.append(el('div', { class: 'card' }, [el('div', { class: 'tag', text: how }), el('div', { class: 'big', text: text }), el('p', { class: 'note', text: C.TEST_IT })]));
    body.append(lineBtn('thank-you', false, null, function () { undOffer(it, 'thank-you'); }));
    body.append(el('div', { style: 'display:flex;gap:.5rem;flex-wrap:wrap' }, [
      el('button', { class: 'btn', text: 'Ask again', onclick: function () { undKnow(it); } }),
      el('button', { class: 'btn', text: 'Leave it here', onclick: function () { renderUnd(body); } })]));
  }
  // "Lord, what do you want me to do about this?" One part, or nothing yet.
  function undDo(it) {
    var line = sit.ask('do'); if (!line) return; save();
    var body = undBody(); body.innerHTML = ''; body.scrollTop = 0;
    partPicker(body, function (p) {
      var r = sit.answerDo(p);
      if (!r || r.kept) { renderUnd(body); return; }
      rememberPart(it, p); save(); updateSpirit();
      body.innerHTML = '';
      body.append(el('div', { class: 'card', style: 'text-align:center' }, [el('div', { class: 'big', style: 'font-style:italic;color:var(--gold)', text: line }), el('p', { class: 'quiet', text: 'Today’s part: ' + p })]));
      later(2800, function () { if ($('ov-und')) { sit.nextUnderstanding(); renderUnd(body); } });
    }, function () { renderUnd(body); }, line, 'Nothing yet');
  }
  function openSpirit() {
    if (!S.queue.length) { pulse(bSpirit); flash(L.understand.text, 'Nothing is waiting yet. A drop you don’t catch will wait here for you.'); return; }
    var st = sit.state; if (st === 'apart' || st === 'placing') { flash('Jesus, I place my heart with you.', 'Drag your heart to Him first.'); return; }
    if (st === 'paused') sit.resume();
    abortFlow();
    if (sit.openQueue()) { save(); render(); openUnderstanding(); }
  }

  // ---------- pray now: a drifting cloud of words ----------
  var cloudStop = null;
  function activePeople() { return S.lists.people.filter(function (p) { return !p.paused; }); }
  function openPray(preId) {
    if (sit.state !== 'praying' && !sit.openPray()) return; // every way in (the bucket, or a person dropped on it) puts the sitting in prayer
    render();
    var m = mountOverlay('ov-pray', 'Intercede', closePray);
    // Step 1 chooses the person (skipped when a person was dropped on Intercede). Step 2 is the cloud for that one person.
    var sel = preId || null, recent = [], claimed = {};
    function addName() {
      askText({ label: 'Who is on your heart?', placeholder: 'A name', ok: function (v) {
        var p = { id: uid(), text: v, paused: false }; S.lists.people.push(p); sel = p.id; recent = []; save(); draw();
      } });
    }
    function draw() {
      if (cloudStop) { cloudStop(); cloudStop = null; }
      m.body.innerHTML = '';
      var people = activePeople();
      var person = people.filter(function (p) { return p.id === sel; })[0];
      m.body.classList.toggle('flex', !!person);
      if (!person) { // step 1: who?
        sel = null;
        m.body.scrollTop = 0;
        m.body.append(el('div', { class: 'sec', style: 'margin-top:.2rem', text: 'Who is on your heart?' }));
        m.body.append(el('button', { class: 'linebtn soft', onclick: addName }, [el('span', { class: 'line', text: '+ Add a name' })]));
        people.forEach(function (p) {
          m.body.append(el('button', { class: 'linebtn', onclick: function () { sel = p.id; recent = []; draw(); } }, [el('span', { class: 'line', text: p.text })]));
        });
        if (!people.length) m.body.append(el('div', { class: 'emptynote', text: 'No one is checked in your People list. Add a name here.' }));
        return;
      }
      // step 2: the words, for this person
      m.body.append(el('div', { class: 'prayhead' }, [el('div', { class: 'pname', text: person.text }), el('button', { class: 'mini', text: 'Change person', onclick: function () { sel = null; recent = []; draw(); } })]));
      var words = S.lists.claims.filter(function (w) { return !w.paused; }).map(function (w) { return w.text; });
      var field = el('div', { class: 'cloudfield' });
      var amen = el('button', { class: 'amen off', 'aria-hidden': 'true', tabindex: '-1', text: L['pray-all'].text, onclick: function () { finishPrayer(person, claimed[person.id]); } });
      var bar = el('div', { class: 'praybar' }, [el('div', { class: 's1', text: 'Touch a word, and say it for ' + spokenName(person.text) + '.' }), amen]);
      function showAmen(on) { amen.classList.toggle('off', !on); amen.setAttribute('aria-hidden', on ? 'false' : 'true'); amen.tabIndex = on ? 0 : -1; }
      showAmen(Object.keys(claimed[sel] || {}).length > 0);
      m.body.append(field, bar);
      var pobj = { key: 'person:' + person.id, kind: 'person', text: person.text };
      claimed[sel] = claimed[sel] || {};
      var startedFor = sel;
      function start() {
        if (!field.clientHeight && field.isConnected) { requestAnimationFrame(start); return; }
        if (sel !== startedFor) return;
        cloudStop = startCloud(field, words, function (w) {
          var line = sit.claim(pobj, w, spokenName(person.text)); if (!line) return false;
          save();
          bar.querySelector('.s1').textContent = line;
          showAmen(true);
          return true;
        }, claimed[sel]);
      }
      requestAnimationFrame(start);
    }
    draw();
  }
  // The closing prayer over everything claimed for this person, then the screen closes.
  function finishPrayer(person, claimedWords) {
    var words = Object.keys(claimedWords || {});
    var line = sit.prayAll({ key: 'person:' + person.id, kind: 'person', text: person.text }, words); if (!line) return;
    save(); if (cloudStop) { cloudStop(); cloudStop = null; }
    var m = $('ov-pray').querySelector('.ov-body'); m.classList.remove('flex'); m.innerHTML = '';
    m.append(el('div', { class: 'card', style: 'text-align:center;margin-top:20%' }, [
      el('div', { class: 'tag', text: spokenName(person.text) }),
      el('div', { class: 'big', style: 'font-style:italic;color:var(--gold)', text: line }),
      el('p', { class: 'quiet', text: words.join(' · ') })]),
      el('div', { style: 'text-align:center' }, [el('button', { class: 'btn primary', text: 'Amen', onclick: closePray })]));
    later(7000, function () { if ($('ov-pray')) closePray(); });
  }
  function closePray() {
    if (cloudStop) { cloudStop(); cloudStop = null; }
    sit.closePray(); save(); closeOverlay('ov-pray'); render(); scheduleDrop(1200);
  }
  function openPrayBucket() {
    var st = sit.state; if (st === 'apart' || st === 'placing') { flash('Jesus, I place my heart with you.', 'Drag your heart to Him first.'); return; }
    if (st === 'paused') sit.resume();
    abortFlow();
    if (sit.openPray()) { save(); render(); openPray(); }
  }

  // Words drift slowly; each stays a while, fades, and another takes its place.
  // A word you pray settles to the bottom and stops drifting.
  function startCloud(field, words, onTap, claimedSet) {
    var W = field.clientWidth, H = field.clientHeight, running = true, last = performance.now();
    var ROW = 34, floor = H, settled = [], items = [];
    var pool = words.slice().sort(function () { return Math.random() - .5; });
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function shown(w) { return items.some(function (it) { return it.word === w; }); }
    function nextWord() {
      for (var k = 0; k < pool.length; k++) { var w = pool.shift(); pool.push(w); if (!claimedSet[w] && !shown(w)) return w; }
      return null;
    }
    var SIZES = [{ fs: 1, row: 34 }, { fs: .85, row: 28 }, { fs: .72, row: 24 }, { fs: .62, row: 21 }];
    function relayout() {
      var pick = SIZES[SIZES.length - 1], rows = 1;
      for (var s = 0; s < SIZES.length; s++) { // the first size that leaves at least 40% of the cloud for drifting
        settled.forEach(function (b) { b.style.fontSize = SIZES[s].fs + 'rem'; });
        var x0 = 10, r0 = 1;
        settled.forEach(function (b) { var w = b.offsetWidth; if (x0 + w > W - 10 && x0 > 10) { x0 = 10; r0++; } x0 += w + 6; });
        rows = r0; pick = SIZES[s];
        if (H - (r0 * SIZES[s].row + 12) >= H * 0.4) break;
      }
      var x = 10, y = H - 8;
      settled.forEach(function (b) {
        var w = b.offsetWidth; if (x + w > W - 10 && x > 10) { x = 10; y -= pick.row; }
        b.style.transform = 'translate(' + x + 'px,' + (y - pick.row) + 'px)'; x += w + 6;
      });
      floor = settled.length ? H - (rows * pick.row + 12) : H;
    }
    function settle(btn, word, instant) {
      btn.classList.add('settled', 'claimed', 'in');
      btn.style.transition = instant ? 'none' : 'transform 1.4s cubic-bezier(.2,.7,.3,1), color .5s ease, text-shadow .5s ease';
      settled.push(btn); relayout();
      if (instant) requestAnimationFrame(function () { btn.style.transition = ''; });
    }
    // If the cloud's size ever changes (rotation, a taller line below), re-measure and re-seat the settled words.
    var ro = window.ResizeObserver ? new ResizeObserver(function () {
      var nw = field.clientWidth, nh = field.clientHeight;
      if (running && nw && nh && (nw !== W || nh !== H)) { W = nw; H = nh; relayout(); }
    }) : null;
    if (ro) ro.observe(field);
    function reset(it, first) {
      var w = nextWord(); if (w) it.word = w; else if (!it.word) return false;
      it.btn.querySelector('.w').textContent = it.word;
      it.btn.style.fontSize = rnd(1.05, 1.65).toFixed(2) + 'rem';
      var bw = it.btn.offsetWidth || 90, bh = it.btn.offsetHeight || 34;
      it.x = rnd(0, Math.max(1, W - bw)); it.y = rnd(0, Math.max(1, floor - bh));
      var sp = rnd(5, 12), a = rnd(0, Math.PI * 2); it.vx = Math.cos(a) * sp; it.vy = Math.sin(a) * sp;
      it.born = performance.now() + (first ? rnd(0, 6000) : 0); it.life = rnd(22000, 38000);
      it.btn.classList.add('in'); return true;
    }
    function spawn(first) {
      var btn = el('button', { class: 'cword' }, [el('span', { class: 'w' })]);
      field.append(btn);
      var it = { btn: btn, word: null };
      if (!reset(it, first)) { btn.remove(); return; }
      btn.addEventListener('click', function () {
        if (items.indexOf(it) < 0) { onTap(it.word); return; } // a settled word, tapped again, is said again
        if (!onTap(it.word)) return;
        claimedSet[it.word] = true; items.splice(items.indexOf(it), 1);
        settle(btn, it.word, false);
        spawn(false);
      });
      items.push(it);
    }
    // words already prayed for this person settle straight away
    words.forEach(function (w) {
      if (!claimedSet[w]) return;
      var btn = el('button', { class: 'cword' }, [el('span', { class: 'w', text: w })]);
      btn.addEventListener('click', function () { onTap(w); });
      field.append(btn); settle(btn, w, true);
    });
    var n = Math.min(words.filter(function (w) { return !claimedSet[w]; }).length, W < 400 ? 9 : 14);
    for (var i = 0; i < n; i++) spawn(true);
    function frame(now) {
      if (!running) return;
      var dt = Math.min(.1, (now - last) / 1000); last = now;
      items.forEach(function (it) {
        var bw = it.btn.offsetWidth, bh = it.btn.offsetHeight;
        it.x += it.vx * dt; it.y += it.vy * dt;
        if (it.x < 0) { it.x = 0; it.vx = Math.abs(it.vx); } else if (it.x > W - bw) { it.x = W - bw; it.vx = -Math.abs(it.vx); }
        if (it.y < 0) { it.y = 0; it.vy = Math.abs(it.vy); } else if (it.y > floor - bh) { it.y = Math.max(0, floor - bh); it.vy = -Math.abs(it.vy); }
        it.btn.style.transform = 'translate(' + it.x.toFixed(1) + 'px,' + it.y.toFixed(1) + 'px)';
        if (!it.fading && now > it.born + it.life) {
          it.fading = true; it.btn.classList.remove('in');
          setTimeout(function () { if (running && items.indexOf(it) >= 0) { reset(it, false); it.fading = false; } }, 1800);
        }
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return function () { running = false; if (ro) ro.disconnect(); };
  }

  // ---------- lists ----------
  function openLists() {
    quiet();
    var m = mountOverlay('ov-lists', 'Lists', function () { closeOverlay('ov-lists'); });
    var tab = 'people';
    function draw() {
      m.body.innerHTML = '';
      var info = LIST_NAMES.filter(function (l) { return l.id === tab; })[0], items = S.lists[tab];
      var tabs = el('div', { class: 'tabs' });
      LIST_NAMES.forEach(function (l) { tabs.append(el('button', { class: 'tab' + (l.id === tab ? ' on' : ''), text: l.label, onclick: function () { tab = l.id; draw(); } })); });
      m.body.append(tabs);
      var input = el('input', { class: 'field', type: 'text', placeholder: info.add, maxlength: '80', 'aria-label': info.add, autocomplete: 'off' });
      function add() {
        var v = input.value.trim(); if (!v) return;
        items.push({ id: uid(), text: v, paused: false }); save(); draw();
      }
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); add(); } });
      m.body.append(el('div', { class: 'addrow' }, [input, el('button', { class: 'btn primary', text: 'Add', onclick: add })]));
      var hints = { people: 'Only the checked-in names drop: Pause rests someone, Remove takes them out. Tap a name to fix it.', claims: 'These drift when you intercede: “…I claim ___ for them.” Tap one to fix it.' };
      m.body.append(el('p', { class: 'quiet', text: hints[tab] || 'Pause rests one, Remove takes it out. Tap one to fix the wording.' }));
      if (!items.length) m.body.append(el('div', { class: 'emptynote', text: info.empty }));
      items.forEach(function (it) {
        var rm = el('button', { class: 'mini', text: 'Remove' }), armed = false;
        rm.addEventListener('click', function () {
          if (!armed) { armed = true; rm.textContent = 'Sure?'; rm.classList.add('warn'); setTimeout(function () { armed = false; rm.textContent = 'Remove'; rm.classList.remove('warn'); }, 3000); return; }
          var i = items.indexOf(it); if (i >= 0) items.splice(i, 1); save(); draw();
        });
        var t = el('button', { class: 't edit', 'aria-label': 'Fix the wording of ' + it.text, onclick: function () {
          askText({ label: 'Fix the wording', value: it.text, placeholder: info.add, ok: function (v) { it.text = v; save(); draw(); } });
        } }, [el('span', { text: it.text })]);
        if (tab === 'people' && it.part) t.append(el('span', { class: 'part', text: 'Your part: ' + it.part }));
        m.body.append(el('div', { class: 'row' + (it.paused ? ' paused' : '') }, [t,
          el('button', { class: 'mini', text: it.paused ? 'Resume' : 'Pause', onclick: function () { it.paused = !it.paused; save(); draw(); } }), rm]));
      });
    }
    draw();
  }

  // ---------- noticed ----------
  // Every spoken line is shown as it was said, naming who it was spoken to.
  var SHORT = { 'pray-now': 'Father, I pray for them', claim: 'prayed', passed: 'passed by', 'pray-all': 'Father, I pray all of this' };
  function lineName(l) { return SHORT[l] || (L[l] ? L[l].text.replace(/\.$/, '') : l); }
  function seqLabel(o) {
    if (o.line === 'claim') return 'claimed ' + o.word;
    if (o.line === 'passed' || (o.line === 'understand' && o.uncaught)) return 'passed by';
    if (o.line === 'my-part' && o.part) return 'Father, my part: ' + o.part;
    return lineName(o.line);
  }
  function openNoticed() {
    quiet();
    var m = mountOverlay('ov-noticed', 'Noticed', function () { closeOverlay('ov-noticed'); });
    var byKey = {}, order = [];
    S.offers.forEach(function (o) { if (o.kind === 'sitting' || o.line === 'place-heart') return; if (!byKey[o.key]) { byKey[o.key] = []; } byKey[o.key].push(o); });
    order = Object.keys(byKey).sort(function (a, b) { return byKey[b][byKey[b].length - 1].at - byKey[a][byKey[a].length - 1].at; });
    m.body.append(el('p', { class: 'quiet', text: 'What has been spoken over each one. This is for noticing, not for counting.' }));
    if (!order.length) { m.body.append(el('div', { class: 'emptynote', text: 'Nothing yet. Place your heart with Him, and catch what drops.' })); return; }
    ['person', 'concern', 'feeling', 'thanks', 'thought'].forEach(function (kind) {
      var keys = order.filter(function (k) { return byKey[k][0].kind === kind; }); if (!keys.length) return;
      m.body.append(el('div', { class: 'sec', text: { person: 'People', concern: 'Concerns', feeling: 'Feelings', thanks: 'Thanks', thought: 'Thoughts' }[kind] }));
      keys.forEach(function (k) {
        var recs = byKey[k], counts = {}, chips = el('div', { class: 'nchips' });
        recs.forEach(function (o) { counts[o.line] = (counts[o.line] || 0) + 1; });
        Object.keys(counts).forEach(function (l) { chips.append(el('span', { class: 'nchip', text: lineName(l) + (counts[l] > 1 ? ' ×' + counts[l] : '') })); });
        m.body.append(el('div', { class: 'nrow' }, [el('div', { class: 'nt', text: recs[recs.length - 1].text }), chips,
          recs.length > 1 ? el('div', { class: 'nseq', text: recs.slice(-6).map(seqLabel).join(' → ') }) : null]));
      });
    });
    var clr = el('button', { class: 'mini', text: 'Clear Noticed' }), armed = false;
    clr.addEventListener('click', function () {
      if (!armed) { armed = true; clr.textContent = 'Sure? This clears all of it.'; clr.classList.add('warn'); return; }
      S.offers = []; sit.data.offers = S.offers; save(); openNoticed();
    });
    m.body.append(el('div', { style: 'margin-top:1.4rem' }, [clr]));
  }

  // ---------- settings ----------
  function applyTheme() {
    var t = S.settings.theme;
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme');
  }
  function openSettings() {
    quiet();
    var m = mountOverlay('ov-settings', 'Settings', function () { closeOverlay('ov-settings'); });
    function seg(label, key, opts) {
      m.body.append(el('div', { class: 'sec', text: label }));
      var row = el('div', { class: 'seg' });
      opts.forEach(function (o) {
        row.append(el('button', { class: 'chip' + (S.settings[key] === o[0] ? ' on' : ''), text: o[1], onclick: function () { S.settings[key] = o[0]; save(); applyTheme(); openSettings(); } }));
      });
      m.body.append(row);
    }
    var ver = el('span', { class: 'quiet', text: 'Version …' });
    m.body.append(el('div', { class: 'card', style: 'display:flex;align-items:center;gap:.7rem;flex-wrap:wrap' }, [
      ver, el('button', { class: 'btn primary', text: 'Refresh', onclick: refreshApp }),
      el('span', { class: 'quiet', style: 'flex-basis:100%', text: 'Refresh gets the newest version. Your lists and Noticed stay.' })]));
    m.body.append(el('div', { style: 'margin:.2rem 0 .6rem' }, [el('button', { class: 'btn', text: 'How it works', onclick: function () { openHelp(false); } })]));
    if (!isInstalled()) m.body.append(el('div', { style: 'margin:0 0 .6rem' }, [el('button', { class: 'btn', text: 'Add to Home Screen', onclick: openInstall })]));
    seg('How slowly drops fall', 'pace', [['slow', 'Slow'], ['gentle', 'Gentle'], ['brisk', 'Brisk']]);
    m.body.append(el('p', { class: 'quiet', text: 'There is no hurry. A drop you don’t catch goes to the Holy Spirit, and nothing is lost.' }));
    seg('How long a sitting lasts', 'length', LENGTHS);
    m.body.append(el('p', { class: 'quiet', text: 'When it’s reached, the drops rest and your heart stays with Him. “Keep going” starts another stretch.' }));
    seg('Look', 'theme', [['auto', 'Match my phone'], ['dark', 'Dark'], ['light', 'Light']]);
    m.body.append(el('div', { class: 'sec', text: 'About' }),
      el('p', { class: 'quiet', text: 'A quiet place to put your heart with Jesus, then catch what drops and speak it to the Father, the Son, or the Spirit. No scores, no streaks. Everything stays on this device.' }));
    if (window.caches) caches.keys().then(function (ks) {
      var vs = ks.map(function (k) { var x = /^treasure-v(\d+)$/.exec(k); return x ? +x[1] : 0; }); var mx = Math.max.apply(null, vs.concat([0]));
      ver.textContent = mx ? 'Version v' + mx : 'Version (not installed)';
    }).catch(function () {});
    var wipe = el('button', { class: 'mini', text: 'Erase everything on this device' }), armed = false;
    wipe.addEventListener('click', function () {
      if (!armed) { armed = true; wipe.textContent = 'Sure? Lists and Noticed will be gone.'; wipe.classList.add('warn'); return; }
      try { localStorage.removeItem(KEY); } catch (e) {} location.reload();
    });
    m.body.append(el('div', { style: 'margin-top:1.4rem' }, [wipe]));
  }
  // ---------- add to the Home Screen ----------
  function isInstalled() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  function platform() { return /Android/i.test(navigator.userAgent || '') ? 'android' : 'ios'; }
  function openInstall() {
    quiet(); S.settings.installDone = true; save(); installBar.hidden = true;
    var m = mountOverlay('ov-install', 'Add to Home Screen', function () { closeOverlay('ov-install'); }), which = platform();
    function draw() {
      m.body.innerHTML = '';
      m.body.append(el('p', { class: 'quiet', text: C.INSTALL.why }));
      var seg = el('div', { class: 'seg' });
      [['ios', 'iPhone'], ['android', 'Android']].forEach(function (p) { seg.append(el('button', { class: 'chip' + (which === p[0] ? ' on' : ''), text: p[1], onclick: function () { which = p[0]; draw(); } })); });
      m.body.append(seg);
      var ol = el('ol', { class: 'steps' });
      C.INSTALL[which].forEach(function (t) {
        var li = el('li'), parts = t.split('{share}'), span = el('span', { text: parts[0] });
        if (parts.length > 1) {
          var ic = el('span'); ic.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
          span.append(ic, document.createTextNode(parts[1]));
        }
        li.append(span); ol.append(li);
      });
      m.body.append(ol, el('p', { class: 'quiet', text: C.INSTALL.after }));
    }
    draw();
  }
  $('ib-show').addEventListener('click', openInstall);
  $('ib-no').addEventListener('click', function () { S.settings.installDone = true; save(); installBar.hidden = true; });

  // ---------- how it works ----------
  function openHelp(first) {
    if (!first) quiet();
    var step = 0, steps = C.HELP;
    var m = mountOverlay('ov-help', 'How it works', done);
    function done() { S.seenHelp = true; save(); closeOverlay('ov-help'); }
    var ART = [
      '<svg viewBox="0 0 200 100"><g transform="translate(46,52) scale(.9)"><path d="M0 -4C-16 8-19 16-19 22a9 9 0 0 0 19 3 9 9 0 0 0 19-3c0-6-3-14-19-26z" fill="none" stroke="var(--heart)" stroke-width="2.4" stroke-dasharray="5 5" transform="translate(0,-10)"/></g><path d="M78 50h46M114 42l10 8-10 8" fill="none" stroke="var(--ink-faint)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="154" cy="50" r="28" fill="var(--gold)" opacity=".92"/><path d="M154 34v32M142 45h24" stroke="var(--bg)" stroke-width="4" stroke-linecap="round" opacity=".55"/></svg>',
      '<svg viewBox="0 0 200 100"><g fill="var(--cloud-open)"><circle cx="84" cy="22" r="14"/><circle cx="102" cy="16" r="17"/><circle cx="122" cy="23" r="13"/><rect x="74" y="22" width="58" height="12" rx="6"/></g><rect x="62" y="52" width="76" height="30" rx="14" fill="var(--surface-2)" stroke="var(--border)"/><text x="100" y="72" text-anchor="middle" font-size="13" fill="var(--ink)" font-family="Georgia,serif">a thought</text><path d="M100 40v8" stroke="var(--ink-faint)" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 5"/></svg>',
      '',
      '<svg viewBox="0 0 200 100"><circle cx="100" cy="50" r="34" fill="var(--gold)" opacity=".9"/><g transform="translate(100,52) scale(.95)"><path d="M0 -4C-16 8-19 16-19 22a9 9 0 0 0 19 3 9 9 0 0 0 19-3c0-6-3-14-19-26z" fill="var(--heart)" transform="translate(0,-9)"/></g></svg>'
    ];
    function draw() {
      var st = steps[step]; m.body.innerHTML = '';
      var art = el('div', { class: 'helpart' }); art.innerHTML = ART[step] || '';
      var box = el('div', { class: 'helpstep' }, [art, el('h3', { text: st.title }), el('p', { text: st.text })]);
      if (st.legend) {
        var lg = el('div', { class: 'legend' });
        C.LEGEND.forEach(function (x) {
          var src = bucketEl(x.b), svg = src && src.querySelector('svg');
          lg.append(el('div', { style: 'color:' + (src ? getComputedStyle(src).color : 'inherit') }, [svg ? svg.cloneNode(true) : null,
            el('div', { style: 'color:var(--ink)' }, [el('b', { text: x.name }), el('span', { text: x.means })])]));
        });
        box.append(lg);
      }
      var dots = el('div', { class: 'dots' }); steps.forEach(function (_, i) { dots.append(el('i', { class: i === step ? 'on' : '' })); });
      var nav = el('div', { class: 'helpnav' }, [
        step > 0 ? el('button', { class: 'btn', text: 'Back', onclick: function () { step--; draw(); } }) : el('button', { class: 'btn', text: 'Skip', onclick: done }),
        step < steps.length - 1 ? el('button', { class: 'btn primary', text: 'Next', onclick: function () { step++; draw(); } }) : el('button', { class: 'btn primary', text: 'Begin', onclick: done })]);
      m.body.append(box, dots, nav); m.body.scrollTop = 0;
    }
    draw();
  }
  $('btn-help').addEventListener('click', function () { openHelp(false); });

  // Clears this app's cached files and its service worker, then reloads. Saved lists and history are untouched.
  function refreshApp() {
    var jobs = [];
    if (window.caches) jobs.push(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return /^treasure-/.test(k); }).map(function (k) { return caches.delete(k); })); }));
    if (navigator.serviceWorker) jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.filter(function (r) { return r.scope.indexOf('/Treasure/') >= 0; }).map(function (r) { return r.unregister(); })); }));
    Promise.all(jobs).catch(function () {}).then(function () { location.reload(); });
  }
  // Opening a page pauses whatever is falling; the heart stays with Him.
  function quiet() {
    var st = sit.state;
    if (st === 'apart' || st === 'placing' || st === 'paused') return;
    stopForNow('Resting. Your heart stays with Him.');
  }
  $('btn-lists').addEventListener('click', openLists);
  $('btn-noticed').addEventListener('click', openNoticed);
  $('btn-settings').addEventListener('click', openSettings);

  // ---------- the heart ----------
  var drag = null;
  function near(p) { return Math.hypot(p.x - G.christ.x, p.y - G.christ.y) <= G.r * 1.05; }
  heartEl.addEventListener('pointerdown', function (e) {
    var st = sit.state; if (['apart', 'with', 'dropping', 'paused'].indexOf(st) < 0) return;
    e.preventDefault(); try { heartEl.setPointerCapture(e.pointerId); } catch (x) {}
    if (st === 'apart') sit.beginPlace();
    var rect = stage.getBoundingClientRect();
    drag = { rect: rect, from: st, off: { x: e.clientX - rect.left - heartPos.x, y: e.clientY - rect.top - heartPos.y } };
    heartEl.classList.remove('glide'); heartEl.classList.add('dragging');
  });
  heartEl.addEventListener('pointermove', function (e) {
    if (!drag) return;
    heartPos = { x: Math.max(20, Math.min(G.W - 20, e.clientX - drag.rect.left - drag.off.x)), y: Math.max(20, Math.min(G.H - 20, e.clientY - drag.rect.top - drag.off.y)) };
    put(heartEl, heartPos.x, heartPos.y); heartEl.classList.toggle('near', near(heartPos));
  });
  function endDrag(cancel) {
    if (!drag) return; var d = drag; drag = null;
    heartEl.classList.remove('dragging', 'near'); heartEl.classList.add('glide');
    var on = !cancel && near(heartPos);
    if (d.from === 'apart') {
      sit.release(on);
      if (on) placed(); else { heartPos = G.apart; put(heartEl, heartPos.x, heartPos.y); }
    } else if (on) { heartPos = G.christ; put(heartEl, heartPos.x, heartPos.y); }
    else { // taken back out of Christ: the current drop pauses, it is not deleted
      abortFlow(); closeSheet(); sit.takeBack(); clockOff(); save(); heartPos = G.apart; put(heartEl, heartPos.x, heartPos.y); render();
    }
  }
  heartEl.addEventListener('pointerup', function () { endDrag(false); });
  heartEl.addEventListener('pointercancel', function () { endDrag(true); });
  heartEl.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault();
    heartEl.classList.add('glide');
    if (sit.state === 'apart') { sit.placeHeart(); placed(); }
    else if (sit.state === 'with' || sit.state === 'dropping' || sit.state === 'paused') { abortFlow(); sit.takeBack(); clockOff(); save(); heartPos = G.apart; put(heartEl, heartPos.x, heartPos.y); render(); }
  });
  function placed() {
    heartPos = G.christ; heartEl.classList.add('glide'); put(heartEl, heartPos.x, heartPos.y);
    resetRun(); save(); render();
    speak(L['place-heart'].text);
    later(3200, unspeak); scheduleDrop(4200);
  }

  // ---------- life cycle ----------
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && ['dropping', 'holding', 'offered'].indexOf(sit.state) >= 0) stopForNow('Resting. Your heart stays with Him.');
  });
  // Rotation: iOS reports the new size late, so measure again a few times; a phone held sideways rests the drops.
  var land = window.matchMedia ? matchMedia('(orientation: landscape) and (max-height: 600px) and (pointer: coarse)') : null;
  function relayoutAll() {
    layout();
    if (sit.state === 'holding' && !dragItem) { dropEl.classList.remove('glide'); put(dropEl, G.hold.x, G.hold.y, 1.06); }
  }
  function relayoutSoon() { relayoutAll(); [120, 400, 900].forEach(function (ms) { setTimeout(relayoutAll, ms); }); }
  function onOrientation() {
    if (land && land.matches && ['with', 'dropping', 'holding', 'offered'].indexOf(sit.state) >= 0) stopForNow('Resting. Your heart stays with Him.');
    relayoutSoon();
  }
  window.addEventListener('resize', relayoutSoon);
  window.addEventListener('orientationchange', onOrientation);
  if (land) { if (land.addEventListener) land.addEventListener('change', onOrientation); else if (land.addListener) land.addListener(onOrientation); }
  if (window.visualViewport) visualViewport.addEventListener('resize', relayoutSoon);
  if (window.ResizeObserver) new ResizeObserver(function () { relayoutAll(); }).observe(stage);
  // Ask for a portrait lock where the browser allows it (Android, installed). iOS ignores this; the upright screen covers it.
  document.addEventListener('pointerdown', function lockOnce() {
    document.removeEventListener('pointerdown', lockOnce);
    try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('portrait').catch(function () {}); } catch (e) {}
  });
  applyTheme();
  requestAnimationFrame(function () { requestAnimationFrame(function () { layout(); render(); if (!S.seenHelp) openHelp(true); }); });

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('./sw.js').catch(function () {}); });
  }
  window.__treasure = { sit: sit, S: S }; // for tests in the browser pane
})();
