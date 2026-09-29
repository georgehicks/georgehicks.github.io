// I Am Here — pure decision logic. No DOM, no storage: app.js and tests.html both
// import this, so every rule from the PRD lives in exactly one place. All copy and
// verse strings come from content.json (passed in as C); nothing is hardcoded here.

export const AXES = ['spirit', 'body', 'mind'];
export const HOME = { spirit: 'rising', body: 'rest', mind: 'present_open' };
export const TAKEN = ['fight', 'flight', 'freeze', 'collapse'];

// PRD §12.1 — 4s in / 4s out, 8 breaths by default, "Done" after 6; the
// already-home path (§5.1) ends after 4; blank mind (§2) gets 2 silent breaths first.
export const BREATH = { inhaleMs: 4000, exhaleMs: 4000, total: 8, doneAfter: 6, homeTotal: 4, backAfter: 4, silentBlank: 2 };

export const isComplete = loc => AXES.every(a => !!loc[a]);
export const isAllHome = loc => AXES.every(a => loc[a] === HOME[a]);
export const offHomeAxes = loc => AXES.filter(a => loc[a] && loc[a] !== HOME[a]);

// PRD §9 — deterministic priority, first match wins.
export function recommendAxis(loc) {
  if (loc.mind === 'blank') return 'mind';
  if (TAKEN.includes(loc.body)) return 'body';
  if (loc.spirit === 'dying') return 'spirit';
  if (loc.spirit === 'managed') return 'spirit';
  if (loc.mind === 'time_travel') return 'mind';
  if (loc.mind === 'present_narrowed') return 'mind';
  if (loc.body === 'control') return 'body';
  return 'spirit';
}

// Which axes the "Choose a different axis" control may offer: only off-home ones,
// unless the recommended axis is the only one off home (§9, "should not happen").
export function axisChoices(loc) {
  const off = offHomeAxes(loc);
  return off.length ? off : [recommendAxis(loc)];
}

// PRD §5 step 8 / §10 — which pin list applies. Returns 'dying' | 'managed' |
// 'skipped_blank' | null. Pin screen shows only for 'dying' / 'managed'.
export function pinListFor(loc) {
  if (loc.spirit !== 'dying' && loc.spirit !== 'managed') return null;
  if (loc.mind === 'blank') return 'skipped_blank';
  return loc.spirit;
}
export const needsPin = loc => { const l = pinListFor(loc); return l === 'dying' || l === 'managed'; };
export const pinsFor = (C, list) => list === 'dying' ? C.dyingPins : list === 'managed' ? C.managedPins : [];
export const isUnknownPin = id => id === 'unknown_dying' || id === 'unknown_managed';

// PRD §2 — "One pin per visit. A second tap is 'also', never stored as co-equal.
// If three are tapped, keep the first and ignore the rest." Tapping the first pin
// again clears the choice, so a mis-tap can be corrected.
export function tapPin(sel, id) {
  const s = { primary: sel.primary || null, also: sel.also || null };
  if (!s.primary) return { primary: id, also: null };
  if (id === s.primary) return { primary: null, also: null };
  if (id === s.also) return { primary: s.primary, also: null };
  if (!s.also) return { primary: s.primary, also: id };
  return s;
}

// PRD §11 — one strategy for the axis being moved.
export function strategyFor(C, loc, axis, pinId) {
  if (axis === 'body') return C.strategiesByBody[loc.body];
  if (axis === 'mind') return C.strategiesByMind[loc.mind];
  if (pinId && C.strategiesByPin[pinId]) return C.strategiesByPin[pinId];
  // spirit moved with no pin (pin skipped because mind is blank): the list's "don't know" line
  const list = loc.spirit === 'dying' ? 'unknown_dying' : 'unknown_managed';
  return C.strategiesByPin[list];
}

export const honestyNote = (C, pinId) => pinId === 'proverb' ? C.copy.strategy.honestyProverb : null;

// PRD §12.2 — verse selection, in the order listed there.
export function verseFor(C, { loc, axis, pinId, homePath }) {
  if (homePath) return C.verseByMind.present_open;                         // John 15:9
  if (loc.mind === 'blank') return C.verseByMind.blank;                     // Rom 8:26
  if (pinId && !isUnknownPin(pinId)) return C.verseByPin[pinId];
  if (axis === 'mind' && loc.mind === 'time_travel') {
    if (loc.timeTravelFlavor === 'future') return C.verseByMind.time_travel_future;
    if (loc.timeTravelFlavor === 'past') return C.verseByMind.time_travel_past;
    return C.verseByMind.time_travel;                                       // null flavor → Matt 6:34
  }
  if (axis === 'mind' && loc.mind === 'present_narrowed') return C.verseByMind.present_narrowed;
  if (axis === 'body' && loc.spirit === 'rising') return C.verseByBody[loc.body];
  if (pinId === 'unknown_dying') return C.verseByPin.unknown_dying;         // Isa 43:1
  if (pinId === 'unknown_managed') return C.verseByPin.unknown_managed;     // Ps 46:10
  // not reachable through §5's flow; stay on Scripture rather than show nothing
  if (loc.spirit === 'dying') return C.verseByPin.unknown_dying;
  if (loc.spirit === 'managed') return C.verseByPin.unknown_managed;
  return C.verseByMind.present_open;
}

export const breathPlan = ({ loc, homePath }) => homePath
  ? { total: BREATH.homeTotal, doneAfter: BREATH.homeTotal, silent: 0 }
  : { total: BREATH.total, doneAfter: BREATH.doneAfter, silent: loc.mind === 'blank' ? BREATH.silentBlank : 0 };

const uuid = () => (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });

// local-time ISO string with offset (PRD §6: "ISO string, local time")
export function localISO(d = new Date()) {
  const p = n => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
    + (off >= 0 ? '+' : '-') + p(Math.floor(Math.abs(off) / 60)) + ':' + p(Math.abs(off) % 60);
}

// PRD §6 session record. Deliberately has no field for the "than whom" text:
// "Do not store free-text. Do not store names of other people."
export function buildSession(v, { breathsCompleted, saved }) {
  return {
    id: uuid(),
    ts: localISO(),
    domain: v.loc.domain || 'moment',
    spirit: v.loc.spirit,
    body: v.loc.body,
    mind: v.loc.mind,
    timeTravelFlavor: v.loc.mind === 'time_travel' ? (v.loc.timeTravelFlavor || null) : null,
    pinList: v.homePath ? null : pinListFor(v.loc),
    pinId: v.pinId || null,
    axisMoved: v.axis,
    verseRef: v.verse.ref,
    breathsCompleted: Math.max(0, Math.min(10, breathsCompleted | 0)),
    saved: !!saved,
  };
}

export function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    Object.values(o).forEach(deepFreeze);
  }
  return o;
}
