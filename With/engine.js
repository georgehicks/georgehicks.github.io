// Immanuel Prayer — pure logic. No DOM, no storage: app.js and tests.html both import this,
// so every rule lives in exactly one place. Every word shown comes from content.json (passed
// in as C); the only strings here are plain labels with no meaning of their own.

export const PATHS = ['quick', 'deeper', 'healing', 'daily', 'journaling'];
export const GUIDANCE_AFTER = 3; // completed sessions before coaching collapses (Fade)
export const DEFAULT_SETTINGS = {
  theme: 'auto', largeType: false, reduceMotion: false, tone: false,
  guidance: 'fade', reminderHour: null, showGated: false, // showGated: the hidden "reviewed-pending paths" switch
};
export const BREATH = { inhaleMs: 4000, exhaleMs: 4000 };

const uuid = () => (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });

// local-time ISO string with offset
export function localISO(d = new Date()) {
  const p = n => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
    + (off >= 0 ? '+' : '-') + p(Math.floor(Math.abs(off) / 60)) + ':' + p(Math.abs(off) % 60);
}

// ===================== guidance (training wheels that fade) =====================
export const completedCount = sessions => sessions.filter(s => s.status === 'complete').length;
// Fade (default): coaching shows for the first few completed sessions, then collapses to a "?".
// Always: never collapses. Hide: always collapsed. Not sure? and Nothing came? ignore this rule.
export function guidanceOn(mode, completed, after = GUIDANCE_AFTER) {
  if (mode === 'always') return true;
  if (mode === 'hide') return false;
  return completed < after;
}

// ===================== gating (paths and pieces awaiting review) =====================
export const pathDef = (C, id) => C.paths[id];
export const isGated = (C, id) => !!(C.paths[id] && C.paths[id].gated);
export const pathVisible = (C, id, settings) => !!C.paths[id] && (!isGated(C, id) || !!settings.showGated);
export const visiblePaths = (C, settings) => PATHS.filter(id => pathVisible(C, id, settings));
export const gatedPaths = C => PATHS.filter(id => isGated(C, id));

// ===================== the step runner =====================
export const stepDef = (C, pathId, key) => ((C.paths[pathId] || {}).defs || {})[key] || C.steps[key];
export const flowOf = (C, pathId) => C.paths[pathId].flow;
const counted = (C, pathId) => flowOf(C, pathId).filter(k => !(stepDef(C, pathId, k) || {}).uncounted);

export function newSession(pathId, { connected = false, now = new Date() } = {}) {
  return {
    id: uuid(), started: localISO(now), ended: null, path: pathId,
    status: 'open', answered: null,
    memory: pathId === 'healing' ? { asked: '', seen: '', jesus: '', gave: '', forgave: '', lie: '', truth: '', feel: null, rounds: [] } : null,
    connected: !!connected, bringing: '',
    steps: [], test: { scripture: null, jesus: null, love: null, trusted: null, note: '' }, keep: '', followUps: [],
    // kept with the session so a resume lands in the same place
    at: null, trail: [], round: 0, moment: null, nextStep: '', resumeAt: null,
  };
}

// the first step of a path (Deeper can be entered at a later key, e.g. the glad place)
export function startSession(C, s, key) { s.at = key || flowOf(C, s.path)[0]; s.trail = []; return s; }

export function stepCounter(C, s) {
  const list = counted(C, s.path), i = list.indexOf(s.at);
  return i < 0 ? null : { n: i + 1, total: list.length };
}
const flowNext = (C, s, key) => { const f = flowOf(C, s.path), i = f.indexOf(key); return i >= 0 && i < f.length - 1 ? f[i + 1] : null; };

