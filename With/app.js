// Immanuel Prayer — views, routing, storage. Decisions live in engine.js; every word shown
// comes from content.json. Local only: localStorage, no network after first load.
import * as E from './engine.js';

const $app = document.getElementById('app');
const $announce = document.getElementById('announcer');
let C = null; // frozen content.json

// ===================== storage (local only; every screen works if it is blocked) =====================
const KEY = { settings: 'with.settings', sessions: 'with.sessions', draft: 'with.draft', seen: 'with.seen' };
const mem = {}; // what the app uses for the visit when localStorage throws (private mode, blocked site data)
const store = {
  get(k, fallback) {
    try { const v = localStorage.getItem(k); if (v != null) return JSON.parse(v); } catch { if (k in mem) return JSON.parse(mem[k]); return fallback; }
    return k in mem ? JSON.parse(mem[k]) : fallback;
  },
  set(k, v) { mem[k] = JSON.stringify(v); try { localStorage.setItem(k, mem[k]); } catch {} },
  remove(k) { delete mem[k]; try { localStorage.removeItem(k); } catch {} },
  clearAll() { Object.values(KEY).forEach(k => store.remove(k)); },
};
let settings = { ...E.DEFAULT_SETTINGS, ...store.get(KEY.settings, {}) };
function saveSettings() { store.set(KEY.settings, settings); applySettings(); }
const THEME_COLOR = { light: '#F6F3EC', dark: '#14161B' };
function applySettings() {
  document.documentElement.classList.toggle('reduce-motion', !!settings.reduceMotion);
  document.documentElement.classList.toggle('large', !!settings.largeType);
  const forced = settings.theme === 'light' || settings.theme === 'dark' ? settings.theme : null;
  if (forced) document.documentElement.dataset.theme = forced; else delete document.documentElement.dataset.theme;
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
    const own = /dark/.test(m.media) ? 'dark' : 'light';
    m.content = THEME_COLOR[forced || own];
  });
}
const sessions = () => store.get(KEY.sessions, []);
const saveSessions = list => store.set(KEY.sessions, list);
const seen = () => store.get(KEY.seen, {});
const setSeen = patch => store.set(KEY.seen, { ...seen(), ...patch });

// the session in progress (autosaved on every change, so a lock-screen interruption loses nothing)
let cur = store.get(KEY.draft, null);
let draftTimer = 0;
function saveDraft() { clearTimeout(draftTimer); draftTimer = 0; if (cur) store.set(KEY.draft, cur); }
function saveDraftSoon() { clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 250); }
function flushDraft() { if (draftTimer) saveDraft(); }
function clearDraft() { clearTimeout(draftTimer); draftTimer = 0; cur = null; store.remove(KEY.draft); }
window.addEventListener('pagehide', flushDraft);
document.addEventListener('visibilitychange', () => { if (document.hidden) flushDraft(); });

// an unfinished session that is being left for something else is kept in Review as unfinished
function stashDraft() {
  if (cur && E.isMeaningful(cur) && cur.status !== 'complete') saveSessions(E.upsertSession(sessions(), cur));
  clearDraft();
}

// ===================== tiny DOM helper =====================
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}
const chip = ({ label, pressed, onclick, cls = '' }) =>
  h('button', { type: 'button', class: 'chip ' + cls, 'aria-pressed': String(!!pressed), onclick }, E.smart(label));
const link = (text, onclick, cls = '') => h('button', { type: 'button', class: 'link ' + cls, text: E.smart(text), onclick });
const btn = (text, onclick, cls = '') => h('button', { type: 'button', class: 'btn ' + cls, text: E.smart(text), onclick });
const tx = E.smart;
const gearIcon = () => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('width', '22'); s.setAttribute('height', '22'); s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('aria-hidden', 'true'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.6'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
  s.innerHTML = '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>';
  return s;
};
const setKids = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter(k => k != null && k !== false));
const announce = text => { $announce.textContent = ''; setTimeout(() => { $announce.textContent = text; }, 50); };
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);
// "988" in the safety line becomes a tap-to-call link; the words themselves are unchanged
function withTel(text) {
  const parts = text.split('988');
  return parts.flatMap((p, i) => i === 0 ? [p] : [h('a', { class: 'tel', href: 'tel:988', text: '988' }), p]);
}
const fmtDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const showDate = iso => { const d = new Date(iso); return isNaN(d) ? String(iso) : fmtDate.format(d); };

// rich text: Scripture references become tap targets (a popover with a link to the passage),
// *em* and **bold** become emphasis. Everything shown from content.json goes through here.
function rich(text) {
  return E.parseRich(String(text)).map(n =>
    n.t === 'text' ? n.v : n.t === 'em' ? h('em', { text: n.v }) : n.t === 'b' ? h('strong', { text: n.v })
      : h('button', { type: 'button', class: 'ref-btn', onclick: ev => openPassage(n.v, ev.currentTarget) }, n.v));
}
const para = (text, cls = '') => h('p', { class: cls }, rich(text));
// body blocks: a string is a paragraph, { list } bullets, { q } a quoted question
function blocks(items) {
  return items.map(b => typeof b === 'string' ? para(b)
    : b.list ? h('ul', {}, b.list.map(li => h('li', {}, rich(li))))
    : h('p', { class: 'q' }, rich(b.q)));
}

