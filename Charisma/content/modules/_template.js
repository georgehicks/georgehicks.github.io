/**
 * TEMPLATE — copy to content/modules/<your-id>.js and fill in.
 * Then:
 *   1. Add <script src="content/modules/<your-id>.js"></script> in index.html
 *      (after other modules, before content/packs or content/index.js)
 *   2. Optionally add a badge in content/badges.js
 *   3. Add the path to ASSETS in sw.js
 *
 * Do not load this template file itself in index.html.
 */
(function () {
  window.__CHARISMA_MODULES__ = window.__CHARISMA_MODULES__ || [];
  window.__CHARISMA_MODULES__.push({
    id: "your-id",
    name: "Display Name",
    short: "Chip",
    badge: "Badge Name",
    stats: ["presence", "rapport"],
    principle: "One-paragraph core idea.",
    models: [
      "Mental model one.",
      "Mental model two."
    ],
    opportunities: [
      "When this skill shows up in real life…"
    ],
    drills: [
      { title: "Drill name", time: "30s", text: "What to notice or do." }
    ],
    challenges: [
      { level: 1, title: "Easy challenge", text: "Concrete real-world action." },
      { level: 2, title: "Harder challenge", text: "Concrete real-world action." }
    ],
    reflections: [
      "Evening prompt?"
    ],
    resources: [
      // { title: "Video title", url: "https://…", note: "Why watch" }
    ],
    quizzes: [
      {
        q: "Scenario or principle question?",
        choices: ["Wrong A", "Correct B", "Wrong C", "Wrong D"],
        answer: 1,
        why: "Short explanation of the right idea."
      }
    ]
  });
})();
