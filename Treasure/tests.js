// Open Treasure/tests.html — checks the spec's section 12 acceptance rules against the engine and content.
const C = TreasureContent, E = TreasureEngine;
const assert = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
assert.strictEqual = (a, b, m) => { if (a !== b) throw new Error((m || '') + ' expected ' + JSON.stringify(b) + ' got ' + JSON.stringify(a)); };
assert.notStrictEqual = (a, b, m) => { if (a === b) throw new Error((m || '') + ' unexpectedly ' + JSON.stringify(a)); };
assert.deepStrictEqual = (a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(JSON.stringify(a) + ' != ' + JSON.stringify(b)); };
let n = 0, failed = 0;
const out = document.getElementById('out');
const t = (name, fn) => {
  const li = document.createElement('li');
  try { fn(); n++; li.textContent = 'ok  ' + name; li.className = 'ok'; }
  catch (e) { failed++; li.textContent = 'FAIL ' + name + ' — ' + e.message; li.className = 'fail'; }
  out.appendChild(li);
};
const seeded = (seed) => { let s = seed || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const lists = (o) => Object.assign({ people: [], concerns: [], thanks: [], feelings: [], claims: [] }, o);
const fresh = () => new E.Sitting({ queue: [], offers: [], pending: null });
const itemOf = (kind) => ({ key: kind + ':x', kind, text: 'x ' + kind });
const placed = () => { const s = fresh(); s.placeHeart(); return s; };
// sends an item to Insight on purpose (catch, then the Spirit's line), then leaves Understanding
const send = (s, key, kind) => { s.beginDrop({ key, kind: kind || 'feeling', text: key }); s.catchDrop(); s.offer('understand'); s.leaveUnderstanding(); };

t('prayer copy matches spec section 3 exactly', () => {
  assert.strictEqual(C.LINES['place-heart'].text, 'Jesus, I place my heart with you.');
  assert.strictEqual(C.LINES['into-hands'].text, 'Father, into your hands.');
  assert.strictEqual(C.LINES['my-part'].text, 'Father, what is my part today?');
  assert.strictEqual(C.LINES['thank-you'].text, 'Father, thank you.');
  assert.strictEqual(C.LINES['understand'].text, 'Holy Spirit, help me understand.');
  assert.strictEqual(C.LINES['hold'].text, 'Jesus, I hold this to you.');
});
t('every line names Jesus, the Father, or the Holy Spirit', () => {
  Object.values(C.LINES).forEach(l => assert(/^(Jesus|Father|Holy Spirit|Lord),/.test(l.text), l.text));
  assert(/^Father,/.test(C.PRAY_NOW) && /^Father, in Jesus/.test(C.CLAIM));
});
t('authored thoughts are well-formed and plentiful', () => {
  assert(C.THOUGHTS.length >= 50);
  const ids = new Set(C.THOUGHTS.map(x => x.id)); assert.strictEqual(ids.size, C.THOUGHTS.length);
  C.THOUGHTS.forEach(x => { assert.strictEqual(typeof x.truth, 'boolean'); assert(x.text && x.note.length > 20, x.id); });
  assert(C.THOUGHTS.some(x => x.truth) && C.THOUGHTS.some(x => !x.truth));
});
t('nothing can drop until the heart is placed', () => {
  const s = fresh();
  assert.strictEqual(s.beginDrop(itemOf('thought')), false);
  s.beginPlace();
  assert.strictEqual(s.beginDrop(itemOf('thought')), false);
  s.release(false); assert.strictEqual(s.state, 'apart');   // release elsewhere returns to apart
  assert.strictEqual(s.beginDrop(itemOf('thought')), false);
  s.beginPlace(); s.release(true); assert.strictEqual(s.state, 'with');
  assert.strictEqual(s.beginDrop(itemOf('thought')), true);
});
t('place-heart is recorded', () => {
  const s = placed(); assert.strictEqual(s.data.offers[0].line, 'place-heart');
});
t('an uncaught drop passes by: it goes to no bucket, is recorded, and does not end the sitting', () => {
  const s = placed(); s.beginDrop(itemOf('feeling')); s.arriveUncaught();
  assert.strictEqual(s.state, 'with'); assert.strictEqual(s.data.queue.length, 0);
  const last = s.data.offers.pop(); assert.strictEqual(last.line, 'passed'); assert.strictEqual(last.uncaught, true);
  assert.strictEqual(s.beginDrop(itemOf('thought')), true);   // the next drop may begin
});
t('only what is sent to Insight on purpose waits there, and can be recovered', () => {
  const s = placed(); send(s, 'feeling:a'); assert.strictEqual(s.data.queue.length, 1);
  assert(s.openQueue()); assert.strictEqual(s.understanding.kind, 'feeling');
  const r = s.offer('thank-you'); assert(r.ok); assert.strictEqual(s.data.queue.length, 0);
});
t('a catch opens holding; offering the Spirit queues the item and opens understanding', () => {
  const s = placed(); s.beginDrop(itemOf('thought')); s.catchDrop();
  assert.strictEqual(s.state, 'holding');
  const r = s.offer('understand'); assert.strictEqual(r.next, 'understanding');
  assert.strictEqual(s.data.queue.length, 1); assert.strictEqual(s.state, 'understanding');
});
t('hold is not an offer: it does not clear the drop', () => {
  const s = placed(); s.beginDrop(itemOf('concern')); s.catchDrop();
  s.hold(); assert.strictEqual(s.state, 'holding'); assert(s.drop);
  s.hold(); assert.strictEqual(s.data.offers.filter(o => o.line === 'hold').length, 1);
  assert(s.offer('into-hands').ok); assert.strictEqual(s.state, 'offered'); s.finishOffer(); assert.strictEqual(s.state, 'with');
});
t('there is no wrong offer in holding; truth caught and thanked is valid', () => {
  ['into-hands', 'my-part', 'thank-you'].forEach(l => {
    const s = placed(); s.beginDrop({ key: 'thought:t01', kind: 'thought', text: 't', truth: true }); s.catchDrop();
    assert(s.offer(l).ok); assert.strictEqual(s.state, 'offered');
  });
});
t('"none" for my part still counts as into your hands', () => {
  const s = placed(); s.beginDrop(itemOf('person')); s.catchDrop();
  s.offer('my-part', { part: 'None' });
  const lines = s.data.offers.map(o => o.line); assert(lines.includes('my-part') && lines.includes('into-hands'));
  const s2 = placed(); s2.beginDrop(itemOf('person')); s2.catchDrop();
  s2.offer('my-part', { part: 'call her' }); assert.strictEqual(s2.data.offers.pop().part, 'call her');
});
t('offers do not lock a drop: the same item can be offered to more than one Person', () => {
  const s = placed(); const it = itemOf('concern');
  s.beginDrop(it); s.catchDrop(); s.offer('into-hands'); s.finishOffer();
  s.beginDrop(it); s.catchDrop(); s.offer('thank-you'); s.finishOffer();
  assert.deepStrictEqual(s.data.offers.filter(o => o.key === it.key).map(o => o.line), ['into-hands', 'thank-you']);
});
t('mismatch in understanding is explained, not penalized', () => {
  const s = placed(); s.beginDrop({ key: 'thought:l01', kind: 'thought', text: 'lie', truth: false, note: 'n' }); s.catchDrop();
  s.offer('understand'); const r = s.offer('thank-you');
  assert(r.ok && r.explain && /lie/.test(r.explain)); assert.strictEqual(s.data.queue.length, 0);
  assert.strictEqual(E.mismatch({ kind: 'thought', truth: true }, 'into-hands') !== null, true);
  assert.strictEqual(E.mismatch({ kind: 'thought', truth: true }, 'thank-you'), null);
  assert.strictEqual(E.mismatch({ kind: 'feeling' }, 'thank-you'), null);
});
t('stopping mid-queue keeps the queue', () => {
  const s = placed();
  for (let i = 0; i < 3; i++) send(s, 'feeling:' + i);
  s.openQueue(); s.leaveUnderstanding(); assert.strictEqual(s.data.queue.length, 3);
  s.pause(); assert.strictEqual(s.state, 'paused'); assert.strictEqual(s.data.queue.length, 3);
  s.resume(); assert.strictEqual(s.state, 'with');
});
t('leaving an item in the queue is allowed (skip rotates)', () => {
  const s = placed();
  for (let i = 0; i < 2; i++) send(s, 'feeling:' + i);
  s.openQueue(); const first = s.understanding.key; s.skipUnderstanding();
  assert.notStrictEqual(s.understanding.key, first); assert.strictEqual(s.data.queue.length, 2);
});
t('taking the heart out pauses the current drop, it is not deleted', () => {
  const s = placed(); const it = itemOf('person'); s.beginDrop(it);
  assert(s.takeBack()); assert.strictEqual(s.state, 'apart'); assert.strictEqual(s.data.pending.key, it.key);
  assert.strictEqual(s.beginDrop(it), false);
  s.placeHeart(); assert(s.beginDrop(s.data.pending)); assert.strictEqual(s.data.pending, null);
});
t('prayer for a person: claim lines name the Father and Jesus’ name', () => {
  const s = placed(); s.beginDrop(itemOf('person')); s.catchDrop();
  const r = s.offer('pray-now'); assert.strictEqual(r.next, 'praying'); s.finishOffer(); assert(s.openPray());
  assert.strictEqual(s.claim({ key: 'person:a', kind: 'person', text: 'Sam' }, 'peace'), 'Father, in Jesus’ name, I claim peace for Sam.');
  assert(s.closePray()); assert.strictEqual(s.state, 'with');
  const s2 = placed(); s2.beginDrop(itemOf('concern')); s2.catchDrop(); assert.strictEqual(s2.offer('pray-now').ok, false);
});
t('the lie bin: spoken to Jesus, explains an authored thought, never for a person or thanks', () => {
  assert(/^Jesus,/.test(C.LINES['lie'].text));
  const s = placed(); s.beginDrop({ key: 'thought:l01', kind: 'thought', text: 'x', truth: false, note: 'n1' }); s.catchDrop();
  const r = s.offer('lie'); assert(r.ok && /^Yes, a lie/.test(r.verdict)); assert.strictEqual(s.state, 'offered');
  const s2 = placed(); s2.beginDrop({ key: 'thought:t01', kind: 'thought', text: 'x', truth: true, note: 'n2' }); s2.catchDrop();
  assert(/^That one was true/.test(s2.offer('lie').verdict));
  ['person', 'thanks'].forEach(k => { const q = placed(); q.beginDrop(itemOf(k)); q.catchDrop(); assert.strictEqual(q.offer('lie').ok, false); assert.strictEqual(q.state, 'holding'); });
  const f = placed(); f.beginDrop(itemOf('feeling')); f.catchDrop(); assert.strictEqual(f.offer('lie').verdict, null);
});
t('insight options: not from Him, ask what to know, ask what to do', () => {
  const mk = () => { const s = placed(); send(s, 'feeling:x'); s.openQueue(); return s; };
  let s = mk(); const r = s.offer('not-him'); assert(r.ok && s.data.queue.length === 0);
  s = mk(); assert.strictEqual(s.ask('know'), C.LINES.know.text); assert.strictEqual(s.data.queue.length, 1);   // asking does not clear it
  assert(s.sense('A word or phrase', 'peace, be still', false)); assert.strictEqual(s.data.queue.length, 1);
  assert(s.sense('A verse', 'Psalm 46:10', true)); assert.strictEqual(s.data.queue.length, 0);
  s = mk(); assert.strictEqual(s.ask('do'), C.LINES.do.text);
  assert.strictEqual(s.answerDo('none').kept, true); assert.strictEqual(s.data.queue.length, 1);
  assert.strictEqual(s.answerDo('Call her').kept, false); assert.strictEqual(s.data.queue.length, 0);
  assert.strictEqual(s.data.offers.pop().part, 'Call her');
  assert.strictEqual(s.ask('hold'), null);
  const th = placed(); th.beginDrop({ key: 'thought:t01', kind: 'thought', text: 'x', truth: true, note: 'n' }); th.catchDrop(); th.offer('understand');
  assert(/true/.test(th.offer('not-him').explain));   // a mismatch is explained, never penalized
});
t('closing intercession: only after claims, names the Father, recorded', () => {
  const s = placed(); s.beginDrop(itemOf('person')); s.catchDrop(); s.offer('pray-now'); s.finishOffer(); s.openPray();
  const p = { key: 'person:a', kind: 'person', text: 'Sam' };
  assert.strictEqual(s.prayAll(p, []), null);
  assert.strictEqual(s.prayAll(p, ['peace', 'healing']), 'Father, I pray all of this, Your good, pleasing, perfect will for them now.');
  assert.deepStrictEqual(s.data.offers.pop().words, ['peace', 'healing']);
  s.closePray(); assert.strictEqual(s.prayAll(p, ['peace']), null);
});
t('memory is small: last dispatch per item, last prayed per person, no running history', () => {
  const s = placed(), it = { key: 'concern:m', kind: 'concern', text: 'Money' };
  for (let i = 0; i < 40; i++) { s.beginDrop(it); s.catchDrop(); s.offer(i % 2 ? 'into-hands' : 'thank-you'); s.finishOffer(); }
  assert(s.data.offers.length <= 20);                                   // not a growing log
  assert.strictEqual(Object.keys(s.data.last).length, 1);               // one entry for the item
  assert.strictEqual(s.data.last['concern:m'].line, 'into-hands');      // the latest dispatch, with a date
  assert(s.data.last['concern:m'].at > 0);
  s.beginDrop(it); s.catchDrop(); s.hold(); assert.strictEqual(s.data.last['concern:m'].line, 'into-hands'); // hold is not a dispatch
  s.offer('thank-you'); s.finishOffer();
  const p = { key: 'person:a', kind: 'person', text: 'Sam' };
  s.openPray(); s.claim(p, 'peace'); s.claim(p, 'healing'); s.claim(p, 'peace');
  assert.deepStrictEqual(s.data.prayed['person:a'].words, ['peace', 'healing']);
  s.closePray(); s.openPray(); s.claim(p, 'rest');                     // a new visit replaces, not appends
  assert.deepStrictEqual(s.data.prayed['person:a'].words, ['rest']);
});
t('dispatching an item from the main screen also clears its waiting copy in Insight', () => {
  const s = placed(); send(s, 'feeling:w');
  assert.strictEqual(s.data.queue.length, 1);
  s.beginDrop({ key: 'feeling:w', kind: 'feeling', text: 'feeling:w' }); s.catchDrop();
  s.hold(); assert.strictEqual(s.data.queue.length, 1);          // holding is not dispatching
  s.offer('thank-you'); assert.strictEqual(s.data.queue.length, 0);
  s.finishOffer(); send(s, 'feeling:w');                         // sending it to Insight again still works
  assert.strictEqual(s.data.queue.length, 1);
});
t('clear all empties Insight without recording a dispatch', () => {
  const s = placed(); send(s, 'feeling:1'); send(s, 'feeling:2'); send(s, 'feeling:3');
  assert.strictEqual(s.clearQueue(), 0);                         // only from the Insight screen
  s.openQueue(); const before = s.data.last['feeling:1'].line;
  assert.strictEqual(s.clearQueue(), 3); assert.strictEqual(s.data.queue.length, 0); assert.strictEqual(s.understanding, null);
  assert.strictEqual(s.state, 'understanding'); assert.strictEqual(s.data.last['feeling:1'].line, before); // not a dispatch
  assert(s.leaveUnderstanding());
});
t('fears: each lie is complete, seeds point at real lies, a fear can be put down with its teaching', () => {
  assert(C.LIES.length >= 8);
  C.LIES.forEach(l => assert(l.lie && l.truth && l.ref && l.can && C.lieById(l.id) === l, l.id));
  C.FEARS.forEach(f => assert(C.lieById(f.lie), f.text));
  const p = E.buildPool(lists({ fears: [{ id: 'r0', text: 'Running out of money', lie: 'provision' }, { id: 'r9', text: 'Mystery', paused: true }] }));
  assert(p['fear:r0'] && p['fear:r0'].lie === 'provision' && !p['fear:r9']);
  const s = placed(); s.beginDrop(p['fear:r0']); s.catchDrop();
  const r = s.offer('lie'); assert(r.ok && /provide/.test(r.verdict) && /Philippians/.test(r.verdict));
  const q = placed(); q.beginDrop({ key: 'fear:z', kind: 'fear', text: 'x', lie: null }); q.catchDrop(); assert.strictEqual(q.offer('lie').verdict, null); // no lie named yet: nothing invented
});
t('a can-do reminder is never in the random pool, and is not a lie', () => {
  const p = E.buildPool(lists({ cando: [{ id: 'k1', text: 'Take a short walk' }] }));
  assert(Object.keys(p).every(k => k.indexOf('cando:') !== 0));
  const s = placed(); s.beginDrop({ key: 'cando:k1', kind: 'cando', text: 'Take a short walk' }); s.catchDrop();
  assert.strictEqual(s.offer('lie').ok, false); assert.strictEqual(s.state, 'holding');
  assert(s.offer('my-part', { part: 'Take a short walk' }).ok);
  assert.strictEqual(s.data.last['cando:k1'].part, 'Take a short walk');
});
t('pool: only checked (active) list items drop; unchecked ones rest', () => {
  const p = E.buildPool(lists({ people: [{ id: 'a', text: 'Sam', paused: true }, { id: 'b', text: 'Ann' }] }));
  assert(!p['person:a'] && p['person:b']);
  assert(Object.keys(E.buildPool(lists())).every(k => k.indexOf('thought:') === 0));
  assert(C.SEEDS.people.length >= 6);
});
t('a long sitting does not repeat the active pool before it is exhausted', () => {
  const L = lists({ people: [{ id: 'a', text: 'Sam' }], concerns: [{ id: 'c', text: 'Money' }], thanks: [{ id: 'g', text: 'Meal' }], feelings: [{ id: 'f', text: 'Shame' }] });
  const pool = E.buildPool(L), N = Object.keys(pool).length, rng = seeded(7);
  const ds = { deck: [], drawn: [] }; let last = null;
  for (let round = 0; round < 3; round++) {
    const seen = new Set();
    for (let i = 0; i < N; i++) { const it = E.drawNext(ds, pool, rng, last); assert(!seen.has(it.key), 'repeat ' + it.key); seen.add(it.key); last = it.key; }
    assert.strictEqual(seen.size, N);
  }
});
t('adding mid-round joins the round; pausing removes from the pool', () => {
  const L = lists({ people: [{ id: 'a', text: 'Sam' }] }), rng = seeded(3), ds = { deck: [], drawn: [] };
  let pool = E.buildPool(L); E.drawNext(ds, pool, rng, null);
  L.people.push({ id: 'b', text: 'Ann' }); pool = E.buildPool(L);
  const keys = []; for (let i = 0; i < Object.keys(pool).length; i++) keys.push(E.drawNext(ds, pool, rng, null).key);
  assert(keys.includes('person:b'));
  L.people[0].paused = true; pool = E.buildPool(L);
  for (let i = 0; i < 200; i++) assert.notStrictEqual(E.drawNext(ds, pool, rng, null).key, 'person:a');
});
t('first draw of a new round is not the previous last drop', () => {
  const pool = E.buildPool(lists()), N = Object.keys(pool).length;
  for (let seed = 1; seed < 30; seed++) {
    const ds = { deck: [], drawn: [] }, rng = seeded(seed); let last = null;
    for (let i = 0; i < N; i++) last = E.drawNext(ds, pool, rng, last).key;
    assert.notStrictEqual(E.drawNext(ds, pool, rng, last).key, last);
  }
});
document.getElementById('sum').textContent = failed ? failed + ' FAILED, ' + n + ' passed' : 'ALL ' + n + ' PASSED';