// ===================== router (hash routes so GitHub Pages serves one file) =====================
let current = null, teardown = null, programmatic = false;
const parseRoute = () => location.hash.replace(/^#\/?/, '');
function go(route) {
  programmatic = true;
  if (parseRoute() === route) { render(route); programmatic = false; }
  else location.hash = '#/' + route;
}
window.addEventListener('hashchange', () => { programmatic = false; render(parseRoute()); });

// a session in progress is needed for these; a force-close reopens on the start screen, never mid-step
const NEEDS_SESSION = ['run', 'stop'];
let lastDone = null, lastRest = null, careResume = null;
function render(requested) {
  flushDraft();
  closePassage(); closeSheet();
  if (teardown) { teardown(); teardown = null; }
  const [base0, ...args] = String(requested || '').split('/');
  let base = base0 === '' ? 'start' : base0;
  if (!(base in VIEWS)) base = 'start';
  if (NEEDS_SESSION.includes(base) && !cur) base = 'start';
  if (base === 'done' && !lastDone) base = 'start';
  if (base === 'rest' && !lastRest) base = 'start';
  if (cur && base === 'run' && !E.pathVisible(C, cur.path, settings)) base = 'start';
  if (base === 'run' && fromStep) { restoreScroll = fromStep.scroll; fromStep = null; }
  else if (base !== 'why') fromStep = null;
  const route = [base, ...(base === requested.split('/')[0] ? args : [])].join('/');
  if (route !== requested) history.replaceState(null, '', '#/' + route);
  current = route;
  if (updateReady && E.isResting(route)) applyUpdate();
  $app.replaceChildren(VIEWS[base](args));
  window.scrollTo(0, base === 'run' && restoreScroll != null ? restoreScroll : 0);
  if (base === 'run') restoreScroll = null;
  const head = $app.querySelector('h1, h2');
  if (head) { head.tabIndex = -1; head.focus({ preventScroll: true }); }
  const anchor = $app.querySelector('[data-anchor]');
  if (anchor) anchor.scrollIntoView({ block: 'start' });
}

// bottom navigation, on resting screens only (never during a session, so nothing is pinned near the keyboard)
function tabs(active) {
  const T = C.copy.tabs;
  return h('nav', { class: 'tabs', 'aria-label': C.copy.wordmark }, [
    ['start', T.practice], ['way', T.way], ['review', T.review], ['more', T.more],
  ].map(([id, label]) => h('button', { type: 'button', class: 'tab', 'aria-current': id === active ? 'page' : null, onclick: () => go(id), text: tx(label) })));
}
// the toggle between the two support frames; it opens on What's in the way?
function toggle(active) {
  return h('div', { class: 'seg', role: 'group', 'aria-label': C.copy.tabs.way },
    h('button', { type: 'button', 'aria-pressed': String(active === 'way'), onclick: () => go('way'), text: tx(C.objections.title) }),
    h('button', { type: 'button', 'aria-pressed': String(active === 'why'), onclick: () => go('why'), text: tx(C.why.short) }));
}

// ===================== sheets and in-app dialogs (never window.confirm or alert) =====================
let sheet = null;
function openSheet(content, { dialog = false, label = '' } = {}) {
  closeSheet();
  const opener = document.activeElement;
  const close = () => closeSheet();
  const sh = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': label },
    dialog ? null : h('div', { class: 'sheet-grip', 'aria-hidden': 'true' }),
    dialog ? null : h('div', { class: 'sheet-head' }, h('button', { type: 'button', class: 'icon-btn', 'aria-label': C.copy.passage.close, onclick: close, text: '×', style: 'font-size:1.6rem' })),
    content);
  const scrim = h('div', { class: 'scrim' + (dialog ? ' dialog' : ''), onclick: ev => { if (ev.target === scrim) close(); } }, sh);
  const onKey = ev => { if (ev.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  document.body.style.overflow = 'hidden';
  document.body.append(scrim);
  sheet = { scrim, onKey, opener };
  const first = sh.querySelector('h2, h3, p');
  if (first) { first.tabIndex = -1; first.focus({ preventScroll: true }); }
  return sh;
}
function closeSheet() {
  if (!sheet) return;
  const { scrim, onKey, opener } = sheet;
  sheet = null;
  document.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
  scrim.remove();
  if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
}
// resolves true / false; two plain buttons, as in the rest of the app
function confirmDialog({ title, body, yes, no }) {
  return new Promise(resolve => {
    const done = v => { closeSheet(); resolve(v); };
    openSheet(h('div', {}, title && h('h2', { text: tx(title), style: 'margin-bottom:8px' }), h('p', { text: tx(body) }),
      h('div', { class: 'stack', style: 'margin-top:16px' }, btn(yes, () => done(true)), btn(no, () => done(false), 'quiet'))), { dialog: true, label: title || body });
    // a tap outside or Escape means "no"
    const scrim = sheet.scrim;
    scrim.addEventListener('click', ev => { if (ev.target === scrim) resolve(false); });
    document.addEventListener('keydown', function esc(ev) { if (ev.key === 'Escape') { document.removeEventListener('keydown', esc); resolve(false); } });
  });
}
function messageDialog(body) {
  openSheet(h('div', {}, h('p', { text: tx(body) }), h('div', { style: 'margin-top:16px' }, btn(C.copy.passage.close, () => closeSheet()))), { dialog: true, label: body });
}

// ===================== the passage popover =====================
// A small panel beside the tapped reference with the passage text (Berean Standard Bible, public domain),
// read from verses.json and cached for offline use. Nothing here leaves the app.
let versesLoad = null;
const loadVerses = () => !C.meta.versesFile ? Promise.resolve({})
  : (versesLoad || (versesLoad = fetch('verses.json').then(r => r.ok ? r.json() : {}).catch(() => { versesLoad = null; return {}; })));
let pop = null;
function placePop() {
  if (!pop) return;
  const { el, anchor } = pop;
  const r = anchor.getBoundingClientRect();
  const M = 12, vw = document.documentElement.clientWidth, vh = window.innerHeight;
  const w = Math.min(320, vw - 2 * M);
  const left = Math.max(M, Math.min(vw - M - w, (r.left + r.right) / 2 - w / 2));
  const roomBelow = vh - r.bottom - M - 10, roomAbove = r.top - M - 10;
  const below = roomBelow >= Math.min(el.firstChild.scrollHeight, 200) || roomBelow >= roomAbove;
  el.style.width = w + 'px';
  el.style.left = left + 'px';
  el.style.maxHeight = Math.max(120, below ? roomBelow : roomAbove) + 'px';
  el.style.top = below ? (r.bottom + 10) + 'px' : 'auto';
  el.style.bottom = below ? 'auto' : (vh - r.top + 10) + 'px';
  el.classList.toggle('above', !below);
  el.style.setProperty('--caret', Math.max(16, Math.min(w - 16, (r.left + r.right) / 2 - left)) + 'px');
  if (r.bottom < 0 || r.top > vh) closePassage();
}
function openPassage(ref, anchor) {
  const same = pop && pop.ref === ref && pop.anchor === anchor;
  closePassage();
  if (same) return;
  const P = C.copy.passage;
  const body = h('div', { class: 'passage' });
  const el = h('div', { class: 'popover', role: 'dialog', 'aria-label': ref },
    h('div', { class: 'pop-scroll' },
      h('div', { class: 'pop-head' },
        h('strong', { text: ref }),
        h('button', { type: 'button', class: 'pop-close', 'aria-label': P.close, text: '×', onclick: () => closePassage() })),
      body));
  loadVerses().then(verses => {
    const v = verses[E.verseKey(ref)];
    if (!v || pop?.el !== el) return;
    body.append(...v.map(([n, text]) => h('p', { class: 'passage-verse' }, v.length > 1 && h('sup', { text: n }), v.length > 1 && ' ', text)));
    el.firstChild.append(h('p', { class: 'esv-notice', text: P.notice }));
    placePop();
  });
  const onDown = ev => { if (!el.contains(ev.target) && !anchor.contains(ev.target)) closePassage(); };
  const onKey = ev => { if (ev.key === 'Escape') closePassage(); };
  const onMove = () => placePop();
  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('keydown', onKey);
  window.addEventListener('scroll', onMove, { passive: true });
  window.addEventListener('resize', onMove);
  pop = { el, ref, anchor, off: () => {
    document.removeEventListener('pointerdown', onDown, true);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('scroll', onMove);
    window.removeEventListener('resize', onMove);
  } };
  document.body.append(el);
  placePop();
}
function closePassage() {
  if (!pop) return;
  const { el, off } = pop;
  pop = null; off(); el.remove();
}

// Leaving a practice step to read something (See how He speaks, or a link in a card): Back returns
// to exactly that step. The session is already saved, so the step and its draft come back as they were,
// and the scroll position is restored. Tapping any tab instead simply leaves.
let fromStep = null, restoreScroll = null;
function goFromStep(route) {
  flushDraft();
  fromStep = { scroll: window.scrollY };
  closeSheet(); go(route);
}

// ===================== What's in the way? cards =====================
const findCard = id => E.allCards(C).concat(C.common.cards).find(c => c.id === id);
// one card: the objection, a plain answer, verses, where to read more, and the same low-stakes offer.
// In a sheet (the Not sure? chip) nothing leaves the step unless a link is tapped, and Try it just closes it.
function cardBody(card, { inSheet = false } = {}) {
  const K = C.objections.cardLabels;
  const goTo = to => { if (inSheet) goFromStep(to); else { closeSheet(); go(to); } };
  return h('div', {},
    h('h2', { class: 'card-q', text: tx('"' + card.q + '"') }),
    h('div', { class: 'prose' }, para(card.a)),
    card.refs && h('p', { class: 'card-refs' }, rich(card.refs)),
    h('div', { class: 'card-extra' },
      (card.see || []).map(s => link(K.see + ': ' + s.label, () => goTo(s.to), 'small'))),
    h('div', { class: 'offer' },
      card.try && h('p', { class: 'try-line' }, K.try + ': ', rich(card.try.text)),
      h('p', { class: 'ask', text: K.offer }),
      btn(K.tryIt, () => {
        if (inSheet) { if (card.try && card.try.to === 'nothing') { openNothing(); return; } closeSheet(); return; }
        if (card.try && card.try.to === 'nothing') return go('nothing');
        begin('quick');
      })),
    null);
}
function openNotSure(id) {
  const card = E.sheetCard(C, id);
  openSheet(cardBody(card, { inSheet: true }), { label: card.q });
}
// "Nothing came?": a page and a sheet share this. Silence is allowed, and the way out is never an error.
function nothingBody({ inSheet = false, onNothing = null } = {}) {
  const N = C.nothing;
  let shown = 1;
  const list = h('ol', { class: 'prose', style: 'padding-left:20px' });
  const more = btn(N.next, () => { shown++; paint(); }, 'quiet');
  const paint = () => {
    list.replaceChildren(...N.items.slice(0, shown).map((t, i) => h('li', {}, rich(t),
      i === 3 && [' ', link(N.speaksLink, () => { if (inSheet) goFromStep('why/speaks'); else go('why/speaks'); }, 'small')])));
    more.hidden = shown >= N.items.length;
  };
  paint();
  return h('div', {},
    h('h2', { text: tx(N.title) }),
    h('p', { class: 'prose', style: 'margin-top:10px' }, rich(N.lead + ' (' + N.leadRefs + ')')),
    h('p', { class: 'dim', style: 'margin-top:8px' }, tx('"' + N.lewis + '"'), ' ', h('span', { class: 'fine', style: 'margin:0' }, rich(N.lewisSource))),
    h('p', { class: 'prose', style: 'margin-top:14px' }, tx(N.intro)),
    list,
    h('div', { class: 'stack', style: 'margin-top:14px' }, more,
      onNothing && btn(N.markNothing, onNothing, 'quiet'),
      inSheet && link(N.close, () => closeSheet(), 'small')));
}
function openNothing(onNothing) { openSheet(nothingBody({ inSheet: true, onNothing }), { label: C.nothing.title }); }

// ===================== views =====================
const VIEWS = {};

// ---------- /start ----------
VIEWS.start = () => {
  const S = C.copy.start, sess = sessions();
  const last = E.sortNewest(sess.filter(s => s.status === 'complete'))[0];
  const resumable = E.resumableOf(sess, cur);
  const others = E.visiblePaths(C, settings).filter(id => id !== 'quick');
  return h('section', { class: 'view' },
    h('div', { class: 'topbar' },
      h('h1', { class: 'wordmark', text: C.copy.wordmark }),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': C.copy.settings.title, onclick: () => go('settings') }, gearIcon())),
    h('p', { class: 'name-line' }, rich(S.nameLine)),
    h('p', { class: 'home-line', text: tx(S.line) }),
    h('button', { type: 'button', class: 'path primary', onclick: () => begin('quick') },
      h('span', { class: 'path-title', text: S.begin }),
      h('span', { class: 'path-body', text: tx(S.beginLine) })),
    h('div', { class: 'foot-links' }, resumable && link(S.continue, () => resumeSession(resumable)), link(C.copy.outline.link, () => go('outline/quick'), 'small outline-link')),
    h('div', { class: 'paths' }, others.map(id => {
      const p = C.paths[id];
      return h('div', { class: 'path-wrap' },
        h('button', { type: 'button', class: 'path', onclick: () => begin(id) },
          h('span', { class: 'path-title', text: p.title }),
          h('span', { class: 'path-body', text: tx(p.line) }),
          h('span', { class: 'path-credit', text: tx(p.credit) })),
        link(C.copy.outline.link, () => go('outline/' + id), 'small outline-link'));
    })),
    h('div', { class: 'foot-links' }, link(S.connectedOnly, () => go('connected/alone'), 'small')),
    last && h('div', { class: 'last-session' },
      h('div', { class: 'when', text: S.last + ' · ' + showDate(last.started) }),
      h('div', { class: 'what', text: E.titleOf(C, last) }),
      last.keep && h('div', { class: 'keep', text: last.keep }),
      link(C.copy.tabs.review, () => go('review/' + last.id), 'small')),
    h('div', { class: 'spacer' }),
    h('div', { class: 'foot-links' },
      link(S.why, () => go('why'), 'small'), link(S.way, () => go('way'), 'small')),
    tabs('start'));
};

// ---------- starting and resuming ----------
// Begin → Connected (the breath) → the first step. Daily is short and goes straight in.
function begin(pathId) {
  stashDraft();
  cur = E.startSession(C, E.newSession(pathId));
  saveDraft();
  go(pathId === 'daily' ? 'run' : 'connected/' + pathId);
}
// start a path past the breath (Back to the glad place, the Healing ready check)
function startAt(pathId, key, connected) {
  stashDraft();
  cur = E.startSession(C, E.newSession(pathId, { connected }), key);
  saveDraft();
  go(connected || pathId === 'daily' ? 'run' : 'connected/' + pathId);
}
function resumeSession(s) {
  if (cur && cur.id !== s.id) stashDraft();
  cur = JSON.parse(JSON.stringify(s));
  E.resumeSession(C, cur);
  saveDraft();
  go('run');
}

// ===================== connected: the breath =====================
// Copied from I Am Here's breathView and adapted: one orienting line from Scripture, a short breath
// on the bloom, the Murray caption, and one button. Leaving is always allowed.
VIEWS.connected = ([next]) => {
  const K = C.connected, B = E.BREATH;
  const alone = next === 'alone';
  if (!alone && (!cur || cur.path !== next)) { if (!(next in C.paths) || !E.pathVisible(C, next, settings)) { go('start'); return h('div'); } begin(next); return h('div'); }
  const idx = E.pickVerse(K.verses.length, seen().connectedIdx);
  setSeen({ connectedIdx: idx });
  const verse = K.verses[idx];
  const total = K.breaths, cycle = B.inhaleMs + B.exhaleMs;
  const ease = x => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));
  const petals = Array.from({ length: 8 }, (_, i) => h('div', { class: 'petal', style: `--i:${i}` }));
  const bloom = h('div', { class: 'bloom' }, petals);
  const bar = h('div', { class: 'breath-bar', 'aria-hidden': 'true' });
  const dots = Array.from({ length: total }, () => h('span'));
  const progress = h('div', { class: 'breath-dots', role: 'progressbar', 'aria-label': C.copy.connected.progress,
    'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': '0' }, dots);
  const leave = () => { stop(); if (alone) go('start'); else { go('start'); } };
  let startT = null, pausedAt = null, pausedTotal = 0, raf = 0, lastBreath = -1, stopped = false;
  const now = () => performance.now();
  const elapsed = () => (pausedAt ?? now()) - startT - pausedTotal;
  function frame() {
    if (stopped) return;
    const t = elapsed(), n = Math.floor(t / cycle);
    if (n >= total) { dots.forEach(d => { d.className = 'done'; }); progress.setAttribute('aria-valuenow', String(total)); bloom.style.setProperty('--p', '0.35'); tone.stop(); return; }
    if (n !== lastBreath) { lastBreath = n; dots.forEach((d, i) => { d.className = i < n ? 'done' : i === n ? 'now' : ''; }); progress.setAttribute('aria-valuenow', String(n)); }
    const ph = t - n * cycle, inhaling = ph < B.inhaleMs;
    const p = inhaling ? ease(ph / B.inhaleMs) : 1 - ease((ph - B.inhaleMs) / B.exhaleMs);
    bloom.style.setProperty('--p', p.toFixed(4));
    bar.style.opacity = (0.22 + 0.6 * p).toFixed(3);
    dots[n].style.setProperty('--f', (ph / cycle).toFixed(3));
    tone.set(p);
    raf = requestAnimationFrame(frame);
  }
  function onVis() {
    if (startT == null || stopped) return;
    if (document.hidden) { if (pausedAt == null) pausedAt = now(); cancelAnimationFrame(raf); tone.pause(); }
    else if (pausedAt != null) { pausedTotal += now() - pausedAt; pausedAt = null; tone.resume(); raf = requestAnimationFrame(frame); }
  }
  function stop() { stopped = true; cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); tone.stop(); }
  document.addEventListener('visibilitychange', onVis);
  teardown = stop;
  tone.prime();
  startT = now(); pausedAt = document.hidden ? now() : null; tone.start();
  if (!document.hidden) raf = requestAnimationFrame(frame);
  $announce.textContent = '';
  const cont = btn(alone ? C.copy.connected.alone : C.copy.connected.cont, () => {
    stop();
    if (alone) return go('start');
    cur.connected = true; saveDraft(); go('run');
  });
  return h('section', { class: 'view breathe' },
    h('div', { class: 'breathe-top' }, link(C.copy.back, leave, 'back')),
    h('div', { class: 'breathe-body' },
      h('p', { class: 'orient', text: tx(verse.text) }),
      h('p', { class: 'orient-ref' }, rich(verse.ref)),
      h('div', { class: 'bloom-wrap', 'aria-hidden': 'true' }, bloom), bar,
      h('p', { class: 'caption' }, tx(K.caption), h('br'), h('span', { class: 'src' }, rich(K.captionSource)))),
    h('div', { class: 'breathe-foot' }, progress, cont));
};

