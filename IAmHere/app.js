// I Am Here — views, routing, storage. Decisions live in engine.js; every word shown
// comes from content.json. Local only: localStorage, no network after first load.
import * as E from './engine.js';

const $app = document.getElementById('app');
const $announce = document.getElementById('announcer');
let C = null; // frozen content.json

// ===================== storage (PRD §6: local only) =====================
const KEY = { settings: 'iamhere.settings', sessions: 'iamhere.sessions', onboarded: 'iamhere.onboarded' };
const DEFAULT_SETTINGS = { reminderHour: null, reduceMotion: false, largeType: false, keepAll: false, tone: false, breathMode: 'truth' };
const store = {
  get(k, fallback) { try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  clearAll() { try { Object.values(KEY).forEach(k => localStorage.removeItem(k)); } catch {} },
};
let settings = { ...DEFAULT_SETTINGS, ...store.get(KEY.settings, {}) };
function saveSettings() { store.set(KEY.settings, settings); applySettings(); }
// Reduce motion is the in-app setting only (PRD §6/§12), not the OS preference.
function applySettings() {
  document.documentElement.classList.toggle('reduce-motion', !!settings.reduceMotion);
  document.documentElement.classList.toggle('large', !!settings.largeType);
}
const isOnboarded = () => !!store.get(KEY.onboarded, false);
const sessions = () => store.get(KEY.sessions, []);
function writeSession(rec) { const all = sessions(); all.push(rec); store.set(KEY.sessions, all); }

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
const chip = ({ label, helper, pressed, onclick, cls = '' }) =>
  h('button', { type: 'button', class: 'chip ' + cls, 'aria-pressed': String(!!pressed), onclick },
    h('span', { class: 'lbl', text: label }), helper && h('span', { class: 'hlp', text: helper }));
const link = (text, onclick, cls = '') => h('button', { type: 'button', class: 'link ' + cls, text, onclick });
const btn = (text, onclick, cls = '') => h('button', { type: 'button', class: 'btn ' + cls, text, onclick });
const gearIcon = () => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('width', '22'); s.setAttribute('height', '22'); s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('aria-hidden', 'true'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.6'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
  s.innerHTML = '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>';
  return s;
};
// "988" in the danger line becomes a tap-to-call link; the words themselves are unchanged
function withTel(text) {
  const parts = text.split('988');
  return parts.flatMap((p, i) => i === 0 ? [p] : [h('a', { class: 'tel', href: 'tel:988', text: '988' }), p]);
}
const announce = text => { $announce.textContent = ''; setTimeout(() => { $announce.textContent = text; }, 50); };

// ===================== visit state (in memory only — PRD §20: force-close = no save) =====================
const freshDraft = () => ({ spirit: null, body: null, mind: null, timeTravelFlavor: null });
let draft = freshDraft();
let visit = null;
let obStep = 0;

const tickLabel = (axis, id) => (C.axes[axis].ticks.find(t => t.id === id) || {}).label || '—';
const pinLabel = id => ([...C.dyingPins, ...C.managedPins].find(p => p.id === id) || {}).label;

function startVisit() {
  const loc = { ...draft };
  if (loc.mind !== 'time_travel') loc.timeTravelFlavor = null;
  if (E.isAllHome(loc)) {
    visit = { loc, homePath: true, axis: E.recommendAxis(loc), pinId: null };
    tone.prime();
    return go('home-state');
  }
  visit = {
    loc, homePath: false, axis: E.recommendAxis(loc), pinList: E.pinListFor(loc),
    pinSel: {}, pinId: null, thanWhom: '', unknownAsked: false,
  };
  go(E.needsPin(loc) ? 'pin' : 'strategy');
}
// straight to the breath, no check-in: nothing to match a verse to, so truth mode uses the home verse
function breatheNow() {
  visit = { loc: {}, direct: true, homePath: false, axis: null, pinId: null };
  tone.prime();
  go('breathe');
}
function resetToHere() { visit = null; draft = freshDraft(); go('here'); }

// ===================== router (hash routes so GitHub Pages serves one file) =====================
let current = null, teardown = null, programmatic = false;
const parseRoute = () => location.hash.replace(/^#\/?/, '');
function go(route) {
  programmatic = true;
  if (parseRoute() === route) { render(route); programmatic = false; }
  else location.hash = '#/' + route;
}
window.addEventListener('hashchange', () => {
  programmatic = false;
  render(parseRoute());
});

const NEEDS_VISIT = ['pin', 'strategy', 'breathe', 'home-state', 'again'];
function render(requested) {
  if (teardown) { teardown(); teardown = null; }
  let route = requested;
  if (!(route in VIEWS)) route = 'here';
  if (!isOnboarded() && route !== '') route = '';
  if (route === '' && isOnboarded()) route = 'here';
  if (NEEDS_VISIT.includes(route) && !visit) route = 'here';
  if (visit && visit.direct && (route === 'pin' || route === 'strategy')) route = 'here';
  if (route === 'pin' && !E.needsPin(visit.loc)) route = 'strategy';
  if (route !== requested) history.replaceState(null, '', '#/' + route);
  current = route;
  $app.replaceChildren(VIEWS[route]());
  window.scrollTo(0, 0);
  const head = $app.querySelector('h1, h2');
  if (head) { head.tabIndex = -1; head.focus({ preventScroll: true }); }
}

// ===================== views =====================
const VIEWS = {
  // ---------- / : first-run onboarding (PRD §7) ----------
  ''() {
    const s = C.onboarding[obStep];
    const next = () => { obStep++; render(''); };
    const finish = () => { store.set(KEY.onboarded, true); obStep = 0; go('here'); };
    const last = obStep === C.onboarding.length - 1;
    return h('section', { class: 'view onb' },
      h('div', { class: 'spacer' }),
      h('h1', { text: s.title }),
      h('p', { text: s.body }),
      h('div', { class: 'spacer' }),
      h('div', { class: 'dots', 'aria-hidden': 'true' }, C.onboarding.map((_, i) => h('span', { class: i === obStep ? 'on' : '' }))),
      h('div', { class: 'stack' },
        btn(s.cta, last ? finish : next),
        obStep > 0 && !last && link(C.copy.skip, finish),
      ),
    );
  },

  // ---------- /here : locate (PRD §8) ----------
  here() {
    const refs = { spirit: [], body: [], mind: [] };
    let flavorRow, cta;
    const update = () => {
      for (const axis of E.AXES) refs[axis].forEach(b => b.setAttribute('aria-pressed', String(draft[axis] === b.dataset.id)));
      flavorRow.hidden = draft.mind !== 'time_travel';
      flavorRow.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(draft.timeTravelFlavor === b.dataset.id)));
      cta.disabled = !E.isComplete(draft);
    };
    const tick = (axis, t) => {
      const b = chip({ label: t.label, helper: t.helper, onclick: () => {
        draft[axis] = t.id;
        if (axis === 'mind' && t.id !== 'time_travel') draft.timeTravelFlavor = null;
        update();
      } });
      b.dataset.id = t.id; refs[axis].push(b); return b;
    };
    const card = (axis, body) => {
      const a = C.axes[axis], qid = 'q-' + axis;
      return h('div', { class: 'axis ' + axis, role: 'group', 'aria-labelledby': qid },
        h('div', { class: 'axis-head' },
          h('div', { class: 'axis-name', text: a.label }),
          h('div', { class: 'axis-q', id: qid, text: a.question })),
        body);
    };
    const byId = (axis, id) => C.axes[axis].ticks.find(t => t.id === id);

    const bodyGroups = C.axes.body.groups.map(g => g.label
      ? [h('div', { class: 'group-label', text: g.label }), h('div', { class: 'grid' }, g.ids.map(id => tick('body', byId('body', id))))]
      : h('div', { class: 'not-taken' }, g.ids.map(id => tick('body', byId('body', id)))));

    flavorRow = h('div', { class: 'flavors' }, C.axes.mind.timeTravelFlavors.map(f => {
      const b = chip({ label: f.label, cls: 'pill', onclick: () => {
        draft.timeTravelFlavor = draft.timeTravelFlavor === f.id ? null : f.id; update();
      } });
      b.dataset.id = f.id; return b;
    }));

    cta = btn(C.copy.here.cta, startVisit);
    const view = h('section', { class: 'view' },
      h('div', { class: 'topbar' },
        h('h1', { class: 'wordmark', text: C.copy.wordmark }),
        h('div', { class: 'topbar-actions' },
          link(C.copy.here.breathe, breatheNow),
          h('button', { type: 'button', class: 'icon-btn', 'aria-label': C.copy.settings.title, onclick: () => go('settings') }, gearIcon()))),
      card('spirit', h('div', { class: 'grid one' }, C.axes.spirit.ticks.map(t => tick('spirit', t)))),
      card('body', bodyGroups),
      card('mind', [h('div', { class: 'grid' }, C.axes.mind.ticks.map(t => tick('mind', t))), flavorRow]),
      h('div', { class: 'footer' }, cta),
      // deliberately quiet: one plain line below the fold, not a screen or a button
      h('p', { class: 'danger-line' }, withTel(C.crisis.line)),
    );
    update();
    return view;
  },

  // ---------- /pin (PRD §10) ----------
  pin() {
    const P = C.copy.pin;
    const pins = E.pinsFor(C, visit.pinList);
    const title = visit.unknownAsked ? P.followup : (visit.pinList === 'dying' ? P.titleDying : P.titleManaged);
    let cont, thanWrap;
    const buttons = pins.map(p => {
      const tag = h('span', { class: 'also-tag', text: P.also, hidden: true });
      const b = chip({ label: p.label, onclick: () => { visit.pinSel = E.tapPin(visit.pinSel, p.id); update(); } });
      b.append(tag); b.dataset.id = p.id; return b;
    });
    const input = h('input', { class: 'text-input', id: 'thanWhom', type: 'text', maxlength: '40', autocomplete: 'off', enterkeyhint: 'done' });
    input.value = visit.thanWhom || '';
    input.addEventListener('input', () => { visit.thanWhom = input.value.slice(0, 40); }); // memory only, never stored
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
    thanWrap = h('div', { style: 'margin-bottom:14px' }, h('label', { class: 'field-label', for: 'thanWhom', text: P.thanWhom }), input);

    const update = () => {
      const { primary, also } = visit.pinSel;
      buttons.forEach(b => {
        const id = b.dataset.id;
        b.setAttribute('aria-pressed', String(id === primary));
        b.classList.toggle('also', id === also);
        b.querySelector('.also-tag').hidden = id !== also;
      });
      thanWrap.hidden = primary !== 'better_than';
      cont.disabled = !primary;
    };
    cont = btn(P.cta, () => {
      const id = visit.pinSel.primary;
      if (!id) return;
      if (E.isUnknownPin(id) && !visit.unknownAsked) {
        visit.unknownAsked = true; visit.pinSel = {};
        return render('pin'); // PRD §10.2: one follow-up question, then the same list again
      }
      visit.pinId = id;
      if (id !== 'better_than') visit.thanWhom = '';
      go('strategy');
    });
    const view = h('section', { class: 'view' },
      link(C.copy.back, () => go('here'), 'back'),
      h('h2', { text: title }),
      h('p', { class: 'instruction', text: P.instruction }),
      h('div', { class: 'pin-list' }, buttons),
      thanWrap,
      h('div', { class: 'spacer' }),
      h('div', { class: 'footer' }, cont),
    );
    update();
    return view;
  },

  // ---------- /strategy (PRD §11) ----------
  strategy() {
    const S = C.copy.strategy, loc = visit.loc;
    // "Spirit: Fading · Body: Rest · Mind: Open", then the chosen sentence (if any) on its own line
    const ticks = E.AXES.map(a => `${C.axes[a].label}: ${tickLabel(a, loc[a])}`).join(' · ');
    let pinText = null;
    if (visit.pinId) {
      pinText = pinLabel(visit.pinId);
      if (visit.pinId === 'better_than' && visit.thanWhom.trim()) pinText += ' ' + visit.thanWhom.trim();
    }
    const recap = [h('span', { text: ticks }), pinText && [h('br'), h('span', { text: `${S.recapPin}: ${pinText}` })]];
    const note = E.honestyNote(C, visit.pinId);
    const choices = E.axisChoices(loc);
    let choiceRow = null;
    if (choices.length > 1) {
      choiceRow = h('div', { class: 'axis-choices', hidden: true }, choices.map(a =>
        chip({ label: C.axes[a].label, cls: 'pill', pressed: a === visit.axis, onclick: () => { visit.axis = a; render('strategy'); } })));
    }
    const toBreath = () => { tone.prime(); go('breathe'); };
    return h('section', { class: 'view' },
      link(C.copy.back, () => go(E.needsPin(loc) ? 'pin' : 'here'), 'back'),
      h('p', { class: 'recap' }, recap),
      h('h2', { text: `${S.startWith} ${visit.axis}.` }),
      h('p', { class: 'strategy-text', text: E.strategyFor(C, loc, visit.axis, visit.pinId) }),
      note && h('p', { class: 'note', text: note }),
      h('div', { class: 'spacer' }),
      h('div', { class: 'footer' },
        choiceRow,
        btn(S.cta, toBreath),
        choiceRow && link(S.chooseOther, e => { choiceRow.hidden = false; e.currentTarget.remove(); }, 'small')),
    );
  },

  breathe() { return breathView(false); },
  'home-state'() { return breathView(true); },

  // ---------- /again (PRD §13) ----------
  again() {
    const A = C.copy.again;
    if (visit.ended) {
      return h('section', { class: 'view' },
        h('div', { class: 'spacer' }),
        h('h2', { class: 'end-text', text: C.copy.home.line }),
        h('div', { class: 'spacer' }),
        h('div', { class: 'center' }, link(C.copy.end.link, resetToHere, 'small')));
    }
    let saveBtn = null;
    if (!settings.keepAll && !visit.direct) { // a breath with no check-in has nothing to save
      saveBtn = btn(visit.savedId ? A.saved : A.save, () => {
        if (visit.savedId) return;
        const rec = E.buildSession(visit, { breathsCompleted: visit.breathsCompleted, saved: true });
        writeSession(rec); visit.savedId = rec.id;
        saveBtn.textContent = A.saved; saveBtn.disabled = true;
      }, 'quiet');
      if (visit.savedId) saveBtn.disabled = true;
    }
    return h('section', { class: 'view' },
      h('div', { class: 'spacer' }),
      h('h2', { class: 'quiet-title', text: A.title }),
      h('div', { class: 'spacer' }),
      h('div', { class: 'stack' },
        btn(A.locateAgain, resetToHere),
        saveBtn,
        btn(A.done, () => { visit.ended = true; render('again'); }, 'quiet'),
        h('div', { class: 'center' }, link(A.log, () => go('log'), 'small'))),
    );
  },

  // ---------- /log : private local history, no stats ----------
  log() {
    const L = C.copy.log;
    const items = sessions().slice().reverse();
    const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    return h('section', { class: 'view' },
      link(C.copy.back, () => go(visit ? 'again' : 'settings'), 'back'),
      h('h2', { text: L.title }),
      items.length ? h('div', {}, items.map(s => {
        const when = new Date(s.ts);
        const mind = tickLabel('mind', s.mind) + (s.timeTravelFlavor ? ' · ' + (C.axes.mind.timeTravelFlavors.find(f => f.id === s.timeTravelFlavor) || {}).label : '');
        return h('div', { class: 'log-item' },
          h('div', { class: 'log-when', text: isNaN(when) ? s.ts : fmt.format(when) }),
          h('div', { class: 'log-ticks', text: [tickLabel('spirit', s.spirit), tickLabel('body', s.body), mind].join(' · ') }),
          s.pinId && h('div', { class: 'log-meta', text: pinLabel(s.pinId) }),
          h('div', { class: 'log-meta', text: `${L.moved} ${s.axisMoved} · ${s.verseRef || (C.breathModes.find(m => m.id === s.breathMode) || {}).label}` }));
      })) : h('p', { class: 'fine', text: L.empty }),
    );
  },

  // ---------- /settings (PRD §15) ----------
  settings() {
    const S = C.copy.settings;
    const toggle = (key, label) => {
      const id = 'set-' + key;
      const sw = h('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(!!settings[key]), 'aria-labelledby': id,
        onclick: () => { settings[key] = !settings[key]; saveSettings(); sw.setAttribute('aria-checked', String(!!settings[key])); } });
      return h('div', { class: 'row' }, h('span', { class: 'row-label', id, text: label }), sw);
    };
    const hourFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric' });
    const sel = h('select', { class: 'select', id: 'reminder' },
      h('option', { value: '', text: S.reminderOff }),
      Array.from({ length: 18 }, (_, i) => i + 5).map(hr =>
        h('option', { value: String(hr), text: hourFmt.format(new Date(2000, 0, 1, hr)) })));
    sel.value = settings.reminderHour == null ? '' : String(settings.reminderHour);
    const addCal = btn(S.reminderAdd, () => downloadReminder(settings.reminderHour), 'quiet');
    const calRow = h('div', { style: 'padding:10px 0 12px;border-bottom:1px solid var(--line)' }, addCal);
    const syncCal = () => { calRow.hidden = settings.reminderHour == null; };
    sel.addEventListener('change', () => { settings.reminderHour = sel.value === '' ? null : +sel.value; saveSettings(); syncCal(); });
    syncCal();

    let armed = false;
    const clear = btn(S.clear, () => {
      if (!armed) { armed = true; clear.textContent = S.clearConfirm; return; }
      store.clearAll();
      settings = { ...DEFAULT_SETTINGS }; applySettings();
      draft = freshDraft(); visit = null; obStep = 0;
      go('');
    }, 'quiet');

    const version = h('p', { class: 'version' });
    showVersion(version);
    return h('section', { class: 'view' },
      link(C.copy.back, () => go('here'), 'back'),
      h('h2', { text: S.title, style: 'margin-bottom:8px' }),
      h('div', { class: 'row' }, h('label', { for: 'reminder', text: S.reminder }), sel),
      calRow,
      toggle('reduceMotion', S.reduceMotion),
      toggle('largeType', S.largeType),
      toggle('tone', S.tone),
      toggle('keepAll', S.keepAll),
      h('div', { class: 'row' }, h('span', { class: 'row-label', text: S.log }), link('›', () => go('log'))),
      h('div', { style: 'margin-top:22px' }, clear),
      h('p', { class: 'fine', text: S.scripture }),
      h('p', { class: 'fine', text: S.about }),
      h('p', { class: 'fine' }, withTel(C.crisis.line)),
      version,
    );
  },
};

