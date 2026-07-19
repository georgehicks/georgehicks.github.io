/**
 * Rewire — design responses, rehearse them, reinforce better defaults
 */
(function () {
  "use strict";

  var LS_KEY = "rewire-state-v1";
  var LS_KEY_LEGACY = "practicing-state-v1";
  var WINDOW_DAYS = 30;
  var PRUNE_DAYS = 120;
  var PRACTICE_ROUND_SIZE = 5;

  /* ───────────── state ───────────── */
  function defaultState() {
    return {
      theme: null,
      triggers: [],
      rehearsalLog: [],
      habits: [],
      habitLog: [],
      rehearsalStreak: 0,
      lastRehearsalDate: null
    };
  }

  function parseState(raw) {
    var parsed = JSON.parse(raw);
    var d = defaultState();
    return Object.assign(d, parsed, {
      triggers: Array.isArray(parsed.triggers) ? parsed.triggers : [],
      rehearsalLog: Array.isArray(parsed.rehearsalLog) ? parsed.rehearsalLog : [],
      habits: Array.isArray(parsed.habits) ? parsed.habits : [],
      habitLog: Array.isArray(parsed.habitLog) ? parsed.habitLog : []
    });
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) return parseState(raw);
      var legacy = localStorage.getItem(LS_KEY_LEGACY);
      if (legacy) {
        var migrated = parseState(legacy);
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(migrated));
          localStorage.removeItem(LS_KEY_LEGACY);
        } catch (e) {}
        return migrated;
      }
    } catch (e) {}
    return defaultState();
  }

  function saveState() {
    try {
      var cutoff = Date.now() - PRUNE_DAYS * 864e5;
      state.rehearsalLog = (state.rehearsalLog || []).filter(function (r) {
        return new Date(r.ts).getTime() >= cutoff;
      });
      state.habitLog = (state.habitLog || []).filter(function (h) {
        return new Date(h.date).getTime() >= cutoff;
      });
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  var state = loadState();

  /* ───────────── content ───────────── */
  var TRIGGER_PRESETS = (window.RewireContent && window.RewireContent.TRIGGER_PRESETS) || [];

  /* ───────────── helpers ───────────── */
  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function windowStart() {
    return Date.now() - WINDOW_DAYS * 864e5;
  }

  function inWindow(ts) {
    return new Date(ts).getTime() >= windowStart();
  }

  function formatDate() {
    try {
      return new Date().toLocaleDateString(undefined, {
        weekday: "long", month: "short", day: "numeric"
      });
    } catch (e) {
      return "";
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function truncate(s, n) {
    if (s.length <= n) return s;
    return s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ───────────── triggers ───────────── */
  function findTrigger(id) {
    for (var i = 0; i < state.triggers.length; i++) {
      if (state.triggers[i].id === id) return state.triggers[i];
    }
    return null;
  }

  function triggerLabel(id) {
    var t = findTrigger(id);
    return t ? t.situation : "(deleted trigger)";
  }

  /* ───────────── rehearsal stats ───────────── */
  function allResultsFlat() {
    var out = [];
    state.rehearsalLog.forEach(function (entry) {
      (entry.results || []).forEach(function (r) {
        out.push({ triggerId: r.triggerId, selfReport: r.selfReport, ts: entry.ts, date: entry.date });
      });
    });
    return out;
  }

  function statsForTrigger(id, windowOnly) {
    var list = allResultsFlat().filter(function (r) {
      return r.triggerId === id && (!windowOnly || inWindow(r.ts));
    });
    var used = 0, reactedOld = 0, notComeUp = 0;
    list.forEach(function (r) {
      if (r.selfReport === "used") used++;
      else if (r.selfReport === "reacted-old") reactedOld++;
      else if (r.selfReport === "not-come-up") notComeUp++;
    });
    return { used: used, reactedOld: reactedOld, notComeUp: notComeUp, total: list.length };
  }

  function globalReportStats30() {
    var list = allResultsFlat().filter(function (r) { return inWindow(r.ts); });
    var used = 0, reactedOld = 0, notComeUp = 0;
    list.forEach(function (r) {
      if (r.selfReport === "used") used++;
      else if (r.selfReport === "reacted-old") reactedOld++;
      else if (r.selfReport === "not-come-up") notComeUp++;
    });
    var applicable = used + reactedOld;
    return {
      used: used, reactedOld: reactedOld, notComeUp: notComeUp,
      total: list.length,
      usedRate: applicable ? Math.round((100 * used) / applicable) : null
    };
  }

  function rehearsalHistory14() {
    var days = [];
    for (var i = 13; i >= 0; i--) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days.map(function (date) {
      var sessions = state.rehearsalLog.filter(function (s) { return s.date === date; });
      if (!sessions.length) return { date: date, level: "none" };
      var used = 0, reactedOld = 0;
      sessions.forEach(function (s) {
        (s.results || []).forEach(function (r) {
          if (r.selfReport === "used") used++;
          else if (r.selfReport === "reacted-old") reactedOld++;
        });
      });
      var applicable = used + reactedOld;
      if (applicable === 0) return { date: date, level: "ok" };
      var ratio = reactedOld / applicable;
      if (ratio === 0) return { date: date, level: "ok" };
      if (ratio < 0.35) return { date: date, level: "partial" };
      return { date: date, level: "hard" };
    });
  }

  function bumpRehearsalStreak() {
    var today = todayStr();
    var prev = state.lastRehearsalDate;
    if (prev !== today) {
      var yest = new Date();
      yest.setDate(yest.getDate() - 1);
      var yestStr = yest.toISOString().slice(0, 10);
      if (prev === yestStr) state.rehearsalStreak = (state.rehearsalStreak || 0) + 1;
      else state.rehearsalStreak = 1;
    }
    state.lastRehearsalDate = today;
  }

  /* ───────────── habits ───────────── */
  function findHabit(id) {
    for (var i = 0; i < state.habits.length; i++) {
      if (state.habits[i].id === id) return state.habits[i];
    }
    return null;
  }

  function isCheckedToday(habitId) {
    var today = todayStr();
    return state.habitLog.some(function (h) { return h.habitId === habitId && h.date === today; });
  }

  function toggleHabitToday(habitId) {
    var today = todayStr();
    var idx = -1;
    for (var i = 0; i < state.habitLog.length; i++) {
      if (state.habitLog[i].habitId === habitId && state.habitLog[i].date === today) { idx = i; break; }
    }
    if (idx >= 0) state.habitLog.splice(idx, 1);
    else state.habitLog.push({ habitId: habitId, date: today });
    saveState();
  }

  function habitStreak(habitId) {
    var dates = {};
    state.habitLog.forEach(function (h) {
      if (h.habitId === habitId) dates[h.date] = true;
    });
    var cursor = new Date();
    if (!dates[cursor.toISOString().slice(0, 10)]) cursor.setDate(cursor.getDate() - 1);
    var streak = 0;
    while (dates[cursor.toISOString().slice(0, 10)]) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  /* ───────────── theme ───────────── */
  function applyTheme() {
    if (state.theme === "light" || state.theme === "dark") {
      document.documentElement.setAttribute("data-theme", state.theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  function toggleTheme() {
    var cur = state.theme;
    if (!cur) {
      var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      state.theme = prefersDark ? "light" : "dark";
    } else {
      state.theme = cur === "dark" ? "light" : "dark";
    }
    saveState();
    applyTheme();
  }

  /* ───────────── view state ───────────── */
  var triggerFormState = null; // { editingId, presetId, situation }
  var habitFormOpen = false;
  var practice = null;
  var activeSession = null; // 'practice'

  function showView(name) {
    var views = document.querySelectorAll(".view");
    for (var i = 0; i < views.length; i++) {
      views[i].classList.toggle("active", views[i].getAttribute("data-view") === name);
    }
    var inSession = name === "practice" && practice && !practice.done;
    document.getElementById("topbar").classList.toggle("in-session", !!inSession);
    activeSession = inSession ? name : null;
  }

  /* ───────────── home ───────────── */
  function renderHome() {
    document.getElementById("home-date").textContent = formatDate();

    var g = globalReportStats30();
    var sessions30 = state.rehearsalLog.filter(function (s) { return inWindow(s.ts); }).length;

    document.getElementById("home-stats").innerHTML =
      '<div class="stat-card"><div class="stat-num">' + state.triggers.length + '</div><div class="stat-lbl">Triggers</div></div>' +
      '<div class="stat-card"><div class="stat-num">' + sessions30 + '</div><div class="stat-lbl">Rehearsals · 30d</div></div>' +
      '<div class="stat-card"><div class="stat-num">' + (g.usedRate === null ? "—" : g.usedRate + "%") + '</div><div class="stat-lbl">Used it</div></div>';

    document.getElementById("triggers-cta-meta").textContent =
      state.triggers.length + (state.triggers.length === 1 ? " trigger saved" : " triggers saved");
    document.getElementById("practice-cta-meta").textContent = state.triggers.length
      ? "Rehearse " + Math.min(PRACTICE_ROUND_SIZE, state.triggers.length) + " · self-report after"
      : "Add a trigger first";
    document.getElementById("habits-cta-meta").textContent =
      state.habits.length + (state.habits.length === 1 ? " habit tracked" : " habits tracked");

    var streakRow = document.getElementById("streak-row");
    var items = [];
    if (state.rehearsalStreak > 0) {
      items.push('<div class="streak-item"><div class="streak-lbl">Rehearsal</div><div class="streak-val">' + state.rehearsalStreak + '</div></div>');
    }
    var habitStreaks = state.habits.map(function (h) {
      return { label: h.label, n: habitStreak(h.id) };
    }).filter(function (h) { return h.n > 0; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 2);
    habitStreaks.forEach(function (h) {
      items.push('<div class="streak-item"><div class="streak-lbl">' + escapeHtml(truncate(h.label, 14)) + '</div><div class="streak-val">' + h.n + '</div></div>');
    });
    streakRow.innerHTML = items.join("");
    streakRow.style.display = items.length ? "flex" : "none";

    var strip = document.getElementById("home-history-strip");
    strip.innerHTML = rehearsalHistory14().map(function (d) {
      var cls = d.level === "none" ? "" : d.level;
      return '<i class="' + cls + '" title="' + d.date + '"></i>';
    }).join("");
  }

  /* ───────────── triggers view ───────────── */
  function presetTagsFor(presetId) {
    return presetId ? [presetId] : [];
  }

  function renderTriggers() {
    document.getElementById("triggers-count").textContent =
      state.triggers.length + (state.triggers.length === 1 ? " trigger" : " triggers");

    var listEl = document.getElementById("trigger-list");
    if (!state.triggers.length) {
      listEl.innerHTML = '<p class="empty-note">No triggers yet — add one above to start pre-deciding your response.</p>';
      return;
    }

    var sorted = state.triggers.slice().sort(function (a, b) {
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });

    var out = "";
    sorted.forEach(function (t) {
      var s = statsForTrigger(t.id, false);
      var pills = s.total === 0
        ? '<span class="none-pill">not rehearsed yet</span>'
        : '<span class="hit-pill">' + s.used + " used</span><span class=\"miss-pill\">" + s.reactedOld + " old way</span>";
      out +=
        '<article class="trigger-card">' +
          '<div class="trigger-card-head"><div class="trigger-situation">When ' + escapeHtml(t.situation) + '</div></div>' +
          (t.oldReaction ? '<div class="trigger-old"><span class="field-tag">Used to</span> ' + escapeHtml(t.oldReaction) + "</div>" : "") +
          '<div class="trigger-response"><span class="field-tag">I will</span> ' + escapeHtml(t.response) + "</div>" +
          (t.reframe ? '<p class="trigger-reframe">"' + escapeHtml(t.reframe) + '"</p>' : "") +
          '<div class="verse-stats">' + pills + "</div>" +
          '<div class="card-actions">' +
            '<button type="button" class="link-btn" data-edit="' + t.id + '">Edit</button>' +
            '<button type="button" class="link-btn" data-delete="' + t.id + '">Delete</button>' +
          "</div>" +
        "</article>";
    });
    listEl.innerHTML = out;
  }

  function renderTriggerForm() {
    var wrap = document.getElementById("trigger-form-wrap");
    if (!triggerFormState) {
      wrap.style.display = "none";
      wrap.innerHTML = "";
      return;
    }
    wrap.style.display = "block";
    var editing = triggerFormState.editingId ? findTrigger(triggerFormState.editingId) : null;

    var presetChips = TRIGGER_PRESETS.map(function (p) {
      var active = triggerFormState.presetId === p.id ? " active" : "";
      return '<button type="button" class="chip' + active + '" data-preset="' + p.id + '">' + escapeHtml(p.label) + "</button>";
    }).join("");

    var situationVal = editing ? editing.situation : (triggerFormState.situation || "");
    var oldVal = editing ? (editing.oldReaction || "") : "";
    var respVal = editing ? editing.response : "";
    var reframeVal = editing ? (editing.reframe || "") : "";

    wrap.innerHTML =
      '<div class="note-card"><strong>' + (editing ? "Edit trigger" : "New trigger") + "</strong> — pre-decide your response in a calm moment.</div>" +
      (editing ? "" : '<p class="field-label">Start from a common one (optional)</p><div class="chip-row" id="trigger-preset-chips">' + presetChips + "</div>") +
      '<p class="field-label">When… (the trigger)</p>' +
      '<input class="text-input" id="tf-situation" placeholder="e.g. someone criticizes my work" value="' + escapeHtml(situationVal) + '" />' +
      '<p class="field-label">What I tend to do (optional)</p>' +
      '<input class="text-input" id="tf-old" placeholder="e.g. I get defensive and shut down" value="' + escapeHtml(oldVal) + '" />' +
      '<p class="field-label">…I will instead</p>' +
      '<textarea class="text-area" id="tf-response" placeholder="e.g. take a breath, say thank you, and ask a clarifying question">' + escapeHtml(respVal) + "</textarea>" +
      '<p class="field-label">A truer thought (optional)</p>' +
      '<textarea class="text-area" id="tf-reframe" placeholder="e.g. feedback is information, not a verdict on my worth">' + escapeHtml(reframeVal) + "</textarea>" +
      '<button type="button" class="continue-btn" id="tf-save">' + (editing ? "Save changes" : "Add trigger") + "</button>" +
      '<button type="button" class="continue-btn secondary" id="tf-cancel" style="margin-top:0.5rem">Cancel</button>';
  }

  function openNewTriggerForm() {
    triggerFormState = { editingId: null, presetId: null, situation: "" };
    renderTriggerForm();
  }

  function openEditTriggerForm(id) {
    triggerFormState = { editingId: id, presetId: null, situation: "" };
    renderTriggerForm();
  }

  function closeTriggerForm() {
    triggerFormState = null;
    renderTriggerForm();
  }

  function saveTriggerForm() {
    var situationEl = document.getElementById("tf-situation");
    var responseEl = document.getElementById("tf-response");
    var sit = situationEl.value.trim();
    var resp = responseEl.value.trim();
    if (!sit) { situationEl.style.borderColor = "var(--berry)"; situationEl.focus(); return; }
    if (!resp) { responseEl.style.borderColor = "var(--berry)"; responseEl.focus(); return; }

    var oldReaction = document.getElementById("tf-old").value.trim();
    var reframe = document.getElementById("tf-reframe").value.trim();

    if (triggerFormState.editingId) {
      var t = findTrigger(triggerFormState.editingId);
      if (t) {
        t.situation = sit;
        t.oldReaction = oldReaction;
        t.response = resp;
        t.reframe = reframe;
        t.label = sit;
      }
    } else {
      state.triggers.push({
        id: uid(),
        label: sit,
        situation: sit,
        oldReaction: oldReaction,
        response: resp,
        reframe: reframe,
        tags: presetTagsFor(triggerFormState.presetId),
        createdAt: new Date().toISOString()
      });
    }
    saveState();
    triggerFormState = null;
    renderTriggerForm();
    renderTriggers();
    renderHome();
  }

  function deleteTrigger(id) {
    if (!confirm("Delete this trigger? Its rehearsal history will remain in your patterns as (deleted trigger).")) return;
    state.triggers = state.triggers.filter(function (t) { return t.id !== id; });
    saveState();
    renderTriggers();
    renderHome();
  }

  /* ───────────── practice session ───────────── */
  function weightTrigger(t) {
    var s = statsForTrigger(t.id, false);
    if (s.total === 0) return 5;
    if (s.reactedOld > s.used) return 4;
    if (s.reactedOld > 0) return 3;
    return 1;
  }

  function pickRoundTriggers(count) {
    var weighted = [];
    for (var i = 0; i < state.triggers.length; i++) {
      var w = weightTrigger(state.triggers[i]);
      for (var k = 0; k < w; k++) weighted.push(state.triggers[i]);
    }
    weighted = shuffle(weighted);
    var picked = [];
    var seen = {};
    for (var j = 0; j < weighted.length && picked.length < count; j++) {
      if (seen[weighted[j].id]) continue;
      seen[weighted[j].id] = true;
      picked.push(weighted[j]);
    }
    return picked;
  }

  function startPractice() {
    if (!state.triggers.length) return;
    var picked = pickRoundTriggers(Math.min(PRACTICE_ROUND_SIZE, state.triggers.length));
    practice = {
      queue: picked.map(function (t) { return t.id; }),
      index: 0,
      phase: "rehearse",
      results: [],
      done: false
    };
    showView("practice");
    renderPractice();
  }

  function renderPracticeTrack() {
    var track = document.getElementById("practice-track");
    if (!practice) { track.innerHTML = ""; return; }
    var html = "";
    for (var i = 0; i < practice.queue.length; i++) {
      var cls = "";
      var res = null;
      for (var j = 0; j < practice.results.length; j++) {
        if (j === i) { res = practice.results[j]; break; }
      }
      if (res) {
        if (res.selfReport === "used") cls = "done";
        else if (res.selfReport === "reacted-old") cls = "miss";
      } else if (i === practice.index && !practice.done) {
        cls = "now";
      }
      html += '<span class="' + cls + '"></span>';
    }
    track.innerHTML = html;
  }

  function renderPractice() {
    var stage = document.getElementById("practice-stage");
    if (!practice) return;
    renderPracticeTrack();

    if (practice.done) {
      stage.innerHTML = renderPracticeSummary();
      bindPracticeSummary();
      return;
    }

    var t = findTrigger(practice.queue[practice.index]);
    if (!t) {
      advancePractice("not-come-up");
      return;
    }

    if (practice.phase === "rehearse") {
      stage.innerHTML = renderRehearseStep(t);
    } else {
      stage.innerHTML = renderReportStep(t);
    }
  }

  function renderRehearseStep(t) {
    return (
      '<div class="step-tag">Rehearse · ' + (practice.index + 1) + " / " + practice.queue.length + "</div>" +
      '<div class="prompt-card">' +
        '<p class="stage-instruction" style="margin-bottom:0.5rem">When…</p>' +
        '<p class="prompt-text">' + escapeHtml(t.situation) + "</p>" +
        '<p class="stage-instruction" style="margin:0.9rem 0 0.4rem">…I will</p>' +
        '<p class="assertion-text" style="font-size:1.15rem">' + escapeHtml(t.response) + "</p>" +
        (t.reframe ? '<div class="linked-verse"><div class="lv-text">"' + escapeHtml(t.reframe) + '"</div></div>' : "") +
      "</div>" +
      '<p class="stage-instruction">Picture the moment. See yourself responding this way.</p>' +
      '<button type="button" class="continue-btn" data-pa="rehearsed">I’ve pictured it — continue</button>'
    );
  }

  function renderReportStep(t) {
    return (
      '<div class="step-tag">Since last time</div>' +
      '<div class="prompt-card"><p class="assertion-text" style="font-size:1.05rem">When ' + escapeHtml(t.situation) + "…</p></div>" +
      '<p class="stage-instruction">Did this come up — and what happened?</p>' +
      '<div class="gate-row">' +
        '<button type="button" class="gate-btn primary" data-pa="report-used">Used the new response</button>' +
        '<button type="button" class="gate-btn" data-pa="report-old">Reacted the old way</button>' +
        '<button type="button" class="gate-btn soft" data-pa="report-none">Didn’t come up</button>' +
      "</div>"
    );
  }

  function advancePractice(forcedReport) {
    if (forcedReport) {
      practice.results.push({ triggerId: practice.queue[practice.index], selfReport: forcedReport, rehearsed: true });
    }
    if (practice.index >= practice.queue.length - 1) {
      finishPractice();
      return;
    }
    practice.index++;
    practice.phase = "rehearse";
    renderPractice();
  }

  function finishPractice() {
    practice.done = true;
    state.rehearsalLog.push({
      ts: new Date().toISOString(),
      date: todayStr(),
      results: practice.results.slice()
    });
    bumpRehearsalStreak();
    saveState();
    document.getElementById("topbar").classList.remove("in-session");
    renderPractice();
    renderHome();
  }

  function renderPracticeSummary() {
    var used = 0, reactedOld = 0, notComeUp = 0;
    practice.results.forEach(function (r) {
      if (r.selfReport === "used") used++;
      else if (r.selfReport === "reacted-old") reactedOld++;
      else notComeUp++;
    });
    var total = practice.results.length;
    return (
      '<div class="summary">' +
        '<div class="summary-big">' + used + "/" + total + "</div>" +
        '<div class="summary-sub">used the new response · streak ' + state.rehearsalStreak + "</div>" +
        '<div class="stat-row">' +
          '<div class="stat-card"><div class="stat-num">' + used + '</div><div class="stat-lbl">Used it</div></div>' +
          '<div class="stat-card"><div class="stat-num">' + reactedOld + '</div><div class="stat-lbl">Old way</div></div>' +
          '<div class="stat-card"><div class="stat-num">' + notComeUp + '</div><div class="stat-lbl">Didn’t come up</div></div>' +
        "</div>" +
        '<button type="button" class="cta-btn" id="ps-again" style="margin-top:1.2rem">Practice again</button>' +
        '<button type="button" class="link-btn" id="ps-triggers" style="display:block;margin:1rem auto 0">My triggers</button>' +
        '<button type="button" class="link-btn" id="ps-home" style="display:block;margin:0.5rem auto 0">← Home</button>' +
      "</div>"
    );
  }

  function bindPracticeSummary() {
    var again = document.getElementById("ps-again");
    var trig = document.getElementById("ps-triggers");
    var home = document.getElementById("ps-home");
    if (again) again.onclick = startPractice;
    if (trig) trig.onclick = function () { practice = null; showView("triggers"); renderTriggers(); };
    if (home) home.onclick = goHome;
  }

  function onPracticeAction(action) {
    if (!practice || practice.done) return;
    if (action === "rehearsed") {
      practice.phase = "report";
      renderPractice();
      return;
    }
    if (action === "report-used") { advancePractice("used"); return; }
    if (action === "report-old") { advancePractice("reacted-old"); return; }
    if (action === "report-none") { advancePractice("not-come-up"); return; }
  }

  /* ───────────── habits view ───────────── */
  function renderHabits() {
    document.getElementById("habits-count").textContent =
      state.habits.length + (state.habits.length === 1 ? " habit" : " habits");

    var listEl = document.getElementById("habit-list");
    if (!state.habits.length) {
      listEl.innerHTML = '<p class="empty-note">No mini-habits yet — add a tiny one above. Small enough that it’s easy to say yes.</p>';
      return;
    }

    var sorted = state.habits.slice().sort(function (a, b) {
      return (a.createdAt || "").localeCompare(b.createdAt || "");
    });

    var out = "";
    sorted.forEach(function (h) {
      var checked = isCheckedToday(h.id);
      var streak = habitStreak(h.id);
      out +=
        '<div class="habit-card">' +
          '<button type="button" class="habit-check' + (checked ? " checked" : "") + '" data-toggle-habit="' + h.id + '" aria-label="Toggle done today">' + (checked ? "✓" : "") + "</button>" +
          '<div class="habit-info"><div class="habit-label">' + escapeHtml(h.label) + "</div>" +
            (h.cue ? '<div class="habit-cue">' + escapeHtml(h.cue) + "</div>" : "") +
          "</div>" +
          '<div class="habit-streak">' + (streak > 0 ? streak : "—") + "</div>" +
          '<button type="button" class="link-btn" data-delete-habit="' + h.id + '">×</button>' +
        "</div>";
    });
    listEl.innerHTML = out;
  }

  function renderHabitForm() {
    var wrap = document.getElementById("habit-form-wrap");
    if (!habitFormOpen) {
      wrap.style.display = "none";
      wrap.innerHTML = "";
      return;
    }
    wrap.style.display = "block";
    wrap.innerHTML =
      '<p class="field-label">Tiny habit name</p>' +
      '<input class="text-input" id="hf-label" placeholder="e.g. put shoes by the door" />' +
      '<p class="field-label">Cue or note (optional)</p>' +
      '<input class="text-input" id="hf-cue" placeholder="e.g. right after I take them off" />' +
      '<button type="button" class="continue-btn" id="hf-save">Add habit</button>' +
      '<button type="button" class="continue-btn secondary" id="hf-cancel" style="margin-top:0.5rem">Cancel</button>';
  }

  function openNewHabitForm() {
    habitFormOpen = true;
    renderHabitForm();
  }

  function closeHabitForm() {
    habitFormOpen = false;
    renderHabitForm();
  }

  function saveHabitForm() {
    var labelEl = document.getElementById("hf-label");
    var label = labelEl.value.trim();
    if (!label) { labelEl.style.borderColor = "var(--berry)"; labelEl.focus(); return; }
    var cue = document.getElementById("hf-cue").value.trim();
    state.habits.push({ id: uid(), label: label, cue: cue, createdAt: new Date().toISOString() });
    saveState();
    habitFormOpen = false;
    renderHabitForm();
    renderHabits();
    renderHome();
  }

  function deleteHabit(id) {
    if (!confirm("Delete this habit and its history?")) return;
    state.habits = state.habits.filter(function (h) { return h.id !== id; });
    state.habitLog = state.habitLog.filter(function (h) { return h.habitId !== id; });
    saveState();
    renderHabits();
    renderHome();
  }

  /* ───────────── patterns ───────────── */
  function renderBarList(items, colorClass) {
    if (!items.length) return '<p class="empty-note">Nothing captured yet in the last ' + WINDOW_DAYS + " days.</p>";
    var max = items[0].n || 1;
    return items.slice(0, 10).map(function (item) {
      var pct = Math.max(6, Math.round((100 * item.n) / max));
      return (
        '<div class="bar-row">' +
          '<div class="bar-label" title="' + escapeHtml(item.text) + '">' + escapeHtml(item.text) + "</div>" +
          '<div class="bar-track"><div class="bar-fill ' + (colorClass || "") + '" style="width:' + pct + '%"></div></div>' +
          '<div class="bar-n">' + item.n + "</div>" +
        "</div>"
      );
    }).join("");
  }

  function renderPatterns() {
    var body = document.getElementById("patterns-body");
    var g = globalReportStats30();
    var sessions30 = state.rehearsalLog.filter(function (s) { return inWindow(s.ts); }).length;

    var mostRehearsed = state.triggers.map(function (t) {
      return { text: truncate(t.situation, 40), n: statsForTrigger(t.id, true).total };
    }).filter(function (x) { return x.n > 0; }).sort(function (a, b) { return b.n - a.n; });

    var mostOld = state.triggers.map(function (t) {
      return { text: truncate(t.situation, 40), n: statsForTrigger(t.id, true).reactedOld };
    }).filter(function (x) { return x.n > 0; }).sort(function (a, b) { return b.n - a.n; });

    var habitBars = state.habits.map(function (h) {
      return { text: truncate(h.label, 40), n: habitStreak(h.id) };
    }).filter(function (x) { return x.n > 0; }).sort(function (a, b) { return b.n - a.n; });

    body.innerHTML =
      '<div class="stat-row" style="margin-bottom:1rem">' +
        '<div class="stat-card"><div class="stat-num">' + sessions30 + '</div><div class="stat-lbl">Rehearsals · 30d</div></div>' +
        '<div class="stat-card"><div class="stat-num">' + g.reactedOld + '</div><div class="stat-lbl">Reacted old · 30d</div></div>' +
        '<div class="stat-card"><div class="stat-num">' + (g.usedRate === null ? "—" : g.usedRate + "%") + '</div><div class="stat-lbl">Used it</div></div>' +
      "</div>" +

      '<div class="section-label" style="margin-top:0.4rem">Most rehearsed triggers</div>' +
      '<div class="pattern-card">' + renderBarList(mostRehearsed) + "</div>" +

      '<div class="section-label">Reacted the old way most</div>' +
      '<div class="pattern-card">' + renderBarList(mostOld, "berry") + "</div>" +

      '<div class="section-label">Mini-habit streaks</div>' +
      '<div class="pattern-card">' + renderBarList(habitBars, "moss") + "</div>" +

      '<div class="section-label">Rehearsal · 14 days</div>' +
      '<div class="pattern-card"><div class="history-strip" id="patterns-history-strip"></div></div>';

    var strip = document.getElementById("patterns-history-strip");
    if (strip) {
      strip.innerHTML = rehearsalHistory14().map(function (d) {
        var cls = d.level === "none" ? "" : d.level;
        return '<i class="' + cls + '" title="' + d.date + '"></i>';
      }).join("");
    }
  }

  /* ───────────── navigation ───────────── */
  function goHome() {
    practice = null;
    triggerFormState = null;
    habitFormOpen = false;
    showView("home");
    renderHome();
  }

  function exitSession() {
    if (activeSession === "practice" && practice && !practice.done) {
      if (!confirm("Leave this practice session? Progress so far will not be saved.")) return;
      practice = null;
    } else {
      practice = null;
    }
    document.getElementById("topbar").classList.remove("in-session");
    goHome();
  }

  /* ───────────── events ───────────── */
  function bind() {
    document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
    document.getElementById("exit-session-btn").addEventListener("click", exitSession);
    document.getElementById("wordmark-home").addEventListener("click", function () {
      if (activeSession) exitSession();
      else goHome();
    });
    document.getElementById("patterns-link").addEventListener("click", function () {
      showView("patterns");
      renderPatterns();
    });

    document.getElementById("btn-practice").addEventListener("click", startPractice);
    document.getElementById("btn-triggers").addEventListener("click", function () {
      showView("triggers");
      renderTriggers();
    });
    document.getElementById("btn-habits").addEventListener("click", function () {
      showView("habits");
      renderHabits();
    });
    document.getElementById("triggers-home").addEventListener("click", goHome);
    document.getElementById("habits-home").addEventListener("click", goHome);
    document.getElementById("patterns-home").addEventListener("click", goHome);

    document.getElementById("btn-new-trigger").addEventListener("click", openNewTriggerForm);
    document.getElementById("btn-new-habit").addEventListener("click", openNewHabitForm);

    document.getElementById("trigger-form-wrap").addEventListener("click", function (e) {
      var preset = e.target.closest("[data-preset]");
      if (preset) {
        var id = preset.getAttribute("data-preset");
        var p = TRIGGER_PRESETS.filter(function (x) { return x.id === id; })[0];
        if (p) {
          triggerFormState.presetId = id;
          triggerFormState.situation = p.situation;
          renderTriggerForm();
        }
        return;
      }
      if (e.target.id === "tf-save") { saveTriggerForm(); return; }
      if (e.target.id === "tf-cancel") { closeTriggerForm(); return; }
    });

    document.getElementById("trigger-list").addEventListener("click", function (e) {
      var editBtn = e.target.closest("[data-edit]");
      if (editBtn) { openEditTriggerForm(editBtn.getAttribute("data-edit")); window.scrollTo(0, 0); return; }
      var delBtn = e.target.closest("[data-delete]");
      if (delBtn) { deleteTrigger(delBtn.getAttribute("data-delete")); return; }
    });

    document.getElementById("habit-form-wrap").addEventListener("click", function (e) {
      if (e.target.id === "hf-save") { saveHabitForm(); return; }
      if (e.target.id === "hf-cancel") { closeHabitForm(); return; }
    });

    document.getElementById("habit-list").addEventListener("click", function (e) {
      var toggleBtn = e.target.closest("[data-toggle-habit]");
      if (toggleBtn) {
        toggleHabitToday(toggleBtn.getAttribute("data-toggle-habit"));
        renderHabits();
        renderHome();
        return;
      }
      var delBtn = e.target.closest("[data-delete-habit]");
      if (delBtn) { deleteHabit(delBtn.getAttribute("data-delete-habit")); return; }
    });

    document.getElementById("practice-stage").addEventListener("click", function (e) {
      var t = e.target.closest("[data-pa]");
      if (!t) return;
      onPracticeAction(t.getAttribute("data-pa"));
    });
  }

  /* ───────────── init ───────────── */
  applyTheme();
  bind();
  renderHome();

  if (!TRIGGER_PRESETS.length) console.error("[Rewire] Presets not loaded.");
})();