// Move forward. `choice` carries the answer to the few steps that branch:
//   more: 'yes' → Ask Him anything, then back to "Is there more?"; 'no' → on
//   feel: 'peace' → Test; 'lighter'/'heavy' → Ask again
//   again: a step key to return to (a new memory, "ask", starts a new round), or 'rest'
// Returns the new step key, or null when the path is finished.
export function advance(C, s, choice) {
  const cur = s.at, def = stepDef(C, s.path, cur) || {};
  let to;
  if (def.type === 'more') {
    if (choice === 'yes') { s.followUps.push({ prompt: '', answer: '' }); to = 'followup'; } else to = flowNext(C, s, cur);
  } else if (cur === 'followup') to = 'more';
  else if (def.type === 'scale') to = choice === 'peace' ? 'test' : 'again';
  else if (def.type === 'again') {
    if (choice === 'rest') return null;
    s.round += 1; // each ask-again is a fresh pass, so earlier answers are kept as they were written
    to = choice;
  } else if (def.type === 'ready' && s.resumeAt) { to = s.resumeAt; s.resumeAt = null; }
  else to = flowNext(C, s, cur);
  if (to == null) return null;
  s.trail.push(cur); s.at = to;
  return to;
}
export function back(s) { if (!s.trail.length) return null; s.at = s.trail.pop(); return s.at; }
// jump somewhere (Back to the glad place), remembering the way back
export function jump(s, key) { if (s.at !== key) { s.trail.push(s.at); s.at = key; } return s.at; }

// Healing: reopening starts at the ready check, then picks up where the person stopped
export function resumeSession(C, s) {
  if (s.path === 'healing' && s.at && s.at !== 'ready') { s.resumeAt = s.at; s.at = 'ready'; s.trail = []; }
  s.status = 'open'; s.ended = null;
  return s;
}

// ===================== answers =====================
export const entryFor = (s, key, round = s.round) => s.steps.find(e => e.key === key && e.round === round);
export function ensureEntry(s, key, prompt) {
  let e = entryFor(s, key);
  if (!e) { e = { key, round: s.round, prompt: prompt || '', answer: '', via: 'typed', how: [] }; s.steps.push(e); }
  else if (prompt && !e.prompt) e.prompt = prompt;
  return e;
}
export function setAnswer(s, key, prompt, text, via = 'typed') {
  const e = ensureEntry(s, key, prompt);
  e.answer = text; e.prompt = prompt || e.prompt;
  if (via === 'dictated') e.via = 'dictated';
  if (key === 'bring') s.bringing = text;
  return e;
}
export function toggleHow(entry, id) {
  const has = entry.how.includes(id);
  // "Not sure" and "Nothing yet" stand alone; real ways can be combined
  if (has) entry.how = entry.how.filter(x => x !== id);
  else if (id === 'unsure' || id === 'nothing') entry.how = [id];
  else entry.how = [...entry.how.filter(x => x !== 'unsure' && x !== 'nothing'), id];
  return entry.how;
}
export function markNothing(s, key, prompt) {
  const e = ensureEntry(s, key, prompt);
  e.how = ['nothing'];
  return e;
}
export function setTest(s, qid, val) { s.test[qid] = s.test[qid] === val ? null : val; return s.test[qid]; }
// Content decides, never feeling. "no" on Scripture or Jesus: set it down and talk with someone.
// "not sure" anywhere, or "no" on love or on telling someone: hold it lightly, don't decide alone.
export function testAdvice(test) {
  if (test.scripture === 'no' || test.jesus === 'no') return 'no';
  if (['scripture', 'jesus', 'love'].some(k => test[k] === 'unsure') || test.love === 'no'
    || test.trusted === 'no' || test.trusted === 'unsure') return 'unsure';
  return null;
}
export const hasUnsure = test => ['scripture', 'jesus', 'love', 'trusted'].some(k => test[k] === 'unsure');
// "not sure" again and again across sessions: the current session and the two before it all had one
export function repeatedUnsure(sessions, current, n = 3) {
  const prior = sortNewest(sessions.filter(s => s.status === 'complete' && s.id !== current.id && Object.values(s.test).some(v => v)));
  if (!hasUnsure(current.test)) return false;
  return prior.length >= n - 1 && prior.slice(0, n - 1).every(s => hasUnsure(s.test));
}
export function pushRound(s, feel, note, now = new Date()) {
  if (!s.memory) return;
  s.memory.feel = feel;
  s.memory.rounds.push({ feel, note: note || '', at: localISO(now) });
}
// healing memory fields mirror the latest pass through each step
export function syncMemory(s) {
  if (!s.memory) return s;
  const last = k => { const es = s.steps.filter(e => e.key === k); return es.length ? es[es.length - 1] : null; };
  const a = k => (last(k) || {}).answer || '';
  const lt = last('lietruth') || {};
  Object.assign(s.memory, { asked: a('ask'), seen: a('see'), jesus: a('jesus'), gave: a('gave'), forgave: a('forgave'), lie: lt.lie || '', truth: lt.answer || '' });
  return s;
}
export function complete(s, now = new Date()) { syncMemory(s); s.status = 'complete'; s.ended = localISO(now); return s; }
export function rest(s, now = new Date()) { syncMemory(s); s.status = 'resting'; s.ended = localISO(now); s.resumeAt = s.at && s.at !== 'ready' ? s.at : s.resumeAt; return s; }

