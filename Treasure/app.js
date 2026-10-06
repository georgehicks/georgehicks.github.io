/* Treasuring — the player. Everything on screen follows the engine's states (see engine.js / spec section 4). */
(function () {
  'use strict';
  var C = TreasureContent, E = TreasureEngine, L = C.LINES;
  var KEY = 'treasure:v1';
  var PACE = { slow: 26000, gentle: 18000, brisk: 11000 };
  var KIND_LABEL = { thought: 'a thought', feeling: 'a feeling', person: 'a person', concern: 'a concern', thanks: 'a thanks' };
  var LIST_NAMES = [
    { id: 'people', label: 'People', kind: 'person', add: 'Add a name', empty: 'No one yet. Add a name and they will drop here.' },
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
      settings: { pace: 'gentle', theme: 'auto' },
      lists: { people: [], concerns: seed(C.SEEDS.concerns, 'c'), thanks: seed(C.SEEDS.thanks, 'g'), feelings: seed(C.SEEDS.feelings, 'f'), claims: seed(C.SEEDS.claims, 'w') } };
  }
  function load() {
    var d = defaults();
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var s = JSON.parse(raw); for (var k in s) d[k] = s[k]; }
    } catch (e) {}
    d.settings = Object.assign({ pace: 'gentle', theme: 'auto' }, d.settings);
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
    dock = $('dock'), holdnote = $('holdnote'), partpick = $('partpick'), barEl = $('bar'), overlays = $('overlays');

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
    G = { W: W, H: H, r: r, christ: { x: W / 2, y: H * 0.60 }, cloud: { x: W / 2, y: H * 0.105 }, apart: { x: W / 2, y: H * 0.36 },
      y0: H * 0.19, yEnd: H * 0.60 - r * 0.9, hold: { x: W / 2, y: H * 0.27 } };
    christEl.style.setProperty('--r', r + 'px');
    put(cloudEl, G.cloud.x, G.cloud.y); put(christEl, G.christ.x, G.christ.y);
    var apart = sit.state === 'apart' || sit.state === 'placing';
    heartPos = apart ? G.apart : G.christ;
    heartEl.classList.remove('glide'); put(heartEl, heartPos.x, heartPos.y);
    heartline.style.top = (G.apart.y + 48) + 'px';
    spokenEl.style.top = (H * 0.345) + 'px'; restEl.style.top = (H * 0.44) + 'px';
    holdnote.style.top = (G.hold.y + 62) + 'px'; partpick.style.top = (H * 0.36) + 'px';
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
    barEl.innerHTML = '';
    if (st === 'paused') barEl.append(el('button', { class: 'resume', text: 'Continue', onclick: resume }));
    else if (st === 'with' || st === 'dropping') barEl.append(el('button', { class: 'linkbtn', text: 'Pause', onclick: function () { stopForNow('Resting. Your heart stays with Him.'); } }));
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
  function unspeak() { spokenEl.classList.remove('on'); }

  // ---------- flow control ----------
  function hideDrop() { cancelAnimationFrame(raf); fall = null; dropEl.classList.remove('glide', 'held', 'dragging'); dropEl.style.opacity = 0; dropEl.style.pointerEvents = 'none'; }
  function closeSheet() { holdnote.classList.remove('on'); partpick.hidden = true; }
  function abortFlow() { clearTimers(); hideDrop(); closeSheet(); unspeak(); }
  function stopForNow(msg) {
    abortFlow(); if (!sit.pause()) return; restMsg = msg; save(); render();
  }
  function resume() { if (sit.resume()) { save(); render(); scheduleDrop(900); } }

  function scheduleDrop(ms) { later(ms, nextDrop); }
  function draw() {
    var item = E.drawNext(S.deckState, E.buildPool(S.lists), Math.random, S.lastKey);
    if (item) S.lastKey = item.key; return item;
  }
  function nextDrop() {
    if (sit.state !== 'with') return;
    var item = S.pending || draw(); if (!item) return;
    if (!sit.beginDrop(item)) return;
    save(); startFall(item);
  }
  function startFall(item) {
    dropEl.querySelector('.tag').textContent = KIND_LABEL[item.kind] || '';
    dropEl.querySelector('.txt').textContent = item.text;
    dropEl.className = 'drop k-' + item.kind;
    dropEl.style.pointerEvents = 'auto'; dropEl.style.opacity = 0;
    put(dropEl, G.W / 2, G.y0, .8);
    fall = { item: item, t0: performance.now(), dur: PACE[S.settings.pace] || PACE.gentle };
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
    fall = null; dropEl.style.pointerEvents = 'none';
    dropEl.classList.add('glide'); put(dropEl, G.spirit.x, G.spirit.y, .2); dropEl.style.opacity = 0;
    sit.arriveUncaught(); save(); pulse(bSpirit); updateSpirit();
    later(1000, function () { dropEl.classList.remove('glide'); });
    if (sit.uncaughtRun >= 4) { stopForNow('It has been quiet, so the drops are resting. Your heart is still with Him.'); return; }
    scheduleDrop(1800);
  }

  // ---------- the dock: grab a drop, drag it to a bucket ----------
  var BK = { hands: 'into-hands', part: 'my-part', thanks: 'thank-you', spirit: 'understand', hold: 'hold', pray: 'pray-now', lie: 'lie' };
  function bucketEl(name) { return dock.querySelector('[data-b="' + name + '"]'); }
  function bucketAt(cx, cy) {
    var hit = null;
    Array.prototype.forEach.call(dock.querySelectorAll('.bk'), function (b) {
      var r = b.getBoundingClientRect(), pad = 10;
      if (cx >= r.left - pad && cx <= r.right + pad && cy >= r.top - pad && cy <= r.bottom + pad) hit = b;
    });
    return hit;
  }
  function bucketCenter(name) {
    var r = bucketEl(name).getBoundingClientRect(), sr = stage.getBoundingClientRect();
    return { x: r.left + r.width / 2 - sr.left, y: r.top + r.height / 2 - sr.top };
  }
  function lineFor(name, item) { return name === 'pray' ? E.lineText('pray-now', item ? item.text : '') : L[BK[name]].text; }

  var baseNote = '', noteTimer = 0;
  function setNote(t, on) { holdnote.textContent = t || ''; holdnote.classList.toggle('on', !!on && !!t); }
  function flashNote(t, ms) { clearTimeout(noteTimer); setNote(t, true); noteTimer = setTimeout(function () { setNote(baseNote, true); }, ms || 2600); }

  function catchNow() {
    if (sit.state !== 'dropping' || !fall) return false;
    cancelAnimationFrame(raf); var item = fall.item; fall = null;
    sit.catchDrop(); save(); render();
    baseNote = '';
    if (item.placeholder) baseNote = 'Add a real name in Lists, and they will drop here instead.';
    else if (item.kind === 'person' && item.part) baseNote = 'Your part last time: ' + item.part;
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
      var st = sit.state; if (st === 'apart' || st === 'placing') return;
      speak(lineFor(name, null), ''); later(1800, unspeak);
    });
  });

  function lieOrBounce(msg) { returnToHold(); flashNote(msg, 3000); }
  function bucketDrop(name) {
    var item = sit.drop; if (!item || sit.state !== 'holding') return;
    if (name === 'pray' && (item.kind !== 'person' || item.placeholder)) { lieOrBounce(item.placeholder ? 'Add a real name in Lists first.' : 'Prayer words are for a person.'); return; }
    if (name === 'lie' && item.kind === 'person') { lieOrBounce('A person is never a lie. Give them to the Father.'); return; }
    if (name === 'lie' && item.kind === 'thanks') { lieOrBounce('Thanks is not a lie.'); return; }
    if (name === 'hold') { sit.hold(); save(); returnToHold(); speak(L.hold.text); later(1700, unspeak); pulse(bucketEl('hold')); return; }
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
  function partPicker(container, onPick, onCancel) {
    container.append(el('div', { class: 'sheet-title', text: L['my-part'].text }));
    var chips = el('div', { class: 'chips' });
    chips.append(el('button', { class: 'chip', text: 'None today', onclick: function () { onPick('none'); } }));
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
  function doOffer(item, id, part, bucket) {
    var r = sit.offer(id, { part: part }); if (!r.ok) { lieOrBounce('Not that one.'); return; }
    if (id === 'my-part') rememberPart(item, part);
    save(); setNote('', false); updateSpirit();
    var t = bucketCenter(bucket); pulse(bucketEl(bucket));
    if (r.next === 'understanding') {
      dropEl.classList.remove('held', 'dragging'); dropEl.classList.add('glide'); put(dropEl, t.x, t.y, .2); dropEl.style.opacity = 0;
      render(); later(800, function () { hideDrop(); openUnderstanding(); }); return;
    }
    var sub = id === 'my-part' && part && !/^none\b/i.test(part) ? 'Today’s part: ' + part : (r.verdict || '');
    leave(r.line, sub, id === 'pray-now' ? function () { openPray(item.listId); } : null, t, r.verdict ? 4200 : 0);
  }
  // The short prayer flashes as the item lands in its bucket, then the item is gone.
  function leave(line, sub, after, t, extra) {
    speak(line, sub);
    dropEl.classList.remove('held', 'dragging'); dropEl.classList.add('glide'); put(dropEl, t.x, t.y, .2); dropEl.style.opacity = 0;
    later(1700 + (extra || 0), function () {
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
    function close() { host.innerHTML = ''; }
    function ok() { var v = input.value.trim(); if (!v) return; close(); o.ok(v); }
    function cancel() { close(); if (o.cancel) o.cancel(); }
    var card = el('div', { class: 'topcard', id: 'topcard' }, [el('div', { class: 'inner' }, [
      el('label', { text: o.label }),
      el('div', { class: 'addrow', style: 'margin:0' }, [input, el('button', { class: 'btn primary', text: 'Save', onclick: ok }), el('button', { class: 'btn', text: 'Cancel', onclick: cancel })])])]);
    card._cancel = cancel;
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ok(); } });
    host.append(el('div', { class: 'scrim', onclick: cancel }), card);
    setTimeout(function () { input.focus(); }, 60);
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
    var sub = id === 'my-part' && part && !/^none\b/i.test(part) ? 'Today’s part: ' + part : '';
    body.append(el('div', { class: 'card', style: 'text-align:center' }, [
      el('div', { class: 'big', style: 'font-style:italic;color:var(--gold)', text: r.line }),
      sub ? el('p', { class: 'quiet', text: sub }) : null,
      r.explain ? el('p', { class: 'note', style: 'text-align:left', text: r.explain }) : null]));
    function next() { sit.nextUnderstanding(); renderUnd(body); }
    if (r.explain) body.append(el('div', { style: 'text-align:center' }, [el('button', { class: 'btn primary', text: 'Continue', onclick: next })]));
    else later(1500, function () { if ($('ov-und')) next(); });
  }
  function openSpirit() {
    if (!S.queue.length) { speak(L.understand.text, 'Nothing is here yet.'); later(1800, unspeak); return; }
    var st = sit.state; if (st === 'apart' || st === 'placing') return;
    if (st === 'paused') sit.resume();
    abortFlow();
    if (sit.openQueue()) { save(); render(); openUnderstanding(); }
  }

  // ---------- pray now: a drifting cloud of words ----------
  var cloudStop = null;
  function activePeople() { return S.lists.people.filter(function (p) { return !p.paused; }); }
  function openPray(preId) {
    var m = mountOverlay('ov-pray', 'Let’s pray now', closePray, 'flex');
    var sel = preId || (activePeople()[0] && activePeople()[0].id) || null, recent = [];
    function draw() {
      if (cloudStop) { cloudStop(); cloudStop = null; }
      m.body.innerHTML = '';
      var people = activePeople();
      if (sel && !people.some(function (p) { return p.id === sel; })) sel = people[0] ? people[0].id : null;
      var chips = el('div', { class: 'people' });
      people.forEach(function (p) {
        chips.append(el('button', { class: 'chip' + (p.id === sel ? ' on' : ''), text: p.text, onclick: function () { sel = p.id; recent = []; draw(); } }));
      });
      chips.append(el('button', { class: 'chip quiet', text: '+ Add a name', onclick: function () {
        askText({ label: 'Who is on your heart?', placeholder: 'A name', ok: function (v) { var p = { id: uid(), text: v, paused: false }; S.lists.people.push(p); sel = p.id; save(); draw(); } });
      } }));
      m.body.append(chips);
      var person = people.filter(function (p) { return p.id === sel; })[0];
      if (!person) {
        m.body.append(el('div', { class: 'emptynote', text: 'Who is on your heart? Add a name, and the words will drift for them.' }));
        return;
      }
      var words = S.lists.claims.filter(function (w) { return !w.paused; }).map(function (w) { return w.text; });
      var field = el('div', { class: 'cloudfield' });
      var bar = el('div', { class: 'praybar' }, [el('div', { class: 's1', text: 'Touch a word, and say it for ' + person.text + '.' }), el('div', { class: 's2' })]);
      m.body.append(field, bar);
      var pobj = { key: 'person:' + person.id, kind: 'person', text: person.text };
      requestAnimationFrame(function () {
        cloudStop = startCloud(field, words, function (w, wEl) {
          var line = sit.claim(pobj, w); if (!line) return;
          save(); wEl.classList.add('claimed');
          if (recent.indexOf(w) < 0) recent.push(w);
          bar.querySelector('.s1').textContent = line;
          bar.querySelector('.s2').textContent = recent.length > 1 ? recent.join(' · ') : '';
        });
      });
    }
    draw();
  }
  function closePray() {
    if (cloudStop) { cloudStop(); cloudStop = null; }
    sit.closePray(); save(); closeOverlay('ov-pray'); render(); scheduleDrop(1200);
  }
  function openPrayBucket() {
    var st = sit.state; if (st === 'apart' || st === 'placing') return;
    if (st === 'paused') sit.resume();
    abortFlow();
    if (sit.openPray()) { save(); render(); openPray(); }
  }

  // Words drift slowly; each one stays a while, fades, and another takes its place.
  function startCloud(field, words, onTap) {
    var W = field.clientWidth, H = field.clientHeight, running = true, last = performance.now();
    var n = Math.min(words.length, W < 400 ? 9 : 14), pool = words.slice().sort(function () { return Math.random() - .5; }), items = [];
    function nextWord() { var w = pool.shift(); pool.push(w); return w; }
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function reset(it, first) {
      it.word = nextWord(); it.btn.querySelector('.w').textContent = it.word; it.btn.classList.remove('claimed');
      it.btn.style.fontSize = rnd(1.05, 1.65).toFixed(2) + 'rem';
      var bw = it.btn.offsetWidth || 90, bh = it.btn.offsetHeight || 34;
      it.x = rnd(0, Math.max(1, W - bw)); it.y = rnd(0, Math.max(1, H - bh));
      var sp = rnd(5, 12), a = rnd(0, Math.PI * 2); it.vx = Math.cos(a) * sp; it.vy = Math.sin(a) * sp;
      it.born = performance.now() + (first ? rnd(0, 6000) : 0); it.life = rnd(22000, 38000);
      it.btn.classList.add('in');
    }
    for (var i = 0; i < n; i++) {
      (function () {
        var btn = el('button', { class: 'cword', 'aria-label': '' }, [el('span', { class: 'w' })]);
        field.append(btn);
        var it = { btn: btn };
        btn.addEventListener('click', function () { btn.setAttribute('aria-label', 'Pray ' + it.word); onTap(it.word, btn); });
        reset(it, true); items.push(it);
      })();
    }
    function frame(now) {
      if (!running) return;
      var dt = Math.min(.1, (now - last) / 1000); last = now;
      items.forEach(function (it) {
        var bw = it.btn.offsetWidth, bh = it.btn.offsetHeight;
        it.x += it.vx * dt; it.y += it.vy * dt;
        if (it.x < 0) { it.x = 0; it.vx = Math.abs(it.vx); } else if (it.x > W - bw) { it.x = W - bw; it.vx = -Math.abs(it.vx); }
        if (it.y < 0) { it.y = 0; it.vy = Math.abs(it.vy); } else if (it.y > H - bh) { it.y = H - bh; it.vy = -Math.abs(it.vy); }
        it.btn.style.transform = 'translate(' + it.x.toFixed(1) + 'px,' + it.y.toFixed(1) + 'px)';
        if (!it.fading && now > it.born + it.life) {
          it.fading = true; it.btn.classList.remove('in');
          setTimeout(function () { if (running) { reset(it, false); it.fading = false; } }, 1800);
        }
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return function () { running = false; };
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
      if (tab === 'people') m.body.append(el('p', { class: 'quiet', text: 'Only the names you write here drop. Pause keeps someone but lets them rest; Remove takes them out.' }));
      if (tab === 'claims') m.body.append(el('p', { class: 'quiet', text: 'These drift in Let’s pray now: “…I claim ___ for them.”' }));
      if (!items.length) m.body.append(el('div', { class: 'emptynote', text: info.empty }));
      items.forEach(function (it) {
        var rm = el('button', { class: 'mini', text: 'Remove' }), armed = false;
        rm.addEventListener('click', function () {
          if (!armed) { armed = true; rm.textContent = 'Sure?'; rm.classList.add('warn'); setTimeout(function () { armed = false; rm.textContent = 'Remove'; rm.classList.remove('warn'); }, 3000); return; }
          var i = items.indexOf(it); if (i >= 0) items.splice(i, 1); save(); draw();
        });
        var t = el('span', { class: 't', text: it.text });
        if (tab === 'people' && it.part) t.append(el('span', { class: 'part', text: 'Your part: ' + it.part }));
        m.body.append(el('div', { class: 'row' + (it.paused ? ' paused' : '') }, [t,
          el('button', { class: 'mini', text: it.paused ? 'Resume' : 'Pause', onclick: function () { it.paused = !it.paused; save(); draw(); } }), rm]));
      });
    }
    draw();
  }

  // ---------- noticed ----------
  var SHORT = { 'into-hands': 'into your hands', 'my-part': 'my part', 'thank-you': 'thank you', understand: 'the Spirit', hold: 'held to Jesus', lie: 'put down', 'pray-now': 'prayed for', claim: 'prayed' };
  function seqLabel(o) {
    if (o.line === 'claim') return 'claimed ' + o.word;
    if (o.line === 'understand' && o.uncaught) return 'passed by';
    if (o.line === 'my-part' && o.part) return 'my part: ' + o.part;
    return SHORT[o.line] || o.line;
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
        Object.keys(counts).forEach(function (l) { chips.append(el('span', { class: 'nchip', text: (SHORT[l] || l) + (counts[l] > 1 ? ' ×' + counts[l] : '') })); });
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
    seg('How slowly drops fall', 'pace', [['slow', 'Slow'], ['gentle', 'Gentle'], ['brisk', 'Brisk']]);
    m.body.append(el('p', { class: 'quiet', text: 'There is no hurry. A drop you don’t catch goes to the Holy Spirit, and nothing is lost.' }));
    seg('Look', 'theme', [['auto', 'Match my phone'], ['dark', 'Dark'], ['light', 'Light']]);
    m.body.append(el('div', { class: 'sec', text: 'About' }),
      el('p', { class: 'quiet', text: 'A quiet place to put your heart with Jesus, then catch what drops and speak it to the Father, the Son, or the Spirit. No scores, no streaks. Everything stays on this device.' }));
    var ver = el('p', { class: 'quiet', text: 'Version …' });
    m.body.append(ver);
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
      abortFlow(); closeSheet(); sit.takeBack(); save(); heartPos = G.apart; put(heartEl, heartPos.x, heartPos.y); render();
    }
  }
  heartEl.addEventListener('pointerup', function () { endDrag(false); });
  heartEl.addEventListener('pointercancel', function () { endDrag(true); });
  heartEl.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault();
    heartEl.classList.add('glide');
    if (sit.state === 'apart') { sit.placeHeart(); placed(); }
    else if (sit.state === 'with' || sit.state === 'dropping' || sit.state === 'paused') { abortFlow(); sit.takeBack(); save(); heartPos = G.apart; put(heartEl, heartPos.x, heartPos.y); render(); }
  });
  function placed() {
    heartPos = G.christ; heartEl.classList.add('glide'); put(heartEl, heartPos.x, heartPos.y);
    save(); render();
    speak(L['place-heart'].text);
    later(2600, unspeak); scheduleDrop(3800);
  }

  // ---------- life cycle ----------
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && ['dropping', 'holding', 'offered'].indexOf(sit.state) >= 0) stopForNow('Resting. Your heart stays with Him.');
  });
  window.addEventListener('resize', function () { layout(); });
  applyTheme();
  requestAnimationFrame(function () { requestAnimationFrame(function () { layout(); render(); }); });

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('./sw.js').catch(function () {}); });
  }
  window.__treasure = { sit: sit, S: S }; // for tests in the browser pane
})();
