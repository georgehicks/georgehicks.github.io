/* Treasuring — engine. Pure logic: the sitting's states (spec section 4), the drop deck (section 6),
   catch/offer rules (section 7) and Understanding (section 8). No DOM, no storage. */
(function (root) {
  'use strict';
  var C = (typeof require !== 'undefined' && typeof module !== 'undefined') ? require('./content.js') : root.TreasureContent;

  var KIND_WEIGHT = { thought: 1, person: 12, concern: 2, thanks: 2, feeling: 2 };
  var LIST_KIND = { people: 'person', concerns: 'concern', thanks: 'thanks', feelings: 'feeling' };
  var HOLD_OFFERS = ['into-hands', 'my-part', 'thank-you', 'understand', 'pray-now', 'lie'];
  var UNDERSTAND_OFFERS = ['into-hands', 'my-part', 'thank-you', 'not-him'];

  function fill(s, map) { return s.replace(/\{(\w+)\}/g, function (_, k) { return map[k]; }); }
  function lineText(id, name) {
    if (id === 'pray-now') return fill(C.PRAY_NOW, { name: name || 'them' });
    return C.LINES[id].text;
  }

  // ---------- pool & deck ----------
  function buildPool(lists) {
    var pool = {};
    C.THOUGHTS.forEach(function (t) {
      pool['thought:' + t.id] = { key: 'thought:' + t.id, kind: 'thought', text: t.text, truth: t.truth, note: t.note };
    });
    Object.keys(LIST_KIND).forEach(function (name) {
      (lists[name] || []).forEach(function (i) {
        if (i.paused) return;
        var kind = LIST_KIND[name];
        pool[kind + ':' + i.id] = { key: kind + ':' + i.id, kind: kind, text: i.text, listId: i.id, part: i.part || null };
      });
    });
    return pool;
  }

  function weightedShuffle(keys, rng) {
    return keys.map(function (k) {
      var w = KIND_WEIGHT[k.split(':')[0]] || 1;
      return { k: k, s: Math.pow(rng(), 1 / w) };
    }).sort(function (a, b) { return b.s - a.s; }).map(function (x) { return x.k; });
  }

  // deckState: { deck: [keys remaining this round], drawn: [keys already drawn this round] }
  // Returns the next item, or null if the pool is empty. A key is not repeated before the round is exhausted.
  function drawNext(deckState, pool, rng, lastKey) {
    var keys = Object.keys(pool);
    if (!keys.length) return null;
    deckState.deck = deckState.deck.filter(function (k) { return pool[k]; });
    deckState.drawn = deckState.drawn.filter(function (k) { return pool[k]; });
    // items added mid-round join this round at a random place
    keys.forEach(function (k) {
      if (deckState.deck.indexOf(k) < 0 && deckState.drawn.indexOf(k) < 0) {
        deckState.deck.splice(Math.floor(rng() * (deckState.deck.length + 1)), 0, k);
      }
    });
    if (!deckState.deck.length) {
      deckState.drawn = [];
      deckState.deck = weightedShuffle(keys, rng);
      if (deckState.deck.length > 1 && deckState.deck[0] === lastKey) deckState.deck.push(deckState.deck.shift());
    }
    var key = deckState.deck.shift();
    deckState.drawn.push(key);
    return pool[key];
  }

  // ---------- understanding ----------
  // A mismatch between offer and an authored thought is explained, never penalized.
  function mismatch(item, lineId) {
    if (item.kind !== 'thought') return null;
    if (item.truth === false && lineId === 'thank-you') {
      return 'This one is a lie, so thanks for the thought as it stands isn’t quite true. Thank Him for the truth it borrowed, and let the thought itself go into His hands.';
    }
    if (item.truth === true && lineId === 'into-hands') {
      return 'This one is true. Giving it into His hands is not wrong, and “Father, thank you” may be the truer word for it.';
    }
    if (item.truth === true && lineId === 'not-him') {
      return 'This one is true, so it is from Him after all, even if it felt hard. You can ask Him what He wants you to know about it.';
    }
    return null;
  }

  // Putting a thought down as a lie: for an authored thought, say what it was. Never a penalty.
  function lieVerdict(item) {
    if (item.kind !== 'thought') return null;
    return item.truth ? 'That one was true. ' + item.note : 'Yes, a lie. ' + item.note;
  }

  // ---------- the sitting ----------
  // data: { queue: [item snapshots + {source,at}], offers: [records], pending: item|null }
  function Sitting(data) {
    this.data = data;
    if (!this.data.queue) this.data.queue = [];
    if (!this.data.offers) this.data.offers = [];
    this.state = 'apart';
    this.drop = null;       // the drop in motion or in hand
    this.understanding = null; // the queue item being looked at
    this.held = { hold: false };
    this.uncaughtRun = 0;
  }
  var P = Sitting.prototype;

  P._record = function (item, line, extra) {
    var rec = { at: Date.now(), key: item.key, kind: item.kind, text: item.text, line: line };
    if (extra) for (var k in extra) rec[k] = extra[k];
    this.data.offers.push(rec);
    if (this.data.offers.length > 2000) this.data.offers.splice(0, this.data.offers.length - 2000);
    return rec;
  };
  P._enqueue = function (item, source) {
    if (this.data.queue.some(function (q) { return q.key === item.key; })) return;
    var snap = {}; for (var k in item) snap[k] = item[k];
    snap.source = source; snap.at = Date.now();
    this.data.queue.push(snap);
  };
  P._dequeue = function (key) {
    this.data.queue = this.data.queue.filter(function (q) { return q.key !== key; });
  };

  // Heart apart -> placing -> with him
  P.beginPlace = function () { if (this.state !== 'apart') return false; this.state = 'placing'; return true; };
  P.release = function (onChrist) {
    if (this.state !== 'placing') return false;
    if (onChrist) { this.state = 'with'; this.uncaughtRun = 0; this._record({ key: 'sitting', kind: 'sitting', text: '' }, 'place-heart'); }
    else this.state = 'apart';
    return true;
  };
  P.placeHeart = function () { return this.beginPlace() && this.release(true); }; // keyboard / assistive path

  // Taking the heart back out of Christ: the current drop pauses, it is not deleted.
  P.takeBack = function () {
    if (['with', 'dropping', 'holding', 'paused', 'understanding', 'praying'].indexOf(this.state) < 0) return false;
    if (this.drop) { this.data.pending = this.drop; this.drop = null; }
    this.understanding = null;
    this.state = 'apart';
    return true;
  };

  // Drops — only when the heart is with him.
  P.beginDrop = function (item) {
    if (this.state !== 'with' || !item) return false;
    this.drop = item; this.held = { hold: false };
    if (this.data.pending && this.data.pending.key === item.key) this.data.pending = null;
    this.state = 'dropping';
    return true;
  };
  P.catchDrop = function () {
    if (this.state !== 'dropping') return false;
    this.state = 'holding'; this.uncaughtRun = 0; return true;
  };
  // Arrives uncaught: nothing is subtracted; it enters the understand queue, the Spirit's line recorded.
  P.arriveUncaught = function () {
    if (this.state !== 'dropping') return false;
    var item = this.drop;
    this._enqueue(item, 'uncaught');
    this._record(item, 'understand', { uncaught: true });
    this.drop = null; this.state = 'with'; this.uncaughtRun++;
    return true;
  };

  // Holding: "Jesus, I hold this to you" may be said before an offer and does not clear the drop.
  P.hold = function () {
    if (this.state !== 'holding' && this.state !== 'understanding') return false;
    var item = this.state === 'holding' ? this.drop : this.understanding;
    if (!this.held.hold) { this.held.hold = true; this._record(item, 'hold'); }
    return true;
  };

  // Choosing the line is the offer. Returns { ok, next, line, explain }.
  P.offer = function (lineId, extra) {
    extra = extra || {};
    if (this.state === 'holding') {
      if (HOLD_OFFERS.indexOf(lineId) < 0) return { ok: false };
      var item = this.drop;
      if (lineId === 'pray-now' && item.kind !== 'person') return { ok: false };
      if (lineId === 'lie' && (item.kind === 'person' || item.kind === 'thanks')) return { ok: false };
      if (lineId === 'understand') {
        this._enqueue(item, 'asked');
        this._record(item, 'understand');
        this.understanding = this.data.queue.filter(function (q) { return q.key === item.key; })[0];
        this.drop = null; this.state = 'understanding'; this.held = { hold: false };
        return { ok: true, next: 'understanding', line: lineText('understand') };
      }
      if (lineId === 'my-part') {
        var part = (extra.part || '').trim();
        var none = !part || /^none\b/i.test(part);
        this._record(item, 'my-part', { part: none ? null : part });
        if (none) this._record(item, 'into-hands', { none: true });
      } else {
        this._record(item, lineId);
      }
      this.drop = null; this.state = 'offered';
      return { ok: true, next: lineId === 'pray-now' ? 'praying' : 'offered', line: lineText(lineId, item.text), item: item,
        verdict: lineId === 'lie' ? lieVerdict(item) : null };
    }
    if (this.state === 'understanding') {
      if (UNDERSTAND_OFFERS.indexOf(lineId) < 0) return { ok: false };
      var it = this.understanding;
      var explain = mismatch(it, lineId);
      var p = (extra.part || '').trim();
      var noPart = !p || /^none\b/i.test(p);
      if (lineId === 'my-part') {
        this._record(it, 'my-part', { part: noPart ? null : p, understood: true });
        if (noPart) this._record(it, 'into-hands', { none: true, understood: true });
      } else this._record(it, lineId, { understood: true });
      this._dequeue(it.key);
      this.understanding = null;
      this.state = 'understanding'; // stays until next item / leave
      return { ok: true, next: 'understanding', line: lineText(lineId), explain: explain, item: it };
    }
    return { ok: false };
  };

  // After an offer's line has been spoken, the item leaves and the next drop may begin.
  P.finishOffer = function () { if (this.state !== 'offered') return false; this.state = 'with'; return true; };

  // Understanding: the Spirit's bucket. The queue persists whether or not it is emptied.
  P.openQueue = function () {
    if (this.state === 'dropping') { this.data.pending = this.drop; this.drop = null; this.state = 'with'; }
    if (this.state !== 'with' || !this.data.queue.length) return false;
    this.understanding = this.data.queue[0]; this.state = 'understanding'; return true;
  };
  P.nextUnderstanding = function () {
    if (this.state !== 'understanding') return null;
    this.understanding = this.data.queue[0] || null;
    return this.understanding;
  };
  P.leaveUnderstanding = function () {
    if (this.state !== 'understanding') return false;
    this.understanding = null; this.state = 'with'; return true;
  };
  // Leaving an item in the queue is success, not failure: skip to the next one.
  P.skipUnderstanding = function () {
    if (this.state !== 'understanding' || !this.understanding) return null;
    var q = this.data.queue, i = q.indexOf(this.understanding);
    var it = q.splice(i, 1)[0]; q.push(it);
    this.understanding = q[0]; this.held = { hold: false };
    return this.understanding;
  };

  // Asking the Lord about an item in Understanding. Asking does not clear it; an answer the person writes does.
  P.ask = function (lineId) {
    if (this.state !== 'understanding' || !this.understanding || (lineId !== 'know' && lineId !== 'do')) return null;
    this._record(this.understanding, lineId, { asked: true });
    return lineText(lineId);
  };
  // What came (a word, a verse, a picture), written by the person. finish=true clears it from the queue.
  P.sense = function (how, text, finish) {
    if (this.state !== 'understanding' || !this.understanding || !text) return false;
    this._record(this.understanding, 'sensed', { how: how, sensed: text });
    if (finish) { this._dequeue(this.understanding.key); this.understanding = null; }
    return true;
  };
  // "What do you want me to do?" — one part, or none (none leaves it waiting).
  P.answerDo = function (part) {
    if (this.state !== 'understanding' || !this.understanding) return null;
    var p = (part || '').trim(), none = !p || /^none\b/i.test(p), it = this.understanding;
    if (none) return { kept: true };
    this._record(it, 'do', { part: p, understood: true });
    this._dequeue(it.key); this.understanding = null;
    return { kept: false, part: p };
  };

  // Praying for a person (the drifting cloud of claims). Heart stays with him.
  P.openPray = function () {
    if (this.state === 'dropping') { this.data.pending = this.drop; this.drop = null; this.state = 'with'; }
    if (this.state !== 'with' && this.state !== 'offered') return false;
    this.state = 'praying'; return true;
  };
  P.claim = function (person, word, spoken) {
    if (this.state !== 'praying' || !person || !word) return null;
    var line = fill(C.CLAIM, { word: word, name: spoken || person.text });
    this._record(person, 'claim', { word: word });
    return line;
  };
  P.closePray = function () { if (this.state !== 'praying') return false; this.state = 'with'; return true; };

  // Player stopped. Heart may remain with him; queue, lists and the paused drop persist. No penalty.
  P.pause = function () {
    if (['with', 'dropping', 'holding', 'offered', 'understanding', 'praying'].indexOf(this.state) < 0) return false;
    if (this.drop) { this.data.pending = this.drop; this.drop = null; }
    this.understanding = null; this.state = 'paused'; return true;
  };
  P.resume = function () { if (this.state !== 'paused') return false; this.state = 'with'; this.uncaughtRun = 0; return true; };

  var api = {
    Sitting: Sitting, buildPool: buildPool, drawNext: drawNext, weightedShuffle: weightedShuffle,
    mismatch: mismatch, lineText: lineText, fill: fill, LIST_KIND: LIST_KIND
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TreasureEngine = api;
})(typeof self !== 'undefined' ? self : this);