// optional breath sound (off by default): soft filtered noise that swells with the inhale
const tone = (() => {
  let ctx = null, src = null, gain = null, filt = null, buf = null;
  function prime() {
    if (!settings.tone) return;
    try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch { ctx = null; }
  }
  function start() {
    if (!settings.tone || !ctx || src) return;
    if (!buf) {
      buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = buf.getChannelData(0); let last = 0;
      for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    }
    src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 320;
    gain = ctx.createGain(); gain.gain.value = 0;
    src.connect(filt).connect(gain).connect(ctx.destination);
    src.start();
  }
  function set(p) {
    if (!gain) return;
    const t = ctx.currentTime;
    gain.gain.setTargetAtTime(0.012 + 0.1 * p, t, 0.08);
    filt.frequency.setTargetAtTime(300 + 650 * p, t, 0.08);
  }
  function stop() {
    if (!src) return;
    const s = src, g = gain;
    g.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    setTimeout(() => { try { s.stop(); } catch {} }, 600);
    src = gain = filt = null;
  }
  return { prime, start, set, stop, pause: () => ctx && ctx.suspend(), resume: () => ctx && ctx.resume() };
})();

// ===================== the step runner =====================
const guideOn = () => E.guidanceOn(settings.guidance, E.completedCount(sessions()));
// something shown in full while guidance is on, and behind a small "?" once it fades
function hint(node, on) {
  if (on) return node;
  const box = h('div', { hidden: true }, node);
  const b = h('button', { type: 'button', class: 'coach-toggle', 'aria-expanded': 'false', 'aria-label': C.copy.run.hint, text: '?',
    onclick: () => { box.hidden = !box.hidden; b.setAttribute('aria-expanded', String(!box.hidden)); } });
  return h('div', { class: 'coach-wrap' }, b, box);
}
const pill = (text, onclick) => h('button', { type: 'button', class: 'chip small', onclick, text: tx(text) });
const careBlock = () => h('div', { class: 'care', role: 'note' }, h('strong', {}, withTel(C.safety.line)), C.safety.careLines.map(l => h('p', { text: tx(l) })));

// optional dictation, only where the browser has speech recognition
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let stopMic = null;
function micButton(ta, onText) {
  if (!SR) return null;
  let rec = null, on = false;
  const b = h('button', { type: 'button', class: 'mic', 'aria-pressed': 'false', text: C.copy.mic.start, onclick: toggleMic });
  const off = () => { on = false; b.setAttribute('aria-pressed', 'false'); b.textContent = C.copy.mic.start; if (stopMic === halt) stopMic = null; };
  const halt = () => { try { rec && rec.stop(); } catch {} off(); };
  function toggleMic() {
    if (on) return halt();
    try {
      rec = new SR(); rec.continuous = true; rec.interimResults = false; rec.lang = navigator.language || 'en-US';
      rec.onresult = ev => {
        let t = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) t += ev.results[i][0].transcript;
        if (t.trim()) { ta.value = (ta.value.trim() ? ta.value.trimEnd() + ' ' : '') + t.trim(); onText(); }
      };
      rec.onend = off; rec.onerror = off;
      if (stopMic) stopMic();
      rec.start(); on = true; stopMic = halt;
      b.setAttribute('aria-pressed', 'true'); b.textContent = C.copy.mic.stop;
    } catch { off(); }
  }
  return b;
}

// a writing box near the top of the screen: autosaves, offers the mic and sentence starters,
// and shows the 988 line quietly if what is written looks worrisome
let boxId = 0;
function answerBox({ get, set, label, short = false, starters = null, on = true, onChange = null }) {
  const id = 'box' + (++boxId);
  const ta = h('textarea', { class: 'box' + (short ? ' short' : ''), id, rows: short ? 3 : 5, autocomplete: 'off', autocapitalize: 'sentences', spellcheck: 'true' });
  ta.value = get();
  let dictated = false;
  const care = careBlock(); care.hidden = !E.isWorrisomeText(ta.value, C.safety.keywords);
  const change = () => {
    set(ta.value, dictated ? 'dictated' : 'typed'); saveDraftSoon();
    care.hidden = !E.isWorrisomeText(ta.value, C.safety.keywords);
    if (onChange) onChange(ta.value);
  };
  ta.addEventListener('input', change);
  const mic = micButton(ta, () => { dictated = true; change(); });
  const addStarter = t => { ta.value = (ta.value && !/\s$/.test(ta.value) ? ta.value + ' ' : ta.value) + t + ' '; change(); ta.focus(); };
  let starterRow = null;
  if (starters && starters.length) {
    starterRow = h('div', { class: 'starters' }, starters.map(t => pill(t, () => addStarter(t))));
    if (!on) {
      starterRow.hidden = true;
      const tg = link(C.copy.run.starters, () => { starterRow.hidden = !starterRow.hidden; }, 'small');
      starterRow = h('div', {}, tg, starterRow);
    }
  }
  return { ta, el: h('div', {}, label && h('label', { class: 'field-label', for: id, text: tx(label) }), ta, (mic || starterRow) && h('div', { class: 'box-tools' }, mic, h('span')), starterRow, care), setValue: v => { ta.value = v; } };
}
const entryText = (s, key) => (E.entryFor(s, key) || {}).answer || '';