export function isMeaningful(s) {
  if (!s) return false;
  return s.steps.some(e => (e.answer || '').trim() || (e.lie || '').trim() || e.how.length)
    || !!(s.keep || '').trim() || !!(s.nextStep || '').trim() || s.followUps.some(f => (f.answer || '').trim())
    || Object.values(s.test).some(v => v) || !!s.moment;
}
export function upsertSession(list, s) {
  const i = list.findIndex(x => x.id === s.id);
  if (i < 0) return [...list, s];
  const out = list.slice(); out[i] = s; return out;
}
export const unfinishedOf = list => list.filter(s => s.status === 'open' || s.status === 'resting');

// ===================== titles and labels for Review =====================
export function titleOf(C, s) {
  if (s.path === 'daily' && s.moment) return s.moment.label;
  const t = (s.bringing || '').trim();
  if (t) return t;
  const first = s.steps.find(e => (e.answer || '').trim());
  if (first) return first.answer.trim();
  return C.paths[s.path] ? C.paths[s.path].title : s.path;
}
export const isLight = s => s.path === 'daily'; // shown lighter in Review so they don't swamp longer sessions
export const sortNewest = list => list.slice().sort((a, b) => (a.started < b.started ? 1 : a.started > b.started ? -1 : 0));
export const answeredList = list => sortNewest(list.filter(s => s.answered));
export const datePart = iso => String(iso || '').slice(0, 10);
export function inRange(s, from, to) {
  const d = datePart(s.started);
  return (!from || d >= from) && (!to || d <= to);
}

// ===================== how did it come? =====================
export function howTallies(C, sessions) {
  const t = Object.fromEntries(C.how.ways.map(w => [w.id, 0]));
  for (const s of sessions) for (const e of s.steps) for (const id of e.how || []) if (id in t) t[id]++;
  return t;
}
// A quiet, private observation. Never a score, a ranking or a meaning: it names the one or two
// ways noticed most, with no numbers, and only once there are a few tagged answers to go on.
export function patternNote(C, sessions, min = 3) {
  const t = howTallies(C, sessions);
  const real = C.how.ways.filter(w => w.plain);
  if (real.reduce((n, w) => n + t[w.id], 0) < min) return null;
  const top = real.map((w, i) => ({ w, n: t[w.id], i })).filter(x => x.n > 0)
    .sort((a, b) => b.n - a.n || a.i - b.i).slice(0, 2);
  if (!top.length) return null;
  if (top.length === 1 || top[1].n < top[0].n) return C.how.patternOne.replace('{a}', top[0].w.plain);
  return C.how.pattern.replace('{a}', top[0].w.plain).replace('{b}', top[1].w.plain);
}

