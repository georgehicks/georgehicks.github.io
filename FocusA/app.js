// ── Constants ──────────────────────────────────────────────────────────────
const BLOCK_MIN = 10;
const BLOCK_MS = BLOCK_MIN * 60 * 1000;
const OUTER_R = 95;
const INNER_R = 70;
const OUTER_CIRC = 2 * Math.PI * OUTER_R; // ≈ 596.9
const INNER_CIRC = 2 * Math.PI * INNER_R; // ≈ 439.8
const MAX_BLOCKS = 36;

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  target: null, // { text, startTime, endTime }
  theme: 'light',
};

// ── Storage helpers ────────────────────────────────────────────────────────
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pad(n) { return String(n).padStart(2, '0'); }

function loadState() {
  const raw = localStorage.getItem('focusA_target');
  state.target = raw ? JSON.parse(raw) : null;
  state.theme = localStorage.getItem('focusA_theme') || 'light';
}

function saveTarget() {
  if (state.target) {
    localStorage.setItem('focusA_target', JSON.stringify(state.target));
  } else {
    localStorage.removeItem('focusA_target');
  }
}

function getLogs() {
  const raw = localStorage.getItem(`focusA_logs_${todayKey()}`);
  return raw ? JSON.parse(raw) : {};
}

function setLog(blockKey, text) {
  const logs = getLogs();
  if (text.trim()) {
    logs[blockKey] = text;
  } else {
    delete logs[blockKey];
  }
  localStorage.setItem(`focusA_logs_${todayKey()}`, JSON.stringify(logs));
}

// ── DOM refs ───────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const elTimerSection  = $('timerSection');
const elRingOuter     = $('ringOuter');
const elRingInner     = $('ringInner');
const elTimerTime     = $('timerTime');
const elTimerLabel    = $('timerLabel');
const elTimerOutcome  = $('timerOutcome');
const elTargetText    = $('targetText');
const elTargetTime    = $('targetTime');
const elStartTarget   = $('startTarget');
const elClearTarget   = $('clearTarget');
const elTimelineBlocks = $('timelineBlocks');
const elTimelineHint  = $('timelineHint');
const elDailyNotes    = $('dailyNotes');
const elThemeToggle   = $('themeToggle');

// ── Formatting ─────────────────────────────────────────────────────────────
function fmtRemaining(ms) {
  if (ms <= 0) return '0:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${m}:${pad(sec)}`;
}

