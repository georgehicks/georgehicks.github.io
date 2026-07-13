/**
 * TEMPLATE — copy to content/packs/<your-id>.js and fill in.
 * Then:
 *   1. Add <script src="content/packs/<your-id>.js"></script> in index.html
 *      (before content/index.js)
 *   2. Optionally add a badge in content/badges.js
 *   3. Add the path to ASSETS in sw.js
 *
 * Do not load this template file itself in index.html.
 */
(function () {
  window.__CHARISMA_PACKS__ = window.__CHARISMA_PACKS__ || [];
  window.__CHARISMA_PACKS__.push({
    id: "your-pack-id",
    name: "Pack Display Name",
    parent: "conversation",
    badge: "Badge Name",
    stats: ["rapport", "clarity"],
    principle: "One-paragraph core idea for this focus pack.",
    models: [
      "Mental model one."
    ],
    opportunities: [
      "High-value moment to practice…"
    ],
    avoid: [
      // optional — situations to skip or be careful
    ],
    drills: [
      { title: "Drill name", time: "30–60s", text: "What to notice." }
    ],
    challenges: [
      { level: 1, title: "Starter mission", text: "Real-world action." }
    ],
    quizzes: [
      {
        q: "What is the better move?",
        choices: ["Wrong", "Right", "Wrong", "Wrong"],
        answer: 1,
        why: "Why the right answer matches the principle."
      }
    ]
  });
})();