// ----- moving through the steps -----
function next(choice) {
  flushDraft();
  const bad = E.worrisomeText(cur, C.safety.keywords);
  if (bad && bad !== cur.careSeen) { careResume = { choice }; go('stop'); return; }
  const to = E.advance(C, cur, choice);
  if (to == null) return choice === 'rest' ? restSession() : finishSession();
  saveDraft(); go('run');
  announce(C.copy.run.stepNow);
}
function finishSession() {
  E.complete(cur);
  saveSessions(E.upsertSession(sessions(), cur));
  lastDone = cur; clearDraft();
  go('done');
}
function restSession() {
  if (cur.status !== 'complete') { E.rest(cur); saveSessions(E.upsertSession(sessions(), cur)); }
  lastRest = cur; clearDraft();
  go('rest');
}
// Back to the glad place: Deeper returns to its appreciation step; any other path keeps its work
// and starts the glad place on its own (Deeper from the start of the memory, or the appreciation once found)
function gladPlace() {
  if (cur.path === 'deeper') { E.jump(cur, C.paths.deeper.gladPlaceKey); saveDraft(); return render('run'); }
  if (cur.path === 'healing') { E.rest(cur); saveSessions(E.upsertSession(sessions(), cur)); clearDraft(); }
  else stashDraft();
  startAt('deeper', seen().gladPlace ? C.paths.deeper.gladPlaceKey : null, true);
}

// An optional look at what came, folded away on the last step. Nothing is required, nothing is scored.
function optionalLook(s) {
  const T = C.test;
  const advice = h('div', { 'aria-live': 'polite' });
  const paint = () => {
    const a = E.testAdvice(s.test);
    const rep = E.repeatedUnsure(sessions(), s);
    advice.replaceChildren(...(a || rep ? [h('div', { class: 'advice' },
      a === 'no' && h('p', { text: tx(T.no) }), a === 'unsure' && h('p', { text: tx(T.unsure) }), rep && h('p', { text: tx(T.repeated), style: a ? 'margin-top:8px' : '' }),
      a === 'no' && h('div', { class: 'stack', style: 'margin-top:10px' }, btn(T.gladPlace, gladPlace, 'quiet'), btn(T.takeBreak, restSession, 'quiet')))] : []));
  };
  const rows = T.questions.map((q, i) => {
    const row = h('div', { class: 'opt-row' });
    const draw = () => row.replaceChildren(...T.options.map(o => chip({ label: o.label, pressed: s.test[q.id] === o.id, onclick: () => { E.setTest(s, q.id, o.id); saveDraft(); draw(); paint(); } })));
    draw();
    return h('div', { class: 'q-block' + (i === 3 ? ' sep-top' : ''), style: i === 3 ? 'border-top:1px solid var(--line);padding-top:12px' : '' },
      h('div', { class: 'qn', text: tx(q.name) }), h('div', { class: 'qt dim', text: tx(q.text) }), row);
  });
  paint();
  const opened = Object.values(s.test).some(v => v && v !== '');
  return h('details', { class: 'optional-look', open: opened },
    h('summary', { text: tx(C.keep.testOptional) }),
    h('p', { class: 'coach', text: tx(T.lead) }), rows, advice);
}

const STEP = {
  // a plain box: bring, glad memory, see it, give Him the hurt, forgive, gratitude
  bring({ s, def, on, key }) {
    const box = answerBox({ get: () => entryText(s, key), set: (t, via) => E.setAnswer(s, key, def.title, t, via), label: def.label, short: !!def.optional && false, on });
    const P = C.paths[s.path];
    return { body: [
      def.prompts && h('ul', { class: 'prompts' }, def.prompts.map(p => h('li', { text: tx(p) }))),
      def.heavy && P.heavyNote && h('p', { class: 'coach', text: tx(P.heavyNote) }),
      box.el] };
  },
  // invite, then Reach, then listen, then the box and the quiet row about how it came
  ask({ s, def, on, key, prompt, coach }) {
    const E_ = () => E.ensureEntry(s, key, prompt);
    const post = h('div', { class: 'after-answer' });
    const how = h('div', { class: 'how-row' });
    const howChips = h('div', { class: 'chips' });
    const paintHow = () => {
      const e = E.entryFor(s, key) || { how: [] };
      howChips.replaceChildren(...C.how.ways.map(w => chip({ label: w.label, cls: 'small', pressed: e.how.includes(w.id), onclick: () => { E.toggleHow(E_(), w.id); saveDraft(); paintHow(); } })));
      const first = (C.how.ways.find(w => e.how.includes(w.id) && w.speaks) || {}).speaks;
      howLink.onclick = () => goFromStep('why/speaks' + (first ? '/' + first : ''));
    };
    const howLink = link(C.expectation.seeLink, null, 'small how-link');
    // only one See how He speaks link on the step at a time: this one until there is an answer, then the one under it
    const seeExpect = link(C.expectation.seeLink, () => goFromStep('why/speaks'), 'small');
    const note = hint(h('p', { text: tx(C.afterAnswer.line) }), on);
    // the note and the "How did it come?" row appear once per session, on the first step that gets an answer,
    // so a later question (like "what do You want me to do?") never repeats them
    const refresh = text => {
      const has = text.trim() || (E.entryFor(s, key) || { how: [] }).how.length;
      if (has && !s.howKey) { s.howKey = key; saveDraftSoon(); }
      const show = has && s.howKey === key;
      post.hidden = !show; seeExpect.hidden = !!has; if (show) paintHow();
    };
    const box = answerBox({ get: () => entryText(s, key), set: (t, via) => E.setAnswer(s, key, prompt, t, via), label: def.label, starters: def.starters || C.starters, on, onChange: refresh });
    const howBody = h('div', {}, h('div', { class: 'lbl', text: tx(C.how.title) }), howChips, howLink);
    let howShown = on;
    const howToggle = link(C.how.title, () => { howShown = !howShown; howWrap.hidden = !howShown; }, 'small');
    const howWrap = h('div', { hidden: !on }, howBody);
    post.append(note, ...(on ? [howWrap] : [howToggle, howWrap]));
    refresh(entryText(s, key));
    const nothingBlock = def.nothing && h('div', { class: 'after-answer' }, h('p', { text: tx(def.nothing.line) }),
      h('div', { class: 'row-actions' },
        link(def.nothing.again, () => { pauseBtn.classList.remove('pulse'); void pauseBtn.offsetWidth; pauseBtn.classList.add('pulse'); }, 'small'),
        link(def.nothing.other, () => go('start'), 'small')));
    const pauseBtn = def.pause ? h('p', { class: 'pause', text: def.pause }) : null;
    const nothingBtn = () => openNothing(() => { E.markNothing(s, key, prompt); saveDraft(); paintHow(); refresh(box.ta.value); post.hidden = false; closeSheet(); });
    return { body: [
      def.expect && hint(h('div', { class: 'expect' }, para(C.expectation.line), para('"' + C.expectation.refText + '." ' + C.expectation.ref),
        h('div', { class: 'links' }, seeExpect)), on),
      pauseBtn, box.el, post, nothingBlock],
      nothing: nothingBtn };
  },
  more({ def }) {
    return { body: [], foot: [btn(def.yes, () => next('yes')), btn(def.no, () => next('no'), 'quiet')], noCont: true };
  },
  followup({ s, def, on }) {
    const fu = s.followUps[s.followUps.length - 1] || (s.followUps.push({ prompt: '', answer: '' }), s.followUps[0]);
    const box = answerBox({ get: () => fu.answer, set: t => { fu.answer = t; if (!fu.prompt) fu.prompt = def.title; }, label: def.label, starters: C.starters, on });
    const row = h('div', { class: 'starters' }, def.prompts.map(p => pill(p, () => { fu.prompt = p; saveDraft(); row.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c.textContent === tx(p)))); })));
    return { body: [row, h('p', { class: 'pause', text: def.pause }), box.el], nothing: () => openNothing() };
  },
  appreciate({ s, def, on, key }) {
    const box = answerBox({ get: () => entryText(s, key), set: (t, via) => E.setAnswer(s, key, def.title, t, via), on });
    const hold = h('p', { class: 'coach', hidden: true, text: tx(def.coach) });
    return { body: [box.el, hold], noCont: true, foot: [btn(def.yes, () => { setSeen({ gladPlace: true }); next(); }), btn(def.notYet, () => { hold.hidden = false; }, 'quiet')] };
  },
  keep({ s, def, on }) {
    const K = C.keep;
    const box = answerBox({ get: () => s.keep, set: t => { s.keep = t; }, short: true, on });
    const nextBox = answerBox({ get: () => s.nextStep, set: t => { s.nextStep = t; }, label: K.nextLabel, short: true, on });
    return { body: [box.el, hint(h('div', {}, K.notes.map(n => h('p', { class: 'after-answer', text: tx(n) }))), on), nextBox.el, optionalLook(s)], title: K.title, cont: K.cta };
  },
  // Healing: breath done? glad place found? Then on.
  ready({ s, def }) {
    const state = { breath: !!s.connected, glad: !!seen().gladPlace };
    let cont;
    const rows = h('div', { class: 'checks' });
    const paint = () => {
      rows.replaceChildren(...def.checks.map(c => h('div', { class: 'check-row' },
        h('span', { class: 'lab', text: tx(c.label) }),
        state[c.id] ? h('span', { class: 'dim', text: '✓' })
          : link(c.go, () => { if (c.id === 'breath') go('connected/healing'); else startAt('deeper', seen().gladPlace ? C.paths.deeper.gladPlaceKey : null, !!s.connected); }, 'small'),
        h('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(state[c.id]), 'aria-label': c.label,
          onclick: () => { state[c.id] = !state[c.id]; paint(); } }))));
      if (cont) cont.disabled = !(state.breath && state.glad);
    };
    paint();
    return { body: [def.lines.map(l => h('p', { class: 'coach', text: tx(l) })), rows], contFn: () => { s.connected = s.connected || state.breath; next(); }, contRef: c => { cont = c; paint(); } };
  },
  lietruth({ s, def, on }) {
    const e = () => E.ensureEntry(s, 'lietruth', def.truthTitle);
    const lie = answerBox({ get: () => (E.entryFor(s, 'lietruth') || {}).lie || '', set: t => { e().lie = t; }, label: def.lieTitle, short: true, on });
    const truth = answerBox({ get: () => entryText(s, 'lietruth'), set: (t, via) => E.setAnswer(s, 'lietruth', def.truthTitle, t, via), label: def.truthTitle, short: true, on });
    return { body: [lie.el, h('p', { class: 'pause', text: def.pause }), truth.el] };
  },
  scale({ s, def, on }) {
    let feel = null;
    const row = h('div', { class: 'opt-row' });
    let cont;
    const draw = () => { row.replaceChildren(...def.options.map(o => chip({ label: o.label, pressed: feel === o.id, onclick: () => { feel = o.id; draw(); } }))); if (cont) cont.disabled = !feel; };
    const note = answerBox({ get: () => '', set: () => {}, label: def.noteLabel, short: true, on: true });
    draw();
    return { body: [row, note.el], contFn: () => { E.pushRound(s, feel, note.ta.value); saveDraft(); next(feel); }, contRef: c => { cont = c; draw(); } };
  },
  again({ s, def }) {
    const heavy = s.memory && s.memory.feel === 'heavy';
    return { body: [h('p', { class: 'prose', text: tx(def.body) }), heavy && h('p', { class: 'coach', style: 'margin-top:10px', text: tx(def.heavy) }),
      h('div', { class: 'opts', style: 'margin-top:12px' }, def.options.map(o => btn(o.label, () => next(o.id), 'quiet')))],
      noCont: true, foot: [link(def.done, () => next('rest'), 'small')] };
  },
  moment({ s, def }) {
    let other = false, cont;
    const wrap = h('div', { class: 'opts' });
    const pick = o => { s.moment = { id: o.id, label: o.label, prompt: o.prompt, coach: o.coach || '' }; saveDraft(); draw(); };
    const draw = () => {
      setKids(wrap, h('div', { class: 'chips' }, def.options.map(o => chip({ label: o.label,
        pressed: o.prompt ? !!s.moment && s.moment.id === o.id : other, onclick: () => { if (o.prompt) { other = false; pick(o); } else { other = !other; draw(); } } }))),
        other && h('div', { class: 'chips', style: 'margin-top:4px' }, def.otherOptions.map(o => chip({ label: o.label, pressed: !!s.moment && s.moment.id === o.id, onclick: () => pick(o) }))));
      if (cont) cont.disabled = !(s.moment && s.moment.prompt);
    };
    draw();
    return { body: [wrap], contRef: c => { cont = c; draw(); } };
  },
};

