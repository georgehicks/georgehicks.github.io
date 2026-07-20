/**
 * Abide — realignment session, Scripture catalog, verse match, patterns
 */
(function () {
  "use strict";

  var LS_KEY = "abide-state-v1";
  var ROUND_SIZE = 10;
  var WINDOW_DAYS = 30;

  /* ───────────── state ───────────── */
  function defaultState() {
    return {
      theme: null,
      attempts: [],
      challengeStreak: 0,
      lastChallengeDate: null,
      totalChallengeRounds: 0,
      tagLog: [],
      identityLog: [],
      fractureLog: [],
      realignSessions: [],
      realignStreak: 0,
      lastRealignDate: null,
      triggers: [],
      rehearsalLog: [],
      renewStreak: 0,
      lastRenewDate: null
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        var d = defaultState();
        return Object.assign(d, parsed, {
          attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
          tagLog: Array.isArray(parsed.tagLog) ? parsed.tagLog : [],
          identityLog: Array.isArray(parsed.identityLog) ? parsed.identityLog : [],
          fractureLog: Array.isArray(parsed.fractureLog) ? parsed.fractureLog : [],
          realignSessions: Array.isArray(parsed.realignSessions) ? parsed.realignSessions : [],
          triggers: Array.isArray(parsed.triggers) ? parsed.triggers : [],
          rehearsalLog: Array.isArray(parsed.rehearsalLog) ? parsed.rehearsalLog : []
        });
      }
    } catch (e) {}
    return defaultState();
  }

  function saveState() {
    try {
      var cutoff = Date.now() - 120 * 864e5;
      state.attempts = (state.attempts || []).filter(function (a) {
        return new Date(a.ts).getTime() >= cutoff;
      });
      state.tagLog = (state.tagLog || []).filter(function (t) {
        return new Date(t.ts).getTime() >= cutoff;
      });
      state.identityLog = (state.identityLog || []).filter(function (t) {
        return new Date(t.ts).getTime() >= cutoff;
      });
      state.fractureLog = (state.fractureLog || []).filter(function (t) {
        return new Date(t.ts).getTime() >= cutoff;
      });
      state.rehearsalLog = (state.rehearsalLog || []).filter(function (r) {
        return new Date(r.ts).getTime() >= cutoff;
      });
      if (state.realignSessions.length > 90) {
        state.realignSessions = state.realignSessions.slice(-90);
      }
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  var state = loadState();

  /* ───────────── content ───────────── */
  var V = (window.AbideVerses && window.AbideVerses.VERSES) || [];
  var GROUPS = (window.AbideVerses && window.AbideVerses.GROUPS) || [];
  var RAW_ASSERTIONS = (window.AbideAssertions && window.AbideAssertions.ASSERTIONS) || [];
  var FEEL_PRESETS = (window.AbideAssertions && window.AbideAssertions.FEEL_PRESETS) || [];
  var BELIEF_PRESETS = (window.AbideAssertions && window.AbideAssertions.BELIEF_PRESETS) || [];
  var FRACTURES = (window.AbideFractures && window.AbideFractures.FRACTURES) || [];
  var TRIGGER_CATEGORIES = (window.AbideTriggers && window.AbideTriggers.TRIGGER_CATEGORIES) || [];
  var TRIGGER_TEMPLATES = (window.AbideTriggers && window.AbideTriggers.TRIGGER_TEMPLATES) || [];

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ───────────── customizable assertion ladder ───────────── */
  var LS_LADDER_KEY = "abide-custom-ladder-v1";
  var DEFAULT_LADDER = RAW_ASSERTIONS.filter(function (a) { return a.special !== "identity"; });
  var IDENTITY_STEP = RAW_ASSERTIONS.filter(function (a) { return a.special === "identity"; })[0] || null;

  function loadCustomLadder() {
    try {
      var raw = localStorage.getItem(LS_LADDER_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (e) {}
    return null;
  }

  function saveCustomLadder(ladder) {
    try { localStorage.setItem(LS_LADDER_KEY, JSON.stringify(ladder)); } catch (e) {}
  }

  var customLadder = loadCustomLadder();

  function computeAssertions() {
    var ladder = customLadder || DEFAULT_LADDER;
    return IDENTITY_STEP ? ladder.concat([IDENTITY_STEP]) : ladder.slice();
  }

  var ASSERTIONS = computeAssertions();

  function ensureCustomLadder() {
    if (!customLadder) {
      customLadder = (customLadder || DEFAULT_LADDER).map(function (a) {
        return { id: a.id, text: a.text, tier: a.tier };
      });
    }
  }

  function persistLadder() {
    saveCustomLadder(customLadder);
    ASSERTIONS = computeAssertions();
  }

  function slugify(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "step";
  }

  function uniqueId(base, existingIds) {
    var id = base, n = 2;
    while (existingIds.indexOf(id) !== -1) { id = base + "-" + n; n++; }
    return id;
  }

  function addAssertion(tier, text) {
    ensureCustomLadder();
    var existingIds = customLadder.map(function (a) { return a.id; });
    if (IDENTITY_STEP) existingIds.push(IDENTITY_STEP.id);
    var id = uniqueId(slugify(text), existingIds);
    customLadder.push({ id: id, text: text, tier: tier === "root" ? "root" : "capacity" });
    persistLadder();
  }

  function removeAssertion(id) {
    ensureCustomLadder();
    customLadder = customLadder.filter(function (a) { return a.id !== id; });
    persistLadder();
  }

  function moveAssertion(id, dir) {
    ensureCustomLadder();
    var idx = -1;
    for (var i = 0; i < customLadder.length; i++) {
      if (customLadder[i].id === id) { idx = i; break; }
    }
    if (idx === -1) return;
    var newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= customLadder.length) return;
    var tmp = customLadder[idx];
    customLadder[idx] = customLadder[newIdx];
    customLadder[newIdx] = tmp;
    persistLadder();
  }

  function editAssertionText(id, text) {
    ensureCustomLadder();
    for (var i = 0; i < customLadder.length; i++) {
      if (customLadder[i].id === id) { customLadder[i].text = text; break; }
    }
    persistLadder();
  }

  function resetLadder() {
    customLadder = null;
    try { localStorage.removeItem(LS_LADDER_KEY); } catch (e) {}
    ASSERTIONS = computeAssertions();
    renderSetup();
    renderHome();
  }

  function groupName(id) {
    for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].id === id) return GROUPS[i].short;
    return id;
  }

  function versesForAssertion(assertionId) {
    if (window.AbideVerses && window.AbideVerses.byAssertion) {
      return window.AbideVerses.byAssertion(assertionId);
    }
    return V.filter(function (v) {
      return v.assertions && v.assertions.indexOf(assertionId) !== -1;
    });
  }

  /* ───────────── time helpers ───────────── */
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

  function normalizeIdentity(s) {
    return String(s || "").trim().replace(/\s+/g, " ");
  }

  function identityKey(s) {
    return normalizeIdentity(s).toLowerCase();
  }

  /* ───────────── verse match stats ───────────── */
  function attemptsInWindow() {
    return state.attempts.filter(function (a) { return inWindow(a.ts); });
  }

  function statsForVerse(verseId) {
    var hits = 0, misses = 0;
    var list = attemptsInWindow();
    for (var i = 0; i < list.length; i++) {
      if (list[i].verseId !== verseId) continue;
      if (list[i].correct) hits++;
      else misses++;
    }
    return { hits: hits, misses: misses, total: hits + misses };
  }

  function globalStats30() {
    var list = attemptsInWindow();
    var hits = 0, misses = 0;
    var seen = {};
    for (var i = 0; i < list.length; i++) {
      if (list[i].correct) hits++;
      else misses++;
      seen[list[i].verseId] = true;
    }
    return {
      hits: hits,
      misses: misses,
      total: hits + misses,
      versesTouched: Object.keys(seen).length
    };
  }

  function recordAttempt(verseId, mode, correct) {
    state.attempts.push({
      verseId: verseId,
      mode: mode,
      correct: !!correct,
      ts: new Date().toISOString()
    });
    saveState();
  }

  /* ───────────── realign / tag / identity stats ───────────── */
  function tagsInWindow(type) {
    return state.tagLog.filter(function (t) {
      return inWindow(t.ts) && (!type || t.type === type);
    });
  }

  function fractureLabel(id) {
    for (var i = 0; i < FRACTURES.length; i++) {
      if (FRACTURES[i].id === id) return FRACTURES[i].label;
    }
    return id;
  }

  function fracturesInWindow() {
    return (state.fractureLog || []).filter(function (t) { return inWindow(t.ts); });
  }

  function countByText(list) {
    var map = {};
    for (var i = 0; i < list.length; i++) {
      var key = list[i].text;
      if (!map[key]) map[key] = 0;
      map[key]++;
    }
    return Object.keys(map).map(function (k) {
      return { text: k, n: map[k] };
    }).sort(function (a, b) { return b.n - a.n; });
  }

  function identityCounts() {
    var map = {};
    for (var i = 0; i < state.identityLog.length; i++) {
      var entry = state.identityLog[i];
      var k = identityKey(entry.text);
      if (!k) continue;
      if (!map[k]) map[k] = { text: normalizeIdentity(entry.text), n: 0 };
      map[k].n++;
      // keep latest casing/spacing for display
      map[k].text = normalizeIdentity(entry.text);
    }
    return Object.keys(map).map(function (k) {
      return map[k];
    }).sort(function (a, b) { return b.n - a.n || a.text.localeCompare(b.text); });
  }

  function frictionByAssertion() {
    var map = {};
    for (var i = 0; i < state.realignSessions.length; i++) {
      var s = state.realignSessions[i];
      if (!inWindow(s.ts || s.date)) continue;
      var results = s.results || [];
      for (var j = 0; j < results.length; j++) {
        var r = results[j];
        if (!map[r.id]) map[r.id] = { id: r.id, realigned: 0, agreed: 0, total: 0 };
        map[r.id].total++;
        if (r.realigned) map[r.id].realigned++;
        if (r.agreed) map[r.id].agreed++;
      }
    }
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return b.realigned - a.realigned || b.total - a.total; });
  }

  function assertionLabel(id) {
    for (var i = 0; i < ASSERTIONS.length; i++) {
      if (ASSERTIONS[i].id === id) return ASSERTIONS[i].text;
    }
    return id;
  }

  function findAssertionById(id) {
    for (var i = 0; i < ASSERTIONS.length; i++) {
      if (ASSERTIONS[i].id === id) return ASSERTIONS[i];
    }
    return null;
  }

  var STREAK_KEYS = {
    realign: { date: "lastRealignDate", streak: "realignStreak" },
    challenge: { date: "lastChallengeDate", streak: "challengeStreak" },
    renew: { date: "lastRenewDate", streak: "renewStreak" }
  };

  function bumpStreak(kind) {
    // kind: 'realign' | 'challenge' | 'renew'
    var keyDate = STREAK_KEYS[kind].date;
    var keyStreak = STREAK_KEYS[kind].streak;
    var today = todayStr();
    var prev = state[keyDate];
    if (prev === today) {
      // keep
    } else {
      var yest = new Date();
      yest.setDate(yest.getDate() - 1);
      var yestStr = yest.toISOString().slice(0, 10);
      if (prev === yestStr) state[keyStreak] = (state[keyStreak] || 0) + 1;
      else state[keyStreak] = 1;
    }
    state[keyDate] = today;
  }

  function realignHistory14() {
    var days = [];
    for (var i = 13; i >= 0; i--) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days.map(function (date) {
      var sessions = state.realignSessions.filter(function (s) {
        return (s.date || (s.ts && s.ts.slice(0, 10))) === date;
      });
      if (!sessions.length) return { date: date, level: "none" };
      var realigned = 0, total = 0;
      sessions.forEach(function (s) {
        (s.results || []).forEach(function (r) {
          if (r.id === "who-god-says") return;
          total++;
          if (r.realigned) realigned++;
        });
      });
      if (total === 0) return { date: date, level: "ok" };
      var ratio = realigned / total;
      if (ratio === 0) return { date: date, level: "ok" };
      if (ratio < 0.35) return { date: date, level: "partial" };
      return { date: date, level: "hard" };
    });
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

  /* ───────────── views ───────────── */
  var browseFilter = "all";
  var challenge = null;
  var realign = null;
  var examine = null;
  var activeSession = null; // 'challenge' | 'realign' | 'examine' | 'renew-practice'

  function showView(name) {
    var views = document.querySelectorAll(".view");
    for (var i = 0; i < views.length; i++) {
      views[i].classList.toggle("active", views[i].getAttribute("data-view") === name);
    }
    var inSession =
      (name === "challenge" && challenge && !challenge.done) ||
      (name === "realign" && realign && !realign.done) ||
      (name === "examine" && examine && !examine.done) ||
      (name === "renew-practice" && renewPractice && !renewPractice.done);
    document.getElementById("topbar").classList.toggle("in-session", !!inSession);
    activeSession = inSession ? name : null;
  }

  function renderHome() {
    document.getElementById("home-date").textContent = formatDate();
    var g = globalStats30();
    var sessions30 = state.realignSessions.filter(function (s) {
      return inWindow(s.ts || s.date);
    }).length;
    var acc = g.total ? Math.round((100 * g.hits) / g.total) + "%" : "—";

    document.getElementById("home-stats").innerHTML =
      '<div class="stat-card"><div class="stat-num">' + sessions30 + '</div><div class="stat-lbl">Sessions · 30d</div></div>' +
      '<div class="stat-card"><div class="stat-num">' + g.hits + "/" + (g.misses || 0) + '</div><div class="stat-lbl">Verse H/M</div></div>' +
      '<div class="stat-card"><div class="stat-num">' + acc + '</div><div class="stat-lbl">Match acc.</div></div>';

    document.getElementById("browse-cta-meta").textContent =
      V.length + " verses · " + g.versesTouched + " practiced · 30d";
    document.getElementById("challenge-cta-meta").textContent =
      "Ref ↔ text · " + ROUND_SIZE + " cards · both directions";
    document.getElementById("realign-cta-meta").textContent =
      ASSERTIONS.length + " steps · confess · tag · identity";
    document.getElementById("renew-cta-meta").textContent =
      state.triggers.length + (state.triggers.length === 1 ? " situation saved" : " situations saved");

    var renewPracticeMeta = document.getElementById("renew-practice-cta-meta");
    if (renewPracticeMeta) {
      renewPracticeMeta.textContent = state.triggers.length
        ? "Rehearse " + Math.min(RENEW_ROUND_SIZE, state.triggers.length) + " · self-report after"
        : "Add a situation first";
    }

    var streakRow = document.getElementById("streak-row");
    var streakItems = [];
    if (state.realignStreak > 0) streakItems.push('<div class="streak-item"><div class="streak-lbl">Abide</div><div class="streak-val">' + state.realignStreak + '</div></div>');
    if (state.challengeStreak > 0) streakItems.push('<div class="streak-item"><div class="streak-lbl">Match</div><div class="streak-val">' + state.challengeStreak + '</div></div>');
    if (state.renewStreak > 0) streakItems.push('<div class="streak-item"><div class="streak-lbl">Renew</div><div class="streak-val">' + state.renewStreak + '</div></div>');
    streakRow.innerHTML = streakItems.join("");
    streakRow.style.display = streakItems.length ? "flex" : "none";

    var strip = document.getElementById("home-history-strip");
    strip.innerHTML = realignHistory14().map(function (d) {
      var cls = d.level === "none" ? "" : d.level;
      return "<i class=\"" + cls + "\" title=\"" + d.date + "\"></i>";
    }).join("");
  }

  /* ───────────── browse ───────────── */
  function renderBrowse() {
    var chips = document.getElementById("group-chips");
    var html = '<button type="button" class="chip' + (browseFilter === "all" ? " active" : "") + '" data-group="all">All<span class="cnt">' + V.length + "</span></button>";
    for (var i = 0; i < GROUPS.length; i++) {
      var g = GROUPS[i];
      var n = V.filter(function (v) { return v.group === g.id; }).length;
      html += '<button type="button" class="chip' + (browseFilter === g.id ? " active" : "") + '" data-group="' + g.id + '">' +
        g.short + '<span class="cnt">' + n + "</span></button>";
    }
    chips.innerHTML = html;

    var list = browseFilter === "all" ? V.slice() : V.filter(function (v) { return v.group === browseFilter; });
    document.getElementById("browse-count").textContent = list.length + " · hits/misses last " + WINDOW_DAYS + "d";

    var listEl = document.getElementById("verse-list");
    if (!list.length) {
      listEl.innerHTML = '<p class="empty-note">No verses in this group.</p>';
      return;
    }

    var out = "";
    for (var j = 0; j < list.length; j++) {
      var v = list[j];
      var s = statsForVerse(v.id);
      var pills;
      if (s.total === 0) {
        pills = '<span class="none-pill">not practiced</span>';
      } else {
        pills =
          '<span class="hit-pill">' + s.hits + " hit" + (s.hits === 1 ? "" : "s") + "</span>" +
          '<span class="miss-pill">' + s.misses + " miss" + (s.misses === 1 ? "" : "es") + "</span>" +
          '<span class="accuracy-mini">' + Math.round((100 * s.hits) / s.total) + "%</span>";
      }
      out +=
        '<article class="verse-card">' +
          '<div class="verse-card-head">' +
            '<div class="verse-ref">' + escapeHtml(v.ref) + "</div>" +
            '<div class="verse-group-tag">' + escapeHtml(groupName(v.group)) + "</div>" +
          "</div>" +
          '<p class="verse-text">"' + escapeHtml(v.text) + '"</p>' +
          '<div class="verse-stats">' + pills + "</div>" +
        "</article>";
    }
    listEl.innerHTML = out;
  }

  /* ───────────── challenge ───────────── */
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function pickDistractors(correct, n) {
    var pool = V.filter(function (v) { return v.id !== correct.id; });
    var same = pool.filter(function (v) { return v.group === correct.group; });
    var rest = pool.filter(function (v) { return v.group !== correct.group; });
    return shuffle(same).concat(shuffle(rest)).slice(0, n);
  }

  function weightVerse(v) {
    var s = statsForVerse(v.id);
    if (s.total === 0) return 5;
    if (s.misses > s.hits) return 4;
    if (s.misses > 0) return 3;
    return 1;
  }

  function pickRoundVerses(count) {
    var weighted = [];
    for (var i = 0; i < V.length; i++) {
      var w = weightVerse(V[i]);
      for (var k = 0; k < w; k++) weighted.push(V[i]);
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

  function truncate(s, n) {
    if (s.length <= n) return s;
    return s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
  }

  function startChallenge() {
    if (!V.length) return;
    var verses = pickRoundVerses(Math.min(ROUND_SIZE, V.length));
    var flip = Math.random() < 0.5;
    var cards = verses.map(function (v, idx) {
      var mode = (idx % 2 === 0) !== flip ? "ref-to-text" : "text-to-ref";
      return { verse: v, mode: mode, result: null };
    });
    challenge = { cards: cards, index: 0, hits: 0, misses: 0, done: false, answered: false };
    showView("challenge");
    renderChallengeRound();
  }

  function renderChallengeTrack() {
    var track = document.getElementById("challenge-track");
    if (!challenge) { track.innerHTML = ""; return; }
    var html = "";
    for (var i = 0; i < challenge.cards.length; i++) {
      var cls = "";
      if (challenge.cards[i].result === true) cls = "done";
      else if (challenge.cards[i].result === false) cls = "miss";
      else if (i === challenge.index && !challenge.done) cls = "now";
      html += "<span class=\"" + cls + "\"></span>";
    }
    track.innerHTML = html;
  }

  function renderChallengeRound() {
    var roundEl = document.getElementById("challenge-round");
    var sumEl = document.getElementById("challenge-summary");
    sumEl.style.display = "none";
    roundEl.style.display = "block";

    if (!challenge || challenge.done) {
      renderChallengeSummary();
      return;
    }

    renderChallengeTrack();
    var card = challenge.cards[challenge.index];
    var v = card.verse;
    var mode = card.mode;
    challenge.answered = false;

    var options = shuffle([v].concat(pickDistractors(v, 3)));
    var promptHtml, choicesHtml = "";
    if (mode === "ref-to-text") {
      promptHtml =
        '<div class="mode-tag">Reference → text</div>' +
        '<div class="prompt-card"><p class="prompt-ref">' + escapeHtml(v.ref) + "</p></div>" +
        '<p class="stage-instruction">Which verse is this?</p>';
      for (var i = 0; i < options.length; i++) {
        choicesHtml +=
          '<button type="button" class="choice-btn" data-id="' + options[i].id + '">' +
          escapeHtml(truncate(options[i].text, 160)) +
          "</button>";
      }
    } else {
      promptHtml =
        '<div class="mode-tag">Text → reference</div>' +
        '<div class="prompt-card"><p class="prompt-text">"' + escapeHtml(v.text) + '"</p></div>' +
        '<p class="stage-instruction">What is the reference?</p>';
      for (var j = 0; j < options.length; j++) {
        choicesHtml +=
          '<button type="button" class="choice-btn" data-id="' + options[j].id + '">' +
          '<span class="choice-ref">' + escapeHtml(options[j].ref) + "</span>" +
          "</button>";
      }
    }

    roundEl.innerHTML =
      promptHtml +
      '<div class="choice-list" id="choice-list">' + choicesHtml + "</div>" +
      '<div class="feedback" id="challenge-feedback"></div>' +
      '<button type="button" class="continue-btn" id="challenge-continue" disabled>Continue</button>';
  }

  function onChoice(verseId) {
    if (!challenge || challenge.answered || challenge.done) return;
    var card = challenge.cards[challenge.index];
    var correct = verseId === card.verse.id;
    challenge.answered = true;
    card.result = correct;
    if (correct) challenge.hits++;
    else challenge.misses++;
    recordAttempt(card.verse.id, card.mode, correct);

    var buttons = document.querySelectorAll("#choice-list .choice-btn");
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var id = parseInt(btn.getAttribute("data-id"), 10);
      btn.disabled = true;
      if (id === card.verse.id) btn.classList.add("correct");
      else if (id === verseId && !correct) btn.classList.add("wrong");
      else btn.classList.add("dim");
    }

    var fb = document.getElementById("challenge-feedback");
    fb.innerHTML = correct
      ? '<span class="fb-ok">Yes — rooted.</span>'
      : '<span class="fb-bad">Not quite.</span> <span style="color:var(--ink-muted)">' + escapeHtml(card.verse.ref) + "</span>";

    document.getElementById("challenge-continue").disabled = false;
    renderChallengeTrack();
  }

  function challengeContinue() {
    if (!challenge) return;
    if (challenge.index >= challenge.cards.length - 1) {
      finishChallenge();
      return;
    }
    challenge.index++;
    challenge.answered = false;
    renderChallengeRound();
  }

  function finishChallenge() {
    challenge.done = true;
    bumpStreak("challenge");
    state.totalChallengeRounds += 1;
    saveState();
    document.getElementById("topbar").classList.remove("in-session");
    renderChallengeSummary();
  }

  function renderChallengeSummary() {
    renderChallengeTrack();
    var roundEl = document.getElementById("challenge-round");
    var sumEl = document.getElementById("challenge-summary");
    roundEl.style.display = "none";
    sumEl.style.display = "block";
    var total = challenge.hits + challenge.misses;
    var pct = total ? Math.round((100 * challenge.hits) / total) : 0;
    sumEl.innerHTML =
      '<div class="summary">' +
        '<div class="summary-big">' + challenge.hits + "/" + total + "</div>" +
        '<div class="summary-sub">' + pct + "% · saved to last " + WINDOW_DAYS + " days</div>" +
        '<button type="button" class="cta-btn" id="summary-again">Play again</button>' +
        '<button type="button" class="link-btn" id="summary-browse" style="display:block;margin:1rem auto 0">Browse catalog</button>' +
        '<button type="button" class="link-btn" id="summary-home" style="display:block;margin:0.5rem auto 0">← Home</button>' +
      "</div>";
    document.getElementById("summary-again").onclick = startChallenge;
    document.getElementById("summary-browse").onclick = function () {
      challenge = null;
      showView("browse");
      renderBrowse();
    };
    document.getElementById("summary-home").onclick = goHome;
  }

  /* ───────────── realignment session ───────────── */
  /*
    realign = {
      index, phase: 'assert'|'confess'|'ask'|'reassert'|'tag'|'identity'|'done',
      results: [{id, agreed, realigned}],
      currentTags: { feels:Set-like array, beliefs: array, fractures: array },
      sessionTags: [],
      identityPicked: [],
      identityCustom: '',
      done: false
    }
  */

  function startRealign() {
    if (!ASSERTIONS.length) return;
    realign = {
      index: 0,
      phase: "assert",
      results: [],
      currentTags: { feels: [], beliefs: [], fractures: [] },
      sessionTags: [],
      identityPicked: [],
      identityCustom: "",
      notes: { confess: "", know: "", do: "" },
      done: false
    };
    showView("realign");
    renderRealign();
  }

  function currentAssertion() {
    return ASSERTIONS[realign.index];
  }

  function renderRealignTrack() {
    var track = document.getElementById("realign-track");
    if (!realign) { track.innerHTML = ""; return; }
    var html = "";
    for (var i = 0; i < ASSERTIONS.length; i++) {
      var cls = "";
      var res = null;
      for (var j = 0; j < realign.results.length; j++) {
        if (realign.results[j].id === ASSERTIONS[i].id) { res = realign.results[j]; break; }
      }
      if (res) {
        if (res.realigned) cls = "realigned";
        else if (res.agreed) cls = "done";
        else cls = "miss";
      } else if (i === realign.index && !realign.done) {
        cls = "now";
      }
      html += "<span class=\"" + cls + "\"></span>";
    }
    track.innerHTML = html;
  }

  function linkedVerseHtml(assertionId) {
    var list = versesForAssertion(assertionId);
    if (!list.length) return "";
    var v = list[Math.floor(Math.random() * list.length)];
    return (
      '<div class="linked-verse">' +
        '<div class="lv-ref">' + escapeHtml(v.ref) + "</div>" +
        '<div class="lv-text">"' + escapeHtml(truncate(v.text, 180)) + '"</div>' +
      "</div>"
    );
  }

  function renderRealign() {
    var stage = document.getElementById("realign-stage");
    if (!realign) return;
    renderRealignTrack();

    if (realign.done || realign.phase === "done") {
      stage.innerHTML = renderRealignSummary();
      bindRealignSummary();
      return;
    }

    var a = currentAssertion();
    if (!a) {
      finishRealign();
      return;
    }

    if (a.special === "identity") {
      realign.phase = "identity";
      stage.innerHTML = renderIdentityStep();
      bindIdentityStep();
      return;
    }

    if (realign.phase === "assert" || realign.phase === "reassert") {
      stage.innerHTML = renderAssertStep(a);
      return;
    }
    if (realign.phase === "confess") {
      stage.innerHTML = renderConfessStep(a);
      return;
    }
    if (realign.phase === "ask") {
      stage.innerHTML = renderAskStep(a);
      return;
    }
    if (realign.phase === "tag") {
      stage.innerHTML = renderTagStep(a);
      bindTagStep();
      return;
    }
  }

  function tierLabel(tier) {
    if (tier === "root") return "Root · who God is";
    if (tier === "capacity") return "In Christ · capacity";
    if (tier === "identity") return "Identity";
    return "";
  }

  function renderAssertStep(a) {
    var reasserting = realign.phase === "reassert";
    return (
      '<div class="step-tag">' + (reasserting ? "Re-assert" : "Assertion") +
        " · " + (realign.index + 1) + " / " + ASSERTIONS.length + "</div>" +
      '<p class="tier-label">' + escapeHtml(tierLabel(a.tier)) + "</p>" +
      '<div class="prompt-card"><p class="assertion-text">' + escapeHtml(a.text) + "</p>" +
        (reasserting ? linkedVerseHtml(a.id) : "") +
      "</div>" +
      '<p class="stage-instruction">' +
        (reasserting
          ? "When you are ready — can you stand in this with Him?"
          : "Can you honestly stand in this right now?") +
      "</p>" +
      '<div class="gate-row">' +
        '<button type="button" class="gate-btn primary" data-ra="yes">' +
          (reasserting ? "Yes — I stand in this" : "Yes") +
        "</button>" +
        '<button type="button" class="gate-btn soft" data-ra="no">' +
          (reasserting ? "Not yet — continue with grace" : "Not yet") +
        "</button>" +
      "</div>"
    );
  }

  function renderConfessStep(a) {
    return (
      '<div class="step-tag">Confess</div>' +
      '<div class="prompt-card"><p class="assertion-text" style="font-size:1.1rem">Bring this to God.</p>' +
        '<p class="stage-instruction" style="margin:0.75rem 0 0">You could not yet stand in:</p>' +
        '<p class="prompt-text" style="margin-top:0.4rem">"' + escapeHtml(a.text) + '"</p>' +
      "</div>" +
      '<p class="field-label">Optional — name it before Him</p>' +
      '<textarea class="text-area" id="confess-note" placeholder="Father, I confess…">' +
        escapeHtml(realign.notes.confess || "") +
      "</textarea>" +
      '<button type="button" class="continue-btn" data-ra="confess-next">I have brought it to You</button>'
    );
  }

  function renderAskStep(a) {
    return (
      '<div class="step-tag">Ask</div>' +
      '<div class="prompt-card">' +
        '<p class="assertion-text" style="font-size:1.15rem">Ask Him what to know and do.</p>' +
        linkedVerseHtml(a.id) +
      "</div>" +
      '<p class="field-label">What do You want me to know?</p>' +
      '<textarea class="text-area" id="ask-know" placeholder="Optional">' +
        escapeHtml(realign.notes.know || "") +
      "</textarea>" +
      '<p class="field-label">What do You want me to do?</p>' +
      '<textarea class="text-area" id="ask-do" placeholder="Optional">' +
        escapeHtml(realign.notes.do || "") +
      "</textarea>" +
      '<button type="button" class="continue-btn" data-ra="ask-next">I have asked — continue</button>'
    );
  }

  function renderTagStep(a) {
    var feelChips = FEEL_PRESETS.map(function (f) {
      var sel = realign.currentTags.feels.indexOf(f) !== -1 ? " selected" : "";
      return '<button type="button" class="chip' + sel + '" data-feel="' + escapeHtml(f) + '">I feel ' + escapeHtml(f) + "</button>";
    }).join("");

    var beliefChips = BELIEF_PRESETS.map(function (b) {
      var sel = realign.currentTags.beliefs.indexOf(b) !== -1 ? " selected" : "";
      return '<button type="button" class="chip' + sel + '" data-belief="' + escapeHtml(b) + '">' + escapeHtml(b) + "</button>";
    }).join("");

    var fractureChips = FRACTURES.map(function (f) {
      var sel = realign.currentTags.fractures.indexOf(f.id) !== -1 ? " selected" : "";
      return '<button type="button" class="chip' + sel + '" data-fracture="' + escapeHtml(f.id) + '">' + escapeHtml(f.label) + "</button>";
    }).join("");

    return (
      '<div class="step-tag">Capture</div>' +
      '<div class="prompt-card"><p class="assertion-text" style="font-size:1.1rem">Name what showed up.</p>' +
        '<p class="stage-instruction" style="margin:0.5rem 0 0">Optional — helps you see patterns over time.</p>' +
      "</div>" +
      '<p class="field-label">I feel…</p>' +
      '<div class="chip-row" id="feel-chips">' + feelChips + "</div>" +
      '<input class="text-input" id="feel-custom" placeholder="Other feeling…" />' +
      '<p class="field-label">False belief</p>' +
      '<div class="chip-row" id="belief-chips">' + beliefChips + "</div>" +
      '<input class="text-input" id="belief-custom" placeholder="Other belief (e.g. I am…)" />' +
      (fractureChips
        ? '<p class="field-label">This might be…</p>' +
          '<div class="chip-row" id="fracture-chips">' + fractureChips + "</div>"
        : "") +
      '<button type="button" class="continue-btn" data-ra="tag-next">Continue</button>' +
      '<button type="button" class="continue-btn secondary" data-ra="tag-skip" style="margin-top:0.5rem">Skip tags</button>'
    );
  }

  function renderIdentityStep() {
    var counts = identityCounts();
    var chips = counts.slice(0, 24).map(function (c) {
      var picked = realign.identityPicked.indexOf(c.text) !== -1 ||
        realign.identityPicked.some(function (p) { return identityKey(p) === identityKey(c.text); });
      return (
        '<button type="button" class="id-chip' + (picked ? " picked" : "") + '" data-id-text="' + escapeHtml(c.text) + '">' +
          escapeHtml(c.text) + '<span class="n">' + c.n + "</span>" +
        "</button>"
      );
    }).join("");

    return (
      '<div class="step-tag">Identity · final</div>' +
      '<div class="prompt-card">' +
        '<p class="assertion-text">Who does God say I am?</p>' +
        '<p class="stage-instruction" style="margin:0.65rem 0 0">Receive — then name it. Prior answers appear as chips with counts.</p>' +
      "</div>" +
      (chips
        ? '<p class="field-label">From prior sessions</p><div class="identity-chip-list" id="id-chips">' + chips + "</div>"
        : '<p class="empty-note" style="margin-bottom:0.8rem">No prior identity words yet — this session begins the count.</p>') +
      '<p class="field-label">Add or write</p>' +
      '<input class="text-input" id="identity-input" placeholder="beloved, son, free, held…" value="' +
        escapeHtml(realign.identityCustom || "") + '" />' +
      '<button type="button" class="continue-btn" data-ra="identity-finish">Receive &amp; finish</button>'
    );
  }

  function renderRealignSummary() {
    var agreed = 0, realigned = 0;
    realign.results.forEach(function (r) {
      if (r.id === "who-god-says") return;
      if (r.agreed) agreed++;
      if (r.realigned) realigned++;
    });
    var ladder = ASSERTIONS.filter(function (a) { return a.special !== "identity"; }).length;
    var ids = (realign.identityPicked || []).slice();
    if (realign.identityCustom && normalizeIdentity(realign.identityCustom)) {
      // already merged on finish
    }
    var idLine = ids.length
      ? ids.map(function (t) { return escapeHtml(t); }).join(" · ")
      : "—";

    return (
      '<div class="summary">' +
        '<div class="summary-big">' + agreed + "/" + ladder + "</div>" +
        '<div class="summary-sub">stood in truth' +
          (realigned ? " · " + realigned + " realigned" : "") +
        "</div>" +
        '<div class="note-card" style="text-align:left">' +
          "<strong>Who God says you are</strong><br>" + idLine +
        "</div>" +
        (realign.sessionTags.length
          ? '<div class="note-card" style="text-align:left"><strong>Captured</strong><br>' +
            realign.sessionTags.map(function (t) {
              return escapeHtml(t.type === "feel" ? "I feel " + t.text : t.text);
            }).join(" · ") +
            "</div>"
          : "") +
        '<button type="button" class="cta-btn" id="rs-patterns">See patterns</button>' +
        '<button type="button" class="link-btn" id="rs-home" style="display:block;margin:1rem auto 0">← Home</button>' +
      "</div>"
    );
  }

  function bindRealignSummary() {
    var p = document.getElementById("rs-patterns");
    var h = document.getElementById("rs-home");
    if (p) p.onclick = function () { realign = null; showView("patterns"); renderPatterns(); };
    if (h) h.onclick = goHome;
  }

  function bindTagStep() {
    // chips handled via delegated click on stage
  }

  function bindIdentityStep() {
    // delegated
  }

  function pushResult(agreed, realignedFlag) {
    var a = currentAssertion();
    realign.results.push({
      id: a.id,
      agreed: !!agreed,
      realigned: !!realignedFlag
    });
  }

  function commitTagsForCurrent() {
    var a = currentAssertion();
    var ts = new Date().toISOString();
    var feels = realign.currentTags.feels.slice();
    var beliefs = realign.currentTags.beliefs.slice();
    var fc = document.getElementById("feel-custom");
    var bc = document.getElementById("belief-custom");
    if (fc && fc.value.trim()) feels.push(fc.value.trim());
    if (bc && bc.value.trim()) beliefs.push(bc.value.trim());

    feels.forEach(function (text) {
      var entry = { type: "feel", text: text, assertionId: a.id, ts: ts };
      state.tagLog.push(entry);
      realign.sessionTags.push(entry);
    });
    beliefs.forEach(function (text) {
      var entry = { type: "belief", text: text, assertionId: a.id, ts: ts };
      state.tagLog.push(entry);
      realign.sessionTags.push(entry);
    });
    realign.currentTags.fractures.forEach(function (fid) {
      state.fractureLog.push({ category: fid, source: "realign-tag", assertionId: a.id, ts: ts });
      realign.sessionTags.push({ type: "fracture", text: fractureLabel(fid), assertionId: a.id, ts: ts });
    });
    realign.currentTags = { feels: [], beliefs: [], fractures: [] };
  }

  function advanceAfterAssert(agreed, cameFromRealign) {
    var a = currentAssertion();
    if (agreed) {
      pushResult(true, !!cameFromRealign);
      realign.notes = { confess: "", know: "", do: "" };
      nextAssertion();
      return;
    }
    // not yet
    if (realign.phase === "assert") {
      realign.phase = "confess";
      renderRealign();
      return;
    }
    // reassert still no — grace continue, mark realigned attempt without full agree
    pushResult(false, true);
    realign.phase = "tag";
    renderRealign();
  }

  function nextAssertion() {
    realign.index++;
    realign.phase = "assert";
    realign.notes = { confess: "", know: "", do: "" };
    realign.currentTags = { feels: [], beliefs: [], fractures: [] };
    if (realign.index >= ASSERTIONS.length) {
      finishRealign();
      return;
    }
    renderRealign();
  }

  function finishRealign() {
    // merge identity from custom if still on identity phase path
    realign.done = true;
    realign.phase = "done";

    var ts = new Date().toISOString();
    var date = todayStr();

    // Ensure identity result exists
    var hasId = realign.results.some(function (r) { return r.id === "who-god-says"; });
    if (!hasId) {
      realign.results.push({ id: "who-god-says", agreed: true, realigned: false });
    }

    state.realignSessions.push({
      date: date,
      ts: ts,
      results: realign.results.slice(),
      tags: realign.sessionTags.slice(),
      identity: realign.identityPicked.slice()
    });
    bumpStreak("realign");
    saveState();
    document.getElementById("topbar").classList.remove("in-session");
    renderRealign();
  }

  function finishIdentity() {
    var input = document.getElementById("identity-input");
    if (input && input.value.trim()) {
      var custom = normalizeIdentity(input.value);
      var exists = realign.identityPicked.some(function (p) {
        return identityKey(p) === identityKey(custom);
      });
      if (!exists) realign.identityPicked.push(custom);
      realign.identityCustom = custom;
    }

    var ts = new Date().toISOString();
    realign.identityPicked.forEach(function (text) {
      var n = normalizeIdentity(text);
      if (!n) return;
      state.identityLog.push({ text: n, ts: ts });
    });

    pushResult(true, false);
    finishRealign();
  }

  function onRealignAction(action, el) {
    if (!realign || realign.done) return;
    var a = currentAssertion();

    if (action === "yes") {
      if (realign.phase === "reassert") {
        // after realign path, capture tags then continue
        pushResult(true, true);
        realign.phase = "tag";
        renderRealign();
      } else {
        advanceAfterAssert(true, false);
      }
      return;
    }
    if (action === "no") {
      advanceAfterAssert(false, realign.phase === "reassert");
      return;
    }
    if (action === "confess-next") {
      var cn = document.getElementById("confess-note");
      if (cn) realign.notes.confess = cn.value;
      realign.phase = "ask";
      renderRealign();
      return;
    }
    if (action === "ask-next") {
      var kn = document.getElementById("ask-know");
      var dn = document.getElementById("ask-do");
      if (kn) realign.notes.know = kn.value;
      if (dn) realign.notes.do = dn.value;
      realign.phase = "reassert";
      renderRealign();
      return;
    }
    if (action === "tag-next") {
      commitTagsForCurrent();
      saveState();
      nextAssertion();
      return;
    }
    if (action === "tag-skip") {
      realign.currentTags = { feels: [], beliefs: [], fractures: [] };
      nextAssertion();
      return;
    }
    if (action === "identity-finish") {
      finishIdentity();
      return;
    }

    // chip toggles
    if (el && el.hasAttribute("data-feel")) {
      var f = el.getAttribute("data-feel");
      toggleInArray(realign.currentTags.feels, f);
      el.classList.toggle("selected");
      return;
    }
    if (el && el.hasAttribute("data-belief")) {
      var b = el.getAttribute("data-belief");
      toggleInArray(realign.currentTags.beliefs, b);
      el.classList.toggle("selected");
      return;
    }
    if (el && el.hasAttribute("data-fracture")) {
      var frac = el.getAttribute("data-fracture");
      toggleInArray(realign.currentTags.fractures, frac);
      el.classList.toggle("selected");
      return;
    }
    if (el && el.hasAttribute("data-id-text")) {
      var t = el.getAttribute("data-id-text");
      var idx = -1;
      for (var i = 0; i < realign.identityPicked.length; i++) {
        if (identityKey(realign.identityPicked[i]) === identityKey(t)) { idx = i; break; }
      }
      if (idx >= 0) realign.identityPicked.splice(idx, 1);
      else realign.identityPicked.push(t);
      el.classList.toggle("picked");
      return;
    }
  }

  function toggleInArray(arr, val) {
    var i = arr.indexOf(val);
    if (i >= 0) arr.splice(i, 1);
    else arr.push(val);
  }

  /* ───────────── examine: soul fracture exploration ─────────────
    examine = {
      category: { id, label, framing, prompt, assertionId },
      assertion: { id, text, tier },
      phase: 'intro'|'discern'|'clear'|'confess'|'reassert'|'note',
      introNote, confessNote, finalNote: string,
      outcome: null|'clear'|'found',
      agreed, realigned, done: boolean
    }
  */
  function openExamineHub() {
    examine = null;
    showView("examine");
    document.getElementById("examine-hub").style.display = "block";
    document.getElementById("examine-session").style.display = "none";
    renderExamineHub();
  }

  function renderExamineHub() {
    var body = document.getElementById("examine-cards");
    var counts = {};
    fracturesInWindow().forEach(function (t) {
      if (!counts[t.category]) counts[t.category] = { clear: 0, found: 0 };
      if (t.source === "examine" && t.outcome === "clear") counts[t.category].clear++;
      else counts[t.category].found++;
    });
    body.innerHTML = FRACTURES.map(function (f) {
      var c = counts[f.id];
      var meta;
      if (!c || (!c.clear && !c.found)) {
        meta = "not yet explored";
      } else {
        var parts = [];
        if (c.clear) parts.push(c.clear + " clear");
        if (c.found) parts.push(c.found + " found");
        meta = parts.join(" · ") + " · 30d";
      }
      return (
        '<button type="button" class="fracture-card" data-fracture="' + escapeHtml(f.id) + '">' +
          '<div class="fracture-card-label">' + escapeHtml(f.label) + "</div>" +
          '<div class="fracture-card-framing">' + escapeHtml(f.framing) + "</div>" +
          '<div class="fracture-card-meta">' + meta + "</div>" +
        "</button>"
      );
    }).join("");
  }

  function startExamine(catId) {
    var cat = null;
    for (var i = 0; i < FRACTURES.length; i++) {
      if (FRACTURES[i].id === catId) { cat = FRACTURES[i]; break; }
    }
    if (!cat) return;
    var assertion = null;
    for (var j = 0; j < ASSERTIONS.length; j++) {
      if (ASSERTIONS[j].id === cat.assertionId) { assertion = ASSERTIONS[j]; break; }
    }
    if (!assertion) assertion = { id: cat.assertionId, text: cat.label, tier: "capacity" };

    examine = {
      category: cat,
      assertion: assertion,
      phase: "intro",
      introNote: "",
      confessNote: "",
      finalNote: "",
      outcome: null,
      agreed: false,
      realigned: false,
      done: false
    };
    showView("examine");
    document.getElementById("examine-hub").style.display = "none";
    document.getElementById("examine-session").style.display = "block";
    renderExamine();
  }

  function renderExamine() {
    var stage = document.getElementById("examine-stage");
    if (!examine) return;
    if (examine.done) {
      stage.innerHTML = renderExamineSummary();
      bindExamineSummary();
      return;
    }
    if (examine.phase === "intro") { stage.innerHTML = renderExamineIntro(); return; }
    if (examine.phase === "discern") { stage.innerHTML = renderExamineDiscern(); return; }
    if (examine.phase === "clear") { stage.innerHTML = renderExamineClear(); return; }
    if (examine.phase === "confess") { stage.innerHTML = renderExamineConfess(); return; }
    if (examine.phase === "reassert") { stage.innerHTML = renderExamineReassert(); return; }
    if (examine.phase === "note") { stage.innerHTML = renderExamineNote(); return; }
  }

  function renderExamineIntro() {
    var cat = examine.category;
    return (
      '<div class="step-tag">Examine · ' + escapeHtml(cat.label) + "</div>" +
      '<div class="prompt-card">' +
        '<p class="assertion-text" style="font-size:1.1rem">' + escapeHtml(cat.framing) + "</p>" +
        '<p class="stage-instruction" style="margin:0.85rem 0 0">Ask the Spirit to search you here. Wait quietly before you answer.</p>' +
      "</div>" +
      '<p class="field-label">What surfaces as you wait? (optional)</p>' +
      '<textarea class="text-area" id="examine-intro-note" placeholder="Write what comes to mind…">' +
        escapeHtml(examine.introNote || "") +
      "</textarea>" +
      '<button type="button" class="continue-btn" data-ex="intro-next">I&rsquo;ve listened — continue</button>'
    );
  }

  function renderExamineDiscern() {
    var cat = examine.category;
    return (
      '<div class="step-tag">Discern</div>' +
      '<div class="prompt-card"><p class="assertion-text" style="font-size:1.15rem">' + escapeHtml(cat.prompt) + "</p></div>" +
      '<p class="stage-instruction">Answer honestly before Him — either is a good and true answer.</p>' +
      '<div class="gate-row">' +
        '<button type="button" class="gate-btn primary" data-ex="clear">All clear</button>' +
        '<button type="button" class="gate-btn soft" data-ex="found">Something&rsquo;s here</button>' +
      "</div>"
    );
  }

  function renderExamineClear() {
    var a = examine.assertion;
    return (
      '<div class="step-tag">Clear</div>' +
      '<div class="prompt-card"><p class="assertion-text" style="font-size:1.1rem">Good. Stand in it.</p>' +
        '<p class="prompt-text" style="margin-top:0.6rem">"' + escapeHtml(a.text) + '"</p>' +
        linkedVerseHtml(a.id) +
      "</div>" +
      '<button type="button" class="continue-btn" data-ex="clear-next">Continue</button>'
    );
  }

  function renderExamineReassert() {
    var a = examine.assertion;
    return (
      '<div class="step-tag">Re-assert</div>' +
      '<div class="prompt-card"><p class="assertion-text">' + escapeHtml(a.text) + "</p>" +
        linkedVerseHtml(a.id) +
      "</div>" +
      '<p class="stage-instruction">When you are ready — can you stand in this with Him?</p>' +
      '<div class="gate-row">' +
        '<button type="button" class="gate-btn primary" data-ex="yes">Yes — I stand in this</button>' +
        '<button type="button" class="gate-btn soft" data-ex="no">Not yet — continue with grace</button>' +
      "</div>"
    );
  }

  function renderExamineConfess() {
    return (
      '<div class="step-tag">Confess</div>' +
      '<div class="prompt-card"><p class="assertion-text" style="font-size:1.1rem">Bring it to God.</p>' +
        '<p class="stage-instruction" style="margin:0.75rem 0 0">Unpack what surfaced, and confess and repent as He leads.</p>' +
      "</div>" +
      '<p class="field-label">Optional — name it before Him</p>' +
      '<textarea class="text-area" id="examine-confess-note" placeholder="Father, I confess…">' +
        escapeHtml(examine.confessNote || "") +
      "</textarea>" +
      '<button type="button" class="continue-btn" data-ex="confess-next">I have brought it to You</button>'
    );
  }

  function renderExamineNote() {
    return (
      '<div class="step-tag">Reflect</div>' +
      '<div class="prompt-card"><p class="assertion-text" style="font-size:1.1rem">' + escapeHtml(examine.assertion.text) + "</p></div>" +
      '<p class="field-label">Anything else to name? (optional)</p>' +
      '<textarea class="text-area" id="examine-final-note" placeholder="Optional">' +
        escapeHtml(examine.finalNote || "") +
      "</textarea>" +
      '<button type="button" class="continue-btn" data-ex="finish">Finish</button>'
    );
  }

  function renderExamineSummary() {
    var big = examine.outcome === "clear" ? "All clear" : (examine.agreed ? "Stood in truth" : "Brought to grace");
    return (
      '<div class="summary">' +
        '<div class="summary-big" style="font-size:1.55rem">' + big + "</div>" +
        '<div class="summary-sub">' + escapeHtml(examine.category.label) + " · " + escapeHtml(examine.assertion.text) + "</div>" +
        '<button type="button" class="cta-btn" id="ex-another">Explore another</button>' +
        '<button type="button" class="link-btn" id="ex-home" style="display:block;margin:1rem auto 0">← Home</button>' +
      "</div>"
    );
  }

  function bindExamineSummary() {
    var again = document.getElementById("ex-another");
    var home = document.getElementById("ex-home");
    if (again) again.onclick = openExamineHub;
    if (home) home.onclick = goHome;
  }

  function finishExamine() {
    examine.done = true;
    var note = [examine.introNote, examine.confessNote, examine.finalNote]
      .map(function (s) { return (s || "").trim(); })
      .filter(Boolean)
      .join(" / ");
    state.fractureLog.push({
      category: examine.category.id,
      source: "examine",
      assertionId: examine.assertion.id,
      outcome: examine.outcome,
      agreed: !!examine.agreed,
      realigned: !!examine.realigned,
      note: note,
      ts: new Date().toISOString()
    });
    saveState();
    document.getElementById("topbar").classList.remove("in-session");
    renderExamine();
  }

  function onExamineAction(action) {
    if (!examine || examine.done) return;
    if (action === "intro-next") {
      var n = document.getElementById("examine-intro-note");
      if (n) examine.introNote = n.value;
      examine.phase = "discern";
      renderExamine();
      return;
    }
    if (action === "clear") {
      examine.outcome = "clear";
      examine.agreed = true;
      examine.phase = "clear";
      renderExamine();
      return;
    }
    if (action === "clear-next") {
      examine.phase = "note";
      renderExamine();
      return;
    }
    if (action === "found") {
      examine.outcome = "found";
      examine.phase = "confess";
      renderExamine();
      return;
    }
    if (action === "confess-next") {
      var c = document.getElementById("examine-confess-note");
      if (c) examine.confessNote = c.value;
      examine.phase = "reassert";
      renderExamine();
      return;
    }
    if (action === "yes") {
      examine.agreed = true;
      examine.realigned = true;
      examine.phase = "note";
      renderExamine();
      return;
    }
    if (action === "no") {
      examine.agreed = false;
      examine.realigned = true;
      examine.phase = "note";
      renderExamine();
      return;
    }
    if (action === "finish") {
      var f = document.getElementById("examine-final-note");
      if (f) examine.finalNote = f.value;
      finishExamine();
      return;
    }
  }

  /* ───────────── renew: pre-decide your response, with God ─────────────
    trigger = { id, situation, oldReaction, response, assertionId, note, createdAt }
    renewFormState = { editingId } or { editingId: null, situation, oldReaction, response, assertionId, note }
    renewPractice = { queue: [triggerId], index, phase: 'rehearse'|'report', results: [{triggerId, selfReport}], done }
  */
  var renewFormState = null;
  var renewTemplateCategoryFilter = "all";
  var renewPractice = null;
  var renewExpandedIds = {};
  var RENEW_ROUND_SIZE = 5;

  function syncRenewChrome() {
    var formOpen = !!renewFormState;
    var actions = document.getElementById("renew-actions");
    var list = document.getElementById("renew-list");
    if (actions) actions.style.display = formOpen ? "none" : "";
    if (list) list.style.display = formOpen ? "none" : "";
  }

  function findRenewTrigger(id) {
    for (var i = 0; i < state.triggers.length; i++) {
      if (state.triggers[i].id === id) return state.triggers[i];
    }
    return null;
  }

  function statsForRenewTrigger(id, windowOnly) {
    var used = 0, reactedOld = 0, notComeUp = 0, total = 0;
    state.rehearsalLog.forEach(function (entry) {
      if (windowOnly && !inWindow(entry.ts)) return;
      (entry.results || []).forEach(function (r) {
        if (r.triggerId !== id) return;
        total++;
        if (r.selfReport === "used") used++;
        else if (r.selfReport === "reacted-old") reactedOld++;
        else if (r.selfReport === "not-come-up") notComeUp++;
      });
    });
    return { used: used, reactedOld: reactedOld, notComeUp: notComeUp, total: total };
  }

  function renderRenewList() {
    syncRenewChrome();
    document.getElementById("renew-count").textContent =
      state.triggers.length + (state.triggers.length === 1 ? " situation" : " situations");

    var listEl = document.getElementById("renew-list");
    if (!state.triggers.length) {
      listEl.innerHTML = '<p class="empty-note">No situations yet — write your own, or browse templates for a common one to start from.</p>';
      return;
    }

    var sorted = state.triggers.slice().sort(function (a, b) {
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });

    var out = "";
    sorted.forEach(function (t) {
      var s = statsForRenewTrigger(t.id, false);
      var pills = s.total === 0
        ? '<span class="none-pill">not rehearsed yet</span>'
        : '<span class="hit-pill">' + s.used + " used</span><span class=\"miss-pill\">" + s.reactedOld + " old way</span>";
      var a = findAssertionById(t.assertionId);
      var expanded = !!renewExpandedIds[t.id];
      out +=
        '<article class="trigger-card' + (expanded ? " expanded" : "") + '">' +
          '<button type="button" class="trigger-card-head" data-toggle-renew="' + t.id + '">' +
            '<div class="trigger-card-head-text">' +
              '<div class="trigger-situation" style="margin-bottom:0">When ' + escapeHtml(t.situation) + "</div>" +
              (expanded ? "" : '<div class="trigger-preview">' + escapeHtml(t.response) + "</div>") +
            "</div>" +
            '<span class="trigger-card-chevron">›</span>' +
          "</button>" +
          (expanded ?
            '<div class="trigger-card-body">' +
              (t.oldReaction ? '<div class="trigger-field"><div class="field-label">Used to</div><div class="trigger-field-text muted">' + escapeHtml(t.oldReaction) + "</div></div>" : "") +
              '<div class="trigger-field"><div class="field-label">With God, I will instead</div><div class="trigger-field-text">' + escapeHtml(t.response) + "</div></div>" +
              '<div class="trigger-anchor"><div class="field-label">Standing on</div>' +
                (a ? '<p class="trigger-assertion">"' + escapeHtml(a.text) + '"</p>' : "") +
              "</div>" +
              (t.note ? '<p class="trigger-note">"' + escapeHtml(t.note) + '"</p>' : "") +
              '<div class="verse-stats" style="margin-top:0.75rem">' + pills + "</div>" +
              '<div class="card-actions">' +
                '<button type="button" class="link-btn" data-edit-renew="' + t.id + '">Edit</button>' +
                '<button type="button" class="link-btn" data-delete-renew="' + t.id + '">Delete</button>' +
              "</div>" +
            "</div>"
          : "") +
        "</article>";
    });
    listEl.innerHTML = out;
  }

  function renderRenewForm() {
    syncRenewChrome();
    var wrap = document.getElementById("renew-form-wrap");
    if (!renewFormState) {
      wrap.style.display = "none";
      wrap.innerHTML = "";
      return;
    }
    wrap.style.display = "block";
    var editing = renewFormState.editingId ? findRenewTrigger(renewFormState.editingId) : null;

    var situationVal = editing ? editing.situation : (renewFormState.situation || "");
    var oldVal = editing ? (editing.oldReaction || "") : (renewFormState.oldReaction || "");
    var respVal = editing ? editing.response : (renewFormState.response || "");
    var noteVal = editing ? (editing.note || "") : (renewFormState.note || "");
    var assertionVal = editing ? editing.assertionId : (renewFormState.assertionId || "");

    var ladder = ASSERTIONS.filter(function (a) { return a.special !== "identity"; });
    var options = ladder.map(function (a) {
      var sel = a.id === assertionVal ? " selected" : "";
      return '<option value="' + escapeHtml(a.id) + '"' + sel + ">" + escapeHtml(truncate(a.text, 60)) + "</option>";
    }).join("");

    wrap.innerHTML =
      '<div class="note-card"><strong>' + (editing ? "Edit situation" : "New situation") + "</strong> — pre-decide your response in a calm moment.</div>" +
      '<p class="field-label">When… (the situation)</p>' +
      '<input class="text-input" id="rf-situation" placeholder="e.g. someone criticizes my work" value="' + escapeHtml(situationVal) + '" />' +
      '<p class="field-label">What I tend to do (optional)</p>' +
      '<input class="text-input" id="rf-old" placeholder="e.g. I get defensive and shut down" value="' + escapeHtml(oldVal) + '" />' +
      '<p class="field-label">…with God, I will instead</p>' +
      '<textarea class="text-area" id="rf-response" placeholder="e.g. take a breath, say thank you, and ask a clarifying question">' + escapeHtml(respVal) + "</textarea>" +
      '<p class="field-label">Standing on</p>' +
      '<select class="text-input" id="rf-assertion">' + options + "</select>" +
      '<p class="field-label">In my own words (optional)</p>' +
      '<textarea class="text-area" id="rf-note" placeholder="Optional — a truer thought in your own words">' + escapeHtml(noteVal) + "</textarea>" +
      '<button type="button" class="continue-btn" id="rf-save">' + (editing ? "Save changes" : "Add situation") + "</button>" +
      '<button type="button" class="continue-btn secondary" id="rf-cancel" style="margin-top:0.5rem">Cancel</button>';
  }

  function openNewRenewForm() {
    var ladder = ASSERTIONS.filter(function (a) { return a.special !== "identity"; });
    renewFormState = {
      editingId: null, situation: "", oldReaction: "", response: "",
      assertionId: ladder.length ? ladder[0].id : "", note: ""
    };
    renderRenewForm();
    window.scrollTo(0, 0);
  }

  function openEditRenewForm(id) {
    renewFormState = { editingId: id };
    renderRenewForm();
  }

  function closeRenewForm() {
    renewFormState = null;
    renderRenewForm();
  }

  function saveRenewForm() {
    var situationEl = document.getElementById("rf-situation");
    var responseEl = document.getElementById("rf-response");
    var assertionEl = document.getElementById("rf-assertion");
    var sit = situationEl.value.trim();
    var resp = responseEl.value.trim();
    var assertionId = assertionEl.value;
    if (!sit) { situationEl.style.borderColor = "var(--rust)"; situationEl.focus(); return; }
    if (!resp) { responseEl.style.borderColor = "var(--rust)"; responseEl.focus(); return; }

    var oldReaction = document.getElementById("rf-old").value.trim();
    var note = document.getElementById("rf-note").value.trim();

    if (renewFormState.editingId) {
      var t = findRenewTrigger(renewFormState.editingId);
      if (t) {
        t.situation = sit;
        t.oldReaction = oldReaction;
        t.response = resp;
        t.assertionId = assertionId;
        t.note = note;
      }
    } else {
      state.triggers.push({
        id: uid(),
        situation: sit,
        oldReaction: oldReaction,
        response: resp,
        assertionId: assertionId,
        note: note,
        createdAt: new Date().toISOString()
      });
    }
    saveState();
    renewFormState = null;
    renderRenewForm();
    renderRenewList();
    renderHome();
  }

  function deleteRenewTrigger(id) {
    if (!confirm("Delete this situation? Its rehearsal history will remain in patterns as (deleted).")) return;
    state.triggers = state.triggers.filter(function (x) { return x.id !== id; });
    saveState();
    renderRenewList();
    renderHome();
  }

  /* ───────────── renew: template browser ───────────── */
  function openRenewTemplateBrowser() {
    renewTemplateCategoryFilter = "all";
    showView("renew-templates");
    renderRenewTemplateBrowser();
  }

  function renderRenewTemplateBrowser() {
    var chipsEl = document.getElementById("renew-template-category-chips");
    var chipsHtml = '<button type="button" class="chip' + (renewTemplateCategoryFilter === "all" ? " active" : "") +
      '" data-renew-template-cat="all">All<span class="cnt">' + TRIGGER_TEMPLATES.length + "</span></button>";
    TRIGGER_CATEGORIES.forEach(function (c) {
      var n = TRIGGER_TEMPLATES.filter(function (t) { return t.category === c.id; }).length;
      chipsHtml += '<button type="button" class="chip' + (renewTemplateCategoryFilter === c.id ? " active" : "") +
        '" data-renew-template-cat="' + c.id + '">' + escapeHtml(c.label) + '<span class="cnt">' + n + "</span></button>";
    });
    chipsEl.innerHTML = chipsHtml;

    var list = renewTemplateCategoryFilter === "all"
      ? TRIGGER_TEMPLATES
      : TRIGGER_TEMPLATES.filter(function (t) { return t.category === renewTemplateCategoryFilter; });
    document.getElementById("renew-templates-count").textContent = list.length + (list.length === 1 ? " template" : " templates");

    var listEl = document.getElementById("renew-template-list");
    listEl.innerHTML = list.map(function (t) {
      var cat = TRIGGER_CATEGORIES.filter(function (c) { return c.id === t.category; })[0];
      var a = findAssertionById(t.assertionId);
      return (
        '<button type="button" class="template-card" data-renew-template="' + escapeHtml(t.id) + '">' +
          '<div class="template-category">' + escapeHtml(cat ? cat.label : "") + "</div>" +
          '<div class="template-situation">When ' + escapeHtml(t.situation) + "</div>" +
          '<div class="template-preview">' + (a ? "Standing on: " + escapeHtml(a.text) : "") + "</div>" +
        "</button>"
      );
    }).join("");
  }

  function useRenewTemplate(id) {
    var t = TRIGGER_TEMPLATES.filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    var ladder = ASSERTIONS.filter(function (a) { return a.special !== "identity"; });
    var assertionId = findAssertionById(t.assertionId) ? t.assertionId : (ladder.length ? ladder[0].id : "");
    renewFormState = {
      editingId: null,
      situation: t.situation,
      oldReaction: t.oldReaction || "",
      response: "",
      assertionId: assertionId,
      note: ""
    };
    showView("renew");
    renderRenewList();
    renderRenewForm();
    window.scrollTo(0, 0);
  }

  /* ───────────── renew: practice session ───────────── */
  function weightRenewTrigger(t) {
    var s = statsForRenewTrigger(t.id, false);
    if (s.total === 0) return 5;
    if (s.reactedOld > s.used) return 4;
    if (s.reactedOld > 0) return 3;
    return 1;
  }

  function pickRenewRound(count) {
    var weighted = [];
    for (var i = 0; i < state.triggers.length; i++) {
      var w = weightRenewTrigger(state.triggers[i]);
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

  function startRenewPractice() {
    if (!state.triggers.length) return;
    var picked = pickRenewRound(Math.min(RENEW_ROUND_SIZE, state.triggers.length));
    renewPractice = {
      queue: picked.map(function (t) { return t.id; }),
      index: 0,
      phase: "rehearse",
      results: [],
      done: false
    };
    showView("renew-practice");
    renderRenewPractice();
  }

  function renderRenewPracticeTrack() {
    var track = document.getElementById("renew-practice-track");
    if (!renewPractice) { track.innerHTML = ""; return; }
    var html = "";
    for (var i = 0; i < renewPractice.queue.length; i++) {
      var cls = "";
      var res = renewPractice.results[i];
      if (res) {
        if (res.selfReport === "used") cls = "done";
        else if (res.selfReport === "reacted-old") cls = "miss";
      } else if (i === renewPractice.index && !renewPractice.done) {
        cls = "now";
      }
      html += "<span class=\"" + cls + "\"></span>";
    }
    track.innerHTML = html;
  }

  function renderRenewPractice() {
    var stage = document.getElementById("renew-practice-stage");
    if (!renewPractice) return;
    renderRenewPracticeTrack();

    if (renewPractice.done) {
      stage.innerHTML = renderRenewPracticeSummary();
      bindRenewPracticeSummary();
      return;
    }

    var t = findRenewTrigger(renewPractice.queue[renewPractice.index]);
    if (!t) {
      advanceRenewPractice("not-come-up");
      return;
    }

    stage.innerHTML = renewPractice.phase === "rehearse" ? renderRenewRehearseStep(t) : renderRenewReportStep(t);
  }

  function renderRenewRehearseStep(t) {
    var a = findAssertionById(t.assertionId);
    return (
      '<div class="step-tag">Rehearse · ' + (renewPractice.index + 1) + " / " + renewPractice.queue.length + "</div>" +
      '<div class="prompt-card">' +
        '<p class="stage-instruction" style="margin-bottom:0.5rem">When…</p>' +
        '<p class="prompt-text">' + escapeHtml(t.situation) + "</p>" +
        '<p class="stage-instruction" style="margin:0.9rem 0 0.4rem">…with God, I will</p>' +
        '<p class="assertion-text" style="font-size:1.15rem">' + escapeHtml(t.response) + "</p>" +
        (a
          ? '<p class="stage-instruction" style="margin:0.9rem 0 0.3rem">Standing on</p>' +
            '<p class="trigger-assertion">"' + escapeHtml(a.text) + '"</p>' +
            linkedVerseHtml(a.id)
          : "") +
        (t.note ? '<p class="trigger-note" style="margin-top:0.6rem">"' + escapeHtml(t.note) + '"</p>' : "") +
      "</div>" +
      '<p class="stage-instruction">Picture the moment. See yourself responding this way, with Him.</p>' +
      '<button type="button" class="continue-btn" data-rpa="rehearsed">I’ve pictured it — continue</button>'
    );
  }

  function renderRenewReportStep(t) {
    return (
      '<div class="step-tag">Since last time</div>' +
      '<div class="prompt-card"><p class="assertion-text" style="font-size:1.05rem">When ' + escapeHtml(t.situation) + "…</p></div>" +
      '<p class="stage-instruction">Did this come up — and what happened?</p>' +
      '<div class="gate-row">' +
        '<button type="button" class="gate-btn primary" data-rpa="report-used">Used the new response</button>' +
        '<button type="button" class="gate-btn" data-rpa="report-old">Reacted the old way</button>' +
        '<button type="button" class="gate-btn soft" data-rpa="report-none">Didn’t come up</button>' +
      "</div>"
    );
  }

  function advanceRenewPractice(forcedReport) {
    if (forcedReport) {
      renewPractice.results.push({ triggerId: renewPractice.queue[renewPractice.index], selfReport: forcedReport });
    }
    if (renewPractice.index >= renewPractice.queue.length - 1) {
      finishRenewPractice();
      return;
    }
    renewPractice.index++;
    renewPractice.phase = "rehearse";
    renderRenewPractice();
  }

  function finishRenewPractice() {
    renewPractice.done = true;
    state.rehearsalLog.push({
      ts: new Date().toISOString(),
      date: todayStr(),
      results: renewPractice.results.slice()
    });
    bumpStreak("renew");
    saveState();
    document.getElementById("topbar").classList.remove("in-session");
    renderRenewPractice();
    renderHome();
  }

  function renderRenewPracticeSummary() {
    var used = 0, reactedOld = 0, notComeUp = 0;
    renewPractice.results.forEach(function (r) {
      if (r.selfReport === "used") used++;
      else if (r.selfReport === "reacted-old") reactedOld++;
      else notComeUp++;
    });
    var total = renewPractice.results.length;
    return (
      '<div class="summary">' +
        '<div class="summary-big">' + used + "/" + total + "</div>" +
        '<div class="summary-sub">used the new response · streak ' + (state.renewStreak || 0) + "</div>" +
        '<div class="stat-row">' +
          '<div class="stat-card"><div class="stat-num">' + used + '</div><div class="stat-lbl">Used it</div></div>' +
          '<div class="stat-card"><div class="stat-num">' + reactedOld + '</div><div class="stat-lbl">Old way</div></div>' +
          '<div class="stat-card"><div class="stat-num">' + notComeUp + '</div><div class="stat-lbl">Didn’t come up</div></div>' +
        "</div>" +
        '<button type="button" class="cta-btn" id="rps-again" style="margin-top:1.2rem">Rehearse again</button>' +
        '<button type="button" class="link-btn" id="rps-list" style="display:block;margin:1rem auto 0">My situations</button>' +
        '<button type="button" class="link-btn" id="rps-home" style="display:block;margin:0.5rem auto 0">← Home</button>' +
      "</div>"
    );
  }

  function bindRenewPracticeSummary() {
    var again = document.getElementById("rps-again");
    var list = document.getElementById("rps-list");
    var home = document.getElementById("rps-home");
    if (again) again.onclick = startRenewPractice;
    if (list) list.onclick = function () { renewPractice = null; showView("renew"); renderRenewList(); };
    if (home) home.onclick = goHome;
  }

  function onRenewPracticeAction(action) {
    if (!renewPractice || renewPractice.done) return;
    if (action === "rehearsed") {
      renewPractice.phase = "report";
      renderRenewPractice();
      return;
    }
    if (action === "report-used") { advanceRenewPractice("used"); return; }
    if (action === "report-old") { advanceRenewPractice("reacted-old"); return; }
    if (action === "report-none") { advanceRenewPractice("not-come-up"); return; }
  }

  /* ───────────── patterns ───────────── */
  function renderBarList(items, maxN, colorClass) {
    if (!items.length) return '<p class="empty-note">Nothing captured yet in the last ' + WINDOW_DAYS + " days.</p>";
    var max = maxN || items[0].n || 1;
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
    var feels = countByText(tagsInWindow("feel").map(function (t) {
      return { text: "I feel " + t.text };
    }));
    // recount feels without prefix double
    feels = countByText(tagsInWindow("feel"));
    feels = feels.map(function (x) { return { text: "I feel " + x.text, n: x.n }; });

    var beliefs = countByText(tagsInWindow("belief"));
    var friction = frictionByAssertion().filter(function (f) {
      return f.id !== "who-god-says" && f.realigned > 0;
    }).map(function (f) {
      return {
        text: truncate(assertionLabel(f.id), 42),
        n: f.realigned
      };
    });

    var fractures = countByText(fracturesInWindow().filter(function (t) {
      return !(t.source === "examine" && t.outcome === "clear");
    }).map(function (t) {
      return { text: fractureLabel(t.category) };
    }));

    var ids = identityCounts();
    var idHtml = ids.length
      ? '<div class="identity-chip-list">' + ids.slice(0, 20).map(function (c) {
          return '<span class="id-chip">' + escapeHtml(c.text) + '<span class="n">' + c.n + "</span></span>";
        }).join("") + "</div>"
      : '<p class="empty-note">Identity words will appear after realignment sessions.</p>';

    var sessions30 = state.realignSessions.filter(function (s) {
      return inWindow(s.ts || s.date);
    }).length;

    var g = globalStats30();

    var renewMostRehearsed = state.triggers.map(function (t) {
      return { text: truncate(t.situation, 40), n: statsForRenewTrigger(t.id, true).total };
    }).filter(function (x) { return x.n > 0; }).sort(function (a, b) { return b.n - a.n; });

    var renewMostOld = state.triggers.map(function (t) {
      return { text: truncate(t.situation, 40), n: statsForRenewTrigger(t.id, true).reactedOld };
    }).filter(function (x) { return x.n > 0; }).sort(function (a, b) { return b.n - a.n; });

    body.innerHTML =
      '<div class="stat-row" style="margin-bottom:1rem">' +
        '<div class="stat-card"><div class="stat-num">' + sessions30 + '</div><div class="stat-lbl">Realign · 30d</div></div>' +
        '<div class="stat-card"><div class="stat-num">' + tagsInWindow().length + '</div><div class="stat-lbl">Tags · 30d</div></div>' +
        '<div class="stat-card"><div class="stat-num">' + (g.total ? Math.round(100 * g.hits / g.total) + "%" : "—") + '</div><div class="stat-lbl">Match acc.</div></div>' +
      "</div>" +

      '<div class="section-label" style="margin-top:0.4rem">I feel…</div>' +
      '<div class="pattern-card">' + renderBarList(feels, null, "teal") + "</div>" +

      '<div class="section-label">False beliefs</div>' +
      '<div class="pattern-card">' + renderBarList(beliefs, null, "rust") + "</div>" +

      '<div class="section-label">Assertions that needed realignment</div>' +
      '<div class="pattern-card">' + renderBarList(friction) + "</div>" +

      '<div class="section-label">Where the soul fractures</div>' +
      '<div class="pattern-card">' + renderBarList(fractures, null, "rust") + "</div>" +

      '<div class="section-label">Most rehearsed situations</div>' +
      '<div class="pattern-card">' + renderBarList(renewMostRehearsed) + "</div>" +

      '<div class="section-label">Reacted the old way most</div>' +
      '<div class="pattern-card">' + renderBarList(renewMostOld, null, "rust") + "</div>" +

      '<div class="section-label">Who God says I am</div>' +
      '<div class="pattern-card">' + idHtml + "</div>" +

      '<div class="section-label">Verse match · 30d</div>' +
      '<div class="pattern-card">' +
        '<div class="verse-stats">' +
          '<span class="hit-pill">' + g.hits + " hits</span>" +
          '<span class="miss-pill">' + g.misses + " misses</span>" +
          '<span class="accuracy-mini">' + g.versesTouched + "/" + V.length + " verses</span>" +
        "</div>" +
      "</div>";
  }

  /* ───────────── setup: customize assertions ───────────── */
  function renderSetup() {
    var listEl = document.getElementById("setup-list");
    var ladder = customLadder || DEFAULT_LADDER;
    document.getElementById("setup-count").textContent = ladder.length + " step" + (ladder.length === 1 ? "" : "s") + " · + identity";

    if (!ladder.length) {
      listEl.innerHTML = '<p class="empty-note">No steps — add one below.</p>';
      return;
    }

    var out = "";
    for (var i = 0; i < ladder.length; i++) {
      var a = ladder[i];
      out +=
        '<div class="setup-item">' +
          '<div class="setup-item-main">' +
            '<div class="setup-item-tier">' + escapeHtml(tierLabel(a.tier)) + "</div>" +
            '<textarea class="setup-item-text" data-id="' + escapeHtml(a.id) + '" rows="2">' + escapeHtml(a.text) + "</textarea>" +
          "</div>" +
          '<div class="setup-item-actions">' +
            '<button type="button" class="setup-mini-btn" data-act="up" data-id="' + escapeHtml(a.id) + '"' + (i === 0 ? " disabled" : "") + ' aria-label="Move up">↑</button>' +
            '<button type="button" class="setup-mini-btn" data-act="down" data-id="' + escapeHtml(a.id) + '"' + (i === ladder.length - 1 ? " disabled" : "") + ' aria-label="Move down">↓</button>' +
            '<button type="button" class="setup-mini-btn danger" data-act="del" data-id="' + escapeHtml(a.id) + '" aria-label="Remove">✕</button>' +
          "</div>" +
        "</div>";
    }
    listEl.innerHTML = out;
  }

  /* ───────────── navigation ───────────── */
  function goHome() {
    challenge = null;
    realign = null;
    examine = null;
    renewFormState = null;
    renewPractice = null;
    showView("home");
    renderHome();
  }

  function exitSession() {
    if (activeSession === "challenge" && challenge && !challenge.done) {
      if (!confirm("Leave this challenge? Answers so far are saved.")) return;
      challenge = null;
    } else if (activeSession === "realign" && realign && !realign.done) {
      if (!confirm("Leave realignment? This session will not be saved.")) return;
      realign = null;
    } else if (activeSession === "examine" && examine && !examine.done) {
      if (!confirm("Leave this examine session? It will not be saved.")) return;
      examine = null;
    } else if (activeSession === "renew-practice" && renewPractice && !renewPractice.done) {
      if (!confirm("Leave this rehearsal session? Progress so far will not be saved.")) return;
      renewPractice = null;
    } else {
      challenge = null;
      realign = null;
      examine = null;
      renewPractice = null;
    }
    document.getElementById("topbar").classList.remove("in-session");
    goHome();
  }

  /* ───────────── events ───────────── */
  function bindSongToggle() {
    var audio = document.getElementById("bg-audio");
    var btn = document.getElementById("song-toggle");
    if (!audio || !btn) return;
    audio.addEventListener("play", function () {
      btn.classList.add("playing");
      btn.textContent = "❚❚";
      btn.setAttribute("aria-pressed", "true");
      btn.setAttribute("aria-label", "Pause background song");
    });
    audio.addEventListener("pause", function () {
      btn.classList.remove("playing");
      btn.textContent = "♪";
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("aria-label", "Play background song");
    });
    btn.addEventListener("click", function () {
      if (audio.paused) audio.play().catch(function () {});
      else audio.pause();
    });

    var restartBtn = document.getElementById("song-restart");
    if (restartBtn) {
      restartBtn.addEventListener("click", function () {
        audio.currentTime = 0;
        if (audio.paused) audio.play().catch(function () {});
      });
    }
  }

  function bind() {
    document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
    bindSongToggle();
    document.getElementById("exit-session-btn").addEventListener("click", exitSession);
    document.getElementById("wordmark-home").addEventListener("click", function () {
      if (activeSession) exitSession();
      else goHome();
    });
    document.getElementById("patterns-link").addEventListener("click", function () {
      showView("patterns");
      renderPatterns();
    });

    document.getElementById("btn-realign").addEventListener("click", startRealign);
    document.getElementById("btn-browse").addEventListener("click", function () {
      showView("browse");
      renderBrowse();
    });
    document.getElementById("btn-challenge").addEventListener("click", startChallenge);
    document.getElementById("browse-home").addEventListener("click", goHome);
    document.getElementById("browse-play").addEventListener("click", startChallenge);
    document.getElementById("patterns-home").addEventListener("click", goHome);

    document.getElementById("group-chips").addEventListener("click", function (e) {
      var btn = e.target.closest(".chip");
      if (!btn) return;
      browseFilter = btn.getAttribute("data-group") || "all";
      renderBrowse();
    });

    document.getElementById("challenge-stage").addEventListener("click", function (e) {
      var choice = e.target.closest(".choice-btn");
      if (choice && choice.getAttribute("data-id")) {
        onChoice(parseInt(choice.getAttribute("data-id"), 10));
        return;
      }
      if (e.target.id === "challenge-continue" || e.target.closest("#challenge-continue")) {
        var cont = document.getElementById("challenge-continue");
        if (cont && !cont.disabled) challengeContinue();
      }
    });

    document.getElementById("realign-stage").addEventListener("click", function (e) {
      var t = e.target.closest("[data-ra], [data-feel], [data-belief], [data-fracture], [data-id-text]");
      if (!t) return;
      var action = t.getAttribute("data-ra");
      onRealignAction(action, t);
    });

    document.getElementById("btn-examine").addEventListener("click", openExamineHub);
    document.getElementById("examine-home").addEventListener("click", goHome);
    document.getElementById("examine-cards").addEventListener("click", function (e) {
      var c = e.target.closest(".fracture-card");
      if (!c) return;
      startExamine(c.getAttribute("data-fracture"));
    });
    document.getElementById("examine-stage").addEventListener("click", function (e) {
      var t = e.target.closest("[data-ex]");
      if (!t) return;
      onExamineAction(t.getAttribute("data-ex"));
    });

    document.getElementById("home-customize-link").addEventListener("click", function () {
      showView("setup");
      renderSetup();
    });
    document.getElementById("setup-home").addEventListener("click", goHome);
    document.getElementById("setup-reset-btn").addEventListener("click", function () {
      if (!confirm("Reset assertions to the defaults? Your customizations will be lost.")) return;
      resetLadder();
    });
    document.getElementById("setup-tier-chips").addEventListener("click", function (e) {
      var chip = e.target.closest(".chip");
      if (!chip) return;
      var chips = document.querySelectorAll("#setup-tier-chips .chip");
      for (var i = 0; i < chips.length; i++) chips[i].classList.remove("active");
      chip.classList.add("active");
    });
    document.getElementById("setup-add-btn").addEventListener("click", function () {
      var input = document.getElementById("setup-new-text");
      var text = input.value.trim();
      if (!text) return;
      var tierChip = document.querySelector("#setup-tier-chips .chip.active");
      var tier = tierChip ? tierChip.getAttribute("data-tier") : "capacity";
      addAssertion(tier, text);
      input.value = "";
      renderSetup();
      renderHome();
    });
    document.getElementById("setup-list").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-act]");
      if (!btn) return;
      var id = btn.getAttribute("data-id");
      var act = btn.getAttribute("data-act");
      if (act === "up") moveAssertion(id, -1);
      else if (act === "down") moveAssertion(id, 1);
      else if (act === "del") {
        if (!confirm("Remove this step?")) return;
        removeAssertion(id);
      }
      renderSetup();
      renderHome();
    });
    document.getElementById("setup-list").addEventListener("focusout", function (e) {
      var t = e.target;
      if (!t.classList || !t.classList.contains("setup-item-text")) return;
      editAssertionText(t.getAttribute("data-id"), t.value);
    });

    document.getElementById("btn-renew").addEventListener("click", function () {
      showView("renew");
      renderRenewList();
    });
    document.getElementById("renew-home").addEventListener("click", goHome);
    document.getElementById("btn-renew-practice").addEventListener("click", startRenewPractice);
    document.getElementById("btn-new-renew-trigger").addEventListener("click", openNewRenewForm);
    document.getElementById("btn-browse-renew-templates").addEventListener("click", openRenewTemplateBrowser);
    document.getElementById("renew-templates-home").addEventListener("click", function () {
      showView("renew");
      renderRenewList();
    });

    document.getElementById("renew-template-category-chips").addEventListener("click", function (e) {
      var chip = e.target.closest("[data-renew-template-cat]");
      if (!chip) return;
      renewTemplateCategoryFilter = chip.getAttribute("data-renew-template-cat");
      renderRenewTemplateBrowser();
    });

    document.getElementById("renew-template-list").addEventListener("click", function (e) {
      var card = e.target.closest("[data-renew-template]");
      if (!card) return;
      useRenewTemplate(card.getAttribute("data-renew-template"));
    });

    document.getElementById("renew-form-wrap").addEventListener("click", function (e) {
      if (e.target.id === "rf-save") { saveRenewForm(); return; }
      if (e.target.id === "rf-cancel") { closeRenewForm(); return; }
    });

    document.getElementById("renew-list").addEventListener("click", function (e) {
      var editBtn = e.target.closest("[data-edit-renew]");
      if (editBtn) { openEditRenewForm(editBtn.getAttribute("data-edit-renew")); window.scrollTo(0, 0); return; }
      var delBtn = e.target.closest("[data-delete-renew]");
      if (delBtn) { deleteRenewTrigger(delBtn.getAttribute("data-delete-renew")); return; }
      var toggleBtn = e.target.closest("[data-toggle-renew]");
      if (toggleBtn) {
        var id = toggleBtn.getAttribute("data-toggle-renew");
        renewExpandedIds[id] = !renewExpandedIds[id];
        renderRenewList();
        return;
      }
    });

    document.getElementById("renew-practice-stage").addEventListener("click", function (e) {
      var t = e.target.closest("[data-rpa]");
      if (!t) return;
      onRenewPracticeAction(t.getAttribute("data-rpa"));
    });
  }

  /* ───────────── init ───────────── */
  applyTheme();
  bind();
  renderHome();

  if (!V.length) console.error("[Abide] Verses not loaded.");
  if (!ASSERTIONS.length) console.error("[Abide] Assertions not loaded.");
  if (!TRIGGER_TEMPLATES.length) console.error("[Abide] Trigger templates not loaded.");
})();