// ===================== What's in the way? cards =====================
export const allCards = C => C.objections.cards;
// The Not sure? sheet offers only the cards marked sheet (the six); Common questions never appear there.
export function sheetCard(C, id, fallback = 'how_know') {
  const ok = c => c && c.sheet === true;
  return [id, fallback].map(i => allCards(C).find(c => c.id === i)).find(ok);
}
// the Care page and the paths awaiting review stay hidden behind the same Settings switch
export const careAvailable = (C, settings) => !C.care.gated || !!settings.showGated;

// ===================== safety =====================
export function isWorrisomeText(text, keywords) {
  const t = String(text || '').toLowerCase().replace(/[’‘]/g, "'");
  return keywords.some(k => t.includes(k));
}
// the worrisome parts of a session, joined (empty when there are none)
export function worrisomeText(s, keywords) {
  return [...s.steps.flatMap(e => [e.answer, e.lie]), s.keep, s.nextStep, s.test.note, ...s.followUps.map(f => f.answer)]
    .filter(t => isWorrisomeText(t, keywords)).join('\n');
}
export const sessionWorrisome = (s, keywords) => !!worrisomeText(s, keywords);

// ===================== rich text: references, *em*, **bold** =====================
const BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Psalm', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah',
  'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians',
  '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John',
  '3 John', 'Jude', 'Revelation'];
const RANGE = '\\d+(?:[–-]\\d+)?';
// "John 10:27", "John 10:3–5", "Acts 8:26, 29", "Luke 24:25–27, 32, 45", "1 Samuel 3", "John 10:3–5, 10:16"
const REF_SRC = '(?<![\\w])(?:' + BOOKS.slice().sort((a, b) => b.length - a.length).join('|') + ')\\s\\d+(?::' + RANGE
  + '(?:,\\s(?:\\d+:)?' + RANGE + '(?![\\d:]|\\s?[A-Za-z]))*)?';