// ===================== breath (PRD §12) =====================
function breathView(homePath) {
  const B = E.BREATH;
  // a mode tapped during this visit wins; otherwise a named lie opens in truth, else the remembered mode
  const mode = visit.breathMode = visit.modeTapped || E.startMode(visit, settings.breathMode);
  visit.verse = E.verseFor(C, visit);
  const script = E.breathScript(C, visit, mode); // one entry per breath; null = silent
  const total = script.length;
  const cycle = B.inhaleMs + B.exhaleMs;
  const ease = x => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));

  const petals = Array.from({ length: 8 }, (_, i) => h('div', { class: 'petal', style: `--i:${i}` }));
  const bloom = h('div', { class: 'bloom' }, petals);
  const bar = h('div', { class: 'breath-bar', 'aria-hidden': 'true' });
  const fin = h('p', { class: 'frag', 'aria-hidden': 'true' });
  const fex = h('p', { class: 'frag', 'aria-hidden': 'true' });
  const ref = h('p', { class: 'ref' });
  // leaving is always allowed: Back returns a step, Done ends the breath early
  const back = link(C.copy.back, () => { stop(); go(homePath || visit.direct ? 'here' : 'strategy'); });
  const doneBtn = btn(C.copy.breathe.done, () => end(), 'quiet');
  const dots = Array.from({ length: total }, () => h('span'));
  const progress = h('div', { class: 'breath-dots', role: 'progressbar', 'aria-label': C.copy.breathe.progress,
    'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': '0' }, dots);
  // switching mode restarts the breath with the new lines (and is remembered for next time)
  const modeRow = h('div', { class: 'mode-row', role: 'group', 'aria-label': C.copy.breathe.modes },
    C.breathModes.map(m => chip({ label: m.label, cls: 'pill', pressed: m.id === mode, onclick: () => {
      if (m.id === mode) return;
      visit.modeTapped = m.id; settings.breathMode = m.id; saveSettings(); tone.prime(); render(current);
    } })));
  const intro = homePath ? h('p', { class: 'home-intro', text: C.copy.home.text }) : null;

  let startT = null, pausedAt = null, pausedTotal = 0, raf = 0, lastBreath = -1, stopped = false, introTimer = 0;
  const now = () => performance.now();
  const elapsed = () => (pausedAt ?? now()) - startT - pausedTotal;

  function onBreathStart(n) {
    visit.breathsCompleted = n;
    dots.forEach((d, i) => { d.className = i < n ? 'done' : i === n ? 'now' : ''; });
    progress.setAttribute('aria-valuenow', String(n));
    const s = script[n];
    if (s && s !== script[n - 1]) {
      fin.textContent = s.inhale; fex.textContent = s.exhale;
      ref.textContent = s.ref || ''; ref.classList.toggle('shown', !!s.ref);
    }
    if (s) announce(s.inhale + ' ' + s.exhale);
  }
  function frame() {
    if (stopped) return;
    const t = elapsed();
    const n = Math.floor(t / cycle);
    if (n >= total) { visit.breathsCompleted = total; return end(); }
    if (n !== lastBreath) { lastBreath = n; onBreathStart(n); }
    const ph = t - n * cycle;
    const inhaling = ph < B.inhaleMs;
    const p = inhaling ? ease(ph / B.inhaleMs) : 1 - ease((ph - B.inhaleMs) / B.exhaleMs);
    bloom.style.setProperty('--p', p.toFixed(4));
    bar.style.opacity = (0.22 + 0.6 * p).toFixed(3);
    dots[n].style.setProperty('--f', (ph / cycle).toFixed(3)); // the current dot fills over its breath
    tone.set(p);

    // PRD §12.1 text: inhale line 0→1 over the inhale; over the exhale it falls 1→0.15
    // while the exhale line is at full; both settle to 0.2 between breaths.
    let oi = 0, oe = 0;
    if (script[n]) {
      // a new line fades up from nothing; a repeated line from its 0.2 resting glow
      const base = script[n] !== script[n - 1] ? 0 : 0.2;
      if (inhaling) { oi = base + (1 - base) * ease(ph / B.inhaleMs); oe = base; }
      else {
        const u = ph - B.inhaleMs;
        oi = u < 3400 ? 1 - 0.85 * ease(u / 3400) : 0.15 + 0.05 * ((u - 3400) / 600);
        oe = u < 600 ? base + (1 - base) * ease(u / 600) : u < 3200 ? 1 : 1 - 0.8 * ease((u - 3200) / 800);
      }
    }
    fin.style.opacity = oi.toFixed(3);
    fex.style.opacity = oe.toFixed(3);
    raf = requestAnimationFrame(frame);
  }
  function begin() {
    if (stopped) return;
    startT = now(); pausedTotal = 0; pausedAt = document.hidden ? now() : null;
    tone.start();
    if (!document.hidden) raf = requestAnimationFrame(frame);
  }
  // PRD §20: backgrounded mid-breath → pause the circle, resume on return, don't restart copy
  function onVis() {
    if (startT == null || stopped) return;
    if (document.hidden) { if (pausedAt == null) pausedAt = now(); cancelAnimationFrame(raf); tone.pause(); }
    else if (pausedAt != null) { pausedTotal += now() - pausedAt; pausedAt = null; tone.resume(); raf = requestAnimationFrame(frame); }
  }
  function stop() {
    stopped = true; cancelAnimationFrame(raf); clearTimeout(introTimer);
    document.removeEventListener('visibilitychange', onVis);
    tone.stop();
  }
  function end() {
    if (stopped) return;
    stop();
    // "keep all locates" (default off) writes every session; otherwise only an explicit Save does
    if (settings.keepAll && !visit.savedId && !visit.direct) {
      const rec = E.buildSession(visit, { breathsCompleted: visit.breathsCompleted, saved: false });
      writeSession(rec); visit.savedId = rec.id;
    }
    go('again');
  }

  document.addEventListener('visibilitychange', onVis);
  teardown = stop;
  visit.breathsCompleted = 0;
  $announce.textContent = ''; // nothing from a previous visit lingers through silent breaths
  if (homePath) introTimer = setTimeout(begin, 1800); else begin();

  return h('section', { class: 'view breathe' },
    h('div', { class: 'breathe-top' }, back),
    modeRow,
    h('div', { class: 'breathe-body' },
      intro,
      h('div', { class: 'bloom-wrap', 'aria-hidden': 'true' }, bloom),
      bar,
      h('div', { class: 'fragments' }, fin, fex),
      ref),
    h('div', { class: 'breathe-foot' }, progress, doneBtn),
  );
}