VIEWS.run = () => {
  const s = cur, R = C.copy.run, P = C.paths[s.path];
  let def = E.stepDef(C, s.path, s.at);
  if (!def) { E.startSession(C, s); def = E.stepDef(C, s.path, s.at); }
  const on = guideOn(), key = s.at;
  let prompt = def.title, coachText = def.coach;
  if (key === 'dailyask') { prompt = (s.moment || {}).prompt || ''; coachText = (s.moment || {}).coach || def.coach; }
  const built = STEP[def.type]({ s, def, on, key, prompt, coach: coachText });
  const ctr = E.stepCounter(C, s);
  const idx = E.flowOf(C, s.path).indexOf(key);
  const showGlad = (s.path === 'deeper' && idx > 0 && key !== P.gladPlaceKey) || (s.path === 'healing' && idx >= E.flowOf(C, s.path).indexOf(P.gladPlaceFrom));
  const title = built.title || prompt;
  let cont = null;
  if (!built.noCont) {
    cont = btn(built.cont || R.cont, built.contFn || (() => next()));
    if (built.contRef) built.contRef(cont);
  }
  return h('section', { class: 'view' },
    h('div', { class: 'session-top' },
      link(R.back, () => { if (!E.back(s)) { flushDraft(); return go('start'); } saveDraft(); render('run'); }, 'back'),
      ctr ? h('span', { class: 'counter', text: fill(R.counter, ctr) }) : h('span'),
      s.path === 'healing' ? link(R.stopRest, restSession, 'small') : h('span')),
    s.path === 'journaling' && h('p', { class: 'coach', text: tx(P.framing) }),
    s.path === 'journaling' && key === 'gratitude' && h('p', { class: 'coach', text: tx(P.intro) }),
    h('h2', { class: 'step-title', text: tx(title) }),
    coachText && !built.noCoach && hint(para(coachText, 'coach'), on),
    def.remember && hint(h('p', { class: 'coach', text: tx(C.remember) }), on),
    built.body,
    h('div', { class: 'under-box' }, h('button', { type: 'button', class: 'chip small', onclick: () => openNotSure(def.notSure), text: R.notSure }),
      built.nothing && h('button', { type: 'button', class: 'chip small', onclick: built.nothing, text: R.nothingCame })),
    h('div', { class: 'session-foot' }, cont, built.foot, showGlad && btn(R.gladPlace, gladPlace, 'quiet')));
};

// ---------- /stop : after a worrisome input, the method stops and care comes first ----------
VIEWS.stop = () => {
  const K = C.copy.care, resume = careResume;
  return h('section', { class: 'view' },
    h('div', { class: 'spacer' }),
    careBlock(),
    h('div', { class: 'spacer' }),
    h('div', { class: 'stack' },
      btn(K.stop, restSession),
      btn(K.cont, () => { cur.careSeen = E.worrisomeText(cur, C.safety.keywords); saveDraft(); careResume = null; next(resume && resume.choice); }, 'quiet')));
};

// ---------- /outline/<path> : every step of a path on one page, to lead a group through ----------
VIEWS.outline = ([id]) => {
  const O = C.copy.outline;
  if (!E.pathVisible(C, id, settings)) { go('start'); return h('div'); }
  const P = C.paths[id], steps = E.outlineFor(C, id);
  return h('section', { class: 'view outline' },
    link(C.copy.back, () => go('start'), 'back'),
    h('h1', { text: P.title + ' · ' + tx(O.title) }),
    h('p', { class: 'dim', text: tx(P.credit) }),
    h('p', { class: 'prose', text: tx(P.line) }),
    h('p', { class: 'coach', text: tx(O.group) }),
    id !== 'daily' && h('p', { class: 'dim', text: tx(O.breath) }),
    h('ol', { class: 'outline-steps' }, steps.map(st => h('li', {},
      h('h3', { text: tx(st.title) }),
      st.coach && h('p', { class: 'dim', text: tx(st.coach) }),
      st.items.length > 0 && h('ul', { class: 'prompts' }, st.items.map(t => h('li', { text: tx(t) }))),
      st.pause && h('p', { class: 'pause', text: st.pause }),
      st.starters.length > 0 && h('p', { class: 'dim' }, O.starters + ': ' + st.starters.join('  ·  '))))),
    h('div', { class: 'stack no-print', style: 'margin-top:18px' }, btn(O.print, () => window.print(), 'quiet'), btn(O.start, () => begin(id))),
    h('div', { class: 'spacer' }), tabs('start'));
};

// ---------- /rest : stopped, saved as unfinished, free to return ----------
VIEWS.rest = () => {
  const K = C.paths.healing.rest;
  return h('section', { class: 'view' },
    h('div', { class: 'spacer' }),
    h('h2', { class: 'quiet-title', text: tx(K.title) }),
    h('div', { class: 'prose', style: 'margin-top:12px' }, K.lines.map(l => para(l))),
    h('div', { class: 'spacer' }),
    h('div', { class: 'stack' }, btn(K.glad, () => startAt('deeper', seen().gladPlace ? C.paths.deeper.gladPlaceKey : null, true)), btn(K.done, () => { lastRest = null; go('start'); }, 'quiet')));
};

// ---------- /done : saved; the reminder is offered once, no more ----------
VIEWS.done = () => {
  const D = C.copy.done, s = lastDone, sd = seen();
  const firstSave = !sd.firstSaveSeen;
  if (firstSave) setSeen({ firstSaveSeen: true });
  let offer = null;
  if (!sd.reminderOffered && E.completedCount(sessions()) === 1) {
    const hourFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric' });
    const sel = h('select', { class: 'select', 'aria-label': C.copy.settings.reminder },
      Array.from({ length: 18 }, (_, i) => i + 5).map(hr => h('option', { value: String(hr), text: hourFmt.format(new Date(2000, 0, 1, hr)) })));
    sel.value = String(settings.reminderHour ?? 8);
    offer = h('div', { class: 'note-card' }, h('p', { text: tx(D.reminder) }), h('div', { style: 'margin-top:8px' }, sel),
      btn(D.reminderAdd, () => { settings.reminderHour = +sel.value; saveSettings(); downloadReminder(settings.reminderHour); setSeen({ reminderOffered: true }); render('done'); }, 'quiet'),
      link(D.notNow, () => { setSeen({ reminderOffered: true }); render('done'); }, 'small'));
  }
  return h('section', { class: 'view done' },
    h('h2', { class: 'quiet-title', text: tx(D.title) }),
    h('p', { class: 'done-note', text: tx(C.keep.after) }),
    firstSave && h('p', { class: 'done-note', text: tx(C.firstSave) }),
    offer,
    standingCheck(),
    h('div', { class: 'stack', style: 'margin-top:20px' }, btn(D.review, () => go('review/' + s.id), 'quiet'), btn(D.done, () => { lastDone = null; go('start'); })));
};
function standingCheck() {
  const S = C.standing;
  return h('div', { class: 'standing' }, h('strong', { text: tx(S.title) }), h('ol', {}, S.lines.map(l => h('li', { text: tx(l) }))));
}

