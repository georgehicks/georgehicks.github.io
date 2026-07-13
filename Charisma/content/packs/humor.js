/**
 * Focus pack: humor
 * Register by pushing onto __CHARISMA_PACKS__.
 * Optional `parent` id fills quizzes from a core module when this pack is thin.
 */
(function () {
  window.__CHARISMA_PACKS__ = window.__CHARISMA_PACKS__ || [];
  window.__CHARISMA_PACKS__.push(
{
      id: "humor",
      name: "Humor",
      parent: "conversation",
      badge: "Humor Injector",
      stats: ["humor", "rapport"],
      principle: "Humor lowers defenses and builds warmth when it serves the other person — not when it shows how clever you are. Light, situational, self-deprecating, or gently kind teasing.",
      models: [
        "Serve the shared moment, not your ego.",
        "Self-deprecation (light) humanizes and reduces status tension.",
        "Situational beats pre-planned jokes.",
        "Timing and delivery > the joke itself.",
        "At work: safe, inclusive, low-risk."
      ],
      opportunities: [
        "Awkward silence in a meeting",
        "Small mistakes — light self-deprecation",
        "Before/after a pitch to humanize the room",
        "Flat energy in 1-on-1s",
        "After something slightly awkward"
      ],
      avoid: [
        "High-stakes emotional conflict",
        "When someone is clearly upset",
        "Brand-new people whose humor you don't know",
        "Very start of high-stakes professional moments (unless ultra-light)"
      ],
      drills: [
        { title: "Humor Opportunity Scan", time: "30–60s", text: "Flat energy or awkwardness? Could a small comment help — or feel forced? Observe only." },
        { title: "Post-Interaction Check", time: "30s", text: "Did humor increase warmth or fall flat? Why?" }
      ],
      challenges: [
        { level: 1, title: "Light Self-Deprecation", text: "In one low-stakes conversation, one small genuine self-deprecating line about something minor." },
        { level: 1, title: "Situational Observation", text: "Comment lightly on something happening now (e.g. coffee machine drama)." },
        { level: 2, title: "Rescue Awkward", text: "When energy is flat, try a small humorous bridge — even acknowledging awkwardness lightly." },
        { level: 2, title: "Pro Humor", text: "One light safe humorous comment in a meeting, email, or Slack this week." }
      ],
      quizzes: [
        {
          q: "Charismatic humor mainly serves to:",
          choices: ["Prove you're the funniest person", "Lower defenses and create warmth/connection", "Win arguments", "Fill every silence"],
          answer: 1,
          why: "Connection over performance. If it only showcases cleverness, it often misses."
        },
        {
          q: "Usually avoid humor when:",
          choices: ["Energy is slightly flat in a team standup", "Someone is clearly upset or vulnerable", "A colleague made a tiny harmless mistake", "You're among friends with established rapport"],
          answer: 1,
          why: "High emotion and vulnerability need presence and care first — not jokes."
        }
      ]
    }
  );
})();
