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
      realignSessions: [],
      realignStreak: 0,
      lastRealignDate: null
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
          realignSessions: Array.isArray(parsed.realignSessions) ? parsed.realignSessions : []
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
  var ASSERTIONS = (window.AbideAssertions && window.AbideAssertions.ASSERTIONS) || [];
  var FEEL_PRESETS = (window.AbideAssertions && window.AbideAssertions.FEEL_PRESETS) || [];
  var BELIEF_PRESETS = (window.AbideAssertions && window.AbideAssertions.BELIEF_PRESETS) || [];

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

  function bumpStreak(kind) {
    // kind: 'realign' | 'challenge'
    var keyDate = kind === "realign" ? "lastRealignDate" : "lastChallengeDate";
    var keyStreak = kind === "realign" ? "realignStreak" : "challengeStreak";
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
  var activeSession = null; // 'challenge' | 'realign'

  function showView(name) {
    var views = document.querySelectorAll(".view");
    for (var i = 0; i < views.length; i++) {
      views[i].classList.toggle("active", views[i].getAttribute("data-view") === name);
    }
    var inSession =
      (name === "challenge" && challenge && !challenge.done) ||
      (name === "realign" && realign && !realign.done);
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

    var streakRow = document.getElementById("streak-row");
    var streakItems = [];
    if (state.realignStreak > 0) streakItems.push('<div class="streak-item"><div class="streak-lbl">Abide</div><div class="streak-val">' + state.realignStreak + '</div></div>');
    if (state.challengeStreak > 0) streakItems.push('<div class="streak-item"><div class="streak-lbl">Match</div><div class="streak-val">' + state.challengeStreak + '</div></div>');
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
      currentTags: { feels:Set-like array, beliefs: array },
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
      currentTags: { feels: [], beliefs: [] },
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
    var v = list[Math.floor(Math.random() * Math.min(2, list.length))];
    // prefer first for stability, but allow second
    v = list[0];
    if (list.length > 1 && Math.random() < 0.5) v = list[1];
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
    realign.currentTags = { feels: [], beliefs: [] };
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
    realign.currentTags = { feels: [], beliefs: [] };
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
      realign.currentTags = { feels: [], beliefs: [] };
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

  /* ───────────── navigation ───────────── */
  function goHome() {
    challenge = null;
    realign = null;
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
    } else {
      challenge = null;
      realign = null;
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
      var t = e.target.closest("[data-ra], [data-feel], [data-belief], [data-id-text]");
      if (!t) return;
      var action = t.getAttribute("data-ra");
      onRealignAction(action, t);
    });
  }

  /* ───────────── init ───────────── */
  applyTheme();
  bind();
  renderHome();

  if (!V.length) console.error("[Abide] Verses not loaded.");
  if (!ASSERTIONS.length) console.error("[Abide] Assertions not loaded.");
})();