// ===================== optional breath tone (off by default, PRD §12.1) =====================
// Soft filtered brown noise that swells with the inhale — a breath sound rather than
// a musical pitch (a pitched tone read as grating in AbidingSteps).
const tone = (() => {
  let ctx = null, src = null, gain = null, filt = null, buf = null;
  function prime() {
    if (!settings.tone) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
    } catch { ctx = null; }
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

// ===================== daily reminder (PRD §15) =====================
// A web app can't schedule a local notification without a push server (and iOS
// can't at all), so the one daily reminder is a repeating calendar event the
// device's own calendar fires. Nothing leaves the device.
function downloadReminder(hour) {
  if (hour == null) return;
  const p = n => String(n).padStart(2, '0');
  const d = new Date(); d.setDate(d.getDate() + (d.getHours() >= hour ? 1 : 0));
  const day = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const url = location.href.split('#')[0];
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//I Am Here//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:iamhere-daily-reminder',
    'DTSTAMP:' + stamp,
    `DTSTART:${day}T${p(hour)}0000`,
    'DURATION:PT5M',
    'RRULE:FREQ=DAILY',
    'SUMMARY:' + C.copy.wordmark,
    'URL:' + url,
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + C.copy.wordmark, 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
  const a = h('a', { href: 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics), download: 'i-am-here-reminder.ics' });
  document.body.append(a); a.click(); a.remove();
}

// installed version is read from the service worker's cache name (sw.js is the one place it's set)
async function showVersion(el) {
  try {
    const keys = 'caches' in window ? await caches.keys() : [];
    const nums = keys.map(k => /^iamhere-v(\d+)$/.exec(k)).filter(Boolean).map(m => +m[1]);
    if (nums.length) el.textContent = 'v' + Math.max(...nums);
  } catch {}
}

// ===================== boot =====================
async function boot() {
  applySettings();
  try {
    const res = await fetch('content.json');
    if (!res.ok) throw new Error(res.status);
    C = E.deepFreeze(await res.json());
  } catch {
    // PRD §20: offline first launch with an empty cache
    $app.replaceChildren(h('div', { class: 'offline', text: 'Connect once to install.' }));
    return;
  }
  // PRD §20: a force-close mid-exercise reopens on /here, never mid-flow
  const r = parseRoute();
  if (NEEDS_VISIT.includes(r)) history.replaceState(null, '', '#/here');
  render(parseRoute());
}
boot();