// ===================== What's in the way? =====================
const tryOffer = () => h('div', { class: 'offer' }, h('p', { class: 'ask', text: tx(C.why.offer) }), btn(C.why.tryIt, () => begin('quick')));
VIEWS.way = ([id]) => {
  const O = C.objections;
  if (id === 'close') return closeView();
  if (id) {
    const card = O.cards.find(c => c.id === id);
    if (!card) { go('way'); return h('div'); }
    return h('section', { class: 'view' }, link(C.copy.back, () => go('way'), 'back'), cardBody(card), h('div', { class: 'spacer' }), tabs('way'));
  }
  return h('section', { class: 'view' },
    toggle('way'),
    h('h1', { text: tx(O.title) }),
    h('p', { class: 'home-line', style: 'margin-bottom:14px', text: tx(O.intro) }),
    O.cards.map(c => h('button', { type: 'button', class: 'tile', onclick: () => go('way/' + c.id) }, h('span', { class: 't', text: tx('"' + c.q + '"') }))),
    h('div', { class: 'offer' }, h('p', { class: 'ask', text: tx(O.close.line) }),
      btn(O.close.tryButton, () => go('way/close'), 'quiet')),
    standingCheck(),
    h('div', { class: 'spacer' }),
    tabs('way'));
};
// the close: a blank box, written to God and not saved anywhere
function closeView() {
  const K = C.objections.close;
  const ta = h('textarea', { class: 'box', id: 'closebox', rows: 5, autocomplete: 'off' });
  return h('section', { class: 'view' },
    link(C.copy.back, () => go('way'), 'back'),
    h('h2', { class: 'step-title', text: tx(K.tryLabel) }),
    h('p', { class: 'coach', text: tx(K.line) }),
    ta,
    h('div', { class: 'stack', style: 'margin-top:16px' }, btn(K.done, () => go('way')), tryOffer()));
}
VIEWS.nothing = () => h('section', { class: 'view' }, link(C.copy.back, () => go('start'), 'back'), nothingBody(), h('div', { class: 'spacer' }), tabs('start'));

// ===================== Common questions and the Care page (More) =====================
VIEWS.common = ([id]) => {
  const K = C.common;
  if (id) {
    const card = K.cards.find(c => c.id === id);
    if (!card) { go('common'); return h('div'); }
    return h('section', { class: 'view' }, link(C.copy.back, () => go('common'), 'back'), cardBody(card), h('div', { class: 'spacer' }), tabs('more'));
  }
  return h('section', { class: 'view' },
    link(C.copy.back, () => go('more'), 'back'),
    h('h2', { text: tx(K.title), style: 'margin-bottom:8px' }),
    K.cards.map(c => h('button', { type: 'button', class: 'tile', onclick: () => go('common/' + c.id) }, h('span', { class: 't', text: tx('"' + c.q + '"') }))),
    h('div', { class: 'spacer' }), tabs('more'));
};
// ===================== Why practice hearing from God? =====================
const speaksTitle = id => (C.speaks.ways.find(w => w.id === id) || {}).title;
VIEWS.why = ([sub, arg]) => {
  const W = C.why;
  const sections = { case: caseView, reach: reachView, speaks: speaksView, witnesses: witnessesView, life: lifeView, scripture: scriptureView };
  if (sub in sections) return sections[sub](arg);
  return h('section', { class: 'view' },
    toggle('why'),
    h('h1', { text: tx(W.title) }),
    h('div', { class: 'prose', style: 'margin:10px 0 16px' }, h('p', { class: 'scripture', style: 'font-size:1.15rem' }, tx('"' + W.leadText + '"'), ' ', rich(W.leadRef)), h('p', { class: 'dim', text: tx(W.lead) })),
    W.doors.map(d => h('button', { type: 'button', class: 'tile', onclick: () => go(d.to) }, h('span', { class: 't', text: tx(d.title) }), h('span', { class: 'd', text: tx(d.line) }))),
    tryOffer(), h('div', { class: 'spacer' }), tabs('way'));
};
const whyFrame = (...kids) => h('section', { class: 'view' }, fromStep ? link(C.copy.backToStep, () => go('run'), 'back') : link(C.copy.back, () => go('why'), 'back'), kids, h('div', { class: 'spacer' }), tabs('way'));
function pager(base, n, total, { last = false } = {}) {
  const lastN = total + 1;
  return h('div', { class: 'pager' },
    n > 1 && btn(C.copy.why.prev, () => go(base + '/' + (n - 1)), 'quiet'),
    n <= total && btn(C.copy.why.next, () => go(base + '/' + (n + 1))));
}
function caseView(arg) {
  const K = C.case, total = K.steps.length, n = Math.max(1, Math.min(total + 1, parseInt(arg, 10) || 1));
  if (n > total) return whyFrame(h('h2', { text: tx(K.last.title) }), h('div', { class: 'prose', style: 'margin-top:10px' }, para(K.last.body)), tryOffer(), pager('why/case', n, total));
  const st = K.steps[n - 1];
  return whyFrame(h('p', { class: 'progress', text: fill(K.progress, { n, total }) }), h('h2', { text: tx(st.title) }),
    h('div', { class: 'prose', style: 'margin-top:12px' }, blocks(st.body)), pager('why/case', n, total));
}
function reachView(arg) {
  const K = C.reach, total = K.screens.length, n = Math.max(1, Math.min(total + 1, parseInt(arg, 10) || 1));
  if (n > total) return whyFrame(h('h2', { text: tx(K.title) }),
    h('div', { class: 'prose' }, h('h3', { text: tx(K.claimsTitle), style: 'margin:12px 0 6px' }), h('ul', {}, K.claims.map(c => h('li', {}, rich(c)))),
      h('h3', { text: tx(K.witnessesTitle), style: 'margin:16px 0 6px' })),
    K.witnesses.map(w => h('div', { class: 'witness' }, h('div', { class: 'name', text: tx(w.who) }),
      h('blockquote', {}, tx((w.lead || '') + '"' + w.quote + '"')),
      h('div', { class: 'src' }, rich(w.source), w.url && [' · ', h('a', { href: w.url, target: '_blank', rel: 'noopener', text: C.copy.passage.read })]))),
    tryOffer(), pager('why/reach', n, total));
  const sc = K.screens[n - 1];
  return whyFrame(h('p', { class: 'progress', text: fill(K.progressLine || C.case.progress, { n, total }) }), h('h2', { text: tx(sc.title) }),
    h('div', { class: 'prose', style: 'margin-top:12px' }, blocks(sc.body)), pager('why/reach', n, total));
}
function speaksView(arg) {
  const K = C.speaks;
  const block = (lbl, text) => text && h('div', { class: 'way-block' }, h('div', { class: 'lbl', text: tx(lbl) }), para(text));
  return whyFrame(h('h1', { text: tx(K.title) }), h('p', { class: 'prose', style: 'margin-top:10px', text: tx(K.framing) }),
    K.ways.map((w, i) => h('div', { class: 'way-block', id: 'way-' + w.id, 'data-anchor': w.id === arg ? '' : null, style: 'padding-top:14px;border-top:1px solid var(--line);margin-top:18px' },
      h('h3', { text: tx((i + 1) + '. ' + w.title) }), w.note && h('p', { class: 'dim', text: tx(w.note) }),
      h('p', { class: 'prose', style: 'margin-top:6px' }, rich(w.what)),
      block(K.labels.inScripture, w.scripture), block(K.labels.witnesses, w.witnesses), block(K.labels.test, w.test), block(K.labels.try, w.try))),
    h('div', { class: 'way-block', style: 'margin-top:20px' }, h('h3', { text: tx(K.togetherTitle) }), para(K.together)),
    h('div', { class: 'way-block' }, h('h3', { text: tx(K.noneTitle) }), para(K.none)),
    tryOffer());
}
function witnessesView() {
  const K = C.witnesses;
  return whyFrame(h('h1', { text: tx(K.title) }),
    h('p', { class: 'prose', style: 'margin-top:8px' }, rich(K.verse)), h('p', { class: 'prose', text: tx(K.framing) }), h('p', { class: 'fine', text: tx(K.disclaimer) }),
    K.items.map(w => h('div', { class: 'witness' },
      h('div', { class: 'name', text: tx(w.name) }), h('div', { class: 'dates', text: w.dates }), h('div', { class: 'who' }, rich(w.who)),
      w.quote && h('blockquote', {}, tx((w.lead || '') + '"' + w.quote + '"')),
      w.paraphrase && h('p', { class: 'prose', style: 'margin-top:8px' }, rich(w.paraphrase)),
      w.before && h('p', { class: 'ctx' }, tx('Just before it: "' + w.before + '"')),
      w.after && h('p', { class: 'ctx' }, rich(w.after)),
      h('div', { class: 'src' }, rich(w.source), w.url && [' · ', h('a', { href: w.url, target: '_blank', rel: 'noopener', text: C.copy.passage.read })]),
      (w.context || K.notes[w.id]) && h('p', { class: 'ctx', text: tx(w.context || K.notes[w.id]) }),
      w.ways && w.ways.length > 0 && h('div', { class: 'card-extra' }, w.ways.map(id => link(C.speaks.title + ': ' + speaksTitle(id), () => go('why/speaks/' + id), 'small'))))),
    tryOffer());
}
function lifeView() {
  const K = C.life;
  return whyFrame(h('h1', { text: tx(K.title) }), h('p', { class: 'dim', text: tx(K.intro) }),
    h('h3', { text: tx(K.portraitsTitle), style: 'margin:18px 0 4px' }),
    K.portraits.map(p => h('div', { class: 'witness' }, h('div', { class: 'name' }, p.name, ' ', h('span', { class: 'dates' }, '(', rich(p.refs), ')')),
      h('p', { class: 'prose', style: 'margin-top:4px' }, rich(p.body)), h('p', { class: 'dim', style: 'margin-top:4px' }, tx(K.showsLabel + ': ' + p.shows)))),
    h('h3', { text: tx(K.dayTitle), style: 'margin:18px 0 4px' }), h('p', { class: 'dim', text: tx(K.dayIntro) }),
    K.day.map(d => h('div', { class: 'verse-row' }, h('div', { class: 'vr', text: tx(d.label) }), h('div', { class: 'vn' }, rich(d.text)))),
    h('h3', { text: tx(K.speaksTitle), style: 'margin:18px 0 4px' }), h('p', {}, tx(K.speaksLine), ' ', link(C.speaks.title, () => go('why/speaks'), 'small')),
    h('h3', { text: tx(K.timeTitle), style: 'margin:18px 0 4px' }), h('p', { class: 'dim', text: tx(K.timeIntro) }),
    h('ul', { class: 'prose' }, K.time.map(t => h('li', {}, rich(t)))),
    h('p', { class: 'prose', style: 'margin-top:14px', text: tx(K.last) }), tryOffer());
}
function scriptureView() {
  const K = C.scripture;
  return whyFrame(h('h1', { text: tx(K.title) }),
    h('p', { class: 'scripture', style: 'font-size:1.15rem;margin-top:8px' }, tx('"' + K.leadText + '"'), ' ', rich(K.leadRef)), h('p', { class: 'dim', text: tx(K.lead) }), h('p', { class: 'fine', style: 'margin-top:6px', text: tx(K.intro) }),
    K.groups.map(g => [h('div', { class: 'group-label', text: tx(g.title + (g.note ? ' (' + g.note + ')' : '')) }),
      g.verses.map(v => h('div', { class: 'verse-row' }, h('div', { class: 'vr' }, rich(v.ref)), h('div', { class: 'vn', text: tx(v.note) }),
        v.speaks && link(C.speaks.title + ': ' + speaksTitle(v.speaks), () => go('why/speaks/' + v.speaks), 'small')))]),
    tryOffer());
}