export function findRefs(text) {
  const re = new RegExp(REF_SRC, 'g'), out = [];
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: 'text', v: text.slice(last, m.index) });
    out.push({ t: 'ref', v: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ t: 'text', v: text.slice(last) });
  return out;
}
// curly quotes for display only (the data keeps the straight characters it was written with)
export function smart(text) {
  return String(text)
    .replace(/(^|[\s(\[—–])"/g, '$1“').replace(/"/g, '”')
    .replace(/(^|[\s(\[—–“])'/g, '$1‘').replace(/'/g, '’');
}
// → [{ t: 'text'|'em'|'b'|'ref', v }]
export function parseRich(text) {
  const out = [];
  const parts = smart(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/);
  for (const p of parts) {
    if (!p) continue;
    if (p.startsWith('**')) out.push({ t: 'b', v: p.slice(2, -2) });
    else if (p.startsWith('*')) out.push({ t: 'em', v: p.slice(1, -1) });
    else out.push(...findRefs(p));
  }
  return out;
}
export const stripRich = text => String(text).replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
// the first reference in a label ("John 5:19–20, 30" → the whole thing) as an esv.org address
export const esvUrl = ref => 'https://www.esv.org/' + encodeURIComponent(ref.replace(/–/g, '-').replace(/,\s+/g, ',')).replace(/%20/g, '+').replace(/%3A/g, ':').replace(/%2C/g, ',') + '/';
export const verseKey = ref => ref; // verses.json is keyed by the label as written: { "John 3:16": [[16, "…"]] }

// ===================== export (plain text and print page) =====================
const pad = n => String(n).padStart(2, '0');
export function fmtStamp(iso) { return String(iso || '').slice(0, 10) + ' ' + String(iso || '').slice(11, 16); }
const howLabels = (C, ids) => (ids || []).map(id => (C.how.ways.find(w => w.id === id) || {}).label).filter(Boolean);
const testLabel = (C, v) => (C.test.options.find(o => o.id === v) || {}).label;
const pathTitle = (C, s) => (C.paths[s.path] || {}).title || s.path;

// One neutral structure for both formats, so text and print can never disagree.
export function recordOf(C, s) {
  const rows = [];
  for (const e of s.steps) {
    if (!(e.answer || '').trim() && !(e.lie || '').trim() && !(e.how || []).length) continue;
    if (e.key === 'lietruth') {
      if ((e.lie || '').trim()) rows.push({ q: (C.paths.healing.defs.lietruth || {}).lieTitle, a: e.lie });
      rows.push({ q: (C.paths.healing.defs.lietruth || {}).truthTitle, a: e.answer, how: howLabels(C, e.how), via: e.via });
    } else rows.push({ q: e.prompt, a: e.answer, how: howLabels(C, e.how), via: e.via });
  }
  for (const f of s.followUps) if ((f.answer || '').trim()) rows.push({ q: f.prompt || C.steps.followup.title, a: f.answer });
  const test = C.test.questions.map(q => s.test[q.id] ? q.name + ': ' + testLabel(C, s.test[q.id]) : null).filter(Boolean);
  return {
    title: pathTitle(C, s) + (s.moment ? ' — ' + s.moment.label : ''), when: fmtStamp(s.started), status: s.status,
    rows, test, testNote: (s.test.note || '').trim(), keep: (s.keep || '').trim(), nextStep: (s.nextStep || '').trim(),
    answered: s.answered ? (s.answered.note || '').trim() || '—' : null,
    rounds: s.memory ? s.memory.rounds.map(r => ({ feel: r.feel, note: r.note, at: fmtStamp(r.at) })) : [],
  };
}
export function exportText(C, sessions, now = new Date()) {
  const L = [C.copy.wordmark, C.copy.export.exported + ' ' + localISO(now).slice(0, 10), ''];
  for (const s of sortNewest(sessions)) {
    const r = recordOf(C, s);
    L.push('## ' + r.title + ' — ' + r.when + (r.status !== 'complete' ? ' (' + C.copy.review.status[r.status] + ')' : ''));
    for (const row of r.rows) {
      L.push('', row.q, row.a || C.copy.review.nothingYet);
      if (row.how && row.how.length) L.push('(' + C.how.title + ' ' + row.how.join(', ') + ')');
    }
    if (r.rounds.length) { L.push('', C.copy.review.rounds); r.rounds.forEach(x => L.push('- ' + x.at + ' ' + (x.feel || '') + (x.note ? ': ' + x.note : ''))); }
    if (r.test.length) L.push('', C.test.top + ' ' + r.test.join(' · ') + (r.testNote ? ' — ' + r.testNote : ''));
    if (r.keep) L.push('', C.keep.title + ' ' + r.keep);
    if (r.nextStep) L.push(C.keep.nextLabel + ' ' + r.nextStep);
    if (r.answered) L.push('', C.copy.review.godAnswered + ': ' + r.answered);
    L.push('');
  }
  return L.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
export const escapeHTML = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// A self-contained, print-styled page: opened in a new view, it offers the print dialog (Save as PDF).
export function exportHTML(C, sessions, now = new Date()) {
  const e = escapeHTML, br = t => e(t).replace(/\n/g, '<br>');
  const body = sortNewest(sessions).map(s => {
    const r = recordOf(C, s);
    return '<section><h2>' + e(r.title) + '</h2><p class="when">' + e(r.when) + (r.status !== 'complete' ? ' · ' + e(C.copy.review.status[r.status]) : '') + '</p>'
      + r.rows.map(row => '<div class="q">' + e(row.q) + '</div><div class="a">' + (row.a ? br(row.a) : '<i>' + e(C.copy.review.nothingYet) + '</i>') + '</div>'
        + (row.how && row.how.length ? '<div class="how">' + e(C.how.title) + ' ' + e(row.how.join(', ')) + '</div>' : '')).join('')
      + (r.test.length ? '<div class="q">' + e(C.test.top) + '</div><div class="a">' + e(r.test.join(' · ')) + (r.testNote ? ' — ' + br(r.testNote) : '') + '</div>' : '')
      + (r.keep ? '<div class="q">' + e(C.keep.title) + '</div><div class="a">' + br(r.keep) + '</div>' : '')
      + (r.nextStep ? '<div class="q">' + e(C.keep.nextLabel) + '</div><div class="a">' + br(r.nextStep) + '</div>' : '')
      + (r.answered ? '<div class="q">' + e(C.copy.review.godAnswered) + '</div><div class="a">' + br(r.answered) + '</div>' : '')
      + '</section>';
  }).join('');
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<title>' + e(C.copy.wordmark) + '</title><style>'
    + 'body{font:16px/1.5 Georgia,serif;color:#111;margin:0;padding:24px;max-width:680px;margin:0 auto}'
    + 'h1{font:600 22px/1.2 system-ui,sans-serif;margin:0 0 4px}h2{font:600 18px/1.3 system-ui,sans-serif;margin:0}'
    + '.meta,.when,.how{font:13px/1.4 system-ui,sans-serif;color:#555}.when{margin:2px 0 10px}'
    + '.q{font:600 14px/1.4 system-ui,sans-serif;margin-top:10px}.a{margin-top:2px}'
    + 'section{border-top:1px solid #bbb;padding:16px 0;break-inside:avoid}'
    + '.bar{font:15px system-ui,sans-serif;margin:0 0 16px}.bar button{font:inherit;padding:10px 16px;border-radius:10px;border:1px solid #1F3A5F;background:#1F3A5F;color:#fff}'
    + '@media print{.bar{display:none}body{padding:0}}'
    + '</style></head><body><p class="bar"><button onclick="window.print()">' + e(C.copy.export.print) + '</button></p>'
    + '<h1>' + e(C.copy.wordmark) + '</h1><p class="meta">' + e(C.copy.export.exported) + ' ' + e(localISO(now).slice(0, 10)) + '</p>'
    + (body || '<p>' + e(C.copy.review.empty) + '</p>')
    + '<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},400)})</script></body></html>';
}

// ===================== reminder (.ics, as in IAmHere) =====================
export function reminderICS(C, hour, now = new Date(), url = '') {
  const p = n => String(n).padStart(2, '0');
  const d = new Date(now); d.setDate(d.getDate() + (d.getHours() >= hour ? 1 : 0));
  const day = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//With//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', 'UID:with-daily-reminder', 'DTSTAMP:' + stamp, `DTSTART:${day}T${p(hour)}0000`, 'DURATION:PT5M',
    'RRULE:FREQ=DAILY', 'SUMMARY:' + C.copy.wordmark];
  if (url) lines.push('URL:' + url);
  lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + C.copy.wordmark, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR', '');
  return lines.join('\r\n');
}

// ===================== connected (the breath) =====================
// the next orienting line, never the one shown last time
export function pickVerse(count, last) {
  if (count <= 1) return 0;
  return last == null || last < 0 || last >= count - 1 ? 0 : last + 1;
}

// ===================== routes =====================
// Screens where it is safe to swap in a new version of the app (never mid-session or mid-edit).
export const RESTING = ['start', 'way', 'why', 'review', 'more', 'settings', 'references', 'about', 'safety', 'nothing', 'care', 'common', ''];
export function isResting(route) {
  const parts = String(route || '').split('/');
  if (parts[0] === 'review' && parts[1]) return false; // a record may be open for editing
  return RESTING.includes(parts[0]);
}

export function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    Object.values(o).forEach(deepFreeze);
  }
  return o;
}