function fmtClock(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function defaultEndTime() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function timeInputToTs(value) {
  const [h, m] = value.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d.getTime();
}

// ── Theme ──────────────────────────────────────────────────────────────────
function applyTheme(t) {
  state.theme = t;
  document.documentElement.setAttribute('data-theme', t);
  document.getElementById('metaThemeColor').setAttribute('content', t === 'dark' ? '#1c1c28' : '#4361ee');
  elThemeToggle.querySelector('.theme-icon').textContent = t === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('focusA_theme', t);
}

elThemeToggle.addEventListener('click', () => {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
});

// ── Target ─────────────────────────────────────────────────────────────────
function syncTargetUI() {
  const active = !!state.target;
  elTimerSection.classList.toggle('hidden', !active);
  elStartTarget.classList.toggle('hidden', active);
  elClearTarget.classList.toggle('hidden', !active);
  elTargetText.disabled = active;
  elTargetTime.disabled = active;
  if (active) {
    elTimerOutcome.textContent = state.target.text || '';
  }
}

elStartTarget.addEventListener('click', () => {
  const timeVal = elTargetTime.value;
  if (!timeVal) return;
  state.target = {
    text: elTargetText.value.trim(),
    startTime: Date.now(),
    endTime: timeInputToTs(timeVal),
  };
  saveTarget();
  syncTargetUI();
  renderTimeline(true);
  tick();
});

elClearTarget.addEventListener('click', () => {
  if (!confirm('Clear this target and timeline?')) return;
  state.target = null;
  saveTarget();
  elTargetText.value = '';
  elTargetTime.value = defaultEndTime();
  syncTargetUI();
  renderTimeline(true);
});

// ── Rings ──────────────────────────────────────────────────────────────────
function setRing(el, circ, progress) {
  const p = Math.max(0, Math.min(1, progress));
  el.style.strokeDasharray = circ;
  el.style.strokeDashoffset = circ * (1 - p);
}

// ── Tick ───────────────────────────────────────────────────────────────────
function tick() {
  if (!state.target) return;
  const now = Date.now();
  const { startTime, endTime } = state.target;
  const totalDur = endTime - startTime;
  const remaining = Math.max(0, endTime - now);

  setRing(elRingOuter, OUTER_CIRC, (now - startTime) / totalDur);
  setRing(elRingInner, INNER_CIRC, (now % BLOCK_MS) / BLOCK_MS);

  elTimerTime.textContent = fmtRemaining(remaining);
  elTimerLabel.textContent = remaining > 0 ? 'remaining' : "time's up";
}

// ── Timeline ───────────────────────────────────────────────────────────────
let _lastBlockStart = null;

function renderTimeline(force = false) {
  if (!state.target) {
    _lastBlockStart = null;
    elTimelineBlocks.innerHTML = '<p class="timeline-empty">Set an outcome target above to see your timeline.</p>';
    elTimelineHint.textContent = '';
    return;
  }

  const now = Date.now();
  const curBlockStart = Math.floor(now / BLOCK_MS) * BLOCK_MS;

  if (!force && curBlockStart === _lastBlockStart) return;
  _lastBlockStart = curBlockStart;

  // Preserve focus
  const focusedKey = document.activeElement?.dataset?.blockKey;

  const { startTime, endTime } = state.target;
  const sessionBlockStart = Math.floor(startTime / BLOCK_MS) * BLOCK_MS;
  const targetBlockStart = Math.floor(endTime / BLOCK_MS) * BLOCK_MS;
  const logs = getLogs();

  const frag = document.createDocumentFragment();
  let blockStart = sessionBlockStart;
  let count = 0;

  while (blockStart <= targetBlockStart && count < MAX_BLOCKS) {
    const blockEnd = blockStart + BLOCK_MS;
    const isPast    = blockEnd <= now;
    const isCurrent = blockStart <= now && blockEnd > now;
    const isTarget  = blockStart === targetBlockStart;
    const blockKey  = String(blockStart);
    const savedNote = logs[blockKey] || '';

    const row = document.createElement('div');
    row.className = 'timeline-block';
    if (isPast)    row.classList.add('is-past');
    if (isCurrent) row.classList.add('is-current');
    if (isTarget)  row.classList.add('is-target');

    // Time label
    const timeEl = document.createElement('span');
    timeEl.className = 'block-time';
    timeEl.textContent = isTarget ? fmtClock(endTime) : fmtClock(blockStart);

    // Dot indicator
    const dot = document.createElement('div');
    dot.className = 'block-dot';

    // Note input
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'block-input';
    input.dataset.blockKey = blockKey;
    input.value = savedNote;
    input.readOnly = isPast;

    if (isTarget) {
      input.placeholder = state.target.text || 'your outcome…';
    } else if (isCurrent) {
      input.placeholder = 'what are you working on right now?';
    } else if (!isPast) {
      input.placeholder = 'plan ahead…';
    }

    input.addEventListener('input', () => setLog(blockKey, input.value));

    row.appendChild(timeEl);
    row.appendChild(dot);
    row.appendChild(input);

    if (isTarget) {
      const badge = document.createElement('span');
      badge.className = 'block-badge';
      badge.textContent = 'target';
      row.appendChild(badge);
    }

    frag.appendChild(row);
    blockStart = blockEnd;
    count++;
  }

  elTimelineBlocks.innerHTML = '';
  elTimelineBlocks.appendChild(frag);

  // Update hint
  const blocksLeft = Math.max(0, Math.ceil((endTime - now) / BLOCK_MS));
  elTimelineHint.textContent = blocksLeft > 0 ? `${blocksLeft * BLOCK_MIN} min left` : 'target reached';

  // Restore focus to previously focused block input
  if (focusedKey) {
    const input = elTimelineBlocks.querySelector(`[data-block-key="${focusedKey}"]`);
    if (input) input.focus();
  }

  // Scroll current block into view on first render
  if (force) {
    const cur = elTimelineBlocks.querySelector('.is-current');
    if (cur) cur.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

// ── Daily Notes ────────────────────────────────────────────────────────────
function loadNotes() {
  elDailyNotes.value = localStorage.getItem(`focusA_note_${todayKey()}`) || '';
}

elDailyNotes.addEventListener('input', () => {
  localStorage.setItem(`focusA_note_${todayKey()}`, elDailyNotes.value);
});

// ── Init ───────────────────────────────────────────────────────────────────
function init() {
  loadState();
  applyTheme(state.theme);

  elTargetTime.value = defaultEndTime();

  if (state.target) {
    elTargetText.value = state.target.text || '';
    const d = new Date(state.target.endTime);
    elTargetTime.value = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  syncTargetUI();
  loadNotes();
  renderTimeline(true);
  tick();

  setInterval(tick, 1000);
  setInterval(() => renderTimeline(), 30_000);
}

// ── Service Worker ─────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

init();