// ===================== review =====================
let reviewFilter = 'all', exportRange = { from: '', to: '' };
function updateSession(id, fn) { const all = sessions(); const s = all.find(x => x.id === id); if (s) { fn(s); saveSessions(all); } return s; }
function openPrintPage(list) {
  const html = E.exportHTML(C, list);
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const w = window.open(url, '_blank');
  if (!w) messageDialog(C.copy.export.blocked);
}
function saveTextFile(list) {
  const url = URL.createObjectURL(new Blob([E.exportText(C, list)], { type: 'text/plain;charset=utf-8' }));
  const a = h('a', { href: url, download: C.copy.export.fileName });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
async function copyTextOf(list, btnEl) {
  try { await navigator.clipboard.writeText(E.exportText(C, list)); btnEl.textContent = C.copy.review.copied; }
  catch { messageDialog(C.copy.export.copyFailed); }
}
const statusTag = s => s.status !== 'complete' && h('span', { class: 'log-tag', text: C.copy.review.status[s.status] });

VIEWS.review = ([id]) => id ? reviewDetail(id) : reviewList();
function reviewList() {
  const R = C.copy.review, all = sessions();
  const shown = E.sortNewest(reviewFilter === 'answered' ? all.filter(s => s.answered) : all);
  const pattern = E.patternNote(C, all);
  const inRange = () => all.filter(s => E.inRange(s, exportRange.from, exportRange.to));
  const dateIn = (k, label) => h('label', { class: 'field-label' }, label, h('input', { type: 'date', value: exportRange[k], onchange: ev => { exportRange[k] = ev.target.value; } }));
  let copyBtn;
  return h('section', { class: 'view' },
    h('h1', { text: tx(R.title) }),
    h('div', { class: 'chips', style: 'margin:12px 0 4px' },
      chip({ label: R.all, pressed: reviewFilter === 'all', onclick: () => { reviewFilter = 'all'; render('review'); } }),
      chip({ label: R.answered + ' (' + all.filter(s => s.answered).length + ')', pressed: reviewFilter === 'answered', onclick: () => { reviewFilter = 'answered'; render('review'); } })),
    pattern && h('p', { class: 'pattern', text: tx(pattern) }),
    shown.length ? h('div', {}, shown.map(s => h('button', { type: 'button', class: 'log-item' + (E.isLight(s) ? ' light' : ''), onclick: () => go('review/' + s.id) },
      h('div', { class: 'log-when' }, showDate(s.started), ' · ', C.paths[s.path].title, statusTag(s), s.answered && h('span', { class: 'log-tag', text: R.godAnswered })),
      h('div', { class: 'log-what', text: E.titleOf(C, s) }),
      s.keep && !E.isLight(s) && h('div', { class: 'log-keep', text: s.keep })))) : h('p', { class: 'fine', text: tx(R.empty) }),
    all.length > 0 && h('div', { class: 'sep' }),
    all.length > 0 && h('div', {},
      h('p', { class: 'fine', style: 'margin-top:0', text: tx(C.firstSave) }),
      h('h3', { text: R.export, style: 'margin-top:10px' }),
      h('div', { class: 'range' }, dateIn('from', R.from), dateIn('to', R.to)),
      h('p', { class: 'fine', style: 'margin-top:0', text: tx(R.rangeNote) }),
      h('div', { class: 'stack' },
        btn(R.exportPdf, () => openPrintPage(inRange()), 'quiet'),
        btn(R.exportText, () => saveTextFile(inRange()), 'quiet'),
        (copyBtn = btn(R.copyText, () => copyTextOf(inRange(), copyBtn), 'quiet'))),
      h('div', { style: 'margin-top:14px' }, link(R.deleteAll, async () => {
        if (await confirmDialog({ body: R.deleteAllBody, yes: R.deleteYes, no: R.deleteNo })) { saveSessions([]); clearDraft(); render('review'); }
      }, 'small danger'))),
    h('div', { class: 'spacer' }), tabs('review'));
}
function reviewDetail(id) {
  const R = C.copy.review, s = sessions().find(x => x.id === id);
  if (!s) { go('review'); return h('div'); }
  const r = E.recordOf(C, s);
  let editing = false, marking = false;
  const body = h('div');
  const paint = () => {
    const keepNode = editing ? (() => {
      const ta = h('textarea', { class: 'box short', rows: 3 }); ta.value = s.keep || '';
      return h('div', { class: 'edit-keep' }, ta, h('div', { class: 'row-actions' },
        link(R.save, () => { s.keep = ta.value; updateSession(id, x => { x.keep = ta.value; }); editing = false; paint(); }),
        link(R.cancel, () => { editing = false; paint(); })));
    })() : [h('div', { class: 'rec-a', text: s.keep || '—' }), link(R.editKeep, () => { editing = true; paint(); }, 'small')];
    const answeredNode = marking ? (() => {
      const ta = h('textarea', { class: 'box short', rows: 3 }); ta.value = s.answered ? s.answered.note : '';
      return h('div', {}, h('label', { class: 'field-label', text: R.answeredHow }), ta, h('div', { class: 'row-actions' },
        link(R.save, () => { s.answered = { note: ta.value }; updateSession(id, x => { x.answered = s.answered; }); marking = false; paint(); }),
        link(R.cancel, () => { marking = false; paint(); })));
    })() : s.answered ? [h('div', { class: 'rec-a', text: s.answered.note || '—' }),
      h('div', { class: 'row-actions' }, link(R.editKeep, () => { marking = true; paint(); }, 'small'),
        link(R.removeMark, () => { s.answered = null; updateSession(id, x => { x.answered = null; }); paint(); }, 'small'))]
      : link(R.markAnswered, () => { marking = true; paint(); });
    setKids(body,
      r.rows.map(row => h('div', { class: 'rec-row' }, h('div', { class: 'rec-q', text: tx(row.q || '') }), h('div', { class: 'rec-a', text: row.a || R.nothingYet }),
        row.how && row.how.length > 0 && h('div', { class: 'rec-how', text: C.how.title + ' ' + row.how.join(', ') }))),
      r.rounds.length > 0 && h('div', { class: 'rec-row' }, h('div', { class: 'rec-q', text: R.rounds }), r.rounds.map(x => h('div', { class: 'rec-a', text: x.at + ' ' + (x.feel || '') + (x.note ? ': ' + x.note : '') }))),
      r.test.length > 0 && h('div', { class: 'rec-row' }, h('div', { class: 'rec-q', text: tx(C.test.top) }), h('div', { class: 'rec-a', text: r.test.join(' · ') + (r.testNote ? ' — ' + r.testNote : '') })),
      h('div', { class: 'rec-row' }, h('div', { class: 'rec-q', text: tx(C.keep.title) }), keepNode),
      r.nextStep && h('div', { class: 'rec-row' }, h('div', { class: 'rec-q', text: tx(C.keep.nextLabel) }), h('div', { class: 'rec-a', text: r.nextStep })),
      h('div', { class: 'rec-row' }, h('div', { class: 'rec-q', text: R.godAnswered }), answeredNode));
  };
  paint();
  let copyBtn;
  return h('section', { class: 'view' },
    link(C.copy.back, () => go('review'), 'back'),
    h('h2', { text: tx(E.titleOf(C, s)), style: 'overflow-wrap:anywhere' }),
    h('p', { class: 'log-when' }, showDate(s.started), ' · ', r.title, statusTag(s)),
    s.status !== 'complete' && h('div', { style: 'margin-top:12px' }, btn(R.continue, () => resumeSession(s))),
    body,
    h('div', { class: 'sep' }),
    h('div', { class: 'stack' },
      btn(R.exportPdf, () => openPrintPage([s]), 'quiet'), btn(R.exportText, () => saveTextFile([s]), 'quiet'),
      (copyBtn = btn(R.copyText, () => copyTextOf([s], copyBtn), 'quiet'))),
    h('div', { style: 'margin-top:14px' }, link(R.delete, async () => {
      if (await confirmDialog({ body: R.deleteBody, yes: R.deleteYes, no: R.deleteNo })) {
        saveSessions(sessions().filter(x => x.id !== id)); if (cur && cur.id === id) clearDraft(); go('review');
      }
    }, 'small danger')),
    h('div', { class: 'spacer' }));
}

// ===================== More =====================
VIEWS.more = () => {
  const M = C.copy.more;
  const tile = (t, d, to) => h('button', { type: 'button', class: 'tile', onclick: () => go(to) }, h('span', { class: 't', text: tx(t) }), d && h('span', { class: 'd', text: tx(d) }));
  return h('section', { class: 'view menu-list' },
    h('h1', { text: tx(M.title), style: 'margin-bottom:14px' }),
    tile(C.common.title, M.commonLine, 'common'),
    tile(C.references.title, M.referencesLine, 'references'),
    tile(M.safety, null, 'safety'),
    tile(C.copy.settings.title, null, 'settings'),
    tile(C.about.title, null, 'about'),
    h('div', { class: 'spacer' }), tabs('more'));
};
VIEWS.references = () => {
  const K = C.references;
  return h('section', { class: 'view' }, link(C.copy.back, () => go('more'), 'back'), h('h1', { text: tx(K.title) }),
    h('p', { class: 'prose', style: 'margin-top:8px', text: tx(K.intro) }),
    K.items.map(it => h('div', { class: 'witness' }, h('div', { class: 'who', text: tx(it.by) }), h('div', { class: 'name' }, h('em', { text: tx(it.book) })),
      h('p', { class: 'prose', style: 'margin-top:2px', text: tx(it.use) }),
      it.warfare && h('p', { class: 'fine', style: 'margin-top:2px', text: tx(K.kraftNote) }),
      h('a', { class: 'link', href: it.url, target: '_blank', rel: 'noopener', text: it.linkLabel || K.linkLabel }))),
    h('p', { class: 'fine', text: tx(K.outro) }), h('div', { class: 'spacer' }), tabs('more'));
};
VIEWS.about = () => h('section', { class: 'view' }, link(C.copy.back, () => go('more'), 'back'), h('h1', { text: tx(C.about.title), style: 'margin-bottom:10px' }),
  h('div', { class: 'prose' }, C.about.paras.map(p => para(p))), h('div', { class: 'spacer' }), tabs('more'));
VIEWS.safety = () => h('section', { class: 'view' }, link(C.copy.back, () => go('more'), 'back'), h('h1', { text: tx(C.safetyPage.title), style: 'margin-bottom:10px' }),
  h('div', { class: 'prose' }, C.safetyPage.paras.map(p => para(p)), h('p', { class: 'care' }, h('strong', {}, withTel(C.safetyPage.line)))), h('div', { class: 'spacer' }), tabs('more'));

// ===================== settings =====================
let versionTaps = 0;
VIEWS.settings = () => {
  const S = C.copy.settings;
  const pickRow = (key, label, opts) => h('div', { class: 'row col' },
    h('span', { class: 'row-label', id: 'lbl-' + key, text: tx(label) }),
    h('div', { class: 'pick', role: 'group', 'aria-labelledby': 'lbl-' + key, style: 'margin-top:8px' }, opts.map(o => {
      const b = chip({ label: o.label, cls: 'small', pressed: (settings[key] || opts[0].id) === o.id, onclick: () => {
        settings[key] = o.id; saveSettings(); b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      } });
      return b;
    })));
  const sw = (key, label) => {
    const id = 'set-' + key;
    const b = h('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(!!settings[key]), 'aria-labelledby': id,
      onclick: () => { settings[key] = !settings[key]; saveSettings(); b.setAttribute('aria-checked', String(!!settings[key])); if (key === 'showGated') render('settings'); } });
    return h('div', { class: 'row' }, h('span', { class: 'row-label', id, text: tx(label) }), b);
  };
  const hourFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric' });
  const sel = h('select', { class: 'select', id: 'reminder' }, h('option', { value: '', text: S.reminderOff }),
    Array.from({ length: 18 }, (_, i) => i + 5).map(hr => h('option', { value: String(hr), text: hourFmt.format(new Date(2000, 0, 1, hr)) })));
  sel.value = settings.reminderHour == null ? '' : String(settings.reminderHour);
  const calRow = h('div', { style: 'padding:10px 0 12px;border-bottom:1px solid var(--line)' }, btn(S.reminderAdd, () => downloadReminder(settings.reminderHour), 'quiet'));
  const syncCal = () => { calRow.hidden = settings.reminderHour == null; };
  sel.addEventListener('change', () => { settings.reminderHour = sel.value === '' ? null : +sel.value; saveSettings(); syncCal(); });
  syncCal();
  const version = h('span');
  showVersion(version);
  const refresh = link(S.refresh, () => { refresh.textContent = S.refreshing; refreshApp(); }, 'small');
  const unlocked = !!seen().gatedUnlocked || !!settings.showGated;
  const vtap = h('button', { type: 'button', class: 'vtap', 'aria-label': S.version, onclick: () => {
    if (++versionTaps >= 5 && !unlocked) { setSeen({ gatedUnlocked: true }); versionTaps = 0; render('settings'); }
  } }, version);
  return h('section', { class: 'view' },
    link(C.copy.back, () => go('more'), 'back'),
    h('h1', { text: tx(S.title), style: 'margin-bottom:8px' }),
    pickRow('theme', S.theme, S.themes),
    sw('largeType', S.largeType), sw('reduceMotion', S.reduceMotion), sw('tone', S.tone),
    pickRow('guidance', S.guidance, S.guidanceOpts),
    h('p', { class: 'fine', style: 'margin-top:8px', text: tx(S.guidanceHelp) }),
    h('div', { class: 'row' }, h('label', { for: 'reminder', text: tx(S.reminder) }), sel), calRow,
    unlocked && sw('showGated', S.showGated),
    h('div', { style: 'margin-top:22px' }, btn(S.clear, async () => {
      if (await confirmDialog({ body: S.clearBody, yes: S.clearYes, no: S.clearNo })) {
        stopMic && stopMic(); store.clearAll(); settings = { ...E.DEFAULT_SETTINGS }; applySettings(); cur = null; lastDone = lastRest = null; go('start'); render('start');
      }
    }, 'quiet')),
    h('p', { class: 'fine', text: tx(S.about) }),
    h('div', { class: 'version' }, vtap, refresh));
};

