(function () {
  "use strict";

  var content = window.CharismaContent;
  if (!content) {
    console.error("[Charisma] CharismaContent missing — load content scripts first.");
    return;
  }
  var STATS = content.STATS;
  var MODULES = content.MODULES;
  var PACKS = content.PACKS;
  var BADGE_DEFS = content.BADGE_DEFS;

  /* ================================================================
     STATE
     ================================================================ */
  var LS_KEY = "charisma-state-v1";
  var LEVEL_MIN = 1, LEVEL_MAX = 10;

  function defaultLevels() {
    var o = {};
    STATS.forEach(function (s) { o[s.id] = 1; });
    MODULES.forEach(function (m) { o["mod_" + m.id] = 1; });
    return o;
  }

  function defaultState() {
    return {
      xp: 0,
      streak: 0,
      bestStreak: 0,
      lastPlayedDate: null,
      focusModule: "conversation",
      levels: defaultLevels(),
      levelStreaks: {},
      history: [],
      reviewQueue: [],
      logs: [],
      mission: null,
      missionsDone: 0,
      moduleSessions: {},
      packLogs: {},
      badgesEarned: {},
      totalSessions: 0,
      todaySessionDate: null,
      theme: null
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      var d = defaultState();
      var merged = Object.assign(d, parsed);
      merged.levels = Object.assign(d.levels, parsed.levels || {});
      merged.moduleSessions = Object.assign({}, d.moduleSessions, parsed.moduleSessions || {});
      merged.packLogs = Object.assign({}, d.packLogs, parsed.packLogs || {});
      merged.badgesEarned = Object.assign({}, d.badgesEarned, parsed.badgesEarned || {});
      return merged;
    } catch (e) {
      return defaultState();
    }
  }

  function saveState() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
  }

  var state = loadState();
  var session = null;
  var viewingModuleId = null;

  /* ================================================================
     UTILITIES
     ================================================================ */
  function $(id) { return document.getElementById(id); }
  function todayStr() { return new Date().toISOString().slice(0, 10); }
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = randInt(0, i);
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function getModule(id) {
    for (var i = 0; i < MODULES.length; i++) if (MODULES[i].id === id) return MODULES[i];
    for (var j = 0; j < PACKS.length; j++) if (PACKS[j].id === id) return PACKS[j];
    return MODULES[0];
  }
  function isPack(id) {
    return PACKS.some(function (p) { return p.id === id; });
  }
  function levelInfo(xp) {
    var level = 1;
    while (xp >= 20 * level * (level + 1)) level++;
    var prev = level === 1 ? 0 : 20 * (level - 1) * level;
    var next = 20 * level * (level + 1);
    return { level: level, into: xp - prev, span: next - prev };
  }
  function pctForStat(id) {
    var v = state.levels[id] || 1;
    return Math.round(100 * (v - LEVEL_MIN) / (LEVEL_MAX - LEVEL_MIN));
  }
  function bumpStat(id, amount) {
    if (!id) return;
    var cur = state.levels[id] || 1;
    state.levels[id] = Math.max(LEVEL_MIN, Math.min(LEVEL_MAX, cur + (amount || 0)));
  }
  function bumpOnCorrect(statIds, correct) {
    (statIds || []).forEach(function (id) {
      var key = "s_" + id;
      var streak = state.levelStreaks[key] || 0;
      if (correct) {
        streak += 1;
        state.levelStreaks[key] = streak;
        if (streak >= 2) {
          bumpStat(id, 1);
          state.levelStreaks[key] = 0;
        }
      } else {
        state.levelStreaks[key] = 0;
      }
    });
  }
  function awardXp(n) { state.xp += n; }
  function checkBadges() {
    BADGE_DEFS.forEach(function (b) {
      if (!state.badgesEarned[b.id] && b.need(state)) {
        state.badgesEarned[b.id] = todayStr();
      }
    });
  }
  function updateStreak() {
    var today = todayStr();
    if (state.lastPlayedDate === today) return;
    var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    state.streak = (state.lastPlayedDate === yesterday) ? state.streak + 1 : 1;
    state.lastPlayedDate = today;
    if (state.streak > state.bestStreak) state.bestStreak = state.streak;
  }
  function sessionDoneToday() {
    return state.todaySessionDate === todayStr();
  }

  /* ================================================================
     SESSION BUILDER
     ================================================================ */
  function pickOpportunity(mod) {
    var list = mod.opportunities || [];
    if (!list.length) return "Notice one moment today where this skill could apply.";
    return list[randInt(0, list.length - 1)];
  }

  function pickQuizzes(mod, count) {
    var pool = (mod.quizzes || []).slice();
    // pull review items for this module first
    var review = state.reviewQueue.filter(function (r) { return r.moduleId === mod.id; }).slice(0, 2);
    var out = [];
    review.forEach(function (r) {
      var q = (mod.quizzes || [])[r.qi];
      if (q) out.push({ quiz: q, qi: r.qi, fromReview: true });
    });
    var indices = shuffle(pool.map(function (_, i) { return i; }));
    for (var i = 0; i < indices.length && out.length < count; i++) {
      var qi = indices[i];
      if (out.some(function (o) { return o.qi === qi; })) continue;
      out.push({ quiz: pool[qi], qi: qi, fromReview: false });
    }
    // if pack has few quizzes, fill from parent module
    if (out.length < count && isPack(mod.id) && mod.parent) {
      var parent = getModule(mod.parent);
      var pQuiz = parent.quizzes || [];
      var pIdx = shuffle(pQuiz.map(function (_, i) { return i; }));
      for (var j = 0; j < pIdx.length && out.length < count; j++) {
        out.push({ quiz: pQuiz[pIdx[j]], qi: pIdx[j], fromReview: false, moduleId: parent.id });
      }
    }
    return out;
  }

  function pickChallenge(mod) {
    var list = mod.challenges || [];
    if (!list.length) return { title: "Notice & try", text: "Spot one opportunity moment and take one small action.", level: 1 };
    // prefer lower level early, mix later
    var levelCap = Math.min(3, 1 + Math.floor((state.totalSessions || 0) / 4));
    var filtered = list.filter(function (c) { return (c.level || 1) <= levelCap; });
    if (!filtered.length) filtered = list;
    return filtered[randInt(0, filtered.length - 1)];
  }

  function buildSession() {
    var mod = getModule(state.focusModule);
    var quizzes = pickQuizzes(mod, 3);
    var challenge = pickChallenge(mod);
    var opportunity = pickOpportunity(mod);
    var drill = (mod.drills && mod.drills[0]) || { title: "Awareness", text: "Notice one real moment today.", time: "1 min" };

    var steps = [
      { kind: "awareness", mod: mod, opportunity: opportunity, drill: drill },
      { kind: "radar" }
    ];
    quizzes.forEach(function (q) {
      steps.push({ kind: "quiz", mod: mod, item: q });
    });
    steps.push({ kind: "mission", mod: mod, challenge: challenge });
    steps.push({ kind: "reflect", mod: mod });
    return steps;
  }

  /* ================================================================
     SESSION RUNNER
     ================================================================ */
  function startSession() {
    session = {
      steps: buildSession(),
      idx: 0,
      results: [],
      xpEarned: 0,
      radar: null,
      missionAccepted: null
    };
    document.body.classList.add("nav-hidden");
    showView("session");
    renderStep();
  }

  function updateTrack() {
    var track = $("exercise-track");
    if (!track || !session) return;
    var html = "";
    session.steps.forEach(function (_, i) {
      html += '<span class="' + (i < session.idx ? "done" : i === session.idx ? "now" : "") + '"></span>';
    });
    track.innerHTML = html;
  }

  function nextStep() {
    session.idx++;
    renderStep();
  }

  function renderStep() {
    updateTrack();
    var stage = $("session-stage");
    var step = session.steps[session.idx];
    if (!step) { renderSummary(); return; }
    if (step.kind === "awareness") renderAwareness(step, stage);
    else if (step.kind === "radar") renderRadar(step, stage);
    else if (step.kind === "quiz") renderQuiz(step, stage);
    else if (step.kind === "mission") renderMission(step, stage);
    else if (step.kind === "reflect") renderReflect(step, stage);
  }

  function renderAwareness(step, stage) {
    var mod = step.mod;
    stage.innerHTML =
      '<p class="stage-kicker">Morning awareness · ' + escapeHtml(mod.name) + '</p>' +
      '<h2 class="stage-title">Opportunity of the day</h2>' +
      '<div class="quote-block">' + escapeHtml(step.opportunity) + '</div>' +
      '<p class="stage-body">Ask yourself: <strong>Where might this show up today?</strong></p>' +
      '<p class="stage-kicker">Awareness drill · ' + escapeHtml(step.drill.time || "") + '</p>' +
      '<div class="card" style="margin-bottom:1.2rem"><h3>' + escapeHtml(step.drill.title) + '</h3><p>' + escapeHtml(step.drill.text) + '</p></div>' +
      '<p class="stage-body" style="font-size:0.88rem">' + escapeHtml(mod.principle) + '</p>' +
      '<button class="cta-btn" id="aware-continue" type="button">I\'ve got it — continue</button>';
    $("aware-continue").addEventListener("click", function () {
      awardXp(5);
      session.xpEarned += 5;
      session.results.push({ kind: "awareness", correct: true });
      saveState();
      nextStep();
    });
  }

  function renderRadar(step, stage) {
    stage.innerHTML =
      '<p class="stage-kicker">Opportunity radar</p>' +
      '<h2 class="stage-title">How clear is your radar right now?</h2>' +
      '<p class="stage-body">Rate how ready you feel to <strong>notice</strong> charisma moments today — not how perfect you\'ll be.</p>' +
      '<div class="radar-row" id="radar-row"></div>' +
      '<button class="cta-btn" id="radar-continue" type="button" disabled>Continue</button>';
    var row = $("radar-row");
    var selected = null;
    for (var i = 1; i <= 10; i++) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "radar-btn";
      b.textContent = String(i);
      b.setAttribute("data-v", String(i));
      b.addEventListener("click", function (ev) {
        selected = Number(ev.currentTarget.getAttribute("data-v"));
        Array.prototype.forEach.call(row.querySelectorAll(".radar-btn"), function (el) {
          el.classList.toggle("selected", Number(el.getAttribute("data-v")) === selected);
        });
        $("radar-continue").disabled = false;
      });
      row.appendChild(b);
    }
    $("radar-continue").addEventListener("click", function () {
      session.radar = selected;
      awardXp(3);
      session.xpEarned += 3;
      // clarity stat soft bump for honest rating engagement
      bumpOnCorrect(["clarity"], selected >= 5);
      saveState();
      nextStep();
    });
  }

  function renderQuiz(step, stage) {
    var quiz = step.item.quiz;
    var mod = step.mod;
    var n = session.results.filter(function (r) { return r.kind === "quiz"; }).length + 1;
    stage.innerHTML =
      '<p class="stage-kicker">Scenario ' + n + ' · ' + escapeHtml(mod.short || mod.name) +
      (step.item.fromReview ? ' · review' : '') + '</p>' +
      '<h2 class="stage-title" style="font-size:1.2rem">' + escapeHtml(quiz.q) + '</h2>' +
      '<div class="choice-list" id="choice-list"></div>' +
      '<div class="feedback" id="feedback"></div>';
    var list = $("choice-list");
    var locked = false;
    quiz.choices.forEach(function (c, idx) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice-btn";
      btn.textContent = c;
      btn.addEventListener("click", function () {
        if (locked) return;
        locked = true;
        var correct = idx === quiz.answer;
        Array.prototype.forEach.call(list.querySelectorAll(".choice-btn"), function (el, i) {
          el.disabled = true;
          if (i === quiz.answer) el.classList.add("correct");
          if (i === idx && !correct) el.classList.add("wrong");
        });
        var fb = $("feedback");
        var modId = step.item.moduleId || mod.id;
        var stats = (getModule(modId).stats) || mod.stats || [];
        if (correct) {
          awardXp(10);
          session.xpEarned += 10;
          bumpOnCorrect(stats, true);
          if (step.item.fromReview) {
            state.reviewQueue = state.reviewQueue.filter(function (r) {
              return !(r.moduleId === mod.id && r.qi === step.item.qi);
            });
          }
          fb.innerHTML = '<span class="fb-ok">Solid — +10 XP</span><p class="hint">' + escapeHtml(quiz.why) + '</p>';
          session.results.push({ kind: "quiz", correct: true });
          saveState();
          setTimeout(nextStep, 900);
        } else {
          bumpOnCorrect(stats, false);
          state.reviewQueue = state.reviewQueue.filter(function (r) {
            return !(r.moduleId === mod.id && r.qi === step.item.qi);
          });
          state.reviewQueue.push({ moduleId: mod.id, qi: step.item.qi, q: quiz.q });
          if (state.reviewQueue.length > 20) state.reviewQueue.shift();
          fb.innerHTML = '<span class="fb-bad">Not quite.</span><p class="hint">' + escapeHtml(quiz.why) + '</p>' +
            '<button class="continue-btn" id="q-continue" type="button">Continue</button>';
          session.results.push({ kind: "quiz", correct: false });
          saveState();
          $("q-continue").addEventListener("click", nextStep);
        }
      });
      list.appendChild(btn);
    });
  }

  function renderMission(step, stage) {
    var ch = step.challenge;
    var mod = step.mod;
    stage.innerHTML =
      '<p class="stage-kicker">Today\'s field mission · Level ' + (ch.level || 1) + '</p>' +
      '<h2 class="stage-title">' + escapeHtml(ch.title) + '</h2>' +
      '<div class="quote-block">' + escapeHtml(ch.text) + '</div>' +
      '<p class="stage-body">This is real-world practice inside conversations you\'re already having. Accept it and we\'ll park it on your home screen.</p>' +
      '<div class="mission-actions">' +
      '<button class="pill-btn primary" id="accept-mission" type="button">Accept mission · +8 XP</button>' +
      '<button class="pill-btn" id="skip-mission" type="button">Skip for today</button>' +
      '</div>';
    $("accept-mission").addEventListener("click", function () {
      session.missionAccepted = {
        title: ch.title,
        text: ch.text,
        moduleId: mod.id,
        moduleName: mod.name,
        date: todayStr(),
        done: false
      };
      state.mission = session.missionAccepted;
      awardXp(8);
      session.xpEarned += 8;
      session.results.push({ kind: "mission", correct: true });
      saveState();
      nextStep();
    });
    $("skip-mission").addEventListener("click", function () {
      session.results.push({ kind: "mission", correct: false });
      nextStep();
    });
  }

  function renderReflect(step, stage) {
    var mod = step.mod;
    var prompts = mod.reflections || ["One thing I noticed today?", "One small win or lesson?"];
    var prompt = prompts[randInt(0, prompts.length - 1)];
    stage.innerHTML =
      '<p class="stage-kicker">Optional reflection · 1 min</p>' +
      '<h2 class="stage-title">' + escapeHtml(prompt) + '</h2>' +
      '<textarea id="reflect-note" class="note-input" placeholder="A sentence is enough…"></textarea>' +
      '<div class="mission-actions">' +
      '<button class="pill-btn primary" id="save-reflect" type="button">Save · +5 XP</button>' +
      '<button class="pill-btn" id="skip-reflect" type="button">Skip</button>' +
      '</div>';
    $("save-reflect").addEventListener("click", function () {
      var note = $("reflect-note").value.trim();
      if (note) {
        state.logs.unshift({
          type: "reflection",
          moduleId: mod.id,
          note: note,
          date: todayStr(),
          ts: Date.now()
        });
        if (state.logs.length > 100) state.logs.pop();
        awardXp(5);
        session.xpEarned += 5;
      }
      session.results.push({ kind: "reflect", correct: !!note });
      saveState();
      nextStep();
    });
    $("skip-reflect").addEventListener("click", function () {
      session.results.push({ kind: "reflect", correct: false });
      nextStep();
    });
  }

  function renderSummary() {
    var quizResults = session.results.filter(function (r) { return r.kind === "quiz"; });
    var correct = quizResults.filter(function (r) { return r.correct; }).length;
    var total = quizResults.length;
    var accuracy = total ? Math.round(100 * correct / total) : 100;

    updateStreak();
    state.totalSessions++;
    state.todaySessionDate = todayStr();
    var focusId = state.focusModule;
    state.moduleSessions[focusId] = (state.moduleSessions[focusId] || 0) + 1;

    // soft progress on focus module stats
    var mod = getModule(focusId);
    (mod.stats || []).forEach(function (s) { bumpOnCorrect([s], accuracy >= 50); });

    state.history.push({
      date: todayStr(),
      accuracy: accuracy,
      radar: session.radar,
      xpEarned: session.xpEarned,
      focus: focusId
    });
    if (state.history.length > 60) state.history.shift();
    checkBadges();
    saveState();

    $("exercise-track").innerHTML = "";
    $("session-stage").innerHTML =
      '<div class="summary">' +
      '<p class="stage-kicker">Session complete</p>' +
      '<div class="summary-big">+' + session.xpEarned + '</div>' +
      '<p class="summary-sub">XP · ' + accuracy + '% scenarios · radar ' + (session.radar || "—") +
      ' · ' + state.streak + ' day streak</p>' +
      (state.mission && !state.mission.done
        ? '<div class="card" style="text-align:left;margin-bottom:1.2rem"><h3>Mission locked in</h3><p>' +
          escapeHtml(state.mission.title) + " — " + escapeHtml(state.mission.text) + "</p></div>"
        : "") +
      '<button id="done-btn" class="cta-btn" type="button">Back to Home</button>' +
      "</div>";
    $("done-btn").addEventListener("click", function () {
      session = null;
      document.body.classList.remove("nav-hidden");
      showView("home");
      renderHome();
    });
  }

  /* ================================================================
     RENDER: HOME / LEARN / LOG / PROGRESS
     ================================================================ */
  function meterHTML(label, pct) {
    return '<div class="meter"><svg viewBox="0 0 120 120"><circle class="track" cx="60" cy="60" r="52"></circle>' +
      '<circle class="value" style="--pct:' + pct + '" cx="60" cy="60" r="52"></circle></svg>' +
      '<div class="meter-num">' + pct + '<small>%</small></div>' +
      '<div class="meter-label">' + label + '</div></div>';
  }

  function renderMeters(containerId, keys) {
    var el = $(containerId);
    var items = keys || [
      ["Presence", "presence"],
      ["Rapport", "rapport"],
      ["Clarity", "clarity"]
    ];
    el.innerHTML = items.map(function (it) {
      return meterHTML(it[0], pctForStat(it[1]));
    }).join("");
  }

  function renderHistoryStrip(containerId, days) {
    var el = $(containerId);
    var set = {};
    state.history.forEach(function (h) { set[h.date] = true; });
    // also count mission completions / logs as activity? keep sessions only for parity with Span
    var html = "";
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      html += '<i style="' + (set[d] ? "background:var(--brass);opacity:0.85;border-color:transparent;" : "") + '"></i>';
    }
    el.innerHTML = html;
  }

  function greeting() {
    var h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }

  function renderFocusRow() {
    var el = $("focus-row");
    var html = "";
    MODULES.forEach(function (m) {
      html += '<button type="button" class="focus-chip' + (state.focusModule === m.id ? " active" : "") +
        '" data-focus="' + m.id + '">' + escapeHtml(m.short) + "</button>";
    });
    PACKS.forEach(function (p) {
      html += '<button type="button" class="focus-chip' + (state.focusModule === p.id ? " active" : "") +
        '" data-focus="' + p.id + '">' + escapeHtml(p.name) + "</button>";
    });
    el.innerHTML = html;
    Array.prototype.forEach.call(el.querySelectorAll("[data-focus]"), function (btn) {
      btn.addEventListener("click", function () {
        state.focusModule = btn.getAttribute("data-focus");
        saveState();
        renderHome();
      });
    });
  }

  function renderMissionPanel() {
    var el = $("mission-panel");
    if (!state.mission || state.mission.done || state.mission.date !== todayStr()) {
      // keep incomplete missions across day? curriculum says daily — expire old incomplete
      if (state.mission && state.mission.date !== todayStr() && !state.mission.done) {
        state.mission = null;
        saveState();
      }
      el.innerHTML = "";
      return;
    }
    var m = state.mission;
    el.innerHTML =
      '<div class="mission-chip">' +
      '<div class="mc-label">Active mission · ' + escapeHtml(m.moduleName || "") + "</div>" +
      '<div class="mc-text"><strong>' + escapeHtml(m.title) + "</strong> — " + escapeHtml(m.text) + "</div>" +
      '<div class="mission-actions">' +
      '<button class="pill-btn teal" id="complete-mission" type="button">Mark done · +20 XP</button>' +
      '<button class="pill-btn" id="dismiss-mission" type="button">Dismiss</button>' +
      "</div></div>";
    $("complete-mission").addEventListener("click", function () {
      completeMission(true);
    });
    $("dismiss-mission").addEventListener("click", function () {
      state.mission = null;
      saveState();
      renderHome();
    });
  }

  function completeMission(fromHome) {
    if (!state.mission) return;
    var m = state.mission;
    m.done = true;
    state.missionsDone = (state.missionsDone || 0) + 1;
    awardXp(20);
    var mod = getModule(m.moduleId);
    (mod.stats || []).forEach(function (s) { bumpOnCorrect([s], true); });
    if (isPack(m.moduleId)) {
      state.packLogs[m.moduleId] = (state.packLogs[m.moduleId] || 0) + 1;
    }
    state.logs.unshift({
      type: "mission",
      moduleId: m.moduleId,
      note: m.title + ": " + m.text,
      date: todayStr(),
      ts: Date.now()
    });
    if (state.logs.length > 100) state.logs.pop();
    state.mission = null;
    updateStreak();
    checkBadges();
    saveState();
    if (fromHome) renderHome();
  }

  function renderHome() {
    $("greet-name").textContent = greeting();
    $("home-date").textContent = new Date().toLocaleDateString(undefined, {
      weekday: "long", month: "long", day: "numeric"
    });
    var info = levelInfo(state.xp);
    var done = sessionDoneToday();
    var cta = $("start-session-btn");
    var title = $("cta-title");
    if (done) {
      cta.classList.add("done");
      title.textContent = "Session complete today";
      $("cta-meta").textContent = "LEVEL " + info.level + " · " + info.into + "/" + info.span + " XP · practice again anytime";
    } else {
      cta.classList.remove("done");
      title.textContent = "Start today's session";
      var focus = getModule(state.focusModule);
      $("cta-meta").textContent = "LEVEL " + info.level + " · " + info.into + "/" + info.span + " XP · " + focus.name;
    }
    $("streak-badge").innerHTML = "Streak <b>" + state.streak + "</b>";
    renderMeters("home-meters", [
      ["Presence", "presence"],
      ["Rapport", "rapport"],
      ["Clarity", "clarity"]
    ]);
    renderFocusRow();
    renderMissionPanel();
    renderHistoryStrip("home-history-strip", 14);
    var narratives = [
      "You're training to become someone who naturally reads the room and responds with ease.",
      "Awareness first: noticing the moment is the real unlock. Techniques ride on top.",
      "Micro-habits compound. Three minutes daily beats one heroic hour a month.",
      "Small talk, conflict, presenting — same muscle: spot the opportunity, take one small action."
    ];
    $("narrative-text").textContent = narratives[state.totalSessions % narratives.length];
  }

  function renderLearn() {
    var ml = $("module-list");
    ml.innerHTML = MODULES.map(function (m) {
      var n = state.moduleSessions[m.id] || 0;
      return '<button type="button" class="card tap" data-open="' + m.id + '">' +
        "<h3>" + escapeHtml(m.name) + "</h3>" +
        "<p>" + escapeHtml(m.principle.slice(0, 110)) + "…</p>" +
        '<div class="card-meta">' + n + " sessions · focus to train</div></button>";
    }).join("");
    var pl = $("pack-list");
    pl.innerHTML = PACKS.map(function (p) {
      return '<button type="button" class="card tap" data-open="' + p.id + '">' +
        "<h3>" + escapeHtml(p.name) + "</h3>" +
        "<p>" + escapeHtml(p.principle.slice(0, 110)) + "…</p>" +
        '<div class="card-meta">Focus pack</div></button>';
    }).join("");
    Array.prototype.forEach.call(document.querySelectorAll("[data-open]"), function (btn) {
      btn.addEventListener("click", function () {
        openModule(btn.getAttribute("data-open"));
      });
    });
  }

  function openModule(id) {
    viewingModuleId = id;
    var mod = getModule(id);
    var el = $("module-detail");
    var pack = isPack(id);
    var html = "";
    html += '<span class="tag">' + (pack ? "Focus pack" : "Core module") + "</span>";
    html += '<h1 class="greet" style="font-size:1.5rem;margin:0.5rem 0 0.6rem">' + escapeHtml(mod.name) + "</h1>";
    html += '<p class="stage-body">' + escapeHtml(mod.principle) + "</p>";

    html += '<div class="section-label">Key mental models</div><ul class="bullet-list">';
    (mod.models || []).forEach(function (m) { html += "<li>" + escapeHtml(m) + "</li>"; });
    html += "</ul>";

    html += '<div class="section-label">Opportunity moments</div><ul class="bullet-list">';
    (mod.opportunities || []).forEach(function (m) { html += "<li>" + escapeHtml(m) + "</li>"; });
    html += "</ul>";

    if (mod.avoid && mod.avoid.length) {
      html += '<div class="section-label">Usually avoid</div><ul class="bullet-list">';
      mod.avoid.forEach(function (m) { html += "<li>" + escapeHtml(m) + "</li>"; });
      html += "</ul>";
    }

    html += '<div class="section-label">Awareness drills</div>';
    (mod.drills || []).forEach(function (d) {
      html += '<div class="card"><h3>' + escapeHtml(d.title) +
        ' <span style="font-family:var(--font-mono);font-size:0.7rem;color:var(--ink-faint)">' +
        escapeHtml(d.time || "") + "</span></h3><p>" + escapeHtml(d.text) + "</p></div>";
    });

    html += '<div class="section-label">Micro-challenges</div>';
    (mod.challenges || []).forEach(function (c) {
      html += '<div class="card"><h3>L' + (c.level || 1) + " · " + escapeHtml(c.title) +
        "</h3><p>" + escapeHtml(c.text) + "</p></div>";
    });

    if (mod.resources && mod.resources.length) {
      html += '<div class="section-label">Public resources</div>';
      mod.resources.forEach(function (r) {
        html += '<a class="resource-link" href="' + escapeHtml(r.url) + '" target="_blank" rel="noopener">' +
          escapeHtml(r.title) + "<span>" + escapeHtml(r.note || "") + "</span></a>";
      });
    }

    html += '<div class="mission-actions" style="margin-top:1.2rem">' +
      '<button class="pill-btn primary" id="set-focus-mod" type="button">Set as focus · train tomorrow</button>' +
      '<button class="pill-btn teal" id="train-now" type="button">Train now</button>' +
      "</div>";

    el.innerHTML = html;
    $("set-focus-mod").addEventListener("click", function () {
      state.focusModule = id;
      saveState();
      showView("home");
      setNav("home");
      renderHome();
    });
    $("train-now").addEventListener("click", function () {
      state.focusModule = id;
      saveState();
      startSession();
    });
    showView("module");
  }

  function renderLog() {
    var sel = $("log-module");
    var opts = MODULES.concat(PACKS).map(function (m) {
      return '<option value="' + m.id + '"' + (m.id === state.focusModule ? " selected" : "") + ">" +
        escapeHtml(m.name) + "</option>";
    }).join("");
    sel.innerHTML = opts;

    var list = $("log-list");
    if (!state.logs.length) {
      list.innerHTML = '<p class="empty-note">No entries yet — log a moment after a real conversation.</p>';
      return;
    }
    list.innerHTML = state.logs.slice(0, 20).map(function (l) {
      var mod = getModule(l.moduleId);
      return '<div class="log-item"><div class="log-date">' + escapeHtml(l.date) + " · " +
        escapeHtml(l.type) + " · " + escapeHtml(mod.name) + "</div>" +
        escapeHtml(l.note) + "</div>";
    }).join("");
  }

  function saveLog() {
    var type = $("log-type").value;
    var moduleId = $("log-module").value;
    var note = $("log-note").value.trim();
    if (!note) {
      $("log-note").focus();
      return;
    }
    state.logs.unshift({ type: type, moduleId: moduleId, note: note, date: todayStr(), ts: Date.now() });
    if (state.logs.length > 100) state.logs.pop();

    var xp = type === "mission" ? 20 : type === "win" ? 15 : type === "reflection" ? 5 : 8;
    awardXp(xp);
    var mod = getModule(moduleId);
    (mod.stats || []).forEach(function (s) { bumpOnCorrect([s], true); });
    if (type === "mission") {
      state.missionsDone = (state.missionsDone || 0) + 1;
      if (state.mission && !state.mission.done) state.mission = null;
    }
    if (isPack(moduleId)) {
      state.packLogs[moduleId] = (state.packLogs[moduleId] || 0) + 1;
    }
    updateStreak();
    checkBadges();
    saveState();
    $("log-note").value = "";
    renderLog();
    $("streak-badge").innerHTML = "Streak <b>" + state.streak + "</b>";
  }

  function renderSparkline(svgId, values, kind) {
    var svg = $(svgId);
    if (!values.length) { svg.innerHTML = ""; return; }
    var last = values.slice(-10);
    var w = 240, h = 52, pad = 6;
    var min = Math.min.apply(null, last), max = Math.max.apply(null, last);
    var range = (max - min) || 1;
    var stepX = last.length > 1 ? (w - 2 * pad) / (last.length - 1) : 0;
    var pts = last.map(function (v, i) {
      var x = pad + i * stepX;
      var norm = (v - min) / range;
      if (kind === "invert") norm = 1 - norm;
      var y = pad + (1 - norm) * (h - 2 * pad);
      return [x, y];
    });
    var pointsAttr = pts.map(function (p) { return p[0] + "," + p[1]; }).join(" ");
    var endPt = pts[pts.length - 1];
    var color = kind === "invert" ? "var(--brass)" : "var(--teal)";
    svg.innerHTML = '<polyline points="' + pointsAttr + '" fill="none" stroke="' + color +
      '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline>' +
      '<circle cx="' + endPt[0] + '" cy="' + endPt[1] + '" r="3.2" fill="' + color + '"></circle>';
  }

  function renderProgress() {
    renderMeters("progress-meters", STATS.map(function (s) { return [s.label, s.id]; }));

    var bars = $("mastery-bars");
    bars.innerHTML = STATS.map(function (s) {
      var pct = pctForStat(s.id);
      return '<div class="mastery-row"><span class="mastery-label">' + escapeHtml(s.label) + "</span>" +
        '<div class="mastery-track"><div class="mastery-fill" style="--w:' + pct + '%"></div></div>' +
        '<span class="mastery-pct">' + pct + "%</span></div>";
    }).join("");

    var radars = state.history.map(function (h) { return h.radar; }).filter(function (v) { return v != null; });
    var accs = state.history.map(function (h) { return h.accuracy; });
    renderSparkline("radar-spark", radars, "pct");
    renderSparkline("accuracy-spark", accs, "pct");
    $("radar-val").textContent = radars.length ? radars[radars.length - 1] + "/10" : "—";
    $("accuracy-val").textContent = accs.length ? accs[accs.length - 1] + "%" : "—";

    var grid = $("badge-grid");
    grid.innerHTML = BADGE_DEFS.map(function (b) {
      var earned = !!state.badgesEarned[b.id];
      return '<div class="badge' + (earned ? "" : " locked") + '"><div class="b-name">' +
        (earned ? "★ " : "○ ") + escapeHtml(b.name) + '</div><div class="b-desc">' +
        escapeHtml(b.desc) + "</div></div>";
    }).join("");

    renderHistoryStrip("progress-week-strip", 21);

    var rl = $("review-list");
    if (!state.reviewQueue.length) {
      rl.innerHTML = '<p class="empty-note">Nothing due — clean slate.</p>';
    } else {
      rl.innerHTML = state.reviewQueue.slice(-8).reverse().map(function (q) {
        return '<span class="review-item" style="display:inline-block;font-size:0.8rem;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:0.35rem 0.6rem;margin:0 0.4rem 0.4rem 0">' +
          escapeHtml((getModule(q.moduleId).short || getModule(q.moduleId).name) + ": " + (q.q || "scenario").slice(0, 42)) +
          "…</span>";
      }).join("");
    }
  }

  /* ================================================================
     NAV / THEME / INIT
     ================================================================ */
  function showView(name) {
    document.querySelectorAll(".view").forEach(function (v) {
      v.classList.toggle("active", v.getAttribute("data-view") === name);
    });
    var inSession = name === "session";
    $("topbar").classList.toggle("in-session", inSession);
    if (!inSession) document.body.classList.remove("nav-hidden");
    else document.body.classList.add("nav-hidden");
  }

  function setNav(name) {
    document.querySelectorAll(".nav-btn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-nav") === name);
    });
  }

  function navigate(name) {
    if (name === "home") { showView("home"); setNav("home"); renderHome(); }
    else if (name === "learn") { showView("learn"); setNav("learn"); renderLearn(); }
    else if (name === "log") { showView("log"); setNav("log"); renderLog(); }
    else if (name === "progress") { showView("progress"); setNav("progress"); renderProgress(); }
  }

  function applyTheme() {
    if (state.theme) document.documentElement.setAttribute("data-theme", state.theme);
  }
  function toggleTheme() {
    var current = document.documentElement.getAttribute("data-theme") ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    var next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    state.theme = next;
    saveState();
  }

  document.addEventListener("DOMContentLoaded", function () {
    applyTheme();
    $("start-session-btn").addEventListener("click", startSession);
    $("theme-toggle").addEventListener("click", toggleTheme);
    $("exit-session-btn").addEventListener("click", function () {
      if (confirm("Leave this session? Progress on unfinished steps won't count.")) {
        session = null;
        document.body.classList.remove("nav-hidden");
        showView("home");
        setNav("home");
        renderHome();
      }
    });
    $("module-back").addEventListener("click", function () {
      showView("learn");
      setNav("learn");
      renderLearn();
    });
    $("save-log-btn").addEventListener("click", saveLog);
    document.querySelectorAll(".nav-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        navigate(btn.getAttribute("data-nav"));
      });
    });
    renderHome();
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js");
    });
  }
})();
