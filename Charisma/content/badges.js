/**
 * Badge definitions. `need(state)` returns true when unlocked.
 * Module/pack badges use moduleSessions / packLogs keys matching content ids.
 */
window.__CHARISMA_BADGES__ = [
    { id: "first-impressions", name: "First Impression Radar", desc: "Complete 3 sessions focused on first impressions", need: function (s) { return (s.moduleSessions["first-impressions"] || 0) >= 3; } },
    { id: "confidence", name: "Steady Under Pressure", desc: "Complete 3 confidence-focused sessions", need: function (s) { return (s.moduleSessions["confidence"] || 0) >= 3; } },
    { id: "conversation", name: "Conversation Navigator", desc: "Complete 5 conversation sessions", need: function (s) { return (s.moduleSessions["conversation"] || 0) >= 5; } },
    { id: "storytelling", name: "Story Weaver", desc: "Complete 3 storytelling sessions", need: function (s) { return (s.moduleSessions["storytelling"] || 0) >= 3; } },
    { id: "presence", name: "Presence Holder", desc: "Complete 3 presence sessions", need: function (s) { return (s.moduleSessions["presence"] || 0) >= 3; } },
    { id: "leadership", name: "Calm Leader", desc: "Complete 3 leadership sessions", need: function (s) { return (s.moduleSessions["leadership"] || 0) >= 3; } },
    { id: "humor", name: "Humor Injector", desc: "Log 3 humor-related missions", need: function (s) { return (s.packLogs["humor"] || 0) >= 3; } },
    { id: "conflict", name: "Conflict De-escalator", desc: "Log 3 conflict practice moments", need: function (s) { return (s.packLogs["conflict"] || 0) >= 3; } },
    { id: "streak7", name: "Awareness Streak · 7", desc: "7-day practice streak", need: function (s) { return s.bestStreak >= 7 || s.streak >= 7; } },
    { id: "streak14", name: "Awareness Streak · 14", desc: "14-day practice streak", need: function (s) { return s.bestStreak >= 14 || s.streak >= 14; } },
    { id: "missions10", name: "Field Operator", desc: "Complete 10 real-world missions", need: function (s) { return s.missionsDone >= 10; } },
    { id: "radar", name: "Opportunity Radar", desc: "Average radar ≥ 7 over 5 sessions", need: function (s) {
      var r = s.history.map(function (h) { return h.radar; }).filter(function (x) { return x != null; }).slice(-5);
      if (r.length < 5) return false;
      return r.reduce(function (a, b) { return a + b; }, 0) / r.length >= 7;
    } }
  ];