// ===================== daily reminder (.ics, as in I Am Here) =====================
function downloadReminder(hour) {
  if (hour == null) return;
  const ics = E.reminderICS(C, hour, new Date(), location.href.split('#')[0]);
  const a = h('a', { href: 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics), download: 'with-reminder.ics' });
  document.body.append(a); a.click(); a.remove();
}

// Refresh: drop this app's cache and service worker, then reload so the newest version installs.
async function refreshApp() {
  try {
    if ('caches' in window) { const keys = await caches.keys(); await Promise.all(keys.filter(k => k.startsWith('with-')).map(k => caches.delete(k))); }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.filter(r => new URL(r.scope).pathname.endsWith('/With/')).map(r => r.unregister()));
    }
  } catch (e) { /* reload regardless */ }
  location.reload();
}
// the installed version is read from the service worker's cache name (sw.js is the one place it is set)
async function showVersion(el, tries = 0) {
  try {
    const keys = 'caches' in window ? await caches.keys() : [];
    const nums = keys.map(k => /^with-v(\d+)$/.exec(k)).filter(Boolean).map(m => +m[1]);
    if (nums.length) el.textContent = 'v' + Math.max(...nums);
    else if ('serviceWorker' in navigator && tries < 5) navigator.serviceWorker.ready.then(() => setTimeout(() => showVersion(el, tries + 1), 800));
  } catch {}
}

// ===================== updates =====================
// A new version installs in the background and WAITS (sw.js never takes over on its own), so an open
// session keeps getting every file from its own version. On a resting screen it takes over and reloads.
let updateReady = null;
function applyUpdate() { if (updateReady) updateReady.postMessage('skipWaiting'); }
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading) { reloading = true; location.reload(); } });
  navigator.serviceWorker.getRegistration().then(reg => {
    if (!reg) return;
    const ready = w => { updateReady = w; if (E.isResting(current)) applyUpdate(); };
    if (reg.waiting) ready(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && reg.waiting === w) ready(w); });
    });
    reg.update().catch(() => {});
  }).catch(() => {});
}

// ===================== boot =====================
async function boot() {
  applySettings();
  try {
    const res = await fetch('content.json');
    if (!res.ok) throw new Error(res.status);
    C = E.deepFreeze(await res.json());
  } catch {
    $app.replaceChildren(h('div', { class: 'offline', text: 'Connect once to install.' }));
    return;
  }
  // a force-close mid-session reopens on the start screen (with Continue), never mid-step
  const r = parseRoute().split('/')[0];
  if (['run', 'stop', 'connected', 'rest', 'done'].includes(r)) history.replaceState(null, '', '#/start');
  render(parseRoute());
}
boot();
window.__with = { get cur() { return cur; }, go, get C() { return C; } }; // for the tests page and manual checks
