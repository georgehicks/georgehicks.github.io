/**
 * Core module: storytelling
 * Register by pushing onto __CHARISMA_MODULES__ (script order = Learn tab order).
 */
(function () {
  window.__CHARISMA_MODULES__ = window.__CHARISMA_MODULES__ || [];
  window.__CHARISMA_MODULES__.push(
{
      id: "storytelling",
      name: "Storytelling",
      short: "Stories",
      badge: "Story Weaver",
      stats: ["story", "rapport", "presence"],
      principle: "Stories make people care, remember you, and feel connected. Everyday events become engaging with a hook and emotional arc — not perfect details.",
      models: [
        "People remember stories better than facts or advice.",
        "Hook + emotional arc beat chronological dumps.",
        "Mundane experiences can illustrate a point for presenting or bonding.",
        "Create curiosity: 'what happened next?'"
      ],
      opportunities: [
        "Answering 'How was your weekend?' with engagement",
        "Sharing updates in team meetings or with clients",
        "Selling an idea by wrapping it in a short story",
        "Presenting — stories instead of pure bullet points",
        "Building rapport in new relationships",
        "Making a point memorable"
      ],
      drills: [
        { title: "Story Opportunity Scan", time: "2s pause", text: "When asked what's new, ask: Is there a tiny story here with a hook or emotion?" },
        { title: "Hook Detector", time: "listening", text: "When others tell stories, notice which parts actually hook your attention." }
      ],
      challenges: [
        { level: 1, title: "One-Minute Story", text: "Turn one thing from today into a 30–60s story with a clear hook. Tell it to one person." },
        { level: 2, title: "Presenting Version", text: "In your next update or pitch, replace one fact with a 20-second story that illustrates it." },
        { level: 2, title: "Humor Injection", text: "Add one light self-deprecating or situational detail to a story you tell today." }
      ],
      reflections: [
        "Did I default to a boring answer when a story was available?",
        "How did people respond to story vs plain facts?"
      ],
      resources: [],
      quizzes: [
        {
          q: "What matters more in a short story?",
          choices: ["Perfect chronological accuracy", "Hook and emotional arc", "Maximum detail and length", "Avoiding any humor"],
          answer: 1,
          why: "Hook + emotional journey create care and memory. Details serve the arc."
        },
        {
          q: "In a status update, a charismatic upgrade is:",
          choices: ["More slides and data points", "Replace one bullet with a 20s illustrative story", "Speak faster to cover more ground", "Read the deck word-for-word"],
          answer: 1,
          why: "Stories land emotionally and are remembered; data alone often isn't."
        },
        {
          q: "Good storytelling aims to create:",
          choices: ["Immediate agreement with your thesis", "Curiosity about what happened next", "Silence while you monologue", "Proof that you're the smartest person"],
          answer: 1,
          why: "Curiosity and emotional beats pull people in — not a dump of information."
        }
      ]
    }
  );
})();
